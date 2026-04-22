import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// Nuxt Content v3 configuration
// We avoid curly brace globs as they seem to cause string offset issues in the current dev environment.
export default defineContentConfig({
  collections: {
    // ── Global Collections ──────────────────────────────────────
    content_fr: defineCollection({
      type: 'page',
      source: 'fr/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        layout: z.string().optional(),
        position: z.number().optional(),
        icon: z.string().optional(),
        // Support for potential blog/changelog legacy fields
        date: z.string().optional(),
        image: z.any().optional(),
        authors: z.array(z.any()).optional(),
        badge: z.any().optional(),
      }),
    }),
    content_en: defineCollection({
      type: 'page',
      source: 'en/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        layout: z.string().optional(),
        position: z.number().optional(),
        icon: z.string().optional(),
        date: z.string().optional(),
        image: z.any().optional(),
        authors: z.array(z.any()).optional(),
        badge: z.any().optional(),
      }),
    }),
  },
})
