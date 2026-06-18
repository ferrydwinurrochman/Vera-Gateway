import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import app from "./app";
import { logger } from "./lib/logger";

const totpSecret = process.env.DEV_TOTP_SECRET;
if (totpSecret) {
  const issuer = encodeURIComponent("VERA GATE");
  const label = encodeURIComponent("VERA GATE:Developer");
  const setupUrl = `otpauth://totp/${label}?secret=${totpSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  logger.info("=== TOTP DEVELOPER PANEL SETUP ===");
  logger.info(`Secret : ${totpSecret}`);
  logger.info(`OTPAuth: ${setupUrl}`);
  logger.info("Scan the OTPAuth URL or add the secret manually to Google Authenticator.");
  logger.info("===================================");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
