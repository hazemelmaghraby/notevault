import { useState, type FormEvent } from 'react'
import { AlertTriangle, Check, Clock3, KeyRound, LockKeyhole, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useVault } from '@/context/VaultContext'
import { safeErrorMessage } from '@/utils/validation'

export function SettingsPanel() {
  const { user, logout, updateDisplayName, changeAccountPassword } = useAuth()
  const { lockMinutes, setLockMinutes, lockVault } = useVault()
  const [name, setName] = useState(user?.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveName(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await updateDisplayName(name); toast.success('Profile name updated.') }
    catch (reason) { toast.error(safeErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    if (nextPassword.length < 8) { toast.error('Choose a password with at least 8 characters.'); return }
    if (nextPassword !== confirmPassword) { toast.error('Your new passwords do not match.'); return }
    setBusy(true)
    try {
      await changeAccountPassword(currentPassword, nextPassword)
      setCurrentPassword(''); setNextPassword(''); setConfirmPassword('')
      toast.success('Firebase account password changed. Your vault passphrase is unchanged.')
    } catch (reason) { toast.error(safeErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  async function signOut() {
    lockVault()
    try { await logout() } catch (reason) { toast.error(safeErrorMessage(reason)) }
  }

  return <section className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Your account and privacy</p><h2 className="mt-2 text-3xl font-medium tracking-tight">Settings</h2><p className="mt-2 text-sm text-muted-foreground">Keep your account current and decide how quickly your vault locks.</p></header>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-4" /></span><div><h3 className="text-sm font-semibold">Profile</h3><p className="mt-0.5 text-xs text-muted-foreground">Your Firebase account identity</p></div></div><form onSubmit={saveName} className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" value={user?.email ?? ''} readOnly className="text-muted-foreground" /></div><div className="space-y-2"><Label htmlFor="profile-name">Display name</Label><Input id="profile-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="Your name" /></div><Button variant="outline" disabled={busy || name.trim() === (user?.displayName ?? '')}><Check className="size-4" /> Save profile</Button></form></section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-4" /></span><div><h3 className="text-sm font-semibold">Firebase account password</h3><p className="mt-0.5 text-xs text-muted-foreground">Separate from your encryption passphrase</p></div></div><form onSubmit={savePassword} className="mt-5 space-y-3"><PasswordInput id="current-account-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} /><PasswordInput id="new-account-password" label="New password" value={nextPassword} onChange={setNextPassword} /><PasswordInput id="confirm-account-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} /><Button variant="outline" disabled={busy || !currentPassword || !nextPassword}><KeyRound className="size-4" /> Change password</Button></form></section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="size-4" /></span><div><h3 className="text-sm font-semibold">Automatic vault lock</h3><p className="mt-0.5 text-xs text-muted-foreground">The vault also locks when this tab is hidden.</p></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"><Label htmlFor="lock-time" className="text-sm">Lock after inactivity</Label><select id="lock-time" value={lockMinutes} onChange={event => setLockMinutes(Number(event.target.value))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-40"><option value={1}>1 minute</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div><Button className="mt-5" variant="outline" onClick={lockVault}><LockKeyhole className="size-4" /> Lock vault now</Button></section>
      <section className="rounded-2xl border border-primary/20 bg-primary/[.035] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span><div><h3 className="text-sm font-semibold">How your privacy works</h3><p className="mt-0.5 text-xs text-muted-foreground">A clear look at what is and isn’t protected</p></div></div><ul className="mt-5 space-y-3 text-xs leading-5 text-muted-foreground"><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>Private record fields are encrypted in this browser using AES-256-GCM before Firestore receives them.</span></li><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>The vault key is derived from a separate passphrase and stays in memory only until the vault locks.</span></li><li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>Search and sorting run on decrypted data locally. Firestore sees only ciphertext, IV, version, and sync timestamps.</span></li><li className="flex gap-2 text-amber-200"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>If you lose the vault passphrase, encrypted records cannot be recovered. Firebase account password reset does not unlock the vault.</span></li></ul></section>
    </div>
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h3 className="text-sm font-semibold">Leave this device?</h3><p className="mt-1 text-xs text-muted-foreground">Lock private data and end your Firebase account session.</p></div><Button variant="outline" onClick={() => void signOut()}><LogOut className="size-4" /> Lock and sign out</Button></section>
    <p className="text-xs leading-5 text-muted-foreground">No recovery key is configured. Keep your vault passphrase in a secure password manager before storing important information.</p>
  </section>
}

function PasswordInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="password" autoComplete="current-password" value={value} onChange={event => onChange(event.target.value)} required minLength={8} /></div>
}
