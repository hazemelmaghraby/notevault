import { createFileRoute } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { VaultProvider } from '@/context/VaultContext'
import { NoteVaultApp } from '@/features/NoteVaultApp'
import { AccessScreens } from '@/features/AccessScreens'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'NoteVault — Private by design' },
      { name: 'description', content: 'A private space for the things you want to remember, protect, and keep close.' },
    ],
  }),
  component: Home,
})

function Home() {
  return <BlinkClientBoundary fallback={<main className="grid min-h-dvh place-items-center bg-background text-muted-foreground"><p className="animate-pulse text-sm">Preparing your private space…</p></main>}>
    <AuthProvider><VaultProvider><Application /></VaultProvider></AuthProvider>
  </BlinkClientBoundary>
}

function Application() {
  const { user, loading } = useAuth()
  if (loading) return <main className="grid min-h-dvh place-items-center bg-background text-muted-foreground"><p className="animate-pulse text-sm">Connecting your account…</p></main>
  return user ? <NoteVaultApp /> : <AccessScreens />
}
