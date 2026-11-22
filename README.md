# OpportunitySeeker

Turn a public opportunity into a thoughtful introduction: describe what you want, inspect sourced matches, find relevant people, save a lead, and write an editable message. Reviewed emails send through your own Gmail account. LinkedIn messages are copied and sent manually.

**Live:** [opportunityseeker.app.space](https://opportunityseeker.app.space)

Built on DeepSpace 0.44.2. Submission deadline: **November 23, 2026, 11:59 PM Eastern**.

## The important path

1. Sign in and add your real background in **My profile**.
2. Describe a job, project, or other opportunity in **Discover**.
3. Inspect the original source and the AI's explanation. Save a lead.
4. Search for a relevant person's public LinkedIn profile and choose a contact.
5. Generate an email or LinkedIn draft. Edit and save it.
6. For email, enter a known recipient address and choose **Review & send**. If Gmail needs consent, connect it, then return to review and send again deliberately.
7. For LinkedIn, copy the message and open the profile. Update the outcome manually.

No message is sent during AI generation, on page load, or after OAuth completes.

## Integrations

| Endpoint                    | Use                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| `exa/search`                | Public opportunities and fallback public-profile search             |
| `linkedin/search-profiles`  | Public LinkedIn profile discovery via DeepSpace's search provider   |
| `anthropic/chat-completion` | Request interpretation, evidence-based matching, and message drafts |
| `google/gmail-send`         | Reviewed sending from the caller's Gmail account                    |

**Observed provider limitation:** the native LinkedIn endpoint returned an upstream SerpAPI quota error in live testing. The app falls back to Exa, restricts links to public LinkedIn `/in/` profiles, and displays that fallback. It never pretends to access private connections.

Gmail is always `billing: 'user'`; the platform's OAuth token lookup uses the caller's identity. Users need their own DeepSpace credits for Gmail operations. Search and AI use developer billing, guarded by per-user daily limits. Provider prices and available models should be checked with the CLI before changing them.

The default Claude model is `claude-haiku-4-5`. All model output is parsed and validated. Opportunity links come from retrieved sources, not generated URLs. A fit explanation is a suggestion, not proof a listing remains open or a person is hiring.

## Architecture

- React frontend and Hono Worker from the official DeepSpace scaffold.
- DeepSpace auth and RecordRoom collections for private profiles, searches, leads, drafts, and outreach attempts.
- Ownership-checked server actions for writes and paid integrations.
- `AppWorkflowRoom`, a per-user Durable Object, for persisted quotas and atomic send claims.
- The scaffold's generic browser integration execution route is disabled so it cannot bypass workflow guards.
- Existing platform-managed auth, OAuth, and integration services are retained. No separate database, server, or provider secret is required.

### Send semantics

Each send refers to a saved, reviewed draft revision. A durable claim permits one in-flight send per draft and blocks further sends after provider acceptance. Gmail's exposed endpoint has no documented idempotency key: if transport fails after the request may have been accepted, the app records `unknown`, blocks automatic retry, and asks the user to check Gmail Sent. Exactly-once external delivery is not claimed.

Non-ASCII subject values are encoded as RFC 2047 UTF-8 words to avoid header corruption in the provider path; the UI and saved drafts retain the original text.

Drafts are saved in the app, not synchronized to Gmail Drafts. Replies and lead statuses are manually maintained. Public LinkedIn profiles do not supply an email field; recipient addresses are entered by the user.

### Privacy

Collection reads are owner-scoped even for the app-admin role. Clients cannot directly forge workflow records over WebSockets; server actions assign owner IDs and check every referenced record. Unauthenticated paid calls are refused. The AI has no send capability. The selected request, profile, and relevant public source content go to the configured search/AI providers.

## Local development

Requires Node 22.15+, 24, or 26 and npm 11.6+.

```sh
npm ci
npx deepspace auth login
npx deepspace auth whoami --json
npx deepspace dev start --port 5186 --host 127.0.0.1
```

Use the same registered app ID in `wrangler.toml`. The repository uses GitHub source; do not run `deepspace push` to establish a second source of truth.

## Verification

```sh
npm run type-check
npm run lint
npm run test:unit
npx deepspace test run all --port 5191
npm run build
```

The browser suite uses two test accounts, checks privacy and authorization, and runs one bounded real search-to-draft journey. That journey calls paid developer-billed providers; it never sends an email. Test accounts and passwords are managed by `deepspace test accounts` outside the repository. Gmail delivery is a separate manual deployed check using an explicitly authorized recipient.

Unit coverage includes cross-user rejection, stale revisions, concurrent send claims, OAuth without automatic replay, uncertain outcomes, header injection, source-ID validation, URL validation, and public-profile normalization. Its storage adapter is in memory; deployed/runtime checks are still necessary.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for observed results and remaining manual checks.

## Deploy

```sh
git status
npm run type-check
npx deepspace test run all --port 5191
npx deepspace deploy
```

Deploy ships the local working tree under GitHub source. Commit and push the exact code being deployed, then verify the deployed URL, auth, persistence, and logs. Never commit `.dev.vars`, tokens, browser storage states, or generated `dist/` files.

## Scope decisions

This submission prioritizes one complete discovery-to-introduction path. It leaves out live LinkedIn connections, direct LinkedIn sending, bulk campaigns, inbox/reply sync, CSV import, resume uploads, email enrichment, schedules, payments, and an agentic browsing loop. These would add access dependencies or complexity without improving the central demonstration enough for the deadline.

Next improvements would be stronger opportunity freshness checks, optional connection snapshots, on-demand verified email lookup, and explicit follow-up drafts. Any new integration should earn its place in the workflow.

## References studied

- [ThreadHunt](https://github.com/deepdotspace/threadhunt): bounded search, review, and draft orchestration.
- [DeepSpace CRM Gmail write hook](https://github.com/deepdotspace/deepspace-crm/blob/main/src/platform/useGmailWrite.ts), [compose dialog](https://github.com/deepdotspace/deepspace-crm/blob/main/src/components/ComposeEmailDialog.tsx), and [Google consent helper](https://github.com/deepdotspace/deepspace-crm/blob/main/src/platform/googleConsent.ts): caller-owned Gmail, incremental consent, editable composition, and keeping sends out of the AI tool surface. This app returns to review after consent instead of replaying the send automatically.
- [DeepSpace docs](https://docs.deep.space/): platform APIs, data permissions, deployment, OAuth, and test workflow.
