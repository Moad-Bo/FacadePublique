import fs from 'node:fs';
import path from 'node:path';

const contentDir = path.join(process.cwd(), 'content');

// 1. Wipe old content (be careful to target subfolders)
try {
  fs.rmSync(contentDir, { recursive: true, force: true });
} catch (e) {}

const locales = ['fr', 'en'];

const filesToCreate = [
  { path: 'index.md', title: 'KOSMOS', description: 'Kosmos Platform' },
  { path: 'faq.md', title: 'Help Center', description: 'FAQ & Support' },
  
  // Solutions
  { path: 'solutions/basis.md', title: 'Basis', description: 'Basis Solution' },
  { path: 'solutions/khora.md', title: 'Khora', description: 'Khora Cloud' },
  { path: 'solutions/keryx.md', title: 'Keryx', description: 'Keryx Mail' },
  { path: 'solutions/argos.md', title: 'Argos', description: 'Argos IA' },
  
  // Services
  { path: 'services/syn.md', title: 'Syn', description: 'Syn Expertise' },
  { path: 'services/talos.md', title: 'Talos', description: 'Talos Infra' },
  
  // Docs (ordered)
  { path: 'docs/0.bienvenue.md', title: 'Bienvenue', description: 'Accueil Documentation' },
  { path: 'docs/1.basis-core.md', title: 'Basis Core', description: 'Documentation Basis' },
  { path: 'docs/2.khora-cloud.md', title: 'Khora Cloud', description: 'Documentation Khora' },
  { path: 'docs/3.keryx-mail.md', title: 'Keryx Mail', description: 'Documentation Keryx' },
  { path: 'docs/4.argos-ia.md', title: 'Argos IA', description: 'Documentation Argos' },
  { path: 'docs/5.talos-infra.md', title: 'Talos Infra', description: 'Documentation Talos' },
  { path: 'docs/6.syn-expertise.md', title: 'Syn Expertise', description: 'Documentation Syn' },
  { path: 'docs/7.agora-market.md', title: 'Agora Market', description: 'Documentation Agora' },
  { path: 'docs/8.help-center.md', title: 'Help Center', description: 'FAQ Docs' },
];

for (const loc of locales) {
  for (const file of filesToCreate) {
    const filePath = path.join(contentDir, loc, file.path);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    
    // Append [EN] or [FR] to titles just for clear visualization
    const locTitle = `[${loc.toUpperCase()}] ${file.title}`;
    
    const md = `---
title: "${locTitle}"
description: "${file.description}"
---

# ${locTitle}

Contenu de démonstration pour ${file.path}
`;
    fs.writeFileSync(filePath, md, 'utf-8');
  }
}

console.log('KOSMOS content successfully seeded.');
