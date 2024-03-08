import path from "path";
import { Data, Lucid, UTxO } from "lucid-cardano";
import { getDirname, invariant } from "mynth-helper";
import { getStakeCred, loadUtxoFromFile } from "utils/functions";

const dirname = getDirname(import.meta.url);

const getAccountUtxo = async (
  lucid: Lucid,
  address: string
): Promise<UTxO | undefined> => {
  const utxos = await lucid.utxosAt(address);

  for (const utxo of utxos) {
    if (utxo.datum == Data.void()) return utxo;
  }
};

const getAccount = async (lucid: Lucid, userAddress: string) => {
  const network = lucid.network.toLowerCase();
  const refUtxo = await loadUtxoFromFile(
    path.join(dirname, `../deployed/${network}.json`)
  );
  const validator = refUtxo.scriptRef;
  invariant(validator);

  const address = lucid.utils.validatorToAddress(
    validator,
    getStakeCred(userAddress)
  );
  const utxo = await getAccountUtxo(lucid, address);

  return { address, utxo, validator: refUtxo };
};

export { getAccount };
