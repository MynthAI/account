import anyTest, { TestFn } from "ava";
import { Db } from "mongodb";
import Papr from "papr";
import { calculateRewards } from "utils/rewardCalculation";
import {
  multipleUsersWithMultipleMultiplierQualifierAccount,
  multipleUsersWithNoMultiplierQualifierAccount,
  multipleUsersWithOneMultiplierQualifierAccount,
  singleUserWithOnlyCommonGenesis,
  singleUserWithOnlyOneRareGenesis,
} from "./mocks/mockData";
import MockMongoServer from "./mocks/mockDatabase";

const test = <TestFn<Context>>anyTest;
interface Context {
  mongo: MockMongoServer;
  papr: Papr;
  db: Db;
}

test.beforeEach(async (t) => {
  t.context.mongo = new MockMongoServer();
  t.context.papr = new Papr();

  await t.context.mongo.setup();

  // setup db and papr instance
  t.context.db = t.context.mongo.getDb();
  t.context.papr.initialize(t.context.db);
  await t.context.papr.updateSchemas();
});

test.afterEach.always((t) => {
  t.context.mongo.close();
});

test("calculateRewards should calculate rewards correctly when single user with one common genesis asset", async (t) => {
  await t.context.db
    .collection("mynthAccountRegIntent")
    .insertMany(singleUserWithOnlyCommonGenesis);

  await calculateRewards(t.context.papr);

  const rewardsData = await t.context.db
    .collection("mynthAccountRewards")
    .find({})
    .toArray();
  t.is(rewardsData.length, 1);
  const rewardsForUser = rewardsData[0];
  t.is(
    rewardsForUser.ownerStakeAddress,
    singleUserWithOnlyCommonGenesis[0].ownerStakeAddress
  );
  t.is(rewardsForUser.mntRewards, "13698.630136");
});

test("calcaulateRewardsForAccountHolders should calculate rewards correctly when single user with one rare genesis asset", async (t) => {
  await t.context.db
    .collection("mynthAccountRegIntent")
    .insertMany(singleUserWithOnlyOneRareGenesis);

  await calculateRewards(t.context.papr);

  const rewardsData = await t.context.db
    .collection("mynthAccountRewards")
    .find({})
    .toArray();
  t.is(rewardsData.length, 1);
  const rewardsForUser = rewardsData[0];
  t.is(
    rewardsForUser.ownerStakeAddress,
    singleUserWithOnlyOneRareGenesis[0].ownerStakeAddress
  );
  t.is(rewardsForUser.mntRewards, "13698.630136");
});

test("calculateRewardsForGenesisHolders should calculate rewards correctly when multiple users with no multiplier account", async (t) => {
  await t.context.db
    .collection("mynthAccountRegIntent")
    .insertMany(multipleUsersWithNoMultiplierQualifierAccount);
  await calculateRewards(t.context.papr);
  const rewardsData = await t.context.db
    .collection("mynthAccountRewards")
    .find({})
    .toArray();
  t.is(rewardsData.length, 2);
  const rewardsForUser1 = rewardsData[0];
  t.is(
    rewardsForUser1.ownerStakeAddress,
    multipleUsersWithNoMultiplierQualifierAccount[0].ownerStakeAddress
  );
  t.is(rewardsForUser1.mntRewards, "6849.315068");

  const rewardsForUser2 = rewardsData[1];
  t.is(
    rewardsForUser2.ownerStakeAddress,
    multipleUsersWithNoMultiplierQualifierAccount[1].ownerStakeAddress
  );
  t.is(rewardsForUser2.mntRewards, "6849.315068");
});

test("calculateRewardsForGenesisHolders should calculate rewards correctly when multiple users with one multiplier account", async (t) => {
  await t.context.db
    .collection("mynthAccountRegIntent")
    .insertMany(multipleUsersWithOneMultiplierQualifierAccount);
  await calculateRewards(t.context.papr);
  const rewardsData = await t.context.db
    .collection("mynthAccountRewards")
    .find({})
    .toArray();
  t.is(rewardsData.length, 2);
  const rewardsForUser1 = rewardsData[0];
  t.is(
    rewardsForUser1.ownerStakeAddress,
    multipleUsersWithOneMultiplierQualifierAccount[0].ownerStakeAddress
  );
  t.is(rewardsForUser1.mntRewards, "23972.602739");

  const rewardsForUser2 = rewardsData[1];
  t.is(
    rewardsForUser2.ownerStakeAddress,
    multipleUsersWithOneMultiplierQualifierAccount[1].ownerStakeAddress
  );
  t.is(rewardsForUser2.mntRewards, "3424.657534");
});

test("calculateRewardsForGenesisHolders should calculate rewards correctly when multiple users with multiple multiplier account", async (t) => {
  await t.context.db
    .collection("mynthAccountRegIntent")
    .insertMany(multipleUsersWithMultipleMultiplierQualifierAccount);
  await calculateRewards(t.context.papr);
  const rewardsData = await t.context.db
    .collection("mynthAccountRewards")
    .find({})
    .toArray();
  t.is(rewardsData.length, 2);
  const user1Address =
    multipleUsersWithMultipleMultiplierQualifierAccount[1].ownerStakeAddress;
  const user2Address =
    multipleUsersWithMultipleMultiplierQualifierAccount[0].ownerStakeAddress;

  const rewardsForUser1 = rewardsData.find(
    (reward) => reward.ownerStakeAddress === user1Address
  );
  t.is(rewardsForUser1?.ownerStakeAddress, user1Address);
  t.is(rewardsForUser1?.mntRewards, "6849.315068");

  const rewardsForUser2 = rewardsData.find(
    (reward) => reward.ownerStakeAddress === user2Address
  );
  t.is(rewardsForUser2?.ownerStakeAddress, user2Address);
  t.is(rewardsForUser2?.mntRewards, "20547.945205");
});
