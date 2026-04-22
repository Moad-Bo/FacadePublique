import { z } from 'zod'
import { queryCollection } from '@nuxt/content/server'
import type { Collections } from '@nuxt/content'
import { getAvailableLocales, getCollectionFromPath } from '../../../utils/content'
import { inferSiteURL } from '../../../utils/meta'

export default defineMcpTool({
  description: `Retrieves the full content and details of a specific documentation page.

WHEN TO USE: Use this tool when you know the EXACT path to a documentation page. Common use cases:
- User asks for a specific page: "Show me the getting started guide" → /en/getting-started/installation
- User asks about a known topic with a dedicated page
- You found a relevant path from list-pages and want the full content
- User references a specific section or guide they want to read

WHEN NOT TO USE: If you don't know the exact path and need to search/explore, use list-pages first.

WORKFLOW: This tool returns the complete page content including title, description, and full markdown. Use this when you need to provide detailed answers or code examples from specific documentation pages.
`,
  inputSchema: {
    path: z.string().describe('The page path from list-pages or provided by the user (e.g., /en/getting-started/installation)'),
  },
  cache: '1h',
  handler: async ({ path }) => {
    const event = useEvent()
    const config = useRuntimeConfig(event).public
    const siteUrl = getRequestURL(event).origin || inferSiteURL()

    const availableLocales = getAvailableLocales(config)
    const collectionName = config.i18n?.locales
      ? getCollectionFromPath(path, availableLocales)
      : 'docs'

function extractProseFromAst(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  
  if (node.type === 'element') {
    // Skip Vue components (usually capitalized tags)
    if (node.tag && /^[A-Z]/.test(node.tag)) {
      return ''
    }
    
    if (node.children && Array.isArray(node.children)) {
      const childrenText = node.children.map(extractProseFromAst).join('')
      
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div', 'pre'].includes(node.tag)) {
        return childrenText + '\n\n'
      }
      // Add a space for some inline elements if needed, but simple join is usually fine
      if (node.tag === 'li') return '- ' + childrenText + '\n'
      return childrenText
    }
  }
  
  if (node.type === 'root' && node.children) {
    return node.children.map(extractProseFromAst).join('')
  }
  
  return ''
}

    try {
      const page: any = await queryCollection(event, collectionName as keyof Collections)
        .where('path', '=', path)
        .first()

      if (!page) {
        return errorResult('Page not found')
      }

      // Extract raw text from the parsed Nuxt Content AST, ignoring Vue components
      const content = extractProseFromAst(page.body)

      return jsonResult({
        title: page.title,
        path: page.path,
        description: page.description,
        content: content.trim(),
        url: `${siteUrl}${page.path}`,
      })
    }
    catch (e) {
      console.error(e)
      return errorResult('Failed to get page')
    }
  },
})
