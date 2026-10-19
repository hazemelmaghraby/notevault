import type { RecordKind, VaultRecordDraft } from '@/types/vault'

const MAX_TITLE = 160
const MAX_TEXT = 12_000
const MAX_TAGS = 24

export function validateRecordDraft(kind: RecordKind, draft: VaultRecordDraft): string | null {
  if (!draft.title.trim() || draft.title.trim().length > MAX_TITLE) return `Add a title (up to ${MAX_TITLE} characters).`
  for (const field of [draft.body, draft.notes, draft.username, draft.password, draft.url, draft.category]) {
    if (field && field.length > MAX_TEXT) return 'One of the fields is too long. Keep text under 12,000 characters.'
  }
  if (draft.tags.length > MAX_TAGS || draft.tags.some(tag => tag.length > 40)) return 'Use up to 24 tags, each no longer than 40 characters.'
  if (draft.url?.trim()) {
    try {
      const parsed = new URL(draft.url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'Website links must use http:// or https://.'
    } catch { return 'Enter a complete website address, including https://.' }
  }
  if (kind === 'purchase' && draft.estimatedPrice !== undefined && draft.estimatedPrice < 0) return 'Price cannot be negative.'
  if (kind === 'goal' && (draft.targetAmount ?? 0) < 0) return 'Target amount cannot be negative.'
  if (kind === 'goal' && (draft.currentAmount ?? 0) < 0) return 'Saved amount cannot be negative.'
  if (kind === 'goal' && (draft.currentAmount ?? 0) > (draft.targetAmount ?? 0)) return 'Saved amount cannot exceed the target.'
  return null
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
