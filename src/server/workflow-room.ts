/** Durable, per-user quotas and send claims. No public route reaches this DO. */
export const DAILY_LIMITS = { search: 12, people: 24, draft: 36, send: 12 } as const
type Operation = keyof typeof DAILY_LIMITS
export type SendClaim = {
  attemptId: string
  state: 'sending' | 'accepted' | 'unknown' | 'retryable'
  startedAt: number
  messageId?: string
}

export class AppWorkflowRoom {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST')
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    const path = new URL(request.url).pathname
    const body = (await request.json()) as Record<string, unknown>
    const today = new Date().toISOString().slice(0, 10)
    const result = await this.state.storage.transaction(async (tx) => {
      if (path === '/quota') {
        const op = body.operation as Operation
        if (!Object.prototype.hasOwnProperty.call(DAILY_LIMITS, op))
          return { allowed: false, error: 'Unknown operation' }
        const key = `quota:${today}:${op}`
        const used = (await tx.get<number>(key)) ?? 0
        if (used >= DAILY_LIMITS[op])
          return {
            allowed: false,
            error: `Your daily ${op} limit has been reached. Try again tomorrow.`,
          }
        await tx.put(key, used + 1)
        return { allowed: true }
      }
      const draftId = typeof body.draftId === 'string' ? body.draftId : ''
      if (!draftId || draftId.length > 160) return { allowed: false, error: 'Invalid draft' }
      const key = `send:${draftId}`
      const claim = await tx.get<SendClaim>(key)
      if (path === '/claim') {
        if (claim && claim.state !== 'retryable') return { allowed: false, claim }
        const usedKey = `quota:${today}:send`
        const used = (await tx.get<number>(usedKey)) ?? 0
        if (used >= DAILY_LIMITS.send)
          return { allowed: false, error: 'Your daily email limit has been reached.' }
        const next: SendClaim = {
          attemptId: String(body.attemptId),
          state: 'sending',
          startedAt: Date.now(),
        }
        await tx.put(key, next)
        await tx.put(usedKey, used + 1)
        return { allowed: true, claim: next }
      }
      if (path === '/finish' && claim?.attemptId === body.attemptId) {
        const nextState = body.state
        if (nextState !== 'accepted' && nextState !== 'unknown' && nextState !== 'retryable')
          return { allowed: false }
        await tx.put(key, {
          ...claim,
          state: nextState,
          messageId: typeof body.messageId === 'string' ? body.messageId : '',
        })
        return { allowed: true }
      }
      return { allowed: false, error: 'Unknown operation' }
    })
    return Response.json(result)
  }
}
