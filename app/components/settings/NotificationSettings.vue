<script setup lang="ts">
/**
 * Shared Notifications Settings Component
 */
const notify = useNotify();

const settings = reactive({
  email_marketing: true,
  email_security: true,
  email_forum_reply: true,
  push_forum_mention: false
});

const isSubmitting = ref(false);

const saveSettings = async () => {
  isSubmitting.value = true;
  // TODO: Implement real API call
  await new Promise(resolve => setTimeout(resolve, 800));
  notify.success('Préférences enregistrées', 'Vos réglages de notifications ont été mis à jour.');
  isSubmitting.value = false;
};
</script>

<template>
  <div class="space-y-8">
    <header class="flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
       <div class="flex flex-col gap-1">
         <h2 class="text-xl font-bold tracking-tight">Notifications</h2>
         <p class="text-sm text-neutral-500">Choisissez comment vous restez informé des activités importantes.</p>
       </div>
       <UButton 
         label="Enregistrer" 
         @click="saveSettings" 
         :loading="isSubmitting"
         class="rounded-xl px-8"
       />
    </header>

    <section class="max-w-2xl space-y-6 mt-8">
       <!-- Email Notifications -->
       <UCard class="rounded-3xl border-neutral-200/60 dark:border-neutral-800/60">
         <template #header>
           <div class="flex items-center gap-2">
             <UIcon name="i-lucide-mail" class="w-4 h-4 text-primary-500" />
             <h3 class="font-bold text-sm uppercase tracking-widest text-neutral-500">Par Email</h3>
           </div>
         </template>

         <div class="space-y-6">
           <div class="flex items-center justify-between">
             <div class="space-y-0.5">
               <p class="text-sm font-bold">Sécurité du compte</p>
               <p class="text-xs text-neutral-500">Alertes de connexion, changements de mot de passe.</p>
             </div>
             <USwitch v-model="settings.email_security" disabled />
           </div>

           <USeparator />

           <div class="flex items-center justify-between">
             <div class="space-y-0.5">
               <p class="text-sm font-bold">Réponses Forum</p>
               <p class="text-xs text-neutral-500">Recevoir un email quand quelqu'un répond à votre discussion.</p>
             </div>
             <USwitch v-model="settings.email_forum_reply" color="primary" />
           </div>

           <USeparator />

           <div class="flex items-center justify-between">
             <div class="space-y-0.5">
               <p class="text-sm font-bold">Newsletter & Marketing</p>
               <p class="text-xs text-neutral-500">Actualités tech, nouveaux articles de blog et mises à jour.</p>
             </div>
             <USwitch v-model="settings.email_marketing" color="primary" />
           </div>
         </div>
       </UCard>

       <!-- In-App / Push -->
       <UCard class="rounded-3xl border-neutral-200/60 dark:border-neutral-800/60">
         <template #header>
           <div class="flex items-center gap-2">
             <UIcon name="i-lucide-smartphone" class="w-4 h-4 text-primary-500" />
             <h3 class="font-bold text-sm uppercase tracking-widest text-neutral-500">Notifications In-App</h3>
           </div>
         </template>

         <div class="flex items-center justify-between">
           <div class="space-y-0.5">
             <p class="text-sm font-bold">Mentions Forum</p>
             <p class="text-xs text-neutral-500">Être alerté si vous êtes taggué (@pseudo) dans une discussion.</p>
           </div>
           <USwitch v-model="settings.push_forum_mention" color="primary" />
         </div>
       </UCard>
    </section>
  </div>
</template>
