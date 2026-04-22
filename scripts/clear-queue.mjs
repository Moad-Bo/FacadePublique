import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const caPath = process.env.MYSQL_SSL_CA;
    const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
    
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: 4000,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: { ca: fs.readFileSync(fullPath, 'utf8') },
    });

    console.log('Cleaning up Email Queue and Logs...');
    try {
        const [resQ] = await conn.query('DELETE FROM email_queue WHERE status IN ("pending", "locked", "failed")');
        console.log(`- Cleared ${resQ.affectedRows} items from email_queue.`);
        
        // Optional: clear logs older than 7 days
        const [resL] = await conn.query('DELETE FROM email_log WHERE sent_at < DATE_SUB(NOW(), INTERVAL 7 DAY)');
        console.log(`- Cleared ${resL.affectedRows} old items from email_log.`);
    } catch (e) {
        console.error('Cleanup failed:', e.message);
    }
    await conn.end();
}
run();
