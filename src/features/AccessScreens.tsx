import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Vault } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useVault } from '@/context/VaultContext'
import { isFirebaseConfigured, FIREBASE_SETUP_MESSAGE } from '@/firebase/config'
import { safeErrorMessage } from '@/utils/validation'

type AccessMode = 'landing' | 'signin' | 'signup' | 'setup' | 'unlock'

export function AccessScreens() {
  const { user, error: authError } = useAuth()
  const { status, error: vaultError, setupVault, unlockVault, refreshConfig } = useVault()
  const [mode, setMode] = useState<AccessMode>('landing')

  if (user && status === 'loading') return <LoadingPanel label="Checking your private vault" />
  if (user && status === 'error') return (
    <AccessFrame>
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <ShieldCheck className="mx-auto size-9 text-primary" />
        <h1 className="mt-5 text-2xl font-semibold">We couldn’t reach your vault</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{vaultError || 'Check the Firebase setup and Firestore rules, then try again.'}</p>
        <Button className="mt-6 w-full" onClick={() => void refreshConfig()}>Try again</Button>
      </div>
    </AccessFrame>
  )
  if (user && status === 'setup') return <VaultSetup onSetup={setupVault} error={vaultError} />
  if (user && status === 'locked') return <VaultUnlock name={user.displayName || user.email || 'your account'} onUnlock={unlockVault} error={vaultError} />
  if (user) return null
  if (mode === 'signin' || mode === 'signup') {
    return <AccountForm mode={mode} onBack={() => setMode('landing')} onMode={setMode} authError={authError} />
  }
  return <Landing onSignIn={() => setMode('signin')} onSignUp={() => setMode('signup')} authError={authError} />
}

function AccessFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-background px-5 py-8 text-foreground">{children}</main>
}

function LoadingPanel({ label }: { label: string }) {
  return <AccessFrame><div className="grid min-h-[75dvh] place-items-center"><div className="text-center"><div className="mx-auto size-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary" /><p className="mt-4 text-sm text-muted-foreground">{label}</p></div></div></AccessFrame>
}

function Brand({ small = false }: { small?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Vault className="size-5" /></span><span className={small ? 'text-base font-semibold tracking-tight' : 'text-lg font-semibold tracking-tight'}>NoteVault</span></div>
}

function Landing({ onSignIn, onSignUp, authError }: { onSignIn: () => void; onSignUp: () => void; authError: string | null }) {
  return <AccessFrame>
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between"><Brand /><div className="flex items-center gap-2"><Button variant="ghost" onClick={onSignIn}>Sign in</Button><Button onClick={onSignUp}>Create your vault <ArrowRight className="size-4" /></Button></div></header>
      {(authError || !isFirebaseConfigured) && <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"><strong className="font-medium">{!isFirebaseConfigured ? 'Firebase setup needed.' : 'Sign-in is unavailable.'}</strong> {!isFirebaseConfigured ? FIREBASE_SETUP_MESSAGE : authError}</div>}
      <section className="grid min-h-[620px] items-center gap-14 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
        <div className="animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"><LockKeyhole className="size-3.5" /> Private by design</div>
          <h1 className="max-w-2xl text-5xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-6xl">Keep close what matters.<br /><span className="font-serif italic text-primary">Only yours to see.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">A calm, private place for the things you want to remember, protect, and keep close—from everyday notes to the passwords and plans you’d never leave lying around.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={onSignUp}>Create your private vault <ArrowRight className="size-4" /></Button><Button variant="outline" size="lg" onClick={onSignIn}>I already have an account</Button></div>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Your private records are encrypted in your browser before they sync.</div>
        </div>
        <VaultIllustration />
      </section>
      <section className="grid gap-4 border-t border-border py-8 sm:grid-cols-3">
        <Feature icon={<LockKeyhole />} title="Encrypted before sync" description="AES-256-GCM keeps private record contents unreadable in Firestore." />
        <Feature icon={<KeyRound />} title="Your vault, your key" description="A separate passphrase unlocks your vault. It never leaves your device." />
        <Feature icon={<ShieldCheck />} title="Private, even while searching" description="Search runs locally only after you unlock and decrypt your records." />
      </section>
      <footer className="flex flex-col gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><Brand small /><span>NoteVault · Your personal space, kept private.</span></footer>
    </div>
  </AccessFrame>
}

function VaultIllustration() {
  return <div className="relative mx-auto w-full max-w-[480px] animate-fade-in">
    <div className="absolute -inset-4 rounded-[2.5rem] border border-primary/10 bg-primary/[0.025]" />
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-lg sm:p-7">
      <div className="flex items-center justify-between border-b border-border pb-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><div><p className="text-sm font-medium">Your private space</p><p className="mt-0.5 text-xs text-muted-foreground">Encrypted on this device</p></div></div><span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" /> LOCKED</span></div>
      <div className="space-y-3 py-5">
        <MockRecord label="A note to come back to" type="NOTE" icon="N" />
        <MockRecord label="Cabin weekend fund" type="GOAL" icon="$" />
        <MockRecord label="Streaming account" type="CREDENTIAL" icon="••" />
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-3.5"><div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><LockKeyhole className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-medium">Your key stays with you</p><p className="mt-1 text-[11px] text-muted-foreground">Only encrypted data reaches the cloud.</p></div><ShieldCheck className="size-4 text-primary/70" /></div>
    </div>
    <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-md sm:flex"><span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">256</span><span className="text-[11px] text-muted-foreground">bit authenticated encryption</span></div>
  </div>
}

function MockRecord({ label, type, icon }: { label: string; type: string; icon: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/40 px-3.5 py-3"><span className="grid size-8 place-items-center rounded-lg bg-secondary font-mono text-xs text-primary">{icon}</span><span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{label}</span><span className="text-[9px] tracking-[0.13em] text-muted-foreground">{type}</span></div>
}

function Feature({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <article className="rounded-2xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/25"><div className="mb-4 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div><h2 className="text-sm font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>
}

function AccountForm({ mode, onBack, onMode, authError }: { mode: 'signin' | 'signup'; onBack: () => void; onMode: (mode: AccessMode) => void; authError: string | null }) {
  const { signIn, register } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const isSignup = mode === 'signup'
  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!isFirebaseConfigured) { setFormError(FIREBASE_SETUP_MESSAGE); return }
    if (password.length < 8) { setFormError('Use at least 8 characters for your account password.'); return }
    setBusy(true)
    try {
      if (isSignup) await register(email, password, name)
      else await signIn(email, password)
    } catch (reason) { setFormError(safeErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <AccessFrame><div className="mx-auto flex min-h-[82dvh] max-w-md flex-col justify-center">
    <button className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground" onClick={onBack}><ArrowLeft className="size-4" /> Back to NoteVault</button>
    <Brand />
    <h1 className="mt-8 text-3xl font-medium tracking-tight">{isSignup ? 'Make space for what matters.' : 'Welcome back.'}</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{isSignup ? 'Create your account first. Your separate vault passphrase comes next.' : 'Sign in to reach your encrypted vault.'}</p>
    <form className="mt-7 space-y-4" onSubmit={submit}>
      {isSignup && <div className="space-y-2"><Label htmlFor="display-name">Name <span className="text-muted-foreground">(optional)</span></Label><Input id="display-name" autoComplete="name" maxLength={80} value={name} onChange={event => setName(event.target.value)} /></div>}
      <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="account-password">Account password</Label><div className="relative"><Input id="account-password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={event => setPassword(event.target.value)} className="pr-12" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
      {(formError || (!isFirebaseConfigured && isSignup)) && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-foreground">{formError || FIREBASE_SETUP_MESSAGE}</p>}
      {authError && !formError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'} <ArrowRight className="size-4" /></Button>
    </form>
    <p className="mt-5 text-center text-sm text-muted-foreground">{isSignup ? 'Already have an account?' : 'New to NoteVault?'} <button className="font-medium text-primary hover:underline" onClick={() => onMode(isSignup ? 'signin' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></p>
    <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Your Firebase account password and vault passphrase are different. Firebase cannot reset a lost vault passphrase.</p>
  </div></AccessFrame>
}

function VaultSetup({ onSetup, error }: { onSetup: (passphrase: string) => Promise<void>; error: string | null }) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (passphrase.length < 12) { setFormError('Use at least 12 characters for your vault passphrase.'); return }
    if (passphrase !== confirm) { setFormError('The passphrases do not match.'); return }
    if (!acknowledged) { setFormError('Please acknowledge that a lost passphrase cannot be recovered.'); return }
    setBusy(true); setFormError('')
    try { await onSetup(passphrase) } catch (reason) { setFormError(safeErrorMessage(reason)) } finally { setBusy(false); setPassphrase(''); setConfirm('') }
  }
  return <AccessFrame><div className="mx-auto flex min-h-[85dvh] max-w-lg items-center"><section className="w-full rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-9"><Brand /><div className="mt-7 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-6" /></div><p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-primary">One-time setup</p><h1 className="mt-2 text-3xl font-medium tracking-tight">Create your vault key</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Choose a passphrase that is separate from your Firebase account password. It derives the encryption key on this device; NoteVault never stores or sends the passphrase.</p>
    <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[.06] p-4 text-sm leading-6"><strong className="font-medium text-primary">Keep it somewhere safe.</strong><span className="text-muted-foreground"> If you lose this passphrase, your encrypted records cannot be recovered. There is no recovery key configured.</span></div>
    <form onSubmit={submit} className="mt-6 space-y-4"><PasswordField id="vault-passphrase" label="Vault passphrase" value={passphrase} onChange={setPassphrase} show={show} toggle={() => setShow(value => !value)} autoComplete="new-password" /><PasswordField id="vault-confirm" label="Confirm passphrase" value={confirm} onChange={setConfirm} show={show} toggle={() => setShow(value => !value)} autoComplete="new-password" /><label className="flex items-start gap-3 text-sm leading-5 text-muted-foreground"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-primary" />I understand that Firebase cannot recover encrypted data if I lose my vault passphrase.</label>
    {(formError || error) && <p role="alert" className="text-sm text-destructive">{formError || error}</p>}<Button className="w-full" disabled={busy}>{busy ? 'Securing your vault…' : 'Create and unlock vault'} <ArrowRight className="size-4" /></Button></form>
    </section></div></AccessFrame>
}

function VaultUnlock({ name, onUnlock, error }: { name: string; onUnlock: (passphrase: string) => Promise<void>; error: string | null }) {
  const { logout } = useAuth()
  const [passphrase, setPassphrase] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFormError('')
    try { await onUnlock(passphrase) } catch (reason) { setFormError(safeErrorMessage(reason)) } finally { setBusy(false); setPassphrase('') }
  }
  return <AccessFrame><div className="mx-auto flex min-h-[85dvh] max-w-md items-center"><section className="w-full rounded-2xl border border-border bg-card p-7 text-center shadow-lg sm:p-9"><Brand /><div className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-6" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-primary">Vault locked</p><h1 className="mt-2 text-3xl font-medium tracking-tight">Welcome back, {name.split('@')[0]}.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your records are encrypted. Enter your vault passphrase to unlock them on this device.</p>
    <form onSubmit={submit} className="mt-6 space-y-4 text-left"><PasswordField id="unlock-passphrase" label="Vault passphrase" value={passphrase} onChange={setPassphrase} show={show} toggle={() => setShow(value => !value)} autoComplete="current-password" />{(formError || error) && <p role="alert" className="text-sm text-destructive">{formError || error}</p>}<Button className="w-full" disabled={busy || !passphrase}>{busy ? 'Unlocking privately…' : 'Unlock vault'} <ArrowRight className="size-4" /></Button></form>
    <p className="mt-5 text-xs leading-5 text-muted-foreground">The passphrase is used only in memory on this device. A lost passphrase cannot be reset.</p><button className="mt-5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => void logout()}>Sign out</button>
    </section></div></AccessFrame>
}

function PasswordField({ id, label, value, onChange, show, toggle, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; show: boolean; toggle: () => void; autoComplete: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} className="pr-12" required /><button type="button" onClick={toggle} aria-label={show ? 'Hide passphrase' : 'Show passphrase'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
}
