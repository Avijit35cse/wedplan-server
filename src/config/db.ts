
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return client.db(process.env.DB_NAME);

  await client.connect();

  await client.db("admin").command({ ping: 1 });

  isConnected = true;

  console.log("MongoDB connected successfully!");

  return client.db(process.env.DB_NAME);
};

export { client, connectDB };
