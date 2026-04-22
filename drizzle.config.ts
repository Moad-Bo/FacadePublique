import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    dialect: 'mysql',
    schema: './drizzle/src/db/schema.ts',
    out: './db/migrations',
    dbCredentials: {
        host: process.env.MYSQL_HOST as string,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER as string,
        password: process.env.MYSQL_PASSWORD as string,
        database: process.env.MYSQL_DATABASE as string,
        ssl: (() => {
            let caCert: string | undefined;
            try {
                const caPath = process.env.MYSQL_SSL_CA;
                if (caPath) {
                    const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
                    caCert = fs.readFileSync(fullPath, 'utf8');
                    console.log("drizzle.config.ts: Certificat CA lu avec succès depuis :", fullPath);
                } else {
                    console.warn("drizzle.config.ts: MYSQL_SSL_CA n'est pas défini. La connexion SSL pourrait échouer.");
                }
            } catch (error) {
                console.error("drizzle.config.ts: Erreur lors de la lecture du certificat CA :", error);
            }
            return {
                rejectUnauthorized: true,
                ca: caCert,
            };
        })()
    }
})
