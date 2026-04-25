import { ref, computed } from 'vue'

export const useCampaigns = () => {
    const aliases = useState<any[]>('campaign-aliases', () => [])
    const loading = ref(false)

    const fetchSettings = async () => {
        loading.value = true
        try {
            const res = await $fetch<any>('/api/campaign/settings')
            if (res.success) {
                aliases.value = res.aliases
            }
        } catch (e) {
            console.error('Failed to fetch campaign settings', e)
        } finally {
            loading.value = false
        }
    }

    const campaignTypes = [
        { id: 'email', label: 'Email Marketing', icon: 'i-lucide:mail', color: 'primary', description: 'Campagne classique envoyée par email.' },
        { id: 'notification', label: 'Notification App', icon: 'i-lucide:bell', color: 'warning', description: 'Alerte temps-réel dans le dashboard des utilisateurs.' },
        { id: 'forum', label: 'Annonce Community', icon: 'i-lucide:message-square', color: 'info', description: 'Post épinglé et mis en avant dans la section communautaire.' },
    ]

    return {
        aliases,
        loading,
        campaignTypes,
        fetchSettings
    }
}
