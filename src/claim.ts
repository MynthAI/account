import { getAccount } from "account";
import config from "config";
import { Constr, Data } from "lucid-cardano";
import { getEnvConfig, getLucid, getStakeKey, invariant } from "mynth-helper";

const redeemer = Data.to(new Constr(0, []));
const expiresIn = 600000; // About 10 minutes

const claim = async (userAddress: string) => {
  const blockfrostApiKey = config.get<string>("blockfrost");
  const lucid = await getLucid(blockfrostApiKey);
  lucid.selectWalletFrom({ address: userAddress });
  const stakeAddress = getStakeKey(userAddress);
  const [account, delegation] = await Promise.all([
    getAccount(lucid, userAddress),
    lucid.delegationAt(stakeAddress),
  ]);
  const mnt = getEnvConfig<string>("mnt");
  const balance =
    account.utxo && mnt in account.utxo.assets ? account.utxo.assets[mnt] : 0n;

  if (!balance) {
    console.log("No MNT available to claim");
    return;
  }

  if (!delegation.poolId) {
    console.log("Wallet must be staked to a Cardano stake pool");
    return;
  }

  invariant(account.utxo);
  const tx = await lucid
    .newTx()
    .validTo(Date.now() + expiresIn)
    .collectFrom([account.utxo], redeemer)
    .withdraw(stakeAddress, delegation.rewards, redeemer)
    .readFrom([account.validator])
    .payToAddress(userAddress, { [mnt]: balance })
    .payToContract(
      account.address,
      { inline: Data.void() },
      { lovelace: account.utxo.assets.lovelace }
    )
    .complete();

  console.log(tx.toString());
};

export { claim };
