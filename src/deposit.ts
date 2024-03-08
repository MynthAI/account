import { getAccount } from "account";
import config from "config";
import { Constr, Data, Lucid } from "lucid-cardano";
import { getEnvConfig, getLucid } from "mynth-helper";
import { getMinLovelaceForVoidDatum } from "utils/functions";

const redeemer = Data.to(new Constr(1, []));

const depositAll = async (
  lucid: Lucid,
  userAddresses: string[],
  amounts: bigint[],
  submit: boolean,
  isChainedTx?: boolean
) => {
  const mnt = getEnvConfig<string>("mnt");

  const tx = lucid.newTx();

  for (const i in userAddresses) {
    const account = await getAccount(lucid, userAddresses[i]);
    const existingBalance =
      account.utxo && mnt in account.utxo.assets
        ? account.utxo.assets[mnt]
        : 0n;
    const tokens = { [mnt]: existingBalance + amounts[i] };

    if (account.utxo) {
      tx.collectFrom([account.utxo], redeemer);
      tx.readFrom([account.validator]);

      const minLovelace = await getMinLovelaceForVoidDatum(
        lucid,
        account.address,
        tokens
      );
      tokens.lovelace =
        minLovelace > account.utxo.assets.lovelace
          ? minLovelace
          : account.utxo.assets.lovelace;
    }

    tx.payToContract(account.address, { inline: Data.void() }, tokens);
  }

  const signed = await (await tx.complete()).sign().complete();

  if (isChainedTx) {
    return { tx: signed };
  } else {
    if (submit) {
      const txHash = await signed.submit();
      console.log("Deposit successful", txHash);
    } else {
      console.log("Transaction built successfully");
    }
  }
};

const deposit = async (
  fundingSeed: string,
  userAddress: string,
  amount: bigint,
  submit: boolean
) => {
  const blockfrostApiKey = config.get<string>("blockfrost");
  const lucid = await getLucid(blockfrostApiKey);
  lucid.selectWalletFromSeed(fundingSeed);
  await depositAll(lucid, [userAddress], [amount], submit);
};

export { deposit, depositAll };
