import 'dotenv/config';
import { db } from './server/utils/db';
import { mailbox, mailboxAttachment, mailboxFolder, mailboxLabel, emailLog } from './drizzle/src/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🧹 Nettoyage de la base de données (Emails)...');
    
    try {
        // We delete in order of relationship (though cascading usually handles it, manual delete is safer for full cleanup)
        await db.delete(mailboxAttachment);
        await db.delete(mailbox);
        await db.delete(mailboxFolder);
        await db.delete(mailboxLabel);
        await db.delete(emailLog);
        
        console.log('✅ Base de données nettoyée avec succès.');
    } catch (e: any) {
        console.error('❌ Erreur lors du nettoyage:', e.message);
    }
    process.exit(0);
}

main();
