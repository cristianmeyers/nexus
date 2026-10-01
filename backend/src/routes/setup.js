const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");

// 10 requêtes/minute/IP sur les routes d'installation (anti brute-force et sondage réseau)
const setupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Trop de tentatives, réessaie dans un instant.",
  },
});

// Table absente (42P01) = jamais installé. Toute autre erreur (base injoignable...)
// remonte : on ne doit pas deviner "false", sinon une coupure réseau rouvrirait /setup.
async function checkIsInstalled() {
  try {
    const result = await pool.query(
      `SELECT value FROM system_config WHERE key = 'installed';`,
    );
    return result.rows.length > 0 && result.rows[0].value === "true";
  } catch (error) {
    if (error.code === "42P01") return false;
    throw error;
  }
}

function externalPool(cfg) {
  return new Pool({
    host: cfg.host,
    port: cfg.port || 5432,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    connectionTimeoutMillis: 5000,
  });
}

router.get("/status", async (req, res) => {
  try {
    return res.json({ installed: await checkIsInstalled() });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erreur lors de la vérification du statut." });
  }
});

router.post("/test-db", setupLimiter, async (req, res) => {
  // Verrou : une fois installé, cette route ne doit plus servir à sonder d'autres bases
  try {
    if (await checkIsInstalled()) {
      return res.status(403).json({
        success: false,
        message: "L'application est déjà installée.",
      });
    }
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "Impossible de vérifier l'état d'installation pour le moment.",
    });
  }

  const { dbType, config } = req.body;

  if (dbType === "docker") {
    try {
      const client = await pool.connect();
      client.release();
      return res.json({
        success: true,
        message: "Connexion à la base Docker établie avec succès !",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Impossible de joindre la base Docker : " + error.message,
      });
    }
  }

  if (dbType === "external") {
    if (!config || !config.host || !config.database || !config.user) {
      return res.status(400).json({
        success: false,
        message: "Informations de connexion incomplètes.",
      });
    }

    const testPool = externalPool(config);
    try {
      const client = await testPool.connect();
      client.release();
      await testPool.end();
      return res.json({
        success: true,
        message: "Connexion à la base externe établie avec succès !",
      });
    } catch (error) {
      await testPool.end().catch(() => {});
      return res.status(400).json({
        success: false,
        message: "Impossible de joindre la base externe : " + error.message,
      });
    }
  }

  if (dbType === "sqlite") {
    return res.status(400).json({
      success: false,
      message: "Le mode SQLite n'est pas encore implémenté côté serveur.",
    });
  }

  return res.status(400).json({
    success: false,
    message: "Type de base de données inconnu.",
  });
});

router.post("/install", setupLimiter, async (req, res) => {
  // Même verrou : sans lui, on pourrait relancer l'installation et créer un admin
  try {
    if (await checkIsInstalled()) {
      return res.status(403).json({
        error: "L'application est déjà installée.",
      });
    }
  } catch (error) {
    return res.status(503).json({
      error: "Impossible de vérifier l'état d'installation pour le moment.",
    });
  }

  const { adminName, adminEmail, adminPassword, dbType, dbConfig } = req.body;

  if (!adminName || !adminEmail || !adminPassword) {
    return res
      .status(400)
      .json({ error: "Tous les champs administrateur sont obligatoires." });
  }

  if (dbType === "sqlite") {
    return res.status(400).json({
      error: "Le mode SQLite n'est pas encore implémenté côté serveur.",
    });
  }

  if (dbType !== "docker" && dbType !== "external") {
    return res.status(400).json({ error: "Type de base de données inconnu." });
  }

  let activePool = pool;
  let isTemporaryPool = false;

  if (dbType === "external") {
    if (!dbConfig || !dbConfig.host || !dbConfig.database || !dbConfig.user) {
      return res.status(400).json({
        error: "Configuration de base externe incomplète.",
      });
    }
    activePool = externalPool(dbConfig);
    isTemporaryPool = true;
  }

  try {
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await activePool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING;`,
      [adminName, adminEmail, hashedPassword],
    );

    await activePool.query(`
      INSERT INTO system_config (key, value)
      VALUES ('installed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = 'true';
    `);

    // Mémorise la base externe pour que db.js la relise au prochain démarrage
    if (dbType === "external") {
      const configPath = path.join(
        process.env.DATA_DIR || path.join(__dirname, "..", ".."),
        "config.json",
      );
      fs.writeFileSync(
        configPath,
        JSON.stringify({ dbType, dbConfig }, null, 2),
        { mode: 0o600 },
      );
    }

    res.json({
      success: true,
      message: "Installation terminée avec succès !",
    });

    // Le pool global pointe encore sur l'ancienne base : on quitte et Docker
    // (restart: unless-stopped) relance le processus, qui lira config.json.
    if (dbType === "external" && process.env.RESTART_AFTER_SETUP === "true") {
      setTimeout(() => process.exit(0), 1000);
    }
    return;
  } catch (error) {
    console.error("Erreur durant l'installation :", error);
    return res
      .status(500)
      .json({ error: "Échec de la création des tables et du compte admin." });
  } finally {
    if (isTemporaryPool) {
      await activePool.end().catch(() => {});
    }
  }
});

module.exports = router;
