# Data Detective — screen-reader test script (VoiceOver)

About an hour. Run it once before release, and again after any change to the
diagnosis or reveal screens. It checks the things automated tools can't: that
what VoiceOver *says* makes sense, in the right order, at the right moment.

Automated checks (axe-core, contrast, reflow at 320 px, keyboard-only) were
last run on 8 October 2026 and passed; this script is the human half.

## Setup

- Mac, Safari (VoiceOver is tuned for Safari). Open
  https://mgb9.github.io/ecommerce-games/data-detective/ in a private window
  (so no saved progress), then add `?instructor` only for step 9.
- Turn VoiceOver on/off: **Cmd + F5**. "VO" below means **Control + Option**.
- Useful keys: **VO + →/←** next/previous item · **VO + Space** activate ·
  **Tab** next control · **VO + U** rotor (headings, links, landmarks, form
  controls; ←/→ switches list) · **VO + Shift + ↓/↑** into/out of a group or
  table · **VO + A** read from here.
- For each step, tick **Pass** only if VoiceOver says (roughly) what's in
  *Expect*. Note anything confusing, silent or out of order — those are bugs
  even when the step "works".

## Steps

| # | Do | Expect | Pass |
|---|----|--------|------|
| 1 | Load the page. Press Tab once. | "Skip to main content, link". Activating it moves into the game. | ☐ |
| 2 | VO + U, Headings. | "Something is off in the numbers. Find out what., heading level 1", then the WMG bar. | ☐ |
| 3 | Tab to "CRO" in the intro paragraph. VO + Space, then VO + →. Then Escape. | "CRO, button, collapsed" → "expanded" → the definition is read next → Escape: "collapsed", focus stays on CRO. | ☐ |
| 4 | Tab to the case buttons. | "Case 01 · Beginner, toggle button, selected" (or "pressed"); other cases not selected. After finishing a case: "…, played, first attempt 3 of 4". | ☐ |
| 5 | Activate "Open the dashboard". | Focus moves to "Analytics, heading level 2" — not left on a button that has gone. | ☐ |
| 6 | VO + U, Landmarks → "Reports". Move through it. | "Reports, navigation"; the open report says "current page"; opened reports add "(opened)". | ☐ |
| 7 | Open "Checkout by payment". VO + U, Headings → "Payment method — conversion rate". Next item. | The chart: "Line chart of daily conversion rate, one line per segment: Card, PayPal, Apple Pay, Bank transfer. The table below gives each one's figures., image". | ☐ |
| 8 | Move into the table (VO + Shift + ↓). Activate the "Δ" header, then read down a column. | Headers are "button"s; after activating: "sorted descending" (then "ascending"). Each row starts with its segment name as a row header, so cells read as e.g. "PayPal, Now, 1.3%". | ☐ |
| 9 | Reload with `?instructor`. Activate "Instructor". Press Tab repeatedly, then Escape. | "Instructor, dialog"; focus starts in "Seed, edit text"; Tab cycles inside the dialog only; "Close, button" is named; Escape closes and focus returns to "Instructor". | ☐ |
| 10 | Open "🧾 Back-office orders". | Three tiles read as label + value + change; the chart reads as an image with both percentages in its description. | ☐ |
| 11 | Activate "Submit diagnosis". Move through the form. | Focus on "Submit your diagnosis, heading level 2". Each question reads as a group ("1 · Which dimension is the issue in?, group"); options are toggle buttons that say "selected" when chosen. | ☐ |
| 12 | Choose "None — nothing is broken". | Question 2 now says "Nothing to pick…"; question 4 says "No start date…"; the combination question disappears. | ☐ |
| 13 | Choose a real dimension instead, then use the start-date slider (VO + Shift + ↓, then ←/→). | "4 · Roughly when did it start?, slider, Week 3, Wed — day 17 of 28" — a day, not a bare number. | ☐ |
| 14 | Pick a cause and "How sure are you", then "Submit diagnosis →". | Focus moves to the result: "2/4 correct, heading level 1" (or similar). VO + A reads the rows, then the confidence verdict ("You said: Very sure… Overconfident…"). | ☐ |
| 15 | Find "How you investigated". | Each line starts "Yes:" or "No:" (not just a tick or cross). | ☐ |
| 16 | Use the WMG bar's "Simpler English" switch. Go back to the intro (Try a fresh variant). | The headline is now "A number has changed. Find out why." The game has no second Simpler English button. | ☐ |
| 17 | From a reveal, activate "Open your case report (PDF)". Move through it, then Tab to the name field and the answer boxes. | Focus on the report's title (heading level 1); sections are level-2 headings; the results table reads with row headers; the name field and each reflection question are labelled; "Save as PDF, button". | ☐ |
| 18 | Save the report as a PDF (Safari: File → Export as PDF; or Chrome: Save as PDF), open it in Preview and turn VoiceOver on. | Headings, the results table and the lists are navigable in the PDF (Chrome produces a tagged PDF; Safari's may read as plain text — note which you tested). | ☐ |
| 19 | Open Case 08. Flag a row (the 🚩 button in the table). | "Flag Referral, toggle button" → after activating, "Unflag Referral, selected". While it loads: "Opening the 2015 archive…". | ☐ |

Optional, on an iPhone (Settings → Accessibility → VoiceOver): at phone width
the report list becomes a "Report" pop-up menu — check it opens and reads its
groups (Acquisition, Engagement, …).

## Afterwards

- Log each failure with the step number, what VoiceOver said, and what you
  expected. Fix, then re-run the failed steps.
- When everything passes, update `accessibility.html` → "Content not yet
  assessed": say Data Detective has been tested with VoiceOver on macOS
  (date, Safari version), and keep the line for the other games.
