// Génère JWT_SECRET et SETTINGS_KEY une seule fois s'ils ne sont pas fournis,
// puis les relit à chaque démarrage (ils doivent rester stables entre les mises à jour).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dir = process.env.DATA_DIR || path.join(__dirname, "..", "..");
const file = path.join(dir, "secrets.json");
const KEYS = ["JWT_SECRET", "SETTINGS_KEY"];

if (KEYS.some((k) => !process.env[k])) {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // fichier absent : premier démarrage
  }
  let changed = false;
  for (const k of KEYS) {
    if (process.env[k]) continue;
    if (!saved[k]) {
      saved[k] = crypto.randomBytes(32).toString("hex");
      changed = true;
    }
    process.env[k] = saved[k];
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(saved, null, 2), { mode: 0o600 });
}
