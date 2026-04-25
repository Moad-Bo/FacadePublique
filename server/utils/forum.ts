import scule from 'scule';

/**
 * Generates a Reddit-style slug: "title-text-a1b2c3"
 * @param title The thread title
 * @returns A sanitized slug string
 */
export const generateForumSlug = (title: string) => {
  const sanitized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')           // replace spaces with -
    .replace(/-+/g, '-');             // unique -

  // Add a short random suffix for uniqueness, like Reddit
  const suffix = Math.random().toString(36).substring(2, 8);
  
  return `${sanitized}-${suffix}`;
};
