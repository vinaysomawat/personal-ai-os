'use server'

import { aiText } from '@/lib/anthropic'

export interface PlaywrightOutput {
  scenarios: string
  pageObject: string
  testFile: string
  edgeCases: string
}

export async function generatePlaywrightTests(story: string): Promise<PlaywrightOutput> {
  const prompt = `You are a senior Playwright testing engineer. Given this user story or requirement, generate complete, production-ready test artifacts.

USER STORY:
${story}

Respond with EXACTLY these four sections (use these exact headers):

## TEST SCENARIOS
Write 4-6 BDD-style test scenarios (Given/When/Then). Cover the happy path and key variants.

## PAGE OBJECT
Write a complete TypeScript Page Object class with:
- Locators as readonly properties using data-testid, role, or text selectors
- Action methods (fill, click, submit, etc.)
- Assertion helpers
Use Playwright best practices. Class name should match the feature.

## TEST FILE
Write a complete Playwright test file using the Page Object above:
- import { test, expect } from '@playwright/test'
- import the Page Object
- Use test.describe block
- Cover happy path + at least 2 edge cases
- Use fixtures correctly

## EDGE CASES
List 5-8 edge cases and error scenarios to test. Be specific to this feature.`

  const raw = await aiText(prompt, 'You are a Playwright expert. Write clean, realistic TypeScript. Use modern Playwright APIs. Be specific to the actual user story — no generic boilerplate.')

  const extract = (header: string, nextHeader: string) => {
    const start = raw.indexOf(`## ${header}`)
    if (start === -1) return ''
    const end = nextHeader ? raw.indexOf(`## ${nextHeader}`) : raw.length
    return raw.slice(start + header.length + 4, end === -1 ? raw.length : end).trim()
  }

  return {
    scenarios:  extract('TEST SCENARIOS', 'PAGE OBJECT'),
    pageObject: extract('PAGE OBJECT',    'TEST FILE'),
    testFile:   extract('TEST FILE',      'EDGE CASES'),
    edgeCases:  extract('EDGE CASES',     ''),
  }
}
