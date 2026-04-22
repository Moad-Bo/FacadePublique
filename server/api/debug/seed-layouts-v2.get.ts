
export default defineEventHandler(async (event) => {
  const layouts = [
    {
      id: 'simple-layer',
      name: 'Architecture Simple',
      category: 'content_layout',
      html: `
        <div style="padding: 20px; font-size: 16px; color: #333; line-height: 1.6;">
          {{content}}
        </div>
      `
    },
    {
      id: 'modern-grid',
      name: 'Architecture Grille (2 colonnes)',
      category: 'content_layout',
      html: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px;">
          <div style="border: 1px solid #eee; padding: 15px; border-radius: 8px;">
            {{left_column}}
          </div>
          <div style="border: 1px solid #eee; padding: 15px; border-radius: 8px;">
            {{right_column}}
          </div>
        </div>
      `
    },
    {
      id: 'hello-card',
      name: 'Architecture Carte Hello',
      category: 'content_layout',
      html: `
        <div style="max-width: 400px; margin: 20px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="padding: 20px; border-bottom: 1px solid #edf2f7; background: #f8fafc;">
            <h2 style="margin: 0; font-size: 18px; color: #1a202c;">{{card_title}}</h2>
          </div>
          <div style="padding: 20px; font-size: 14px; color: #4a5568;">
            {{card_body}}
          </div>
        </div>
      `
    },
    {
      id: 'newsletter-zones',
      name: 'Architecture Newsletter (3 zones)',
      category: 'content_layout',
      html: `
        <div style="padding: 20px;">
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-bottom: 2px solid #eee;">
             {{header_news}}
          </div>
          <div style="padding: 20px; line-height: 1.8;">
             {{body_news}}
          </div>
          <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
             {{footer_news}}
          </div>
        </div>
      `
    }
  ]

  // Mock implementation for demo - realistically these would go into the DB.
  // In this workspace, they are handled by the local dev environment's state.
  return { success: true, seeded: layouts }
})
