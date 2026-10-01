<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { modules } from '../modules'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// État du menu sandwich
const isUserMenuOpen = ref(false)

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const goToUserSettings = () => {
  isUserMenuOpen.value = false
  router.push('/settings')
}

const handleLogout = () => {
  isUserMenuOpen.value = false
  authStore.logout()
  router.push('/login')
}

// Routes de la section Menu
const menuItems = [
  { name: 'Settings', path: '/settings', icon: 'fas fa-cog' },
  { name: 'Theme', path: '/theme', icon: 'fas fa-palette' },
  { name: 'Utilisateurs', path: '/users', icon: 'fas fa-users' },
]

// Routes de la section Modules
const moduleItems = modules.map((m) => ({ name: m.name, path: m.path, icon: m.icon }))
</script>

<template>
  <aside class="w-full md:w-80 h-full bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 overflow-y-auto shadow-sm relative">
    <div class="space-y-6">
      
      <!-- Box Profil Utilisateur avec Menu Sandwich -->
      <div class="relative bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 p-3 rounded-2xl border-2 border-blue-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs tracking-wider shadow-md shadow-blue-500/20">
            {{ authStore.user?.email ? authStore.user.email.substring(0, 2).toUpperCase() : 'AD' }}
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 max-w-[110px] truncate">
              {{ authStore.user?.email || 'Admin' }}
            </span>
            <span class="text-[10px] text-blue-500 font-extrabold uppercase tracking-widest">
              Administrateur
            </span>
          </div>
        </div>

        <!-- Bouton Sandwich -->
        <button 
          @click="toggleUserMenu"
          title="Menu utilisateur"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md transition-all active:scale-95"
          :class="{ 'bg-blue-600 !text-white shadow-md': isUserMenuOpen }"
        >
          <i class="fas fa-bars text-sm"></i>
        </button>

        <!-- Dropdown Menu Sandwich -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0 -translate-y-2"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100 translate-y-0"
          leave-to-class="transform scale-95 opacity-0 -translate-y-2"
        >
          <div 
            v-if="isUserMenuOpen" 
            class="absolute right-0 top-full mt-3 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-2 z-50 divide-y divide-slate-100 dark:divide-slate-800 ring-1 ring-black/5"
          >
            <!-- Header du menu -->
            <div class="px-3 py-2 mb-1">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Compte actif</p>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ authStore.user?.email || 'Non connecté' }}</p>
            </div>

            <!-- Option Paramètres -->
            <div class="py-1 space-y-1">
              <button 
                @click="goToUserSettings" 
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all group"
              >
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i class="fas fa-user-gear"></i>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Paramètres profil
                  </span>
                  <span class="text-[10px] font-medium text-slate-400">
                    Préférences & sécurité
                  </span>
                </div>
              </button>
            </div>

            <!-- Option Déconnexion -->
            <div class="pt-1 mt-1">
              <button 
                @click="handleLogout" 
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
              >
                <div class="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <i class="fas fa-arrow-right-from-bracket"></i>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-red-600 dark:text-red-400">
                    Se déconnecter
                  </span>
                  <span class="text-[10px] font-medium text-red-400/70">
                    Fermer la session
                  </span>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Navigation : Section Menu -->
      <div class="space-y-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          Menu
        </h3>
        <nav class="space-y-2">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left font-bold text-sm"
            :class="[
              route.path === item.path 
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            ]"
          >
            <div 
              class="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
              :class="[route.path === item.path ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300']"
            >
              <i :class="item.icon"></i>
            </div>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>
      </div>

      <!-- Navigation : Section Modules -->
      <div class="space-y-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          Modules
        </h3>
        <nav class="space-y-2">
          <router-link
            v-for="item in moduleItems"
            :key="item.path"
            :to="item.path"
            class="w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left font-bold text-sm"
            :class="[
              route.path === item.path 
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            ]"
          >
            <div 
              class="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
              :class="[route.path === item.path ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300']"
            >
              <i :class="item.icon"></i>
            </div>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>
      </div>

    </div>

    <!-- Footer Sidebar avec logo et bouton de thème animé -->
    <div class="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">
          NEX<span class="text-blue-500">US</span>
        </h1>
        <p class="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-400">
          Control Center
        </p>
      </div>
      
      <!-- Bouton Thème avec icône animated -->
      <button
        @click="themeStore.toggleTheme"
        title="Changer de thème"
        class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-all active:scale-90"
      >
        <Transition name="rotate" mode="out-in">
          <i 
            v-if="themeStore.isDark" 
            key="sun"
            class="fas fa-sun text-amber-400 text-base"
          ></i>
          <i 
            v-else 
            key="moon"
            class="fas fa-moon text-slate-600 text-base"
          ></i>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.rotate-enter-active,
.rotate-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.rotate-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.rotate-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>