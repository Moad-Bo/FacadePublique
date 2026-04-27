import { withHttps } from 'ufo'

/**
 * Déduit l'URL du site à partir des variables d'environnement.
 */
export function inferSiteURL() {
  const url = (
    process.env.NUXT_PUBLIC_SITE_URL 
    || process.env.NUXT_SITE_URL 
    || process.env.VERCEL_PROJECT_PRODUCTION_URL 
    || process.env.VERCEL_BRANCH_URL 
    || process.env.VERCEL_URL 
    || process.env.URL 
    || process.env.CI_PAGES_URL 
    || process.env.CF_PAGES_URL 
  )

  return url ? withHttps(url) : undefined
}
