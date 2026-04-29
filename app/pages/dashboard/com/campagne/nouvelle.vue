<script setup lang="ts">
/**
 * Page nouvelle campagne — orchestre le Composer Shell en mode 'campagne'.
 * Les steps sont dans composer/steps/campagne/ et enregistrés dans useStudioConfig.
 */
definePageMeta({
    title: 'Nouvelle Campagne',
    layout: 'dashboard',
    middleware: ['permission'],
    requiredPermission: ['manage_campaign']
})

const { openComposer, isComposerOpen, saveCampaign, isComposerLoading, composerForm } = useComposer()
const router = useRouter()

// Ouvrir le composer en mode 'campagne' dès que la page charge
onMounted(() => {
    openComposer({ mode: 'campagne', isCreation: true })
})

// Quand le composer se ferme (bouton X ou après publication), retour à la liste
watch(isComposerOpen, (open) => {
    if (!open) router.push('/dashboard/com/campagne')
})
</script>

<template>
  <!-- Le Composer Shell modal est géré globalement par DashboardComComposerShell -->
  <!-- Cette page ne fait qu'orchestrer l'ouverture et la navigation de retour -->
  <UDashboardPanel grow>
    <div class="flex flex-col items-center justify-center h-full gap-6">
      <div class="size-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10">
        <UIcon name="i-lucide:send" class="size-10 text-primary opacity-40 animate-pulse" />
      </div>
      <div class="text-center space-y-2">
        <p class="text-xs uppercase tracking-[0.3em] font-black text-primary opacity-60">Campagnes Studio</p>
        <p class="text-sm font-bold italic opacity-40">Ouverture du compositeur...</p>
      </div>
    </div>
  </UDashboardPanel>
</template>
