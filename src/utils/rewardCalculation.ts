import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import config from "config";
import { connectPapr } from "db";
import Decimal from "decimal.js";
import { getBlockfrostApi, getEnvConfig, getTokenBalance } from "mynth-helper";
import pLimit from "p-limit";
import Papr from "papr";
import createMynthAccountRegIntentModel from "schema/MynthAccountRegIntent";
import createMynthAccountRewardsModel from "schema/MynthAccountRewards";

const zero = new Decimal(0);
const decimals = new Decimal(10).pow(6);

interface RewardData {
  ownerStakeAddress: string;
  rareAssetsCount: Decimal;
  totalAssetsCount: Decimal;
  mntStaked: Decimal;
}

const fetchWithFallback = async <T>(
  func: () => Promise<T>,
  defaultReturn: T
): Promise<T> => {
  try {
    return await func();
  } catch (error) {
    if (error instanceof BlockfrostServerError && error.status_code === 404) {
      return defaultReturn;
    } else {
      throw error;
    }
  }
};

const getAllGenesisAssetsForStake = async (
  blockfrost: BlockFrostAPI,
  stakeAddress: string
): Promise<string[]> => {
  let page = 1;
  const assets: string[] = [];

  const genesisAssetPolicyId = getEnvConfig<string>("genesis.policy");

  while (true) {
    const results = await fetchWithFallback(
      () =>
        blockfrost.accountsAddressesAssets(stakeAddress, {
          page,
        }),
      []
    );

    if (!results.length) return assets;

    const genesisAssets = results.filter((asset) =>
      asset.unit.startsWith(genesisAssetPolicyId)
    );
    const genesisAssetNames = genesisAssets.map((asset) => asset.unit);
    assets.push(...genesisAssetNames);

    page++;
  }
};

export const calculateRewards = async (papr: Papr) => {
  const limit = pLimit(20);
  const blockfrostKey = config.get<string>("blockfrost");
  const blockfrost = getBlockfrostApi(blockfrostKey);

  const MynthAccountRegIntent = createMynthAccountRegIntentModel(papr);
  const MynthAccountRewards = createMynthAccountRewardsModel(papr);
  await papr.updateSchemas();

  const allRegisteredIntents = await MynthAccountRegIntent.find({});
  const rewardsData: RewardData[] = [];
  const mntId = getEnvConfig<string>("mnt");
  let totalMntStaked = zero;
  let totalAssets = zero;
  const prefix = config.get<string>("genesis.rare.prefix");
  const genesisAssetPolicyId = getEnvConfig<string>("genesis.policy");

  // Update the current genesis assets of each registered intent stake address
  await Promise.all(
    allRegisteredIntents.map(async (regIntent) => {
      const allGenesisAssets = await limit(() =>
        getAllGenesisAssetsForStake(blockfrost, regIntent.ownerStakeAddress)
      );
      const rareAssetNames = allGenesisAssets.filter((assetName) =>
        assetName.includes(genesisAssetPolicyId + prefix)
      );

      const commonAssetNames = allGenesisAssets.filter(
        (assetName) => !assetName.includes(genesisAssetPolicyId + prefix)
      );

      const mntTokensStaked = await limit(() =>
        fetchWithFallback(
          () => getTokenBalance(blockfrost, mntId, regIntent.ownerStakeAddress),
          0n
        )
      );
      const stakedMnt = new Decimal(mntTokensStaked.toString()).div(decimals);

      const rareAssetNamesLength = new Decimal(rareAssetNames.length);
      const totalAssetsCountForStake = rareAssetNamesLength.plus(
        commonAssetNames.length
      );
      totalAssets = totalAssets.plus(totalAssetsCountForStake);

      // Add mntStaked value to rewardsData only if its eligible to recieve staked multiplier rewards
      const mntStaked =
        totalAssetsCountForStake.greaterThan(2) &&
        rareAssetNamesLength.greaterThan(0)
          ? stakedMnt
          : zero;

      totalMntStaked = totalMntStaked.plus(mntStaked);

      rewardsData.push({
        ownerStakeAddress: regIntent.ownerStakeAddress,
        rareAssetsCount: rareAssetNamesLength,
        totalAssetsCount: totalAssetsCountForStake,
        mntStaked,
      });
    })
  );

  const totalAssetReward = config.get<number>("account-rewards.total-asset");

  const totalMultiplierAccountReward = config.get<number>(
    "account-rewards.total-multiplier"
  );

  await Promise.all(
    rewardsData.map((reward) => {
      const mntRewards = reward.totalAssetsCount
        .div(totalAssets)
        .mul(totalAssetReward)
        .plus(
          reward.mntStaked.greaterThan(0)
            ? reward.mntStaked
                .div(totalMntStaked)
                .mul(totalMultiplierAccountReward)
            : zero
        );

      return MynthAccountRewards.insertOne({
        ownerStakeAddress: reward.ownerStakeAddress,
        mntStaked: reward.mntStaked.toFixed(6).toString(),
        totalGenesisAssets: reward.totalAssetsCount.toNumber(),
        mntRewards: mntRewards.toFixed(6).toString(),
      });
    })
  );
};

export const calcaulateRewardsForAccountHolders = () => {
  connectPapr(calculateRewards);
};
