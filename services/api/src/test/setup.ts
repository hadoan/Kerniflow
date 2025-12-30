import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";

// Suppress Vite CJS deprecation warning
process.env.VITE_CJS_IGNORE_WARNING = "true";
process.env.CORELY_TEST = "true";

// Load .env.test for test environment
const envPath = resolve(__dirname, "../../../..", ".env.test");
config({ path: envPath });
