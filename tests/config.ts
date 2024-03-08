import config from "config";
import { generateSeedPhrase } from "lucid-cardano";
import { getAddressFromSeed, TransactionChainer } from "mynth-helper";
import { getStakeCred, readValidator } from "utils/functions";

const createRandomAddress = () =>
  getAddressFromSeed(generateSeedPhrase(), "testnet");

const getConfig = async (stake: boolean | string = false) => {
  const validator = await readValidator("plutus.json");
  const blockfrostApiKey = config.get<string>("blockfrost");
  const seed = config.get<string>("wallets.seed1");
  const chainer = await TransactionChainer.loadWallet(blockfrostApiKey, seed);
  const lucid = await chainer.getLucid();

  let stakeKey;

  if (stake === true) {
    stakeKey = getStakeCred(await lucid.wallet.address());
  } else if (typeof stake === "string") {
    stakeKey = getStakeCred(stake);
  }

  const contractAddress = lucid.utils.validatorToAddress(validator, stakeKey);

  return {
    validator,
    chainer,
    lucid,
    contractAddress,
  };
};

export { createRandomAddress, getConfig };
