<script setup lang="ts">
/**
 * Page nouveau modèle — orchestre le Composer Shell en mode 'modele'.
 * Les steps sont dans composer/steps/modele/ et enregistrés dans useStudioConfig.
 */
definePageMeta({
    title: 'Nouveau Modèle',
    layout: 'dashboard',
    middleware: ['permission'],
    requiredPermission: ['manage_campaign']
})

const { openComposer, isComposerOpen } = useComposer()
const router = useRouter()

onMounted(() => {
    openComposer({ mode: 'modele', isCreation: true })
})

watch(isComposerOpen, (open) => {
    if (!open) router.push('/dashboard/com/campagne')
})
</script>

<template>
  <UDashboardPanel grow>
    <div class="flex flex-col items-center justify-center h-full gap-6">
      <div class="size-20 rounded-3xl bg-info-500/5 flex items-center justify-center border border-info-500/10">
        <UIcon name="i-lucide:layout" class="size-10 text-info-500 opacity-40 animate-pulse" />
      </div>
      <div class="text-center space-y-2">
        <p class="text-xs uppercase tracking-[0.3em] font-black text-info-500 opacity-60">Modèles Studio</p>
        <p class="text-sm font-bold italic opacity-40">Ouverture du compositeur de modèle...</p>
      </div>
    </div>
  </UDashboardPanel>
</template>
