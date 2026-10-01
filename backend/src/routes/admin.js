const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const requirePermission = require("../middleware/requirePermission");
const logAction = require("../utils/logAction");

// Toutes les routes de ce fichier exigent d'être connecté ET admin.
// NOTE POUR PLUS TARD : ce requireAdmin global est une protection grossière,
// héritée d'avant le système de rôles/permissions. Une fois qu'il existera
// plusieurs rôles avec des droits différenciés (pas juste "admin"), il
// faudra le retirer d'ici et mettre un requirePermission(...) précis sur
// chaque route individuellement, pour ne pas bloquer par erreur un rôle
// qui aurait la permission mais pas le rôle "admin" au sens strict.
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — liste des utilisateurs, sans le mot de passe (même hashé)
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at, last_login_at
       FROM users
       ORDER BY created_at ASC`,
    );
    return res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// GET /api/admin/logs — historique des actions, les plus récentes en premier
// Fait une jointure avec users pour récupérer le nom/email de l'auteur,
// plutôt que de renvoyer juste un user_id brut au frontend.
router.get("/logs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         activity_logs.id,
         activity_logs.module,
         activity_logs.action,
         activity_logs.details,
         activity_logs.created_at,
         users.name AS user_name,
         users.email AS user_email
       FROM activity_logs
       LEFT JOIN users ON users.id = activity_logs.user_id
       ORDER BY activity_logs.created_at DESC
       LIMIT 100`,
    );
    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des logs :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// PATCH /api/admin/users/:id/status — active ou suspend un compte, sans le
// supprimer : son historique (activity_logs) et son profil restent intacts,
// seule sa capacité à se connecter est coupée (vérifié dans auth.js au login).
router.patch(
  "/users/:id/status",
  requirePermission("users.manage"),
  async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Le champ is_active doit être un booléen (true/false).",
      });
    }

    try {
      const result = await pool.query(
        "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active",
        [is_active, id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Utilisateur introuvable." });
      }

      // Trace de qui a fait quoi : req.user.userId vient du JWT de la
      // personne qui effectue l'action (l'admin), pas de l'utilisateur ciblé.
      await logAction(
        req.user.userId,
        "users",
        is_active ? "activate" : "suspend",
        { targetUserId: Number(id) },
      );

      return res.json({ success: true, user: result.rows[0] });
    } catch (error) {
      console.error("Erreur lors du changement de statut :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    }
  },
);

// PUT /api/admin/users/:id/roles — remplace entièrement la liste des rôles
// d'un utilisateur (même principe que pour role_permissions : on supprime
// tout puis on réinsère, dans une transaction pour éviter un état à moitié
// appliqué en cas d'erreur en cours de route).
// body: { roleIds: [1, 3] }
router.put(
  "/users/:id/roles",
  requirePermission("users.manage"),
  async (req, res) => {
    const { id } = req.params;
    const { roleIds = [] } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userCheck = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [id],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Utilisateur introuvable." });
      }

      await client.query("DELETE FROM user_roles WHERE user_id = $1", [id]);

      for (const roleId of roleIds) {
        await client.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
          [id, roleId],
        );
      }

      await client.query("COMMIT");

      await logAction(req.user.userId, "users", "update_roles", {
        targetUserId: Number(id),
        roleIds,
      });

      return res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erreur lors de la mise à jour des rôles :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    } finally {
      client.release();
    }
  },
);

// GET /api/admin/users/:id/roles — rôles actuellement assignés à un utilisateur,
// utile pour pré-cocher les cases dans la modale d'édition côté frontend.
router.get(
  "/users/:id/roles",
  requirePermission("users.manage"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT r.id, r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name`,
        [id],
      );
      return res.json({ success: true, roles: result.rows });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des rôles utilisateur :",
        error,
      );
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    }
  },
);

module.exports = router;
