<template>
  <div class="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
    <div
      class="bg-slate-800/80 backdrop-blur-md p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/10"
    >
      <div class="text-center mb-8">
        <h2 class="text-4xl font-black italic tracking-tighter mb-2 text-white">
          NEX<span class="text-blue-500">US</span>
        </h2>
        <p class="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400">
          Network Endpoint eXecution & Unified Systems
        </p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div class="relative">
          <i class="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            required
            class="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 py-4 pl-12 pr-6 rounded-2xl outline-none transition-all text-sm font-bold text-gray-800"
          />
        </div>

        <div class="relative">
          <i class="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="password"
            type="password"
            placeholder="Mot de passe"
            required
            class="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 py-4 pl-12 pr-6 rounded-2xl outline-none transition-all text-sm font-bold text-gray-800"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
        >
          Connexion
        </button>
      </form>

      <div v-if="errorMessage" class="mt-4 text-center text-red-400 text-xs font-bold">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const password = ref("");
const errorMessage = ref("");

const router = useRouter();
const authStore = useAuthStore();

const handleLogin = async () => {
  errorMessage.value = "";

  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      authStore.setSession(data.token, data.user);
      router.push("/");
    } else {
      errorMessage.value = data.message || "Échec de la connexion.";
    }
  } catch (error) {
    errorMessage.value = "Impossible de contacter le serveur.";
  }
};
</script>