# Submission note — draft

Live URL: to be filled after deployment.

Repository: https://github.com/sowmithb/OpportunitySeeker

I built OpportunitySeeker, a focused discovery-to-outreach app for job and opportunity seekers. Users search public opportunities, inspect evidence behind AI match explanations, find relevant public LinkedIn profiles, and save/edit introductions. Reviewed email sends through the user's Gmail account; LinkedIn outreach uses copy-and-open-profile handoff.

DeepSpace provides auth, private RecordRoom storage, Worker server actions, Durable Object coordination, and hosting. Integrations are Exa search, Claude, public LinkedIn profile search, and Gmail. The native LinkedIn provider exhausted its upstream search quota during verification, so public-profile discovery falls back to Exa and tells the user.

The main tradeoff was finishing one inspectable workflow instead of attempting private-network access, automated LinkedIn DMs, resume generation, or inbox synchronization. A durable claim prevents duplicate sends of the same draft; uncertain provider outcomes require checking Gmail rather than automatic retries.

The coding agent researched SDK examples, implemented the app, and ran the tests recorded in docs/VERIFICATION.md. Applicant verification: fill this in with what you personally tested or changed. Do not submit this placeholder as a completed claim.
