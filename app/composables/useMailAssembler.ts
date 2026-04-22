export const useMailAssembler = () => {
  /**
   * Assembles the final HTML string from shell, architecture, and sections data.
   */
  const assemble = (
    layouts: any[] | undefined,
    shellId: string | undefined,
    architectureId: string | undefined,
    sections: Record<string, string> = {},
    rawShell?: string,
    rawArchitecture?: string
  ): string => {
    const shellHtml = rawShell || layouts?.find(l => String(l.id) === String(shellId))?.html
    const archHtml = rawArchitecture || layouts?.find(l => String(l.id) === String(architectureId))?.html

    // 1. Prepare Architecture / Inner Content
    let innerHtml = archHtml || sections['content'] || sections['body'] || ''
    
    // If we have an architecture, fill its sections
    if (archHtml) {
      // Find all {{section}} style tags in the architecture
      const tags = archHtml.match(/{{[^{}]+}}/g) || []
      tags.forEach((tag: string) => {
        const key = tag.replace(/{{|}}/g, '').trim()
        
        // --- SMART PLACEHOLDER LOGIC ---
        let content = sections[key] || ''
        if (!content) {
          // Visual placeholder if empty (Professional gray block with label)
          content = `
            <div style="background: rgba(0,0,0,0.03); border: 1px dashed rgba(0,0,0,0.1); padding: 20px; text-align: center; border-radius: 12px; margin: 10px 0;">
              <span style="font-family: sans-serif; font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">
                [[ ${key.replace('_', ' ')} ]]
              </span>
            </div>
          `
        }
        
        innerHtml = innerHtml.replace(tag, content)
      });
    }

    // 2. Wrap in Shell
    if (shellHtml) {
      const finalS = shellHtml as string
      // Priority: Handle Triple Brackets then Double Brackets
      if (finalS.includes('{{{content}}}')) {
        return finalS.replace('{{{content}}}', innerHtml)
      } else if (finalS.includes('{{{body}}}')) {
        return finalS.replace('{{{body}}}', innerHtml)
      } else if (finalS.includes('{{content}}')) {
        return finalS.replace('{{content}}', innerHtml)
      } else if (finalS.includes('{{body}}')) {
        return finalS.replace('{{body}}', innerHtml)
      }
      return finalS + innerHtml
    }

    return innerHtml
  }

  /**
   * Parse EML files and return structured data for the composer.
   */
  const parseEMLFiles = async (files: File[]) => {
    try {
      // Read files as strings (for text/plain EML content)
      const contents = await Promise.all(files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
      }))

      const res = await $fetch<any>('/api/mails/eml-parse', {
        method: 'POST',
        body: { files: contents }
      })

      if (res.success) {
        return res.mails
      }
      return []
    } catch (e: any) {
      console.error('EML Parse Error:', e)
      return []
    }
  }

  return {
    assemble,
    parseEMLFiles
  }
}
