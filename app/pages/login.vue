
<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Welcome Back</h1>
      <p>Sign in to your account</p>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" :disabled="loading || !isHydrated" class="btn-primary">
          <span v-if="loading">Signing in...</span>
          <span v-else-if="!isHydrated">Initializing...</span>
          <span v-else>Sign In</span>
        </button>
      </form>
      <p class="auth-footer">
        Don't have an account? <NuxtLink to="/register">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '../lib/auth-client';

// Redirect authenticated users away from login
definePageMeta({ guestOnly: true });

useSeoMeta({
  title: 'Connexion — Techknè Group',
  description: 'Connectez-vous à votre espace sécurisé Techknè pour gérer vos services Cloud et BOS.',
});

const email = ref('');
const password = ref('');
const loading = ref(false);
const isHydrated = ref(false);

onMounted(() => {
  isHydrated.value = true;
});

const { fetchSession } = useSession();
const notify = useNotify();
const localePath = useLocalePath();
const router = useRouter();

async function handleLogin() {
  loading.value = true;
  try {
    const { data, error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    if (error) {
      notify.error(
        'Erreur de connexion', 
        error.message || 'Email ou mot de passe invalide'
      );
    } else {
      await fetchSession();
      router.push(localePath('/dashboard'));
    }
  } catch (e: any) {
    notify.error(
      'Erreur système', 
      e.message || 'Une erreur est survenue lors de la connexion'
    );
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 2rem;
}
.auth-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: 3rem;
  border-radius: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
h1 { font-size: 2rem; margin-bottom: 0.5rem; text-align: center; }
p { color: #888; text-align: center; margin-bottom: 2rem; }
.input-group { margin-bottom: 1.5rem; display: flex; flex-direction: column; }
label { margin-bottom: 0.5rem; font-size: 0.9rem; }
input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1rem;
  border-radius: 0.75rem;
  color: white;
  transition: border 0.3s;
}
input:focus { border-color: #3b82f6; outline: none; }
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.3s;
}
.btn-primary:hover { background: #2563eb; transform: translateY(-2px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-footer { margin-top: 1.5rem; font-size: 0.9rem; }
.auth-footer a { color: #3b82f6; text-decoration: none; }
</style>
