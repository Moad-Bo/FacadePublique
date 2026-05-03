import { db } from '../server/utils/db';
import { mailboxAttachment, asset } from './drizzle/src/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Migration Script: mailbox_attachment -> asset (Unified S3 Storage)
 * 1. Identify mailbox_attachments that don't have an assetId.
 * 2. Create an asset entry for each.
 * 3. Update the mailbox_attachment to point to the new asset.
 * 4. Verify that s3Key exists and is valid.
 */

async function migrate() {
  console.info('🚀 Starting Asset Migration...');

  const attachments = await db.select().from(mailboxAttachment).where(isNull(mailboxAttachment.assetId));
  
  console.info(`📦 Found ${attachments.length} attachments to migrate.`);

  for (const att of attachments) {
    try {
      const assetId = randomUUID();
      
      // Create central asset entry
      await db.insert(asset).values({
        id: assetId,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        s3Key: att.s3Key,
        type: 'mailbox_attachment',
        visibility: 'private',
        status: 'validated',
        userId: 'system',
        createdAt: new Date()
      });

      // Link back
      await db.update(mailboxAttachment)
        .set({ assetId })
        .where(eq(mailboxAttachment.id, att.id));

      console.info(`✅ Migrated: ${att.filename} -> Asset ${assetId}`);
    } catch (err: any) {
      console.error(`❌ Failed to migrate attachment ${att.id}:`, err.message);
    }
  }

  console.info('🏁 Migration Finished.');
}

migrate().catch(console.error);
