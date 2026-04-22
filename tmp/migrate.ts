import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    const caCert = fs.readFileSync(path.resolve(process.cwd(), 'content-db.pem'), 'utf8');
    
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: {
            rejectUnauthorized: true,
            ca: caCert,
        }
    });

    console.log('Connexion réussie.');

    try {
        await connection.execute('ALTER TABLE mailbox_folder ADD COLUMN color VARCHAR(20) DEFAULT "neutral"');
        console.log('Colonne "color" ajoutée avec succès.');
    } catch (e: any) {
        if (e.message.includes('Duplicate column name')) {
            console.log('La colonne "color" existe déjà.');
        } else {
            console.error('Erreur:', e.message);
        }
    } finally {
        await connection.end();
    }
}

run();
