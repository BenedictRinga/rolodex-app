import { Injectable } from '@angular/core';
import type { EncryptedBundle } from './sync.types';

// ---------------------------------------------------------------------------
// Encryption service — AES-256-GCM + PBKDF2 key derivation via Web Crypto API.
// The user provides a passphrase; we never store it.
// ---------------------------------------------------------------------------

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const HASH = 'SHA-256';
const DEFAULT_ITERATIONS = 600_000;

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  /**
   * Encrypt a JSON-serialisable payload with a user passphrase.
   * Returns the encrypted bundle (iv, ciphertext, salt, iterations).
   */
  async encrypt(data: unknown, passphrase: string): Promise<EncryptedBundle> {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));

    // Derive key
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(passphrase, salt, DEFAULT_ITERATIONS);

    // Encrypt
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      plaintext,
    );

    return {
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(new Uint8Array(ciphertext)),
      salt: this.toBase64(salt),
      iterations: DEFAULT_ITERATIONS,
    };
  }

  /**
   * Decrypt an EncryptedBundle back to the original plaintext object.
   * Returns null if decryption fails (wrong passphrase, corrupt data).
   */
  async decrypt<T>(bundle: EncryptedBundle, passphrase: string): Promise<T | null> {
    try {
      const iv = this.fromBase64(bundle.iv);
      const ciphertext = this.fromBase64(bundle.ciphertext);
      const salt = this.fromBase64(bundle.salt);
      const iterations = bundle.iterations || DEFAULT_ITERATIONS;

      const key = await this.deriveKey(passphrase, salt, iterations);

      const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext,
      );

      return JSON.parse(new TextDecoder().decode(plaintext)) as T;
    } catch {
      return null; // wrong passphrase or corrupt data
    }
  }

  // ---- helpers -------------------------------------------------------------

  private async deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations: number,
  ): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: HASH,
      },
      baseKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private toBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
