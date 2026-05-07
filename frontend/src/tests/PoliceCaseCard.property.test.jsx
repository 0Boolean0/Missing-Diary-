/**
 * Property-Based Tests for PoliceCaseCard
 *
 * Feature: police-role-restriction
 * Property 7: PoliceCaseCard never renders admin controls
 * Validates: Requirements 5.6
 */

import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import PoliceCaseCard from '../components/PoliceCaseCard';

// Arbitraries for generating random case objects
const statusArb = fc.constantFrom('pending', 'verified', 'active', 'found', 'closed', 'rejected');

const caseArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 1, maxLength: 80 }),
  age: fc.oneof(fc.integer({ min: 1, max: 120 }), fc.constant(null)),
  last_seen_location: fc.string({ minLength: 1, maxLength: 200 }),
  status: statusArb,
  images: fc.oneof(
    fc.constant(null),
    fc.constant([]),
    fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 })
  ),
});

/**
 * Property 7: PoliceCaseCard never renders admin controls
 * Validates: Requirements 5.6
 *
 * For any case object passed to PoliceCaseCard, the rendered output SHALL NOT
 * contain approve, reject, request-info, audit, delete, or "I Saw Them" controls
 * (buttons or links with those labels) — regardless of the case's status or any
 * other field.
 *
 * Note: The status badge may legitimately display the case status value (e.g.
 * "rejected", "found"). The property targets interactive controls (buttons and
 * anchor/Link elements), not informational text like the status badge.
 */
describe('PoliceCaseCard — Property 7: never renders admin controls', () => {
  it('should not render any admin control buttons or links for any generated case object', () => {
    fc.assert(
      fc.property(caseArb, (generatedCase) => {
        const { container, unmount } = render(
          <MemoryRouter>
            <PoliceCaseCard item={generatedCase} onStatusUpdate={() => {}} />
          </MemoryRouter>
        );

        // Collect all interactive elements: buttons and anchor tags
        const buttons = Array.from(container.querySelectorAll('button'));
        const links = Array.from(container.querySelectorAll('a'));
        const interactiveElements = [...buttons, ...links];

        // Admin control keywords that must NOT appear as button/link labels
        const adminControlPatterns = [
          /^approve$/i,
          /^reject$/i,
          /^request.?info$/i,
          /^audit$/i,
          /^delete$/i,
          /i saw them/i,
        ];

        for (const el of interactiveElements) {
          const label = (el.textContent || '').trim();
          for (const pattern of adminControlPatterns) {
            if (pattern.test(label)) {
              unmount();
              throw new Error(
                `PoliceCaseCard rendered forbidden admin control "${label}" (matched "${pattern}") for case: ${JSON.stringify(generatedCase)}`
              );
            }
          }
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 8: PoliceCaseCard always renders required case information
 * Validates: Requirements 4.2
 *
 * For any case object passed to PoliceCaseCard, the rendered output SHALL contain
 * the missing person's name, age, last seen location, and a status badge element —
 * regardless of the specific values of those fields.
 */
describe('PoliceCaseCard — Property 8: always renders required case information', () => {
  // Generate case objects with non-empty name (at least one non-whitespace character),
  // numeric age, non-empty last_seen_location (at least one non-whitespace character),
  // and a valid status value.
  // We constrain name and last_seen_location to contain at least one non-whitespace
  // character so that the rendered text is reliably detectable in the DOM.
  const nonBlankStringArb = fc
    .string({ minLength: 1, maxLength: 80 })
    .filter((s) => s.trim().length > 0);

  const nonBlankLocationArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  const requiredFieldsCaseArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    name: nonBlankStringArb,
    age: fc.integer({ min: 1, max: 120 }),
    last_seen_location: nonBlankLocationArb,
    status: fc.constantFrom('pending', 'verified', 'active', 'found', 'closed', 'rejected'),
    images: fc.oneof(
      fc.constant(null),
      fc.constant([]),
      fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 })
    ),
  });

  it('should always render name, age, last_seen_location, and a status badge for any valid case object', () => {
    fc.assert(
      fc.property(requiredFieldsCaseArb, (generatedCase) => {
        const { container, unmount } = render(
          <MemoryRouter>
            <PoliceCaseCard item={generatedCase} onStatusUpdate={() => {}} />
          </MemoryRouter>
        );

        const bodyText = container.textContent || '';

        // Assert name is present in the rendered text
        if (!bodyText.includes(generatedCase.name)) {
          unmount();
          throw new Error(`Name "${generatedCase.name}" not found in rendered output`);
        }

        // Assert age is present in the rendered text (component renders "Age: {age}")
        if (!bodyText.includes(String(generatedCase.age))) {
          unmount();
          throw new Error(`Age "${generatedCase.age}" not found in rendered output`);
        }

        // Assert last_seen_location is present in the rendered text
        if (!bodyText.includes(generatedCase.last_seen_location)) {
          unmount();
          throw new Error(`last_seen_location "${generatedCase.last_seen_location}" not found in rendered output`);
        }

        // Assert status badge element is rendered — badge uses className `badge ${item.status}`
        const badgeEl = container.querySelector(`.badge.${generatedCase.status}`);
        if (!badgeEl) {
          unmount();
          throw new Error(`Status badge with class "badge ${generatedCase.status}" not found in rendered output`);
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
