import {
  collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { requireFirebase } from '@/firebase/config'
import type { EncryptionEnvelope, StoredEncryptedRecord, VaultConfig } from '@/types/vault'

function validConfig(data: unknown): data is VaultConfig {
  if (!data || typeof data !== 'object') return false
  const item = data as Partial<VaultConfig>
  return typeof item.salt === 'string' && typeof item.iterations === 'number' &&
    item.encryptionVersion === 1 && !!item.verifier && typeof item.verifier.ciphertext === 'string' &&
    typeof item.verifier.iv === 'string' && item.verifier.encryptionVersion === 1
}

export async function readVaultConfig(uid: string): Promise<VaultConfig | null> {
  const { db } = requireFirebase()
  const snapshot = await getDoc(doc(db, 'users', uid, 'vault', 'config'))
  if (!snapshot.exists()) return null
  const data: unknown = snapshot.data()
  if (!validConfig(data)) throw new Error('Vault settings are invalid or incomplete. Contact support before making changes.')
  return data
}

export async function createVaultConfig(uid: string, config: VaultConfig): Promise<void> {
  const { db } = requireFirebase()
  const reference = doc(db, 'users', uid, 'vault', 'config')
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(reference)
    if (existing.exists()) throw new Error('A vault is already set up for this account. Unlock it instead.')
    transaction.set(reference, config)
  })
}

export async function listEncryptedRecords(uid: string): Promise<StoredEncryptedRecord[]> {
  const { db } = requireFirebase()
  const snapshot = await getDocs(collection(db, 'users', uid, 'records'))
  return snapshot.docs.map(item => {
    const data = item.data()
    if (typeof data.ciphertext !== 'string' || typeof data.iv !== 'string' || data.encryptionVersion !== 1) {
      throw new Error('A saved record has invalid encryption metadata. No records were loaded.')
    }
    return {
      id: item.id,
      ciphertext: data.ciphertext,
      iv: data.iv,
      encryptionVersion: data.encryptionVersion,
      createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Date.now(),
      updatedAt: typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : Date.now(),
    }
  })
}

export async function writeEncryptedRecord(
  uid: string,
  id: string,
  envelope: EncryptionEnvelope,
  isNew: boolean,
): Promise<void> {
  const { db } = requireFirebase()
  const reference = doc(db, 'users', uid, 'records', id)
  const encrypted = {
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    encryptionVersion: envelope.encryptionVersion,
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
  }
  if (isNew) await setDoc(reference, encrypted)
  else await updateDoc(reference, encrypted)
}

export async function removeEncryptedRecord(uid: string, id: string): Promise<void> {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'users', uid, 'records', id))
}
