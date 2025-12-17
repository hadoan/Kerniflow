import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const envPath = resolve(process.cwd(), "../../.env");
if (existsSync(envPath)) {
  config({ path: envPath });
}
