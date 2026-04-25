import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { useRuntimeConfig } from "#imports";
import { readFileSync } from "fs";
import { resolve } from "path";
import { S3Client, PutObjectTaggingCommand, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Lit la clé privée CloudFront depuis le fichier .pem pointé par le path.
 * Gère le format RSA avec les sauts de ligne échappés.
 * Cache le résultat en mémoire (lecture unique au boot du serveur).
 */
let _cachedPrivateKey: string | null = null;

function loadPrivateKey(): string | null {
  if (_cachedPrivateKey) return _cachedPrivateKey;

  const config = useRuntimeConfig();
  const keyPath = config.cloudfrontPrivateKeyPath as string | undefined;

  if (!keyPath) {
    console.warn('[AWS_ASSETS] CLOUDFRONT_PRIVATE_KEY_PATH non défini.');
    return null;
  }

  try {
    // Le path dans .env commence par /server/keys/... → chemin relatif au projet
    const absolutePath = keyPath.startsWith('/')
      ? resolve(process.cwd(), keyPath.slice(1)) // retire le slash initial
      : resolve(process.cwd(), keyPath);

    const rawKey = readFileSync(absolutePath, 'utf-8');
    // Normalise les \n échappés si la clé a été copiée inline par erreur
    _cachedPrivateKey = rawKey.replace(/\\n/g, '\n');
    console.info(`[AWS_ASSETS] Clé privée CloudFront chargée depuis: ${absolutePath}`);
    return _cachedPrivateKey;
  } catch (err: any) {
    console.error(`[AWS_ASSETS] Impossible de lire le fichier .pem: ${err.message}`);
    return null;
  }
}

/**
 * Crée un client S3 (AWS) pour les opérations de tagging.
 */
function createS3Client() {
  const config = useRuntimeConfig();
  return new S3Client({
    region: config.awsRegion as string || 'eu-west-3',
    credentials: {
      accessKeyId: config.awsAccessKeyId as string,
      secretAccessKey: config.awsSecretAccessKey as string,
    },
  });
}

/**
 * Service de gestion des URLs d'assets via CloudFront
 */
export const awsAssetsService = {
  /**
   * Retourne l'URL publique CDN CloudFront pour une clé S3 donnée.
   * Utilisé pour les assets publics (avatars, bannières blog, images forum).
   */
  getPublicUrl(s3Key: string): string {
    const config = useRuntimeConfig();
    const domain = config.cloudfrontDomain as string || 'assets.techkne.com';
    // Sécurité anti-double-slash
    const cleanKey = s3Key.replace(/^\/+/, '');
    return `https://${domain}/${cleanKey}`;
  },

  /**
   * Génère une URL signée CloudFront pour les fichiers privés.
   * Utilisé pour les pièces jointes Webmailer, factures, documents légaux.
   */
  getSignedUrl(s3Key: string, expiresInSeconds: number = 3600): string {
    const config = useRuntimeConfig();
    const domain = config.cloudfrontDomain as string || 'assets.techkne.com';
    const keyPairId = config.cloudfrontKeyPairId as string;
    const privateKey = loadPrivateKey();

    if (!keyPairId || !privateKey) {
      console.warn('[AWS_ASSETS] Credentials CloudFront manquants → fallback URL publique');
      return this.getPublicUrl(s3Key);
    }

    const cleanKey = s3Key.replace(/^\/+/, '');
    const url = `https://${domain}/${cleanKey}`;
    const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    try {
      return getSignedUrl({ url, keyPairId, privateKey, dateLessThan });
    } catch (error: any) {
      console.error('[AWS_ASSETS] Erreur de signature CloudFront:', error.message);
      return url; // Fallback URL non signée
    }
  },

  /**
   * Nettoie et préfixe la clé S3 du fichier.
   * SPEC: Chaque clé doit commencer par public/<dossier>/<timestamp>-<filename>
   */
  formatKey(folder: string, fileName: string): string {
    // Validation du dossier autorisé
    const allowedFolders = ['avatars', 'attachments', 'forum', 'newsletter', 'ugc', 'legal'];
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (!allowedFolders.includes(cleanFolder)) {
      throw new Error(`[AWS_ASSETS] Dossier non autorisé: "${folder}". Dossiers valides: ${allowedFolders.join(', ')}`);
    }

    // Nettoie le nom de fichier (sécurité path traversal)
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `public/${cleanFolder}/${Date.now()}-${safeFileName}`;
  },

  /**
   * Valide un asset après écriture DB réussie (commit TiDB).
   * Passe le tag S3 de status=pending à status=validated.
   * SPEC: Atomicité — appeler SEULEMENT après le commit réussi.
   */
  async finalizeAsset(s3Key: string, retries: number = 3): Promise<void> {
    const config = useRuntimeConfig();
    const bucket = config.awsS3BucketName as string;
    const client = createS3Client();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await client.send(new PutObjectTaggingCommand({
          Bucket: bucket,
          Key: s3Key,
          Tagging: {
            TagSet: [{ Key: 'status', Value: 'validated' }],
          },
        }));
        console.info(`[AWS_ASSETS] Asset validé: ${s3Key}`);
        return;
      } catch (err: any) {
        console.warn(`[AWS_ASSETS] Tentative ${attempt}/${retries} de finalizeAsset échouée: ${err.message}`);
        if (attempt < retries) {
          // Backoff exponentiel : 500ms, 1000ms, 2000ms
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        } else {
          // Après 3 tentatives: log d'alerte critique (fichier sera supprimé par Lifecycle Policy dans 24h)
          console.error(`[AWS_ASSETS] CRITIQUE: finalizeAsset définitivement échoué pour ${s3Key}. Le fichier sera supprimé par la Lifecycle Policy AWS dans 24h si le tag reste "pending".`);
          throw err;
        }
      }
    }
  },

  /**
   * Upload un fichier (Buffer) directement sur AWS S3.
   * Par défaut, les fichiers sont privés (gérés via CloudFront URLs signées).
   */
  async uploadToS3(s3Key: string, body: Buffer, contentType: string): Promise<void> {
    const config = useRuntimeConfig();
    const bucket = config.awsS3BucketName as string;
    const client = createS3Client();

    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: body,
        ContentType: contentType,
        Tagging: 'status=pending' // Tag par défaut pour passage en finalizeAsset après commit DB
      }));
    } catch (err: any) {
      console.error(`[AWS_ASSETS] Échec upload S3 pour ${s3Key}:`, err.message);
      throw err;
    }
  },

  /**
   * Mappe une liste d'assets pour ajouter les URLs résolues.
   * Signature CloudFront pour les privés, URL publique pour le reste.
   */
  mapAssets(assets: { s3Key?: string; type?: string }[]): any[] {
    const PRIVATE_TYPES = new Set(['legal', 'mailbox_attachment', 'private_document', 'invoice']);

    return assets.map(asset => {
      const key = asset.s3Key;
      if (!key) return { ...asset, url: '' };

      const isPrivate = PRIVATE_TYPES.has(asset.type || '');
      const url = isPrivate ? this.getSignedUrl(key) : this.getPublicUrl(key);

      return { ...asset, url };
    });
  },
};
