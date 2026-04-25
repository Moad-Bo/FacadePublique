<script setup lang="ts">
import { ref, onMounted, computed, h, resolveComponent } from 'vue';
import { authClient } from '../../../lib/auth-client';
import type { TableColumn } from '@nuxt/ui';
import { ALL_PERMISSIONS } from '../../../lib/permissions';

// Resolution of Nuxt UI components for use in h()
const UDropdownMenu = resolveComponent('UDropdownMenu');
const UButton = resolveComponent('UButton');
const USelect = resolveComponent('USelect');

// Page protection
definePageMeta({ 
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_roles',
  title: 'Utilisateurs & Permissions',
  path: '/dashboard/users',
});

useSeoMeta({
  title: 'Administration — Techknè Group',
  robots: 'noindex, nofollow',
});

const { session, hasPermission } = useSession();

// --- DATA POOLING (SSR-Ready) ---
const { 
  data: usersData, 
  status: usersStatus, 
  refresh: refreshUsers 
} = await useFetch<{ users: any[] }>('/api/admin/users', {
  lazy: true,
  server: true,
  default: () => ({ users: [] }),
  // Only fetch if has permission
  immediate: hasPermission('manage_roles')
});

const { 
  data: rolesData, 
  status: rolesStatus, 
  refresh: refreshRoles 
} = await useFetch<any[]>('/api/roles', {
  lazy: true,
  server: true,
  default: () => []
});

// Computed mirrors for compatibility with existing logic
const users = computed(() => usersData.value?.users || []);
const rolesList = computed(() => rolesData.value || []);

const loading = computed(() => usersStatus.value === 'pending');
const loadingRoles = computed(() => rolesStatus.value === 'pending');
const submitting = ref(false);

const roleNames = computed(() => rolesList.value.map(r => r.name).sort());

const searchTerms = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref('desc');
const activeTab = ref('users');


const tabs = computed(() => [
  { label: 'Utilisateurs', icon: 'i-lucide-users', value: 'users' },
  { label: 'Rôles & Permissions', icon: 'i-lucide-shield-check', value: 'roles' }
]);

// Modal States
const isUserModalOpen = ref(false);
const isRoleModalOpen = ref(false);
const isBanModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const userToDelete = ref<any>(null);

const userData = ref({
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'user'
});

const roleData = ref({
  id: '',
  name: '',
  permissions: [] as string[]
});

const banData = ref({
  userId: '',
  reason: ''
});

const allPermissions = ALL_PERMISSIONS;

// Handlers are kept for explicit refreshes after mutations
const refreshAll = async () => {
  await Promise.all([refreshUsers(), refreshRoles()]);
};

// API Handlers
const notify = useNotify();
const updatingUserId = ref<string | null>(null);

const updateRole = async (userId: string, roleName: string) => {
  const foundRole = rolesList.value.find(r => r.name === roleName);
  const permissions = foundRole?.permissions || '';
  
  updatingUserId.value = userId;
  try {
    await $fetch('/api/admin/users/update', { 
      method: 'POST', 
      body: { 
        userId, 
        role: roleName,
        permissions
      } 
    });
    await refreshUsers();
    notify.success('Rôle mis à jour');
  } catch (e: any) {
    console.error('Update user failed:', e);
    notify.error('Erreur', e.statusMessage || 'Impossible de mettre à jour le rôle');
  } finally {
    updatingUserId.value = null;
  }
};

const saveUser = async () => {
  if (!userData.value.email || !userData.value.name) return;
  submitting.value = true;
  try {
    if (userData.value.id) {
      // Update existing
      await $fetch('/api/admin/users/update', {
        method: 'POST',
        body: {
          userId: userData.value.id,
          name: userData.value.name,
          email: userData.value.email,
          password: userData.value.password || undefined,
          role: userData.value.role
        }
      });
      notify.success('Profil mis à jour');
    } else {
      // Create new
      if (!userData.value.password) return;
      await $fetch('/api/admin/users/create', {
        method: 'POST',
        body: {
          email: userData.value.email,
          password: userData.value.password,
          name: userData.value.name,
          role: userData.value.role,
        }
      });
      notify.success('Utilisateur créé');
    }
    isUserModalOpen.value = false;
    await refreshUsers();
  } catch (e: any) {
    console.error('Save user failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  } finally {
    submitting.value = false;
  }
};

const saveRole = async () => {
  if (!roleData.value.name) return;
  submitting.value = true;
  try {
    await $fetch('/api/roles', {
      method: 'POST',
      body: {
        id: roleData.value.id || undefined,
        name: roleData.value.name,
        permissions: roleData.value.permissions.join(',')
      }
    });
    isRoleModalOpen.value = false;
    await refreshRoles();
    notify.success(roleData.value.id ? 'Rôle mis à jour' : 'Rôle créé');
  } catch (e: any) {
    console.error('Save role failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  } finally {
    submitting.value = false;
  }
};

const deleteRole = async (id: string) => {
  if (!confirm('Supprimer ce rôle ?')) return;
  try {
    await $fetch('/api/roles', { method: 'DELETE', body: { id } });
    await refreshRoles();
    notify.success('Rôle supprimé');
  } catch (e: any) {
    console.error('Delete role failed:', e);
    notify.error('Action impossible', e.data?.message || e.statusMessage || 'Une erreur est survenue');
  }
};

const impersonateUser = async (userId: string) => { 
  try {
    await $fetch('/api/admin/users/impersonate', {
      method: 'POST',
      body: { userId }
    });
    console.log('[ADMIN] Impersonation success, redirecting...');
    // Give the browser a moment to process the Set-Cookie header
    setTimeout(() => {
      window.location.href = '/dashboard'; 
    }, 100);
  } catch (e: any) {
    console.error('Impersonation failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  }
};

const openEditUser = (u: any) => {
  userData.value = {
    id: u.id,
    name: u.name,
    email: u.email,
    password: '', // Reset password field for security
    role: u.role
  };
  isUserModalOpen.value = true;
};

const openBanPrompt = (userId: string) => { banData.value = { userId, reason: '' }; isBanModalOpen.value = true; };

const confirmBan = async () => { 
  if (!banData.value.reason) return;
  try {
    await $fetch('/api/admin/users/ban', {
      method: 'POST',
      body: { 
        userId: banData.value.userId, 
        reason: banData.value.reason 
      }
    });
    isBanModalOpen.value = false;
    await refreshUsers(); 
    notify.success('Utilisateur banni');
  } catch (e: any) {
    console.error('Ban failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  }
};

const unbanUser = async (userId: string) => { 
  try {
    await $fetch('/api/admin/users/unban', {
      method: 'POST',
      body: { userId }
    });
    await refreshUsers();
    notify.success('Utilisateur débanni');
  } catch (e: any) {
    console.error('Unban failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  }
};

const deleteUser = (u: any) => { 
  userToDelete.value = u;
  isDeleteModalOpen.value = true;
};

const confirmDelete = async () => { 
  if (!userToDelete.value) return;
  const userId = userToDelete.value.id;
  submitting.value = true;
  try {
    await $fetch('/api/admin/users/delete', {
      method: 'POST',
      body: { userId }
    });
    console.log('[ADMIN] User deleted successfully:', userId);
    isDeleteModalOpen.value = false;
    await refreshUsers();
    notify.success('Utilisateur supprimé');
  } catch (e: any) {
    console.error('Delete user failed:', e);
    notify.error('Erreur', e.statusMessage || 'Action impossible');
  } finally {
    submitting.value = false;
    userToDelete.value = null;
  }
};

// filtering and sorting
const filteredUsers = computed(() => {
  let list = users.value;
  
  // 1. Search filter
  if (searchTerms.value) {
    const s = searchTerms.value.toLowerCase();
    list = list.filter(u => 
      u.name?.toLowerCase().includes(s) || 
      u.email?.toLowerCase().includes(s) ||
      u.role?.toLowerCase().includes(s)
    );
  }

  // 2. Sorting
  return [...list].sort((a, b) => {
    let valA = a[sortBy.value] || '';
    let valB = b[sortBy.value] || '';

    // Handle date strings
    if (sortBy.value === 'createdAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});


// Columns Definition
const userColumns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Utilisateur',
    cell: ({ row }) => {
      const u = row.original;
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs' }, 
          (u.name || u.email).charAt(0).toUpperCase()),
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'font-semibold text-sm' }, u.name),
          h('span', { class: 'text-[10px] text-neutral-500' }, u.email)
        ])
      ]);
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Inscription',
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return h('span', { class: 'text-xs text-neutral-500 font-mono' }, 
        date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
      );
    }
  },

  {
    accessorKey: 'role',
    header: 'Attribuer un Rôle',
    cell: ({ row }) => {
      const u = row.original;
      return h(USelect as any, { 
        modelValue: u.role,
        items: roleNames.value,
        disabled: updatingUserId.value === u.id,
        class: 'w-40 bg-neutral-100 dark:bg-neutral-800 border-none rounded px-2 py-1 text-[10px] font-bold uppercase cursor-pointer',
        'onUpdate:modelValue': (val: string) => updateRole(u.id, val)
      });
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const u = row.original;
      const items = [
        [
          { label: 'Editer', icon: 'i-lucide-edit', onSelect: () => openEditUser(u) },
          { label: 'Imiter', icon: 'i-lucide-venetian-mask', onSelect: () => impersonateUser(u.id) },
          { 
            label: u.banned ? 'Débannir' : 'Bannir', 
            icon: u.banned ? 'i-lucide-user-check' : 'i-lucide-user-x', 
            color: u.banned ? 'success' : 'warning',
            onSelect: () => u.banned ? unbanUser(u.id) : openBanPrompt(u.id) 
          }
        ],
        [
          { label: 'Supprimer', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => deleteUser(u) }
        ]
      ];
      return h('div', { class: 'flex justify-end' }, [
        h(UDropdownMenu as any, { items, content: { align: 'end' } }, () => h(UButton as any, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'xs' }))
      ]);
    }
  }
];

// Roles management logic
const openAddRole = () => { roleData.value = { id: '', name: '', permissions: [] }; isRoleModalOpen.value = true; };
const openEditRole = (r: any) => { roleData.value = { id: r.id, name: r.name, permissions: (r.permissions || '').split(',').filter(Boolean) }; isRoleModalOpen.value = true; };

const isRoleStatic = computed(() => {
  if (!roleData.value.id) return false;
  const found = rolesList.value.find(r => r.id === roleData.value.id);
  return !!found?.isStatic;
});

</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar title="Administration">
      <template #right>
        <UTabs v-model="activeTab" :items="tabs" variant="link" />
      </template>
    </UDashboardNavbar>

    <div class="p-6 space-y-6 flex flex-col h-full overflow-hidden">
      <!-- DASHBOARD USERS -->
      <template v-if="activeTab === 'users'">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-800/20 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div class="flex items-center gap-3 flex-1 w-full">
            <UInput
              v-model="searchTerms"
              icon="i-lucide-search"
              placeholder="Rechercher..."
              class="max-w-xs flex-1"
            />
            <div class="flex items-center gap-2">
              <USelect 
                v-model="sortBy" 
                :items="[
                  { label: 'Date', value: 'createdAt' },
                  { label: 'Nom', value: 'name' },
                  { label: 'Rôle', value: 'role' }
                ]"
                class="w-32"
              />
              <UButton 
                :icon="sortOrder === 'asc' ? 'i-lucide-sort-asc' : 'i-lucide-sort-desc'" 
                color="neutral" 
                variant="ghost" 
                @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              />
            </div>
          </div>
          <UButton 
            label="Ajouter un Profil" 
            icon="i-lucide-user-plus"
            @click="userData = { id:'', name:'', email:'', password:'', role:'user' }; isUserModalOpen = true"
          />
        </div>


        <UTable 
          :data="filteredUsers" 
          :columns="userColumns" 
          :loading="loading"
          class="flex-1 overflow-auto bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800"
          :ui="{
             base: 'table-fixed border-separate border-spacing-0',
             thead: '[&>tr]:bg-neutral-50/50 dark:[&>tr]:bg-neutral-800/20',
             td: 'border-b border-neutral-100 dark:border-neutral-800 py-3'
          }"
        >
          <template #loading>
            <div class="p-4 space-y-4">
              <div v-for="i in 5" :key="i" class="flex items-center space-x-4">
                <USkeleton class="h-10 w-10 rounded-full" />
                <div class="space-y-2 flex-1">
                  <USkeleton class="h-4 w-3/4" />
                  <USkeleton class="h-4 w-1/2" />
                </div>
                <USkeleton class="h-8 w-20" />
              </div>
            </div>
          </template>
        </UTable>
      </template>

      <!-- DASHBOARD ROLES -->
      <template v-if="activeTab === 'roles'">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col">
            <h2 class="text-xl font-bold">Modèles de Roles & Permissions</h2>
            <p class="text-xs text-neutral-500">Configurez les droits d'accès globaux par rôle (Code & Base de données).</p>
          </div>
          <UButton label="Créer un rôle" icon="i-lucide-plus" @click="openAddRole" />
        </div>

        <div v-if="loadingRoles" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard v-for="i in 3" :key="i" class="animate-pulse h-32 bg-neutral-100 dark:bg-neutral-800" />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
          <UCard v-for="r in rolesList" :key="r.id" class="hover:ring-2 hover:ring-primary/20 transition-all group">
            <template #header>
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="font-bold uppercase tracking-wide text-primary">{{ r.name }}</span>
                  <UBadge v-if="r.isStatic" label="Système" size="xs" color="neutral" variant="soft" />
                </div>
                <div class="flex gap-1">
                  <UButton v-if="!r.isStatic" size="xs" color="neutral" variant="ghost" icon="i-lucide-edit" @click="openEditRole(r)" />
                  <UButton v-if="!r.isStatic" size="xs" color="error" variant="ghost" icon="i-lucide-trash" @click="deleteRole(r.id)" />
                  <UBadge v-else label="Lecture seule" size="xs" color="neutral" variant="outline" class="text-[9px]" />
                </div>
              </div>
            </template>
            <div class="flex flex-wrap gap-1">
              <span v-if="!r.permissions && !r.isStatic" class="text-xs italic text-neutral-400">Aucune permission spécifique</span>
              <span v-else-if="r.isStatic && r.name === 'admin'" class="text-xs font-medium text-primary">Accès complet (Overlord)</span>
              <template v-else>
                <UBadge 
                  v-for="p in (r.permissions || '').split(',').filter(Boolean)" 
                  :key="p" 
                  size="xs" 
                  variant="soft" 
                  color="primary"
                >
                  {{ allPermissions.find(ap => ap.value === p)?.label || p }}
                </UBadge>
              </template>
            </div>
          </UCard>
        </div>
      </template>

      <!-- Administration content -->
    </div>

    <!-- MODALS -->
    <UModal v-model:open="isUserModalOpen" title="Gestion du Compte" description="Configurez les informations d'un utilisateur et son rôle au sein de l'organisation.">
      <template #content>
        <div class="p-6 space-y-4">
          <UFormField label="Nom Complet">
            <UInput v-model="userData.name" placeholder="ex: Marc Technè" />
          </UFormField>
          <UFormField label="Email professionnel">
            <UInput v-model="userData.email" type="email" placeholder="admin@techkne.group" />
          </UFormField>
          <UFormField :label="userData.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe provisoire'">
            <UInput v-model="userData.password" type="password" placeholder="••••••••" />
          </UFormField>
          <UFormField label="Rôle Attribué">
            <USelect v-model="userData.role" :items="roleNames" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <UButton label="Annuler" variant="ghost" color="neutral" @click="isUserModalOpen = false" />
            <UButton label="Valider" icon="i-lucide-check" :loading="submitting" @click="saveUser" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isRoleModalOpen" title="Configuration des Permissions" description="Définissez dynamiquement les accès pour ce rôle système.">
      <template #content>
        <div class="p-6 space-y-6" :key="roleData.id">
          <UFormField label="Identifiant du rôle (Nom)">
            <UInput 
              v-model="roleData.name" 
              placeholder="ex: moderateur_forum" 
              :disabled="isRoleStatic" 
            />
          </UFormField>

          <div class="space-y-3">
            <span class="text-sm font-semibold">Droits d'accès :</span>
            <div class="grid grid-cols-2 gap-2">
              <UButton
                v-for="perm in allPermissions"
                :key="perm.value"
                :variant="roleData.permissions.includes(perm.value) ? 'solid' : 'soft'"
                :color="roleData.permissions.includes(perm.value) ? 'primary' : 'neutral'"
                size="xs"
                @click="roleData.permissions.includes(perm.value) ? roleData.permissions = roleData.permissions.filter(p => p !== perm.value) : roleData.permissions.push(perm.value)"
              >
                {{ perm.label }}
              </UButton>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <UButton label="Fermer" variant="ghost" color="neutral" @click="isRoleModalOpen = false" />
            <UButton label="Sauvegarder" icon="i-lucide-save" :loading="submitting" @click="saveRole" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- BAN MODAL -->
    <UModal v-model:open="isBanModalOpen" title="Bannir l'utilisateur" description="Cette action est sérieuse et impactera l'accès du membre immédiatement.">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-950/20 text-warning-700 dark:text-warning-400 rounded-xl border border-warning-200 dark:border-warning-800/50">
            <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 shrink-0" />
            <p class="text-sm">Attention : Cette action suspendra immédiatement l'accès de l'utilisateur à la plateforme.</p>
          </div>
          
          <UFormField label="Motif du bannissement" required>
            <UInput v-model="banData.reason" placeholder="ex: Violation des conditions d'utilisation..." autofocus />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <UButton label="Annuler" variant="ghost" color="neutral" @click="isBanModalOpen = false" />
            <UButton label="Confirmer le Bannissement" color="warning" icon="i-lucide-user-x" @click="confirmBan" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- DELETE CONFIRM MODAL -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirmer la suppression" description="Cette action est irréversible et supprimera le compte définitivement.">
      <template #content>
        <div class="p-6 space-y-4">
          <div v-if="userToDelete" class="flex items-center gap-3 p-4 bg-error-50 dark:bg-error-950/20 text-error-700 dark:text-error-400 rounded-xl border border-error-200 dark:border-error-800/50">
            <UIcon name="i-lucide-trash-2" class="w-6 h-6 shrink-0" />
            <div class="text-sm">
                <p class="font-bold">Êtes-vous certain de vouloir supprimer l'utilisateur :</p>
                <p class="mt-1">{{ userToDelete.name }} ({{ userToDelete.email }})</p>
            </div>
          </div>
          
          <p class="text-xs text-neutral-500 italic">
            Note: Toutes les sessions actives de cet utilisateur seront immédiatement révoquées.
          </p>

          <div class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <UButton label="Annuler" variant="ghost" color="neutral" @click="isDeleteModalOpen = false" />
            <UButton label="Supprimer Définitivement" color="error" icon="i-lucide-trash-2" :loading="submitting" @click="confirmDelete" />
          </div>
        </div>
      </template>
    </UModal>

  </UDashboardPanel>
</template>
