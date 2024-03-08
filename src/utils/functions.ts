import fs from "fs/promises";
import { Command } from "commander";
import Decimal from "decimal.js";
import Enquirer from "enquirer";
import {
  Address,
  Assets,
  assetsToValue,
  C,
  Data,
  fromHex,
  getAddressDetails,
  Lucid,
  ProtocolParameters,
  SpendingValidator,
  UTxO,
} from "lucid-cardano";
import { invariant } from "mynth-helper";
import { Err, Ok, Result } from "ts-res";

let protocolParameters: ProtocolParameters | undefined;

const readValidator = async (path: string): Promise<SpendingValidator> => {
  const { compiledCode } = JSON.parse(await fs.readFile(path, "utf8"))
    .validators[0];

  return {
    type: "PlutusV2",
    script: compiledCode,
  };
};

const loadUtxoFromFile = async (path: string): Promise<UTxO> => {
  const utxo: UTxO = JSON.parse(await fs.readFile(path, "utf8"));

  for (const asset in utxo.assets) {
    utxo.assets[asset] = BigInt(utxo.assets[asset]);
  }

  return utxo;
};

const getStakeCred = (address: Address) => {
  const details = getAddressDetails(address);
  invariant(
    details.stakeCredential,
    `Could not determine address from ${address}`
  );

  return details.stakeCredential;
};

const isPaymentAddress = (address: Address) => {
  return !!getAddressDetails(address).paymentCredential;
};

const getMinLovelaceForVoidDatum = async (
  lucid: Lucid,
  address: Address,
  assets: Assets
) => {
  if (!protocolParameters) {
    protocolParameters = await lucid.provider.getProtocolParameters();
  }

  const coinsPerUtxoByte = C.BigNum.from_str(
    protocolParameters.coinsPerUtxoByte.toString()
  );
  const output = C.TransactionOutput.new(
    C.Address.from_bech32(address),
    assetsToValue(assets)
  );
  output.set_datum(
    C.Datum.new_data(C.Data.new(C.PlutusData.from_bytes(fromHex(Data.void()))))
  );

  return BigInt(C.min_ada_required(output, coinsPerUtxoByte).to_str());
};

const requestSeed = async (): Promise<Result<string, void>> => {
  try {
    const enquirer = new Enquirer();
    const response = await enquirer.prompt({
      type: "password",
      name: "seed",
      message: "Enter seed phrase for funding wallet:\n",
    });

    invariant(
      response &&
        "seed" in response &&
        typeof response.seed == "string" &&
        response.seed.trim()
    );

    return Ok(response.seed.trim());
  } catch (error) {
    return Err();
  }
};

const getSeed = async (program: Command, seed?: string): Promise<string> => {
  if (seed) return seed;
  const seedResult = await requestSeed();
  if (!seedResult.ok) program.error("Error requesting seed");

  return seedResult.data;
};

const parseAmount = (
  program: Command,
  amount: string,
  decimals: number = 6
): bigint => {
  try {
    return BigInt(
      new Decimal(amount).mul(new Decimal(10).pow(decimals)).toFixed(0)
    );
  } catch (error) {
    program.error("Invalid decimal given");
  }
};

export {
  getMinLovelaceForVoidDatum,
  getSeed,
  getStakeCred,
  isPaymentAddress,
  loadUtxoFromFile,
  parseAmount,
  readValidator,
};
