import { spawn } from "child_process";
import fs from "fs/promises";
import config from "config";
import { Address, Data, Lucid, SpendingValidator, UTxO } from "lucid-cardano";
import { getNetwork, invariant, TransactionChainer } from "mynth-helper";
import { Err, Ok, Result } from "ts-res";
import { readValidator } from "utils/functions";

const getContractAddress = (lucid: Lucid, referenceScript: UTxO): Address => {
  invariant(
    referenceScript.scriptRef && referenceScript.scriptRef.type == "PlutusV2",
    "No PlutusV2 script attached to UTXO"
  );

  return lucid.utils.validatorToAddress(referenceScript.scriptRef);
};

const createAlwaysFailScript = (): SpendingValidator => {
  const header = "5839010000322253330033371e9101203";
  const body = Array.from({ length: 63 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  const footer = "0048810014984d9595cd01";

  return {
    type: "PlutusV2",
    script: `${header}${body}${footer}`,
  };
};

const generateAddress = (lucid: Lucid): string => {
  return lucid.utils.validatorToAddress(createAlwaysFailScript());
};

const processError = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  )
    return Err(error.message);

  return Err(typeof error === "string" ? error : JSON.stringify(error));
};

const deploy = async (lucid: Lucid, validator: SpendingValidator) => {
  const address = generateAddress(lucid);
  const tx = lucid.newTx().payToContract(
    address,
    {
      inline: Data.void(),
      scriptRef: validator,
    },
    {}
  );

  try {
    return Ok({ address, tx: await (await tx.complete()).sign().complete() });
  } catch (error) {
    return processError(error);
  }
};

const buildAiken = (): Promise<Result<void, string>> => {
  const aiken = spawn("aiken", ["build"], { stdio: "inherit" });

  return new Promise<Result<void, string>>((resolve) => {
    aiken.on("close", (code) => {
      resolve(code === 0 ? Ok() : Err(code ? code.toString() : "1"));
    });
  });
};

const loadWallet = async (
  blockfrostApiKey: string,
  seed: string
): Promise<Result<TransactionChainer, string>> => {
  try {
    return Ok(await TransactionChainer.loadWallet(blockfrostApiKey, seed));
  } catch (error) {
    return processError(error);
  }
};

const userDeploy = async (seed: string): Promise<Result<void, string>> => {
  const blockfrostApiKey = config.get<string>("blockfrost");
  const network = getNetwork(blockfrostApiKey);
  const wallet = await loadWallet(blockfrostApiKey, seed);
  if (!wallet.ok) return Err(wallet.error);
  const chainer = wallet.data;
  const lucid = await chainer.getLucid();

  console.log("Building Aiken code");
  const buildResult = await buildAiken();
  if (!buildResult.ok) return Err("Error building Aiken code");
  const validator = await readValidator("plutus.json");

  console.log(`\n\nDeploying mynth-account on ${network}`);
  const deployedResult = await deploy(lucid, validator);

  if (!deployedResult.ok) {
    console.debug("Wallet address:", await lucid.wallet.address());
    return Err(deployedResult.error);
  }

  const deployed = deployedResult.data;
  await chainer.registerAddress(deployed.address);
  await chainer.registerTx(deployed.tx);
  const referenceUtxo = chainer.getUtxo(deployed.tx.toHash());
  const contractAddress = getContractAddress(lucid, referenceUtxo);
  await chainer.registerAddress(contractAddress);

  await chainer.submit();
  console.log("Script deployed. Waiting for blockchain confirmation.");

  let onchain: UTxO[] = [];
  const ref = [{ txHash: deployed.tx.toHash(), outputIndex: 0 }];

  while (onchain.length == 0) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    onchain = await lucid.utxosByOutRef(ref);
  }

  console.log("Successfully deployed on-chain");
  const jsonString = JSON.stringify(onchain[0], (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  await fs.writeFile("mynth-account.json", jsonString);

  console.log("Saved mynth-account.json");
  return Ok();
};

export { userDeploy };
