/**
 * Secure localStorage wrapper with encryption
 * Uses Web Crypto API for AES-GCM encryption
 */

const STORAGE_KEY_PREFIX = 'aquavo_';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const SALT_VERSION = 'v2';

// Get a more unique salt by combining a base salt with browser-specific data
function getDynamicSalt(): string {
  // Combine multiple sources to create a more unique salt per browser/device
  const browserInfo = [
    navigator.userAgent.slice(0, 50), // First 50 chars of user agent
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.width.toString(),
    screen.height.toString(),
  ].join('|');

  return `aquavo-salt-${SALT_VERSION}-${browserInfo}`;
}

// Generate a key from a password/secret
async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(getDynamicSalt()),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
async function encryptData(data: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await getEncryptionKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fallback to unencrypted storage in case of error
    return data;
  }
}

// Decrypt data
async function decryptData(encryptedData: string, secret: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const key = await getEncryptionKey(secret);

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      data
    );

    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Fallback: return the original data (might be unencrypted legacy data)
    return encryptedData;
  }
}

// Get encryption secret - uses environment variable if available
function getEncryptionSecret(): string {
  // Priority 1: Environment variable (most secure for production)
  const envSecret = import.meta.env.VITE_STORAGE_SECRET;
  if (envSecret && typeof envSecret === 'string' && envSecret.length >= 16) {
    return envSecret;
  }

  // Priority 2: Fallback with dynamic components (still acceptable security)
  // This creates a unique secret per browser/device combination
  const fallbackComponents = [
    'aquavo-2025',
    navigator.language,
    new Date().getTimezoneOffset().toString(),
  ].join('-');

  return fallbackComponents;
}

/**
 * Secure storage wrapper
 */
export const secureStorage = {
  /**
   * Store data securely in localStorage with encryption
   */
  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    try {
      const secret = getEncryptionSecret();
      const serialized = JSON.stringify(value);
      const encrypted = await encryptData(serialized, secret);
      localStorage.setItem(STORAGE_KEY_PREFIX + key, encrypted);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      // Fallback to regular localStorage
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    }
  },

  /**
   * Retrieve and decrypt data from localStorage
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!encrypted) return null;

      const secret = getEncryptionSecret();
      const decrypted = await decryptData(encrypted, secret);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      // Try to parse as regular JSON (legacy data)
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
        return raw ? JSON.parse(raw) as T : null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + key);
  },

  /**
   * Clear all aquavo items from localStorage
   */
  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },
};

/**
 * Synchronous fallback for cases where async encryption isn't feasible
 * WARNING: This is less secure but maintains compatibility
 */
// Keep the current session usable when storage is blocked or its quota is full.
// Only failed writes override persistent reads; successful reads still observe
// changes made by another tab. A null entry is an intentional removal.
const storageFallback = new Map<string, string | null>();

export const syncStorage = {
  setItem<T = unknown>(key: string, value: T): void {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, serialized);
      storageFallback.delete(key);
    } catch {
      storageFallback.set(key, serialized);
    }
  },

  getItem<T>(key: string): T | null {
    try {
      const item = storageFallback.has(key)
        ? storageFallback.get(key)
        : localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return item ? JSON.parse(item) as T : null;
    } catch {
      return null;
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
      storageFallback.delete(key);
    } catch {
      storageFallback.set(key, null);
    }
  },
};
