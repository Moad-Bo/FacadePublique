import { db } from '../../../utils/db';
import { forumCategory } from '../../../../drizzle/src/db/schema';
import { asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const categories = await db.select()
      .from(forumCategory)
      .orderBy(asc(forumCategory.order));
      
    return categories;
  } catch (error) {
    console.error('[API][FORUM] Failed to fetch categories:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch categories'
    });
  }
});
