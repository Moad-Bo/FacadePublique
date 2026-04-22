import { parseEML } from './server/utils/eml';
import { simpleParser } from 'mailparser';
import MailComposer from 'nodemailer/lib/mail-composer';
import fs from 'fs';

async function audit() {
    console.log("--- Début de l'Audit de Conformité EML ---");

    // 1. Simulation de création (Output)
    const subject = "Test d'Audit Éco-système Techknè avec Accents: éà€";
    const html = `
        <h1>Bonjour Techknè</h1>
        <p>Ceci est un test de conformité EML.</p>
        <p>Accents: é à è û ï €</p>
        <img src="https://example.com/logo.png" alt="Logo" width="100">
    `;

    const composer = new MailComposer({
        from: "Techknè Système <system@example.com>",
        to: "dest@example.com",
        subject: subject,
        html: html,
        text: (await simpleParser(html)).text // Simulation de la nouvelle brique
    });

    const buffer = await composer.compile().build();
    const emlContent = buffer.toString();

    console.log("1. Génération EML (Output) : OK");
    if (emlContent.includes("Content-Transfer-Encoding: quoted-printable")) {
        console.log("   - Encodage Quoted-Printable détecté : OUI");
    } else {
        console.log("   - Encodage Quoted-Printable détecté : NON (Attention)");
    }

    if (emlContent.includes("Content-Type: multipart/alternative")) {
        console.log("   - Structure Multipart/Alternative détectée : OUI");
    } else {
        console.log("   - Structure Multipart/Alternative détectée : NON (Attention)");
    }

    // 2. Simulation de parsing (Input)
    const parsed = await parseEML(emlContent);
    console.log("2. Parsing EML (Input) : OK");
    console.log("   - Sujet décodé :", parsed.subject);
    console.log("   - Date :", parsed.date);
    console.log("   - Contenu HTML présent :", !!parsed.body);
    console.log("   - Contenu Texte présent :", !!parsed.text);

    const score = {
        quotedPrintable: emlContent.includes("quoted-printable") ? 100 : 0,
        multiPart: emlContent.includes("multipart/alternative") ? 100 : 0,
        headersDecoded: parsed.subject === subject ? 100 : 0,
        bodyExtracted: (parsed.body && parsed.body.includes("Bonjour Techknè")) ? 100 : 0
    };

    console.log("\n--- Résultats de l'Audit ---");
    console.log(`Encodage Quoted-Printable : ${score.quotedPrintable}%`);
    console.log(`Structure Multi-Part      : ${score.multiPart}%`);
    console.log(`Décodage des Headers      : ${score.headersDecoded}%`);
    console.log(`Extraction du Corps       : ${score.bodyExtracted}%`);
    
    const globalScore = (score.quotedPrintable + score.multiPart + score.headersDecoded + score.bodyExtracted) / 4;
    console.log(`\nSCORE GLOBAL : ${globalScore}%`);

    if (globalScore === 100) {
        console.log("\nFÉLICITATIONS : L'écosystème est 100% conforme aux standards EML !");
    }
}

audit().catch(console.error);
