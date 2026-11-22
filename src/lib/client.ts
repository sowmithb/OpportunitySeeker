import { useRef, useState } from 'react'
import { getAuthToken, useAsyncResource } from 'deepspace'
import { object } from './domain'

export async function callAction<T = Record<string, unknown>>(
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Please sign in to continue.')
  const response = await fetch(`/api/actions/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  })
  const result = (await response.json()) as { success?: boolean; error?: string; data?: T }
  if (!response.ok || !result.success)
    throw new Error(result.error || 'This step could not finish. Please try again.')
  return result.data as T
}

export function useTask() {
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (running.current) return undefined
    running.current = true
    setBusy(true)
    setError('')
    try {
      return await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      return undefined
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return { busy, error, run, clearError: () => setError('') }
}

export type Mailbox = { connected?: boolean; gmailSend?: boolean; email?: string }
export function useMailbox() {
  return useAsyncResource<Mailbox>(
    async (signal) => {
      const token = await getAuthToken()
      const response = await fetch('/api/integrations/status', {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok)
        throw new Error('Could not check Gmail. Refresh its connection status to try again.')
      const raw = await response.json()
      const data = object(object(raw).data ?? raw)
      return object(data.google) as Mailbox
    },
    [],
    { retry: 0 },
  )
}

/** Consent completion refreshes status only. It never replays an email send. */
export function openGoogleConsent(authUrl: string, onComplete: () => void): () => void {
  const url = new URL(authUrl)
  if (url.protocol !== 'https:') throw new Error('Invalid authorization URL.')
  const popup = window.open(url.toString(), 'opportunityseeker-google', 'width=540,height=680')
  if (!popup)
    throw new Error('Allow pop-ups for this app, then connect Gmail again. Your draft is saved.')
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    clearInterval(poll)
    clearTimeout(timeout)
    window.removeEventListener('message', onMessage)
    onComplete()
  }
  const onMessage = (event: MessageEvent) => {
    if (event.source === popup && object(event.data).type === 'deepspace-oauth-complete') {
      popup.close()
      finish()
    }
  }
  window.addEventListener('message', onMessage)
  const poll = window.setInterval(() => {
    if (popup.closed) finish()
  }, 600)
  const timeout = window.setTimeout(finish, 8 * 60 * 1000)
  return () => {
    finished = true
    clearInterval(poll)
    clearTimeout(timeout)
    window.removeEventListener('message', onMessage)
  }
}
