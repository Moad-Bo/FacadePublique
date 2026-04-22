import { defineEventHandler, createError } from 'h3'
import mysql from 'mysql2/promise'
import fs from 'fs'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: Number(process.env.MYSQL_PORT) || 4000,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            ssl: {
                ca: process.env.MYSQL_SSL_CA_PATH ? fs.readFileSync(process.env.MYSQL_SSL_CA_PATH) : undefined
            }
        });

        if (process.env.MYSQL_SSL_CA_PATH && !fs.existsSync(process.env.MYSQL_SSL_CA_PATH)) {
            throw createError({ 
                statusCode: 500, 
                statusMessage: `SSL CA certificate not found at: ${process.env.MYSQL_SSL_CA_PATH}. Please check your environment variables.` 
            });
        }

        const [rows]: any = await connection.execute(`
            SELECT TABLE_COLLATION 
            FROM information_schema.TABLES 
            WHERE TABLE_NAME = 'user' AND TABLE_SCHEMA = DATABASE()
        `);
        const collation = rows[0]?.TABLE_COLLATION || 'utf8mb4_bin';

        console.log('Creating mailbox table...')
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS mailbox (
                id varchar(36) NOT NULL,
                userId varchar(36) NOT NULL,
                from_name text NOT NULL,
                from_email varchar(255) NOT NULL,
                subject text NOT NULL,
                body text NOT NULL,
                date timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                unread boolean DEFAULT true,
                starred boolean DEFAULT false,
                important boolean DEFAULT false,
                pinned boolean DEFAULT false,
                archived boolean DEFAULT false,
                trashed boolean DEFAULT false,
                category varchar(20) DEFAULT 'inbox',
                PRIMARY KEY (id),
                CONSTRAINT mailbox_userId_user_id_fk FOREIGN KEY (userId) REFERENCES user (id)
            ) ENGINE=InnoDB DEFAULT COLLATE=${collation};
        `);

        console.log('Creating settings table...')
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` varchar(100) NOT NULL,
                \`value\` text NOT NULL,
                \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`key\`)
            ) ENGINE=InnoDB DEFAULT COLLATE=${collation};
        `);

        // Initialize default quota settings if not present
        await connection.execute(`
            INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES 
            ('comm_quota_limit', '3000'),
            ('comm_quota_period', '30')
        `);

        return { 
            success: true, 
            message: 'Base de données synchronisée (Mailbox & Settings).' 
        }
    } catch (e: any) {
        return { 
            success: false, 
            error: e.message,
            code: e.code
        }
    } finally {
        if (connection) await connection.end();
    }
})
