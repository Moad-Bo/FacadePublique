import { ref } from 'vue'

// Les contextes de campagne alignés avec EmailContext du backend
export const CAMPAIGN_TYPES = [
    {
        id: 'campaign_newsletter' as const,
        label: 'Newsletter',
        icon: 'i-lucide:mail',
        color: 'primary' as const,
        description: 'Newsletter éditoriale régulière envoyée aux abonnés newsletter.',
        alias: 'Techknè Newsletter',
        optInField: 'optInNewsletter' as const,
        fromEnvKey: 'mailDomainCampaignNewsletter',
    },
    {
        id: 'campaign_changelog' as const,
        label: 'Changelog',
        icon: 'i-lucide:git-commit-horizontal',
        color: 'info' as const,
        description: 'Notes de mise à jour produit & nouvelles fonctionnalités.',
        alias: 'Techknè Changelog',
        optInField: 'optInChangelog' as const,
        fromEnvKey: 'mailDomainCampaignChangelog',
    },
    {
        id: 'campaign_promo' as const,
        label: 'Promotion',
        icon: 'i-lucide:tag',
        color: 'warning' as const,
        description: 'Communications promotionnelles et offres spéciales.',
        alias: 'Techknè Offres',
        optInField: 'optInMarketing' as const,
        fromEnvKey: 'mailDomainCampaignPromo',
    },
]

export type CampaignTypeId = typeof CAMPAIGN_TYPES[number]['id']

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

    /**
     * Retourne la config d'un type de campagne par son ID.
     */
    const getCampaignTypeConfig = (id: CampaignTypeId) => {
        return CAMPAIGN_TYPES.find(t => t.id === id) || CAMPAIGN_TYPES[0]
    }

    /**
     * Retourne l'alias résolu pour un type de campagne
     * en le cherchant dans les aliases chargés depuis l'API settings.
     */
    const getAliasForType = (typeId: CampaignTypeId) => {
        const conf = getCampaignTypeConfig(typeId)
        // Tente de trouver un alias correspondant dans ceux chargés depuis l'env
        const match = aliases.value.find(a =>
            a.label?.toLowerCase().includes(conf.label.toLowerCase()) ||
            a.label?.toLowerCase() === 'newsletter' && typeId === 'campaign_newsletter' ||
            a.label?.toLowerCase() === 'changelog' && typeId === 'campaign_changelog' ||
            a.label?.toLowerCase() === 'marketing' && typeId === 'campaign_promo'
        )
        return match || { label: conf.alias, email: `${typeId}@support.techkne.com` }
    }

    return {
        aliases,
        loading,
        campaignTypes: CAMPAIGN_TYPES,
        fetchSettings,
        getCampaignTypeConfig,
        getAliasForType,
    }
}
