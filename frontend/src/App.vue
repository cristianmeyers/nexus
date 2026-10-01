<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()

// Pages qui doivent s'afficher en plein écran sans la Sidebar
const standalonePages = ['/login', '/setup']
const isStandalone = computed(() => standalonePages.includes(route.path))
</script>

<template>
  <!-- 1. Pages autonomes (Connexion / Setup) -->
  <router-view v-if="isStandalone" />

  <!-- 2. Application globale plein écran -->
  <div 
    v-else 
    class="w-screen h-screen bg-gray-100 dark:bg-slate-950 p-3 md:p-4 flex gap-4 overflow-hidden font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300"
  >
    <!-- Sidebar Latérale -->
    <Sidebar />

    <!-- Zone d'affichage Principale (Vue Droite) -->
    <main class="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border-2 border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto relative shadow-sm">
      <!-- Top Bar de titre -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
        <div>
          <h2 class="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white uppercase">
            {{ route.meta.title || 'Control Center' }}
          </h2>
          <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            {{ route.meta.subtitle || 'Gestionnaire de système WAKEJS' }}
          </p>
        </div>
      </div>

      <!-- Contenu de la vue courante (HomeView, etc.) -->
      <div class="flex-1 flex flex-col">
        <router-view />
      </div>
    </main>
  </div>
</template>