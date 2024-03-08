import { Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

class MockMongoServer {
  private mongoServer!: MongoMemoryServer;
  private client!: MongoClient;
  private db!: Db;

  async setup(): Promise<void> {
    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri() + "testdb";
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.db = this.client.db();
  }

  async close(): Promise<void> {
    await this.client.close();
    await this.mongoServer.stop();
  }

  getDb() {
    return this.db;
  }

  getUri() {
    return this.mongoServer.getUri();
  }
}

export default MockMongoServer;
