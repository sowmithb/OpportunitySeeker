import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { Empty, Loading, Notice, PageHeader } from '@/components/opportunity/Shared'
import { dateLabel, leadStatuses, type LeadData } from '@/lib/domain'

export default function SavedPage() {
  const { records, status, error } = useQuery<LeadData>('leads', {
    orderBy: 'updatedAt',
    orderDir: 'desc',
    limit: 100,
  })
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const visible = records.filter(
    (row) =>
      (filter === 'all' || row.data.status === filter) &&
      `${row.data.opportunity.title} ${row.data.opportunity.company} ${row.data.person?.name ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="YOUR OPPORTUNITY NOTEBOOK"
        title="Keep the door open."
        description="A place for the leads you want to follow through on."
      >
        <Link className="button-link" to="/discover">
          <Plus size={16} />
          Find opportunities
        </Link>
      </PageHeader>
      <div className="saved-stats">
        {[
          ['Saved leads', records.length],
          [
            'Introductions made',
            records.filter((r) => ['contacted', 'replied'].includes(r.data.status)).length,
          ],
          ['Conversations started', records.filter((r) => r.data.status === 'replied').length],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="section-toolbar">
        <div className="filter-pills overflow-pills" aria-label="Lead status">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All leads
          </button>
          {leadStatuses.map((s) => (
            <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="filter-search">
          <Search size={15} />
          <Input
            aria-label="Search saved leads"
            placeholder="Find a lead…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {status === 'loading' && <Loading />}
      {error && <Notice tone="error">{error}</Notice>}
      {status === 'ready' &&
        (visible.length ? (
          <div className="saved-list">
            <div className="saved-list-labels">
              <span>OPPORTUNITY</span>
              <span>CONTACT</span>
              <span>STATUS</span>
              <span>UPDATED</span>
            </div>
            {visible.map((row) => (
              <Link to={`/leads/${row.recordId}`} key={row.recordId} className="saved-row">
                <div className="saved-opportunity">
                  <span className="company-monogram">
                    {(row.data.opportunity.company || row.data.opportunity.title)[0]}
                  </span>
                  <span>
                    <strong>{row.data.opportunity.title}</strong>
                    <small>{row.data.opportunity.company || 'See original source'}</small>
                  </span>
                </div>
                <span className="saved-contact">{row.data.person?.name || 'Not selected yet'}</span>
                <span className={`status-tag status-${row.data.status}`}>{row.data.status}</span>
                <span className="saved-date">
                  {dateLabel(row.updatedAt)}
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title={records.length ? 'No leads in this view.' : 'Good things begin with a lead.'}
            action={{ href: '/discover', label: 'Explore opportunities' }}
          >
            {records.length
              ? 'Try a different filter or search term.'
              : 'Save an opportunity that catches your eye. You can find a contact and shape your introduction from here.'}
          </Empty>
        ))}
      <p className="footnote">
        Lead statuses and replies can be updated manually. Email acceptance does not guarantee
        delivery or a response.
      </p>
    </div>
  )
}
