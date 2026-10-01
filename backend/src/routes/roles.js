const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");
const logAction = require("../utils/logAction");

router.use(requireAuth);

// GET /api/admin/permissions — catalogue de toutes les permissions du système,
// utilisé pour peupler les cases à cocher lors de la création/édition d'un rôle.
router.get(
  "/permissions",
  requirePermission("roles.manage"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, key, description FROM permissions ORDER BY key",
      );
      return res.json({ success: true, permissions: result.rows });
    } catch (error) {
      console.error("Erreur lors de la récupération des permissions :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    }
  },
);

// GET /api/admin/roles — liste des rôles, chacun avec ses permissions déjà groupées.
// json_agg + json_build_object construisent le tableau de permissions
// directement en SQL, pour éviter d'avoir à recombiner les lignes à la main
// côté Node (une jointure classique renverrait une ligne PAR permission,
// dupliquant le nom du rôle à chaque fois).
router.get("/roles", requirePermission("roles.manage"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id, r.name, r.description, r.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'key', p.key, 'description', p.description)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.name
    `);
    return res.json({ success: true, roles: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des rôles :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// POST /api/admin/roles — créer un rôle avec ses permissions.
// body: { name, description, permissionIds: [1, 2, 3] }
router.post("/roles", requirePermission("roles.manage"), async (req, res) => {
  const { name, description, permissionIds = [] } = req.body;

  if (!name || typeof name !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Le nom du rôle est requis." });
  }

  // On récupère un client DÉDIÉ du pool pour la transaction : toutes les
  // requêtes de ce bloc doivent passer par ce même client, pas par pool.query
  // directement, sinon chaque requête pourrait atterrir sur une connexion
  // différente et la transaction n'aurait plus de sens.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const roleResult = await client.query(
      "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description",
      [name, description || null],
    );
    const role = roleResult.rows[0];

    for (const permissionId of permissionIds) {
      await client.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)",
        [role.id, permissionId],
      );
    }

    await client.query("COMMIT");

    await logAction(req.user.userId, "roles", "create", {
      roleId: role.id,
      name,
    });

    return res.status(201).json({ success: true, role });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de la création du rôle :", error);

    // Code Postgres 23505 = violation de contrainte UNIQUE (ex: nom de rôle déjà pris)
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Ce nom de rôle existe déjà." });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  } finally {
    // Le client emprunté au pool DOIT être rendu, succès ou échec,
    // sinon le pool finit par manquer de connexions disponibles.
    client.release();
  }
});

// PUT /api/admin/roles/:id — modifier un rôle et remplacer entièrement sa
// liste de permissions (on supprime tout puis on réinsère, plus simple et
// plus sûr que de calculer un différentiel ajouts/retraits).
router.put(
  "/roles/:id",
  requirePermission("roles.manage"),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, permissionIds = [] } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const roleResult = await client.query(
        "UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description",
        [name, description || null, id],
      );

      if (roleResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Rôle introuvable." });
      }

      await client.query("DELETE FROM role_permissions WHERE role_id = $1", [
        id,
      ]);

      for (const permissionId of permissionIds) {
        await client.query(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)",
          [id, permissionId],
        );
      }

      await client.query("COMMIT");

      await logAction(req.user.userId, "roles", "update", {
        roleId: Number(id),
        name,
      });

      return res.json({ success: true, role: roleResult.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erreur lors de la modification du rôle :", error);
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ success: false, message: "Ce nom de rôle existe déjà." });
      }
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    } finally {
      client.release();
    }
  },
);

// DELETE /api/admin/roles/:id
// La suppression déclenche automatiquement, via ON DELETE CASCADE (posé lors
// de la création des tables), la suppression des lignes liées dans
// role_permissions et user_roles — pas besoin de le faire à la main ici.
router.delete(
  "/roles/:id",
  requirePermission("roles.manage"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        "DELETE FROM roles WHERE id = $1 RETURNING id, name",
        [id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Rôle introuvable." });
      }

      await logAction(req.user.userId, "roles", "delete", {
        roleId: Number(id),
        name: result.rows[0].name,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Erreur lors de la suppression du rôle :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    }
  },
);

module.exports = router;
