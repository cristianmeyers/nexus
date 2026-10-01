const jwt = require("jsonwebtoken");

// Vérifie qu'un token JWT valide est présent dans le header Authorization.
// Si valide : attache les infos décodées à req.user, puis laisse passer (next()).
// Si absent/invalide/expiré : bloque immédiatement avec 401, la route protégée
// n'est jamais atteinte.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // format attendu : "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentification requise.",
    });
  }

  const token = authHeader.split(" ")[1]; // récupère juste la partie après "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, iat, exp }
    next();
  } catch (error) {
    // jwt.verify lance une erreur si le token est invalide, trafiqué, ou expiré
    return res.status(401).json({
      success: false,
      message: "Token invalide ou expiré.",
    });
  }
}

module.exports = requireAuth;
