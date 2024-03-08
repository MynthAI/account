import config from "config";
import { connectPapr } from "db";
import Decimal from "decimal.js";
import { depositAll } from "deposit";
import { C, UTxO } from "lucid-cardano";
import {
  getEnvConfig,
  getLucid,
  getPrivateKeyFromSeed,
  invariant,
  TransactionChainer,
} from "mynth-helper";
import Papr from "papr";
import createMynthAccountRewardsModel from "schema/MynthAccountRewards";
import { Err, Ok, Result } from "ts-res";

const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
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

const decimals = new Decimal(10).pow(6);

const createSubWallet = async (
  blockfrostApiKey: string,
  address: string,
  seed: string,
  utxo: UTxO
) => {
  const lucid = await getLucid(blockfrostApiKey);
  lucid.selectWalletFrom({ address, utxos: [utxo] });

  lucid.wallet.signTx = async (tx: C.Transaction) => {
    const priv = C.PrivateKey.from_bech32(getPrivateKeyFromSeed(seed));
    const witness = C.make_vkey_witness(C.hash_transaction(tx.body()), priv);
    const txWitnessSetBuilder = C.TransactionWitnessSetBuilder.new();
    txWitnessSetBuilder.add_vkey(witness);
    return txWitnessSetBuilder.build();
  };

  return lucid;
};

const distributeRewards = async (
  papr: Papr,
  fundingSeed: string,
  submit: boolean
): Promise<Result<void, string>> => {
  const blockfrostApiKey = config.get<string>("blockfrost");
  const MynthAccountRewards = createMynthAccountRewardsModel(papr);

  const latest = await MynthAccountRewards.find(
    {},
    {
      sort: { createdAt: -1 },
      limit: 1,
    }
  );

  if (!latest.length) {
    return Err("No rewards recorded");
  }

  const latestTime = latest[0].createdAt;
  const thirtyMinutesAgo = new Date(latestTime.getTime() - 30 * 60000);
  const allRewardsData = await MynthAccountRewards.find({
    createdAt: {
      $gte: thirtyMinutesAgo,
    },
  });
  const nonZeroRewards = allRewardsData.filter(
    (entry) => !new Decimal(entry.mntRewards).isZero()
  );

  if (!nonZeroRewards.length) {
    return Err("No rewards available to distributed");
  }

  const wallet = await loadWallet(blockfrostApiKey, fundingSeed);
  if (!wallet.ok) return Err(wallet.error);
  const chainer = wallet.data;
  const lucid = await chainer.getLucid();
  const address = await lucid.wallet.address();

  const slotsPerTx = config.get<number>("account-rewards.per-tx");
  const arrayChunks = chunkArray(nonZeroRewards, slotsPerTx);
  const mnt = getEnvConfig<string>("mnt");
  const deposits = lucid.newTx();
  const mntRewardsArrays: bigint[][] = [];
  const mntAmounts: bigint[] = [];
  const lovelace = BigInt(
    config.get<number>("account-rewards.lovelace-per-tx")
  );
  let setupTx = "";

  // Split up wallet into multiple UTXOs so we can submit
  // all deposits at once
  for (const arrayChunk of arrayChunks) {
    const mntRewardsArray = arrayChunk.map((entry) =>
      BigInt(new Decimal(entry.mntRewards).mul(decimals).toFixed(0))
    );
    const mntAmount = mntRewardsArray.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0n
    );
    mntRewardsArrays.push(mntRewardsArray);
    mntAmounts.push(mntAmount);
    deposits.payToAddress(address, { lovelace: lovelace, [mnt]: mntAmount });
  }

  // Find all the MNT UTXOs we just created
  let utxos = await lucid.wallet.getUtxos();
  let mntUtxos = utxos.filter(
    (utxo) => mnt in utxo.assets && utxo.assets.lovelace == lovelace
  );

  // If the UTXOs don't yet exist, submit the order to create
  // them
  if (mntUtxos.length < arrayChunks.length) {
    try {
      const tx = await (await deposits.complete()).sign().complete();
      chainer.registerTx(tx);
      setupTx = tx.toHash();
    } catch (error) {
      return error == "InputsExhaustedError"
        ? Err("Rewards distribution wallet has insufficient funds")
        : processError(error);
    }

    utxos = await lucid.wallet.getUtxos();
    mntUtxos = utxos.filter(
      (utxo) => mnt in utxo.assets && utxo.assets.lovelace == lovelace
    );
  }

  // Verify that the UTXOs exist
  invariant(
    mntUtxos.length >= arrayChunks.length,
    "Insufficient UTXOs created"
  );

  // Now build all the deposits using the MNT UTXOs
  const txs = await Promise.all(
    arrayChunks.map(async (arrayChunk, index) => {
      const mntRewardsArray = mntRewardsArrays[index];
      const totalMnt = mntAmounts[index];

      // Create a new Lucid instance with the specific UTXO we
      // need. Ensure that UTXO cannot be used again
      const mntUtxoIndex = mntUtxos.findIndex(
        (utxo) => utxo.assets[mnt] === totalMnt
      );
      invariant(mntUtxoIndex !== -1, "Could not find MNT UTXO");
      const mntUtxo = mntUtxos[mntUtxoIndex];
      mntUtxos.splice(mntUtxoIndex, 1);
      const lucid = await createSubWallet(
        blockfrostApiKey,
        address,
        fundingSeed,
        mntUtxo
      );

      const deposited = await depositAll(
        lucid,
        arrayChunk.map((entry) => entry.ownerStakeAddress),
        mntRewardsArray,
        submit,
        true
      );
      invariant(deposited);
      return deposited.tx;
    })
  );

  if (submit) {
    if (setupTx) {
      console.debug("Submitting setup tx");
      await chainer.submit();
      await lucid.awaitTx(setupTx);
      console.debug("Setup tx is on-chain");
    }

    await Promise.all(txs.map((tx) => tx.submit()));
    console.log("Chained transaction submitted successfully");
  } else {
    console.log("Chained transaction built successfully");
  }

  return Ok();
};

const distributeRewardsToAllHolders = async (
  fundingSeed: string,
  submit: boolean
): Promise<Result<void, string>> => {
  return connectPapr(async (papr) =>
    distributeRewards(papr, fundingSeed, submit)
  );
};

export { distributeRewardsToAllHolders };
