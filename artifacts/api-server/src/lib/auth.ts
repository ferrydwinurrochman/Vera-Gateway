import crypto from "crypto";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  // Support both bcrypt hashes (from legacy PHP $2y$ / modern $2b$)
  // and legacy SHA-256 hashes (plain hex strings)
  if (hash.startsWith("$2")) {
    // Normalize PHP's $2y$ prefix to $2b$ for bcryptjs compatibility
    const normalized = hash.startsWith("$2y$") ? "$2b$" + hash.slice(4) : hash;
    return bcrypt.compareSync(password, normalized);
  }
  // Fallback: SHA-256 legacy
  const sha = crypto.createHash("sha256").update(password + "veragate_salt").digest("hex");
  return sha === hash;
}

export function generateRef(prefix = "TRX"): string {
  const now = new Date();
  const ts = now.getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
