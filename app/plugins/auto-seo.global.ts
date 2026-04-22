export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp();
  const route = useRoute();
  const locale = $i18n.locale;

  // Mapping sub-routes to keywords and translations
  const SEO_MAP = {
    basis: {
      fr: { title: 'Basis — Cloud & BOS', desc: 'Infrastructure Cloud et système d\'exploitation business.', kw: ['cloud', 'bos', 'saas', 'infra'] },
      en: { title: 'Basis — Cloud & BOS', desc: 'Cloud Infrastructure and business operating system.', kw: ['cloud', 'bos', 'saas', 'infra'] }
    },
    syn: {
      fr: { title: 'Syn — Conseil & Audit', desc: 'Agence conseil stratégique et technique.', kw: ['conseil', 'audit', 'agence', 'digital'] },
      en: { title: 'Syn — Consulting & Audit', desc: 'Strategic and technical consulting agency.', kw: ['consulting', 'audit', 'agency', 'digital'] }
    },
    faq: {
      fr: { title: 'Foire Aux Questions', desc: 'Questions fréquentes sur le groupe Techknè.', kw: ['aide', 'support', 'faq'] },
      en: { title: 'Frequently Asked Questions', desc: 'Common questions about Techknè Group.', kw: ['help', 'support', 'faq'] }
    }
  };

  // Helper to compute SEO data for current route
  const getSeoConfig = () => {
    const segments = route.path.split('/').filter(Boolean);
    const slug = segments.length > 1 ? segments[1] : segments[0];
    const currentLocale = (locale.value || 'fr') as 'fr' | 'en';
    return SEO_MAP[slug as keyof typeof SEO_MAP]?.[currentLocale];
  };

  // Base SEO Fallback Logic
  const defaultKeywords = ['techknè', 'groupe techknè', 'industrie digitale', 'informatique'];

  // Call useSeoMeta directly in the plugin body. 
  // By using getters () => ..., we keep it reactive to route and locale changes.
  useSeoMeta({
    title: () => {
      const config = getSeoConfig();
      if (config?.title) return config.title;
      const segments = route.path.split('/').filter(Boolean);
      const slug = segments.length > 1 ? segments[1] : segments[0];
      return slug?.charAt(0).toUpperCase() + slug?.slice(1) || 'Techknè Group';
    },
    description: () => {
      const config = getSeoConfig();
      return config?.desc || 'Techknè Group — Un écosystème informatique complet : Cloud, BOS, Mailing, Création Web et Conseil.';
    },
    keywords: () => {
      const config = getSeoConfig();
      const segments = route.path.split('/').filter(Boolean);
      const slug = segments.length > 1 ? segments[1] : segments[0];
      const pageKeywords = [...defaultKeywords, ...(config?.kw || []), slug].filter(Boolean);
      return pageKeywords.join(', ');
    },
    titleTemplate: (title) => title ? `${title} | Techknè Group` : 'Techknè Group — Industrie Digitale Modernisée',
    ogType: 'website',
    ogSiteName: 'Techknè Group',
    twitterCard: 'summary_large_image',
  });
});
