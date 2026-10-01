const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const configPath = path.join(
  process.env.DATA_DIR || path.join(__dirname, "../.."),
  "config.json",
);
let dbConfig = {};

// 1. Tenter de charger la configuration enregistrée après installation
if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    if (raw.trim().length > 0) {
      const saved = JSON.parse(raw);
      if (saved.dbType === "external" && saved.dbConfig) {
        dbConfig = {
          host: saved.dbConfig.host,
          port: Number(saved.dbConfig.port) || 5432,
          user: saved.dbConfig.user,
          password: String(saved.dbConfig.password || ""),
          database: saved.dbConfig.database || "postgres",
        };
      }
    }
  } catch (err) {
    console.error(
      "Erreur de lecture du fichier config.json, fallback sur le .env",
      err,
    );
  }
}

// 2. Fallback sur les variables d'environnement (.env / Docker)
// Ces valeurs "example" ne doivent JAMAIS servir en pratique : si tu les vois
// dans un message d'erreur de connexion, ça veut dire que ton .env est
// manquant ou incomplet — ce n'est pas une vraie config de secours.
if (!dbConfig.host) {
  dbConfig = {
    host: process.env.DB_HOST || "example-host",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "example-user",
    password: String(process.env.DB_PASSWORD || "example-password"),
    database: process.env.DB_NAME || "example-db",
  };
}

const pool = new Pool(dbConfig);

// Sans ce gestionnaire, une connexion du pool coupée brutalement (ex: le
// conteneur Docker de la base s'arrête pendant que le serveur tourne)
// ferait planter TOUT le processus Node.js : le driver pg émet un
// événement "error" sur le pool, et une erreur non écoutée sur un
// EventEmitter fait crasher l'application entière, pas juste la requête
// concernée. On l'intercepte ici pour l'empêcher, et juste logger.
pool.on("error", (err) => {
  console.error(
    "Erreur inattendue sur une connexion inactive du pool :",
    err.message,
  );
});

module.exports = pool;
