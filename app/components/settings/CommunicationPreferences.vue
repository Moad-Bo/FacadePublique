<script setup lang="ts">
/**
 * Shared Communication Preferences Component
 * Granular control over Newsletter, Marketing, Mentions, and Community alerts.
 */
const notify = useNotify();

const settings = reactive({
  newsletter: true,
  marketing: false,
  changelog: true,
  mentions_email: true,
  mentions_push: true,
  replies_inapp: true,
  security_email: true // Lock this one
});

const isSubmitting = ref(false);

const { data: currentPrefs, refresh } = await useFetch('/api/user/preferences');

watch(currentPrefs, (newVal) => {
  if (newVal) {
    settings.newsletter = newVal.optInNewsletter;
    settings.marketing = newVal.optInMarketing;
    settings.changelog = newVal.optInChangelog;
    settings.mentions_email = newVal.optInMentions;
    settings.mentions_push = newVal.optInMentions; // Unified for now
    settings.replies_inapp = newVal.optInReplies;
  }
}, { immediate: true });

const saveSettings = async () => {
  isSubmitting.value = true;
  try {
    await $fetch('/api/user/preferences', {
      method: 'PUT',
      body: {
        newsletter: settings.newsletter,
        marketing: settings.marketing,
        changelog: settings.changelog,
        mentions: settings.mentions_email,
        replies: settings.replies_inapp
      }
    });
    notify.success('Préférences enregistrées', 'Vos réglages de communication ont été mis à jour.');
    await refresh();
  } catch (e: any) {
    notify.error('Erreur', e.message || 'Impossible de sauvegarder vos préférences.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="space-y-10">
    <header class="flex items-center justify-between pb-8 border-b border-neutral-200 dark:border-neutral-800">
       <div class="flex flex-col gap-1">
         <h2 class="text-2xl font-black tracking-tight uppercase">Préférences de communication</h2>
         <p class="text-sm text-neutral-500 font-medium">Prenez le contrôle total de votre expérience et de vos notifications.</p>
       </div>
       <UButton 
         label="Enregistrer les modifications" 
         icon="i-lucide:save"
         @click="saveSettings" 
         :loading="isSubmitting"
         class="rounded-2xl px-6 py-2.5 shadow-lg shadow-primary/20"
       />
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        <!-- EMAIL SECTION -->
        <div class="space-y-6">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-lucide:mail" class="w-5 h-5 text-primary" />
                </div>
                <h3 class="font-black text-sm uppercase tracking-widest text-neutral-400">Canaux Email</h3>
            </div>

            <UCard class="rounded-[2rem] border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
                <div class="p-2 space-y-1">
                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Newsletter Techknè</p>
                            <p class="text-xs text-neutral-500">Nos meilleures actualités technologiques une fois par semaine.</p>
                        </div>
                        <USwitch v-model="settings.newsletter" color="primary" />
                    </div>

                    <USeparator class="mx-4 opacity-50" />

                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Offres Marketing</p>
                            <p class="text-xs text-neutral-500">Recevez des promotions et des offres exclusives sur nos services.</p>
                        </div>
                        <USwitch v-model="settings.marketing" color="primary" />
                    </div>

                    <USeparator class="mx-4 opacity-50" />

                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Changelog & Mises à jour</p>
                            <p class="text-xs text-neutral-500">Soyez informés des nouvelles fonctionnalités de la plateforme.</p>
                        </div>
                        <USwitch v-model="settings.changelog" color="primary" />
                    </div>

                    <USeparator class="mx-4 opacity-50" />

                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Sécurité & Système</p>
                            <p class="text-xs text-neutral-500">Alertes critiques et sécurité (non désactivable).</p>
                        </div>
                        <USwitch v-model="settings.security_email" disabled />
                    </div>
                </div>
            </UCard>
        </div>

        <!-- INTERACTIVE SECTION -->
        <div class="space-y-6">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <UIcon name="i-lucide:bell" class="w-5 h-5 text-secondary" />
                </div>
                <h3 class="font-black text-sm uppercase tracking-widest text-neutral-400">Interactions & In-App</h3>
            </div>

            <UCard class="rounded-[2rem] border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
                <div class="p-2 space-y-1">
                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Mentions (@pseudo)</p>
                            <p class="text-xs text-neutral-500">Alertes In-App et Email quand vous êtes cité dans un contenu.</p>
                        </div>
                        <USwitch v-model="settings.mentions_email" color="secondary" />
                    </div>

                    <USeparator class="mx-4 opacity-50" />

                    <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div class="space-y-1">
                            <p class="text-sm font-bold">Réponses Community</p>
                            <p class="text-xs text-neutral-500">Notifications In-App quand quelqu'un répond à vos sujets.</p>
                        </div>
                        <USwitch v-model="settings.replies_inapp" color="secondary" />
                    </div>
                </div>
            </UCard>

            <div class="p-6 rounded-3xl bg-neutral-100 dark:bg-neutral-800/40 border border-default mt-4">
                <div class="flex gap-4">
                    <UIcon name="i-lucide:info" class="w-6 h-6 text-neutral-400 shrink-0" />
                    <p class="text-xs text-neutral-500 leading-relaxed">
                        Note : Techknè respecte le RGPD. Vous pouvez retirer votre consentement à tout moment. Les emails système liés à la sécurité de votre compte ne peuvent pas être désactivés pour votre protection.
                    </p>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
