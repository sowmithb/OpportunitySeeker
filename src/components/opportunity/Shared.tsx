import type { ReactNode } from 'react'
import { ArrowUpRight, Compass, AlertCircle, LoaderCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dateLabel, hostname, type Opportunity } from '@/lib/domain'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <Compass size={22} strokeWidth={1.7} />
      </span>
      {!compact && (
        <span>
          Opportunity<span className="brand-second">Seeker</span>
        </span>
      )}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children}
    </header>
  )
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'error' | 'success'
}) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertCircle size={17} aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function Loading({ text = 'Loading your workspace…' }: { text?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="animate-spin" size={22} />
      <span>{text}</span>
    </div>
  )
}

export function SourceLink({ url, children }: { url: string; children?: ReactNode }) {
  return (
    <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">
      {children ?? hostname(url)}
      <ArrowUpRight size={14} aria-hidden />
    </a>
  )
}

export function FitBadge({ fit }: { fit: Opportunity['fit'] }) {
  const labels = {
    strong: 'Worth a closer look',
    possible: 'Possible match',
    stretch: 'A stretch',
    unscored: 'Unscored result',
  }
  return (
    <span className={`fit-badge fit-${fit}`}>
      <span />
      {labels[fit]}
    </span>
  )
}

export function OpportunitySummary({
  opportunity: o,
  compact = false,
}: {
  opportunity: Opportunity
  compact?: boolean
}) {
  return (
    <>
      <div className="opportunity-meta">
        <span>{o.company || hostname(o.source.url)}</span>
        <span className="meta-dot">·</span>
        <span>{o.location || 'Location not specified'}</span>
      </div>
      <h2 className={compact ? 'opportunity-title compact' : 'opportunity-title'}>{o.title}</h2>
      <div className="opportunity-labels">
        <FitBadge fit={o.fit} />
        <span className="small-muted">
          {o.kind === 'job' ? 'Job' : o.kind === 'project' ? 'Project' : 'Opportunity'} ·{' '}
          {dateLabel(o.source.publishedDate, true)}
        </span>
      </div>
    </>
  )
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Compass size={28} strokeWidth={1.2} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action && (
        <Link className="text-link" to={action.href}>
          {action.label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  )
}
