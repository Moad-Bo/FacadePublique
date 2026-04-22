<script setup lang="ts">
/**
 * Security Settings Component
 * Shared between public and dashboard settings.
 */
import { authClient } from '@/lib/auth-client';

const { session } = useSession();
const notify = useNotify();

const isDeleteModalOpen = ref(false);
const confirmEmail = ref('');
const isDeleting = ref(false);

const isEmailValid = computed(() => confirmEmail.value === session.value?.user?.email);

const requestPasswordReset = async () => {
  try {
    const { error } = await (authClient as any).forgetPassword({

      email: session.value?.user?.email || '',
      redirectTo: '/auth/reset-password'
    });
    if (error) notify.error('Erreur', error.message);
    else notify.success('Succès', 'Lien de réinitialisation envoyé par email.');
  } catch (e) {
    notify.error('Erreur', 'Une erreur est survenue.');
  }
};

const verifyEmail = async () => {
    try {
        const { error } = await authClient.sendVerificationEmail({
            email: session.value?.user?.email || '',
            callbackURL: window.location.origin + '/settings/security'
        });
        if (error) notify.error('Erreur', error.message);
        else notify.success('Succès', 'Email de vérification envoyé.');
    } catch (e) {
        notify.error('Erreur', "Impossible d'envoyer le mail.");
    }
};

const isCguModalOpen = ref(false);

const handleDeleteAccount = async () => {

  if (!isEmailValid.value) return;
  isDeleting.value = true;
  try {
    const { error } = await authClient.deleteUser();
    if (error) notify.error('Erreur', error.message);
    else {
      notify.success('Compte supprimé', 'À bientôt peut-être.');
      window.location.href = '/';
    }
  } catch (e) {
    notify.error('Erreur', 'Échec de la suppression.');
  } finally {
    isDeleting.value = false;
    isDeleteModalOpen.value = false;
  }
};
</script>

<template>
  <div class="space-y-12">
    <header class="flex flex-col gap-1 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <h2 class="text-xl font-bold tracking-tight">Sécurité & Accès</h2>
      <p class="text-sm text-neutral-500">Protégez votre compte et gérez vos informations de connexion.</p>
    </header>

    <div class="max-w-2xl space-y-6">
      <!-- Email Verification -->
      <UCard v-if="!session?.user?.emailVerified" class="border-warning-200 bg-warning-50/50 dark:border-warning-900/30 dark:bg-warning-900/10 rounded-2xl">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning-500" />
            <div>
              <p class="text-sm font-bold text-warning-800 dark:text-warning-400">Email non vérifié</p>
              <p class="text-xs text-warning-700/80 dark:text-warning-500/80">Vérifiez votre mail pour débloquer toutes les fonctions.</p>
            </div>
          </div>
          <UButton label="Vérifier maintenant" color="warning" variant="subtle" size="xs" @click="verifyEmail" />
        </div>
      </UCard>


      <!-- Password -->
      <UCard class="rounded-2xl border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-sm font-bold">Mot de passe</p>
            <p class="text-xs text-neutral-500 italic">Modifier votre clé d'accès sécurisée.</p>
          </div>
          <UButton label="Réinitialiser via email" color="neutral" variant="soft" @click="requestPasswordReset" />
        </div>
      </UCard>

      <!-- Legal & Data Management -->
      <UCard class="rounded-2xl border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-sm font-bold">Données & Légal</p>
            <p class="text-xs text-neutral-500 italic">Consulter les Conditions Générales d'Utilisation et Mentions Légales.</p>
          </div>
          <UButton label="Consulter" color="neutral" variant="ghost" icon="i-lucide-file-text" @click="isCguModalOpen = true" />
        </div>
      </UCard>

      <!-- CGU Modal -->
      <UModal v-model:open="isCguModalOpen" title="Mentions Légales & CGU">
        <template #content>
          <div class="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
             <div class="space-y-2">
                <h3 class="font-black text-lg">Conditions Générales d'Utilisation</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  En utilisant la plateforme Techknè, vous vous engagez à respecter les règles de bienséance du forum.
                  Vos données personnelles (email, nom, et préférences) sont stockées de manière sécurisée et ne sont jamais revendues.
                </p>
             </div>
             <div class="space-y-2">
                <h3 class="font-black text-lg">Mentions Légales</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  Éditeur : Techknè SAS<br />
                  Hébergement : Vercel / Cloudflare<br />
                  Pour toute demande de droit à l'oubli (RGPD) n'utilisant pas la suppression automatique, veuillez nous contacter à l'adresse privacy@techkne.com.
                </p>
             </div>
          </div>
        </template>
      </UModal>


      <!-- Danger Zone -->
      <section class="mt-12 space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-skull" class="w-4 h-4 text-error-500" />
          <h3 class="font-bold uppercase text-xs tracking-widest text-error-500">Zone de Danger</h3>
        </div>

        <UCard class="rounded-2xl border-error-200 dark:border-error-900/40 bg-error-50/20 dark:bg-error-900/5">
          <div class="flex items-center justify-between gap-4">
             <div class="space-y-1">
               <p class="text-sm font-bold text-error-600 dark:text-error-400">Supprimer le compte</p>
               <p class="text-xs text-neutral-500">Toutes vos données (posts, messages) seront anonymisées.</p>
             </div>
             <UButton label="Supprimer" color="error" variant="ghost" @click="isDeleteModalOpen = true" />
          </div>
        </UCard>
      </section>

      <!-- Delete Modal -->
      <UModal v-model:open="isDeleteModalOpen" title="Supprimer le compte">
        <template #content>
          <div class="space-y-4 p-6">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-400">
               <UIcon name="i-lucide-alert-octagon" class="w-6 h-6 shrink-0" />
               <p class="text-sm font-medium">Cette action est irréversible. Toutes vos informations personnelles seront effacées.</p>
            </div>
            
            <UFormField label="Pour confirmer, saisissez votre email">
               <UInput v-model="confirmEmail" :placeholder="session?.user?.email" class="rounded-xl" />
            </UFormField>

            <div class="flex justify-end gap-3 mt-6">
              <UButton label="Annuler" variant="ghost" color="neutral" @click="isDeleteModalOpen = false" />
              <UButton 
                label="Confirmer la suppression" 
                color="error" 
                :disabled="!isEmailValid" 
                :loading="isDeleting"
                class="rounded-xl"
                @click="handleDeleteAccount" 
              />
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
