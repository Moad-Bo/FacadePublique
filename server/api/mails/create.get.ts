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
                ca: fs.readFileSync(process.env.MYSQL_SSL_CA || '/home/moad/Techkne/Techkne/content-db.pem')
            }
        });

        // 1. Get user table collation to avoid ER_FK_INCOMPATIBLE_COLUMNS
        const [rows]: any = await connection.execute(`
            SELECT TABLE_COLLATION 
            FROM information_schema.TABLES 
            WHERE TABLE_NAME = 'user' AND TABLE_SCHEMA = DATABASE()
        `);
        
        const collation = rows[0]?.TABLE_COLLATION || 'utf8mb4_bin';
        console.log('Detected user table collation:', collation);

        // 2. Create mailbox table with matching collation
        const sql = `
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
        `;

        await connection.execute(sql);

        return { 
            success: true, 
            message: 'Table mailbox créée !' 
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
