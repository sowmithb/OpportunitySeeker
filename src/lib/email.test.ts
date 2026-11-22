import { expect, it } from 'vitest'
import { emailSubjectHeader } from './email'

it('preserves ASCII subjects and rejects injected header lines', () => {
  expect(emailSubjectHeader('A short introduction')).toBe('A short introduction')
  expect(() => emailSubjectHeader('Hello\r\nBcc: someone@example.org')).toThrow()
})

it('encodes Unicode as bounded RFC 2047 words without splitting code points', () => {
  const subject = 'OpportunitySeeker — Gmail integration test, café, 日本語, 👋'.repeat(3)
  const words = emailSubjectHeader(subject).split(' ')
  const decoded = words
    .map((word) => {
      expect(word.length).toBeLessThanOrEqual(75)
      const payload = word.slice('=?UTF-8?B?'.length, -2)
      return new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0)),
      )
    })
    .join('')
  expect(decoded).toBe(subject)
})
