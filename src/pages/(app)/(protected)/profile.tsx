import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthToken, useAuthProfileReady, useQuery } from 'deepspace'
import { ArrowRight, Check, Mail, RefreshCw, Unplug } from 'lucide-react'
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
import { Loading, Notice, PageHeader } from '@/components/opportunity/Shared'
import { callAction, useMailbox, useTask } from '@/lib/client'
import { profileSchema, type SeekerProfile } from '@/lib/domain'

export default function ProfilePage() {
  const { records, status, error } = useQuery<SeekerProfile>('seeker_profiles', { limit: 1 })
  const { user } = useAuthProfileReady()
  const mailbox = useMailbox()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const disconnect = useTask()
  return (
    <div className="workspace-page profile-page">
      <PageHeader
        eyebrow="YOUR STARTING POINT"
        title="A little about you."
        description="Better context makes better matches—and introductions that sound like you."
      />
      {status === 'loading' ? (
        <Loading />
      ) : error ? (
        <Notice tone="error">{error}</Notice>
      ) : (
        <div className="profile-layout">
          <ProfileForm
            profile={
              records[0]?.data ?? {
                ...profileSchema.parse({ name: user?.name || '' }),
                ownerUserId: '',
              }
            }
          />
          <aside>
            <section className="detail-section">
              <Mail size={20} className="text-primary" />
              <h2 className="mt-4">Your sending account</h2>
              <p className="section-description">
                Send one reviewed introduction at a time, directly from Gmail.
              </p>
              {mailbox.status === 'loading' && <p className="small-muted">Checking Gmail…</p>}
              {mailbox.data?.gmailSend ? (
                <>
                  <div className="connection-status connected">
                    <Check size={14} />
                    Gmail connected
                  </div>
                  <p className="connection-email">
                    {mailbox.data.email || 'Your authorized Google account'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDisconnect(true)}>
                    <Unplug size={13} />
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <div className="connection-status">Not connected for sending</div>
                  <p className="form-helper">
                    When you review your first email, you’ll be asked to connect Gmail. After
                    consent, return to review and send.
                  </p>
                  <Link className="text-link mt-4" to="/saved">
                    Open your saved leads
                    <ArrowRight size={13} />
                  </Link>
                </>
              )}
              <Button className="mt-4" variant="ghost" size="sm" onClick={mailbox.reload}>
                <RefreshCw size={13} />
                Refresh connection
              </Button>
              <p className="form-helper">
                Google requests Gmail modify access. Gmail calls use your own DeepSpace credits.
              </p>
              {mailbox.error && <Notice tone="error">{mailbox.error}</Notice>}
              {disconnect.error && <Notice tone="error">{disconnect.error}</Notice>}
            </section>
            <p className="profile-note">
              The best introduction
              <br />
              starts with <span>your story.</span>
            </p>
            <p className="footnote">
              Your profile and drafts are private. Only the context needed for matching and drafting
              is sent to the AI provider.
            </p>
          </aside>
        </div>
      )}
      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google?</DialogTitle>
            <DialogDescription>
              This revokes the app’s Google connection. Saved drafts stay in your workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisconnect(false)}>
              Keep connected
            </Button>
            <Button
              loading={disconnect.busy}
              onClick={() =>
                disconnect.run(async () => {
                  const token = await getAuthToken()
                  const res = await fetch('/api/integrations/oauth/google/disconnect', {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (!res.ok) throw new Error('Could not disconnect. Please try again.')
                  setConfirmDisconnect(false)
                  mailbox.reload()
                })
              }
            >
              Disconnect Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfileForm({ profile }: { profile: SeekerProfile }) {
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const task = useTask()
  const field = (name: keyof SeekerProfile, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    setSaved(false)
  }
  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault()
        task.run(async () => {
          await callAction('saveProfile', form)
          setSaved(true)
        })
      }}
    >
      <section className="detail-section">
        <p className="eyebrow">THE PERSON BEHIND THE INTRODUCTION</p>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="profile-name">
              Your name
            </label>
            <Input
              id="profile-name"
              value={form.name}
              maxLength={100}
              onChange={(e) => field('name', e.target.value)}
              placeholder="Name you use professionally"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="profile-location">
              Location
            </label>
            <Input
              id="profile-location"
              value={form.location}
              maxLength={100}
              onChange={(e) => field('location', e.target.value)}
              placeholder="Chicago, US / open to remote"
            />
          </div>
        </div>
        <label className="form-label" htmlFor="profile-headline">
          What do you do?
        </label>
        <Input
          id="profile-headline"
          value={form.headline}
          maxLength={160}
          onChange={(e) => field('headline', e.target.value)}
          placeholder="Frontend developer, designer, recent graduate…"
        />
        <label className="form-label" htmlFor="profile-summary">
          Your story, in a few sentences
        </label>
        <Textarea
          id="profile-summary"
          rows={6}
          value={form.summary}
          maxLength={2500}
          onChange={(e) => field('summary', e.target.value)}
          placeholder="What have you worked on? What would you like to do next? Include real projects or experience you’re comfortable mentioning."
        />
        <p className="form-helper">
          Specific and honest beats impressive-sounding. Drafts use what you actually share here.
        </p>
        <label className="form-label" htmlFor="profile-skills">
          Skills and strengths
        </label>
        <Input
          id="profile-skills"
          value={form.skills}
          maxLength={600}
          onChange={(e) => field('skills', e.target.value)}
          placeholder="React, TypeScript, accessibility, user research…"
        />
        <label className="form-label" htmlFor="profile-portfolio">
          Portfolio or project link <span className="small-muted">Optional</span>
        </label>
        <Input
          id="profile-portfolio"
          type="url"
          value={form.portfolio}
          maxLength={500}
          onChange={(e) => field('portfolio', e.target.value)}
          placeholder="https://your-portfolio.com"
        />
        <p className="form-helper">
          The link can appear in your draft. The app does not automatically read its contents.
        </p>
        <div className="profile-save-row">
          <span>
            {saved ? 'Your profile is saved.' : 'Only share what you want in your introduction.'}
          </span>
          <Button type="submit" loading={task.busy}>
            {saved && <Check size={14} />}
            {saved ? 'Saved' : 'Save profile'}
          </Button>
        </div>
        {task.error && <Notice tone="error">{task.error}</Notice>}
      </section>
    </form>
  )
}
