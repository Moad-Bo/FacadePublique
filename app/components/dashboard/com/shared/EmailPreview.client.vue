<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps<{
  content: string;
  subject?: string;
  layoutId?: string;
  zoom?: number;
  fullSize?: boolean;
}>();

const layouts = ref<any[]>([]);
const currentLayout = ref<string>('{{{body}}}');

const zoomLevel = computed(() => props.zoom || 100);

// Fetch layouts once and cache them
onMounted(async () => {
    try {
        const data = await $fetch<any>('/api/mails/layouts');
        if (data?.success) {
            layouts.value = data.layouts;
            updateShell();
        }
    } catch (e) {
        console.error("Failed to fetch layouts for preview", e);
    }
});

const updateShell = () => {
    if (!props.layoutId) {
        currentLayout.value = '{{{body}}}';
        return;
    }
    const layout = layouts.value.find(l => l.id === props.layoutId);
    currentLayout.value = layout ? layout.html : '{{{body}}}';
};

watch(() => props.layoutId, updateShell);

const previewHtml = computed(() => {
    let body = props.content || '<p style="color:#ccc; font-style:italic;">Aucun contenu...</p>';
    
    // Simple replacement logic for preview
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    return currentLayout.value
        .replace(/\{\{\{body\}\}\}/g, body)
        .replace(/\{\{body\}\}/g, body)
        .replace(/\{user\}/g, 'Utilisateur Test')
        .replace(/\{date\}/g, dateStr)
        .replace(/\{unsubscribe_link\}/g, '#')
        .replace(/\{company_name\}/g, 'Techknè Group');
});
</script>

<template>
  <div class="h-full w-full overflow-auto bg-neutral-100 dark:bg-neutral-900 flex justify-center">
    <div 
      class="w-full h-full flex justify-center transition-all duration-300"
      :class="[fullSize ? 'p-0' : 'p-4']"
      :style="{ minWidth: fullSize ? '100%' : `${zoomLevel}%` }"
    >
      <iframe 
        :srcdoc="previewHtml" 
        class="w-full h-full border-none shadow-2xl bg-white transition-all duration-200 ease-out"
        :class="[fullSize ? 'rounded-none' : 'rounded-sm']"
        :style="{ 
          transform: fullSize ? 'scale(1)' : `scale(${zoomLevel / 100})`, 
          transformOrigin: 'top center',
          width: '100%',
          height: '100%'
        }"
      />
    </div>
  </div>
</template>
