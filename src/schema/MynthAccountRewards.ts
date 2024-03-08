import Papr, { schema, types } from "papr";

export default (papr: Papr) =>
  papr.model(
    "mynthAccountRewards",
    schema(
      {
        ownerStakeAddress: types.string({ required: true }),
        mntStaked: types.string({ required: true }),
        totalGenesisAssets: types.number({ required: true }),
        mntRewards: types.string({ required: true }),
      },
      {
        timestamps: true,
      }
    )
  );
