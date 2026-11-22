# Opportunity Finder — functionality, integrations, and feasibility

Research date: November 22, 2026. Submission target: November 23, 2026.

## 1. Decision

**Build an opportunity-to-outreach app on DeepSpace:** describe a goal, discover relevant opportunities on the web, find relevant public LinkedIn profiles, understand the evidence behind each match, then prepare an email or LinkedIn message. Send reviewed emails through the user's connected Gmail account; copy LinkedIn drafts and open the person's profile for manual sending.

The frontend, backend, authentication, persistent records, orchestration, and deployment can all live on DeepSpace. Search, AI, and Gmail are external providers reached through its managed integrations; no separately hosted backend or database is needed. This is supported by the documented [architecture](https://docs.deep.space/concepts/architecture) and [deployment model](https://docs.deep.space/concepts/deployment).

**Boundary:** automatic LinkedIn connection import and direct LinkedIn message sending are outside the verified submission scope. If either is mandatory, the complete requested product is not currently verified feasible for tomorrow. LinkedIn restricts its [Connections API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api) and [Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages) to approved developers or partners.

**Verification status:** architecture and live integration catalog/schema checks passed. Authenticated provider execution, Gmail consent, email delivery, and deployment have not been tested. The CLI currently returns `not_authenticated` on production. Platform capability is established; an end-to-end working implementation is not yet established.

## 2. Product and primary journey

Example request:

> Find junior frontend jobs at climate companies in the US, identify relevant people I could contact, and help me write a short introduction.

Support three intent labels—job, project/freelance, and other opportunity—through the same search and outreach workflow. Prioritize the job journey for tomorrow's demo; these labels do not imply comprehensive coverage of every opportunity source.

1. User signs in and adds a short professional summary, skills, and optional portfolio URL.
2. User enters a request and reviews the interpreted role, industry, location, and opportunity type.
3. App searches public sources and displays opportunities with original links and available dates.
4. User chooses an opportunity; app searches for relevant people at the company.
5. App explains why a person may be relevant, with evidence and uncertainty.
6. User saves a lead and generates an editable email or LinkedIn draft.
7. User either reviews and sends through Gmail, or copies the LinkedIn draft and opens the profile.
8. Saved leads and drafts remain available after refresh; user tracks outcomes manually.

## 3. Required functionality for a finished submission

| Area | Required behavior | Completion check |
| --- | --- | --- |
| Account and profile | DeepSpace sign-in; private professional summary and preferences | Two users cannot read each other's private records |
| Request interpretation | AI converts a request into validated search criteria; user can edit them | Ambiguous or empty requests produce a useful correction path |
| Opportunity discovery | Bounded public web search for jobs, projects, or announcements | Results include source URLs; no results has a useful empty state |
| Evidence and freshness | Retain source excerpts, retrieved time, and publication date when available | Missing dates stay unknown; no unsupported claim that a listing is still open |
| People discovery | Search public LinkedIn profiles by company/title and optional other supported filters | Each contact has its returned profile URL and available context |
| Matching | AI explains relevance using retrieved evidence and user-provided skills | An employee is not described as a hiring manager unless evidence supports it |
| Lead details | Opportunity, company, possible contact, source links, explanation, notes | User can inspect evidence before drafting |
| Saved leads | Save, edit notes, remove, and filter simple lead statuses | State persists after refresh |
| Message drafts | Editable email subject/body and short LinkedIn message; save and regenerate | Edits persist; generation never sends anything |
| Email sending | Send the reviewed message to one explicit recipient through connected Gmail | Show acting account, recipient, subject, body, and a deliberate Send action |
| LinkedIn handoff | Copy draft and open returned profile URL | Opening a profile is never recorded as a confirmed send |
| Recovery | Loading, empty, error, retry, partial-results, and insufficient-credit states | A people-search failure preserves existing opportunity results and drafts |
| Responsive UI | Three main surfaces: discover, lead detail/outreach, saved leads; account settings can be a panel | Important path works on desktop and a narrow viewport |

Use manually entered recipient addresses or clearly attributed public contact details. The LinkedIn profile response schema does **not** include an email address. Never generate or guess an address from a person's name or company domain.

An app-saved email draft is not a Gmail mailbox draft. The native Google catalog checked today includes Gmail sending but no dedicated draft-creation endpoint. Save drafts in DeepSpace records; do not promise Gmail Drafts synchronization.

## 4. Recommended integrations

The following endpoint keys and schemas were checked using the live CLI, rather than inferred from provider names. [DeepSpace documents catalog discovery here](https://docs.deep.space/guides/external-apis).

| Integration | Purpose | Scope and important limitation | Billing recommendation |
| --- | --- | --- | --- |
| `exa/search` | Discover public opportunities and original company pages | Query, result-count, domain, content, and publication-date options exist; indexed results are not proof an opening remains active | Developer-paid; bound usage per user |
| `linkedin/search-profiles` | Find relevant people at a target company | Scoped Google search over public profiles. Inputs: `name`, `company`, `title`, `education`, `location`, `page`. Location only refines another supported search term | Developer-paid; run on selected opportunities |
| `anthropic/chat-completion` | Interpret requests, explain/rank retrieved matches, generate drafts | Use a supported economical Claude model, bounded tokens, validated structured output, and source IDs. AI has no send tool | Developer-paid; validate outputs server-side |
| `google/gmail-send` | Send an approved email from the user's mailbox | Requires per-user Google consent. Required body fields: `to`, `subject`, `content`; HTML and threading are optional | **User-paid is mandatory** for `google/*` |
| `linkedin/analyze-profile-url` | Optional extra profile context before drafting | Returns a normalized profile summary, not a private profile or verified biography; use on demand | Developer-paid; defer until core works |
| `anymailfinder/find-linkedin-url` | Optional work-email lookup for a selected person | Input: `linkedin_url`. May return no address; response quality and exact payload need a real test | Developer-paid; user-triggered only; optional for deadline |

### Gmail behavior to implement

- App sign-in and Gmail authorization are separate steps. Explain the connected sending account.
- Keep `google: { billing: 'user' }`. Each user needs applicable DeepSpace credits; the app cannot simply switch this to developer billing to subsidize Gmail.
- The current platform consent flow requests `gmail.modify`, broader than send-only access. Request it only when the user chooses email sending, and explain the permission honestly.
- Handle the documented success-shaped `data.requiresOAuth` response and use its returned `authUrl`; also handle revoked-token recovery.
- After OAuth, preserve the draft and return to review. Do not replay a send automatically on reconnect or page load.
- Only explicit Send invokes the endpoint. Disable concurrent sends and record the provider response. A provider-accepted send is not proof of inbox delivery or a reply.

These are documented in [Google OAuth](https://docs.deep.space/guides/google-oauth).

### Integrations to leave out

- **Generic `email/send` for personal outreach:** the current live schema says it sends from `DeepSpace Apps <notifications@updates.app.space>` and ignores `from`. The prose guide still describes app-specific senders; prefer the current catalog for implementation and Gmail for personal identity. Generic email is unnecessary for this workflow.
- **Composio:** the catalog exposes generic discovery/execution endpoints, but no authenticated LinkedIn messaging tool was verified. A connector does not remove LinkedIn partner restrictions. Avoid another consent surface tomorrow.
- **Custom LinkedIn OAuth, browser scraping, inbox synchronization, calendar, payments, or a vector database:** none is needed to finish the selected journey.

## 5. DeepSpace implementation approach

### Platform primitives

- Extend the official scaffold; use its React frontend and Hono/Cloudflare Worker backend.
- Use DeepSpace authentication and private RecordRoom collections, not a second identity system or database.
- Use authenticated server actions for paid search/AI orchestration and reviewed email sending. Derive identity from the verified caller JWT.
- Apply per-user ownership rules to reads and writes. Server actions bypass collection RBAC, so every action must explicitly check ownership and scope its queries to the caller.
- Keep the scaffold's required `users` collection. Use confirmed mutations when the next UI step depends on persistence.

See [server actions](https://docs.deep.space/guides/server-actions.md), [data storage](https://docs.deep.space/guides/data-storage), and [permissions](https://docs.deep.space/concepts/permissions).

### Small data model

| Collection | Main fields |
| --- | --- |
| `searches` | owner, original request, parsed criteria, stage/status, bounded result/evidence JSON, timestamps |
| `leads` | owner, search ID, opportunity URL, company, selected profile URL, explanation/evidence references, notes, lead status |
| `drafts` | owner, lead ID, channel, recipient, subject, body, revision, timestamps |
| `outreach_attempts` | owner, draft ID/revision, channel, attempt ID, status, provider message ID when available, error, timestamps |

Store the professional summary in the extended user record. Set owner fields on the server for privileged writes; clients must not be able to assign records to another user. Keep AI-produced evidence separate from user-authored notes.

Suggested lead statuses: `saved`, `drafted`, `contacted`, `replied`, `closed`. Replies are manual entries in v1. Outreach attempt status is separate: `sending`, `accepted`, `failed`, `unknown`, or `manually_reported`.

### Bounded orchestration

1. Validate the request and parse it with one AI call.
2. Run one initial Exa search, capped at roughly ten results; normalize and deduplicate URLs.
3. Have AI return a bounded shortlist and explanations referencing only supplied source IDs. Reject invalid IDs and unsupported fields.
4. Search LinkedIn only after the user selects an opportunity, using company and a relevant role. Avoid a search for every company in a long result set.
5. Generate one draft for the selected contact and opportunity. Use the user's actual skills; never fabricate relationships, projects, vacancies, or recipient facts.
6. Send only the reviewed saved draft revision through a separate server action. The model cannot initiate this action.

Treat external page content as untrusted evidence, not instructions. Keep any source retrieval bounded; do not fetch arbitrary model-generated URLs. A large free-running agent loop adds little value under this deadline.

### Send reliability

Associate sending with an immutable reviewed draft revision and application attempt ID. Serialize sends for the same draft in Durable Object-backed coordination; a disabled button alone does not prevent duplicate requests. This guard must be implemented and tested, not assumed from record upserts.

The Gmail integration schema does not advertise an idempotency key. If a request times out after the provider may have accepted it, mark the attempt `unknown` and ask the user to check Sent mail before deliberately retrying. Do not claim exactly-once delivery, or automatically retry an uncertain send. LinkedIn handoff remains unsent until the user manually reports an outcome.

## 6. Feasibility and evidence ledger

| Capability | Evidence checked | Conclusion |
| --- | --- | --- |
| Full-stack hosting and persistent data | Architecture, deployment, storage, and permissions docs | Supported without separate infrastructure |
| Public opportunity discovery | Live `exa/search` input/output schemas | Available; actual result quality untested |
| Public LinkedIn people discovery | Live `linkedin/search-profiles` schema | Available; public index coverage only |
| AI interpretation and drafting | Live `anthropic/chat-completion` schema | Available; selected model/output handling need a real call |
| Draft persistence and editing | Record storage and permissions docs | Supported |
| Sending from user's Gmail | Live `google/gmail-send` schema plus OAuth contract | Supported subject to consent, credits, and a real send test |
| Sending personal LinkedIn DMs from the app | Native catalog has no dedicated LinkedIn send endpoint; official Messages API restricts access | Exclude; ship draft/copy/profile handoff |
| Live connection graph | Native LinkedIn catalog and official Connections API restrictions | Exclude from submission dependency |
| Deployment in this account | CLI `auth whoami --json` returned `not_authenticated` | Not verified; sign-in and deploy remain required |

No email, LinkedIn message, account mutation, or deployment was performed during this research. No paid provider invocation was performed. Public catalog discovery is available without login; successful discovery does not prove an account has credits or provider authorization.

Optional later feature: import a user-supplied LinkedIn connections CSV and cross-reference profile URLs/company names. LinkedIn lists connections data as available within 48 hours, so tomorrow's demo must not depend on a fresh export. Imported data is a dated snapshot, not live connection access. See [LinkedIn data export](https://www.linkedin.com/help/linkedin/answer/a1339364/down-your-account-data).

## 7. Costs and prerequisites

Catalog prices observed today, in USD; recheck before implementation:

- LinkedIn profile search: $0.0325 per request/page.
- LinkedIn profile analysis: $0.0325 per request.
- Gmail send: $0.013 per request, billed to the connected user.
- Exa and Claude: usage-dependent; no fixed per-journey total established.
- Optional email lookup: actual-cost billing; catalog says charged only when a valid email is found.

For example, three profile-search requests plus one Gmail send contribute $0.1105, **before** web search and AI. One optional profile analysis brings that subtotal to $0.143. These are partial estimates, not a spending cap.

Use server-enforced call quotas, bounded tokens/results, and explicit per-contact enrichment. Developer billing can otherwise charge the owner for repeated visitor activity. Gmail remains user-billed. Credit errors must preserve useful results and drafts.

Before claiming the app works: authenticate the intended DeepSpace owner, confirm available app capacity/credits, and complete Gmail consent with a test sender. No custom domain, separate email-provider account, or separate backend is required for the recommended route. Gmail OAuth availability for the intended account must be tested early.

## 8. Deadline implementation order

1. **Resolve external dependencies first:** authenticate, scaffold, and run one bounded web-search, LinkedIn-search, and AI call. Test Gmail consent and one reviewed send to an explicitly designated test recipient. Stop expanding scope if any dependency fails.
2. **Build the core:** search form, opportunity results, selected-company contact search, evidence-backed lead detail.
3. **Complete outreach:** save/edit drafts, Gmail review/send, LinkedIn copy/profile handoff, saved-lead statuses.
4. **Finish and deploy:** recovery states, account isolation, duplicate-send protection, responsive layout, deployed acceptance checks, submission note.

Prefer a conventional table/list and detail panel over a graph, elaborate kanban, or chat-only interface. Use a form plus visible interpreted criteria; a persistent multi-turn AI chat is unnecessary for v1.

If Gmail is blocked, email drafts and external compose handoff are a useful reduced release, but label in-app sending unfinished. Do not silently call that the full scope. Add CSV import, email enrichment, or profile analysis only after the full selected path passes.

For the repository submission, decide source authority before the first deploy. DeepSpace permanently infers its source from first use; if GitHub is chosen, configure the intended repository before that deploy and avoid an earlier `deepspace push`. No repository authority was selected during this research. See [source control](https://docs.deep.space/guides/source-control).

## 9. Required verification before submission

- [ ] Real request → web opportunity → relevant public profile → sourced explanation → saved lead → edited draft.
- [ ] At least one deployed query demonstrates useful actual results; fixtures are clearly labeled and never masquerade as live results.
- [ ] Gmail authorization, connected sending identity, approved send, and actual receipt by a designated test recipient are verified manually.
- [ ] Reload or OAuth reconnect never sends mail; double-clicks/concurrent requests do not create duplicate sends; uncertain outcomes stay `unknown`.
- [ ] LinkedIn copy/open-profile works and never reports a confirmed API send.
- [ ] Two-user tests cover private searches, leads, drafts, and privileged server actions, including attempts to reference another user's IDs.
- [ ] Empty results, missing emails/dates, partial failures, credit exhaustion, malformed AI output, and revoked Gmail access recover without losing drafts.
- [ ] Appropriate automated tests pass, with external boundaries mocked where live calls would require consent or mutate a mailbox. Real Gmail round-trips are manual deployed checks, as prescribed by the [OAuth testing guide](https://docs.deep.space/guides/google-oauth).
- [ ] Deployed URL is opened and checked, logs reviewed, and persistence after refresh verified.
- [ ] Submission includes live URL, repository, main scope tradeoff, integrations used, what the agent implemented, what the applicant personally verified, and honest unfinished edges.

**Final assessment:** a focused discovery-and-outreach app can be built entirely on DeepSpace's application stack, using managed web search, public-profile search, AI, and Gmail integration. Direct LinkedIn sending and private-network discovery remain outside the verified scope. Completion tomorrow is a realistic target for this bounded workflow, not a guarantee before authenticated provider tests and deployment pass.

## 10. Reproducing the capability checks

These read-only commands were executed successfully, except the authentication probe, which returned the stated signed-out result:

```bash
npx deepspace integrations list --json
npx deepspace integrations info exa/search --json
npx deepspace integrations info linkedin/search-profiles --json
npx deepspace integrations info linkedin/analyze-profile-url --json
npx deepspace integrations info anthropic/chat-completion --json
npx deepspace integrations info google/gmail-send --json
npx deepspace integrations info email/send --json
npx deepspace integrations info anymailfinder/find-linkedin-url --json
npx deepspace integrations info composio/list-tools --json
npx deepspace integrations info composio/get-tool --json
npx deepspace auth whoami --json
```

The last command returned exit code 1 and `code: "not_authenticated"`. Composio schema discovery confirms only a generic discovery capability; it does not establish that a LinkedIn messaging tool is available or authorized.
