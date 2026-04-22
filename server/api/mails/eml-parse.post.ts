import { Readable } from 'stream';
import { streamParseEML } from '../../utils/eml';

export default defineEventHandler(async (event) => {
  const multipart = await readMultipartFormData(event);
  
  if (!multipart || multipart.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aucun fichier multipart trouvé.',
    });
  }

  const parsedMails = await Promise.all(multipart.map(async (file, index) => {
    // skip other fields if any
    if (!file.name || !file.data) return null;

    try {
      // Create a stream from the buffer
      const stream = Readable.from(file.data);
      const parsed = await streamParseEML(stream);
      
      return {
        id: `parsed-${index}-${Date.now()}`,
        ...parsed,
        content: file.data.toString('utf8') // Keep original content if needed for DB import
      };
    } catch (e: any) {
      console.error(`Failed to parse EML part at index ${index}:`, e.message);
      return null;
    }
  }));

  const validMails = parsedMails.filter(Boolean);

  return { 
    success: true, 
    mails: validMails
  };
});
