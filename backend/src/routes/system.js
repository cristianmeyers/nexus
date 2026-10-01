const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

const REPO = "cristianmeyers/nexus";
const CURRENT = (process.env.APP_VERSION || "dev").replace(/^v/, "");
const UPDATER_URL = process.env.UPDATER_URL;
const UPDATER_TOKEN = process.env.UPDATER_TOKEN;

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

async function getLatest() {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { "User-Agent": "nexus-update-check" } },
  );
  if (!response.ok) throw new Error(`GitHub responded with ${response.status}`);
  const release = await response.json();
  return release.tag_name.replace(/^v/, "");
}

async function callUpdater(path, options = {}) {
  const response = await fetch(`${UPDATER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UPDATER_TOKEN}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

function updaterConfigured(res) {
  if (UPDATER_URL && UPDATER_TOKEN) return true;
  res.status(501).json({ message: "Service de mise à jour non configuré." });
  return false;
}

// Sans authentification : le job de l'updater l'appelle pour vérifier la version.
router.get("/version", (req, res) => {
  res.json({ version: CURRENT });
});

router.get("/update/check", async (req, res) => {
  try {
    const latest = await getLatest();
    res.json({
      current: CURRENT,
      latest,
      updateAvailable:
        CURRENT !== "dev" && compareVersions(latest, CURRENT) > 0,
    });
  } catch (err) {
    console.error("Update check failed:", err.message, err.cause?.code ?? "");
    res.status(502).json({ message: "Could not reach GitHub." });
  }
});

router.post("/update/install", requireAuth, requireAdmin, async (req, res) => {
  if (!updaterConfigured(res)) return;
  try {
    const latest = await getLatest();
    if (CURRENT === "dev" || compareVersions(latest, CURRENT) <= 0) {
      return res
        .status(400)
        .json({ message: "Aucune mise à jour disponible." });
    }
    const { status, data } = await callUpdater("/update", {
      method: "POST",
      body: JSON.stringify({ tag: latest }),
    });
    // Un 401 de l'updater ferait croire au frontend que la session a expiré.
    if (status === 401) {
      return res.status(502).json({ message: "Jeton de l'updater refusé." });
    }
    res.status(status).json(data ?? {});
  } catch (err) {
    console.error("Update install failed:", err.message);
    res.status(502).json({ message: "Service de mise à jour injoignable." });
  }
});

router.get("/update/status", requireAuth, requireAdmin, async (req, res) => {
  if (!updaterConfigured(res)) return;
  try {
    const { status, data } = await callUpdater("/status");
    if (status === 401) {
      return res.status(502).json({ message: "Jeton de l'updater refusé." });
    }
    res.status(status).json(data ?? {});
  } catch {
    res.status(502).json({ message: "Service de mise à jour injoignable." });
  }
});

module.exports = router;
