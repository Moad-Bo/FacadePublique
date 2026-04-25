import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

/**
 * Service pour gérer les accès aux assets via CloudFront
 */
export function getCloudFrontSignedUrl(path: string, expiresMinutes: number = 15): string {
  const config = useRuntimeConfig();
  const domain = config.cloudfrontDomain || 'https://assets.techkne.com';
  const keyPairId = config.cloudfrontKeyPairId;
  const privateKey = config.cloudfrontPrivateKey;

  if (!keyPairId || !privateKey) {
    console.warn("CloudFront signing credentials missing. Returning public URL.");
    return `${domain}/${path}`;
  }

  const url = `${domain}/${path}`;
  const dateLessThan = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

  try {
    return getSignedUrl({
      url,
      keyPairId,
      privateKey: privateKey as string,
      dateLessThan,
    });
  } catch (error) {
    console.error("Error signing CloudFront URL:", error);
    return url;
  }
}

/**
 * Retourne une URL publique directe (pour les images de blog/forum non privées)
 */
export function getCloudFrontPublicUrl(path: string): string {
  const config = useRuntimeConfig();
  const domain = config.cloudfrontDomain || 'https://assets.techkne.com';
  return `${domain}/${path}`;
}
