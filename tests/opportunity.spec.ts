import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(loadAllTestAccounts().length < 2, 'Requires two local DeepSpace test accounts.')

async function action(
  page: import('@playwright/test').Page,
  name: string,
  params: Record<string, unknown>,
) {
  return page.evaluate(
    async ({ name, params }) => {
      const path = '/src/lib/client.ts'
      const client = await import(/* @vite-ignore */ path)
      try {
        return { success: true, data: await client.callAction(name, params) }
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed' }
      }
    },
    { name, params },
  )
}

test('profiles are private and clients cannot bypass paid workflow guards', async ({ users }) => {
  const [a, b] = await users(2)
  await Promise.all([a.page.goto('/profile'), b.page.goto('/profile')])
  await expect(a.page.getByLabel('Your story, in a few sentences')).toBeVisible()
  await a.page
    .getByLabel('Your story, in a few sentences')
    .fill('Private profile belonging to seeker A only.')
  await a.page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(a.page.getByText('Your profile is saved.')).toBeVisible()
  await b.page.reload()
  await expect(b.page.getByLabel('Your story, in a few sentences')).not.toHaveValue(
    'Private profile belonging to seeker A only.',
  )
  const forged = await action(b.page, 'saveDraft', {
    draftId: 'does-not-belong-to-b',
    recipient: 'someone@example.org',
    subject: 'Forged',
    body: 'This must never send.',
  })
  expect(forged.success).toBe(false)
  const response = await b.page.request.post('/api/integrations/anthropic/chat-completion', {
    data: { messages: [] },
  })
  expect(response.status()).toBe(403)
})

// Real web/profile/AI provider calls, bounded to a single important-path run.
// Gmail sending is separately manually verified; this spec never sends mail.
test('real discovery reaches a saved lead and an editable outreach draft', async ({ users }) => {
  test.setTimeout(180_000)
  const [a, b] = await users(2)
  await a.page.goto('/profile')
  await expect(a.page.getByLabel('Your story, in a few sentences')).toBeVisible()
  await a.page.getByLabel('Your name', { exact: true }).fill('Example Seeker')
  await a.page
    .getByLabel('Your story, in a few sentences')
    .fill(
      'I am an early-career frontend developer. I built a small React task manager and enjoy accessible interfaces. This is a fictional test profile.',
    )
  await a.page.getByLabel('Skills and strengths').fill('React, TypeScript, CSS, accessibility')
  await a.page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(a.page.getByText('Your profile is saved.')).toBeVisible()
  await a.page.goto('/discover')
  await a.page
    .getByTestId('search-request')
    .fill('Find junior frontend engineer jobs using React, remote in the United States.')
  await a.page.getByTestId('search-submit').click()
  const first = a.page.getByTestId('opportunity-card').first()
  await expect(first).toBeVisible({ timeout: 120_000 })
  await first.getByRole('button', { name: 'Explore lead' }).click()
  await expect(a.page.getByRole('heading', { name: 'Here’s the connection.' })).toBeVisible()
  const leadId = new URL(a.page.url()).pathname.split('/').pop()!
  await b.page.goto('/saved')
  expect(
    (await action(b.page, 'updateLead', { leadId, notes: 'Unauthorized change' })).success,
  ).toBe(false)
  await b.page.goto(`/leads/${leadId}`)
  await expect(b.page.getByRole('heading', { name: 'This lead isn’t here.' })).toBeVisible()
  await a.page.getByLabel('Company', { exact: true }).fill('Stripe')
  await a.page.getByLabel('Who would be helpful?').fill('technical recruiter')
  await a.page.getByRole('button', { name: 'Find public LinkedIn profiles' }).click()
  await expect(a.page.getByRole('button', { name: 'Choose', exact: true }).first()).toBeVisible({
    timeout: 60_000,
  })
  await a.page.getByRole('button', { name: 'Choose', exact: true }).first().click()
  await expect(a.page.getByRole('button', { name: 'Selected', exact: true })).toBeVisible()
  await a.page.getByRole('button', { name: 'Draft my introduction' }).click()
  await expect(a.page.getByLabel('Your message', { exact: true })).toBeVisible({ timeout: 60_000 })
  await a.page.getByLabel('To', { exact: true }).fill('review-only@example.org')
  await a.page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(a.page.getByText('Draft saved.', { exact: true })).toBeVisible()
  await a.page.getByRole('button', { name: 'Review & send' }).click()
  await expect(a.page.getByRole('dialog')).toContainText('review-only@example.org')
  await a.page.getByRole('button', { name: 'Keep editing' }).click()
  await a.page.reload()
  await expect(a.page.getByLabel('To', { exact: true })).toHaveValue('review-only@example.org')
  await expect(a.page.getByLabel('Your message', { exact: true })).not.toHaveValue('')
})
