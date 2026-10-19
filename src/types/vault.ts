export type RecordKind = 'note' | 'purchase' | 'credential' | 'goal'
export type GoalPriority = 'low' | 'medium' | 'high'

/** Decrypted private data held only in React memory while the vault is unlocked. */
export interface VaultRecord {
  id: string
  kind: RecordKind
  title: string
  body?: string
  notes?: string
  tags: string[]
  pinned: boolean
  isPurchased?: boolean
  estimatedPrice?: number
  category?: string
  url?: string
  username?: string
  password?: string
  targetAmount?: number
  currentAmount?: number
  targetDate?: string
  priority?: GoalPriority
  createdAt: number
  updatedAt: number
}

export type VaultRecordDraft = Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'>

export interface EncryptionEnvelope {
  ciphertext: string
  iv: string
  encryptionVersion: number
}

export interface VaultConfig {
  salt: string
  iterations: number
  encryptionVersion: number
  verifier: EncryptionEnvelope
}

export interface StoredEncryptedRecord extends EncryptionEnvelope {
  id: string
  createdAt: number
  updatedAt: number
}
