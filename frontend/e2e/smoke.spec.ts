import { test, expect } from '@playwright/test'

test('register -> create habit -> log completion -> dashboard shows streak', async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`

  // 1. Register
  await page.goto('/register')
  await page.getByLabel(/name/i).fill('Smoke Tester')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

  // 2. Navigate to habits and create one
  await page.goto('/habits')
  // aria-label on the button is "Add new ritual"
  await page.getByRole('button', { name: /add new ritual/i }).click()
  await page.getByLabel(/name/i).fill('Morning run')
  await page.getByRole('button', { name: /create habit/i }).click()
  await expect(page.getByText('Morning run')).toBeVisible({ timeout: 5_000 })

  // 3. Log completion — HabitBentoCard uses aria-label "Mark complete"
  const completeBtn = page.getByRole('button', { name: /^mark complete$/i }).first()
  await expect(completeBtn).toBeVisible({ timeout: 5_000 })
  await completeBtn.click()

  // 4. Dashboard shows streak
  await page.goto('/dashboard')
  await expect(page.getByText(/streak/i).first()).toBeVisible({ timeout: 5_000 })
})
