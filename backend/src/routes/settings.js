const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const logAction = require("../utils/logAction");
const { ensureSchema } = require("../config/schema");
const { SECTIONS, validate, toPublic } = require("../utils/settingsSchema");
const { isEncryptionConfigured, encryptSecret } = require("../utils/secrets");

router.use(requireAuth, requireAdmin);

let schemaPromise = null;
function schemaReady() {
  if (!schemaPromise) {
    schemaPromise = ensureSchema()
      .then((ok) => {
        if (!ok) schemaPromise = null;
        return ok;
      })
      .catch((err) => {
        schemaPromise = null;
        throw err;
      });
  }
  return schemaPromise;
}

const UPSERT = `
  INSERT INTO settings (section, data, updated_by)
  VALUES ($1, $2::jsonb, $3)
  ON CONFLICT (section) DO UPDATE
    SET data = settings.data || EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
  RETURNING data
`;

router.get("/", async (req, res) => {
  try {
    if (!(await schemaReady())) {
      return res
        .status(503)
        .json({ success: false, message: "Application non installée." });
    }
    const result = await pool.query("SELECT section, data FROM settings");
    const stored = Object.fromEntries(
      result.rows.map((r) => [r.section, r.data]),
    );

    const settings = {};
    for (const section of Object.keys(SECTIONS)) {
      settings[section] = toPublic(section, stored[section]);
    }
    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Erreur lors de la lecture des réglages :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

router.put("/:section", async (req, res) => {
  const { section } = req.params;
  if (!Object.hasOwn(SECTIONS, section)) {
    return res
      .status(404)
      .json({ success: false, message: "Section inconnue." });
  }

  const result = validate(section, req.body);
  if (result.errors) {
    return res.status(400).json({
      success: false,
      message: result.errors.join(" "),
      errors: result.errors,
    });
  }
  const data = result.data;

  try {
    if (!(await schemaReady())) {
      return res
        .status(503)
        .json({ success: false, message: "Application non installée." });
    }

    const secretKeys = Object.keys(data).filter(
      (k) => SECTIONS[section].fields?.[k]?.type === "secret",
    );
    if (secretKeys.length > 0) {
      if (!isEncryptionConfigured()) {
        return res.status(500).json({
          success: false,
          message:
            "SETTINGS_KEY absente ou invalide dans le .env du serveur : impossible d'enregistrer un mot de passe de façon sécurisée.",
        });
      }
      for (const k of secretKeys) data[k] = encryptSecret(data[k]);
    }

    const uid = Number(req.user?.userId);
    const userId = Number.isInteger(uid) ? uid : null;

    let stored;
    if (Object.keys(data).length === 0) {
      const current = await pool.query(
        "SELECT data FROM settings WHERE section = $1",
        [section],
      );
      stored = current.rows[0]?.data ?? {};
    } else {
      const saved = await pool.query(UPSERT, [
        section,
        JSON.stringify(data),
        userId,
      ]);
      stored = saved.rows[0].data;
      await logAction(userId, "settings", "update", {
        section,
        fields: Object.keys(data),
      });
    }

    return res.json({
      success: true,
      section,
      data: toPublic(section, stored),
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des réglages :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

module.exports = router;
