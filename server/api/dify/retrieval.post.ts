import { queryCollection } from '@nuxt/content/server';

/**
 * Endpoint de Retrieval pour Dify.
 * Chemin : server/api/dify/retrieval.post.ts
 * 
 * RÔLE : 
 * Sert de "External Knowledge API" pour Dify. Il interroge Nuxt Content v3 (SQLite local)
 * et récupère le Markdown brut optimisé via les endpoints de nuxt-llms.
 */
export default defineEventHandler(async (event) => {
  // 1. Sécurité & Authentification
  const auth = getHeader(event, 'Authorization');
  const apiKey = process.env.DIFY_RETRIEVAL_KEY; // Clé à configurer dans le .env
  
  if (!auth || (apiKey && auth !== `Bearer ${apiKey}`)) {
    return {
      error_code: 1002,
      error_msg: 'Authorization failed'
    };
  }

  // 2. Parsing de la requête Dify
  const body = await readBody(event);
  const { query, retrieval_setting } = body;
  
  if (!query) {
    return { records: [] };
  }

  const topK = retrieval_setting?.top_k || 3;
  const scoreThreshold = retrieval_setting?.score_threshold || 0.5;

  try {
    // 3. Logique de Recherche dans Nuxt Content v3 (Local SQLite)
    // On cherche dans les collections de documentation (fr/en)
    const [docsFr, docsEn] = await Promise.all([
      queryCollection(event, 'content_fr' as any).select('title', 'path', 'description').all(),
      queryCollection(event, 'content_en' as any).select('title', 'path', 'description').all()
    ]);

    const allDocs = [...docsFr, ...docsEn];

    // Filtrage textuel simple (le titre ou la description contient la requête)
    const matchedDocs = allDocs
      .filter(doc => (
        doc.title?.toLowerCase().includes(query.toLowerCase()) || 
        doc.description?.toLowerCase().includes(query.toLowerCase())
      ))
      .slice(0, topK);

    // 4. Extraction du Markdown Brut via nuxt-llms
    // On appelle l'endpoint interne /raw/<path>.md pour avoir le contenu sans HTML
    const records = await Promise.all(matchedDocs.map(async (doc) => {
      try {
        // Nettoyage du path pour l'endpoint nuxt-llms
        const cleanPath = doc.path.replace(/\/$/, '');
        const rawContentPath = `/_llms/raw${cleanPath}.md`;
        
        // Appel interne Nitro ($fetch est optimisé pour les appels internes sans HTTP overhead)
        const rawMarkdown = await $fetch<string>(rawContentPath, {
          headers: getHeaders(event) as any
        });

        return {
          content: rawMarkdown || doc.description || doc.title,
          score: 0.99, // Score haut car match textuel direct
          title: doc.title,
          metadata: {
            path: doc.path
          }
        };
      } catch (e) {
        // Fallback si nuxt-llms ne répond pas pour ce fichier
        return {
          content: doc.description || doc.title,
          score: 0.80,
          title: doc.title,
          metadata: {
            path: doc.path
          }
        };
      }
    }));

    // 5. Formatage de la réponse finale
    return {
      records: records.filter(r => r.score >= scoreThreshold)
    };

  } catch (error: any) {
    console.error('[Dify Retrieval Error]:', error);
    return {
      error_code: 500,
      error_msg: error.message || 'Internal Server Error'
    };
  }
});
