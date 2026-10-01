// À utiliser APRÈS requireAuth dans la chaîne de middlewares, puisqu'il a
// besoin de req.user (posé par requireAuth) pour connaître le rôle.
//
// Exemple d'utilisation :
//   router.get("/users", requireAuth, requireAdmin, async (req, res) => {...})
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs.",
    });
  }
  next();
}

module.exports = requireAdmin;
