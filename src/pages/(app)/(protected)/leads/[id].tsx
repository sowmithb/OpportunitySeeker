import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowLeft, ArrowUpRight, Search, Trash2 } from 'lucide-react'
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
import { DraftWorkspace } from '@/components/opportunity/DraftWorkspace'
import {
  Empty,
  Loading,
  Notice,
  OpportunitySummary,
  SourceLink,
} from '@/components/opportunity/Shared'
import { callAction, useTask } from '@/lib/client'
import { leadStatuses, type LeadData } from '@/lib/domain'

export default function LeadPage() {
  const { id = '' } = useParams()
  const query = useQuery<LeadData>('leads', { where: { recordId: id }, limit: 1 })
  const lead = query.records[0]?.data
  if (query.status === 'loading') return <Loading text="Opening your lead…" />
  if (query.error)
    return (
      <div className="workspace-page">
        <Notice tone="error">{query.error}</Notice>
      </div>
    )
  if (!lead)
    return (
      <div className="workspace-page">
        <Empty
          title="This lead isn’t here."
          action={{ href: '/saved', label: 'Back to saved leads' }}
        >
          It may have been removed, or it belongs to another workspace.
        </Empty>
      </div>
    )
  return (
    <div className="workspace-page">
      <Link className="detail-back" to="/saved">
        <ArrowLeft size={14} />
        Your saved leads
      </Link>
      <div className="detail-heading">
        <p className="eyebrow mb-4">FROM POSSIBILITY TO CONVERSATION</p>
        <OpportunitySummary opportunity={lead.opportunity} />
      </div>
      <div className="detail-grid">
        <div>
          <Evidence lead={lead} />
          <People leadId={id} lead={lead} />
          <LeadNotes key={id} leadId={id} lead={lead} />
        </div>
        <DraftWorkspace leadId={id} lead={lead} />
      </div>
    </div>
  )
}

function Evidence({ lead }: { lead: LeadData }) {
  return (
    <section className="detail-section">
      <p className="eyebrow">01 / UNDERSTAND THE OPPORTUNITY</p>
      <h2>Here’s the connection.</h2>
      <p className="match-reason">{lead.opportunity.reason}</p>
      {lead.opportunity.uncertainty && (
        <p className="form-helper">{lead.opportunity.uncertainty}</p>
      )}
      <blockquote className="evidence-excerpt">
        {lead.opportunity.source.text.slice(0, 3000) ||
          'No page excerpt was returned. Open the original source for details.'}
      </blockquote>
      <SourceLink url={lead.opportunity.source.url}>Read the original source</SourceLink>
      <p className="form-helper">
        Public information can change. Check requirements and availability before reaching out.
      </p>
    </section>
  )
}

function People({ leadId, lead }: { leadId: string; lead: LeadData }) {
  const [company, setCompany] = useState(lead.opportunity.company)
  const [title, setTitle] = useState(lead.opportunity.kind === 'job' ? 'recruiter' : 'founder')
  const [searched, setSearched] = useState(false)
  const task = useTask()
  const choice = useTask()
  return (
    <section className="detail-section">
      <p className="eyebrow">02 / FIND A PERSON</p>
      <h2>A name, not an inbox.</h2>
      <p className="section-description">
        Look for someone relevant at the company. Public profile results don’t imply a connection or
        an invitation to contact.
      </p>
      <label className="form-label" htmlFor="people-company">
        Company
      </label>
      <Input
        id="people-company"
        value={company}
        maxLength={120}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Company name"
      />
      <label className="form-label" htmlFor="people-title">
        Who would be helpful?
      </label>
      <Input
        id="people-title"
        value={title}
        maxLength={100}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Recruiter, engineering manager, founder…"
      />
      <Button
        className="mt-4"
        size="sm"
        variant="outline"
        loading={task.busy}
        disabled={company.trim().length < 2 || title.trim().length < 2}
        onClick={() =>
          task.run(async () => {
            await callAction('findPeople', { leadId, company, title })
            setSearched(true)
          })
        }
      >
        <Search size={14} />
        Find public LinkedIn profiles
      </Button>
      {task.error && <Notice tone="error">{task.error}</Notice>}
      {choice.error && <Notice tone="error">{choice.error}</Notice>}
      {lead.peopleWarning && <Notice>{lead.peopleWarning}</Notice>}
      <div className="person-list">
        {lead.people.map((person) => (
          <div
            className={`person-item ${lead.person?.profileUrl === person.profileUrl ? 'chosen' : ''}`}
            key={person.profileUrl}
          >
            <span className="account-avatar">{person.name.slice(0, 1)}</span>
            <div className="person-info">
              <strong>{person.name}</strong>
              <p>
                {person.headline ||
                  person.summary.slice(0, 180) ||
                  'Open the public profile to confirm their role.'}
              </p>
              <SourceLink url={person.profileUrl}>View profile</SourceLink>
            </div>
            <button
              disabled={choice.busy}
              onClick={() =>
                choice.run(() =>
                  callAction('choosePerson', {
                    leadId,
                    profileUrl:
                      lead.person?.profileUrl === person.profileUrl ? null : person.profileUrl,
                  }),
                )
              }
            >
              {lead.person?.profileUrl === person.profileUrl ? 'Selected' : 'Choose'}
            </button>
          </div>
        ))}
      </div>
      {searched && !lead.people.length && (
        <p className="form-helper">
          No matching public profiles found. Try a broader title or a different company name.
        </p>
      )}
      {!!lead.people.length && (
        <p className="form-helper">
          Indexed public profiles may be incomplete or outdated. Confirm the role on LinkedIn. Email
          addresses are not included.
        </p>
      )}
    </section>
  )
}

function LeadNotes({ leadId, lead }: { leadId: string; lead: LeadData }) {
  const [notes, setNotes] = useState(lead.notes)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const task = useTask()
  return (
    <section className="detail-section">
      <p className="eyebrow">YOUR NOTEBOOK</p>
      <h2>Keep track of the next step.</h2>
      <div className="status-controls" aria-label="Update lead status">
        {leadStatuses.map((status) => (
          <button
            key={status}
            disabled={task.busy}
            className={lead.status === status ? 'active' : ''}
            onClick={() => task.run(() => callAction('updateLead', { leadId, status }))}
          >
            {status}
          </button>
        ))}
      </div>
      <p className="form-helper">Statuses are your own notes; replies are updated manually.</p>
      <label className="form-label" htmlFor="lead-notes">
        Private notes
      </label>
      <Textarea
        id="lead-notes"
        value={notes}
        maxLength={4000}
        rows={3}
        placeholder="What caught your eye? What will you ask?"
        onChange={(e) => {
          setNotes(e.target.value)
          setSaved(false)
        }}
      />
      <div className="draft-actions">
        <Button
          size="sm"
          variant="outline"
          loading={task.busy}
          onClick={() =>
            task.run(async () => {
              await callAction('updateLead', { leadId, notes })
              setSaved(true)
            })
          }
        >
          {saved ? 'Notes saved' : 'Save notes'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Remove lead"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={14} />
          Remove lead
        </Button>
      </div>
      {task.error && <Notice tone="error">{task.error}</Notice>}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this lead?</DialogTitle>
            <DialogDescription>
              This removes its notes and saved drafts from your workspace. Sent emails remain in
              Gmail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep lead
            </Button>
            <Button
              variant="destructive"
              loading={task.busy}
              onClick={() =>
                task.run(async () => {
                  await callAction('deleteLead', { leadId })
                  navigate('/saved')
                })
              }
            >
              Remove lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
