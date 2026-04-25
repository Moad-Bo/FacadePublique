import { drizzle } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

let db: ReturnType<typeof drizzle> | null = null;

export const useDrizzle = async () => {
    if (!db) {
        let caCert: string | undefined;
        try {
            const caPath = process.env.MYSQL_SSL_CA;
            if (caPath) {
                const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
                caCert = fs.readFileSync(fullPath, 'utf8');
                console.log("Certificat CA lu avec succès depuis :", fullPath);
            } else {
                console.warn("MYSQL_SSL_CA n'est pas défini. La connexion SSL pourrait échouer.");
            }
        } catch (error) {
            console.error("Erreur lors de la lecture du certificat CA :", error);
            throw error; // Rejeter l'erreur pour arrêter le processus si le CA est critique
        }

        try {
            const connection = await createConnection({
                host: process.env.MYSQL_HOST as string,
                port: Number(process.env.MYSQL_PORT),
                user: process.env.MYSQL_USER as string,
                password: process.env.MYSQL_PASSWORD as string,
                database: process.env.MYSQL_DATABASE as string,
                ssl: caCert ? {
                    rejectUnauthorized: true,
                    ca: caCert,
                } : undefined, // Utiliser SSL uniquement si le certificat CA est disponible
            });
            db = drizzle(connection, { schema, mode: 'default' });
            console.log("Connexion à la base de données établie avec succès.");
        } catch (error) {
            console.error("Erreur lors de l'établissement de la connexion à la base de données :", error);
            throw error; // Rejeter l'erreur pour arrêter le processus et afficher la cause
        }
    }
    return db;
};
