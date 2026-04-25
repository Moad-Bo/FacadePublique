<template>
  <div class="auth-container">
    <div class="auth-card glass">
      <h2>Join Techkne</h2>
      <p class="subtitle">Create your account to get started</p>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="form.name" type="text" placeholder="John Doe" required />
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input v-model="form.email" type="email" placeholder="email@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="••••••••" required />
        </div>
        
        <!-- Community Terms & Newsletter -->
        <div class="form-group-checkbox mt-4">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input v-model="form.acceptTerms" type="checkbox" class="mt-1" required />
            <span class="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
              J'accepte les <NuxtLink to="/community/rules" target="_blank" class="text-primary-400 underline decoration-primary-400/30 underline-offset-4 hover:decoration-primary-400">CGU de la communauté</NuxtLink> et je deviens membre de la communauté.
            </span>
          </label>
        </div>

        <div class="form-group-checkbox">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input v-model="form.newsletterOptIn" type="checkbox" class="mt-1" />
            <span class="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
              Je souhaite m'abonner à la newsletter Techknè pour recevoir les actualités.
            </span>
          </label>
        </div>
        
        <button type="submit" :disabled="loading" class="btn-auth">
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
      </form>

      
      <div class="auth-footer">
        Already have an account? <NuxtLink to="/login">Sign In</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { kebabCase } from 'scule';
import { authClient } from '../lib/auth-client';

definePageMeta({ guestOnly: true });

useSeoMeta({
  title: 'Inscription — Techknè Group',
  description: 'Rejoignez le groupe Techknè et accédez à nos services Cloud, BOS et outils de productivité.',
});

const form = ref({
  name: '',
  email: '',
  password: '',
  acceptTerms: false,
  newsletterOptIn: false
});
const loading = ref(false);

const handleRegister = async () => {
  loading.value = true;
  const { error, data: authData } = await authClient.signUp.email({
    email: form.value.email,
    password: form.value.password,
    name: form.value.name,
    callbackURL: '/dashboard'
  });
  
  if (error) {
    alert(error.message);
  } else {
    // Record community terms & newsletter opt-in
    try {
      await $fetch('/api/community/accept-terms', {
        method: 'POST',
        body: { 
          version: 'v1', 
          newsletterOptIn: form.value.newsletterOptIn 
        }
      });
      console.log('[COMMUNITY] Terms accepted and newsletter handled.');
    } catch (e) {
      console.error('[COMMUNITY] Failed to record terms:', e);
    }
    navigateTo('/dashboard');
  }
  loading.value = false;
};
</script>

<style scoped>
.auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 2rem; }
.auth-card { width: 100%; max-width: 400px; padding: 3rem; border-radius: 1.5rem; text-align: center; }
.glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
h2 { font-size: 2rem; margin-bottom: 0.5rem; color: white; }
.subtitle { color: #64748b; margin-bottom: 2rem; }
.auth-form { display: flex; flex-direction: column; gap: 1.5rem; text-align: left; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.form-group input { background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 0.5rem; padding: 0.75rem; color: white; transition: 0.2s; }
.form-group input:focus { outline: none; border-color: #3b82f6; background: rgba(30, 41, 59, 0.8); }
.btn-auth { margin-top: 1rem; background: #3b82f6; color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-auth:hover { background: #2563eb; transform: translateY(-1px); }
.btn-auth:disabled { opacity: 0.5; }
.auth-footer { margin-top: 2rem; color: #64748b; font-size: 0.9rem; }
.auth-footer a { color: #3b82f6; text-decoration: none; font-weight: 600; }
</style>
