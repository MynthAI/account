import test from "ava";
import { Constr, Data } from "lucid-cardano";
import { getConfig } from "./config";

const deposit = Data.to(new Constr(1, []));

test("can deposit ADA", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig(true);
  await chainer.registerAddress(contractAddress);

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
    .collectFrom(utxos, deposit)
    .attachSpendingValidator(validator)
    .payToContract(
      contractAddress,
      { inline: Data.void() },
      { lovelace: 3000000n }
    )
    .complete();
  chainer.registerTx(await tx.sign().complete());

  t.pass();
});

test("cannot withdraw ADA", async (t) => {
  const { validator, chainer, lucid, contractAddress } = await getConfig(true);
  await chainer.registerAddress(contractAddress);

  chainer.registerTx(
    await (
      await lucid
        .newTx()
        .payToContract(
          contractAddress,
          { inline: Data.void() },
          { lovelace: 3000000n }
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
    .collectFrom(utxos, deposit)
    .attachSpendingValidator(validator)
    .payToContract(
      contractAddress,
      { inline: Data.void() },
      { lovelace: 2000000n }
    );

  try {
    await tx.complete();
    t.fail("Could withdraw ADA");
  } catch (error) {
    t.pass();
  }
});
