import 'dotenv/config';
import { sendEmail } from '../server/utils/email';
import { getChangelogTemplate, getBlogTemplate } from '../server/utils/templates';

async function testMailing() {
  const target = 'moad.bo@proton.me';
  
  console.log(`🚀 Test d'envoi Changelog vers ${target}...`);
  const changelogHtml = getChangelogTemplate('Mise à jour majeure Mars 2026', [
    'Nouveau Communication Center dans le dashboard',
    'Système de templates HTML pour les newsletters',
    'Logs dynamiques de tous les emails sortants',
    'Correction de bugs sur la gestion des rôles'
  ]);
  
  await sendEmail({
    to: target,
    subject: '🚀 Quoi de neuf sur Techknè ? (v4.2)',
    html: changelogHtml,
    type: 'newsletter',
    template: 'changelog'
  });

  console.log(`🚀 Test d'envoi Blog vers ${target}...`);
  const blogHtml = getBlogTemplate(
    'Pourquoi l\'agentic coding va changer votre workflow',
    'Découvrez comment Antigravity et les nouveaux outils IA transforment la manière dont nous construisons des applications modernes...',
    'https://techkne.com/blog/agentic-coding'
  );

  await sendEmail({
    to: target,
    subject: '📖 Nouvel article : L\'IA générative dans votre code',
    html: blogHtml,
    type: 'newsletter',
    template: 'blog'
  });

  console.log('✅ Tests terminés. Vérifiez votre boîte mail (authorized recipient).');
  process.exit();
}

testMailing();
