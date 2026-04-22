import { db } from '../../utils/db';
import { forumCategory, forumThread } from '../../../drizzle/src/db/schema';
import { sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const cats = await db.select().from(forumCategory);
    const threads = await db.select().from(forumThread);
    
    return {
      success: true,
      categoriesCount: cats.length,
      threadsCount: threads.length,
      categories: cats
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      stack: e.stack
    };
  }
});
