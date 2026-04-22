import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('⏳ Création de la table asset...');
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS asset (
                id varchar(36) PRIMARY KEY,
                user_id varchar(36) NOT NULL,
                type varchar(20) NOT NULL,
                target_id varchar(36),
                filename varchar(255) NOT NULL,
                mime_type varchar(100) NOT NULL,
                size int NOT NULL,
                r2_key varchar(500) NOT NULL,
                public_url text,
                created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user(id)
            )
        `);
        console.log('✅ Table asset créée avec succès');
        process.exit(0);
    } catch (e: any) {
        console.error('❌ Erreur lors de la création de la table:', e.message);
        process.exit(1);
    }
}

main();
