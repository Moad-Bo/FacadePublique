import { db } from '../../../utils/db';
import { forumThread, user, forumCategory, forumReply, asset } from '../../../../drizzle/src/db/schema';
import { eq, asc, or, and, inArray } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Thread ID is required'
    });
  }

  try {
    const threadResult = await db.select({
      id: forumThread.id,
      title: forumThread.title,
      slug: forumThread.slug,
      content: forumThread.content,
      isResolved: forumThread.isResolved,
      isPinned: forumThread.isPinned,
      upvotes: forumThread.upvotes,
      downvotes: forumThread.downvotes,
      createdAt: forumThread.createdAt,
      author: {
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role
      },
      category: {
        id: forumCategory.id,
        name: forumCategory.name,
        slug: forumCategory.slug,
        color: forumCategory.color
      }
    })
    .from(forumThread)
    .innerJoin(user, eq(forumThread.authorId, user.id))
    .innerJoin(forumCategory, eq(forumThread.categoryId, forumCategory.id))
    .where(eq(forumThread.id, id))
    .limit(1);

    const threadData = threadResult[0];

    if (!threadData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Thread not found'
      });
    }

    // Fetch assets for thread
    const threadAssets = await db.select().from(asset).where(and(eq(asset.targetId, id), eq(asset.type, 'forum_thread')));

    const repliesData = await db.select({
      id: forumReply.id,
      content: forumReply.content,
      isSolution: forumReply.isSolution,
      upvotes: forumReply.upvotes,
      downvotes: forumReply.downvotes,
      createdAt: forumReply.createdAt,
      author: {
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role
      }
    })
    .from(forumReply)
    .innerJoin(user, eq(forumReply.authorId, user.id))
    .where(eq(forumReply.threadId, id))
    .orderBy(asc(forumReply.createdAt));

    // Fetch assets for all replies in one query
    const replyIds = repliesData.map(r => r.id);
    let allReplyAssets: any[] = [];
    if (replyIds.length > 0) {
      allReplyAssets = await db.select().from(asset).where(and(inArray(asset.targetId, replyIds), eq(asset.type, 'forum_reply')));
    }

    const replies = repliesData.map(reply => ({
      ...reply,
      attachments: allReplyAssets.filter(a => a.targetId === reply.id)
    }));

    return {
      thread: {
        ...threadData,
        attachments: threadAssets
      },
      replies
    };
  } catch (error) {
    console.error(`[API][FORUM] Failed to fetch thread ${id}:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});
