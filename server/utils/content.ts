import type { LocaleObject } from '@nuxtjs/i18n'

type ConfigWithLocales = {
  i18n?: { locales?: Array<string | LocaleObject> }
  docus?: { filteredLocales?: LocaleObject<string>[] }
}

/**
 * Récupère les codes de locales disponibles depuis la configuration.
 */
export function getAvailableLocales(config: ConfigWithLocales): string[] {
  if (config.docus?.filteredLocales) {
    return config.docus.filteredLocales.map(locale => locale.code)
  }

  return config.i18n?.locales
    ? config.i18n.locales.map(locale => typeof locale === 'string' ? locale : locale.code)
    : []
}

/**
 * Détermine le nom de la collection Nuxt Content v3 à interroger.
 * Basé sur content.config.ts (content_fr, content_en).
 */
export function getCollectionsToQuery(locale: string | undefined, availableLocales: string[]): string[] {
  if (locale && availableLocales.includes(locale)) {
    return [`content_${locale}`]
  }

  return availableLocales.length > 0
    ? availableLocales.map(l => `content_${l}`)
    : ['content_fr'] // Fallback par défaut
}

/**
 * Déduit le nom de la collection à partir du chemin de la page.
 */
export function getCollectionFromPath(path: string, availableLocales: string[]): string {
  const pathSegments = path.split('/').filter(Boolean)
  const firstSegment = pathSegments[0]

  if (firstSegment && availableLocales.includes(firstSegment)) {
    return `content_${firstSegment}`
  }

  // Si le chemin commence par /docs/, on regarde le segment suivant
  if (firstSegment === 'docs') {
    const secondSegment = pathSegments[1]
    if (secondSegment && availableLocales.includes(secondSegment)) {
      return `content_${secondSegment}`
    }
  }

  return 'content_fr'
}
