import { useState, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateRecordDraft, safeErrorMessage } from '@/utils/validation'
import type { RecordKind, VaultRecord, VaultRecordDraft } from '@/types/vault'

export function RecordEditor({ kind, record, onClose, onSave }: {
  kind: RecordKind
  record?: VaultRecord
  onClose: () => void
  onSave: (draft: VaultRecordDraft, id?: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<VaultRecordDraft>(() => record
    ? { ...record, password: '' }
    : { kind, title: '', body: '', notes: '', tags: [], pinned: false, isPurchased: false, category: '', url: '', username: '', password: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 'medium' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof VaultRecordDraft>(key: K, value: VaultRecordDraft[K]) => setDraft(current => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = validateRecordDraft(kind, draft)
    if (message) { setError(message); return }
    setBusy(true); setError('')
    try {
      const nextDraft = kind === 'credential' && !draft.password && record?.password
        ? { ...draft, password: record.password }
        : draft
      await onSave(nextDraft, record?.id)
      onClose()
    } catch (reason) { setError(safeErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  const title = kind === 'note' ? 'Note' : kind === 'purchase' ? 'Purchase' : kind === 'credential' ? 'Credential' : 'Goal'
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="record-editor-title" className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-lg sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6"><div><p className="text-xs font-medium uppercase tracking-[.15em] text-primary">Private {title}</p><h2 id="record-editor-title" className="mt-1 text-lg font-semibold">{record ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}</h2></div><button type="button" aria-label="Close editor" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onClose}><X className="size-4" /></button></header>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <Field label={kind === 'credential' ? 'Service or account name' : kind === 'purchase' ? 'What do you want to buy?' : kind === 'goal' ? 'Wish or goal' : 'Title'}><Input autoFocus maxLength={160} value={draft.title} onChange={event => set('title', event.target.value)} placeholder={kind === 'credential' ? 'e.g. Email account' : 'Give it a clear name'} required /></Field>
        {kind === 'note' && <Field label="Your note"><textarea className="min-h-36 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40" maxLength={12000} value={draft.body ?? ''} onChange={event => set('body', event.target.value)} placeholder="Write something worth remembering…" /></Field>}
        {kind === 'purchase' && <div className="grid gap-4 sm:grid-cols-2"><Field label="Estimated price"><Input type="number" min="0" step="0.01" value={draft.estimatedPrice ?? ''} onChange={event => set('estimatedPrice', event.target.value === '' ? undefined : Number(event.target.value))} placeholder="0.00" /></Field><Field label="Category"><Input maxLength={80} value={draft.category ?? ''} onChange={event => set('category', event.target.value)} placeholder="Home, tech, books…" /></Field></div>}
        {kind === 'credential' && <><div className="grid gap-4 sm:grid-cols-2"><Field label="Username or email"><Input maxLength={254} autoComplete="off" value={draft.username ?? ''} onChange={event => set('username', event.target.value)} /></Field><Field label="Password"><Input type="password" autoComplete="new-password" value={draft.password ?? ''} onChange={event => set('password', event.target.value)} placeholder={record ? 'Leave blank to keep current' : 'Enter secret'} /></Field></div><Field label="Website"><Input type="url" maxLength={2000} value={draft.url ?? ''} onChange={event => set('url', event.target.value)} placeholder="https://example.com" /></Field></>}
        {kind === 'goal' && <><Field label="Details"><textarea className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40" maxLength={12000} value={draft.body ?? ''} onChange={event => set('body', event.target.value)} placeholder="What makes this meaningful to you?" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Target amount"><Input type="number" min="0" step="0.01" value={draft.targetAmount ?? 0} onChange={event => set('targetAmount', Number(event.target.value))} /></Field><Field label="Already saved"><Input type="number" min="0" step="0.01" value={draft.currentAmount ?? 0} onChange={event => set('currentAmount', Number(event.target.value))} /></Field><Field label="Target date"><Input type="date" value={draft.targetDate ?? ''} onChange={event => set('targetDate', event.target.value)} /></Field><Field label="Priority"><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40" value={draft.priority ?? 'medium'} onChange={event => { const value = event.target.value; if (value === 'low' || value === 'medium' || value === 'high') set('priority', value) }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field></div><Field label="Category"><Input maxLength={80} value={draft.category ?? ''} onChange={event => set('category', event.target.value)} placeholder="Travel, home, learning…" /></Field></>}
        {(kind === 'purchase' || kind === 'credential') && <Field label="Notes"><textarea className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40" maxLength={12000} value={draft.notes ?? ''} onChange={event => set('notes', event.target.value)} placeholder="Optional private details…" /></Field>}
        <Field label="Tags"><Input maxLength={500} value={(draft.tags ?? []).join(', ')} onChange={event => set('tags', event.target.value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 24))} placeholder="Separate tags with commas" /></Field>
        {kind === 'note' && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={draft.pinned} onChange={event => set('pinned', event.target.checked)} className="accent-primary" />Pin this note</label>}
        {kind === 'purchase' && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={draft.isPurchased ?? false} onChange={event => set('isPurchased', event.target.checked)} className="accent-primary" />I’ve already purchased this</label>}
        {kind === 'goal' && <p className="text-xs leading-5 text-muted-foreground">All amounts and dates stay encrypted with the goal. Progress is calculated only after your vault is unlocked.</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Encrypting and saving…' : record ? 'Save changes' : `Save ${title.toLowerCase()}`}</Button></div>
      </form>
    </section>
  </div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>
}
