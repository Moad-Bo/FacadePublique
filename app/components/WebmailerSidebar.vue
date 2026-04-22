<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const props = defineProps<{
  activeFolder: string
  sidebarExpanded: boolean
  systemFolders: { id: string, label: string, icon: string }[]
  customFolders: any[]
  labels: any[]
  rules: any[]
}>()

const emit = defineEmits(['update:activeFolder', 'update:sidebarExpanded', 'refreshFolders', 'refreshLabels', 'openRulesModal', 'deleteRule', 'open-settings'])

const openSections = useLocalStorage('webmailer-sidebar-sections', {
  system: true,
  custom: true,
  labels: true,
  rules: false
})

const showNewLabel = ref(false)
const newLabelName = ref('')
const newLabelColor = ref('primary')

const showNewFolder = ref(false)
const newFolderName = ref('')
const newFolderColor = ref('neutral')

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<{ id: string, name: string, type: 'folder' | 'label' } | null>(null)

const labelColorOptions = [
  { label: 'Principal', value: 'primary' },
  { label: 'Succès', value: 'success' },
  { label: 'Avertissement', value: 'warning' },
  { label: 'Erreur', value: 'error' },
  { label: 'Info', value: 'info' },
  { label: 'Neutre', value: 'neutral' },
]

const createFolder = async () => {
  if (!newFolderName.value.trim()) return
  try {
    await $fetch('/api/mails/folders', { 
      method: 'POST', 
      body: { 
        action: 'create', 
        name: newFolderName.value,
        color: newFolderColor.value 
      } 
    })
    newFolderName.value = ''
    newFolderColor.value = 'neutral'
    showNewFolder.value = false
    emit('refreshFolders')
  } catch (e) {}
}

const deleteFolder = async (id: string) => {
  try {
    await $fetch('/api/mails/folders', { method: 'POST', body: { action: 'delete', id } })
    if (props.activeFolder === id) emit('update:activeFolder', 'inbox')
    emit('refreshFolders')
  } catch (e) {}
}

const createLabel = async () => {
  if (!newLabelName.value.trim()) return
  try {
    await $fetch('/api/mails/labels', { method: 'POST', body: { action: 'create', name: newLabelName.value, color: newLabelColor.value } })
    newLabelName.value = ''
    showNewLabel.value = false
    emit('refreshLabels')
  } catch (e) {}
}

const deleteLabel = async (id: string) => {
  try {
    await $fetch('/api/mails/labels', { method: 'POST', body: { action: 'delete', id } })
    emit('refreshLabels')
  } catch (e) {}
}

const updateFolderColor = async (id: string, color: string) => {
  try {
    await $fetch('/api/mails/folders', { method: 'POST', body: { action: 'update', id, color } })
    emit('refreshFolders')
  } catch (e) {}
}

const updateLabelColor = async (id: string, color: string) => {
  try {
    await $fetch('/api/mails/labels', { method: 'POST', body: { action: 'update', id, color } })
    emit('refreshLabels')
  } catch (e) {}
}

const requestDelete = (item: any, type: 'folder' | 'label') => {
  itemToDelete.value = { id: item.id, name: item.name, type }
  isDeleteModalOpen.value = true
}

const onConfirmDelete = async () => {
  if (!itemToDelete.value) return
  
  const { id, type } = itemToDelete.value
  try {
    if (type === 'folder') {
      await $fetch('/api/mails/folders', { method: 'POST', body: { action: 'delete', id } })
      if (props.activeFolder === id) emit('update:activeFolder', 'inbox')
      emit('refreshFolders')
    } else {
      await $fetch('/api/mails/labels', { method: 'POST', body: { action: 'delete', id } })
      emit('refreshLabels')
    }
  } catch (e) {}
  
  isDeleteModalOpen.value = false
  itemToDelete.value = null
}
</script>

<template>
  <div class="h-full bg-white dark:bg-neutral-900 border-r border-default transition-all duration-300 shrink-0 flex flex-col" :class="[sidebarExpanded ? 'w-56' : 'w-14']">
    <div class="p-2 border-b border-default text-center">
      <UButton :icon="sidebarExpanded ? 'i-lucide:panel-left-close' : 'i-lucide:panel-left-open'" variant="ghost" color="neutral" size="sm" @click="emit('update:sidebarExpanded', !sidebarExpanded)" />
    </div>

    <!-- TEST BUTTON AT TOP -->
    <div class="p-2 border-b border-default">
      <UButton 
        icon="i-lucide:cog" 
        label="Paramètres"
        variant="solid" 
        color="primary" 
        block 
        size="sm"
        class="font-extrabold"
        @click="emit('open-settings')"
      />
    </div>
    
    <div class="flex-1 scrollbar-thin overflow-y-auto p-2 space-y-2">
      <!-- SYSTEM FOLDERS -->
      <div class="flex flex-col">
        <div v-if="sidebarExpanded" class="flex items-center justify-between px-2 py-1 cursor-pointer group/sec" @click="openSections.system = !openSections.system">
          <span class="text-[9px] font-black uppercase text-dimmed tracking-widest">Dossiers</span>
          <UIcon :name="openSections.system ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'" class="size-3 text-dimmed group-hover/sec:text-primary transition-colors" />
        </div>
        <div v-show="!sidebarExpanded || openSections.system" class="space-y-0.5 mt-0.5">
          <UButton 
            v-for="folder in systemFolders" 
            :key="folder.id" 
            :icon="folder.icon" 
            :color="activeFolder === folder.id ? 'primary' : 'neutral'" 
            :variant="activeFolder === folder.id ? 'soft' : 'ghost'" 
            block 
            :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']" 
            size="sm" 
            @click="emit('update:activeFolder', folder.id)"
          >
            <span v-if="sidebarExpanded" class="truncate">{{ folder.label }}</span>
          </UButton>
        </div>
      </div>
      
      <!-- CUSTOM FOLDERS -->
      <div class="flex flex-col">
        <div v-if="sidebarExpanded" class="flex items-center justify-between px-2 py-1 cursor-pointer group/sec" @click="openSections.custom = !openSections.custom">
          <span class="text-[9px] font-black uppercase text-dimmed tracking-widest">Mes Dossiers</span>
          <UIcon :name="openSections.custom ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'" class="size-3 text-dimmed group-hover/sec:text-primary transition-colors" />
        </div>
        <div v-show="!sidebarExpanded || openSections.custom" class="space-y-0.5 mt-0.5">
          <div v-for="folder in customFolders" :key="folder.id" class="group/folder flex items-center gap-0">
            <UButton 
              :color="activeFolder === folder.id ? 'primary' : 'neutral'" 
              :variant="activeFolder === folder.id ? 'soft' : 'ghost'" 
              block 
              :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']" 
              size="sm" 
              class="flex-1 truncate"
              @click="emit('update:activeFolder', folder.id)"
            >
              <template #leading>
                <UIcon 
                  :name="folder.icon || 'i-lucide:folder'" 
                  class="size-4 shrink-0 transition-colors" 
                  :class="[`text-${folder.color || 'neutral'}-500`]"
                />
              </template>
              <span v-if="sidebarExpanded" class="truncate">{{ folder.name }}</span>
            </UButton>
            
            <div v-if="sidebarExpanded" class="flex items-center pr-1">
              <UDropdownMenu :items="labelColorOptions.map(c => ({ label: c.label, color: c.value as any, onSelect: () => updateFolderColor(folder.id, c.value) }))">
                <UButton 
                  icon="i-lucide:paintbrush" 
                  size="xs" 
                  variant="ghost" 
                  color="neutral" 
                  class="shrink-0"
                />
              </UDropdownMenu>
              <UButton 
                icon="i-lucide:x" 
                size="xs" 
                variant="ghost" 
                color="error" 
                class="shrink-0" 
                @click.stop="requestDelete(folder, 'folder')" 
              />
            </div>
          </div>
          <div v-if="sidebarExpanded" class="pt-1">
            <div v-if="showNewFolder" class="flex flex-col gap-1 px-1">
              <UInput v-model="newFolderName" size="xs" placeholder="Nom..." @keyup.enter="createFolder" />
              <div class="flex gap-1">
                <USelect v-model="newFolderColor" :items="labelColorOptions" size="xs" class="flex-1" />
                <UButton icon="i-lucide:check" size="xs" color="primary" @click="createFolder" />
                <UButton icon="i-lucide:x" size="xs" color="neutral" variant="ghost" @click="showNewFolder = false" />
              </div>
            </div>
            <UButton v-else icon="i-lucide:plus" label="Nouveau dossier" variant="ghost" color="neutral" size="xs" class="w-full justify-start px-2 opacity-60 hover:opacity-100 font-medium" @click="showNewFolder = true" />
          </div>
        </div>
      </div>

      <!-- LABELS SECTION -->
      <div class="flex flex-col">
        <div v-if="sidebarExpanded" class="flex items-center justify-between px-2 py-1 cursor-pointer group/sec" @click="openSections.labels = !openSections.labels">
          <span class="text-[9px] font-black uppercase text-dimmed tracking-widest">Labels</span>
          <UIcon :name="openSections.labels ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'" class="size-3 text-dimmed group-hover/sec:text-primary transition-colors" />
        </div>
        <div v-show="!sidebarExpanded || openSections.labels" class="space-y-0.5 mt-0.5">
          <div v-for="label in labels" :key="label.id" class="group/label flex items-center gap-0">
            <UButton 
              :color="activeFolder === label.id ? 'primary' : 'neutral'" 
              :variant="activeFolder === label.id ? 'soft' : 'ghost'" 
              block 
              :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']" 
              size="sm" 
              class="flex-1 truncate"
              @click="emit('update:activeFolder', label.id)"
            >
              <template #leading>
                <UIcon 
                  name="i-lucide:tag" 
                  class="size-4 shrink-0 transition-colors" 
                  :class="[`text-${label.color || 'primary'}-500`]"
                />
              </template>
              <span v-if="sidebarExpanded" class="truncate">{{ label.name }}</span>
            </UButton>

            <div v-if="sidebarExpanded" class="flex items-center pr-1">
              <UDropdownMenu :items="labelColorOptions.map(c => ({ label: c.label, color: c.value as any, onSelect: () => updateLabelColor(label.id, c.value) }))">
                <UButton 
                  icon="i-lucide:paintbrush" 
                  size="xs" 
                  variant="ghost" 
                  color="neutral" 
                  class="shrink-0"
                />
              </UDropdownMenu>
              <UButton 
                icon="i-lucide:x" 
                size="xs" 
                variant="ghost" 
                color="error" 
                class="shrink-0" 
                @click.stop="requestDelete(label, 'label')" 
              />
            </div>
          </div>
          <div v-if="sidebarExpanded" class="pt-1">
            <div v-if="showNewLabel" class="flex flex-col gap-1 px-1">
              <UInput v-model="newLabelName" size="xs" placeholder="Nom..." @keyup.enter="createLabel" />
              <div class="flex gap-1">
                <USelect v-model="newLabelColor" :items="labelColorOptions" size="xs" class="flex-1" />
                <UButton icon="i-lucide:check" size="xs" color="primary" @click="createLabel" />
                <UButton icon="i-lucide:x" size="xs" color="neutral" variant="ghost" @click="showNewLabel = false" />
              </div>
            </div>
            <UButton v-else icon="i-lucide:plus" label="Nouveau label" variant="ghost" color="neutral" size="xs" class="w-full justify-start px-2 opacity-60 hover:opacity-100 font-medium" @click="showNewLabel = true" />
          </div>
        </div>
      </div>

      <!-- RULES SECTION -->
      <div class="flex flex-col pb-4">
        <div v-if="sidebarExpanded" class="flex items-center justify-between px-2 py-1 cursor-pointer group/sec" @click="openSections.rules = !openSections.rules">
          <span class="text-[9px] font-black uppercase text-dimmed tracking-widest">Filtres Auto</span>
          <UIcon :name="openSections.rules ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'" class="size-3 text-dimmed group-hover/sec:text-primary transition-colors" />
        </div>
        <div v-show="!sidebarExpanded || openSections.rules" class="space-y-0.5 mt-0.5">
          <UButton icon="i-lucide:filter" :label="sidebarExpanded ? 'Créer un filtre' : ''" variant="ghost" color="primary" size="xs" :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']" class="w-full font-bold" @click="emit('openRulesModal')" />
          <div v-for="rule in rules" :key="rule.id" class="group/rule flex items-center gap-1">
             <UButton 
              variant="ghost" 
              color="neutral" 
              block 
              :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']" 
              size="xs" 
              @click="emit('openRulesModal', rule)"
            >
              <template #leading>
                <UIcon name="i-lucide:arrow-right" class="size-3 text-dimmed" />
              </template>
              <span v-if="sidebarExpanded" class="truncate text-[10px]">{{ rule.senderEmail }}</span>
            </UButton>
            <UButton 
              v-if="sidebarExpanded"
              icon="i-lucide:x" 
              size="xs" 
              variant="ghost" 
              color="error" 
              class="opacity-0 group-hover/rule:opacity-100 shrink-0 scale-75" 
              @click.stop="emit('deleteRule', rule.id)" 
            />
          </div>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRMATION MODAL -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide:triangle-alert" class="size-5 text-error-500" />
              <span class="font-bold">Confirmer la suppression</span>
            </div>
          </template>
          
          <div class="p-4">
            <p class="text-sm text-dimmed">
              Êtes-vous sûr de vouloir supprimer {{ itemToDelete?.type === 'folder' ? 'le dossier' : 'le label' }} 
              <span class="font-bold text-default">"{{ itemToDelete?.name }}"</span> ?
            </p>
            <p class="text-xs text-error-500 mt-2 font-medium">Cette action est irréversible.</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="Annuler" variant="ghost" color="neutral" @click="isDeleteModalOpen = false" />
              <UButton label="Supprimer" color="error" @click="onConfirmDelete" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- SETTINGS BUTTON (Bottom) -->
    <footer class="p-2 border-t border-default shrink-0 mt-auto bg-white dark:bg-neutral-900 z-10">
      <UButton 
        icon="i-lucide:settings" 
        variant="ghost" 
        color="neutral" 
        block 
        size="sm" 
        class="group font-bold transition-all hover:bg-primary/5"
        :class="[sidebarExpanded ? 'justify-start px-2' : 'justify-center px-0']"
        @click="emit('open-settings')"
      >
        <template v-if="sidebarExpanded" #leading>
          <UIcon name="i-lucide:settings" class="size-4 text-primary group-hover:rotate-45 transition-transform duration-300" />
        </template>
        <span v-if="sidebarExpanded" class="truncate text-toned group-hover:text-primary transition-colors">Paramètres</span>
      </UButton>
    </footer>
  </div>
</template>
