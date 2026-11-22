import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'deepspace'
import {
  ArrowRight,
  BookmarkPlus,
  Search,
  Sparkles,
  Check,
  SlidersHorizontal,
  ArrowUpRight,
} from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import {
  Empty,
  FitBadge,
  Loading,
  Notice,
  OpportunitySummary,
  PageHeader,
  SourceLink,
} from '@/components/opportunity/Shared'
import { callAction, useTask } from '@/lib/client'
import { dateLabel, dedupeOpportunities, type SearchData, type LeadData } from '@/lib/domain'

const examples = [
  'Junior frontend roles at climate companies in the US',
  'Remote design internships at early-stage startups',
  'Freelance React projects for education companies',
]
const stages = {
  interpreting: 'Understanding your direction',
  searching: 'Looking for opportunities on the web',
  matching: 'Reading sources and finding the fit',
  complete: 'Ready to explore',
  failed: 'Search interrupted',
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const searches = useQuery<SearchData>('searches', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 12,
  })
  const leads = useQuery<LeadData>('leads', { limit: 100 })
  const [request, setRequest] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState('all')
  const searchTask = useTask()
  const saveTask = useTask()
  const selected = searches.records.find((s) => s.recordId === selectedId) ?? searches.records[0]
  const data = selected?.data
  const inProgress = data && !['complete', 'failed'].includes(data.status)
  const shortlist = dedupeOpportunities(data?.opportunities ?? [])
  const opportunities = shortlist.filter((o) => filter === 'all' || o.fit === filter)
  async function search() {
    await searchTask.run(async () => {
      setSelectedId('')
      const result = await callAction<{ searchId: string }>('runSearch', { request })
      setSelectedId(result.searchId)
      setFilter('all')
    })
  }
  async function save(opportunityId: string, open: boolean) {
    if (!selected) return
    await saveTask.run(async () => {
      const result = await callAction<{ leadId: string }>('saveLead', {
        searchId: selected.recordId,
        opportunityId,
      })
      if (open) navigate(`/leads/${result.leadId}`)
    })
  }
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="YOUR NEXT MOVE"
        title="Find a little direction."
        description="Tell us what you’re looking for. Turn the right opportunity into a real conversation."
      >
        <span className="header-date">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </PageHeader>
      <section className="search-panel" aria-labelledby="search-label">
        <div className="search-panel-label">
          <Sparkles size={16} />
          <label id="search-label" htmlFor="opportunity-request">
            What would you like to find?
          </label>
          <span>Be as specific as you like.</span>
        </div>
        <Textarea
          id="opportunity-request"
          data-testid="search-request"
          value={request}
          maxLength={1200}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="I’m looking for a junior frontend role at a climate company, ideally remote in the US…"
          rows={3}
          className="search-textarea"
        />
        <div className="search-panel-footer">
          <span>
            <span className="live-dot" />
            Public sources. Clear reasons. Your decision.
          </span>
          <Button
            onClick={search}
            loading={searchTask.busy}
            disabled={request.trim().length < 12}
            data-testid="search-submit"
          >
            Find opportunities
            <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      {!data && (
        <div className="example-prompts">
          <span>NEED A STARTING POINT?</span>
          {examples.map((example) => (
            <button key={example} onClick={() => setRequest(example)}>
              {example}
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      )}
      {searchTask.error && <Notice tone="error">{searchTask.error}</Notice>}
      {saveTask.error && <Notice tone="error">{saveTask.error}</Notice>}
      {searches.status === 'loading' && <Loading />}
      {searches.status === 'error' && (
        <Notice tone="error">
          Could not load previous searches. Refresh the page to reconnect.
        </Notice>
      )}
      {searches.records.length > 1 && (
        <div className="recent-searches">
          <span>RECENT SEARCHES</span>
          {searches.records.slice(0, 4).map((s) => (
            <button
              key={s.recordId}
              className={selected?.recordId === s.recordId ? 'selected' : ''}
              title={s.data.request}
              onClick={() => {
                setSelectedId(s.recordId)
                setFilter('all')
              }}
            >
              {s.data.request}
            </button>
          ))}
        </div>
      )}
      {(searchTask.busy || inProgress) && (
        <div className="search-progress" role="status">
          <div className="progress-track">
            <span />
          </div>
          <p>
            {data && inProgress ? stages[data.status] : 'Starting your search'}
            <span>Results and drafts stay saved in your workspace.</span>
          </p>
        </div>
      )}
      {data?.criteria && (
        <div className="interpreted-criteria">
          <SlidersHorizontal size={15} />
          <span>Searching for</span>
          <strong>{data.criteria.role}</strong>
          {data.criteria.location && (
            <span className="criteria-chip">{data.criteria.location}</span>
          )}
          {data.criteria.keywords.slice(0, 3).map((k) => (
            <span key={k} className="criteria-chip">
              {k}
            </span>
          ))}
          <button
            className="text-link"
            onClick={() => {
              setRequest(data.request)
              document.getElementById('opportunity-request')?.focus()
            }}
          >
            Refine request
          </button>
        </div>
      )}
      {data?.warning && (
        <Notice tone={data.status === 'failed' ? 'error' : 'info'}>{data.warning}</Notice>
      )}
      {data?.status === 'complete' && (
        <>
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">THE SHORTLIST</p>
              <h2>
                {shortlist.length} possibilities to explore
                <span>Checked {dateLabel(data.searchedAt)}</span>
              </h2>
            </div>
            <div className="filter-pills" aria-label="Filter matches">
              {[
                ['all', 'All results'],
                ['strong', 'Closer matches'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {opportunities.length ? (
            <div className="opportunity-list">
              {opportunities.map((o, i) => {
                const saved = leads.records.find(
                  (l) => l.data.searchId === selected?.recordId && l.data.opportunity.id === o.id,
                )
                return (
                  <article key={o.id} className="opportunity-card" data-testid="opportunity-card">
                    <div className="opportunity-index">{String(i + 1).padStart(2, '0')}</div>
                    <div className="opportunity-card-main">
                      <OpportunitySummary opportunity={o} />
                      <p className="match-reason">{o.reason}</p>
                      <div className="card-bottom">
                        <SourceLink url={o.source.url}>Original source</SourceLink>
                        <span className="tiny-muted">Availability needs checking</span>
                      </div>
                    </div>
                    <div className="opportunity-card-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={saved ? 'Lead saved' : `Save ${o.title}`}
                        disabled={saveTask.busy || !!saved}
                        onClick={() => save(o.id, false)}
                      >
                        {saved ? <Check size={18} /> : <BookmarkPlus size={18} />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          saved ? navigate(`/leads/${saved.recordId}`) : save(o.id, true)
                        }
                        disabled={saveTask.busy}
                      >
                        Explore lead
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <Empty title="Nothing quite fits yet.">
              Try a broader location, a related role, or fewer constraints. Your next search can
              take a different angle.
            </Empty>
          )}
        </>
      )}
      {!data && searches.status === 'ready' && (
        <div className="first-search-state">
          <div className="first-search-art">
            <Search size={24} strokeWidth={1.3} />
            <span />
            <BookmarkPlus size={24} strokeWidth={1.3} />
            <span />
            <ArrowUpRight size={24} strokeWidth={1.3} />
          </div>
          <h2>Start with a possibility.</h2>
          <p>
            Find an opening. Find the right person.
            <br />
            Write something worth replying to.
          </p>
          <span className="tiny-muted">Your searches and saved leads are private.</span>
        </div>
      )}
    </div>
  )
}
