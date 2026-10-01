const pool = require("../config/db");

/**
 * Enregistre une action dans l'historique (activity_logs).
 *
 * @param {number|null} userId - ID de l'utilisateur qui a fait l'action (null si système/inconnu)
 * @param {string} module - nom du module concerné, ex: "wake_on_lan", "users", "settings"
 * @param {string} action - description courte de l'action, ex: "shutdown", "create_user"
 * @param {object} [details] - infos additionnelles libres, ex: { targetHost: "192.168.1.10" }
 *
 * Exemple d'utilisation future, depuis le module Wake On Lan :
 *   await logAction(req.user.userId, "wake_on_lan", "shutdown", { host: "PC-12" });
 *
 * Volontairement silencieuse en cas d'échec (voir le commentaire dans le catch) :
 * l'écriture d'un log ne doit jamais faire planter l'action réelle qu'elle décrit.
 */
async function logAction(userId, module, action, details = null) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, module, action, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, module, action, details ? JSON.stringify(details) : null],
    );
  } catch (error) {
    // On logge l'erreur pour le diagnostic, mais on ne la relance jamais :
    // un échec d'écriture de log ne doit pas empêcher l'action elle-même
    // de réussir (ex: si le shutdown Wake On Lan a marché, il doit rester
    // un succès même si, par malchance, l'écriture du log a échoué).
    console.error(
      "Échec de l'enregistrement du log d'activité :",
      error.message,
    );
  }
}

module.exports = logAction;
