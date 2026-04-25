<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: ['manage_mail', 'manage_campaign'],
  title: 'Branding Configuration'
})

const notify = useNotify()
const { openComposer } = useComposer()

// --- STATE ---
const layouts = ref<any[]>([])
const loading = ref(true)
const isSidebarCollapsed = ref(false)
const activeMainTab = ref<'envelope' | 'content'>('envelope')

// Preview Modal State
const previewModal = ref({
  show: false,
  layout: null as any,
  title: ''
})

// --- FETCH DATA ---
const fetchData = async () => {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/mails/layouts')
    if (res?.success) layouts.value = res.layouts
  } catch (e: any) {
    notify.error('Erreur chargement', e.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// --- GROUPING LOGIC ---
const categories = [
  { id: 'contact',     label: 'Contact',      icon: 'i-lucide:inbox',      color: 'primary' },
  { id: 'newsletter',  label: 'Newsletter',   icon: 'i-lucide:megaphone',  color: 'success' },
  { id: 'forum',       label: 'Community',        icon: 'i-lucide:message-square', color: 'info' },
  { id: 'blog',        label: 'Blog',         icon: 'i-lucide:book-open',  color: 'warning' },
  { id: 'system',      label: 'Système',      icon: 'i-lucide:cpu',        color: 'neutral' },
]

const filteredLayouts = computed(() => {
  if (activeMainTab.value === 'envelope') {
    return layouts.value.filter(l => l.category !== 'content_layout')
  }
  return layouts.value.filter(l => l.category === 'content_layout')
})

const layoutsByCategory = computed(() => {
  const groups: Record<string, any[]> = {}
  filteredLayouts.value.forEach(l => {
    if (!groups[l.category]) groups[l.category] = []
    groups[l.category].push(l)
  })
  return groups
})

// --- ACTIONS ---
const openPreview = (layout: any) => {
  previewModal.value = {
    show: true,
    layout,
    title: layout.name
  }
}

const editLayout = (item: any) => {
  openComposer({
    mode: 'layout',
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    body: item.html
  })
}

const setAsDefault = async (id: string) => {
  try {
    await $fetch('/api/mails/layouts', { method: 'POST', body: { action: 'set-default', id } })
    notify.success('Identité visuelle par défaut mise à jour')
    await fetchData()
  } catch (e: any) { notify.error('Erreur', e.message) }
}

const deleteLayout = async (layout: any) => {
  if (layout.isDefault) return notify.warning('Protection', 'Impossible de supprimer le design par défaut.')
  if (!confirm('Supprimer ce design ?')) return
  try {
    await $fetch('/api/mails/layouts', { method: 'POST', body: { action: 'delete', id: layout.id } })
    notify.success('Design supprimé')
    await fetchData()
  } catch (e: any) { notify.error('Erreur', e.message) }
}

const dummyContent = `
  <h1 style="color:#6366f1;">Techknè Engine Test</h1>
  <p>Ceci est un exemple de contenu pour visualiser le rendu final de votre branding.</p>
  <div style="padding:15px; background:#f3f4f6; border-radius:8px;">
    Variable de test utilisateur : <strong>{{user}}</strong>
  </div>
`

</script>

<template>
  <UDashboardPanel grow>
    <div class="h-full flex overflow-hidden">

      <!-- ── SIDEBAR ──────────────────────────────────────────────────────── -->
      <aside 
        :class="[isSidebarCollapsed ? 'w-20' : 'w-72']"
        class="border-r border-default bg-neutral-50/50 dark:bg-neutral-900/10 shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
      >
        <!-- Toggle & Header -->
        <div class="p-4 border-b border-default flex items-center" :class="isSidebarCollapsed ? 'justify-center' : 'justify-between'">
           <h3 v-if="!isSidebarCollapsed" class="font-black text-[10px] uppercase tracking-widest text-dimmed">Branding Config</h3>
           <UButton 
             :icon="isSidebarCollapsed ? 'i-lucide:chevron-right' : 'i-lucide:chevron-left'" 
             variant="ghost" 
             color="neutral" 
             size="xs"
             class="hover:bg-primary/10"
             @click="isSidebarCollapsed = !isSidebarCollapsed"
           />
        </div>

        <!-- Navigation items -->
        <nav class="flex-1 p-3 space-y-2">
           <UButton 
             icon="i-lucide:layout-template" 
             :label="isSidebarCollapsed ? '' : 'Envelope Design'" 
             :color="activeMainTab === 'envelope' ? 'primary' : 'neutral'"
             :variant="activeMainTab === 'envelope' ? 'soft' : 'ghost'"
             block 
             class="justify-start font-bold"
             @click="activeMainTab = 'envelope'"
           />
           <UButton 
             icon="i-lucide:boxes" 
             :label="isSidebarCollapsed ? '' : 'Content Design'" 
             :color="activeMainTab === 'content' ? 'primary' : 'neutral'"
             :variant="activeMainTab === 'content' ? 'soft' : 'ghost'"
             block 
             class="justify-start font-bold"
             @click="activeMainTab = 'content'"
           />

           <div class="pt-4 mt-4 border-t border-default/50">
             <UButton 
               icon="i-lucide:plus-circle" 
               :label="isSidebarCollapsed ? '' : 'Nouveau Design'" 
               color="primary" 
               variant="solid"
               block 
               class="font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
               @click="openComposer({ mode: 'layout', isCreation: true })"
             />
           </div>
        </nav>

        <!-- Context Info -->
        <div v-if="!isSidebarCollapsed" class="p-4 border-t border-default text-[10px] text-dimmed font-medium italic">
           Configurez ici l'identité visuelle de vos communications.
        </div>
      </aside>

      <!-- ── MAIN CONTENT (CARDS GRID) ────────────────────────────────────── -->
      <main class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-neutral-950/20 px-8 py-8 relative">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
           <UIcon name="i-lucide:refresh-cw" class="size-8 animate-spin text-primary opacity-30" />
        </div>

        <div class="flex-none mb-8">
           <h1 class="text-2xl font-black italic uppercase tracking-tighter text-highlighted">
              {{ activeMainTab === 'envelope' ? 'Envelope Design' : 'Content Design' }}
           </h1>
           <p class="text-sm text-dimmed">Gestion centralisée de l'architecture visuelle.</p>
        </div>

        <div class="flex-1 pr-4">
           <div v-for="(group, catId) in layoutsByCategory" :key="catId" class="mb-12">
              <div class="flex items-center gap-3 mb-6">
                 <div class="h-px flex-1 bg-gradient-to-r from-transparent to-default/50" />
                 <h2 class="text-[10px] font-black uppercase tracking-[0.25em] text-dimmed flex items-center gap-2">
                    <UIcon :name="categories.find(c => c.id === catId)?.icon || 'i-lucide:folder'" class="size-3.5" />
                    {{ categories.find(c => c.id === catId)?.label || catId.toUpperCase() }}
                 </h2>
                 <div class="h-px flex-1 bg-gradient-to-l from-transparent to-default/50" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <UCard 
                    v-for="l in group" 
                    :key="l.id"
                    class="group hover:ring-2 hover:ring-primary/40 transition-all cursor-default relative overflow-hidden"
                 >
                    <div class="flex flex-col gap-4">
                       <div class="flex justify-between items-start">
                          <UBadge 
                            v-if="l.isDefault" 
                            label="DÉFAUT" 
                            size="xs" 
                            color="primary" 
                            variant="subtle" 
                            class="font-black text-[9px] px-2 py-0.5"
                          />
                          <div v-else />
                          
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <UButton icon="i-lucide:star" variant="ghost" color="neutral" size="sm" @click.stop="setAsDefault(l.id)" />
                             <UButton icon="i-lucide:trash-2" variant="ghost" color="error" size="sm" @click.stop="deleteLayout(l)" />
                          </div>
                       </div>

                       <div class="flex-1 min-w-0">
                          <h4 class="font-black text-sm truncate uppercase tracking-tight group-hover:text-primary transition-colors cursor-pointer" @click="editLayout(l)">
                             {{ l.name }}
                          </h4>
                          <p class="text-[10px] text-dimmed uppercase font-bold mt-1 tracking-wide">{{ l.id }}</p>
                       </div>

                       <div class="flex items-center gap-2 pt-2 border-t border-default/50">
                          <UButton 
                             label="Preview" 
                             icon="i-lucide:eye" 
                             variant="soft" 
                             color="neutral" 
                             size="xs" 
                             block
                             class="flex-1 font-bold" 
                             @click="openPreview(l)"
                          />
                          <UButton 
                             label="Éditer" 
                             icon="i-lucide:paintbrush" 
                             variant="solid" 
                             color="primary" 
                             size="xs" 
                             class="px-4 font-bold"
                             @click="editLayout(l)"
                          />
                       </div>
                    </div>
                    <!-- Background Decoration -->
                    <UIcon :name="categories.find(c => c.id === catId)?.icon || 'i-lucide:layout'" class="absolute -right-2 -bottom-2 size-16 opacity-[0.03] rotate-12" />
                 </UCard>
              </div>
           </div>

           <div v-if="!loading && Object.keys(layoutsByCategory).length === 0" class="flex flex-col items-center justify-center py-20 opacity-30 text-center">
              <UIcon name="i-lucide:ghost" class="size-20 mb-4" />
              <p class="font-bold">Aucun design trouvé dans cette section.</p>
           </div>
        </div>
      </main>
    </div>

    <!-- ── PREVIEW MODAL ────────────────────────────────────────────────── -->
    <UModal v-model="previewModal.show" :ui="{ content: 'sm:max-w-4xl' }">
      <div v-if="previewModal.show" class="p-0 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex flex-col h-[80vh]">
        
        <!-- Modal Toolbar -->
        <div class="p-4 px-6 border-b border-default bg-white dark:bg-neutral-900 flex items-center justify-between sticky top-0 z-10">
           <div class="flex items-center gap-4">
              <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                 <UIcon :name="categories.find(c => c.id === previewModal.layout?.category)?.icon || 'i-lucide:palette'" class="size-5" />
              </div>
              <div>
                 <h3 class="font-black text-sm uppercase tracking-tight">{{ previewModal.title }}</h3>
                 <p class="text-[10px] text-dimmed font-medium">{{ previewModal.layout?.category || 'Design' }} — Quick Preview</p>
              </div>
           </div>
           
           <div class="flex items-center gap-2">
              <UButton 
                label="Éditer" 
                icon="i-lucide:paintbrush" 
                color="primary" 
                variant="soft" 
                size="sm"
                class="font-bold"
                @click="editLayout(previewModal.layout)"
              />
              <UButton 
                icon="i-lucide:x" 
                color="neutral" 
                variant="ghost" 
                size="sm" 
                class="rounded-full"
                @click="previewModal.show = false"
              />
           </div>
        </div>

        <!-- Render Content -->
        <div class="flex-1 p-8 overflow-y-auto bg-neutral-100 dark:bg-neutral-950/40 relative">
           <div class="max-w-3xl mx-auto h-full">
              <div class="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-default shadow-2xl overflow-hidden aspect-[16/10] relative animate-in zoom-in-95 duration-300">
                 <DashboardComSharedMasterPreview 
                   v-if="previewModal.layout"
                   :shell-id="previewModal.layout.category !== 'content_layout' ? previewModal.layout.id : undefined"
                   :architecture-id="previewModal.layout.category === 'content_layout' ? previewModal.layout.id : undefined"
                   :content="dummyContent" 
                   :layouts="layouts"
                   :title="previewModal.title"
                   :show-controls="true"
                   class="h-full w-full"
                 />
              </div>
           </div>
        </div>

        <div class="p-4 px-6 border-t border-default bg-white dark:bg-neutral-900 flex justify-between items-center text-[10px] text-dimmed uppercase font-black tracking-widest">
           <span>Techknè Visualization Engine</span>
           <span>Powered by MASTER-PREVIEW Engine</span>
        </div>
      </div>
    </UModal>

  </UDashboardPanel>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
