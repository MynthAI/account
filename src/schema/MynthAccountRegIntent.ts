import Papr, { schema, types } from "papr";

export default (papr: Papr) =>
  papr.model(
    "mynthAccountRegIntent",
    schema(
      {
        ownerStakeAddress: types.string({ required: true }),
        ownerPaymentCredHash: types.string({ required: true }),
        rareGenesisAssets: types.array(types.string({ required: true }), {
          required: true,
        }),
        commonGenesisAssets: types.array(types.string({ required: true }), {
          required: true,
        }),
      },
      {
        timestamps: true,
      }
    )
  );
