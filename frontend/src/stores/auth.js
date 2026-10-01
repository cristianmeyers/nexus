import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  // Parsing sécurisé du localStorage
  const getStoredUser = () => {
    try {
      const item = localStorage.getItem("user");
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Erreur de lecture de l'utilisateur :", e);
      localStorage.removeItem("user");
      return null;
    }
  };

  // 1. ÉTAT (State)
  const user = ref(getStoredUser());
  const token = ref(localStorage.getItem("token") || null);

  // 2. LECTURES (Getters)
  const isAuthenticated = computed(() => !!token.value);

  // 3. ACTIONS
  function setSession(newToken, newUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return {
    user,
    token,
    isAuthenticated,
    setSession,
    logout,
  };
});
