# Verification log

Last updated: November 22, 2026. This file distinguishes live checks from mocked/unit coverage.

## Confirmed so far

- Node 24.9.0 and npm 11.6.0; DeepSpace scaffold and SDK 0.44.2.
- Intended developer authenticated; app registered with the ID in wrangler.toml.
- GitHub remote: https://github.com/sowmithb/OpportunitySeeker.git.
- Real Exa opportunity search and Claude response succeeded.
- Native LinkedIn search returned an upstream provider quota error; Exa public LinkedIn profile fallback succeeded.
- Production build passed; type check and Rules of Hooks lint passed.
- Seventeen unit/prerender checks passed, including mirrored-job deduplication, publication-date preservation, UTF-8 subject encoding, privacy, and send safety.
- Live browser discovery → saved lead → contact selection → AI draft → edit/save/review → refresh/persistence passed using fictional test-account profile data. No email was sent by that automated test.
- Cross-user access to the lead was refused in the live browser test.
- Landing desktop/mobile screenshots inspected; no JavaScript errors or horizontal overflow in that check.

## Fix found during verification

The first browser run found that creating the first profile remounted the form and cleared its success feedback. Removed the changing record-ID key; the focused privacy/profile check passed on rerun, including the real app/record boundary. Initial browser result: 12 passed, 1 failed. This is a real implementation fix, not a test assertion relaxation.

## Before claiming finished

- [x] Focused privacy/profile test passes after the fix.
- [x] Deployed URL serves the app and important routes. https://opportunityseeker.app.space. DeepSpace confirmed edge and data plane.
- [x] Deployed Google sign-in checked using the intended developer account. The saved draft and accepted-send record persisted across a full page reload.
- [x] The applicant completed Google consent. The app returned to review without automatically sending.
- [x] The one approved test email was accepted and receipt verified through the same DeepSpace Gmail connection: exactly one matching message, with SENT and INBOX labels and the approved body.
- [x] Deployed logs inspected; no error-level events in the checked five-minute window.
- [x] Source committed and pushed to the selected GitHub repository before the final deployment.

## Applicant verification

The coding agent performed the automated and tool-based checks listed above. The applicant should personally run the public search flow, review the source evidence, edit a draft, verify the approved email in Gmail, explain the durable send guard, and modify one small behavior before the live coding session. Do not describe these applicant checks as completed until they actually are.

## Deployed review findings

The deployed search surfaced mirrored copies of the same job on multiple boards and exposed a timezone shift on publication-only dates. Added company/title deduplication (retaining the first ranked source) and UTC calendar formatting for publication dates, with regression tests. These changes are included in the final release.

## Gmail delivery and encoding

The approved self-addressed test was delivered exactly once. The ChatGPT Gmail connector was connected to a different mailbox, so receipt was checked through DeepSpace's authenticated Google integration instead. Only the matching test message was read.

The received header exposed an em-dash encoding issue in the provider path. Added RFC 2047 UTF-8 subject encoding at the app's outbound boundary, with bounded encoded words, Unicode round-trip checks, and header-injection rejection. See https://www.rfc-editor.org/info/rfc2047/. The message body and delivery worked; the subject-encoding workaround has unit coverage but has not been resent live because only one test email was authorized.
