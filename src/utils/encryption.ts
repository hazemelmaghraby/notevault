import type { EncryptionEnvelope } from '@/types/vault'

export const ENCRYPTION_VERSION = 1
export const PBKDF2_ITERATIONS = 600_000
const AES_GCM_IV_BYTES = 12
const MIN_ITERATIONS = 300_000
const MAX_ITERATIONS = 1_200_000

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Encrypted data has invalid encoding.')
  }
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export function createVaultSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function deriveVaultKey(passphrase: string, salt: string, iterations: number): Promise<CryptoKey> {
  if (passphrase.length < 12) throw new Error('Use a vault passphrase with at least 12 characters.')
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error('Vault derivation settings are invalid.')
  }
  const saltBytes = new Uint8Array(fromBase64(salt))
  if (saltBytes.length !== 16) throw new Error('Vault salt is invalid.')
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptValue(value: unknown, key: CryptoKey): Promise<EncryptionEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES))
  const cleartext = new TextEncoder().encode(JSON.stringify({ formatVersion: ENCRYPTION_VERSION, value }))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, cleartext)
  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    encryptionVersion: ENCRYPTION_VERSION,
  }
}

export async function decryptValue<T>(envelope: EncryptionEnvelope, key: CryptoKey): Promise<T> {
  if (envelope.encryptionVersion !== ENCRYPTION_VERSION) throw new Error('This encrypted record uses an unsupported format.')
  const iv = new Uint8Array(fromBase64(envelope.iv))
  const ciphertext = new Uint8Array(fromBase64(envelope.ciphertext))
  if (iv.length !== AES_GCM_IV_BYTES || ciphertext.length < 17) throw new Error('Encrypted data is incomplete.')
  const cleartext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  const parsed: unknown = JSON.parse(new TextDecoder().decode(cleartext))
  if (!parsed || typeof parsed !== 'object' || !('formatVersion' in parsed) || !('value' in parsed)) {
    throw new Error('Encrypted data has an invalid format.')
  }
  const payload = parsed as { formatVersion: number; value: T }
  if (payload.formatVersion !== ENCRYPTION_VERSION) throw new Error('This encrypted payload uses an unsupported format.')
  return payload.value
}
