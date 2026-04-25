import 'dotenv/config';
import { db } from './server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        await db.execute(sql`ALTER TABLE email_log ADD COLUMN from_alias varchar(255);`);
        console.log("Migration successful: added from_alias to email_log");
    } catch(e) {
        console.error(e);
    }
    
    // Si la colonne r2_key existe encore, on la renomme en s3_key (selon les requêtes précédentes)
    try {
        await db.execute(sql`ALTER TABLE asset CHANGE COLUMN r2_key s3_key varchar(500);`);
        console.log("Migration successful: renamed r2_key to s3_key in asset");
    } catch (e) {
        console.log("Asset column rename might be already done or failed:", e.message);
    }
    
    process.exit(0);
}

run();
