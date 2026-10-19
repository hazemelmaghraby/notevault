import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createVaultConfig, listEncryptedRecords, readVaultConfig, removeEncryptedRecord, writeEncryptedRecord } from '@/firebase/firestore'
import type { EncryptionEnvelope, VaultConfig, VaultRecord, VaultRecordDraft } from '@/types/vault'
import { decryptValue, deriveVaultKey, encryptValue, createVaultSalt, ENCRYPTION_VERSION, PBKDF2_ITERATIONS } from '@/utils/encryption'

export type VaultStatus = 'loading' | 'setup' | 'locked' | 'unlocked' | 'error'
interface VaultContextValue {
  status: VaultStatus
  records: VaultRecord[]
  error: string | null
  lockMinutes: number
  setupVault: (passphrase: string) => Promise<void>
  unlockVault: (passphrase: string) => Promise<void>
  lockVault: () => void
  setLockMinutes: (minutes: number) => void
  saveRecord: (draft: VaultRecordDraft, id?: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refreshConfig: () => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)
const VERIFICATION_MARKER = 'notevault-vault-check-v1'

function loadLockPreference(): number {
  try {
    const value = Number(localStorage.getItem('notevault-lock-minutes'))
    return [1, 5, 10, 15].includes(value) ? value : 5
  } catch { return 5 }
}

function isVaultRecord(value: unknown): value is Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return !!value && typeof value === 'object' && 'kind' in value && 'title' in value &&
    typeof value.kind === 'string' && typeof value.title === 'string' && Array.isArray((value as { tags?: unknown }).tags)
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [records, setRecords] = useState<VaultRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lockMinutes, setLockMinutesState] = useState(loadLockPreference)
  const keyRef = useRef<CryptoKey | null>(null)

  const clearVault = useCallback(() => {
    keyRef.current = null
    setRecords([])
  }, [])

  const refreshConfig = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    setError(null)
    try {
      const nextConfig = await readVaultConfig(user.uid)
      setConfig(nextConfig)
      setStatus(nextConfig ? 'locked' : 'setup')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load vault settings.')
      setStatus('error')
    }
  }, [user])

  useEffect(() => {
    let active = true
    clearVault()
    setConfig(null)
    setError(null)
    if (!user) {
      setStatus('loading')
      return () => { active = false }
    }
    setStatus('loading')
    readVaultConfig(user.uid).then(nextConfig => {
      if (!active) return
      setConfig(nextConfig)
      setStatus(nextConfig ? 'locked' : 'setup')
    }).catch(reason => {
      if (!active) return
      setError(reason instanceof Error ? reason.message : 'Could not load vault settings.')
      setStatus('error')
    })
    return () => { active = false }
  }, [user, clearVault])

  const decryptRecords = useCallback(async (uid: string, key: CryptoKey) => {
    const stored = await listEncryptedRecords(uid)
    const decrypted = await Promise.all(stored.map(async item => {
      const envelope: EncryptionEnvelope = {
        ciphertext: item.ciphertext, iv: item.iv, encryptionVersion: item.encryptionVersion,
      }
      const value: unknown = await decryptValue(envelope, key)
      if (!isVaultRecord(value)) throw new Error('A record has invalid encrypted content. No records were loaded.')
      return { ...value, id: item.id, createdAt: item.createdAt, updatedAt: item.updatedAt }
    }))
    setRecords(decrypted)
  }, [])

  const setupVault = useCallback(async (passphrase: string) => {
    if (!user) throw new Error('Sign in before setting up your vault.')
    setError(null)
    setStatus('loading')
    let vaultCreated = false
    try {
      const salt = createVaultSalt()
      const key = await deriveVaultKey(passphrase, salt, PBKDF2_ITERATIONS)
      const verifier = await encryptValue({ marker: VERIFICATION_MARKER }, key)
      const nextConfig: VaultConfig = { salt, iterations: PBKDF2_ITERATIONS, encryptionVersion: ENCRYPTION_VERSION, verifier }
      await createVaultConfig(user.uid, nextConfig)
      vaultCreated = true
      setConfig(nextConfig)
      await decryptRecords(user.uid, key)
      keyRef.current = key
      setStatus('unlocked')
    } catch (reason) {
      clearVault()
      const message = reason instanceof Error ? reason.message : 'Could not create the vault.'
      setError(message)
      setStatus(vaultCreated || config ? 'locked' : 'setup')
      throw new Error(message)
    }
  }, [user, config, decryptRecords, clearVault])

  const unlockVault = useCallback(async (passphrase: string) => {
    if (!user || !config) throw new Error('Vault settings are not ready yet.')
    setError(null)
    setStatus('loading')
    let key: CryptoKey
    try {
      key = await deriveVaultKey(passphrase, config.salt, config.iterations)
      const check = await decryptValue<{ marker?: string }>(config.verifier, key)
      if (check.marker !== VERIFICATION_MARKER) throw new Error('Vault verification failed.')
    } catch {
      clearVault()
      setStatus('locked')
      const message = 'That passphrase did not unlock the vault. If it is lost, encrypted records cannot be recovered.'
      setError(message)
      throw new Error(message)
    }
    try {
      await decryptRecords(user.uid, key)
      keyRef.current = key
      setStatus('unlocked')
    } catch (reason) {
      clearVault()
      setStatus('locked')
      const message = reason instanceof Error ? reason.message : 'Could not sync encrypted records.'
      setError(message)
      throw new Error(message)
    }
  }, [user, config, clearVault, decryptRecords])

  const lockVault = useCallback(() => {
    clearVault()
    setError(null)
    setStatus(config ? 'locked' : 'setup')
  }, [clearVault, config])

  const setLockMinutes = useCallback((minutes: number) => {
    if (![1, 5, 10, 15].includes(minutes)) return
    setLockMinutesState(minutes)
    try { localStorage.setItem('notevault-lock-minutes', String(minutes)) } catch { /* preference is optional */ }
  }, [])

  const saveRecord = useCallback(async (draft: VaultRecordDraft, id?: string) => {
    if (!user || status !== 'unlocked' || !keyRef.current) throw new Error('Unlock the vault before saving.')
    const existing = id ? records.find(record => record.id === id) : undefined
    const recordId = existing?.id ?? crypto.randomUUID()
    const now = Date.now()
    const envelope = await encryptValue(draft, keyRef.current)
    await writeEncryptedRecord(user.uid, recordId, envelope, !existing)
    const updated: VaultRecord = {
      ...draft, id: recordId, createdAt: existing?.createdAt ?? now, updatedAt: now,
    }
    setRecords(current => existing
      ? current.map(record => record.id === recordId ? updated : record)
      : [updated, ...current])
  }, [user, status, records])

  const deleteRecord = useCallback(async (id: string) => {
    if (!user || status !== 'unlocked') throw new Error('Unlock the vault before deleting.')
    await removeEncryptedRecord(user.uid, id)
    setRecords(current => current.filter(record => record.id !== id))
  }, [user, status])

  useEffect(() => {
    if (status !== 'unlocked') return
    let timer: ReturnType<typeof setTimeout>
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(lockVault, lockMinutes * 60_000)
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') lockVault() }
    resetTimer()
    window.addEventListener('pointerdown', resetTimer, { passive: true })
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('touchstart', resetTimer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('touchstart', resetTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, lockMinutes, lockVault])

  const value = useMemo(() => ({ status, records, error, lockMinutes, setupVault, unlockVault, lockVault, setLockMinutes, saveRecord, deleteRecord, refreshConfig }), [
    status, records, error, lockMinutes, setupVault, unlockVault, lockVault, setLockMinutes, saveRecord, deleteRecord, refreshConfig,
  ])
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error('useVault must be used inside VaultProvider.')
  return context
}
