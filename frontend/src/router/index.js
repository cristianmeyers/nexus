import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import SetupView from "../views/SetupView.vue";
import SettingsView from "../views/SettingsView.vue";
import ThemeView from "../views/ThemeView.vue";
import { useAuthStore } from "../stores/auth";
import { modules } from "../modules";
import UsersView from "../views/UsersView.vue";

// Routes des modules, générées depuis les manifestes de src/modules/*/index.js.
// Toutes protégées par défaut (requiresAuth: true).
const moduleRoutes = modules.map((m) => ({
  path: m.path,
  name: m.routeName ?? m.id,
  component: m.component,
  meta: {
    requiresAuth: true,
    title: m.title,
    subtitle: m.subtitle,
  },
}));

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...moduleRoutes,
    // Pages du cœur (ce ne sont pas des modules)
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
      meta: {
        requiresAuth: true,
        title: "Configuration",
        subtitle: "Paramètres globaux du site et du serveur",
      },
    },
    {
      path: "/users",
      name: "users",
      component: UsersView,
      meta: {
        requiresAuth: true,
        title: "Utilisateurs",
        subtitle: "Comptes, rôles et historique des actions",
      },
    },
    {
      path: "/theme",
      name: "theme",
      component: ThemeView,
      meta: {
        requiresAuth: true,
        title: "Thème",
        subtitle: "Personnalisation de l'apparence",
      },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: {
        title: "Connexion",
        subtitle: "Authentification requise",
      },
    },
    {
      path: "/setup",
      name: "setup",
      component: SetupView,
      meta: {
        title: "Setup",
        subtitle: "Assistant d'initialisation système",
      },
    },
    // Route "attrape-tout" : toute URL qui ne correspond à aucune route
    // ci-dessus tombe ici. Protégée par défaut (requiresAuth: true), pour
    // qu'une route future oubliée ne puisse jamais échapper silencieusement
    // à la protection (comme /theme avant qu'on l'ajoute explicitement).
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      redirect: { name: "home" },
      meta: { requiresAuth: true },
    },
  ],
});

// Garde de navigation global
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  try {
    // A. Interroger le backend via le proxy Vite (/api)
    const res = await fetch("/api/setup/status");

    // Si le backend répond une erreur (ex: base de données injoignable),
    // on NE DOIT PAS interpréter ça comme "pas installé" — ça rouvrirait
    // /setup sur une application pourtant déjà installée. On traite ce
    // cas comme une vraie erreur, pas comme un statut connu.
    if (!res.ok) {
      throw new Error("Statut d'installation indisponible");
    }

    const { installed } = await res.json();

    // B. Si l'application N'EST PAS installée, forcer la redirection vers /setup
    if (!installed && to.name !== "setup") {
      return next({ name: "setup" });
    }

    // C. Si l'application EST DÉJÀ installée et qu'on essaie d'aller sur /setup, bloquer l'accès
    if (installed && to.name === "setup") {
      return next({ name: "login" });
    }

    // D. Gestion de l'authentification standard
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return next({ name: "login" });
    }

    next();
  } catch (error) {
    console.error("Erreur de vérification du statut d'installation :", error);

    // Secours si l'API est indisponible ou si le statut n'a pas pu être
    // déterminé : on applique la protection par défaut, ET on bloque
    // explicitement /setup par précaution — mieux vaut refuser l'accès
    // que de risquer d'exposer l'assistant d'installation par erreur.
    if (to.name === "setup") {
      return next({ name: "login" });
    }
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return next({ name: "login" });
    }
    next();
  }
});

export default router;
