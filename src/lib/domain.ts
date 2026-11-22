import { z } from 'zod'

export const opportunityKinds = ['job', 'project', 'other'] as const
export const leadStatuses = ['saved', 'drafted', 'contacted', 'replied', 'closed'] as const
export type LeadStatus = (typeof leadStatuses)[number]
export type Channel = 'email' | 'linkedin'

export const criteriaSchema = z.object({
  role: z.string().trim().min(1).max(120),
  location: z.string().max(100).default(''),
  kind: z.enum(opportunityKinds).default('job'),
  keywords: z.array(z.string().max(60)).max(6).default([]),
  searchQuery: z.string().trim().min(3).max(350),
})
export type Criteria = z.infer<typeof criteriaSchema>

export const profileSchema = z.object({
  name: z.string().trim().max(100).default(''),
  headline: z.string().trim().max(160).default(''),
  location: z.string().trim().max(100).default(''),
  summary: z.string().trim().max(2500).default(''),
  skills: z.string().trim().max(600).default(''),
  portfolio: z.union([z.literal(''), z.string().url().max(500)]).default(''),
})
export type SeekerProfile = z.infer<typeof profileSchema> & { ownerUserId: string }

export type Source = {
  id: string
  title: string
  url: string
  text: string
  publishedDate: string | null
}
export type Opportunity = {
  id: string
  title: string
  company: string
  location: string
  kind: (typeof opportunityKinds)[number]
  fit: 'strong' | 'possible' | 'stretch' | 'unscored'
  reason: string
  uncertainty: string
  source: Source
}
export type Person = {
  id: string
  name: string
  headline: string
  company: string
  location: string
  profileUrl: string
  summary: string
}
export type SearchData = {
  ownerUserId: string
  request: string
  status: 'interpreting' | 'searching' | 'matching' | 'complete' | 'failed'
  criteria: Criteria | null
  opportunities: Opportunity[]
  warning: string
  searchedAt: number
}
export type LeadData = {
  ownerUserId: string
  searchId: string
  opportunity: Opportunity
  person: Person | null
  people: Person[]
  peopleWarning: string
  status: LeadStatus
  notes: string
}
export type DraftData = {
  ownerUserId: string
  leadId: string
  channel: Channel
  recipient: string
  subject: string
  body: string
  revision: string
}
export type AttemptData = {
  ownerUserId: string
  draftId: string
  leadId: string
  revision: string
  status: 'sending' | 'accepted' | 'failed' | 'unknown' | 'authorization_required'
  recipient: string
  providerMessageId: string
  error: string
}
export type Row<T> = {
  recordId: string
  data: T
  createdAt: string | number
  updatedAt: string | number
}

export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/** Only use provider-returned public HTTPS links. Never render a model-generated URL. */
export function publicUrl(value: unknown, linkedin = false): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.'))
      return null
    if (
      host === 'localhost' ||
      /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host) ||
      host.endsWith('.local')
    )
      return null
    if (
      linkedin &&
      (!(host === 'linkedin.com' || host.endsWith('.linkedin.com')) ||
        !url.pathname.startsWith('/in/'))
    )
      return null
    if (linkedin) {
      url.hostname = 'www.linkedin.com'
      url.search = ''
    }
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'trackingId')
        url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeSources(payload: unknown): Source[] {
  const data = object(payload)
  const results = Array.isArray(data.results) ? data.results : []
  const seen = new Set<string>()
  const sources: Source[] = []
  for (const item of results.slice(0, 15)) {
    const row = object(item)
    const url = publicUrl(row.url)
    if (!url || seen.has(url)) continue
    seen.add(url)
    const highlights = Array.isArray(row.highlights)
      ? row.highlights.filter((x) => typeof x === 'string').join('\n')
      : ''
    sources.push({
      id: `s${sources.length + 1}`,
      title: String(row.title ?? new URL(url).hostname).slice(0, 240),
      url,
      text: String(row.text ?? row.summary ?? highlights).slice(0, 7000),
      publishedDate:
        typeof row.publishedDate === 'string' && Number.isFinite(Date.parse(row.publishedDate))
          ? row.publishedDate
          : null,
    })
  }
  return sources.slice(0, 10)
}

export function normalizePeople(payload: unknown): Person[] {
  const data = object(payload)
  if (!Array.isArray(data.profiles)) return []
  const seen = new Set<string>()
  return data.profiles
    .flatMap((value): Person[] => {
      const row = object(value)
      const profileUrl = publicUrl(row.profileUrl, true)
      if (!profileUrl || seen.has(profileUrl)) return []
      seen.add(profileUrl)
      return [
        {
          id: String(row.id ?? profileUrl),
          name: String(row.name ?? 'LinkedIn member').slice(0, 120),
          headline: String(row.headline ?? '').slice(0, 250),
          company: String(row.company ?? '').slice(0, 150),
          location: String(row.location ?? '').slice(0, 120),
          profileUrl,
          summary: String(row.summary ?? '').slice(0, 1500),
        },
      ]
    })
    .slice(0, 8)
}

export function peopleFromWeb(payload: unknown): Person[] {
  const seen = new Set<string>()
  const rows = object(payload).results
  if (!Array.isArray(rows)) return []
  return rows
    .flatMap((item): Person[] => {
      const row = object(item)
      const profileUrl = publicUrl(row.url, true)
      if (!profileUrl || seen.has(profileUrl)) return []
      seen.add(profileUrl)
      const lines = String(row.text ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const name = String(row.title ?? 'LinkedIn member')
        .replace(/\s*\|\s*LinkedIn.*$/i, '')
        .split(/\s[-–]\s/)[0]
        .slice(0, 120)
      const headline = lines.find((line) => !line.startsWith('#') && line !== name) ?? ''
      return [
        {
          id: profileUrl,
          name,
          headline: headline.slice(0, 250),
          company: '',
          location: '',
          profileUrl,
          summary: String(row.text ?? '').slice(0, 1500),
        },
      ]
    })
    .slice(0, 8)
}

export function parseModelJson(value: unknown): unknown {
  const data = object(value)
  const blocks = Array.isArray(data.content) ? data.content : []
  const text = blocks
    .map((b) => object(b))
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  if (!text.trim()) throw new Error('The AI returned an empty response. Please try again.')
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, ''),
  )
}

const rankedSchema = z.object({
  recommendations: z
    .array(
      z.object({
        sourceId: z.string().max(12),
        title: z.string().min(1).max(180),
        company: z.string().max(120),
        location: z.string().max(120).default(''),
        kind: z.enum(opportunityKinds),
        fit: z.enum(['strong', 'possible', 'stretch']),
        reason: z.string().min(1).max(500),
        uncertainty: z.string().max(400).default(''),
      }),
    )
    .max(8),
})

export function rankFromModel(payload: unknown, sources: Source[]): Opportunity[] {
  const ranked = rankedSchema.parse(payload)
  const byId = new Map(sources.map((s) => [s.id, s]))
  const seen = new Set<string>()
  return dedupeOpportunities(
    ranked.recommendations.map((rec) => {
      const source = byId.get(rec.sourceId)
      if (!source || seen.has(rec.sourceId))
        throw new Error('The AI cited an invalid or duplicate source.')
      seen.add(rec.sourceId)
      const { sourceId, ...fields } = rec
      return { ...fields, id: sourceId, source }
    }),
  )
}

/** Collapse mirrored listings across job boards, keeping the highest-ranked source. */
export function dedupeOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const seen = new Set<string>()
  const normalized = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  return opportunities.filter((opportunity) => {
    const company = normalized(opportunity.company) || hostname(opportunity.source.url)
    const key = `${company}|${normalized(opportunity.title)}|${opportunity.kind}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function unscoredSources(sources: Source[], kind: Opportunity['kind']): Opportunity[] {
  return sources.map((source) => ({
    id: source.id,
    title: source.title,
    company: '',
    location: '',
    kind,
    fit: 'unscored',
    reason: 'Open the original source to assess this opportunity.',
    uncertainty: 'AI matching is unavailable. Details and availability need checking.',
    source,
  }))
}

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .refine((v) => !/[\r\n,;]/.test(v), 'Enter one email address.')
export const draftInputSchema = z.object({
  recipient: z.string().trim().max(254),
  subject: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !/[\r\n]/.test(v)),
  body: z.string().trim().min(1).max(8000),
})

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Source'
  }
}

export function dateLabel(date: string | number | null, calendarDate = false): string {
  if (!date) return 'Date not provided'
  const parsed = new Date(date)
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(calendarDate ? { timeZone: 'UTC' } : {}),
      })
    : 'Date not provided'
}
