import { Router } from "express";
import { createHmac } from "node:crypto";

const router = Router();

function base32Decode(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of secret.toUpperCase().replace(/=+$/, "")) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function verifyTOTP(token: string, secret: string, windowSteps = 1): boolean {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000 / timeStep);
  const key = base32Decode(secret);
  for (let i = -windowSteps; i <= windowSteps; i++) {
    const counter = BigInt(now + i);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(counter);
    const hmac = createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) %
      1_000_000;
    if (code.toString().padStart(6, "0") === token) return true;
  }
  return false;
}

router.post("/verify", (req, res) => {
  const secret = process.env.DEV_TOTP_SECRET;
  if (!secret) {
    res.status(503).json({ ok: false, error: "DEV_TOTP_SECRET is not configured on the server." });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token || !/^\d{6}$/.test(token)) {
    res.status(400).json({ ok: false, error: "Provide a 6-digit code." });
    return;
  }

  if (!verifyTOTP(token, secret)) {
    res.status(401).json({ ok: false, error: "Kode tidak valid atau sudah kedaluwarsa." });
    return;
  }

  res.json({ ok: true });
});

export default router;
