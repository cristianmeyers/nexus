const pool = require("../config/db");

// À utiliser APRÈS requireAuth, puisqu'il a besoin de req.user.userId (posé
// par requireAuth) pour savoir qui vérifier.
//
// Contrairement à requireAdmin (qui vérifie juste req.user.role === "admin",
// une info figée dans le JWT au moment du login), requirePermission
// interroge la base à CHAQUE requête. C'est un choix volontaire : si les
// droits d'un utilisateur changent, l'effet est immédiat, sans attendre
// qu'il se reconnecte pour obtenir un nouveau token.
//
// Usage : requirePermission("users.manage") retourne le middleware Express
// à insérer dans la chaîne de la route.
//
//   router.delete("/users/:id", requireAuth, requirePermission("users.manage"), ...)
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT 1
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1 AND p.key = $2
         LIMIT 1`,
        [req.user.userId, permissionKey],
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Permission requise : ${permissionKey}`,
        });
      }

      next();
    } catch (error) {
      console.error("Erreur lors de la vérification de permission :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur." });
    }
  };
}

module.exports = requirePermission;
