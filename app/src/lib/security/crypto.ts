/**
 * KYC Data Encryption Utility
 * Uses AES-GCM via Web Crypto API for encrypting sensitive fields
 * (idNumber, bankAccountNumber, taxId) before storing in Firestore.
 *
 * IMPORTANT: Set NEXT_PUBLIC_ENCRYPTION_KEY in .env.local (base64 encoded 256-bit key)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ENCRYPTION_KEY_ENV = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

// Fields that should be encrypted
export const SENSITIVE_FIELDS = [
  'idNumber',
  'bankAccountNumber',
  'taxId',
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

/**
 * Check if encryption is configured
 */
export function isEncryptionEnabled(): boolean {
  return !!ENCRYPTION_KEY_ENV;
}

/**
 * Get the encryption key from environment variable
 */
async function getKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY_ENV) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY not set. KYC encryption disabled.');
  }

  const keyData = Uint8Array.from(atob(ENCRYPTION_KEY_ENV), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string: iv:ciphertext
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext || !isEncryptionEnabled()) return plaintext;

  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine iv + ciphertext and encode as base64
    const ivStr = btoa(String.fromCharCode(...iv));
    const ctStr = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    return `enc:${ivStr}:${ctStr}`;
  } catch (err) {
    console.error('[Crypto] Encryption failed:', err);
    return plaintext; // Fallback: store as-is if encryption fails
  }
}

/**
 * Decrypt a ciphertext string
 * Input format: enc:iv_base64:ciphertext_base64
 */
export async function decryptField(encrypted: string): Promise<string> {
  if (!encrypted || !encrypted.startsWith('enc:') || !isEncryptionEnabled()) {
    return encrypted;
  }

  try {
    const key = await getKey();
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted;

    const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    return '[Encrypted]'; // Show placeholder if decryption fails
  }
}

/**
 * Encrypt all sensitive fields in a data object
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  data: T
): Promise<T> {
  if (!isEncryptionEnabled()) return data;

  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && typeof result[field] === 'string' && result[field]) {
      const value = result[field] as string;
      // Don't re-encrypt already encrypted values
      if (!value.startsWith('enc:')) {
        (result as Record<string, unknown>)[field] = await encryptField(value);
      }
    }
  }
  return result;
}

/**
 * Decrypt all sensitive fields in a data object
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  data: T
): Promise<T> {
  if (!isEncryptionEnabled()) return data;

  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = await decryptField(result[field] as string);
    }
  }
  return result;
}

/**
 * Mask a sensitive field for display (show last 4 chars only)
 */
export function maskSensitiveField(value: string | undefined): string {
  if (!value || value.startsWith('enc:')) return '••••••••';
  if (value.length <= 4) return '••••';
  return '•'.repeat(value.length - 4) + value.slice(-4);
}
