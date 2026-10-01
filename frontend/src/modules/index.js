// Registre des modules : découvre automatiquement chaque src/modules/<id>/index.js.
// Pour ajouter un module natif : créer son dossier + son index.js, rien d'autre à modifier.
const found = import.meta.glob("./*/index.js", { eager: true });

export const modules = Object.values(found)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

// Garde-fou en développement : un id ou un chemin en double masquerait silencieusement un module
if (import.meta.env.DEV) {
  const seen = new Set();
  for (const m of modules) {
    for (const key of [`id:${m.id}`, `path:${m.path}`]) {
      if (seen.has(key)) console.warn(`[modules] doublon détecté : ${key}`);
      seen.add(key);
    }
  }
}
