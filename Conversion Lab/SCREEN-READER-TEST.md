# Conversion Lab — screen-reader test script (VoiceOver)

About an hour. Run it once before release, and again after any change to the
bench, run or verdict screens. It checks the things automated tools can't: that
what VoiceOver *says* makes sense, in the right order, at the right moment.

Automated checks (axe-core on every screen of the built site, reflow at 320 px,
keyboard-only operation) were last run on 9 October 2026 and passed; this
script is the human half.

## Setup

- Mac, Safari (VoiceOver is tuned for Safari). Open
  https://mgb9.github.io/ecommerce-games/conversion-lab/ in a private window
  (so no saved progress), then add `?instructor` only for step 12.
- Turn VoiceOver on/off: **Cmd + F5**. "VO" below means **Control + Option**.
- Useful keys: **VO + →/←** next/previous item · **VO + Space** activate ·
  **Tab** next control · **VO + U** rotor (headings, links, form controls;
  ←/→ switches list) · **VO + Shift + ↓/↑** into/out of a group or table ·
  **VO + A** read from here.
- For each step, tick **Pass** only if VoiceOver says (roughly) what's in
  *Expect*. Note anything confusing, silent or out of order — those are bugs
  even when the step "works".

## Steps

| # | Do | Expect | Pass |
|---|----|--------|------|
| 1 | Load the page. VO + U, Headings. | One level-1 heading, "Design is a hypothesis. Prove it with data."; level-2 "A/B experiment set" and "Built on the CRO Stack". No "Instructor" button anywhere. | ☐ |
| 2 | Read the paragraph under the heading; activate "sample size". | "sample size, button, collapsed" → "expanded" and the definition is read next; Escape closes it. Then "Learning outcomes. LO2: Develop a comprehensive understanding…" is read as ordinary text. | ☐ |
| 3 | Use the WMG bar's "Simpler English" switch, then read the heading again. | "A design is only a guess. Use data to test it." The game has no second Simpler English button. Switch it back. | ☐ |
| 4 | Move to the experiment list and activate "01 The “Add to cart” button". | A list of 8 items. Focus lands on "The “Add to cart” button, heading level 1". | ☐ |
| 5 | Move through the bench (VO + →). | Two sections, "A · Control: Muted grey button" and "B · Challenger: …", each with a page mock-up read as an image. Then "1 · Form your hypothesis, heading level 2". | ☐ |
| 6 | Enter "Your predicted winner" (VO + Shift + ↓) and choose "B wins"; then "Predicted effect size…" and choose a band. | Each is a group named by its question; options are toggle buttons that say "selected" once chosen. | ☐ |
| 7 | In "2 · Plan the sample size", use the − / + buttons, then the "Sample size to run (per arm)" slider (VO + Shift + ↓, then ←/→). | "Decrease minimum detectable effect (now 1 percentage points), button"; the value is announced after each press. The slider reads "5,000 visitors per arm", not a bare number, and its hint is read. | ☐ |
| 8 | Activate "Run the test". Wait without moving. | Focus on "Running — The “Add to cart” button, heading level 1". VoiceOver stays quiet while the test runs, except perhaps "Now significant at … per arm, B leads", then says "Run complete at 5,000 per arm: significant… Make your call below." — once. | ☐ |
| 9 | Move to the two charts. | Each is an image: "Line chart of observed conversion rate by visitors per arm. At 5,000 per arm: control A …%, variant B …%." and "Line chart of the p-value … first fell below α at … per arm." | ☐ |
| 10 | Activate "B is the winner". VO + U, Headings. | Focus on the experiment's level-1 heading. Level-2 "What you observed…", "The hidden truth", "Your scorecard"; level-3 "Predicted winner", "Effect-size band", "Sound call — on the evidence", "Matched the truth" — each says "right", "off" or "not scored" in words. | ☐ |
| 11 | Activate "Show the full statistics", then the 🎓 lesson. Next experiment → play Experiment 2 to its verdict, choosing "Need more data". | The button says "expanded". The lesson is a heading (a glossary button) then two paragraphs; the second begins "Your run…". In Experiment 2, "If 200 teams ran this exact test…" is a level-4 heading over a 2-item list. "Matched the truth" says "not scored". | ☐ |
| 12 | Reload with `?instructor`. Activate "Instructor". Tab through, toggle "Allow peeking", then press Escape. | "Instructor, dialog"; focus starts in "Run seed, edit text"; Tab cycles inside; "Allow peeking (optional stopping), switch, off" → Space → "on"; sliders read "0.05", "80%", "20,000 visitors"; Escape closes and focus returns to "Instructor". | ☐ |
| 13 | With peeking on, run an experiment and activate "Stop and call it now" partway. | The verdict's observation heading says "(stopped early)". If a winner was named, "Sound call" is "off" with "You stopped before your planned sample…". | ☐ |
| 14 | Finish the set; on the calibration report, move into the table (VO + Shift + ↓) and read a row. | "Experiment results (table), scrollable region". Each row starts with the experiment as a row header; "Sound?" and "Matched truth?" cells say "yes", "no" or "no claim". | ☐ |
| 15 | Back on the intro, activate "Which Test Won?". Answer the three groups and "Lock it in". | Focus on "Guest checkout, heading level 1". Three named groups; after "Lock it in", focus moves to "Whatever the result — which principle best explains it?, heading level 2". | ☐ |
| 16 | Pick a principle and "Reveal the result". | Focus on the points heading (e.g. "+3 points, heading level 2"); three scorecards read the chosen mechanism's *text*, not "Option 1". | ☐ |
| 17 | Open the Wireframe Studio; choose a brief. | Brief cards are buttons in a list. Focus on "Build the page, heading level 1"; "Components · weight in ms", "Your page (top → bottom)", "Design review" are level-2 headings. | ☐ |
| 18 | Add a component, then use its ↑ / ↓ / ✕ buttons in "Your page". | Components are toggle buttons ("Star reviews, 180 milliseconds, toggle button", "selected" when on the page). Page items read "Product title, position 2, above the fold"; buttons say "Move Product title up". | ☐ |
| 19 | Read the design review. | "Grade B, image"; each check reads its label, then "— passes / partly / fails", then its tip. | ☐ |
| 20 | Set your hypothesis and run the test. | Focus on "Commit your hypothesis, heading level 1", three named groups; then on the verdict heading ("Inconclusive" / "Significant win"…), with "Your scorecard" and three scorecards. | ☐ |
| 21 | Reload the page on any screen. | You come back to the same screen (mid-run: the completed run, at the call bar), and focus is on its heading. | ☐ |
| 22 | In a fresh private window, load the page and move to "Before you start: how do you rate yourself?". | A level-2 heading, then six groups, each named by its statement ("…Plan an A/B test big enough…, group"); options read "4 of 5, Very, radio button". "Rate all six to save, dimmed button" until all are answered; "Skip for now, button". | ☐ |
| 23 | Open an experiment and move to the end of the bench. | "What this experiment develops, heading level 2", then a list of outcomes ("LO3 Critically evaluate…"), the syllabus and skills as text, and a link "All the module's learning outcomes — WM956-15 in the Warwick module catalogue, opens in a new tab". | ☐ |
| 24 | On a verdict, find "Your recommendation to the design team". Type two sentences, then tick two checks. | A level-2 heading; "Your recommendation to the design team, edit text"; "Check your recommendation, group" with four labelled check boxes; "Saved in this browser · 2 of 4 checks ticked." is announced once. Then "Skills you practised, heading level 2" and a list. | ☐ |
| 25 | From the intro (or the calibration report), activate "Your experiment log". Move through it, then Tab to the name field and "Copy". | Focus on "Your experiment log, heading level 1"; level-2 headings "Experiment by experiment…", "How your judgement held up", "Your recommendations", "Skills record", "For your CV or an interview", "Learning outcomes", "Using this in your assessment", "How you rate yourself", "Share your results with your tutor"; the table has row headers; "Sound?" cells say yes / no / no claim; "Your result code, edit text" (read-only); "Copied." is announced. | ☐ |
| 26 | With `?instructor`, open Instructor → "Cohort tally". Paste two codes and a bad line. Then back, and Instructor → "Tutor's guide". | The tally: "Paste the cohort's result codes, one per line, edit text"; after pasting, "2 students · seed …, heading level 1", an alert ("1 line couldn't be read…"), and tables with row headers. The guide: "Running Conversion Lab with a cohort, heading level 1", a level-2 heading per section and per experiment, and the quiz answers as a table. | ☐ |

Optional, on an iPhone (Settings → Accessibility → VoiceOver): the bench's two
columns become one, and the wireframe's three panels stack.

## Afterwards

- Log each failure with the step number, what VoiceOver said, and what you
  expected. Fix, then re-run the failed steps.
- When everything passes, update `accessibility.html` → "Content not yet
  assessed": say Conversion Lab has been tested with VoiceOver on macOS
  (date, Safari version).
