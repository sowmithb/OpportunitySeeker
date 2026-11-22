import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowUpRight, Check, Copy, Mail, Send, Sparkles } from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { Loading, Notice } from './Shared'
import { callAction, openGoogleConsent, useMailbox, useTask } from '@/lib/client'
import {
  emailSchema,
  type AttemptData,
  type Channel,
  type DraftData,
  type LeadData,
  type Row,
} from '@/lib/domain'

type SendResult = {
  outcome: 'accepted' | 'failed' | 'unknown' | 'oauth'
  authUrl?: string
  error?: string
  alreadySent?: boolean
}

export function DraftWorkspace({ leadId, lead }: { leadId: string; lead: LeadData }) {
  const drafts = useQuery<DraftData>('drafts', {
    where: { leadId },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 60,
  })
  const attempts = useQuery<AttemptData>('outreach_attempts', {
    where: { leadId },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const [channel, setChannel] = useState<Channel>('email')
  const [draftId, setDraftId] = useState('')
  const [instruction, setInstruction] = useState('')
  const generate = useTask()
  const matching = drafts.records.filter((d) => d.data.channel === channel)
  const selected = matching.find((d) => d.recordId === draftId) ?? matching[0]
  async function generateDraft() {
    await generate.run(async () => {
      const data = await callAction<{ draftId: string }>('generateDraft', {
        leadId,
        channel,
        instruction,
      })
      setDraftId(data.draftId)
    })
  }
  return (
    <section className="detail-section" aria-labelledby="draft-heading">
      <p className="eyebrow">03 / MAKE THE INTRODUCTION</p>
      <h2 id="draft-heading">A thoughtful first message.</h2>
      <p className="section-description">
        Grounded in the opportunity, your profile, and the person you choose. Always yours to edit.
      </p>
      {lead.person ? (
        <div className="chosen-person">
          <span>
            Selected contact: <strong>{lead.person.name}</strong>
            <small>{lead.person.headline}</small>
          </span>
          <Check size={15} className="text-primary" />
        </div>
      ) : (
        <p className="form-helper">
          Choose a contact for a more personal draft, or write a general introduction.{' '}
          <Link to="/profile" className="text-link">
            Add your background
          </Link>{' '}
          first.
        </p>
      )}
      <div className="channel-tabs" aria-label="Message channel">
        {(['email', 'linkedin'] as const).map((c) => (
          <button
            key={c}
            className={channel === c ? 'active' : ''}
            onClick={() => {
              setChannel(c)
              setDraftId('')
            }}
          >
            {c === 'email' ? <Mail size={14} /> : <ArrowUpRight size={14} />}
            {c === 'email' ? 'Email' : 'LinkedIn'}
          </button>
        ))}
      </div>
      <label className="form-label" htmlFor={`draft-instruction-${channel}`}>
        Anything to emphasize? <span className="small-muted">Optional</span>
      </label>
      <Input
        id={`draft-instruction-${channel}`}
        placeholder="Keep it short, mention my React portfolio…"
        maxLength={500}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={generateDraft}
        loading={generate.busy}
      >
        <Sparkles size={14} />
        {selected ? 'Generate another draft' : 'Draft my introduction'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 ml-2"
        disabled={generate.busy}
        onClick={() =>
          generate.run(async () => {
            const data = await callAction<{ draftId: string }>('createDraft', { leadId, channel })
            setDraftId(data.draftId)
          })
        }
      >
        Write my own
      </Button>
      {generate.error && <Notice tone="error">{generate.error}</Notice>}
      {drafts.error && <Notice tone="error">{drafts.error}</Notice>}
      {drafts.status === 'loading' && <Loading text="Loading drafts…" />}
      {selected ? (
        <DraftEditor
          key={selected.recordId}
          row={selected as Row<DraftData>}
          lead={lead}
          attempts={attempts.records
            .filter((a) => a.data.draftId === selected.recordId)
            .map((a) => a.data)}
        />
      ) : (
        !generate.busy && (
          <p className="footnote">
            Your draft will appear here. No message is sent when you generate one.
          </p>
        )
      )}
      {matching.length > 1 && (
        <div className="recent-searches">
          <span>DRAFT HISTORY</span>
          {matching.slice(0, 4).map((d, i) => (
            <button
              key={d.recordId}
              onClick={() => setDraftId(d.recordId)}
              className={d.recordId === selected?.recordId ? 'selected' : ''}
            >
              {i === 0 ? 'Latest' : `Earlier ${i}`}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function DraftEditor({
  row,
  lead,
  attempts,
}: {
  row: Row<DraftData>
  lead: LeadData
  attempts: AttemptData[]
}) {
  const [recipient, setRecipient] = useState(row.data.recipient)
  const [subject, setSubject] = useState(row.data.subject)
  const [body, setBody] = useState(row.data.body)
  const [revision, setRevision] = useState(row.data.revision)
  const [dirty, setDirty] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [localOutcome, setLocalOutcome] = useState('')
  const task = useTask()
  const mailbox = useMailbox()
  const consentCleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => consentCleanup.current?.(), [])
  const latest = attempts[0]
  const sent = localOutcome === 'accepted' || attempts.some((a) => a.status === 'accepted')
  const uncertain =
    localOutcome === 'unknown' ||
    (!sent && (latest?.status === 'unknown' || latest?.status === 'sending'))
  const email = row.data.channel === 'email'
  const canReview =
    !dirty &&
    !!body.trim() &&
    !!subject.trim() &&
    emailSchema.safeParse(recipient).success &&
    !sent &&
    !uncertain &&
    !task.busy
  const change = (setter: (s: string) => void, val: string) => {
    setter(val)
    setDirty(true)
    setMessage('')
  }
  async function save() {
    const data = await callAction<{ revision: string }>('saveDraft', {
      draftId: row.recordId,
      recipient,
      subject,
      body,
    })
    setRevision(data.revision)
    setDirty(false)
    setMessage('Draft saved.')
  }
  async function send() {
    await task.run(async () => {
      const result = await callAction<SendResult>('sendDraft', {
        draftId: row.recordId,
        revision,
        reviewed: true,
      })
      setReviewOpen(false)
      if (result.outcome === 'oauth' && result.authUrl) {
        setAuthUrl(result.authUrl)
        return
      }
      setLocalOutcome(result.outcome)
      if (result.outcome === 'accepted')
        setMessage(
          result.alreadySent
            ? 'This draft was already accepted by Gmail. No duplicate was sent.'
            : 'Gmail accepted your email. Check Sent mail for the conversation.',
        )
      if (result.outcome === 'failed')
        throw new Error(result.error || 'Gmail rejected the request. Your draft is saved.')
    })
  }
  function connect() {
    try {
      consentCleanup.current?.()
      consentCleanup.current = openGoogleConsent(authUrl, () => {
        mailbox.reload()
        setAuthUrl('')
        setMessage(
          'Connection flow finished. Check the Gmail status and review your email again before sending.',
        )
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not open Google consent.')
    }
  }
  return (
    <div className="draft-editor">
      {email && (
        <>
          <label className="form-label" htmlFor="draft-to">
            To
          </label>
          <Input
            id="draft-to"
            type="email"
            autoComplete="off"
            placeholder="Enter the recipient’s email address"
            value={recipient}
            maxLength={254}
            onChange={(e) => change(setRecipient, e.target.value)}
          />
          <p className="form-helper">
            Use an address you know or found in a public source. Addresses are never guessed.
          </p>
          <label className="form-label" htmlFor="draft-subject">
            Subject
          </label>
          <Input
            id="draft-subject"
            value={subject}
            maxLength={200}
            onChange={(e) => change(setSubject, e.target.value)}
          />
        </>
      )}
      <label className="form-label" htmlFor="draft-body">
        {email ? 'Your message' : 'LinkedIn message'}
      </label>
      <Textarea
        id="draft-body"
        className="draft-body"
        rows={12}
        maxLength={8000}
        value={body}
        onChange={(e) => change(setBody, e.target.value)}
      />
      <div className="draft-actions">
        <span className="tiny-muted">
          {dirty ? 'Unsaved changes' : 'Saved in your workspace'} ·{' '}
          {body.trim().split(/\s+/).filter(Boolean).length} words
        </span>
        <div>
          <Button
            size="sm"
            variant="outline"
            loading={task.busy}
            disabled={!dirty}
            onClick={() => task.run(save)}
          >
            Save draft
          </Button>
          {email ? (
            <Button
              size="sm"
              disabled={!canReview}
              onClick={() => {
                mailbox.reload()
                setReviewOpen(true)
              }}
            >
              <Send size={13} />
              Review & send
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={task.busy || !body.trim()}
              onClick={() =>
                task.run(async () => {
                  if (dirty) await save()
                  await navigator.clipboard.writeText(body)
                  setMessage('Message copied. Paste it into LinkedIn and review before sending.')
                })
              }
            >
              <Copy size={13} />
              Copy message
            </Button>
          )}
        </div>
      </div>
      {email && (
        <p className="form-helper">
          {mailbox.data?.gmailSend
            ? `Sending through ${mailbox.data.email || 'your connected Gmail account'}.`
            : 'Gmail connects when you first send a reviewed email. Google consent and user credits are required.'}
          {dirty && ' Save your edits before reviewing.'}
        </p>
      )}
      {!email && (
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {lead.person && (
            <a
              className="text-link"
              href={lead.person.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open LinkedIn profile
              <ArrowUpRight size={14} />
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              task.run(async () => {
                await callAction('updateLead', { leadId: row.data.leadId, status: 'contacted' })
                setMessage('Marked as contacted based on your manual update.')
              })
            }
          >
            I sent this manually
          </Button>
        </div>
      )}
      {authUrl && (
        <Notice>
          <p>Connect Gmail, then return to review. Connecting will not send this email.</p>
          <p className="form-helper">
            The platform requests Gmail modify access. Sending uses your account’s DeepSpace
            credits.
          </p>
          <Button size="sm" className="mt-3" onClick={connect}>
            Connect Gmail
            <ArrowUpRight size={13} />
          </Button>
        </Notice>
      )}
      {task.error && <Notice tone="error">{task.error}</Notice>}
      {message && <Notice tone={sent ? 'success' : 'info'}>{message}</Notice>}
      {uncertain && (
        <Notice tone="error">
          This email is sending or its outcome is uncertain. Check Gmail Sent before taking further
          action. Automatic retries are blocked.
        </Notice>
      )}
      {sent && !message && (
        <Notice tone="success">This draft was accepted by Gmail. It will not be sent again.</Notice>
      )}
      {mailbox.error && email && (
        <p className="form-helper">
          {mailbox.error}{' '}
          <button className="text-link" onClick={mailbox.reload}>
            Refresh Gmail status
          </button>
        </p>
      )}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>One last look.</DialogTitle>
            <DialogDescription>
              Check the recipient, the facts, and the ask. Only this button sends your email.
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="review-address">
              <span>From</span>
              <strong>{mailbox.data?.email || 'Your connected Gmail account'}</strong>
            </div>
            <div className="review-address">
              <span>To</span>
              <strong>{recipient}</strong>
            </div>
            <div className="review-address">
              <span>Subject</span>
              <strong>{subject}</strong>
            </div>
          </div>
          <div className="review-preview">{body}</div>
          {!mailbox.data?.gmailSend && (
            <p className="form-helper">
              If Gmail needs authorization, you’ll connect it first and then return to review. No
              automatic send after consent.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={task.busy}>
              Keep editing
            </Button>
            <Button
              loading={task.busy}
              disabled={!canReview}
              onClick={send}
              data-testid="confirm-send"
            >
              <Send size={14} />
              Send this email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
