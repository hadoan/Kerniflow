// Simple config for Prisma 7 - uses environment variables
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from workspace root
config({ path: resolve("../../.env") });
config({ path: resolve("../../.env.dev") });

export default {
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
