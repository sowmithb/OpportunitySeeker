# Verification log

Last updated: November 22, 2026. This file distinguishes live checks from mocked/unit coverage.

## Confirmed so far

- Node 24.9.0 and npm 11.6.0; DeepSpace scaffold and SDK 0.44.2.
- Intended developer authenticated; app registered with the ID in wrangler.toml.
- GitHub remote: https://github.com/sowmithb/OpportunitySeeker.git.
- Real Exa opportunity search and Claude response succeeded.
- Native LinkedIn search returned an upstream provider quota error; Exa public LinkedIn profile fallback succeeded.
- Production build passed; type check and Rules of Hooks lint passed.
- Thirteen unit/prerender tests passed.
- Live browser discovery → saved lead → contact selection → AI draft → edit/save/review → refresh/persistence passed using fictional test-account profile data. No email was sent by that automated test.
- Cross-user access to the lead was refused in the live browser test.
- Landing desktop/mobile screenshots inspected; no JavaScript errors or horizontal overflow in that check.

## Fix found during verification

The first browser run found that creating the first profile remounted the form and cleared its success feedback. Removed the changing record-ID key; the focused privacy/profile check passed on rerun, including the real app/record boundary. Initial browser result: 12 passed, 1 failed. This is a real implementation fix, not a test assertion relaxation.

## Before claiming finished

- [x] Focused privacy/profile test passes after the fix.
- [ ] Deployed URL serves the app and important routes.
- [ ] Deployed auth and private persistence checked.
- [ ] Gmail consent works and returns to review without sending automatically.
- [ ] The one approved test email is accepted and actual receipt verified.
- [ ] Deployed logs inspected.
- [ ] Exact deployed source committed and pushed.

## Applicant verification

The coding agent performed the automated and tool-based checks listed above. The applicant should personally run the public search flow, review the source evidence, edit a draft, verify the approved email in Gmail, explain the durable send guard, and modify one small behavior before the live coding session. Do not describe these applicant checks as completed until they actually are.
