import config from "config";
import { Db, MongoClient } from "mongodb";
import Papr from "papr";

type CallbackDb<T> = (db: Db) => Promise<T>;

type CallbackPapr<T> = (papr: Papr) => Promise<T>;

const connect = async <T>(callback: CallbackDb<T>) => {
  const client = new MongoClient(config.get<string>("mongodb.uri"));
  await client.connect();

  try {
    const db = client.db();
    return await callback(db);
  } finally {
    await client.close();
  }
};

const connectPapr = async <T>(callback: CallbackPapr<T>) => {
  return await connect(async (db: Db) => {
    const papr = new Papr();
    papr.initialize(db);
    return await callback(papr);
  });
};

export { connect, connectPapr };
