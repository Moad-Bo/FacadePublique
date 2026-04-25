<script setup lang="ts">
const props = defineProps<{
  modelValue: any,
  shellId: string,
  sections: Record<string, string>
}>()

const isOpen = ref(false)

const analysisResults = computed(() => {
  const body = Object.values(props.sections).join(' ')
  const subject = props.modelValue.subject || ''
  
  const checks = [
    { 
      label: 'Objet du message', 
      ok: subject.length > 10 && subject.length < 150, 
      desc: subject.length < 10 ? 'Trop court' : 'Optimal' 
    },
    { 
      label: 'Lien de désabonnement', 
      ok: body.includes('unsubscribe') || body.includes('désabonner'), 
      desc: 'Obligatoire pour Mailgun/Gmail' 
    },
    { 
      label: 'Mots clés à risque (Spam)', 
      ok: !/gratuit|argent|gagner|cliquez ici|promo/i.test(body), 
      desc: 'Évitez les termes "Gratuit" ou "Promotion"' 
    },
    { 
      label: 'Personnalisation', 
      ok: body.includes('{user}') || body.includes('{alias}'), 
      desc: 'Utilisez des variables dynamiques' 
    }
  ]

  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)
  
  return { checks, score }
})

defineExpose({ open: () => isOpen.value = true })
</script>

<template>
  <UModal v-model="isOpen" :ui="{ content: 'max-w-2xl' }">
    <div class="p-8 space-y-8 bg-neutral-50 dark:bg-neutral-900 rounded-[2.5rem]">
       <header class="flex items-center justify-between">
          <div class="flex items-center gap-4">
             <div class="size-12 rounded-2xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center text-white">
                <UIcon name="i-lucide:gauge" class="size-6" />
             </div>
             <div>
                <h3 class="text-xl font-black uppercase italic tracking-tighter">Analyse de Conformité</h3>
                <p class="text-[10px] text-dimmed uppercase tracking-widest font-bold">Optimisation Outbound Gmail & Mailgun</p>
             </div>
          </div>
          
          <div class="text-right">
             <span class="text-4xl font-black italic tracking-tighter" :class="analysisResults.score > 70 ? 'text-success' : 'text-warning'">
               {{ analysisResults.score }}%
             </span>
             <p class="text-[9px] font-bold uppercase opacity-40">Score Deliverabilité</p>
          </div>
       </header>

       <div class="grid grid-cols-1 gap-4">
          <div v-for="check in analysisResults.checks" :key="check.label" 
            class="flex items-center justify-between p-5 rounded-3xl border border-default bg-white dark:bg-neutral-800/50 shadow-sm transition-all hover:scale-[1.01]"
          >
             <div class="flex items-center gap-4">
                <div class="size-8 rounded-full flex items-center justify-center" :class="check.ok ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'">
                   <UIcon :name="check.ok ? 'i-lucide:check-circle' : 'i-lucide:alert-triangle'" class="size-5" />
                </div>
                <div>
                   <p class="text-xs font-black uppercase tracking-tight">{{ check.label }}</p>
                   <p class="text-[9px] text-dimmed font-bold uppercase opacity-60">{{ check.desc }}</p>
                </div>
             </div>
             
             <UBadge :color="check.ok ? 'success' : 'warning'" variant="soft" size="xs" class="rounded-lg font-black uppercase text-[8px]">
               {{ check.ok ? 'Conforme' : 'À améliorer' }}
             </UBadge>
          </div>
       </div>

       <div class="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4">
          <UIcon name="i-lucide:lightbulb" class="size-6 text-primary shrink-0" />
          <p class="text-xs text-primary/80 leading-relaxed font-medium italic">
            "Pour maximiser le taux d'ouverture sur Gmail, privilégiez un objet de moins de 60 caractères et assurez-vous que votre lien de désabonnement est bien visible en pied de page."
          </p>
       </div>

       <UButton label="Fermer l'analyse" color="neutral" variant="ghost" class="w-full rounded-2xl py-4 uppercase font-black tracking-widest italic" @click="isOpen = false" />
    </div>
  </UModal>
</template>
