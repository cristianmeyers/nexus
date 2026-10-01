const crypto = require("crypto");

function getKey() {
  const hex = process.env.SETTINGS_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

function isEncryptionConfigured() {
  return getKey() !== null;
}

function encryptSecret(plain) {
  const key = getKey();
  if (!key) throw new Error("SETTINGS_KEY absente ou invalide");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function decryptSecret(payload) {
  const key = getKey();
  if (!key) throw new Error("SETTINGS_KEY absente ou invalide");
  const [version, iv, tag, data] = String(payload).split(":");
  if (version !== "v1" || !iv || !tag || !data)
    throw new Error("Format de secret invalide");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

module.exports = { isEncryptionConfigured, encryptSecret, decryptSecret };
