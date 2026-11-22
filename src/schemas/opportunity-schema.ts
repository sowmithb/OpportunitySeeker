import type { CollectionSchema, ColumnDefinition } from 'deepspace/schema'

const text = (name: string): ColumnDefinition => ({
  name,
  storage: 'text',
  interpretation: 'plain',
})
const json = (name: string): ColumnDefinition => ({
  name,
  storage: 'text',
  interpretation: { kind: 'json' },
})

// Clients subscribe through RBAC. All writes use ownership-checked actions so
// owner ids, AI evidence, and send outcomes cannot be forged over WebSockets.
function privateCollection(name: string, columns: ColumnDefinition[]): CollectionSchema {
  return {
    name,
    columns: [text('ownerUserId'), ...columns],
    ownerField: 'ownerUserId',
    permissions: {
      '*': { read: false, create: false, update: false, delete: false },
      viewer: { read: 'own', create: false, update: false, delete: false },
      member: { read: 'own', create: false, update: false, delete: false },
      admin: { read: 'own', create: false, update: false, delete: false },
    },
  }
}

export const opportunitySchemas: CollectionSchema[] = [
  privateCollection(
    'seeker_profiles',
    ['name', 'headline', 'location', 'summary', 'skills', 'portfolio'].map(text),
  ),
  privateCollection('searches', [
    text('request'),
    text('status'),
    json('criteria'),
    json('opportunities'),
    text('warning'),
    { name: 'searchedAt', storage: 'number', interpretation: 'plain' },
  ]),
  privateCollection('leads', [
    text('searchId'),
    json('opportunity'),
    json('person'),
    json('people'),
    text('peopleWarning'),
    text('status'),
    text('notes'),
  ]),
  privateCollection(
    'drafts',
    ['leadId', 'channel', 'recipient', 'subject', 'body', 'revision'].map(text),
  ),
  privateCollection(
    'outreach_attempts',
    [
      'draftId',
      'leadId',
      'revision',
      'status',
      'recipient',
      'subject',
      'body',
      'providerMessageId',
      'error',
    ].map(text),
  ),
]
