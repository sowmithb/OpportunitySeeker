/** RFC 2047 encoded-words keep UTF-8 subjects intact through the Gmail proxy. */
export function emailSubjectHeader(subject: string): string {
  if (/[\r\n]/.test(subject)) throw new Error('Email subjects cannot contain newlines.')
  if (/^[\x20-\x7e]*$/.test(subject)) return subject
  const encoder = new TextEncoder()
  const words: string[] = []
  let bytes: number[] = []
  const flush = () => {
    if (bytes.length) words.push(`=?UTF-8?B?${btoa(String.fromCharCode(...bytes))}?=`)
    bytes = []
  }
  for (const character of subject) {
    const next = [...encoder.encode(character)]
    if (bytes.length + next.length > 42) flush()
    bytes.push(...next)
  }
  flush()
  return words.join(' ')
}
