<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const layouts = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
    try {
        const data = await $fetch<any>('/api/mails/layouts');
        if (data && data.success) {
            layouts.value = data.layouts.map((l: any) => ({
                label: l.name,
                value: l.id
            }));
        }
    } catch (e) {
        console.error("Failed to load layouts", e);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
  <UFormField label="Layout de l'email" description="La coquille (Header/Footer) qui entourera votre message.">
    <USelect 
      :modelValue="props.modelValue" 
      @update:modelValue="emit('update:modelValue', $event)"
      :items="layouts" 
      icon="i-lucide:layout-template"
      :loading="loading"
      placeholder="Choisir un layout..."
      class="w-full"
    />
  </UFormField>
</template>
