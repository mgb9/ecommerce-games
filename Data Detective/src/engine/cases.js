/* ============================================================
   DATA DETECTIVE — the case file (content only; the mechanics are in
   engine.js). Each case teaches one diagnostic move and has several
   VARIANTS: the seed picks one, so different seeds break different
   segments on different days and a cohort can't pass the answer round
   ("it's PayPal on day 18") — while a shared seed still gives a whole
   class the same variant for a joint debrief.

   A variant holds everything that changes with the answer: the ticket,
   the incident, session shifts, calendar effects, the dated events and
   the truth (with its explanation). The case's `lesson` is shared.

   Every magnitude an explanation or ticket quotes is pinned against the
   generated data, per variant, in engine.test.js ("case narratives match
   the generated data") — change a number here and that test says where.

   An explanation is four short parts — what happened, what the data
   showed, what wasn't the cause, what should happen next — each with a
   `plain` version in shorter sentences for the Simpler English setting.

   Event labels are deliberately oblique: a real changelog entry wouldn't
   pre-name the dimension, segment or cause for you (also tested).
   ============================================================ */

const OPS = { channel: "#cro-team", from: "Priya · Ops" };
const GROWTH = { channel: "#cro-team", from: "Dev · Growth Lead" };
const days = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const CASES = [
  /* ---- 1 · Beginner: one payment route fails ---------------------- */
  {
    id: "paypal-gateway", n: 1, difficulty: "Beginner", title: "Is checkout broken?",
    words: ["segmentation", "gateway", "redherring", "funnelstep"],   // glossary terms for the case report
    // what this case develops: learning outcomes (LO3 always; `partly` = touched,
    // not central), syllabus topic, skills with what practising them looked like
    // here, and an evidence line for a CV — see outcomes.js
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Operations: payment processing"],
      skills: {
        research: "Segmenting by payment method to find that one route through checkout had failed.",
        critical: "Ruling out the campaign and the maintenance window that lined up with the drop.",
        operations: "Recognising a payment-gateway failure from its pattern: one method, a sudden cliff, the Purchase step.",
      },
      cv: "Diagnosed a sitewide revenue drop as a single failing payment method, by segmenting checkout data and ruling out coincident marketing activity (case-based analytics simulation).",
    },
    lesson: "Segment before you blame “checkout”: one payment method failing can sink the whole funnel while every other route through it is fine — and the event that lines up best on the timeline is not automatically the cause.",
    variants: [
      {
        ticket: { ...OPS, subject: "Checkout looks broken?", body: "Revenue is down 15–20% on a normal week and finance is asking. A few customers are saying payment \"didn’t go through\". Can someone confirm whether checkout is actually broken — and for everyone, or just some people?" },
        // Moderate, not catastrophic: the aggregate effect has to be found,
        // not glanced at.
        incident: { dimension: "payment", segment: "paypal", type: "rate", shape: "cliff", startDay: 18, factor: 0.35, stage: "purchase" },
        sessionShiftEvents: [{ dimension: "source", segment: "email", days: [18, 19, 20], factor: 1.45 }],
        events: [
          { day: 16, label: "Database maintenance window completed", real: false },
          { day: 18, label: "Backend infrastructure patch deployed to production", real: true },
          { day: 18, label: "Spring marketing campaign launched", real: false },
        ],
        truth: {
          dimension: "payment", segment: "paypal", startDay: 18, shape: "cliff", causeType: "gateway_failure",
          explanation: {
          what: "The 'backend infrastructure patch' was really a PayPal integration update, and it broke payment for many customers paying with PayPal.",
          data: "PayPal's conversion rate fell by about two-thirds from day 18, while every other payment method moved only within its usual week-to-week wobble (small ones such as bank transfer wobble most, because they have few orders). PayPal handles about a quarter of checkouts, so this one failure explains the whole revenue drop. Filtered to PayPal, the funnel pins the loss to the Purchase step.",
          herrings: "The marketing campaign was real and did bring in more email visitors, but they converted at the normal rate, so the campaign was not the cause. The database maintenance two days earlier changed nothing in the data.",
          next: "Roll back or fix the PayPal integration, confirm it against the gateway's own logs, and add an alert on conversion by payment method so the next failure is caught in hours, not a week.",
          plain: { what: "The 'backend infrastructure patch' was an update to the PayPal connection. It broke payment for many customers who chose PayPal.", data: "From day 18, PayPal's conversion rate fell by about two-thirds. Every other payment method stayed within its normal range. (Small methods, like bank transfer, move more from week to week because they have few orders.) PayPal is about one in four checkouts, so this one problem explains the whole drop in revenue. The funnel, filtered to PayPal, shows the loss at the Purchase step.", herrings: "The marketing campaign was real. It brought more visitors from email. But those visitors bought at the normal rate, so the campaign did not cause the drop. The database maintenance two days earlier changed nothing.", next: "Fix or undo the PayPal update. Check the gateway's own logs. Add an alert on conversion rate by payment method, so the next failure is found in hours." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Payments failing for some customers?", body: "Revenue is down 10–15% on a normal week. Customer service has had a handful of complaints that payment \"just spins and never finishes\", but most orders are going through fine. Is checkout broken — and if so, for whom?" },
        incident: { dimension: "payment", segment: "applepay", type: "rate", shape: "cliff", startDay: 17, factor: 0.05, stage: "purchase" },
        sessionShiftEvents: [{ dimension: "source", segment: "email", days: [17, 18, 19], factor: 1.45 }],
        events: [
          { day: 15, label: "Database maintenance window completed", real: false },
          { day: 17, label: "Security certificates rotated across production services", real: true },
          { day: 17, label: "Spring marketing campaign launched", real: false },
        ],
        truth: {
          dimension: "payment", segment: "applepay", startDay: 17, shape: "cliff", causeType: "gateway_failure",
          explanation: {
          what: "The certificate rotation missed one certificate: the one Apple Pay uses to identify Chrichton as a merchant. From day 17 almost every Apple Pay payment failed.",
          data: "Apple Pay's conversion rate collapsed by more than 90%, while card, PayPal and bank transfer moved only within their usual week-to-week wobble. Apple Pay handles only about one checkout in eight, which is why the sitewide drop is a moderate 10–15% rather than a crash — and why it is easy to dismiss. Filtered to Apple Pay, the funnel pins the loss to the Purchase step.",
          herrings: "The marketing campaign was real and did bring in more email visitors, but they converted at the normal rate. The database maintenance two days earlier changed nothing in the data.",
          next: "Renew the missing certificate, confirm it against Apple Pay's own error logs, and add a checklist step so the next rotation covers every payment provider.",
          plain: { what: "The certificate update missed one certificate: the one Apple Pay uses to recognise Chrichton. From day 17 almost every Apple Pay payment failed.", data: "Apple Pay's conversion rate fell by more than 90%. Card, PayPal and bank transfer stayed within their normal range. Apple Pay is only about one checkout in eight. That is why the sitewide drop is a moderate 10–15%, not a crash — and why it is easy to ignore. The funnel, filtered to Apple Pay, shows the loss at the Purchase step.", herrings: "The marketing campaign was real. It brought more visitors from email, but they bought at the normal rate. The database maintenance two days earlier changed nothing.", next: "Renew the missing certificate. Check Apple Pay's own error logs. Add a step to the checklist so the next update covers every payment provider." },
        },
        },
      },
    ],
  },

  /* ---- 2 · Intermediate: a fault that lives in an intersection ---- */
  {
    id: "mobile-safari-bug", n: 2, difficulty: "Intermediate", title: "Soft for two weeks, nobody knows why",
    words: ["crosstab", "segmentation", "funnelstep", "redherring"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Design principles: website design best practices"],
      skills: {
        research: "Cross-tabulating two dimensions to isolate a fault that lived only in their intersection.",
        critical: "Seeing that two reports that each looked a little off were halves of one problem.",
        conversion: "Pinning the loss to one step of the funnel, for one device and browser combination.",
      },
      cv: "Isolated a conversion fault affecting a single device and browser combination by cross-tabulating analytics reports (case-based analytics simulation).",
    },
    lesson: "Interaction effects hide in single-dimension reports. When two dimensions each look “a bit off”, cross-tab them: the real fault may live only in their intersection, diluted everywhere else.",
    variants: [
      {
        ticket: { ...OPS, subject: "Conversion is slowly falling — we cannot identify the cause", body: "Nothing looks badly broken, but conversion has been lower for about two weeks, and revenue is behind target. Marketing says it is just the market. Engineering says nothing important changed. We need a clear answer for the board report." },
        incident: { type: "rate-joint", dimA: "device", segA: "mobile", dimB: "browser", segB: "safari", shape: "cliff", startDay: 16, factor: 0.08, stage: "atc" },
        // A real, debunkable red herring: paid-search session share dips for
        // a few days (a volume effect with no conversion-quality story).
        sessionShiftEvents: [{ dimension: "source", segment: "paidsearch", days: [14, 15, 16], factor: 0.65 }],
        events: [
          { day: 14, label: "Competitor launched a price-match guarantee", real: false },
          { day: 16, label: "Frontend release v4.2 shipped", real: true },
          { day: 16, label: "Q2 brand refresh announced internally", real: false },
        ],
        truth: {
          dimension: "device", segment: "mobile", secondary: "browser", segmentB: "safari", startDay: 16, shape: "cliff", causeType: "deploy_bug",
          explanation: {
          what: "Release v4.2 changed the checkout layout. This broke the 'Add to cart' button, but only in the Safari browser on mobile phones — a common kind of bug: not Safari on desktop, and not Chrome or Firefox on phones.",
          data: "If you check Device on its own, Mobile is down about a fifth — a real drop, but nowhere near a broken checkout, because three in four mobile visitors use other browsers and were not affected. If you check Browser on its own, Safari is down about a third, because about half of Safari visitors are on desktop and were fine. Each single report points at half of the answer, and either half on its own is the wrong diagnosis. Only the Device × Browser cross-tab isolates Mobile plus Safari, where conversion fell by around 90% while every other combination moved only within its normal wobble. Filtered to that cell, the funnel pins the loss to Add to cart.",
          herrings: "The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally — a change in volume, not quality. The internal brand-refresh announcement had no effect on customers.",
          next: "Fix the button for Safari on iOS, add that combination to the pre-release checks, and monitor conversion by device × browser rather than by either alone.",
          plain: { what: "Release v4.2 changed the checkout layout. It broke the 'Add to cart' button, but only in Safari on mobile phones. Safari on desktop was fine. Chrome and Firefox on phones were fine.", data: "In the Device report, Mobile is down about a fifth. That is a real drop, but not a broken checkout, because three in four mobile visitors use other browsers. In the Browser report, Safari is down about a third, because about half of Safari visitors are on desktop and were fine. Each report shows half of the answer. Only the Device × Browser cross-tab shows Mobile plus Safari, where conversion fell by about 90%. Every other combination stayed within its normal range. The funnel, filtered to that combination, shows the loss at Add to cart.", herrings: "The competitor's price-match offer was real. It took some paid-search visitors away. But the visitors who stayed bought at the normal rate. The internal brand-refresh announcement had no effect on customers.", next: "Fix the button for Safari on iOS. Add that combination to the checks before each release. Watch conversion by device × browser, not just by one of them." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Conversion has been soft for two weeks — nobody can say why", body: "Conversion has been lower for about two weeks and revenue is behind target. Nothing looks broken on any of our phones, marketing says it is the market, and engineering says nothing important changed. We need a clear answer for the board report." },
        incident: { type: "rate-joint", dimA: "device", segA: "desktop", dimB: "browser", segB: "safari", shape: "cliff", startDay: 15, factor: 0.12, stage: "checkout" },
        sessionShiftEvents: [{ dimension: "source", segment: "paidsearch", days: [13, 14, 15], factor: 0.65 }],
        events: [
          { day: 13, label: "Competitor launched a price-match guarantee", real: false },
          { day: 15, label: "Frontend release v4.2 shipped", real: true },
          { day: 15, label: "Q2 brand refresh announced internally", real: false },
        ],
        truth: {
          dimension: "device", segment: "desktop", secondary: "browser", segmentB: "safari", startDay: 15, shape: "cliff", causeType: "deploy_bug",
          explanation: {
          what: "Release v4.2 replaced the delivery-date picker in checkout, and the new picker failed in Safari on Mac desktops: customers could not choose a delivery slot, so they could not complete checkout. Phones were fine, which is why nobody on the team could reproduce it.",
          data: "If you check Device on its own, Desktop is down about a fifth — a real drop, but three in four desktop visitors use other browsers and were fine. If you check Browser on its own, Safari is down by about half, because about half of Safari visitors are on desktop — tempting, but naming Safari alone is the wrong diagnosis: Safari on phones and tablets was fine. Only the Device × Browser cross-tab isolates Desktop plus Safari, where conversion fell by more than 80% while every other combination moved only within its normal wobble. Filtered to that cell, the funnel pins the loss to Checkout.",
          herrings: "The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally. The internal brand-refresh announcement had no effect on customers.",
          next: "Fix the date picker for Safari on macOS, test releases on the browser and device combinations customers actually use, and monitor conversion by device × browser.",
          plain: { what: "Release v4.2 replaced the delivery-date picker in checkout. The new picker failed in Safari on Mac desktop computers. Customers could not choose a delivery slot, so they could not finish checkout. Phones were fine, so nobody on the team could see the problem.", data: "In the Device report, Desktop is down about a fifth. That is a real drop, but three in four desktop visitors use other browsers and were fine. In the Browser report, Safari is down by about half, because about half of Safari visitors are on desktop. Naming Safari alone is wrong: Safari on phones and tablets was fine. Only the Device × Browser cross-tab shows Desktop plus Safari, where conversion fell by more than 80%. Every other combination stayed within its normal range. The funnel, filtered to that combination, shows the loss at Checkout.", herrings: "The competitor's price-match offer was real. It took some paid-search visitors away, but those who stayed bought at the normal rate. The internal brand-refresh announcement had no effect on customers.", next: "Fix the date picker for Safari on Mac. Test each release on the browsers and devices customers really use. Watch conversion by device × browser." },
        },
        },
      },
    ],
  },

  /* ---- 3 · Intermediate: the average falls, nothing broke --------- */
  {
    id: "traffic-mix", n: 3, difficulty: "Intermediate", title: "More visitors, lower conversion",
    words: ["mixshift", "conversion", "segmentation", "redherring"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: [], syllabus: ["Digital marketing: audience-first marketing"],
      skills: {
        critical: "Seeing that the average fell because the mix of visitors changed while no group's own rate did (Simpson's paradox).",
        organisation: "Taking the finding to whoever runs the campaign, not to engineering.",
        conversion: "Separating the quality of the traffic from the performance of the site.",
      },
      cv: "Showed that a fall in sitewide conversion came from a change in traffic mix, not a site fault, by comparing each segment's own conversion rate (case-based analytics simulation).",
    },
    lesson: "If no segment's own rate moved, nothing broke. A falling average can be pure mix shift (Simpson's paradox) — a conversation about traffic quality with marketing, not a bug hunt with engineering.",
    variants: [
      {
        ticket: { ...GROWTH, subject: "Conversion is down but the site looks fine", body: "Sitewide conversion has slipped over the last week and revenue is behind, but nobody has touched the checkout and error rates are normal. We did just scale up a new paid-social campaign. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence." },
        // No rate incident anywhere: session shifts only.
        incident: null,
        sessionShiftEvents: [
          { dimension: "source", segment: "paidsocial", days: days(17, 27), factor: 2.8 },
          { dimension: "source", segment: "organic", days: days(17, 27), factor: 0.72 },
        ],
        events: [
          { day: 15, label: "Checkout microcopy A/B test started", real: false },
          { day: 17, label: "Paid-social budget increased ~3× (new short-video campaign)", real: true },
          { day: 19, label: "Analytics SDK updated to v9", real: false },
        ],
        truth: {
          dimension: "source", segment: "paidsocial", startDay: 17, shape: "cliff", causeType: "traffic_quality",
          explanation: {
          what: "Nothing on the site broke. A 3× paid-social push flooded the site with low-intent visitors, and at the same time organic — your best-converting source — dipped. What changed is the MIX of traffic.",
          data: "Check any traffic source's own conversion rate — including paid social's — and none of them fell by more than its ordinary week-to-week wobble. Paid social converts far below organic and email, so more of it and less organic gives a lower average: the sitewide rate fell only because the composition of traffic got worse. This is a mix shift (a Simpson's-paradox effect): the aggregate moves even though no underlying group did. The funnel, wherever you filter it, shows no single broken step.",
          herrings: "The trap is to go hunting for a broken segment; the honest finding is that there is none. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
          next: "Take it to marketing, not engineering: judge the paid-social campaign on the revenue and margin it brings, not on sessions, and tighten its targeting.",
          plain: { what: "Nothing on the site broke. A paid-social campaign three times bigger brought many visitors who did not plan to buy. At the same time, organic search — the best-converting source — dipped. The mix of visitors changed.", data: "Look at each traffic source's own conversion rate. None of them fell more than its normal range — not even paid social's. Paid social converts much less than organic and email. More paid social and less organic gives a lower average. The sitewide rate fell only because the mix got worse. This is called a mix shift, or Simpson's paradox: the total moves even though no group did. The funnel shows no broken step, wherever you filter it.", herrings: "The trap is to search for a broken group. There is none. The checkout A/B test and the analytics update happened at the same time but changed nothing.", next: "Take this to marketing, not engineering. Judge the paid-social campaign by the revenue and profit it brings, not by visits. Improve its targeting." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "Busier search ads, lower conversion — is the site broken?", body: "Sitewide conversion has slipped over the last week and revenue is behind, but nobody has touched the checkout and error rates are normal. We did just switch our search ads to a broad-match strategy to grow volume. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence." },
        incident: null,
        sessionShiftEvents: [
          { dimension: "campaign", segment: "generic", days: days(16, 27), factor: 3.0 },
          { dimension: "campaign", segment: "brand", days: days(16, 27), factor: 0.8 },
        ],
        events: [
          { day: 14, label: "Checkout microcopy A/B test started", real: false },
          { day: 16, label: "Search ads switched to broad match (budget ~3×)", real: true },
          { day: 18, label: "Analytics SDK updated to v9", real: false },
        ],
        truth: {
          dimension: "campaign", segment: "generic", startDay: 16, shape: "cliff", causeType: "traffic_quality",
          explanation: {
          what: "Nothing on the site broke. Switching search ads to broad match roughly tripled generic, non-brand search visits: people who typed loosely related phrases, many of whom were never going to buy. Brand search's share fell at the same time. What changed is the MIX of traffic.",
          data: "Check any campaign's own conversion rate — including generic search's — and none of them fell by more than its ordinary week-to-week wobble. Generic search converts well below brand search and retargeting, so the sitewide rate fell only because the composition of traffic got worse: a mix shift (a Simpson's-paradox effect). The funnel shows no single broken step.",
          herrings: "The trap is to go hunting for a broken segment; the honest finding is that there is none. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
          next: "Take it to whoever runs paid search: judge broad match on revenue per pound spent, add negative keywords, and report conversion by campaign alongside the sitewide figure.",
          plain: { what: "Nothing on the site broke. The search ads were changed to 'broad match'. That roughly tripled visits from generic, non-brand searches — people who typed loosely related words, many of whom were never going to buy. Brand search's share fell at the same time. The mix of visitors changed.", data: "Look at each campaign's own conversion rate. None of them fell more than its normal range — not even generic search's. Generic search converts much less than brand search and retargeting. So the sitewide rate fell only because the mix got worse. This is a mix shift (Simpson's paradox). The funnel shows no broken step.", herrings: "The trap is to search for a broken group. There is none. The checkout A/B test and the analytics update happened at the same time but changed nothing.", next: "Take this to whoever runs paid search. Judge broad match by revenue per pound spent. Add negative keywords. Report conversion by campaign next to the sitewide number." },
        },
        },
      },
    ],
  },

  /* ---- 4 · Advanced: a real fault hidden by good news ------------- */
  {
    id: "masked-desktop", n: 4, difficulty: "Advanced", title: "A dip that feels too small",
    words: ["masking", "mixshift", "segmentation"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation"],
      skills: {
        research: "Segmenting a calm topline anyway, and finding a serious fault underneath it.",
        critical: "Treating good news that arrived with a dip as possible camouflage.",
        conversion: "Separating a favourable shift in customer mix from a real fall in one device's conversion.",
      },
      cv: "Found a serious device-specific checkout fault hidden by a favourable change in customer mix (case-based analytics simulation).",
    },
    lesson: "A calm topline does not mean nothing is wrong. A favourable mix shift can mask a severe localised fault — segment anyway, and treat good news that arrives with a dip as possible camouflage.",
    variants: [
      {
        ticket: { ...OPS, subject: "Small dip, but revenue feels worse than it should", body: "Sitewide conversion is only down a few percent — well within what we'd normally call noise — and returning-customer numbers are actually up after our loyalty push, so most of the team thinks we're fine. But a few customers mentioned checkout looked odd. Can you confirm there's really nothing wrong?" },
        incident: { dimension: "device", segment: "desktop", type: "rate", shape: "cliff", startDay: 18, factor: 0.72, stage: "checkout" },
        sessionShiftEvents: [
          { dimension: "userType", segment: "returning", days: days(18, 27), factor: 2.2 },
          { dimension: "source", segment: "email", days: days(18, 27), factor: 1.8 },
        ],
        events: [
          { day: 16, label: "Quarterly loyalty email blast sent to existing customers", real: false },
          { day: 18, label: "Checkout layout refactor deployed to production", real: true },
          { day: 20, label: "New homepage hero banner published", real: false },
        ],
        truth: {
          dimension: "device", segment: "desktop", startDay: 18, shape: "cliff", causeType: "deploy_bug",
          explanation: {
          what: "There is a real, serious incident — it is just hidden. The checkout refactor broke conversion on desktop from day 18.",
          data: "The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the desktop collapse. Segment by device and the pattern is unmistakable: mobile is UP, typically by 10–20%, carried by the returning-customer surge (tablet is a small segment, so its figure swings either way), while desktop is DOWN by about a fifth despite that same tailwind — so the bug itself cut desktop conversion by more than a quarter. Filtered to desktop, the funnel pins the loss to Checkout.",
          herrings: "The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
          next: "Roll back or fix the desktop checkout, and estimate the loss against what the loyalty surge should have delivered — not against last week's flat topline.",
          plain: { what: "There is a real, serious problem — but it is hidden. The checkout change broke conversion on desktop from day 18.", data: "The sitewide number barely moved. That is because the loyalty email in the same week brought a surge of returning customers and email visitors. Both groups buy much more than average. That lifted conversion on every device and hid the desktop collapse. Look at the Device report: mobile is UP, usually by 10–20%, because of the returning-customer surge. (Tablet is a small group, so its number swings either way.) Desktop is DOWN by about a fifth, even with that same help — so the bug itself cut desktop conversion by more than a quarter. The funnel, filtered to desktop, shows the loss at Checkout.", herrings: "The team saw the surge of returning users as good news. It was really hiding the problem. The loyalty email and the surge were real, but they were not the cause. The homepage banner had no effect.", next: "Fix or undo the desktop checkout change. Measure the loss against what the loyalty surge should have brought in — not against last week's flat total." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Revenue feels soft, but the numbers say we're fine", body: "Sitewide conversion is only down a few percent — well within what we'd normally call noise — and returning-customer numbers are up after our loyalty push, so most of the team thinks we're fine. But a couple of customers complained that checkout 'froze'. Can you confirm there's really nothing wrong?" },
        incident: { dimension: "device", segment: "mobile", type: "rate", shape: "cliff", startDay: 17, factor: 0.55, stage: "checkout" },
        sessionShiftEvents: [
          { dimension: "userType", segment: "returning", days: days(17, 27), factor: 2.2 },
          { dimension: "source", segment: "email", days: days(17, 27), factor: 1.8 },
        ],
        events: [
          { day: 15, label: "Quarterly loyalty email blast sent to existing customers", real: false },
          { day: 17, label: "Checkout layout refactor deployed to production", real: true },
          { day: 19, label: "New homepage hero banner published", real: false },
        ],
        truth: {
          dimension: "device", segment: "mobile", startDay: 17, shape: "cliff", causeType: "deploy_bug",
          explanation: {
          what: "There is a real, serious incident — it is just hidden. The checkout refactor broke conversion on mobile phones from day 17.",
          data: "The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the mobile collapse. Segment by device and the pattern is unmistakable: desktop is UP, typically by 10–15%, carried by the returning-customer surge (tablet is a small segment, so its figure swings either way), while mobile is DOWN by more than a third despite that same tailwind — so the bug itself cut mobile conversion almost in half. Filtered to mobile, the funnel pins the loss to Checkout.",
          herrings: "The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
          next: "Roll back or fix the mobile checkout, and estimate the loss against what the loyalty surge should have delivered — not against last week's flat topline.",
          plain: { what: "There is a real, serious problem — but it is hidden. The checkout change broke conversion on mobile phones from day 17.", data: "The sitewide number barely moved. That is because the loyalty email in the same week brought a surge of returning customers and email visitors. Both groups buy much more than average. That lifted conversion on every device and hid the mobile collapse. Look at the Device report: desktop is UP, usually by 10–15%, because of the returning-customer surge. (Tablet is a small group, so its number swings either way.) Mobile is DOWN by more than a third, even with that same help — so the bug itself cut mobile conversion almost in half. The funnel, filtered to mobile, shows the loss at Checkout.", herrings: "The team saw the surge of returning users as good news. It was really hiding the problem. The loyalty email and the surge were real, but they were not the cause. The homepage banner had no effect.", next: "Fix or undo the mobile checkout change. Measure the loss against what the loyalty surge should have brought in — not against last week's flat total." },
        },
        },
      },
    ],
  },

  /* ---- 5 · Intermediate: a slow bleed, not a cliff --------------- */
  {
    id: "stockout-slow-bleed", n: 5, difficulty: "Intermediate", title: "The slow leak",
    words: ["funnelstep", "baseline", "anomaly"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: [], syllabus: ["Operations"],
      skills: {
        research: "Reading the shape of the change — a slide, not a cliff — to narrow down the cause.",
        problem: "Dating a gradual onset, where there is no single bad day.",
        operations: "Recognising a stock problem from where, and how, conversion fell.",
      },
      cv: "Traced a gradual fall in conversion to stock running out on a best-selling range, using the shape of the decline and funnel analysis (case-based analytics simulation).",
    },
    lesson: "Shape tells cause. A sudden cliff points to something that broke; a slow slide that keeps getting worse points to something running out or wearing down — stock, budget, patience. Find where it lives, then read its shape.",
    variants: [
      {
        ticket: { ...OPS, subject: "Slow leak — conversion sliding for two weeks", body: "There's no single bad day, but conversion has slid steadily for about two weeks and it's still getting worse. Engineering swear nothing risky has shipped. The board pack is due Friday: where is the leak, what is causing it, and when did it start?" },
        incident: { dimension: "page", segment: "product", type: "rate", shape: "gradual", startDay: 13, factor: 0.45, stage: "atc" },
        sessionShiftEvents: [{ dimension: "source", segment: "paidsearch", days: [18, 19], factor: 0.75 }],
        events: [
          { day: 11, label: "New product photography rolled out across the catalogue", real: false },
          { day: 13, label: "Supplier notified purchasing of a delayed delivery", real: true },
          { day: 18, label: "Competitor ran a 20%-off weekend", real: false },
        ],
        truth: {
          dimension: "page", segment: "product", startDay: 13, shape: "gradual", causeType: "inventory", dateTolerance: 3,
          explanation: {
          what: "The best-selling range ran out of stock. A supplier delay, notified on day 13, meant that as the range sold through, more and more of its sizes and colours showed 'out of stock'.",
          data: "Visitors who landed straight on those product pages — from Shopping ads and search results — increasingly could not add to cart, so conversion for product-page landings slid from day 13 and was down by about half by the last week, while category, home and search-results landings held. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to product-page landings, pins the drop to the Add to cart step.",
          herrings: "The new photography and the competitor's sale were coincidences; the sale nudged paid-search visits for a weekend, but those visitors converted normally.",
          next: "Chase the supplier, pause the Shopping ads for sold-out items, and put stock levels in the catalogue feed so ads stop sending people to pages they can't buy from.",
          plain: { what: "The best-selling range ran out of stock. A supplier delay was reported on day 13. As the range sold out, more and more sizes and colours showed 'out of stock'.", data: "Visitors who arrived straight on those product pages — from Shopping ads and search results — more and more often could not add to cart. So conversion for product-page landings slid from day 13. By the last week it was down by about half. Category, home and search-results landings held. The shape is the clue: a release or a payment failure breaks things all at once. A slide that gets worse each day points to something running out. The funnel, filtered to product-page landings, shows the drop at the Add to cart step.", herrings: "The new photos and the competitor's sale happened at the same time but were not the cause. The sale moved paid-search visits a little for one weekend, but those visitors bought at the normal rate.", next: "Chase the supplier. Pause Shopping ads for sold-out items. Put stock levels in the product feed, so ads stop sending people to pages where they cannot buy." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Conversion is leaking and nobody knows where", body: "Conversion has been drifting down for about two weeks — no single bad day, just a slow leak that is still getting worse. Nothing risky has shipped. Before the board pack on Friday we need to know where the leak is, what is causing it and when it started." },
        incident: { dimension: "campaign", segment: "retargeting", type: "rate", shape: "gradual", startDay: 14, factor: 0.4, stage: "atc" },
        sessionShiftEvents: [{ dimension: "source", segment: "paidsearch", days: [19, 20], factor: 0.75 }],
        events: [
          { day: 12, label: "New product photography rolled out across the catalogue", real: false },
          { day: 14, label: "Supplier notified purchasing of a delayed delivery", real: true },
          { day: 19, label: "Competitor ran a 20%-off weekend", real: false },
        ],
        truth: {
          dimension: "campaign", segment: "retargeting", startDay: 14, shape: "gradual", causeType: "inventory", dateTolerance: 3,
          explanation: {
          what: "The best-selling range ran out of stock. A supplier delay, notified on day 14, meant that as the range sold through, more and more of its products showed 'out of stock' — but the retargeting ads kept showing shoppers exactly the products they had looked at before, which were increasingly the sold-out ones.",
          data: "Retargeting visitors arrived wanting something they could no longer add to cart, so retargeting's conversion slid from day 14 and was down by about half by the last week, while every other campaign held. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to retargeting, pins the drop to the Add to cart step.",
          herrings: "The new photography and the competitor's sale were coincidences.",
          next: "Chase the supplier, and feed stock levels into the retargeting platform so sold-out products drop out of the ads automatically.",
          plain: { what: "The best-selling range ran out of stock. A supplier delay was reported on day 14. As the range sold out, more and more of its products showed 'out of stock'. But the retargeting ads kept showing shoppers the products they had looked at before — more and more often the sold-out ones.", data: "Retargeting visitors arrived wanting something they could no longer add to cart. So retargeting's conversion slid from day 14. By the last week it was down by about half. Every other campaign held. The shape is the clue: a release or a payment failure breaks things all at once. A slide that gets worse each day points to something running out. The funnel, filtered to retargeting, shows the drop at the Add to cart step.", herrings: "The new photos and the competitor's sale happened at the same time but were not the cause.", next: "Chase the supplier. Send stock levels to the retargeting platform, so sold-out products leave the ads automatically." },
        },
        },
      },
    ],
  },

  /* ---- 6 · Advanced: the dashboard is wrong, not the shop --------- */
  {
    id: "false-alarm-tracking", n: 6, difficulty: "Advanced", title: "Conversions fell off a cliff",
    words: ["groundtruth", "funnelstep", "anomaly"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Operations: transaction management"],
      skills: {
        research: "Checking analytics against a ground-truth number from the order system.",
        critical: "Not taking the dashboard's word for a crisis.",
        organisation: "Stopping a rollback that would have fixed nothing, and sending the fix to whoever owns tracking.",
      },
      cv: "Showed that an apparent collapse in conversions was a tracking fault, not lost sales, by reconciling analytics with back-office orders before any rollback (case-based analytics simulation).",
    },
    lesson: "Before declaring a crisis, check the dashboard against a ground-truth number. If the order system didn't see a drop, the problem is the measurement, not the shop — and rolling back the site would have fixed nothing.",
    variants: [
      {
        ticket: { ...GROWTH, subject: "Conversions fell off a cliff — roll back?", body: "Analytics shows conversions down sharply this week and the CEO has seen the dashboard. Engineering is ready to roll back everything that shipped recently. Finance hasn't flagged anything yet. Is checkout broken, for whom, and since when? We need an answer before anyone rolls anything back." },
        incident: { dimension: "browser", segment: "safari", type: "tracking", shape: "cliff", startDay: 19, factor: 0.1, stage: "purchase" },
        sessionShiftEvents: [{ dimension: "source", segment: "email", days: [19, 20, 21], factor: 1.5 }],
        events: [
          { day: 17, label: "Payment provider scheduled maintenance completed", real: false },
          { day: 19, label: "Tag manager container published (cookie-consent update)", real: true },
          { day: 19, label: "Summer sale emails sent", real: false },
        ],
        truth: {
          dimension: "browser", segment: "safari", startDay: 19, shape: "cliff", causeType: "tracking_bug",
          explanation: {
          what: "Nothing broke for customers. The tag-manager update changed how cookie consent loads, and Safari's tracking prevention blocked the new script — so from day 19 the purchase tag stopped firing for most Safari orders.",
          data: "In analytics, Safari's conversion rate 'collapsed' by about 90% and the sitewide figure fell by about a fifth. But back-office orders, which come from the order database rather than from analytics, never dipped: analytics normally records about 96% of orders, and from day 19 it recorded only about three-quarters. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can.",
          herrings: "Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
          next: "Stop the rollback, fix the consent script so the purchase tag fires in Safari, and put the analytics-vs-orders coverage figure on the dashboard so a tracking fault is obvious within a day.",
          plain: { what: "Nothing broke for customers. The tag-manager update changed how the cookie-consent script loads. Safari's tracking protection blocked the new script. So from day 19, the purchase tag stopped working for most Safari orders.", data: "In analytics, Safari's conversion rate 'fell' by about 90%, and the sitewide number fell by about a fifth. But back-office orders — from the order database, not from analytics — never dipped. Analytics normally records about 96% of orders. From day 19 it recorded only about three-quarters. The funnel shows the drop at the Purchase step. A payment failure would look exactly the same. So the funnel alone cannot tell a broken checkout from a broken tag. Only a ground-truth number can.", herrings: "Rolling back the site would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.", next: "Stop the rollback. Fix the consent script so the purchase tag works in Safari. Put the analytics-vs-orders figure on the dashboard, so a tracking fault is clear within a day." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "Conversions have crashed — is mobile checkout broken?", body: "Analytics shows conversions down sharply this week and the CEO wants to know what broke. Engineering is ready to roll back the last few releases. Finance hasn't flagged anything yet. Is checkout broken, for whom, and since when? We need an answer before anyone rolls anything back." },
        incident: { dimension: "device", segment: "mobile", type: "tracking", shape: "cliff", startDay: 18, factor: 0.15, stage: "purchase" },
        sessionShiftEvents: [{ dimension: "source", segment: "email", days: [18, 19, 20], factor: 1.5 }],
        events: [
          { day: 16, label: "Payment provider scheduled maintenance completed", real: false },
          { day: 18, label: "Order confirmation page template updated", real: true },
          { day: 18, label: "Summer sale emails sent", real: false },
        ],
        truth: {
          dimension: "device", segment: "mobile", startDay: 18, shape: "cliff", causeType: "tracking_bug",
          explanation: {
          what: "Nothing broke for customers. The new order-confirmation template went out without the purchase tag on its mobile layout — so from day 18, orders placed on phones completed normally but most of them were never recorded in analytics.",
          data: "In analytics, mobile's conversion rate 'collapsed' by about 85% and the sitewide figure fell by nearly a third. But back-office orders, which come from the order database rather than from analytics, never dipped: analytics normally records about 96% of orders, and from day 18 it recorded only about two-thirds. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can.",
          herrings: "Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
          next: "Stop the rollback, add the purchase tag to the mobile confirmation template, and put the analytics-vs-orders coverage figure on the dashboard so a tracking fault is obvious within a day.",
          plain: { what: "Nothing broke for customers. The new order-confirmation page went live without the purchase tag on its mobile layout. So from day 18, orders placed on phones completed normally, but most of them were never recorded in analytics.", data: "In analytics, mobile's conversion rate 'fell' by about 85%, and the sitewide number fell by nearly a third. But back-office orders — from the order database, not from analytics — never dipped. Analytics normally records about 96% of orders. From day 18 it recorded only about two-thirds. The funnel shows the drop at the Purchase step. A payment failure would look exactly the same. So the funnel alone cannot tell a broken checkout from a broken tag. Only a ground-truth number can.", herrings: "Rolling back the site would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.", next: "Stop the rollback. Add the purchase tag to the mobile confirmation page. Put the analytics-vs-orders figure on the dashboard, so a tracking fault is clear within a day." },
        },
        },
      },
    ],
  },

  /* ---- 7 · Advanced: nothing is broken ---------------------------- */
  {
    id: "normal-week", n: 7, difficulty: "Advanced", title: "The worst day in a month",
    words: ["noise", "baseline", "anomaly"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: [], syllabus: ["eCommerce fundamentals: key concepts"],
      skills: {
        critical: "Judging whether a dip was bigger than normal variation, and confined to one group, before calling it an incident.",
        research: "Checking several dimensions to show that nothing stood out.",
        organisation: "Telling senior people that nothing needs rolling back, and why.",
      },
      cv: "Advised against an unnecessary rollback by showing that a one-day dip was a calendar effect within normal variation (case-based analytics simulation).",
    },
    lesson: "Sometimes the right diagnosis is “nothing is broken”. Check that a dip is bigger than normal variation and confined to one group before calling it an incident — small segments swing wildly by chance, and calendars move whole sites.",
    variants: [
      {
        ticket: { channel: "#exec", from: "Sam · CEO's office", subject: "Monday was our worst day in a month — what broke?", body: "Monday's conversion was the lowest we've seen in weeks and the CEO has asked what broke. A couple of the segment reports look alarming too. Please find the fault and tell us what to roll back before it costs us another day." },
        incident: null,
        calendarEvents: [{ day: 21, sessions: 0.78, conversion: 0.84 }],
        events: [
          { day: 20, label: "Minor CSS fix deployed", real: false },
          { day: 21, label: "UK bank holiday", real: true },
          { day: 22, label: "Returns policy page updated", real: false },
        ],
        truth: {
          dimension: null, segment: null, startDay: null, shape: "none", causeType: "external_no_issue",
          explanation: {
          what: "Nothing is broken. Monday was a UK bank holiday: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Tuesday.",
          data: "Over the week as a whole, conversion is within a few percent of the first week. The reports that looked alarming were small segments with only a few dozen orders a week, where a swing of 20% or more between two weeks is ordinary chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day.",
          herrings: "The CSS fix and the returns-policy update had no effect.",
          next: "Roll back nothing. Explain the calendar, and add bank holidays to the dashboard so the next one isn't mistaken for a fault.",
          plain: { what: "Nothing is broken. Monday was a UK bank holiday. Fewer people shopped, and the people who did browse bought less. So traffic and conversion dipped for one day — in every group at the same time. They were back to normal on Tuesday.", data: "Over the whole week, conversion is within a few percent of the first week. The reports that looked alarming were small groups with only a few dozen orders a week. For those, a swing of 20% or more between two weeks is normal chance. A real problem would be bigger than that normal variation, limited to one group, and still there the next day.", herrings: "The CSS fix and the returns-policy update had no effect.", next: "Roll back nothing. Explain the calendar. Add bank holidays to the dashboard, so the next one is not mistaken for a fault." },
        },
        },
      },
      {
        ticket: { channel: "#exec", from: "Sam · CEO's office", subject: "Thursday was a disaster — what broke?", body: "Thursday's conversion was the worst we've had in weeks and the CEO has asked what broke. Some of the segment reports look alarming too. Please find the fault and tell us what to roll back before it happens again." },
        incident: null,
        calendarEvents: [{ day: 24, sessions: 0.8, conversion: 0.85 }],
        events: [
          { day: 23, label: "Minor CSS fix deployed", real: false },
          { day: 24, label: "Cup final broadcast on national TV", real: true },
          { day: 25, label: "Returns policy page updated", real: false },
        ],
        truth: {
          dimension: null, segment: null, startDay: null, shape: "none", causeType: "external_no_issue",
          explanation: {
          what: "Nothing is broken. On Thursday evening the cup final was on national TV: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Friday.",
          data: "Over the week as a whole, conversion is within a few percent of the first week. The reports that looked alarming were small segments with only a few dozen orders a week, where a swing of 20% or more between two weeks is ordinary chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day.",
          herrings: "The CSS fix and the returns-policy update had no effect.",
          next: "Roll back nothing. Explain the calendar, and add big televised events to the dashboard so the next one isn't mistaken for a fault.",
          plain: { what: "Nothing is broken. On Thursday evening the cup final was on national TV. Fewer people shopped, and the people who did browse bought less. So traffic and conversion dipped for one day — in every group at the same time. They were back to normal on Friday.", data: "Over the whole week, conversion is within a few percent of the first week. The reports that looked alarming were small groups with only a few dozen orders a week. For those, a swing of 20% or more between two weeks is normal chance. A real problem would be bigger than that normal variation, limited to one group, and still there the next day.", herrings: "The CSS fix and the returns-policy update had no effect.", next: "Roll back nothing. Explain the calendar. Add big TV events to the dashboard, so the next one is not mistaken for a fault." },
        },
        },
      },
    ],
  },

  /* ---- 8 · Intermediate: the money moved, conversion didn't ------- */
  {
    id: "orders-up-revenue-down", n: 8, difficulty: "Intermediate", title: "Orders up, revenue down",
    words: ["revenuetree", "aov", "segmentation", "redherring"],   // glossary terms for the case report
    outcomes: {
      los: ["LO3"], partly: [], syllabus: ["eCommerce fundamentals: key concepts"],
      skills: {
        research: "Breaking revenue into sessions × conversion × average order value, then segmenting the part that moved.",
        critical: "Not trusting a segment just because it looked like good news on conversion.",
        organisation: "Framing the fix as a commercial decision about margin, not a technical bug.",
      },
      cv: "Explained why revenue fell while orders rose by decomposing revenue into traffic, conversion and average order value, and isolating the segment whose basket size collapsed (case-based analytics simulation).",
    },
    lesson: "Revenue = sessions × conversion × average order value. When revenue moves, find which of the three moved before you dig, then segment that one. A group can look like your best news on conversion while it is exactly where the money is leaking.",
    variants: [
      {
        ticket: { ...GROWTH, subject: "Orders up, revenue down — is the dashboard wrong?", body: "Orders are up on a normal week, yet revenue is down, and finance says the average order is worth about a sixth less than it was. Marketing are calling it a good month; finance thinks the analytics must be broken. Which is it? If something really has changed: where, what, and since when?" },
        // A cut-price code: German baskets shrink by more than half, while the
        // bargain lifts German conversion and pulls in deal-hunters.
        incident: { dimension: "country", segment: "de", type: "aov", shape: "cliff", startDay: 17, factor: 0.45, rateFactor: 1.4 },
        sessionShiftEvents: [{ dimension: "country", segment: "de", days: days(17, 27), factor: 1.3 }],
        events: [
          { day: 15, label: "EU delivery partner switched", real: false },
          { day: 17, label: "Staff discount scheme relaunched", real: true },
          { day: 19, label: "Price-comparison feed refreshed", real: false },
        ],
        truth: {
          dimension: "country", segment: "de", startDay: 17, shape: "cliff", causeType: "pricing_promo", lens: "aov",
          explanation: {
          what: "Nothing broke, and the dashboard is right. When the staff discount scheme was relaunched on day 17, a 60%-off staff code was posted on a German deal-sharing site and spread fast.",
          data: "From that day German visits rose by a fifth to a quarter, and German shoppers converted far better than before — up by roughly a third to a half — because a big discount turns browsers into buyers. That is why orders went UP. But each German order was worth less than half what it used to be: Germany's average order fell to about £20. So revenue fell while orders rose. The UK's average order held within a few percent, and the smaller markets only wobbled the way small segments do. Read conversion alone and Germany looks like the best news in the business; view the Country report by average order value and it is plainly where the money is leaking. Sitewide, revenue = sessions × conversion × AOV: sessions were flat, conversion rose and AOV fell by about a sixth — which is the factor to segment. Back-office orders match analytics, so the tracking was never the problem.",
          herrings: "The EU delivery-partner switch and the price-comparison feed refresh were coincidences.",
          next: "The fix is commercial, not technical: cancel the code, tie staff discounts to staff accounts, and report average order value by market alongside conversion.",
          plain: { what: "Nothing broke, and the dashboard is right. The staff discount scheme was relaunched on day 17. A 60%-off staff code was posted on a German deal-sharing website and spread fast.", data: "From that day, German visits rose by a fifth to a quarter. German shoppers also converted much better than before — up by roughly a third to a half — because a big discount turns browsers into buyers. That is why orders went UP. But each German order was worth less than half what it used to be. Germany's average order fell to about £20. So revenue fell while orders rose. The UK's average order stayed within a few percent. The smaller markets only moved the way small groups do. If you read conversion alone, Germany looks like the best news in the business. View the Country report by average order value and you can see the money leaking. Sitewide, revenue = sessions × conversion × average order value. Sessions were flat, conversion rose, and average order value fell by about a sixth. That is the factor to segment. Back-office orders match analytics, so tracking was never the problem.", herrings: "The change of EU delivery partner and the price-comparison feed refresh happened at the same time but were not the cause.", next: "The fix is commercial, not technical. Cancel the code. Tie staff discounts to staff accounts. Report average order value by market next to conversion." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "More orders, less money — what's going on?", body: "Orders are up on a normal week and the team are celebrating, but revenue is down and finance says the average order is worth about a sixth less than it was. Some people think the analytics is broken. Is it? If not: what changed, for whom, and since when?" },
        // Members no longer pad their baskets to reach free delivery.
        incident: { dimension: "userType", segment: "returning", type: "aov", shape: "cliff", startDay: 16, factor: 0.7, rateFactor: 1.15 },
        sessionShiftEvents: [],
        events: [
          { day: 14, label: "Competitor launched free returns", real: false },
          { day: 16, label: "Loyalty scheme terms updated", real: true },
          { day: 18, label: "Homepage hero banner changed", real: false },
        ],
        truth: {
          dimension: "userType", segment: "returning", startDay: 16, shape: "cliff", causeType: "pricing_promo", lens: "aov",
          explanation: {
          what: "Nothing broke, and the dashboard is right. On day 16 the loyalty scheme's terms changed: free delivery for members now starts at £20 instead of £50.",
          data: "Returning customers — mostly members — used to add an extra item to reach £50; now they don't need to. Cheaper delivery tipped more of them into buying, so their conversion rose by roughly a tenth to a fifth and orders went UP. But their average order fell by about 30%, so revenue fell while orders rose. New customers' average order moved only within its normal wobble. Read conversion alone and returning customers look like a success story; view New vs returning by average order value and the leak is plain. Sitewide, revenue = sessions × conversion × AOV: sessions were flat, conversion rose and AOV fell by about a sixth — which is the factor to segment. Back-office orders match analytics, so the tracking was never the problem.",
          herrings: "The competitor's free-returns offer and the homepage banner were coincidences.",
          next: "Whether the change was worth it is a commercial call — the threshold was cut to reward loyalty — but it should be judged on margin, not on the order count. Model the margin at £20, £35 and £50 before deciding.",
          plain: { what: "Nothing broke, and the dashboard is right. On day 16 the loyalty scheme's terms changed. Free delivery for members now starts at £20 instead of £50.", data: "Returning customers — mostly members — used to add an extra item to reach £50. Now they do not need to. Cheaper delivery made more of them buy, so their conversion rose by roughly a tenth to a fifth, and orders went UP. But their average order fell by about 30%. So revenue fell while orders rose. New customers' average order stayed within its normal range. If you read conversion alone, returning customers look like a success story. View New vs returning by average order value and you can see the leak. Sitewide, revenue = sessions × conversion × average order value. Sessions were flat, conversion rose, and average order value fell by about a sixth. That is the factor to segment. Back-office orders match analytics, so tracking was never the problem.", herrings: "The competitor's free-returns offer and the homepage banner happened at the same time but were not the cause.", next: "Whether the change was worth it is a business decision. The threshold was cut to reward loyal customers. But judge it on profit, not on the number of orders. Work out the profit at £20, £35 and £50 before deciding." },
        },
        },
      },
    ],
  },

  /* ---- 11 · Advanced: enterprise scale, and it's already over ------ */
  {
    id: "enterprise-outage", n: 11, difficulty: "Advanced", title: "Five markets, two warehouses",
    words: ["baseline", "anomaly", "funnelstep"],
    // Chrichton three years on: five markets, two fulfilment hubs, about
    // 70,000 sessions and £1.7m a week. Traffic and basket size are scaled;
    // everything else is the same engine.
    scale: { sessions: 25, aov: 2.2 },
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Operations: delivery methods", "eCommerce technology: hosting and integration at scale"],
      skills: {
        research: "Finding a five-day fault in one market inside a week's worth of data from five.",
        critical: "Reading the shape: a dip that has already ended is a different problem from one that is still going on.",
        operations: "Recognising a fulfilment-system fault from where it hit — one market's checkout — and sizing what it cost at enterprise volume.",
      },
      cv: "Traced a six-figure revenue loss at a multi-market retailer to a five-day fulfilment-system fault in one country, showed it had already recovered, and set out the monitoring that would catch the next one (case-based analytics simulation).",
    },
    lesson: "Scale changes what a small percentage means. At enterprise volume a five-day fault in one of five markets is a six-figure loss that a week's sitewide figure barely shows — find where it lives, when it started AND when it ended, and size it over the days it ran. A dip that has already healed needs a post-mortem, not a rollback.",
    variants: [
      {
        ticket: { ...OPS, subject: "Germany had its worst week in months — what happened?", body: "Chrichton now trades in five markets from two fulfilment hubs and does about £1.6m a week. The Germany country lead says last week was the worst she has seen and wants a root cause for Monday's trading call: what happened, when, and is it still happening? Finance want to know what it cost. Engineering say nothing shipped to the storefront." },
        incident: { dimension: "country", segment: "de", type: "rate", shape: "spike-revert", startDay: 19, days: 5, factor: 0.3, stage: "checkout" },
        sessionShiftEvents: [],
        events: [
          { day: 18, label: "Peak-season delivery surcharge introduced across all markets", real: false },
          { day: 19, label: "EU fulfilment hub: warehouse system upgrade window", real: true },
          { day: 21, label: "Parcel-carrier industrial action reported in Europe", real: false },
        ],
        truth: { dimension: "country", segment: "de", startDay: 19, shape: "spike-revert", causeType: "fulfilment", explanation: {
          what: "The EU fulfilment hub's warehouse-system upgrade on day 19 broke the delivery-slot feed to the German storefront. For five days German customers saw no delivery dates at checkout, and most of them gave up. The feed was fixed on day 24 — before this ticket was raised.",
          data: "During the outage Germany's conversion ran about 70% below its normal level, while the other four markets moved only within their usual wobble. Filtered to Germany, the funnel pins the loss to the Checkout step. Compared with the same days the week before, the outage cost roughly £160,000 of German revenue — at this scale a five-day fault in one of five markets is a six-figure problem, even though the sitewide figure for the week dipped only a few percent. By the time the ticket arrived the dip had already ended: in the last four days Germany was back at its normal rate, which is why 'last 7 days' shows Germany down by about a quarter rather than the 70% the outage itself cost.",
          herrings: "The delivery surcharge went live in every market and changed nothing in the data. The carrier industrial action was reported two days after the drop began, in a market that was converting normally.",
          next: "There is nothing to roll back — it has already recovered. The work is the post-mortem: an alert on checkout conversion by market, a check of the delivery-slot feed in every upgrade runbook, and a loss estimate for the board that counts the five days, not the week.",
          plain: { what: "On day 19 the EU warehouse's system was upgraded. The upgrade broke the delivery-date feed to the German website. For five days, German customers saw no delivery dates at checkout, and most of them gave up. The feed was fixed on day 24 — before this ticket was sent.", data: "During those five days, Germany's conversion was about 70% below normal. The other four markets stayed within their normal range. The funnel, filtered to Germany, shows the loss at the Checkout step. Compared with the same days the week before, the outage cost roughly £160,000 of German revenue. At this size, a five-day fault in one of five markets is a six-figure problem, even though the sitewide number for the week fell only a few percent. By the time the ticket arrived, the dip had already ended. In the last four days, Germany was back to its normal rate. That is why 'last 7 days' shows Germany down by about a quarter, not the 70% the outage itself cost.", herrings: "The delivery surcharge started in every market and changed nothing in the data. The carrier strike was reported two days after the drop began, in a market that was converting normally.", next: "There is nothing to roll back. It has already recovered. The work now is the review: an alert on checkout conversion by market, a check of the delivery-date feed in every upgrade plan, and a loss estimate for the board that counts the five days, not the week." },
        } },
      },
      {
        ticket: { ...OPS, subject: "France fell off a cliff last week — is it still broken?", body: "We're five markets and two hubs now, about £1.6m a week. The France country lead says orders dried up for days last week and nobody told her why. For Monday's trading call: what happened, when did it start, has it stopped, and what did it cost? Engineering say nothing shipped to the storefront." },
        incident: { dimension: "country", segment: "fr", type: "rate", shape: "spike-revert", startDay: 20, days: 4, factor: 0.25, stage: "purchase" },
        sessionShiftEvents: [],
        events: [
          { day: 19, label: "Euro price list re-rounded after the exchange-rate move", real: false },
          { day: 20, label: "EU fulfilment hub: carrier booking integration updated", real: true },
          { day: 22, label: "Parcel-carrier industrial action reported in Europe", real: false },
        ],
        truth: { dimension: "country", segment: "fr", startDay: 20, shape: "spike-revert", causeType: "fulfilment", explanation: {
          what: "The EU fulfilment hub's carrier-booking integration was updated on day 20, and the new version rejected French addresses with a department code in the postcode field — which is most of them. For four days French orders failed at the final step. It was fixed on day 24.",
          data: "During the outage France's conversion ran about 75% below its normal level, while the other markets moved only within their usual wobble; filtered to France, the funnel pins the loss to the Purchase step. Compared with the same days the week before, the four days cost roughly £95,000 of French revenue, though the sitewide week barely moved — France is the smallest of the big markets. The dip had already ended when the ticket arrived: 'last 7 days' shows France down by about a third, not the 75% the outage itself cost.",
          herrings: "The euro price list was re-rounded a day earlier, in every eurozone market, and changed nothing. The carrier industrial action was reported two days after the drop began.",
          next: "Nothing to roll back — it has recovered. Add an alert on purchase conversion by market, test carrier integrations against real address formats from every market, and give the board the four-day loss.",
          plain: { what: "On day 20 the EU warehouse's carrier-booking connection was updated. The new version rejected French addresses with a department code in the postcode box — which is most of them. For four days, French orders failed at the last step. It was fixed on day 24.", data: "During those four days, France's conversion was about 75% below normal. The other markets stayed within their normal range. The funnel, filtered to France, shows the loss at the Purchase step. Compared with the same days the week before, the four days cost roughly £95,000 of French revenue. The sitewide week barely moved, because France is the smallest of the big markets. The dip had already ended when the ticket arrived. 'Last 7 days' shows France down by about a third, not the 75% the outage itself cost.", herrings: "The euro prices were re-rounded a day earlier, in every euro market, and changed nothing. The carrier strike was reported two days after the drop began.", next: "Nothing to roll back. It has recovered. Add an alert on purchase conversion by market. Test carrier connections with real address formats from every market. Give the board the four-day loss." },
        } },
      },
    ],
  },

  /* ---- 12 · Advanced: the credit moved, the customers didn't ------ */
  {
    id: "attribution-shift", n: 12, difficulty: "Advanced", title: "The channel that collapsed on paper",
    words: ["attribution", "groundtruth", "correlation"],
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Digital marketing: audience-first marketing", "Operations: transaction management"],
      skills: {
        research: "Checking whether the total moved before believing that a channel did.",
        critical: "Separating what customers did from how analytics chose to credit it.",
        organisation: "Taking the finding to whoever owns tracking and reporting, and stopping a marketing budget being moved on a reporting artefact.",
      },
      cv: "Showed that an apparent collapse in one marketing channel was a change in how conversions were attributed, not in customer behaviour, by reconciling channel figures against the sitewide total and the order book (case-based analytics simulation).",
    },
    lesson: "When one channel's figures fall, check whether the total moved. If the sitewide number and the order book are flat and another channel rose by what the first lost, the attribution changed — not the customers. Credit is an accounting choice; revenue isn't.",
    variants: [
      {
        ticket: { ...GROWTH, subject: "Newsletter revenue has collapsed — did the new template kill it?", body: "Email revenue is down about 70% since last week and the newsletter team are in a panic. The template was just rebuilt, and the welcome discount was cut the day before. Marketing want to roll the template back and restore the discount, and they want it today. Before they do: what actually changed, and when?" },
        // Lost campaign tags: the newsletter's visits are counted as Direct.
        incident: { dimension: "source", segment: "email", to: "direct", type: "attribution", moves: "sessions", shape: "cliff", startDay: 17, factor: 0.3 },
        sessionShiftEvents: [],
        events: [
          { day: 16, label: "Welcome-series discount reduced from 15% to 10%", real: false },
          { day: 17, label: "Newsletter template rebuilt in the new design system", real: true },
          { day: 18, label: "Checkout address autocomplete deployed", real: false },
        ],
        truth: { dimension: "source", segment: "email", startDay: 17, shape: "cliff", causeType: "attribution_change", explanation: {
          what: "Nothing happened to customers. When the newsletter template was rebuilt on day 17, the new links went out without their campaign tags. Analytics could no longer tell that those visitors came from the newsletter, so it filed them under Direct.",
          data: "Email's sessions fell by about 70% overnight, and its revenue with them — but its conversion rate, measured on the visits still tagged, did not fall: it bounced around its usual level, as a now-small segment does. Direct's sessions roughly doubled and its revenue with them, by almost exactly what email lost. Add the two together and nothing changed: the sitewide conversion rate, revenue and back-office orders are all flat. View Traffic source by sessions or revenue and the swap is plain to see. The funnel, filtered to email, shows no broken step, because nothing broke.",
          herrings: "The welcome-series discount cut and the checkout autocomplete were coincidences: a smaller discount would lower email's conversion rate, and it didn't move.",
          next: "Put the campaign tags back in the template and check them in the tag-manager preview before every send. Nobody should move budget on this — the newsletter is working exactly as well as it was.",
          plain: { what: "Nothing happened to customers. The newsletter template was rebuilt on day 17. The new links went out without their tracking tags. So analytics could not tell those visitors came from the newsletter, and counted them as Direct.", data: "Email's sessions fell by about 70% in one day, and its revenue fell with them. But its conversion rate — measured on the visits still tagged — did not fall. It moved around its usual level, as a small group does. Direct's sessions roughly doubled, and its revenue with them — by almost exactly what email lost. Add the two together and nothing changed. The sitewide conversion rate, revenue and back-office orders are all flat. View Traffic source by sessions or by revenue and you can see the swap. The funnel, filtered to email, shows no broken step, because nothing broke.", herrings: "The smaller welcome discount and the checkout autocomplete happened at the same time but were not the cause. A smaller discount would lower email's conversion rate, and it did not move.", next: "Put the tracking tags back in the template. Check them in the tag-manager preview before every send. Nobody should move budget: the newsletter is working exactly as well as before." },
        } },
      },
      {
        ticket: { ...GROWTH, subject: "Retargeting has halved — pause the campaign?", body: "Retargeting's conversions have dropped by about half since last week, with no change in spend. Marketing want to pause it and move the budget into search. Is retargeting broken, and since when? We need a straight answer before the budget moves." },
        // A new attribution model: the last click loses credit to earlier touches.
        incident: { dimension: "campaign", segment: "retargeting", to: "generic", type: "attribution", moves: "credit", shape: "cliff", startDay: 16, factor: 0.45 },
        sessionShiftEvents: [],
        events: [
          { day: 15, label: "Ad creative refreshed across the display network", real: false },
          { day: 16, label: "Analytics attribution model switched to data-driven", real: true },
          { day: 18, label: "Product-page reviews widget upgraded", real: false },
        ],
        truth: { dimension: "campaign", segment: "retargeting", startDay: 16, shape: "cliff", causeType: "attribution_change", explanation: {
          what: "Nothing happened to customers. On day 16 the analytics attribution model was switched from last click to data-driven. Retargeting ads are usually the LAST click before a purchase, so under the old model they got all the credit; the new model shares it with the searches that started the journey.",
          data: "Retargeting's conversions were cut by about half from day 16 while its sessions didn't change; generic search's rose by about half or more, with no more sessions either. Add the campaigns together and the total is unchanged — the sitewide conversion rate, revenue and back-office orders are all flat. The funnel, filtered to retargeting, shows no broken step. The credit moved; the customers didn't.",
          herrings: "The display creative refresh and the reviews widget were coincidences — neither changes which campaign a purchase is credited to.",
          next: "Tell marketing before anyone reallocates budget: compare campaigns only under one attribution model, re-baseline the targets from day 16, and label the model change on every dashboard.",
          plain: { what: "Nothing happened to customers. On day 16 the analytics attribution model was changed from 'last click' to 'data-driven'. Retargeting ads are usually the last click before a purchase. Under the old model they got all the credit. The new model shares the credit with the searches that started the journey.", data: "Retargeting's conversions were cut by about half from day 16, but its sessions did not change. Generic search's conversions rose by about half or more, with no extra sessions. Add the campaigns together and the total is the same. The sitewide conversion rate, revenue and back-office orders are all flat. The funnel, filtered to retargeting, shows no broken step. The credit moved. The customers did not.", herrings: "The new ad creative and the reviews widget happened at the same time but were not the cause. Neither changes which campaign gets credit for a purchase.", next: "Tell marketing before anyone moves budget. Compare campaigns only under one attribution model. Reset the targets from day 16. Label the model change on every dashboard." },
        } },
      },
    ],
  },
];
