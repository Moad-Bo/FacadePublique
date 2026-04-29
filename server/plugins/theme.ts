import { defineNitroPlugin } from 'nitropack/runtime/plugin'

/**
 * Nitro Plugin: Anti-FOUC (Flash of Unstyled Content)
 * 
 * Injecte les préférences visuelles de l'utilisateur (couleurs, polices)
 * dans l'AppConfig côté serveur pour que Nuxt UI génère le CSS correct
 * dès le premier rendu HTML.
 */
export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('render:html', (html, { event }) => {
        const session = event.context.session;
        if (!session?.user) return;

        const user = session.user;
        const appConfig = useAppConfig(event) as any;

        // 1. Synchronisation de l'AppConfig (Côté Serveur)
        // Nuxt UI v4 réagira à ces changements pour générer les variables CSS
        if (user.themePrimary) {
            appConfig.ui.colors.primary = user.themePrimary;
        }
        
        if (user.themeNeutral) {
            appConfig.ui.colors.neutral = user.themeNeutral === 'neutral' ? 'slate' : user.themeNeutral;
        }

        // 2. Typographie (Font Family & Font Size)
        // On injecte les classes directement sur <html> pour éviter le saut de police
        const family = user.fontFamily || 'font-sans';
        const size = user.fontSize || 'text-base';
        
        // On cherche si un attribut class existe déjà
        const classIdx = html.htmlAttrs.findIndex(a => a.startsWith('class='));
        if (classIdx > -1) {
            // On ajoute nos classes à l'existant (en évitant les doublons simples)
            const current = html.htmlAttrs[classIdx].replace('class="', '').replace('"', '');
            html.htmlAttrs[classIdx] = `class="${family} ${size} ${current}"`;
        } else {
            html.htmlAttrs.push(`class="${family} ${size}"`);
        }
    });
});
