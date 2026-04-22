import 'dotenv/config';
import { sendEmail } from '../server/utils/email';

async function main() {
    const types = ['notification', 'mod-forum', 'system', 'contact'] as const;
    
    for (const type of types) {
        console.log(`📧 Envoi d'email de test (${type}) vers moad.bo@proton.me...`);
        try {
            const res = await sendEmail({
                recipient: 'moad.bo@proton.me',
                subject: `Test Techknè - Type ${type}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h1 style="color: #6366f1;">Techknè Group</h1>
                        <p>Ceci est un test pour le type <strong>${type}</strong> sur le domaine <strong>@mail.techkne.fr</strong>.</p>
                    </div>
                `,
                type
            });

            if (res.success) {
                console.log(`✅ [${type}] Envoyé avec succès !`);
            } else {
                console.error(`❌ [${type}] Échec:`, res.error);
            }
        } catch (e: any) {
            console.error(`❌ [${type}] Erreur inattendue:`, e.message);
        }
    }
    process.exit(0);
}

main();
