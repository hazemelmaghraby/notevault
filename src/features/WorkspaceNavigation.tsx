import { FileText, KeyRound, LayoutDashboard, LockKeyhole, LogOut, ShieldCheck, ShoppingBag, Target, Vault, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from 'firebase/auth'

export type WorkspacePage = 'overview' | 'notes' | 'purchases' | 'credentials' | 'goals' | 'settings'
const items: { id: WorkspacePage; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'credentials', label: 'Credentials', icon: KeyRound },
  { id: 'goals', label: 'Wishlist & goals', icon: Target },
  { id: 'settings', label: 'Settings', icon: ShieldCheck },
]

export function WorkspaceNavigation({ page, setPage, user, onLock, onLogout, mobile = false }: {
  page: WorkspacePage; setPage: (page: WorkspacePage) => void; user: User; onLock: () => void; onLogout: () => void; mobile?: boolean
}) {
  if (mobile) return <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 lg:hidden">{items.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${page === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><Icon className="size-3.5" />{label}</button>)}</nav>
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex"><div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Vault className="size-5" /></span><div><p className="text-sm font-semibold tracking-tight text-sidebar-foreground">NoteVault</p><p className="text-[10px] tracking-[.1em] text-muted-foreground">PRIVATE BY DESIGN</p></div></div><nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">{items.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${page === id ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon className="size-4" />{label}{page === id && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</button>)}</nav><div className="shrink-0 border-t border-sidebar-border p-4"><div className="mb-3 flex items-center gap-2 rounded-xl bg-sidebar-accent/70 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span><div className="min-w-0"><p className="text-xs font-medium text-sidebar-foreground">Encrypted & unlocked</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p></div></div><div className="grid grid-cols-2 gap-2"><Button variant="ghost" size="sm" className="justify-start px-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" onClick={onLock}><LockKeyhole className="size-3.5" /> Lock</Button><Button variant="ghost" size="sm" className="justify-start px-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" onClick={onLogout}><LogOut className="size-3.5" /> Sign out</Button></div></div></aside>
}
