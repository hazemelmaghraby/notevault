import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useVault } from '@/context/VaultContext'
import { AccessScreens } from '@/features/AccessScreens'
import { DashboardPanel } from '@/features/DashboardPanel'
import { RecordCollection } from '@/features/RecordCollection'
import { SettingsPanel } from '@/features/SettingsPanel'
import { WorkspaceNavigation, type WorkspacePage } from '@/features/WorkspaceNavigation'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const pageTitles: Record<WorkspacePage, string> = {
  overview: 'Overview', notes: 'Notes', purchases: 'Purchases', credentials: 'Credentials', goals: 'Wishlist & goals', settings: 'Settings',
}

export function NoteVaultApp() {
  const { user, logout } = useAuth()
  const { records, lockVault, status } = useVault()
  const [page, setPage] = useState<WorkspacePage>('overview')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {
      toast.error('Offline app-shell caching could not be enabled in this browser.')
    })
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); toast.success('NoteVault is installed on this device.') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      toast('To install NoteVault, open your browser menu and choose “Install app” or “Add to Home Screen.”')
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') toast.success('NoteVault is being installed.')
    setInstallPrompt(null)
  }

  async function signOut() {
    lockVault()
    try { await logout() } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not sign out.') }
  }

  if (!user) return null
  if (status !== 'unlocked') return <AccessScreens />
  return <div className="min-h-dvh bg-background text-foreground">
    <WorkspaceNavigation page={page} setPage={setPage} user={user} onLock={lockVault} onLogout={() => void signOut()} />
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:ml-64 lg:px-8">
      <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary lg:hidden"><ShieldCheck className="size-4" /></span><div><p className="text-sm font-semibold">{pageTitles[page]}</p><p className="hidden text-[11px] text-muted-foreground sm:block">Private by design · Encrypted on this device</p></div></div>
      <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[.04] px-2.5 py-1.5 text-[10px] text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" /> Vault unlocked</span>{!installed && <Button variant="outline" size="sm" onClick={() => void installApp()}>{installPrompt ? 'Install app' : 'Install'}</Button>}<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Lock vault" onClick={lockVault}><ShieldCheck className="size-4" /></Button></div>
    </header>
    <WorkspaceNavigation page={page} setPage={setPage} user={user} onLock={lockVault} onLogout={() => void signOut()} mobile />
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-8 lg:py-9">
      {page === 'overview' && <DashboardPanel records={records} onNavigate={setPage} />}
      {page === 'notes' && <RecordCollection kind="note" />}
      {page === 'purchases' && <RecordCollection kind="purchase" />}
      {page === 'credentials' && <RecordCollection kind="credential" />}
      {page === 'goals' && <RecordCollection kind="goal" />}
      {page === 'settings' && <SettingsPanel />}
      <footer className="mt-12 flex flex-col gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>NoteVault · Private by design.</span><span>Search stays local while unlocked. The cloud only receives encrypted records.</span></footer>
    </main>
  </div>
}
