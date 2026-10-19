import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, Check, CheckCircle2, Copy, ExternalLink, Eye, EyeOff, FileText, KeyRound, MoreHorizontal, Pin, Plus, Search, Shield, ShoppingBag, Star, Target, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVault } from '@/context/VaultContext'
import { RecordEditor } from '@/features/RecordEditor'
import type { RecordKind, VaultRecord } from '@/types/vault'

const labels: Record<RecordKind, string> = { note: 'Notes', purchase: 'Purchases', credential: 'Credentials', goal: 'Wishlist & goals' }
const kindIcons = { note: FileText, purchase: ShoppingBag, credential: KeyRound, goal: Target }
const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
type Filter = 'all' | 'to-buy' | 'purchased' | 'open' | 'complete'
type Sort = 'recent' | 'title' | 'amount'

export function RecordCollection({ kind }: { kind: RecordKind }) {
  const { records, saveRecord, deleteRecord } = useVault()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [editing, setEditing] = useState<VaultRecord | null | false>(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VaultRecord | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collection = useMemo(() => records.filter(record => record.kind === kind), [records, kind])
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    const matched = collection.filter(record => {
      const searchable = [record.title, record.body, record.notes, record.category, record.url, record.username, ...(record.tags ?? [])].filter(Boolean).join(' ').toLocaleLowerCase()
      const queryMatch = !term || searchable.includes(term)
      const filterMatch = filter === 'all' ||
        (filter === 'to-buy' && kind === 'purchase' && !record.isPurchased) ||
        (filter === 'purchased' && kind === 'purchase' && record.isPurchased) ||
        (filter === 'open' && kind === 'goal' && (record.currentAmount ?? 0) < (record.targetAmount ?? 0)) ||
        (filter === 'complete' && kind === 'goal' && (record.currentAmount ?? 0) >= (record.targetAmount ?? 0))
      return queryMatch && filterMatch
    })
    return [...matched].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'amount'
      ? (b.estimatedPrice ?? b.targetAmount ?? 0) - (a.estimatedPrice ?? a.targetAmount ?? 0)
      : b.updatedAt - a.updatedAt)
  }, [collection, query, filter, sort, kind])

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
  }, [])

  async function togglePurchased(record: VaultRecord) {
    setBusyId(record.id)
    try {
      const { id, createdAt, updatedAt, ...draft } = record
      await saveRecord({ ...draft, isPurchased: !record.isPurchased }, id)
      toast.success(record.isPurchased ? 'Added back to your list' : 'Marked as purchased')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update this item.') }
    finally { setBusyId(null) }
  }

  async function togglePinned(record: VaultRecord) {
    const { id, createdAt, updatedAt, ...draft } = record
    try {
      await saveRecord({ ...draft, pinned: !record.pinned }, id)
      toast.success(record.pinned ? 'Note unpinned' : 'Note pinned')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update this note.') }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteRecord(deleteTarget.id)
      toast.success('Private record deleted')
      setDeleteTarget(null)
      setExpanded(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete this record.') }
  }

  function toggleReveal(record: VaultRecord) {
    if (revealed === record.id) {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setRevealed(null)
      return
    }
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setRevealed(record.id)
    hideTimer.current = setTimeout(() => setRevealed(null), 20_000)
  }

  async function copyPassword(record: VaultRecord) {
    if (!record.password) { toast.error('This credential has no saved password.'); return }
    try {
      await navigator.clipboard.writeText(record.password)
      toast.success('Password copied. Clipboard will clear in 20 seconds where supported.')
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
      if (navigator.clipboard.readText) clipboardTimer.current = setTimeout(() => {
        void navigator.clipboard.readText().then(current => current === record.password ? navigator.clipboard.writeText('') : undefined).catch(() => undefined)
      }, 20_000)
    } catch { toast.error('Clipboard access was blocked. You can reveal the password and copy it manually.') }
  }

  const Icon = kindIcons[kind]
  return <section className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Your encrypted collection</p><h2 className="mt-2 text-3xl font-medium tracking-tight">{labels[kind]}</h2><p className="mt-2 text-sm text-muted-foreground">Search and sort run locally after your records are decrypted.</p></div><Button onClick={() => setEditing(null)}><Plus className="size-4" /> Add {kind === 'purchase' ? 'item' : kind === 'credential' ? 'credential' : kind === 'goal' ? 'goal' : 'note'}</Button></header>
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={`Search ${labels[kind].toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${labels[kind].toLowerCase()} on this device…`} className="pl-9" /></div>
      {(kind === 'purchase' || kind === 'goal') && <select aria-label="Filter records" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={event => setFilter(event.target.value as Filter)}>{kind === 'purchase' ? <><option value="all">All items</option><option value="to-buy">Still to buy</option><option value="purchased">Purchased</option></> : <><option value="all">All goals</option><option value="open">In progress</option><option value="complete">Complete</option></>}</select>}
      <select aria-label="Sort records" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="recent">Recently changed</option><option value="title">Title A–Z</option>{(kind === 'purchase' || kind === 'goal') && <option value="amount">Amount: high to low</option>}</select>
    </div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{visible.length} {visible.length === 1 ? 'record' : 'records'} {query ? 'matched' : 'in this collection'}</span><span className="hidden items-center gap-1 sm:flex"><ArrowDownUp className="size-3.5" /> Private search</span></div>
    {visible.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(record => <RecordCard key={record.id} record={record} expanded={expanded === record.id} revealed={revealed === record.id} busy={busyId === record.id} onExpand={() => setExpanded(expanded === record.id ? null : record.id)} onEdit={() => setEditing(record)} onDelete={() => setDeleteTarget(record)} onReveal={() => { setExpanded(record.id); toggleReveal(record) }} onCopy={() => void copyPassword(record)} onPurchase={() => void togglePurchased(record)} onPin={() => void togglePinned(record)} />)}</div>
      : <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span><h3 className="mt-4 text-lg font-medium">{query || filter !== 'all' ? 'Nothing matches that search' : `Your ${labels[kind].toLowerCase()} start here`}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{query || filter !== 'all' ? 'Try a different term or clear the filter. Search never leaves this unlocked device.' : emptyCopy(kind)}</p>{!query && filter === 'all' && <Button className="mt-5" variant="outline" onClick={() => setEditing(null)}><Plus className="size-4" /> Add your first {kind === 'purchase' ? 'item' : kind === 'credential' ? 'credential' : kind}</Button>}</div>}
    {editing !== false && <RecordEditor key={editing?.id ?? `new-${kind}`} kind={kind} record={editing || undefined} onClose={() => setEditing(false)} onSave={saveRecord} />}
    {deleteTarget && <ConfirmDelete title={deleteTarget.title} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />}
    <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground"><Shield className="mt-0.5 size-3.5 shrink-0 text-primary" /> Titles, search terms, categories, tags, prices and notes are encrypted. Only Firestore sync metadata such as timestamps remains outside the ciphertext.</p>
  </section>
}

function RecordCard({ record, expanded, revealed, busy, onExpand, onEdit, onDelete, onReveal, onCopy, onPurchase, onPin }: {
  record: VaultRecord; expanded: boolean; revealed: boolean; busy: boolean; onExpand: () => void; onEdit: () => void; onDelete: () => void; onReveal: () => void; onCopy: () => void; onPurchase: () => void; onPin: () => void
}) {
  const Icon = kindIcons[record.kind]
  const goalPercent = record.targetAmount ? Math.min(100, Math.round((record.currentAmount ?? 0) / record.targetAmount * 100)) : 0
  return <article className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-5">
    <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><button className="block max-w-full truncate text-left text-sm font-medium hover:text-primary" onClick={onExpand} aria-expanded={expanded}>{record.title}</button><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-muted-foreground">{record.kind === 'note' ? record.pinned ? 'Pinned note' : 'Note' : record.kind === 'purchase' ? record.isPurchased ? 'Purchased' : 'On your list' : record.kind === 'credential' ? 'Private login' : 'Wish / goal'}</p></div><button aria-label="Open actions" onClick={onEdit} className="rounded-lg p-1.5 text-muted-foreground opacity-60 transition-colors hover:bg-accent hover:text-foreground hover:opacity-100"><MoreHorizontal className="size-4" /></button></div>
    <button onClick={onExpand} className="mt-4 block w-full text-left" aria-expanded={expanded}>
      {record.kind === 'note' && <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.body || 'An empty note. Add a thought whenever you’re ready.'}</p>}
      {record.kind === 'purchase' && <div className="flex items-center justify-between gap-3"><p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{record.notes || record.category || 'No extra details yet.'}</p>{record.estimatedPrice !== undefined && <span className="shrink-0 text-sm font-medium tabular-nums">{currency.format(record.estimatedPrice)}</span>}</div>}
      {record.kind === 'credential' && <div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-muted-foreground">{record.username || 'Username not added'}</span><span className="shrink-0 font-mono text-xs tracking-widest text-muted-foreground">••••••••</span></div>}
      {record.kind === 'goal' && <div><div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{currency.format(record.currentAmount ?? 0)} saved</span><span className="font-medium text-primary">{goalPercent}%</span></div><progress className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-primary" max={Math.max(record.targetAmount ?? 0, 1)} value={Math.min(record.currentAmount ?? 0, record.targetAmount ?? 0)} aria-label={`${goalPercent}% saved toward ${record.title}`} /><p className="mt-2 text-xs text-muted-foreground">Target {currency.format(record.targetAmount ?? 0)}{record.targetDate ? ` · ${new Date(`${record.targetDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}</p></div>}
    </button>
    {expanded && <div className="mt-4 space-y-3 border-t border-border pt-3 text-sm animate-fade-in">
      {record.kind === 'credential' && <><SecretLine label="Password" revealed={revealed} password={record.password} onReveal={onReveal} onCopy={onCopy} /><DetailLine label="Website" value={record.url} link />{record.notes && <DetailLine label="Private notes" value={record.notes} />}</>}
      {record.kind === 'purchase' && <><DetailLine label="Category" value={record.category} /><DetailLine label="Website" value={record.url} link /><DetailLine label="Notes" value={record.notes} /></>}
      {record.kind === 'goal' && <><DetailLine label="Details" value={record.body} /><DetailLine label="Category" value={record.category} /><DetailLine label="Priority" value={record.priority} /></>}
      {record.kind === 'note' && <DetailLine label="Note" value={record.body} />}
      {record.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{record.tags.map(tag => <span key={tag} className="rounded-md bg-secondary px-2 py-1 text-[10px] text-secondary-foreground">{tag}</span>)}</div>}
      <p className="text-[10px] text-muted-foreground">Updated {new Date(record.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
    </div>}
    <footer className="mt-4 flex items-center gap-2 border-t border-border pt-3">
      {record.kind === 'note' && <button onClick={onPin} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-primary"><Pin className="size-3.5" /> {record.pinned ? 'Unpin' : 'Pin note'}</button>}
      {record.kind === 'purchase' && <button disabled={busy} onClick={onPurchase} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-primary disabled:opacity-50">{record.isPurchased ? <X className="size-3.5" /> : <Check className="size-3.5" />}{record.isPurchased ? 'Undo purchased' : 'Mark purchased'}</button>}
      {record.kind === 'credential' && <button onClick={onReveal} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-primary">{revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{revealed ? 'Hide secret' : 'Reveal password'}</button>}
      {record.kind === 'credential' && <button onClick={onCopy} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-primary"><Copy className="size-3.5" /> Copy</button>}
      {record.kind === 'goal' && (record.currentAmount ?? 0) >= (record.targetAmount ?? 0) && <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-primary"><CheckCircle2 className="size-3.5" /> Goal reached</span>}
      <button aria-label={`Edit ${record.title}`} onClick={onEdit} className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><MoreHorizontal className="size-4" /></button><button aria-label={`Delete ${record.title}`} onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
    </footer>
  </article>
}

function SecretLine({ label, revealed, password, onReveal, onCopy }: { label: string; revealed: boolean; password?: string; onReveal: () => void; onCopy: () => void }) {
  return <div className="flex items-center gap-2"><span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>{revealed ? <span className="min-w-0 flex-1 break-all rounded-md bg-background px-2 py-1 font-mono text-xs">{password || 'No password saved'}</span> : <span className="min-w-0 flex-1 rounded-md bg-background px-2 py-1 font-mono text-xs tracking-[.2em]">••••••••</span>}<button aria-label={revealed ? 'Hide password' : 'Reveal password'} onClick={onReveal} className="rounded-md p-1.5 text-muted-foreground hover:text-primary">{revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button><button aria-label="Copy password" onClick={onCopy} className="rounded-md p-1.5 text-muted-foreground hover:text-primary"><Copy className="size-3.5" /></button></div>
}

function DetailLine({ label, value, link = false }: { label: string; value?: string; link?: boolean }) {
  if (!value) return null
  return <div className="flex gap-3"><span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>{link ? <a href={value} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 break-all text-xs text-primary hover:underline"><span className="truncate">{value}</span><ExternalLink className="size-3 shrink-0" /></a> : <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-5">{value}</span>}</div>
}

function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"><div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="size-5" /></div><h2 id="delete-title" className="mt-4 text-lg font-semibold">Delete this private record?</h2><p className="mt-2 break-words text-sm leading-6 text-muted-foreground"><strong className="font-medium text-foreground">{title}</strong> will be permanently removed from your encrypted vault.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Keep it</Button><Button variant="destructive" onClick={onConfirm}>Delete permanently</Button></div></section></div>
}

function emptyCopy(kind: RecordKind) {
  if (kind === 'note') return 'Save a thought, detail, or idea in your encrypted space.'
  if (kind === 'purchase') return 'Keep an eye on something you want before you buy it.'
  if (kind === 'credential') return 'Keep a login somewhere private and only reveal it when you need it.'
  return 'Give a meaningful goal a clear place to grow.'
}
