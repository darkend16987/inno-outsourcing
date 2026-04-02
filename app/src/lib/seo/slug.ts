/**
 * SEO Slug Utilities
 * Converts Vietnamese titles to URL-friendly slugs
 */

const VIETNAMESE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
};

/**
 * Convert a Vietnamese string to a URL-friendly slug.
 * Example: "Thiết kế Kiến trúc Nhà xưởng" → "thiet-ke-kien-truc-nha-xuong"
 */
export function toSlug(text: string): string {
  let result = text.toLowerCase();
  
  // Replace Vietnamese characters
  result = result.replace(/./g, (char) => VIETNAMESE_MAP[char] || char);
  
  // Remove remaining non-alphanumeric (keep hyphens & spaces)
  result = result.replace(/[^a-z0-9\s-]/g, '');
  
  // Replace spaces and multiple hyphens with single hyphen
  result = result.replace(/[\s]+/g, '-').replace(/-+/g, '-');
  
  // Trim hyphens from start/end
  result = result.replace(/^-+|-+$/g, '');
  
  return result;
}

/**
 * Create a SEO slug with ID suffix for uniqueness.
 * Format: "thiet-ke-kien-truc-nha-xuong-abc123"
 * The last segment after the last hyphen group is the document ID.
 */
export function toSlugWithId(title: string, id: string): string {
  const slug = toSlug(title);
  // Use first 6 chars of ID for brevity while maintaining uniqueness
  const shortId = id.slice(0, 8);
  return `${slug}-${shortId}`;
}

/**
 * Extract the Firestore document ID from a slug.
 * The ID is the last 8 characters of the slug.
 */
export function extractIdFromSlug(slug: string): string {
  // Try to match <slug>-<8char-id> pattern
  const parts = slug.split('-');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // If it looks like a Firestore auto-ID fragment (alphanumeric, ~8 chars)
    if (/^[a-zA-Z0-9]{6,}$/.test(lastPart)) {
      return lastPart;
    }
  }
  // Fallback: treat entire slug as ID (backward compatible)
  return slug;
}

/**
 * Format currency for OG meta tags (compact format)
 */
export function formatOGBudget(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} triệu`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount}₫`;
}
