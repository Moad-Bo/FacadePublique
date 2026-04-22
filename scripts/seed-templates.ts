import dotenv from "dotenv";
dotenv.config();

async function seed() {
    const { db } = await import("../server/utils/db");
    const { systemTemplate, newsletterTemplate } = await import("../drizzle/src/db/schema");
    const { sql } = await import("drizzle-orm");

    console.log("Seeding templates...");

    const BRAND_COLOR = "#8b5cf6";
    const baseStyle = `
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; margin: 0; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
        .header { background: ${BRAND_COLOR}; padding: 40px 0; text-align: center; color: white; }
        .content { padding: 40px; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6; }
        .button { display: inline-block; padding: 14px 28px; background: ${BRAND_COLOR}; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; margin-top: 25px; }
        h1 { margin: 0; font-size: 24px; }
        h2 { color: ${BRAND_COLOR}; font-size: 20px; }
    `;

    const wrap = (content: string) => `
        <!DOCTYPE html><html><head><style>${baseStyle}</style></head>
        <body><div class="container"><div class="header"><h1>Techknè Platform</h1></div>
        <div class="content">${content}</div>
        <div class="footer">&copy; 2026 Techknè. <a href="#">Se désabonner</a></div>
        </div></body></html>
    `;

    // 1. Seed System Templates
    const systemTemplates = [
        {
            id: 'verify_email',
            subject: 'Confirmez votre adresse e-mail',
            content: wrap(`<h2>Bienvenue !</h2><p>Merci de rejoindre Techknè. Veuillez confirmer votre e-mail en cliquant ci-dessous :</p><a href="{{url}}" class="button">Vérifier mon compte</a>`),
            description: 'Envoyé immédiatement après l\'inscription.'
        },
        {
            id: 'verification_reminder',
            subject: 'Rappel : Vérifiez votre compte Techknè',
            content: wrap(`<h2>Action requise</h2><p>Vous n'avez pas encore vérifié votre compte. Cliquez ici pour le faire :</p><a href="{{url}}" class="button">Vérifier maintenant</a>`),
            description: 'Envoyé 48h après l\'inscription si non vérifié.'
        },
        {
            id: 'welcome_verified',
            subject: 'Bienvenue officiellement chez Techknè !',
            content: wrap(`<h2>C\'est parti !</h2><p>Votre compte est vérifié. Vous pouvez maintenant profiter de toutes nos fonctionnalités.</p><a href="{{url}}" class="button">Accéder au Dashboard</a>`),
            description: 'Envoyé après confirmation de l\'email.'
        },
        {
            id: 'reset_password',
            subject: 'Réinitialisation de votre mot de passe',
            content: wrap(`<h2>Mot de passe oublié ?</h2><p>Cliquez ci-dessous pour choisir un nouveau mot de passe :</p><a href="{{url}}" class="button">Réinitialiser</a>`),
            description: 'Envoyé lors d\'une demande de reset.'
        },
        {
            id: 'password_reminder',
            subject: 'Sécurité : Mettez à jour votre mot de passe',
            content: wrap(`<h2>Bilan de sécurité</h2><p>Cela fait 6 mois que vous n\'avez pas changé votre mot de passe. Par mesure de sécurité, nous vous conseillons de le faire.</p><a href="{{url}}" class="button">Changer mon mot de passe</a>`),
            description: 'Envoyé tous les 6 mois.'
        },
        {
            id: 'newsletter_join',
            subject: 'Bienvenue dans notre Newsletter',
            content: wrap(`<h2>Merci de nous suivre !</h2><p>Vous recevrez désormais nos dernières actualités et mises à jour directement dans votre boîte mail.</p>`),
            description: 'Envoyé lors de l\'inscription à la newsletter.'
        },
        {
            id: 'account_deleted',
            subject: 'Confirmation de suppression de compte',
            content: wrap(`<h2>Au revoir</h2><p>Votre compte et vos données ont été supprimés comme demandé. Nous espérons vous revoir bientôt.</p>`),
            description: 'Confirmation finale de suppression de compte.'
        },
        {
            id: 'newsletter_unsubscribe',
            subject: 'Confirmation de désabonnement',
            content: wrap(`<h2>Désabonnement confirmé</h2><p>Vous ne recevrez plus nos newsletters. Nous sommes désolés de vous voir partir.</p><p>Si c'était une erreur, vous pouvez vous réabonner à tout moment depuis votre profil.</p>`),
            description: 'Confirmation de désabonnement.'
        }
    ];

    for (const t of systemTemplates) {
        await db.insert(systemTemplate).values(t).onDuplicateKeyUpdate({
            set: { subject: t.subject, content: t.content, description: t.description }
        });
    }

    // 2. Seed Newsletter Default Templates
    const newsletterDefaults = [
        {
            id: 'blog_template',
            name: 'Blog Post Standard',
            subject: 'Nouvel article sur le blog',
            content: wrap(`<h2>📖 {{title}}</h2><p>{{summary}}</p><a href="{{url}}" class="button">Lire la suite</a>`),
            icon: 'i-lucide:book-open',
            description: 'Modèle pour annoncer de nouveaux articles.'
        },
        {
            id: 'changelog_template',
            name: 'Mise à jour (Changelog)',
            subject: 'Nouveautés sur la plateforme',
            content: wrap(`<h2>🚀 {{title}}</h2><p>Voici les dernières améliorations :</p><ul>{{updates}}</ul><a href="{{url}}" class="button">Voir le changelog</a>`),
            icon: 'i-lucide:zap',
            description: 'Modèle pour les notes de mise à jour.'
        }
    ];

    for (const t of newsletterDefaults) {
        await db.insert(newsletterTemplate).values(t).onDuplicateKeyUpdate({
            set: { name: t.name, subject: t.subject, content: t.content, icon: t.icon, description: t.description }
        });
    }

    console.log("Seeding complete.");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
