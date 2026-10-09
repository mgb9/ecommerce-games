# Data Detective — screen-reader test script (VoiceOver)

About an hour. Run it once before release, and again after any change to the
diagnosis or reveal screens. It checks the things automated tools can't: that
what VoiceOver *says* makes sense, in the right order, at the right moment.

Automated checks (axe-core, contrast, reflow at 320 px, keyboard-only) were
last run on 8 October 2026 and passed; this script is the human half.

## Setup

- Mac, Safari (VoiceOver is tuned for Safari). Open
  https://mgb9.github.io/ecommerce-games/data-detective/ in a private window
  (so no saved progress), then add `?instructor` only for step 11.
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
| 2 | VO + U, Headings. | "Case inbox, heading level 1", "Before you start: rate yourself, heading level 2", "Cases, heading level 2", then twelve level-3 headings — one ticket subject per case — then "What these cases develop" and the WMG bar. | ☐ |
| 3 | Tab to "CRO" in the intro paragraph. VO + Space, then VO + →. Then Escape. | "CRO, button, collapsed" → "expanded" → the definition is read next → Escape: "collapsed", focus stays on CRO. | ☐ |
| 4 | First the rating: VO + Shift + ↓ into "…Find out why a business number changed, using data, group"; VO + → across the five radio buttons; pick one with VO + Space. Then "Skip for now" or rate all six and "Save my rating". Then move through the case list (VO + →). | Each statement is a group whose name is the statement; the radios read "1 of 5, Not at all confident, radio button" … "5 of 5, Completely confident". "Rate all six to save, dimmed button" until all six are rated. Then "List, 12 items". Each case reads its number, level, channel and sender, the ticket subject, then its status as words ("Next up", "Not played yet") and a button "Open case 01 →". After finishing a case: "First attempt 3/4" (and "fully right" when it was), then "Replay case 01 →". | ☐ |
| 5 | Activate "Open case 01". Read to the end of the page (VO + A), then activate "Open the dashboard". | Focus moves to "Something is off in the numbers. Find out what., heading level 1"; "← All cases, button" comes before it. At the end: "What this case develops, heading level 2", a list of the learning outcomes in full ("LO3 … Critically evaluate advanced eCommerce functionalities…", "LO1 · partly …"), then a link ending "(opens in a new tab)". Then focus moves to "Analytics, heading level 2" — not left on a button that has gone. | ☐ |
| 6 | VO + U, Landmarks → "Reports". Move through it. | "Reports, navigation"; the open report says "current page"; opened reports add "(opened)". | ☐ |
| 7 | Open "Checkout by payment". VO + U, Headings → "Payment method — conversion rate". Next item. | The "View by" group: four toggle buttons, "Conversion rate" selected. Then the chart: "Line chart of daily conversion rate, one line per segment: Card, PayPal, Apple Pay, Bank transfer. … The table below gives each one's figures., image". | ☐ |
| 8 | In "View by", activate "Avg order value". | "Avg order value, toggle button, selected". The heading is now "Payment method — avg order value" and the chart's description says "daily avg order value". Opening another report keeps this choice. | ☐ |
| 9 | Move into the table (VO + Shift + ↓). Activate the "Δ" header, then read down a column. | Headers are "button"s; after activating: "sorted descending" (then "ascending"). The group above Was / Now / Δ is "Avg order value". Each row starts with its segment name as a row header, so cells read as e.g. "PayPal, Now, £41.20". | ☐ |
| 10 | Open "Region", then choose Secondary dimension "Age". | A combo box "Add a secondary dimension…". After choosing: one image, "30 small line charts of daily … one per combination, on a shared scale from 0 to …", and no list of 30 separate charts. The table below has 30 rows. | ☐ |
| 11 | Reload with `?instructor`. Activate "Instructor". Press Tab repeatedly, then Escape. | "Instructor, dialog"; focus starts in "Seed, edit text"; Tab cycles inside the dialog only; "Close, button" is named; Escape closes and focus returns to "Instructor". Also try it from the inbox: its link says it "Opens the case inbox". | ☐ |
| 12 | Open "🧾 Back-office orders". | Three tiles read as label + value + change; the chart reads as an image with both percentages in its description. | ☐ |
| 13 | Activate "Submit diagnosis". Move through the form. | Focus on "Submit your diagnosis, heading level 2". Each question reads as a group ("1 · Which dimension is the issue in?, group"); options are toggle buttons that say "selected" when chosen. | ☐ |
| 14 | Choose "None — nothing is broken". | Question 2 now says "Nothing to pick…"; question 4 says "No start date…"; the combination question disappears. | ☐ |
| 15 | Choose a real dimension instead, then use the start-date slider (VO + Shift + ↓, then ←/→). | "4 · Roughly when did it start?, slider, Week 3, Wed — day 17 of 28" — a day, not a bare number. | ☐ |
| 16 | Pick a cause and "How sure are you", then "Submit diagnosis →". | Focus moves to the result: "2/4 correct, heading level 1" (or similar). VO + A reads the rows, then the confidence verdict ("You said: Very sure… Overconfident…"). "What actually happened" reads as four short labelled parts: "What happened", "What the data showed", "What wasn't the cause", "What should happen next" — and in Simpler English, in shorter sentences. | ☐ |
| 17 | Find "How you investigated", then "Skills you practised". | Each investigation line starts "Yes:" or "No:" (not just a tick or cross); in Case 08 one is about viewing the report "by average order value or revenue". "Skills you practised" is a list: each skill's name, its kind, then what you did ("You said very sure… and got 4 of 4: well calibrated."). | ☐ |
| 18 | Use the WMG bar's "Simpler English" switch. Go back to the intro (Try a fresh variant). | The headline is now "A number has changed. Find out why." The game has no second Simpler English button. | ☐ |
| 19 | From a reveal, activate "Open your case report (PDF)". Move through it, then Tab to the name field, the reply box, its four check boxes and the answer boxes. | Focus on the report's title (heading level 1); sections are level-2 headings, including "What this case developed" and "Your reply to Priya"; the results table reads with row headers; the name field, "Your reply to Priya, edit text" and each reflection question are labelled; "Check your reply, group" holds four labelled check boxes ("It says what happened…, check box, unchecked"); "Save as PDF, button". | ☐ |
| 20 | Save the report as a PDF (Safari: File → Export as PDF; or Chrome: Save as PDF), open it in Preview and turn VoiceOver on. | Headings, the results table and the lists are navigable in the PDF (Chrome produces a tagged PDF; Safari's may read as plain text — note which you tested). | ☐ |
| 21 | From a reveal, activate "Back to the case inbox", then "Open your case file →". | Back on the inbox, focus is on "Case inbox, heading level 1" and the finished case's status has changed. In the case file, focus is on "Your case file, heading level 1"; "Case by case", "Calibration", "Skills record", "For your CV or an interview", "Learning outcomes", "How you rate yourself" and "Share your results with your tutor" are level-2 headings; the tables have row headers (the case, what you said, the skill, the statement); calibration verdicts are words, not colours; "Rate yourself again, button" opens the six rating groups; "Your result code, edit text" (read-only) and "Copy, button", then "Copied." is announced. At the foot of the inbox: "What these cases develop, heading level 2", with LO2 "Not covered by this game" and LO4 "Assessed through the group Website Build". | ☐ |
| 22 | Open Case 09. Flag a row (the 🚩 button in the table). | "Flag Referral, toggle button" → after activating, "Unflag Referral, selected". While it loads: "Opening the 2015 archive…". | ☐ |
| 23 | Open Case 10 ("The Christmas plan"), then its "Product performance" report. | Its own ticket and claim read on the intro and overview; the report's rows read with the product name as the row header and "Qty / purchase" as a column; "Present your findings" has "1 · Your verdict on the plan, group". | ☐ |
| 24 | Reload with `?instructor`, activate "Instructor", then "Answer sheet for this seed". Then back, and "Cohort tally". | The answer sheet: "Seed DD-2026 · noise 1.4×, heading level 1", one level-2 heading per case 01–12, "Variant A — …, heading level 3" under each generated case, a small table with row headers (Answer, Where it shows, Real event). The tally: "Paste the cohort's result codes, one per line, edit text"; after pasting, "2 students · seed DD-2026, heading level 1" and the three tables; an unreadable line is announced ("1 line couldn't be read…"). | ☐ |
| 25 | From the instructor panel, activate "Tutor's guide — running and debriefing the cases". | Focus on "Running Data Detective with a cohort, heading level 1"; level-2 headings for "The cases at a glance", "Running a session", "Suggested sequences", "Debriefing a seminar", "Skills development", "Accessibility" and each case 01–12; the two tables are scrollable regions ("The cases at a glance (table)") with row headers; under each case, "Debrief questions" reads as a numbered list. | ☐ |

Optional, on an iPhone (Settings → Accessibility → VoiceOver): at phone width
the report list becomes a "Report" pop-up menu — check it opens and reads its
groups (Acquisition, Engagement, …).

## Afterwards

- Log each failure with the step number, what VoiceOver said, and what you
  expected. Fix, then re-run the failed steps.
- When everything passes, update `accessibility.html` → "Content not yet
  assessed": say Data Detective has been tested with VoiceOver on macOS
  (date, Safari version), and keep the line for the other games.
