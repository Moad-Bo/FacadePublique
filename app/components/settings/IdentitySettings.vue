<script setup lang="ts">
/**
 * Identity Settings Component
 * Shared between public and dashboard settings.
 */
import { authClient } from '@/lib/auth-client';

const { session, fetchSession } = useSession();
const notify = useNotify();

const form = reactive({
  name: session.value?.user?.name || '',
  email: session.value?.user?.email || '',
  image: session.value?.user?.image || '',
  bio: (session.value?.user as any)?.bio || '',
  quote: (session.value?.user as any)?.quote || ''
});


const isSubmitting = ref(false);

const updateProfile = async () => {
  isSubmitting.value = true;
  try {
    const { error } = await authClient.updateUser({
      name: form.name,
      image: form.image
    });

    // Save extended fields
    await $fetch('/api/user/settings', {
      method: 'PATCH',
      body: { 
        bio: form.bio,
        quote: form.quote
      }
    });

    
    if (error) {
      notify.error('Erreur', error.message);
    } else {
      await fetchSession();
      notify.success('Profil mis à jour', 'Vos informations ont été enregistrées avec succès.');
    }
  } catch (e) {
    notify.error('Erreur', 'Une erreur inattendue est survenue.');
  } finally {
    isSubmitting.value = false;
  }
};

const changeEmail = async () => {
  notify.info('Info', 'La fonctionnalité de changement d\'email sera disponible prochainement.');
};

const isUploadingAvatar = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerAvatarUpload = () => {
  fileInputRef.value?.click();
};

const handleAvatarFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploadingAvatar.value = true;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await $fetch<any>('/api/user/avatar', {
      method: 'POST',
      body: formData
    });

    if (res.success) {
      form.image = res.url;
      await fetchSession();
      notify.success('Avatar mis à jour');
    }
  } catch (e: any) {
    notify.error('Erreur upload', e.message);
  } finally {
    isUploadingAvatar.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
};
</script>


<template>
  <div class="space-y-8">
    <header class="flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex flex-col gap-1">
        <h2 class="text-xl font-bold tracking-tight">Identité</h2>
        <p class="text-sm text-neutral-500">Gérez comment vous apparaissez sur la plateforme.</p>
      </div>
      <UButton 
        label="Enregistrer" 
        icon="i-lucide-save" 
        @click="updateProfile" 
        :loading="isSubmitting"
        class="rounded-xl"
      />
    </header>

    <div class="max-w-2xl space-y-8">
      <UCard class="rounded-[2rem] border-neutral-200/50 dark:border-neutral-800/50 shadow-sm overflow-hidden">
        <template #header>
          <div class="flex items-center gap-6">
            <UAvatar
              :src="form.image"
              :alt="form.name"
              size="2xl"
              class="ring-4 ring-primary-500/10 shadow-lg"
            />
            <div class="space-y-3">
              <div>
                <h3 class="font-black text-xl leading-tight">{{ form.name }}</h3>
                <p class="text-sm text-neutral-500">{{ form.email }}</p>
              </div>
              <div class="flex items-center gap-2">
                 <input type="file" ref="fileInputRef" class="hidden" accept="image/*" @change="handleAvatarFileChange" />
                 <UButton 
                  icon="i-lucide-upload" 
                  label="Importer" 
                  color="primary" 
                  variant="subtle" 
                  size="xs" 
                  :loading="isUploadingAvatar"
                  @click="triggerAvatarUpload" 
                  class="rounded-lg font-bold" 
                 />
                 <UButton icon="i-lucide-trash" color="error" variant="ghost" size="xs" @click="form.image = ''" class="rounded-lg" />
              </div>
            </div>
          </div>
        </template>

        <UForm :state="form" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <UFormField label="Nom Complet" name="name" description="Utilisé publiquement sur le forum.">
               <UInput v-model="form.name" size="lg" placeholder="Votre nom" :ui="{ base: 'rounded-xl' }" />
             </UFormField>

             <UFormField label="URL de l'Avatar" name="image" description="Lien vers une image externe en attendant l'upload direct.">
               <UInput v-model="form.image" size="lg" placeholder="https://..." icon="i-lucide-link" :ui="{ base: 'rounded-xl' }" />
             </UFormField>
          </div>

          <USeparator class="my-6 border-neutral-100 dark:border-neutral-800" />

          <UFormField label="Bio" name="bio" description="Décrivez-vous en quelques mots.">
             <UTextarea v-model="form.bio" autoresize :rows="3" placeholder="Développeur passionné..." :ui="{ base: 'rounded-xl' }" />
          </UFormField>

          <UFormField label="Citation ou Devise" name="quote" description="Une courte phrase affichée sur votre profil.">
             <UInput v-model="form.quote" size="lg" placeholder="Stay hungry, stay foolish." icon="i-lucide-quote" :ui="{ base: 'rounded-xl' }" />
          </UFormField>

          
          <UFormField label="Adresse Email" name="email" help="Pour changer votre email, une vérification sera nécessaire.">
            <div class="flex gap-2">
              <UInput v-model="form.email" size="lg" disabled class="opacity-50 flex-1" :ui="{ base: 'rounded-xl' }" />
              <UButton label="Changer" variant="outline" color="neutral" @click="changeEmail" />
            </div>
          </UFormField>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
