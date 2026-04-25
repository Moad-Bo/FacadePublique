import { db } from '../../../utils/db';
import { communityCategory } from '../../../../drizzle/src/db/schema';
import { asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const categories = await db.select()
      .from(communityCategory)
      .orderBy(asc(communityCategory.order));
      
    return categories;
  } catch (error) {
    console.error('[API][COMMUNITY] Failed to fetch categories:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch categories'
    });
  }
});
