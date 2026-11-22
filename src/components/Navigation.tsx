import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut, useQuery } from 'deepspace'
import { Bookmark, Compass, UserRound, LogOut, ChevronDown, ArrowUpRight } from 'lucide-react'
import { Brand } from './opportunity/Shared'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui'
import type { LeadData } from '@/lib/domain'

export default function Navigation() {
  const { isSignedIn, user, isLoaded } = useAuthProfileReady({ requireUser: true })
  const { records } = useQuery<LeadData>('leads', { limit: 100 })
  const [showAuth, setShowAuth] = useState(false)
  return (
    <>
      <aside className="app-sidebar" data-testid="app-navigation">
        <Link to="/discover" className="sidebar-brand" aria-label="OpportunitySeeker home">
          <Brand />
        </Link>
        <div className="sidebar-section-label">YOUR WORKSPACE</div>
        <nav className="sidebar-links" aria-label="Workspace">
          <NavLink to="/discover">
            <Compass size={18} />
            Discover<span className="nav-key">01</span>
          </NavLink>
          <NavLink to="/saved">
            <Bookmark size={18} />
            Saved leads<span className="nav-count">{records.length}</span>
          </NavLink>
          <NavLink to="/profile">
            <UserRound size={18} />
            My profile
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">A SMALL REMINDER</span>
          <p>
            A thoughtful introduction
            <br />
            can open a new door.
          </p>
          <span className="tiny-muted">Find your reason to reach out.</span>
        </div>
        <div className="sidebar-bottom">
          <a
            href="https://github.com/sowmithb/OpportunitySeeker"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-source"
          >
            Built with DeepSpace
            <ArrowUpRight size={14} />
          </a>
          {isLoaded && isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="account-trigger" aria-label="Account menu">
                    <span className="account-avatar">
                      {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="account-label">
                      <strong data-testid="nav-user-name">{user.name || user.email}</strong>
                      <small>Personal workspace</small>
                    </span>
                    <ChevronDown size={14} />
                  </button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>
                  <div>{user.name || 'Your account'}</div>
                  <div data-testid="nav-user-email" className="small-muted">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut size={15} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              className="account-trigger"
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuth(true)}
            >
              Sign in to your workspace
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </aside>
      {showAuth && <AuthOverlay onClose={() => setShowAuth(false)} />}
    </>
  )
}
