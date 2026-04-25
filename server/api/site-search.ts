import type { Collections } from '@nuxt/content'

// Cet endpoint permet de récupérer et rechercher toutes les pages du site :
// - Celles générées par Nuxt Content v3 (docs_fr, docs_en)
// - Les pages statiques de l'application "normale" (/login, /dashboard)
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').toLowerCase()
  
  // 1. Pages de l'application fixe
  const appPages = [
    { title: 'Accueil', path: '/', description: 'Page d\'accueil du projet Techkne', category: 'App' },
    { title: 'Connexion', path: '/login', description: 'Accéder à votre espace sécurisé', category: 'App' },
    { title: 'Inscription', path: '/register', description: 'Créer un nouveau compte', category: 'App' },
    { title: 'Tableau de bord', path: '/dashboard', description: 'Gérez vos données', category: 'App' }
  ]

  // 2. Fetch pages Markdown via Nuxt Content v3 (depuis SQLite en mémoire)
  const docsFr = await queryCollection('docs_fr' as any).select('title', 'path', 'description').all()
  const docsEn = await queryCollection('docs_en' as any).select('title', 'path', 'description').all()

  const contentPages = [
    ...(Array.isArray(docsFr) ? docsFr.map(p => ({ ...p, category: 'Docs (FR)' })) : []),
    ...(Array.isArray(docsEn) ? docsEn.map(p => ({ ...p, category: 'Docs (EN)' })) : [])
  ]

  // Combine
  const allPages = [...appPages, ...contentPages]

  // Si aucune requête de recherche, retourner tout
  if (!q) {
    return allPages
  }

  // Si recherche, filtrer simple (côté serveur, très rapide)
  return allPages.filter(page => {
    return page.title?.toLowerCase().includes(q) || 
           page.description?.toLowerCase().includes(q) ||
           page.path?.toLowerCase().includes(q)
  })
})
