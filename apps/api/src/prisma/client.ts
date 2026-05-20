import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: new URL("../../.env", import.meta.url) });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize PrismaClient");
}

const adapter = new PrismaPg({ connectionString });

type PrismaClientConstructor = new (options: { adapter: PrismaPg }) => {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  [delegate: string]: any;
};

export async function createPrismaClient() {
  const generatedClientPath = "../generated/prisma/client.js";
  const { PrismaClient } = (await import(generatedClientPath)) as {
    PrismaClient: PrismaClientConstructor;
  };

  return new PrismaClient({ adapter });
}
