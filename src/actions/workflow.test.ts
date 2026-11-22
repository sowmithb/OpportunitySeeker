import { describe, expect, it, vi } from 'vitest'
import { actions } from './index'
import { AppWorkflowRoom } from '../server/workflow-room'
import {
  emailSchema,
  normalizeSources,
  peopleFromWeb,
  rankFromModel,
  type DraftData,
  type LeadData,
} from '../lib/domain'
import type { ActionContext, ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'

const source = {
  id: 's1',
  title: 'Frontend engineer',
  url: 'https://example.org/careers/frontend',
  text: 'A React role.',
  publishedDate: null,
}
const lead: LeadData = {
  ownerUserId: 'alice',
  searchId: 'search1',
  opportunity: {
    id: 's1',
    title: 'Frontend engineer',
    company: 'Example',
    location: '',
    kind: 'job',
    fit: 'possible',
    reason: 'Uses React',
    uncertainty: 'Check availability',
    source,
  },
  person: null,
  people: [],
  peopleWarning: '',
  status: 'drafted',
  notes: '',
}
const draft: DraftData = {
  ownerUserId: 'alice',
  leadId: 'lead1',
  channel: 'email',
  recipient: 'recipient@example.org',
  subject: 'A short introduction',
  body: 'Hello, I am interested in learning more about the role.',
  revision: '218185cb-e684-49a1-b3f3-cd7f28b67bcb',
}

// An in-memory storage adapter supplies the DO transaction contract for unit
// tests. The production claim handler and action code remain real.
function roomStorage() {
  const data = new Map<string, unknown>()
  let tail = Promise.resolve()
  const storage = {
    get: async (key: string) => data.get(key),
    put: async (key: string, val: unknown) => {
      data.set(key, val)
    },
    transaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const next = tail.then(() => fn(storage))
      tail = next.then(
        () => {},
        () => {},
      )
      return next
    },
  }
  return storage
}

function harness(provider: () => Promise<ActionResult<unknown>>) {
  const db = new Map<string, Record<string, unknown>>([
    ['leads/lead1', structuredClone(lead)],
    ['drafts/draft1', structuredClone(draft)],
  ])
  const rooms = new Map<string, AppWorkflowRoom>()
  const integration = vi.fn(provider)
  const tools = {
    get: async (collection: string, recordId: string) => {
      const data = db.get(`${collection}/${recordId}`)
      return data
        ? { success: true, data: { record: { recordId, data } } }
        : { success: false, error: 'Not found' }
    },
    create: async (
      collection: string,
      data: Record<string, unknown>,
      recordId = crypto.randomUUID(),
    ) => {
      db.set(`${collection}/${recordId}`, { ...db.get(`${collection}/${recordId}`), ...data })
      return { success: true, data: { recordId } }
    },
    update: async (collection: string, recordId: string, patch: Record<string, unknown>) => {
      const key = `${collection}/${recordId}`
      if (!db.has(key)) return { success: false, error: 'Not found' }
      db.set(key, { ...db.get(key), ...patch })
      return { success: true, data: { recordId } }
    },
    integration,
  }
  const env = {
    WORKFLOW_ROOMS: {
      idFromName: (name: string) => name,
      get: (name: string) => {
        if (!rooms.has(name))
          rooms.set(
            name,
            new AppWorkflowRoom({ storage: roomStorage() } as unknown as DurableObjectState),
          )
        return rooms.get(name)
      },
    },
  }
  const ctx = (params: Record<string, unknown>, userId = 'alice') =>
    ({
      userId,
      params,
      env,
      tools,
      callerJwt: 'test-token-not-a-real-credential',
    }) as unknown as ActionContext<Env>
  const send = (params = {}, userId = 'alice') =>
    actions.sendDraft(
      ctx({ draftId: 'draft1', revision: draft.revision, reviewed: true, ...params }, userId),
    )
  return { send, ctx, integration, db }
}

describe('ownership and reviewed email sending', () => {
  it('rejects another user before any provider call or record update', async () => {
    const h = harness(async () => ({ success: true, data: { id: 'gmail1' } }))
    expect((await h.send({}, 'bob')).success).toBe(false)
    expect(
      (await actions.createDraft(h.ctx({ leadId: 'lead1', channel: 'email' }, 'bob'))).success,
    ).toBe(false)
    expect(
      (await actions.updateLead(h.ctx({ leadId: 'lead1', notes: 'stolen' }, 'bob'))).success,
    ).toBe(false)
    expect(h.db.get('leads/lead1')?.notes).toBe('')
    expect(h.integration).not.toHaveBeenCalled()
  })
  it('requires the exact reviewed revision and a deliberate confirmation', async () => {
    const h = harness(async () => ({ success: true, data: {} }))
    expect((await h.send({ revision: crypto.randomUUID() })).success).toBe(false)
    expect((await h.send({ reviewed: false })).success).toBe(false)
    expect(h.integration).not.toHaveBeenCalled()
  })
  it('allows one provider call for simultaneous sends and no resend after acceptance', async () => {
    const h = harness(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15))
      return { success: true, data: { id: 'gmail1' } }
    })
    const results = await Promise.all([h.send(), h.send()])
    expect(results.filter((r) => r.success)).toHaveLength(1)
    const repeated = await h.send()
    expect(repeated.success && repeated.data).toMatchObject({
      outcome: 'accepted',
      alreadySent: true,
    })
    expect(h.integration).toHaveBeenCalledTimes(1)
  })
  it('does not replay a send when consent is required; an explicit later call can send', async () => {
    let authorized = false
    const h = harness(async () => ({
      success: true,
      data: authorized
        ? { id: 'gmail2' }
        : { requiresOAuth: true, authUrl: 'https://accounts.google.com/o/oauth2/auth' },
    }))
    const first = await h.send()
    expect(first.success && first.data).toMatchObject({ outcome: 'oauth' })
    expect(h.integration).toHaveBeenCalledTimes(1)
    authorized = true
    expect(h.integration).toHaveBeenCalledTimes(1)
    const second = await h.send()
    expect(second.success && second.data).toMatchObject({ outcome: 'accepted' })
    expect(h.integration).toHaveBeenCalledTimes(2)
  })
  it('blocks retries after an uncertain transport failure', async () => {
    const h = harness(async () => {
      throw new Error('network lost after request')
    })
    const first = await h.send()
    expect(first.success && first.data).toMatchObject({ outcome: 'unknown' })
    expect((await h.send()).success).toBe(false)
    expect(h.integration).toHaveBeenCalledTimes(1)
  })
  it('rejects header injection and LinkedIn API sending', async () => {
    const h = harness(async () => ({ success: true, data: {} }))
    h.db.set('drafts/draft1', {
      ...draft,
      recipient: 'alice@example.org\r\nBcc: other@example.org',
    })
    expect((await h.send()).success).toBe(false)
    h.db.set('drafts/draft1', { ...draft, channel: 'linkedin' })
    expect((await h.send()).success).toBe(false)
    expect(h.integration).not.toHaveBeenCalled()
  })
})

describe('source provenance and public profile fallback', () => {
  it('drops unsafe URLs and duplicate search results', () => {
    const sources = normalizeSources({
      results: [
        { url: 'javascript:alert(1)' },
        { url: 'https://127.0.0.1/private' },
        { ...source, url: source.url + '?utm_source=test' },
        source,
      ],
    })
    expect(sources).toHaveLength(1)
    expect(sources[0].url).toBe(source.url)
  })
  it('rejects fabricated source IDs rather than accepting AI-generated links', () => {
    expect(() =>
      rankFromModel(
        {
          recommendations: [
            {
              sourceId: 'invented',
              title: 'Job',
              company: 'Example',
              kind: 'job',
              fit: 'strong',
              reason: 'Good',
              location: '',
              uncertainty: '',
            },
          ],
        },
        [source],
      ),
    ).toThrow()
  })
  it('uses indexed profile evidence without asserting an employer or email', () => {
    const people = peopleFromWeb({
      results: [
        {
          title: 'A Person',
          url: 'https://linkedin.com/in/a-person',
          text: '# A Person\n\nTechnical Recruiting\n\nPublic excerpt',
        },
        { title: 'Not a profile', url: 'https://linkedin.com/company/example' },
      ],
    })
    expect(people).toHaveLength(1)
    expect(people[0]).toMatchObject({
      name: 'A Person',
      headline: 'Technical Recruiting',
      company: '',
      profileUrl: 'https://www.linkedin.com/in/a-person',
    })
    expect(people[0]).not.toHaveProperty('email')
  })
  it('accepts only one recipient address', () => {
    expect(emailSchema.safeParse('first@example.org,second@example.org').success).toBe(false)
    expect(emailSchema.safeParse('first@example.org').success).toBe(true)
  })
})
