<template>
  <div class="space-y-8">
    <!-- Section : liste des utilisateurs -->
    <section>
      <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">
        Utilisateurs
      </h3>

      <div v-if="loadingUsers" class="text-sm text-slate-400">Chargement...</div>
      <div v-else-if="usersError" class="text-sm text-red-500">{{ usersError }}</div>

      <div v-else class="overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th class="px-4 py-3">Nom</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Rôle</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3">Dernière connexion</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="u in users" :key="u.id" class="text-slate-700 dark:text-slate-200">
              <td class="px-4 py-3 font-bold">{{ u.name }}</td>
              <td class="px-4 py-3">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase">
                  {{ u.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 rounded-lg text-xs font-bold uppercase"
                  :class="u.is_active
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-slate-500/10 text-slate-500'"
                >
                  {{ u.is_active ? "Actif" : "Désactivé" }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400">
                {{ formatDate(u.last_login_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section : historique des actions -->
    <section>
      <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">
        Historique des actions
      </h3>

      <div v-if="loadingLogs" class="text-sm text-slate-400">Chargement...</div>
      <div v-else-if="logsError" class="text-sm text-red-500">{{ logsError }}</div>
      <div v-else-if="logs.length === 0" class="text-sm text-slate-400 italic">
        Aucune action enregistrée pour le moment.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="log in logs"
          :key="log.id"
          class="flex items-center justify-between p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm"
        >
          <div>
            <span class="font-bold text-slate-800 dark:text-slate-100">
              {{ log.user_name || "Utilisateur supprimé" }}
            </span>
            <span class="text-slate-500 dark:text-slate-400">
              — {{ log.module }} : {{ log.action }}
            </span>
          </div>
          <span class="text-xs text-slate-400">{{ formatDate(log.created_at) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();

const users = ref([]);
const loadingUsers = ref(true);
const usersError = ref("");

const logs = ref([]);
const loadingLogs = ref(true);
const logsError = ref("");

function formatDate(isoString) {
  if (!isoString) return "Jamais";
  return new Date(isoString).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function loadUsers() {
  try {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Erreur lors du chargement.");
    }
    users.value = data.users;
  } catch (err) {
    usersError.value = err.message;
  } finally {
    loadingUsers.value = false;
  }
}

async function loadLogs() {
  try {
    const res = await fetch("/api/admin/logs", {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Erreur lors du chargement.");
    }
    logs.value = data.logs;
  } catch (err) {
    logsError.value = err.message;
  } finally {
    loadingLogs.value = false;
  }
}

onMounted(() => {
  loadUsers();
  loadLogs();
});
</script>