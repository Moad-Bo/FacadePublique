const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL not found in .env");
        process.exit(1);
    }
    const connection = await mysql.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });
    console.log("Connected to DB");

    try {
        // 1. Create table email_layout
        await connection.query("CREATE TABLE IF NOT EXISTS email_layout (id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL, html MEDIUMTEXT NOT NULL, updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
        console.log("Table email_layout created/exists");

        // 2. Add layout_id columns
        const tablesToUpdate = [
            { name: 'newsletter_template', default: 'newsletter' },
            { name: 'system_template', default: 'system' },
            { name: 'email_queue', default: null }
        ];
        
        for (const table of tablesToUpdate) {
            try {
                await connection.query('ALTER TABLE ' + table.name + ' ADD COLUMN layout_id VARCHAR(36)');
                console.log('Added layout_id to ' + table.name);
            } catch (e) {
                console.log('layout_id likely already in ' + table.name);
            }
            
            if (table.default) {
                await connection.query('UPDATE ' + table.name + ' SET layout_id = ? WHERE layout_id IS NULL', [table.default]);
            }
        }

        // 3. Seed 3 basic layouts
        const baseStyles = "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; line-height: 1.6; } .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eef0f2; box-shadow: 0 4px 6px rgba(0,0,0,0.02); } .header { padding: 30px; text-align: center; border-bottom: 1px solid #f0f2f5; } .logo { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -0.5px; text-decoration: none; } .content { padding: 40px 30px; font-size: 16px; color: #444; } .footer { padding: 30px; text-align: center; background-color: #fcfdfe; border-top: 1px solid #f0f2f5; font-size: 12px; color: #888; } .footer a { color: #888; text-decoration: underline; margin: 0 10px; }";

        const layouts = [
            {
                id: 'system',
                name: 'System Notifications',
                html: '<!DOCTYPE html><html><head><style>' + baseStyles + '</style></head><body><div class="container"><div class="header"><a href="#" class="logo">TECHKNÈ <span style="color: #6366f1;">SYSTEM</span></a></div><div class="content">{{{body}}}</div><div class="footer"><p>Cet email a été envoyé automatiquement.</p><p>&copy; ' + new Date().getFullYear() + ' Techknè. Tous droits réservés.</p></div></div></body></html>'
            },
            {
                id: 'newsletter',
                name: 'Marketing Newsletter',
                html: '<!DOCTYPE html><html><head><style>' + baseStyles + '</style></head><body><div class="container"><div class="header"><a href="#" class="logo">TECHKNÈ <span style="color: #6366f1;">INSIGHTS</span></a></div><div class="content">{{{body}}}</div><div class="footer"><p>Vous recevez cet email car vous êtes abonné.</p><a href="{unsubscribe_link}" style="color: #f43f5e; font-weight: bold;">Se désabonner</a><p>&copy; ' + new Date().getFullYear() + ' Techknè. Tous droits réservés.</p></div></div></body></html>'
            },
            {
                id: 'inbox',
                name: 'Direct Support',
                html: '<!DOCTYPE html><html><head><style>' + baseStyles + '</style></head><body><div class="container"><div class="header"><a href="#" class="logo">TECHKNÈ <span style="color: #6366f1;">SUPPORT</span></a></div><div class="content">{{{body}}}</div><div class="footer"><p>Besoin d\'aide ? Répondez simplement à cet email.</p><p>&copy; ' + new Date().getFullYear() + ' Techknè. Tous droits réservés.</p></div></div></body></html>'
            }
        ];

        for (const layout of layouts) {
            await connection.query(
                "INSERT INTO email_layout (id, name, html) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE html = VALUES(html), name = VALUES(name)",
                [layout.id, layout.name, layout.html]
            );
            console.log("Seeded layout: " + layout.id);
        }

    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await connection.end();
    }
}

run();
