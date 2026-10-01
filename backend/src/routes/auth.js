const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email et mot de passe requis.",
    });
  }

  try {
    // 1. Chercher l'utilisateur par email
    const result = await pool.query(
      "SELECT id, name, email, password, role, is_active FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      // On renvoie volontairement le même message que pour un mauvais mot de passe :
      // ne pas révéler si c'est l'email ou le mot de passe qui est faux, pour ne
      // pas aider quelqu'un à deviner quels emails existent dans la base.
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides.",
      });
    }

    const user = result.rows[0];

    // 2. Comparer le mot de passe reçu avec le hash stocké
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides.",
      });
    }

    // 2bis. Bloquer la connexion si le compte a été désactivé/suspendu par
    // un admin. On vérifie ça APRÈS le mot de passe : si les identifiants
    // sont corrects mais le compte bloqué, on veut un message clair et
    // différent ("compte suspendu"), pas "identifiants invalides" qui
    // laisserait croire à l'utilisateur que son mot de passe est faux.
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Ce compte a été suspendu. Contactez un administrateur.",
      });
    }

    // 3. Enregistrer l'horodatage de cette connexion
    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      user.id,
    ]);

    // 4. Générer un vrai JWT signé, valable 24h
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // 5. Renvoyer le token (jamais le mot de passe, même hashé)
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la connexion.",
    });
  }
});

// Route protégée : renvoie les infos de l'utilisateur actuellement connecté.
// Le middleware requireAuth s'exécute AVANT cette fonction — si le token
// n'est pas valide, cette route n'est jamais atteinte.
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
