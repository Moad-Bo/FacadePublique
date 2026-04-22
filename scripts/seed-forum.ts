import 'dotenv/config';
import { db } from '../server/utils/db';
import { forumCategory } from '../drizzle/src/db/schema';

const categories = [
  {
    id: crypto.randomUUID(),
    name: 'Annonces',
    slug: 'announcements',
    description: 'Dernières nouvelles de la plateforme.',
    color: 'warning',
    icon: 'i-lucide:megaphone',
    order: 1
  },
  {
    id: crypto.randomUUID(),
    name: 'Support Technique',
    slug: 'support',
    description: 'Besoin d\'aide pour configurer votre projet ?',
    color: 'primary',
    icon: 'i-lucide:wrench',
    order: 2
  },
  {
    id: crypto.randomUUID(),
    name: 'Showcase',
    slug: 'showcase',
    description: 'Partagez vos créations avec la communauté.',
    color: 'success',
    icon: 'i-lucide:sparkles',
    order: 3
  },
  {
    id: crypto.randomUUID(),
    name: 'Général',
    slug: 'general',
    description: 'Discussions diverses sur le développement.',
    color: 'neutral',
    icon: 'i-lucide:messages-square',
    order: 4
  }
];

async function seed() {
  console.log('Seeding forum categories...');
  try {
    for (const cat of categories) {
      await db.insert(forumCategory).values(cat).onDuplicateKeyUpdate({
        set: { name: cat.name, description: cat.description, icon: cat.icon, color: cat.color, order: cat.order }
      });
      console.log(`- Seeded: ${cat.name}`);
    }
    console.log('Done!');
  } catch (e) {
    console.error('Seed failed:', e);
  }
  process.exit(0);
}

seed();
