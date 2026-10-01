<template>
  <header
    class="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 dark:from-black dark:to-slate-900 text-white pt-8 pb-12 shadow-2xl relative"
  >
    <div class="container mx-auto px-4 flex justify-between items-center relative z-10">
      <div>
        <h1 class="text-4xl font-black tracking-tighter italic">
          NEX<span class="text-blue-400">US</span>
        </h1>
        <p class="text-blue-300 dark:text-blue-400/70 text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">
          Plateforme de gestion du parc informatique
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Bouton de bascule clair / sombre -->
        <button
          @click="themeStore.toggleTheme()"
          class="bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-2xl border border-white/10 transition-all flex items-center justify-center"
        >
          <i v-if="themeStore.isDark" class="fas fa-sun"></i>
          <i v-else class="fas fa-moon"></i>
        </button>

        <!-- Badge de statut API, avec animation "ping" quand en ligne -->
        <div
          class="flex items-center gap-3 bg-black/20 dark:bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-inner h-10"
        >
          <div class="relative flex items-center justify-center h-4 w-4">
            <span
              v-if="apiOnline"
              class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2.5 w-2.5 border border-blue-950"
              :class="apiOnline ? 'bg-green-400' : 'bg-gray-500'"
            ></span>
          </div>
          <p class="text-[11px] font-mono font-black text-blue-100 leading-none tracking-wider uppercase pt-0.5">
            {{ apiOnline ? "En ligne" : "Vérification..." }}
          </p>
        </div>

        <!-- Bouton logout -->
        <button
          class="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/50 w-10 h-10 rounded-2xl border border-white/10 transition-all flex items-center justify-center"
        >
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useThemeStore } from "../stores/theme";

const themeStore = useThemeStore();
const apiOnline = ref(false);

// Petit test simple : le backend répond-il ? Sert juste à colorer le badge.
onMounted(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    apiOnline.value = res.ok;
  } catch {
    apiOnline.value = false;
  }
});
</script>