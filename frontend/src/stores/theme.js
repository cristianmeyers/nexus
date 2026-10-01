import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useThemeStore = defineStore("theme", () => {
  // On lit la préférence sauvegardée, sinon on retombe sur les préférences système
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const isDark = ref(savedTheme ? savedTheme === "dark" : systemPrefersDark);

  // Applique/retire la classe "dark" sur <html> dès que isDark change,
  // et sauvegarde le choix pour qu'il persiste après rechargement
  function applyTheme() {
    if (typeof document !== "undefined") {
      if (isDark.value) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
  }

  // Applique immédiatement au chargement, puis à chaque changement
  watch(isDark, applyTheme, { immediate: true });

  return { isDark, toggleTheme };
});
