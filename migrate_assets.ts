import mysql from 'mysql2/promise';

async function migrate() {
    console.log('🚀 Connexion directe avec mysql2...');
    const connection = await mysql.createConnection({
        uri: 'mysql://3ZGzvooCsjwnDc3.root:iRc0cHVxeMg2GCUc@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/Nuxt-Content',
        ssl: {
            rejectUnauthorized: true,
        }
    });

    try {
        console.log('ALTER TABLE asset...');
        
        const queries = [
            "ALTER TABLE asset ADD COLUMN hash varchar(64)",
            "ALTER TABLE asset ADD COLUMN visibility varchar(10) DEFAULT 'public'",
            "ALTER TABLE asset ADD COLUMN expires_at timestamp NULL",
            "ALTER TABLE asset ADD COLUMN lifecycle_status varchar(10) DEFAULT 'validated'",
            "ALTER TABLE asset MODIFY COLUMN type varchar(30) NOT NULL",
            "ALTER TABLE mailbox_attachment ADD COLUMN asset_id varchar(36)",
            `CREATE TABLE IF NOT EXISTS email_attachment (
                id varchar(36) PRIMARY KEY,
                asset_id varchar(36) NOT NULL,
                email_queue_id varchar(36),
                email_log_id varchar(36),
                campaign_id varchar(36),
                created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE
            )`
        ];

        for (const q of queries) {
            try {
                await connection.query(q);
                console.log('✅ ' + q);
            } catch (err: any) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log('⏭️ Skipped (already exists): ' + q);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Migration terminée avec succès.');
    } catch (e: any) {
        console.error('❌ Erreur de migration:', e.message, e.code);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
