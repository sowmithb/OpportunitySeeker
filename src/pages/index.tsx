/**
 * Design Direction
 * Product: Help job seekers turn an evidenced opportunity into a considered introduction.
 * Emotion: The relief of finding a useful lead after a scattered afternoon of searching.
 * Metaphor: An interview-preparation notebook on a quiet desk, with a terracotta compass stamp.
 * References: Penguin paperback covers; Muji planners; National Geographic field notebooks.
 * Signature: A numbered fieldnote connecting a public opportunity, a person, and an introduction.
 * Hero: A still paper fieldnote; no continuous motion or simulated live results.
 * Style Tile
 * Color: Warm paper, dark ink, terracotta accent, restrained sage statuses.
 * Type: Georgia editorial headings + system sans body, readable without external font requests.
 * Theme: Fieldnotes light, shared with the workspace.
 * Art direction: Editorial notebook, not a dashboard screenshot.
 * Motion: Quiet, short interaction feedback; reduced-motion support.
 * Voice: Second-person; short sentences; no invented outcomes or testimonials.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Compass } from 'lucide-react'
import { Brand } from '@/components/opportunity/Shared'
import { Seo } from '@/components/Seo'
import { seo } from '@/seo'

export default function Landing() {
  return (
    <div className="landing" data-testid="static-landing">
      <Seo {...seo} path="/" />
      <nav className="landing-nav">
        <Link to="/" aria-label="OpportunitySeeker home">
          <Brand />
        </Link>
        <Link to="/discover">
          Open workspace
          <ArrowUpRight size={15} />
        </Link>
      </nav>
      <main>
        <section className="landing-hero">
          <div>
            <p className="eyebrow">A LITTLE DIRECTION GOES A LONG WAY</p>
            <h1>
              Your next chapter
              <br />
              starts <em>here.</em>
            </h1>
            <p className="landing-copy">
              Find an opportunity worth your time. Discover someone worth talking to. Write an
              introduction that sounds like you.
            </p>
            <Link className="button-link" to="/discover">
              Find your next opportunity
              <ArrowRight size={16} />
            </Link>
            <span className="landing-subnote">Your search. Your story. Your call.</span>
          </div>
          <div
            className="fieldnote"
            aria-label="Illustration of the opportunity-to-introduction workflow"
          >
            <div className="fieldnote-header">
              <span>FIELDNOTES / YOUR NEXT MOVE</span>
              <Compass size={20} />
            </div>
            <p className="fieldnote-quote">
              A good opportunity.
              <br />A real person.
              <br />A reason to reach out.
            </p>
            <div className="fieldnote-step">
              <span className="fieldnote-number">1</span>
              <div>
                <strong>Find the opening</strong>
                <small>Public sources, with the evidence attached.</small>
              </div>
            </div>
            <div className="fieldnote-step">
              <span className="fieldnote-number">2</span>
              <div>
                <strong>Find your connection</strong>
                <small>A relevant public profile to explore.</small>
              </div>
            </div>
            <div className="fieldnote-step">
              <span className="fieldnote-number">3</span>
              <div>
                <strong>Make the introduction</strong>
                <small>A draft you shape. An email you choose to send.</small>
              </div>
            </div>
            <div className="fieldnote-footer">
              <span>ONE THOUGHTFUL STEP AT A TIME</span>
              <span>WORKFLOW ILLUSTRATION</span>
            </div>
          </div>
        </section>
        <section className="landing-method">
          <div>
            <p className="eyebrow">LESS SCATTER. MORE INTENTION.</p>
            <h2>
              From searching
              <br />
              to starting something.
            </h2>
          </div>
          <div>
            <div className="method-row">
              <span>01</span>
              <div>
                <strong>Follow the evidence.</strong>
                <p>Web opportunities and public LinkedIn profiles, with original links.</p>
              </div>
            </div>
            <div className="method-row">
              <span>02</span>
              <div>
                <strong>Bring your own story.</strong>
                <p>AI helps explain the fit and draft an honest introduction.</p>
              </div>
            </div>
            <div className="method-row">
              <span>03</span>
              <div>
                <strong>Keep the final say.</strong>
                <p>Review emails before Gmail sends. Copy LinkedIn drafts to send yourself.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>OpportunitySeeker · Built on DeepSpace</span>
        <a
          href="https://github.com/sowmithb/OpportunitySeeker"
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          Explore the project
          <ArrowUpRight size={12} />
        </a>
        <span>For your next move, whatever it looks like.</span>
      </footer>
    </div>
  )
}
