<template>
  <div>
    <div v-if="authStore.user">
      <p>Bienvenue, <strong>{{ authStore.user.name }}</strong> ({{ authStore.user.email }}) !</p>
      <button @click="handleLogout">Se déconnecter</button>
    </div>

    <div v-else>
      <p>Vous n'êtes pas connecté.</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
