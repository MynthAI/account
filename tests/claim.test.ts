import test from "ava";
import { Constr, Data } from "lucid-cardano";
import { getStakeKey } from "mynth-helper";
import { createRandomAddress, getConfig } from "./config";

const redeemer = Data.to(new Constr(0, []));

test("can spend ADA if signed by stake key", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig(true);
  await chainer.registerAddress(contractAddress);
  const stakeKey = getStakeKey(await lucid.wallet.address());

  chainer.registerTx(
    await (
      await lucid
        .newTx()
        .payToContract(
          contractAddress,
          { inline: Data.void() },
          { lovelace: 2000000n }
        )
        .complete()
    )
      .sign()
      .complete()
  );

  const utxos = chainer
    .getUtxos(contractAddress)
    .filter(
      (utxo) =>
        utxo.datum !== undefined &&
        utxo.datumHash === null &&
        utxo.scriptRef === null
    );
  const tx = await lucid
    .newTx()
    .collectFrom(utxos, redeemer)
    .withdraw(stakeKey, 0n, redeemer)
    .attachSpendingValidator(validator)
    .complete();
  chainer.registerTx(await tx.sign().complete());

  t.pass();
});

test("cannot spend ADA if signed by wrong stake key", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig(
    createRandomAddress()
  );
  await chainer.registerAddress(contractAddress);
  const stakeKey = getStakeKey(await lucid.wallet.address());

  chainer.registerTx(
    await (
      await lucid
        .newTx()
        .payToContract(
          contractAddress,
          { inline: Data.void() },
          { lovelace: 2000000n }
        )
        .complete()
    )
      .sign()
      .complete()
  );

  const utxos = chainer
    .getUtxos(contractAddress)
    .filter((utxo) => utxo.datum !== undefined);
  const tx = lucid
    .newTx()
    .collectFrom(utxos, redeemer)
    .withdraw(stakeKey, 0n, redeemer)
    .attachSpendingValidator(validator);

  try {
    await tx.complete();
    t.fail("Could claim another user's account");
  } catch (error) {
    t.pass();
  }
});

test("cannot spend ADA", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig();
  await chainer.registerAddress(contractAddress);

  chainer.registerTx(
    await (
      await lucid
        .newTx()
        .payToContract(
          contractAddress,
          { inline: Data.void() },
          { lovelace: 5000000n }
        )
        .complete()
    )
      .sign()
      .complete()
  );

  const utxos = chainer
    .getUtxos(contractAddress)
    .filter((utxo) => utxo.datum !== undefined);
  const tx = await lucid
    .newTx()
    .collectFrom(utxos, Data.void())
    .attachSpendingValidator(validator);

  try {
    await tx.complete();
    t.fail("Can spend ADA");
  } catch (error) {
    t.pass();
  }
});
