import { ref, computed } from 'vue';

export const useForum = () => {
  const categories = useState<any[]>('forum-categories', () => []);
  const isLoading = ref(false);
  const isMember = useState<boolean>('forum-is-member', () => false);

  const checkMembership = async () => {
    const { session } = useSession();
    if (!session.value) {
      isMember.value = false;
      return;
    }
    try {
      // We could have a dedicated endpoint or check the agreement table
      // For now, we'll try to fetch a "check" endpoint or just handle it via the session if we extended it.
      // Let's assume there's an endpoint /api/community/status
      const data: any = await $fetch('/api/community/status').catch(() => ({ isMember: false }));
      isMember.value = data.isMember;
    } catch (e) {
      isMember.value = false;
    }
  };

  const fetchCategories = async () => {
    isLoading.value = true;
    try {
      const data = await $fetch('/api/forum/categories');
      categories.value = data;
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const getCategoryBySlug = (slug: string) => {
    return categories.value.find(c => c.slug === slug);
  };

  const handleVote = async (targetId: string, targetType: 'thread' | 'reply', value: number) => {
     if (!isMember.value) {
       // Trigger modal or notification
       const notify = useNotify();
       notify.warning('Adhésion requise', 'Vous devez accepter les CGU de la communauté pour voter.');
       return;
     }

     try {
       await $fetch('/api/forum/votes', { 
         method: 'POST', 
         body: { targetId, targetType, value } 
       });
     } catch (e) {
       console.error('Voting failed:', e);
     }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  return {
    categories,
    isLoading,
    isMember,
    fetchCategories,
    checkMembership,
    getCategoryBySlug,
    handleVote,
    formatDate
  };
};
