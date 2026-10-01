<template>
  <div class="setup-container">
    <div class="setup-card">
      <header class="setup-header">
        <h1>🛠️ Assistant d'Installation</h1>
        <p>Configuration initiale de votre application web</p>
      </header>

      <!-- Indicateur d'étapes -->
      <div class="step-indicator">
        <span :class="{ active: currentStep === 1, done: currentStep > 1 }">1. Base de données</span>
        <span :class="{ active: currentStep === 2 }">2. Compte Administrateur</span>
      </div>

      <!-- ÉTAPE 1 : Choix et configuration de la base de données -->
      <div v-if="currentStep === 1" class="step-content">
        <h2>Choisissez le type de base de données</h2>
        
        <div class="db-options">
          <label class="option-card" :class="{ selected: dbType === 'docker' }">
            <input type="radio" v-model="dbType" value="docker" @change="resetTest" />
            <div>
              <strong>Interne (Docker PostgreSQL)</strong>
              <p>Utilise la base PostgreSQL locale tournant dans le conteneur Docker.</p>
            </div>
          </label>

          <label class="option-card" :class="{ selected: dbType === 'external' }">
            <input type="radio" v-model="dbType" value="external" @change="resetTest" />
            <div>
              <strong>Externe (PostgreSQL)</strong>
              <p>Connexion à un serveur de base de données d'entreprise distant.</p>
            </div>
          </label>

          <label class="option-card" :class="{ selected: dbType === 'sqlite' }">
            <input type="radio" v-model="dbType" value="sqlite" @change="resetTest" />
            <div>
              <strong>Fichier local (SQLite)</strong>
              <p>Pour des tests rapides sans serveur de base de données dédié.</p>
            </div>
          </label>
        </div>

        <!-- Champs spécifiques pour la BDD Externe -->
        <div v-if="dbType === 'external'" class="external-db-form">
          <h3>Paramètres de la base externe</h3>
          
          <div class="form-group">
            <label>Adresse du serveur (Hôte / IP) :</label>
            <input 
              v-model="dbConfig.host" 
              type="text" 
              placeholder="ex: 192.168.1.50 ou db.entreprise.com" 
              required 
              @input="resetTest"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Port :</label>
              <input 
                v-model="dbConfig.port" 
                type="number" 
                placeholder="5432" 
                @input="resetTest"
              />
            </div>
            <div class="form-group">
              <label>Nom de la base :</label>
              <input 
                v-model="dbConfig.database" 
                type="text" 
                placeholder="db" 
                @input="resetTest"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Utilisateur :</label>
              <input 
                v-model="dbConfig.user" 
                type="text" 
                placeholder="postgres" 
                @input="resetTest"
              />
            </div>
            <div class="form-group">
              <label>Mot de passe :</label>
              <input 
                v-model="dbConfig.password" 
                type="password" 
                placeholder="••••••••" 
                @input="resetTest"
              />
            </div>
          </div>
        </div>

        <!-- Message de résultat du test -->
        <div v-if="testMessage" :class="['alert', isTestSuccess ? 'alert-success' : 'alert-error']">
          {{ testMessage }}
        </div>

        <div class="actions">
          <button @click="testDbConnection" :disabled="isLoading" class="btn-secondary">
            {{ isLoading ? 'Test en cours...' : 'Tester la connexion BDD' }}
          </button>
          <button @click="goToStep2" :disabled="!isTestSuccess" class="btn-primary">
            Étape suivante ➔
          </button>
        </div>
      </div>

      <!-- ÉTAPE 2 : Création du compte Administrateur -->
      <div v-if="currentStep === 2" class="step-content">
        <h2>Créer le compte Administrateur de secours</h2>
        <p class="subtitle">Ce compte local permettra d'accéder au système pour configurer l'Active Directory.</p>

        <form @submit.prevent="handleInstall">
          <div class="form-group">
            <label>Nom complet :</label>
            <input v-model="adminForm.name" type="text" placeholder="Ex: Admin Système" required />
          </div>

          <div class="form-group">
            <label>Adresse Email :</label>
            <input v-model="adminForm.email" type="email" placeholder="admin@entreprise.com" required />
          </div>

          <div class="form-group">
            <label>Mot de passe :</label>
            <input v-model="adminForm.password" type="password" placeholder="••••••••" required />
          </div>

          <div class="form-group">
            <label>Confirmer le mot de passe :</label>
            <input v-model="adminForm.confirmPassword" type="password" placeholder="••••••••" required />
          </div>

          <div v-if="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <div class="actions">
            <button type="button" @click="currentStep = 1" class="btn-secondary">
              ⬅️ Retour
            </button>
            <button type="submit" :disabled="isLoading" class="btn-primary">
              {{ isLoading ? 'Installation en cours...' : 'Terminer l\'installation' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// État de l'assistant
const currentStep = ref(1)
const dbType = ref('docker')
const isLoading = ref(false)
const testMessage = ref('')
const isTestSuccess = ref(false)
const errorMessage = ref('')

// Configuration dynamique pour BDD externe
const dbConfig = ref({
  host: '',
  port: '',
  database: '',
  user: '',
  password: ''
})

// Formulaire Admin
const adminForm = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Réinitialise la validation de connexion BDD en cas de changement de saisie
const resetTest = () => {
  isTestSuccess.value = false
  testMessage.value = ''
}

// 1. Tester la connexion BDD (interne ou externe)
const testDbConnection = async () => {
  isLoading.value = true
  testMessage.value = ''
  isTestSuccess.value = false

  try {
    const response = await fetch('/api/setup/test-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        dbType: dbType.value,
        config: dbType.value === 'external' ? dbConfig.value : null
      })
    })

    const data = await response.json()
    if (response.ok && data.success) {
      isTestSuccess.value = true
      testMessage.value = data.message
    } else {
      testMessage.value = data.message || 'Échec de la connexion à la base.'
    }
  } catch (err) {
    testMessage.value = 'Impossible de contacter le serveur Express.'
  } finally {
    isLoading.value = false
  }
}

// 2. Passer à l'étape 2
const goToStep2 = () => {
  if (isTestSuccess.value) {
    currentStep.value = 2
  }
}

// 3. Finaliser l'installation
const handleInstall = async () => {
  errorMessage.value = ''

  if (adminForm.value.password !== adminForm.value.confirmPassword) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  if (adminForm.value.password.length < 6) {
    errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch('/api/setup/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminName: adminForm.value.name,
        adminEmail: adminForm.value.email,
        adminPassword: adminForm.value.password,
        dbType: dbType.value,
        dbConfig: dbType.value === 'external' ? dbConfig.value : null
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      alert('Installation réussie ! Vous allez être redirigé vers la page de connexion.')
      router.push('/login')
    } else {
      errorMessage.value = data.error || 'Erreur lors de l\'installation.'
    }
  } catch (err) {
    errorMessage.value = 'Erreur réseau lors de la finalisation.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.setup-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f3f4f6;
  font-family: system-ui, -apple-system, sans-serif;
  padding: 1rem;
}

.setup-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 550px;
}

.setup-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.setup-header h1 {
  margin: 0;
  font-size: 1.6rem;
  color: #1f2937;
}

.setup-header p {
  color: #6b7280;
  margin-top: 0.25rem;
}

.step-indicator {
  display: flex;
  justify-content: space-around;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.step-indicator span {
  font-weight: 600;
  color: #9ca3af;
}

.step-indicator span.active {
  color: #2563eb;
}

.step-indicator span.done {
  color: #059669;
}

.db-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.option-card.selected {
  border-color: #2563eb;
  background-color: #eff6ff;
}

.option-card p {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Formulaire BDD externe */
.external-db-form {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.external-db-form h3 {
  margin-top: 0;
  font-size: 1rem;
  color: #374151;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

button {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.alert {
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.alert-success {
  background-color: #d1fae5;
  color: #065f46;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
}

.subtitle {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1rem;
}
</style>