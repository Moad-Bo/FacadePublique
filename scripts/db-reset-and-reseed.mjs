/**
 * db-reset-and-reseed.mjs
 * ─────────────────────────────────────────────────────────────────────
 * 1. Applique les ALTER TABLE manquants (from_context sur 2 tables)
 * 2. Nettoie toutes les tables de données transientes (mails, queues, logs, etc.)
 * 3. Reseed les données nécessaires (roles, layouts, system templates, newsletter templates, forum categories, dummy mails)
 * 
 * Usage: node scripts/db-reset-and-reseed.mjs
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Connexion ──────────────────────────────────────────────────────────────────
const caPath = process.env.MYSQL_SSL_CA;
let caCert;
if (caPath) {
  try {
    const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
    caCert = fs.readFileSync(fullPath, 'utf8');
    console.log('✅ Certificat SSL chargé depuis:', fullPath);
  } catch (e) {
    console.warn('⚠️  Impossible de lire SSL CA:', e.message);
  }
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: caCert ? { rejectUnauthorized: true, ca: caCert } : undefined,
  multipleStatements: false,
});

async function query(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 1 : MIGRATIONS (ALTER TABLE idempotentes)
// ──────────────────────────────────────────────────────────────────────────────
async function runMigrations() {
  console.log('\n📐 PHASE 1: Migrations ALTER TABLE...');

  const migrations = [
    // email_queue.from_context
    {
      check: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue' AND COLUMN_NAME = 'from_context'`,
      sql: `ALTER TABLE \`email_queue\` ADD COLUMN \`from_context\` varchar(50) DEFAULT NULL AFTER \`type\``,
      label: 'email_queue.from_context',
    },
    // newsletter_campaign.from_context
    {
      check: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_campaign' AND COLUMN_NAME = 'from_context'`,
      sql: `ALTER TABLE \`newsletter_campaign\` ADD COLUMN \`from_context\` varchar(50) DEFAULT NULL AFTER \`status\``,
      label: 'newsletter_campaign.from_context',
    },
    // newsletter_campaign.clicked_count (ajouté session précédente)
    {
      check: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_campaign' AND COLUMN_NAME = 'clicked_count'`,
      sql: `ALTER TABLE \`newsletter_campaign\` ADD COLUMN \`clicked_count\` int DEFAULT 0 AFTER \`failed_count\``,
      label: 'newsletter_campaign.clicked_count',
    },
  ];

  for (const m of migrations) {
    const existing = await query(m.check);
    if (existing.length > 0) {
      console.log(`  ⏭️  Colonne déjà présente: ${m.label}`);
    } else {
      await query(m.sql);
      console.log(`  ✅ Colonne ajoutée: ${m.label}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 2 : CLEAN (tables transientes uniquement — jamais user/session)
// ──────────────────────────────────────────────────────────────────────────────
async function cleanTransientData() {
  console.log('\n🗑️  PHASE 2: Nettoyage données transientes...');

  // Ordre important : FK d'abord (enfants avant parents)
  const tablesToClean = [
    'mailbox_attachment',
    'mailbox_rule',
    'mailbox_folder',
    'mailbox_label',
    'mailbox',
    'email_log',
    'email_queue',
    'newsletter_campaign',
    'newsletter_template',
    'audience',
    'forum_vote',
    'forum_reply',
    'forum_thread',
    'forum_category',
    'system_template',
    'email_layout',
    'spam_filter',
    'security_event',
    'ip_ban',
    'verification',
    // NE PAS TOUCHER: user, session, account, role, settings, asset, ticket, ticket_message, private_message, terms_agreement
  ];

  for (const table of tablesToClean) {
    try {
      const result = await query(`DELETE FROM \`${table}\``);
      console.log(`  🗑️  ${table}: ${result.affectedRows} lignes supprimées`);
    } catch (e) {
      console.warn(`  ⚠️  ${table}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 3 : RESEED
// ──────────────────────────────────────────────────────────────────────────────

// Helper INSERT ON DUPLICATE KEY UPDATE via raw query
async function upsert(table, row, updateKeys) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = updateKeys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
  const sql = `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  await query(sql, Object.values(row));
}

async function seedRoles() {
  console.log('\n👑 Seeding roles...');
  const roles = [
    { id: randomUUID(), name: 'admin', permissions: 'docs:internal,manager:customers,manager:members,support:chat,manage_mail,manage_newsletter,manage_roles', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), name: 'moderator', permissions: 'manager:members,support:chat', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), name: 'editor', permissions: 'docs:internal,manager:members', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), name: 'customer', permissions: 'support:chat', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), name: 'membre', permissions: '', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), name: 'user', permissions: '', is_static: 1, createdAt: new Date(), updatedAt: new Date() },
  ];
  for (const r of roles) {
    try {
      await upsert('role', r, ['permissions', 'is_static', 'updatedAt']);
      console.log(`  ✅ Role: ${r.name}`);
    } catch (e) {
      console.error(`  ❌ Role ${r.name}:`, e.message);
    }
  }
}

async function seedEmailLayouts() {
  console.log('\n🎨 Seeding email layouts...');
  const BRAND = '#8b5cf6';
  
  const layouts = [
    {
      id: 'system',
      name: 'Layout Système',
      category: 'system',
      description: 'Design standard pour les emails système (auth, etc.)',
      is_default: 1,
      html: `<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;background:#f9fafb;margin:0;padding:40px 0;}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);border:1px solid #e5e7eb}.header{background:${BRAND};padding:40px;text-align:center;color:white}.content{padding:40px;color:#111827;line-height:1.6}.footer{background:#f9fafb;padding:30px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6}a.button{display:inline-block;padding:14px 28px;background:${BRAND};color:white!important;text-decoration:none;border-radius:8px;font-weight:700;margin-top:25px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:24px">Techknè</h1></div><div class="content">{{{body}}}</div><div class="footer">&copy; 2026 Techknè. Cet email a été envoyé automatiquement.</div></div></body></html>`,
    },
    {
      id: 'newsletter',
      name: 'Layout Newsletter',
      category: 'newsletter',
      description: 'Design pour les emails newsletters et marketing.',
      is_default: 1,
      html: `<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;background:#0f172a;margin:0;padding:40px 0}.container{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,.5)}.header{background:linear-gradient(135deg,${BRAND},#6d28d9);padding:48px 40px;text-align:center;color:white}.content{padding:48px;color:#111827;line-height:1.8}.footer{background:#f8fafc;padding:30px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}a{color:${BRAND};font-weight:600}a.button{display:inline-block;padding:14px 28px;background:${BRAND};color:white!important;text-decoration:none;border-radius:50px;font-weight:800;margin-top:25px;letter-spacing:-.01em}</style></head><body><div class="container"><div class="header"><h1 style="margin:0 0 8px;font-size:28px;font-weight:900;letter-spacing:-.025em">Techknè</h1><p style="margin:0;opacity:.8;font-size:14px">La Newsletter de la Communauté</p></div><div class="content">{{{body}}}</div><div class="footer">&copy; 2026 Techknè &bull; <a href="{{{unsubscribeUrl}}}">Se désabonner</a></div></div></body></html>`,
    },
    {
      id: 'contact',
      name: 'Layout Contact / Support',
      category: 'contact',
      description: 'Design pour les emails entrants de la boîte de contact.',
      is_default: 1,
      html: `<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;background:#f1f5f9;margin:0;padding:40px 20px}.card{max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}.top-bar{background:${BRAND};height:6px}.body{padding:40px;color:#334155;line-height:1.7}.meta{background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b}</style></head><body><div class="card"><div class="top-bar"></div><div class="body">{{{body}}}</div><div class="meta">Message reçu sur contact@support.techkne.com</div></div></body></html>`,
    },
    {
      id: 'notification',
      name: 'Layout Notifications Standard',
      category: 'notification',
      description: 'Design épuré pour les alertes plateforme.',
      is_default: 1,
      html: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f0f4f8;margin:0;padding:40px 20px}.card{max-width:550px;margin:0 auto;background:white;border-top:4px solid #3b82f6;border-radius:12px;padding:40px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1)}.logo{color:#3b82f6;font-size:24px;font-weight:bold;margin-bottom:30px}.footer{text-align:center;margin-top:30px;color:#94a3b8;font-size:11px}</style></head><body><div class="card"><div class="logo">Techknè App</div>{{{body}}}</div><div class="footer">Vous recevez cet email car vous avez activé les notifications.</div></body></html>`,
    },
    {
      id: 'mod-forum',
      name: 'Layout Modération Forum',
      category: 'mod-forum',
      description: 'Design formel pour les avertissements et actions de modération.',
      is_default: 1,
      html: `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;background:#fef2f2;margin:0;padding:40px 20px}.card{max-width:600px;margin:0 auto;background:white;border-top:4px solid #ef4444;border-radius:8px;padding:40px;box-shadow:0 4px 6px rgba(0,0,0,.05)}.header{color:#ef4444;font-size:18px;font-weight:bold;margin-bottom:25px;border-bottom:1px solid #fee2e2;padding-bottom:10px}.footer{text-align:center;margin-top:30px;color:#991b1b;font-size:11px;opacity:.6}</style></head><body><div class="card"><div class="header">🛡️ MODÉRATION TECHKNÈ</div>{{{body}}}</div><div class="footer">Cet email concerne une action de modération liée à votre compte.</div></body></html>`,
    },
    // Content layouts (pour le compositeur)
    {
      id: 'simple-layer',
      name: 'Architecture Simple',
      category: 'content_layout',
      description: 'Layout texte minimaliste.',
      is_default: 0,
      html: `<div style="padding:20px;font-size:16px;color:#333;line-height:1.6">{{content}}</div>`,
    },
    {
      id: 'modern-grid',
      name: 'Architecture Grille (2 colonnes)',
      category: 'content_layout',
      description: 'Deux colonnes côte à côte.',
      is_default: 0,
      html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px"><div style="border:1px solid #eee;padding:15px;border-radius:8px">{{left_column}}</div><div style="border:1px solid #eee;padding:15px;border-radius:8px">{{right_column}}</div></div>`,
    },
    {
      id: 'newsletter-zones',
      name: 'Architecture Newsletter (3 zones)',
      category: 'content_layout',
      description: 'Header, body, footer pour une newsletter.',
      is_default: 0,
      html: `<div style="padding:20px"><div style="background:#f8fafc;padding:20px;text-align:center;border-bottom:2px solid #eee">{{header_news}}</div><div style="padding:20px;line-height:1.8">{{body_news}}</div><div style="background:#1e293b;color:white;padding:20px;text-align:center;font-size:12px">{{footer_news}}</div></div>`,
    },
  ];

  for (const l of layouts) {
    try {
      await upsert('email_layout', l, ['name', 'html', 'description', 'category']);
      console.log(`  ✅ Layout: ${l.id}`);
    } catch (e) {
      console.error(`  ❌ Layout ${l.id}:`, e.message);
    }
  }
}

async function seedSystemTemplates() {
  console.log('\n📧 Seeding system templates...');
  const BRAND = '#8b5cf6';
  const wrap = (c) => `<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;line-height:1.6;color:#111827;background:#f9fafb;margin:0;padding:40px 0}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);border:1px solid #e5e7eb}.header{background:${BRAND};padding:40px;text-align:center;color:white}.content{padding:40px}.footer{background:#f9fafb;padding:30px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6}h1{margin:0;font-size:24px}h2{color:${BRAND};font-size:20px}a.button{display:inline-block;padding:14px 28px;background:${BRAND};color:white!important;text-decoration:none;border-radius:8px;font-weight:700;margin-top:25px}</style></head><body><div class="container"><div class="header"><h1>Techknè Platform</h1></div><div class="content">${c}</div><div class="footer">&copy; 2026 Techknè.</div></div></body></html>`;

  const templates = [
    { id: 'verify_email', subject: 'Confirmez votre adresse e-mail', content: wrap('<h2>Bienvenue !</h2><p>Merci de rejoindre Techknè. Veuillez confirmer votre e-mail :</p><a href="{{url}}" class="button">Vérifier mon compte</a>'), description: "Immédiatement après l'inscription." },
    { id: 'verification_reminder', subject: 'Rappel : Vérifiez votre compte Techknè', content: wrap('<h2>Action requise</h2><p>Vous n\'avez pas encore vérifié votre compte.</p><a href="{{url}}" class="button">Vérifier maintenant</a>'), description: '48h après inscription si non vérifié.' },
    { id: 'welcome_verified', subject: 'Bienvenue officiellement chez Techknè !', content: wrap('<h2>C\'est parti !</h2><p>Votre compte est vérifié. Profitez de toutes nos fonctionnalités.</p><a href="{{url}}" class="button">Accéder au Dashboard</a>'), description: 'Après confirmation email.' },
    { id: 'reset_password', subject: 'Réinitialisation de votre mot de passe', content: wrap('<h2>Mot de passe oublié ?</h2><p>Cliquez ci-dessous pour choisir un nouveau mot de passe :</p><a href="{{url}}" class="button">Réinitialiser</a>'), description: 'Lors d\'une demande de reset.' },
    { id: 'password_reminder', subject: 'Sécurité : Mettez à jour votre mot de passe', content: wrap('<h2>Bilan de sécurité</h2><p>Cela fait 6 mois que vous n\'avez pas changé votre mot de passe.</p><a href="{{url}}" class="button">Changer mon mot de passe</a>'), description: 'Envoyé tous les 6 mois.' },
    { id: 'newsletter_join', subject: 'Bienvenue dans notre Newsletter', content: wrap('<h2>Merci de nous suivre !</h2><p>Vous recevrez nos dernières actualités directement dans votre boîte mail.</p>'), description: 'Lors de l\'inscription à la newsletter.' },
    { id: 'newsletter_unsubscribe', subject: 'Confirmation de désabonnement', content: wrap('<h2>Désabonnement confirmé</h2><p>Vous ne recevrez plus nos newsletters.</p>'), description: 'Confirmation de désabonnement.' },
    { id: 'account_deleted', subject: 'Confirmation de suppression de compte', content: wrap('<h2>Au revoir</h2><p>Votre compte et vos données ont été supprimés.</p>'), description: 'Confirmation de suppression.' },
  ];

  for (const t of templates) {
    try {
      await upsert('system_template', t, ['subject', 'content', 'description']);
      console.log(`  ✅ SystemTemplate: ${t.id}`);
    } catch (e) {
      console.error(`  ❌ SystemTemplate ${t.id}:`, e.message);
    }
  }
}

async function seedNewsletterTemplates() {
  console.log('\n📰 Seeding newsletter templates...');
  const BRAND = '#8b5cf6';
  const wrap = (c) => `<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;background:#0f172a;margin:0;padding:40px 0}.container{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden}.header{background:linear-gradient(135deg,${BRAND},#6d28d9);padding:48px 40px;text-align:center;color:white}.content{padding:48px;color:#111827;line-height:1.8}.footer{background:#f8fafc;padding:30px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}a.button{display:inline-block;padding:14px 28px;background:${BRAND};color:white!important;text-decoration:none;border-radius:50px;font-weight:800;margin-top:25px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:28px;font-weight:900">Techknè</h1></div><div class="content">${c}</div><div class="footer">&copy; 2026 Techknè &bull; <a href="{{unsubscribeUrl}}">Se désabonner</a></div></div></body></html>`;

  const templates = [
    { id: 'blog_template', name: 'Blog Post Standard', subject: 'Nouvel article sur le blog', content: wrap('<h2>📖 {{title}}</h2><p>{{summary}}</p><a href="{{url}}" class="button">Lire la suite</a>'), icon: 'i-lucide:book-open', description: 'Modèle pour annoncer de nouveaux articles.' },
    { id: 'changelog_template', name: 'Mise à jour (Changelog)', subject: 'Nouveautés sur la plateforme', content: wrap('<h2>🚀 {{title}}</h2><p>Voici les dernières améliorations :</p><ul>{{updates}}</ul><a href="{{url}}" class="button">Voir le changelog</a>'), icon: 'i-lucide:zap', description: 'Pour les notes de mise à jour.' },
    { id: 'promo_template', name: 'Promotion / Événement', subject: 'Une offre exclusive pour vous 🎁', content: wrap('<h2>🎁 {{title}}</h2><p>{{message}}</p><a href="{{url}}" class="button">Profiter de l\'offre</a>'), icon: 'i-lucide:tag', description: 'Pour les offres et événements.' },
  ];

  for (const t of templates) {
    try {
      await upsert('newsletter_template', t, ['name', 'subject', 'content', 'icon', 'description']);
      console.log(`  ✅ NewsletterTemplate: ${t.id}`);
    } catch (e) {
      console.error(`  ❌ NewsletterTemplate ${t.id}:`, e.message);
    }
  }
}

async function seedForumCategories() {
  console.log('\n💬 Seeding forum categories...');
  const categories = [
    { id: randomUUID(), name: 'Annonces', slug: 'announcements', description: 'Dernières nouvelles de la plateforme.', color: 'warning', icon: 'i-lucide:megaphone', order: 1, thread_count: 0, createdAt: new Date() },
    { id: randomUUID(), name: 'Support Technique', slug: 'support', description: 'Besoin d\'aide pour configurer votre projet ?', color: 'primary', icon: 'i-lucide:wrench', order: 2, thread_count: 0, createdAt: new Date() },
    { id: randomUUID(), name: 'Showcase', slug: 'showcase', description: 'Partagez vos créations avec la communauté.', color: 'success', icon: 'i-lucide:sparkles', order: 3, thread_count: 0, createdAt: new Date() },
    { id: randomUUID(), name: 'Général', slug: 'general', description: 'Discussions diverses sur le développement.', color: 'neutral', icon: 'i-lucide:messages-square', order: 4, thread_count: 0, createdAt: new Date() },
  ];

  for (const c of categories) {
    try {
      await upsert('forum_category', c, ['name', 'description', 'icon', 'color', 'order']);
      console.log(`  ✅ ForumCategory: ${c.name}`);
    } catch (e) {
      console.error(`  ❌ ForumCategory ${c.name}:`, e.message);
    }
  }
}

async function seedAudienceEntries() {
  console.log('\n👥 Seeding audience (abonnés de test)...');
  const entries = [
    { id: randomUUID(), email: 'moad.bo@proton.me', opt_in_newsletter: 1, opt_in_marketing: 0, opt_in_forum: 1, source: 'staff', created_at: new Date(), updated_at: new Date() },
    { id: randomUUID(), email: 'boudjemlinemoad@gmail.com', opt_in_newsletter: 1, opt_in_marketing: 1, opt_in_forum: 1, source: 'landing', created_at: new Date(), updated_at: new Date() },
    { id: randomUUID(), email: 'psnmoad@outlook.fr', opt_in_newsletter: 1, opt_in_marketing: 0, opt_in_forum: 0, source: 'landing', created_at: new Date(), updated_at: new Date() },
  ];

  for (const e of entries) {
    try {
      await upsert('audience', e, ['opt_in_newsletter', 'opt_in_marketing', 'opt_in_forum', 'updated_at']);
      console.log(`  ✅ Audience: ${e.email}`);
    } catch (e2) {
      console.error(`  ❌ Audience ${e.email}:`, e2.message);
    }
  }
}

async function seedDummyMails() {
  console.log('\n📬 Seeding dummy mails (20 messages variés)...');
  
  const senders = [
    { name: 'Alice Dupont', email: 'alice.dupont@example.com' },
    { name: 'Bob Martin', email: 'bob.martin@gmail.com' },
    { name: 'Clara Schmidt', email: 'clara.schmidt@proton.me' },
    { name: 'David Moreau', email: 'david.moreau@outlook.fr' },
    { name: 'Emma Leblanc', email: 'emma.leblanc@yahoo.fr' },
  ];

  const subjects = [
    'Question sur votre offre premium', 'Problème de connexion à mon compte', 'Retour d\'expérience positif 🎉',
    'Demande de partenariat', 'Bug trouvé sur la page forum', 'Félicitations pour le lancement !',
    'Comment exporter mes données ?', 'Signalement d\'un contenu inapproprié', 'Demande de facture',
    'J\'adore la nouvelle interface !', 'Problème avec la newsletter', 'Suggestion d\'amélioration',
    'Délai de réponse support', 'Test de webhook entrant [TECH]', 'Invitation à collaborer',
    'Demande d\'accès entreprise', 'Votre avis sur nos services', 'Rapport d\'anomalie',
    'Réactivation de compte bloqué', 'Question RGPD — accès aux données',
  ];

  const categories = ['contact', 'contact', 'contact', 'contact', 'contact'];  // tous en contact pour apparaître dans l'inbox
  
  const mails = [];
  for (let i = 0; i < 20; i++) {
    const sender = senders[i % senders.length];
    const mailId = randomUUID();
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 43200000);
    
    mails.push({
      id: mailId,
      from_name: sender.name,
      from_email: sender.email,
      subject: subjects[i],
      body: `<p>Bonjour,</p><p>${subjects[i]}. Merci de bien vouloir me répondre dans les meilleurs délais.</p><p>Cordialement,<br>${sender.name}</p>`,
      to_account: 'contact',
      category: 'contact',
      unread: Math.random() > 0.4 ? 1 : 0,
      starred: Math.random() > 0.85 ? 1 : 0,
      important: Math.random() > 0.9 ? 1 : 0,
      pinned: 0,
      archived: 0,
      trashed: 0,
      is_spam: 0,
      size: Math.floor(Math.random() * 40000) + 2000,
      date,
    });
  }

  for (const m of mails) {
    try {
      await query(
        `INSERT INTO \`mailbox\` (id, from_name, from_email, subject, body, to_account, category, unread, starred, important, pinned, archived, trashed, is_spam, size, date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [m.id, m.from_name, m.from_email, m.subject, m.body, m.to_account, m.category, m.unread, m.starred, m.important, m.pinned, m.archived, m.trashed, m.is_spam, m.size, m.date]
      );
    } catch (e) {
      console.error(`  ❌ Mail ${m.subject}:`, e.message);
    }
  }
  console.log(`  ✅ 20 mails seeded dans la boîte contact`);
}

async function seedSettings() {
  console.log('\n⚙️  Seeding settings par défaut...');
  const defaults = [
    { key: 'site_name', value: 'Techknè', updatedAt: new Date() },
    { key: 'site_description', value: 'La plateforme communautaire des développeurs francophones.', updatedAt: new Date() },
    { key: 'mail_from_name', value: 'Techknè Support', updatedAt: new Date() },
    { key: 'mail_from_email', value: 'contact@support.techkne.com', updatedAt: new Date() },
    { key: 'maintenance_mode', value: 'false', updatedAt: new Date() },
    { key: 'allow_registration', value: 'true', updatedAt: new Date() },
    { key: 'email_quota_daily', value: '500', updatedAt: new Date() },
  ];

  for (const s of defaults) {
    try {
      await upsert('settings', s, ['value', 'updatedAt']);
      console.log(`  ✅ Setting: ${s.key}`);
    } catch (e) {
      console.error(`  ❌ Setting ${s.key}:`, e.message);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔧 Techknè: DB Migration + Reset + Reseed');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  DB: ${process.env.MYSQL_DATABASE} @ ${process.env.MYSQL_HOST}`);

  try {
    await runMigrations();
    await cleanTransientData();
    await seedRoles();
    await seedEmailLayouts();
    await seedSystemTemplates();
    await seedNewsletterTemplates();
    await seedForumCategories();
    await seedAudienceEntries();
    await seedDummyMails();
    await seedSettings();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ TERMINÉ — Base de données prête !');
    console.log('═══════════════════════════════════════════════════════');
  } catch (e) {
    console.error('\n❌ Erreur fatale:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
