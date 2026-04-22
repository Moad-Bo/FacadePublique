<script setup lang="ts">
/**
 * Community Settings Component (Privacy Mock)
 */
const privacy = reactive({
  showEmail: false,
  showBirthday: false,
  showFullName: true,
  allowMessages: true
});

const isSaving = ref(false);
const notify = useNotify();

const savePrivacy = async () => {
    isSaving.value = true;
    setTimeout(() => {
        isSaving.value = false;
        notify.success('Confidentialité mise à jour', 'Vos réglages communautaires ont été enregistrés.');
    }, 1000);
};
</script>

<template>
  <div class="space-y-12">
    <header class="flex flex-col gap-1 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold tracking-tight">Espace Communautaire</h2>
        <UButton 
            :loading="isSaving" 
            label="Enregistrer" 
            color="primary" 
            size="sm" 
            class="rounded-xl"
            icon="i-lucide-save"
            @click="savePrivacy"
        />
      </div>
      <p class="text-sm text-neutral-500">Gérez la visibilité de vos informations sur le forum et le blog.</p>
    </header>

    <div class="space-y-8 max-w-2xl">
      <!-- Visibility Section -->
      <section class="space-y-6">
        <div class="flex flex-col gap-1">
          <h3 class="font-bold text-sm uppercase tracking-widest text-neutral-400">Visibilité du Profil</h3>
          <p class="text-xs text-neutral-500">Identifiez les informations que vous souhaitez partager avec les autres membres.</p>
        </div>

        <div class="space-y-4">
          <UCard class="rounded-3xl border-neutral-200/50 dark:border-neutral-800/50 shadow-none">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Afficher mon Nom Complet</span>
                  <span class="text-xs text-neutral-500">Si désactivé, seul votre username sera visible.</span>
                </div>
                <USwitch v-model="privacy.showFullName" />
              </div>

              <USeparator class="border-neutral-100 dark:border-neutral-800" />

              <div class="flex items-center justify-between text-neutral-400">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Username</span>
                  <span class="text-xs italic">Affiché publiquement (non modifiable ici)</span>
                </div>
                <UBadge label="Toujours Public" color="neutral" variant="subtle" size="sm" class="rounded-full" />
              </div>
            </div>
          </UCard>
        </div>
      </section>

      <!-- Private Data Section -->
      <section class="space-y-6">
        <div class="flex flex-col gap-1">
          <h3 class="font-bold text-sm uppercase tracking-widest text-neutral-400">Données Sensibles</h3>
        </div>

        <UCard class="rounded-3xl border-neutral-200/50 dark:border-neutral-800/50 shadow-none">
           <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Adresse Email</span>
                  <span class="text-xs text-neutral-500">Permettre aux membres de voir votre email de contact.</span>
                </div>
                <USwitch v-model="privacy.showEmail" />
              </div>

              <USeparator class="border-neutral-100 dark:border-neutral-800" />

              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Date d'Anniversaire</span>
                  <span class="text-xs text-neutral-500">Afficher votre anniversaire sur votre profil public.</span>
                </div>
                <USwitch v-model="privacy.showBirthday" />
              </div>
           </div>
        </UCard>
      </section>

      <!-- Interactions -->
      <section class="space-y-6 pt-4">
        <div class="p-6 rounded-3xl bg-primary-500/5 border border-primary-500/10 border-dashed">
            <div class="flex items-center gap-4">
                <UIcon name="i-lucide-info" class="w-8 h-8 text-primary-500" />
                <div>
                   <h4 class="font-bold text-sm text-primary-600">Note sur les interactions</h4>
                   <p class="text-xs text-primary-500/80 leading-relaxed">
                     L'accès au profil public et les interactions communautaires (commentaires, articles) 
                     nécessitent d'avoir accepté les conditions générales d'utilisation (CGU).
                   </p>
                </div>
            </div>
        </div>
      </section>
    </div>
  </div>
</template>
