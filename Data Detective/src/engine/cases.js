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
        ticket: { ...OPS, subject: "Checkout looks broken?", body: "Revenue is down {{revFall}} on a normal week and finance is asking. A few customers are saying payment \"didn’t go through\". Can someone confirm whether checkout is actually broken — and for everyone, or just some people?" },
        facts: (h) => {
      const pp = h.seg("payment", "paypal");
      return {
        revFall: h.pc(h.top.revenue.pctChange), ppFall: h.pc(pp.pctChange), ppWas: h.rate(pp.avgEarly), ppNow: h.rate(pp.avgLate),
        cardCh: h.ch(h.seg("payment", "card").pctChange), ppShare: h.pc(h.share("payment", "paypal")),
        smallMax: h.pc(Math.max(...["applepay", "bank"].map((id) => Math.abs(h.seg("payment", id).pctChange)))),
      };
    },
        requires: (h) => h.top.revenue.pctChange < -0.08 && Math.abs(h.z("source", "email")) < 2,
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
          what: "The 'backend infrastructure patch' on {{day:18}} was really a PayPal integration update, and it broke payment for many customers paying with PayPal.",
          data: "From {{day:18}}, PayPal's conversion rate fell by {{ppFall}} ({{ppWas}} in the first week, {{ppNow}} in the last). Card — by far the biggest method — moved {{cardCh}}, and the two small methods by no more than {{smallMax}} either way: the wobble a method with few orders always shows. PayPal handles {{ppShare}} of checkouts, so this one failure explains the {{revFall}} fall in revenue. Filtered to PayPal, the funnel pins the loss to the Purchase step.",
          herrings: "The spring campaign was real and brought in more email visitors, but email's conversion rate moved in step with every other source's — the campaign added visits, it didn't break anything. The database maintenance two days earlier changed nothing in the data.",
          next: "Roll back or fix the PayPal integration, confirm it against the gateway's own logs, and add an alert on conversion by payment method so the next failure is caught in hours, not a week.",
          plain: { what: "The 'backend infrastructure patch' on {{day:18}} was an update to the PayPal connection. It broke payment for many customers who chose PayPal.", data: "From {{day:18}}, PayPal's conversion rate fell by {{ppFall}} ({{ppWas}} in the first week, {{ppNow}} in the last). Card — the biggest payment method — moved {{cardCh}}. The two small methods moved by {{smallMax}} or less, up or down; small methods always move more, because they have few orders. PayPal is {{ppShare}} of checkouts, so this one problem explains the {{revFall}} fall in revenue. The funnel, filtered to PayPal, shows the loss at the Purchase step.", herrings: "The spring campaign was real. It brought more visitors from email. But email's conversion rate moved the same way as every other source's. So the campaign added visits; it did not break anything. The database maintenance two days earlier changed nothing.", next: "Fix or undo the PayPal update. Check the gateway's own logs. Add an alert on conversion rate by payment method, so the next failure is found in hours." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Payments failing for some customers?", body: "Revenue is down {{revFall}} on a normal week. Customer service has had a handful of complaints that payment \"just spins and never finishes\", but most orders are going through fine. Is checkout broken — and if so, for whom?" },
        facts: (h) => {
      const ap = h.seg("payment", "applepay");
      return {
        revFall: h.pc(h.top.revenue.pctChange), apFall: h.pc(ap.pctChange), apWas: h.rate(ap.avgEarly), apNow: h.rate(ap.avgLate),
        cardCh: h.ch(h.seg("payment", "card").pctChange), ppCh: h.ch(h.seg("payment", "paypal").pctChange), bankCh: h.ch(h.seg("payment", "bank").pctChange),
        apShare: h.pc(h.share("payment", "applepay")),
      };
    },
        requires: (h) => h.top.revenue.pctChange < -0.05 && Math.abs(h.z("source", "email")) < 2,
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
          what: "The certificate rotation on {{day:17}} missed one certificate: the one Apple Pay uses to identify Chrichton as a merchant. From that day almost every Apple Pay payment failed.",
          data: "Apple Pay's conversion rate fell by {{apFall}} ({{apWas}} in the first week, {{apNow}} in the last), while card moved {{cardCh}}, PayPal {{ppCh}}, and bank transfer — the smallest method, so the one that wobbles most — {{bankCh}}. Apple Pay handles only {{apShare}} of checkouts, which is why revenue fell a moderate {{revFall}} rather than crashing — and why it is easy to dismiss. Filtered to Apple Pay, the funnel pins the loss to the Purchase step.",
          herrings: "The spring campaign was real and brought in more email visitors, but email's conversion rate moved in step with every other source's — the campaign added visits, it didn't break anything. The database maintenance two days earlier changed nothing in the data.",
          next: "Renew the missing certificate, confirm it against Apple Pay's own error logs, and add a checklist step so the next rotation covers every payment provider.",
          plain: { what: "The certificate update on {{day:17}} missed one certificate: the one Apple Pay uses to recognise Chrichton. From that day almost every Apple Pay payment failed.", data: "Apple Pay's conversion rate fell by {{apFall}} ({{apWas}} in the first week, {{apNow}} in the last). Card moved {{cardCh}} and PayPal {{ppCh}}. Bank transfer moved {{bankCh}}: it is the smallest method, so it moves the most by chance. Apple Pay is only {{apShare}} of checkouts. That is why revenue fell a moderate {{revFall}}, not a crash — and why it is easy to ignore. The funnel, filtered to Apple Pay, shows the loss at the Purchase step.", herrings: "The spring campaign was real. It brought more visitors from email. But email's conversion rate moved the same way as every other source's. So the campaign added visits; it did not break anything. The database maintenance two days earlier changed nothing.", next: "Renew the missing certificate. Check Apple Pay's own error logs. Add a step to the checklist so the next update covers every payment provider." },
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
        ticket: { ...OPS, subject: "Conversion is slowly falling — we cannot identify the cause", body: "Nothing looks badly broken, but conversion has been lower for almost two weeks, and revenue is behind target. Marketing says it is just the market. Engineering says nothing important changed. We need a clear answer for the board report." },
        facts: (h) => {
      const cells = h.cells("device", "browser").filter((r) => r.id !== "mobile__safari" && r.shareLate >= 0.1);
      return {
        devFall: h.pc(h.seg("device", "mobile").pctChange), safFall: h.pc(h.seg("browser", "safari").pctChange),
        cellFall: h.pc(h.cell("device", "browser", "mobile__safari").pctChange), otherMax: h.pc(Math.max(...cells.map((r) => Math.abs(r.pctChange)))),
      };
    },
        requires: (h) => h.seg("device", "mobile").pctChange < -0.05 && h.seg("browser", "safari").pctChange < -0.05,
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
          what: "Release v4.2, shipped on {{day:16}}, changed the checkout layout. This broke the 'Add to cart' button, but only in the Safari browser on mobile phones — a common kind of bug: not Safari on desktop, and not Chrome or Firefox on phones.",
          data: "Check Device on its own and Mobile is down {{devFall}} — a real drop, but nowhere near a broken checkout, because three in four mobile visitors use other browsers and were not affected. Check Browser on its own and Safari is down {{safFall}}, because about half of Safari visitors are on desktop and were fine. Each single report points at half of the answer, and either half on its own is the wrong diagnosis. Only the Device × Browser cross-tab isolates Mobile plus Safari, where conversion fell by {{cellFall}}, while no other large combination moved by more than {{otherMax}}. Filtered to that cell, the funnel pins the loss to Add to cart.",
          herrings: "The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally — a change in volume, not quality. The internal brand-refresh announcement had no effect on customers.",
          next: "Fix the button for Safari on iOS, add that combination to the pre-release checks, and monitor conversion by device × browser rather than by either alone.",
          plain: { what: "Release v4.2, on {{day:16}}, changed the checkout layout. It broke the 'Add to cart' button, but only in Safari on mobile phones. Safari on desktop was fine. Chrome and Firefox on phones were fine.", data: "In the Device report, Mobile is down {{devFall}}. That is a real drop, but not a broken checkout, because three in four mobile visitors use other browsers. In the Browser report, Safari is down {{safFall}}, because about half of Safari visitors are on desktop and were fine. Each report shows half of the answer. Only the Device × Browser cross-tab shows Mobile plus Safari, where conversion fell by {{cellFall}}. No other large combination moved by more than {{otherMax}}. The funnel, filtered to that combination, shows the loss at Add to cart.", herrings: "The competitor's price-match offer was real. It took some paid-search visitors away. But the visitors who stayed bought at the normal rate. The internal brand-refresh announcement had no effect on customers.", next: "Fix the button for Safari on iOS. Add that combination to the checks before each release. Watch conversion by device × browser, not just by one of them." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Conversion has been soft for two weeks — nobody can say why", body: "Conversion has been soft for about two weeks and revenue is behind target. Nothing looks broken on any of our phones, marketing says it is the market, and engineering says nothing important changed. We need a clear answer for the board report." },
        facts: (h) => {
      const cells = h.cells("device", "browser").filter((r) => r.id !== "desktop__safari" && r.shareLate >= 0.1);
      return {
        devFall: h.pc(h.seg("device", "desktop").pctChange), safFall: h.pc(h.seg("browser", "safari").pctChange),
        cellFall: h.pc(h.cell("device", "browser", "desktop__safari").pctChange), otherMax: h.pc(Math.max(...cells.map((r) => Math.abs(r.pctChange)))),
      };
    },
        requires: (h) => h.seg("device", "desktop").pctChange < -0.05 && h.seg("browser", "safari").pctChange < -0.05,
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
          what: "Release v4.2, shipped on {{day:15}}, replaced the delivery-date picker in checkout, and the new picker failed in Safari on Mac desktops: customers could not choose a delivery slot, so they could not complete checkout. Phones were fine, which is why nobody on the team could reproduce it.",
          data: "Check Device on its own and Desktop is down {{devFall}} — a real drop, but three in four desktop visitors use other browsers and were fine. Check Browser on its own and Safari is down {{safFall}}, because about half of Safari visitors are on desktop — tempting, but naming Safari alone is the wrong diagnosis: Safari on phones and tablets was fine. Only the Device × Browser cross-tab isolates Desktop plus Safari, where conversion fell by {{cellFall}}, while no other large combination moved by more than {{otherMax}}. Filtered to that cell, the funnel pins the loss to Checkout.",
          herrings: "The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally — a change in volume, not quality. The internal brand-refresh announcement had no effect on customers.",
          next: "Fix the date picker for Safari on macOS, test releases on the browser and device combinations customers actually use, and monitor conversion by device × browser.",
          plain: { what: "Release v4.2, on {{day:15}}, replaced the delivery-date picker in checkout. The new picker failed in Safari on Mac desktop computers. Customers could not choose a delivery slot, so they could not finish checkout. Phones were fine, so nobody on the team could see the problem.", data: "In the Device report, Desktop is down {{devFall}}. That is a real drop, but three in four desktop visitors use other browsers and were fine. In the Browser report, Safari is down {{safFall}}, because about half of Safari visitors are on desktop. Naming Safari alone is wrong: Safari on phones and tablets was fine. Only the Device × Browser cross-tab shows Desktop plus Safari, where conversion fell by {{cellFall}}. No other large combination moved by more than {{otherMax}}. The funnel, filtered to that combination, shows the loss at Checkout.", herrings: "The competitor's price-match offer was real. It took some paid-search visitors away. But the visitors who stayed bought at the normal rate. The internal brand-refresh announcement had no effect on customers.", next: "Fix the date picker for Safari on Mac. Test each release on the browsers and devices customers really use. Watch conversion by device × browser." },
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
        ticket: { ...GROWTH, subject: "Conversion is down but the site looks fine", body: "Sitewide conversion has slipped {{convFall}} over the last week and revenue is behind, but nobody has touched the checkout and error rates are normal. We did just scale up a new paid-social campaign. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence." },
        facts: (h) => {
      const own = h.rows("source").filter((r) => r.shareLate >= 0.1).sort((a, b) => a.pctChange - b.pctChange)[0];
      return {
        convFall: h.pc(h.top.conversionRate.pctChange), upSess: h.ch(h.seg("source", "paidsocial").lens.sessions.delta), downSess: h.ch(h.seg("source", "organic").lens.sessions.delta),
        worstCh: h.ch(own.pctChange), worstSeg: own.name,
      };
    },
        // the text says no source segment's own rate fell beyond its normal wobble: 2 real sd, which is 1.6 on the conservative estimate (see wobbleSd)
        requires: (h) => h.top.conversionRate.pctChange < -0.02 && h.rows("source").filter((r) => r.shareLate >= 0.1).every((r) => h.z("source", r.id) > -1.6),
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
          what: "Nothing on the site broke. From {{day:17}} a 3× paid-social push flooded the site with low-intent visitors, and at the same time organic — your best-converting source — dipped. What changed is the MIX of traffic.",
          data: "Check any traffic source's own conversion rate — including paid social's — and the weakest move is {{worstCh}} ({{worstSeg}}), no more than a source of that size wobbles by from week to week. Meanwhile paid social's visits went {{upSess}} and organic's {{downSess}}. Paid social converts far below organic and email, so more of it and less organic gives a lower average: the sitewide rate fell {{convFall}} only because the composition of traffic got worse. This is a mix shift (a Simpson's-paradox effect): the aggregate moves even though no underlying group did. The funnel, wherever you filter it, shows no single broken step.",
          herrings: "The trap is to go hunting for a broken segment; the honest finding is that there is none. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
          next: "Take it to marketing, not engineering: judge the paid-social campaign on the revenue and margin it brings, not on sessions, and tighten its targeting.",
          plain: { what: "Nothing on the site broke. From {{day:17}} a paid-social campaign three times bigger brought many visitors who did not plan to buy. At the same time, organic search — the best-converting source — dipped. The mix of visitors changed.", data: "Look at each traffic source's own conversion rate. The weakest move is {{worstCh}} ({{worstSeg}}) — no more than a source that size moves by chance. Not even paid social's rate fell. But paid social's visits went {{upSess}} and organic's {{downSess}}. Paid social converts much less than organic and email. More paid social and less organic gives a lower average. The sitewide rate fell {{convFall}} only because the mix got worse. This is called a mix shift, or Simpson's paradox: the total moves even though no group did. The funnel shows no broken step, wherever you filter it.", herrings: "The trap is to search for a broken group. There is none. The checkout A/B test and the analytics update happened at the same time but changed nothing.", next: "Take this to marketing, not engineering. Judge the paid-social campaign by the revenue and profit it brings, not by visits. Improve its targeting." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "Busier search ads, lower conversion — is the site broken?", body: "Sitewide conversion has slipped {{convFall}} over the last week and revenue is behind, but nobody has touched the checkout and error rates are normal. We did just switch our search ads to a broad-match strategy to grow volume. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence." },
        facts: (h) => {
      const own = h.rows("campaign").filter((r) => r.shareLate >= 0.1).sort((a, b) => a.pctChange - b.pctChange)[0];
      return {
        convFall: h.pc(h.top.conversionRate.pctChange), upSess: h.ch(h.seg("campaign", "generic").lens.sessions.delta), downSess: h.ch(h.seg("campaign", "brand").lens.sessions.delta),
        worstCh: h.ch(own.pctChange), worstSeg: own.name,
      };
    },
        // the text says no campaign segment's own rate fell beyond its normal wobble: 2 real sd, which is 1.6 on the conservative estimate (see wobbleSd)
        requires: (h) => h.top.conversionRate.pctChange < -0.02 && h.rows("campaign").filter((r) => r.shareLate >= 0.1).every((r) => h.z("campaign", r.id) > -1.6),
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
          what: "Nothing on the site broke. From {{day:16}}, switching search ads to broad match roughly tripled generic, non-brand search visits: people who typed loosely related phrases, many of whom were never going to buy. Brand search's share fell at the same time. What changed is the MIX of traffic.",
          data: "Check any campaign's own conversion rate — including generic search's — and the weakest move is {{worstCh}} ({{worstSeg}}), no more than a campaign of that size wobbles by from week to week. Meanwhile generic search's visits went {{upSess}} and brand search's {{downSess}}. Generic search converts well below brand search and retargeting, so the sitewide rate fell {{convFall}} only because the composition of traffic got worse: a mix shift (a Simpson's-paradox effect). The funnel shows no single broken step.",
          herrings: "The trap is to go hunting for a broken segment; the honest finding is that there is none. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
          next: "Take it to whoever runs paid search: judge broad match on revenue per pound spent, add negative keywords, and report conversion by campaign alongside the sitewide figure.",
          plain: { what: "Nothing on the site broke. From {{day:16}} the search ads used 'broad match'. That roughly tripled visits from generic, non-brand searches — people who typed loosely related words, many of whom were never going to buy. Brand search's share fell at the same time. The mix of visitors changed.", data: "Look at each campaign's own conversion rate. The weakest move is {{worstCh}} ({{worstSeg}}) — no more than a campaign that size moves by chance. Not even generic search's rate fell. But generic search's visits went {{upSess}} and brand search's {{downSess}}. Generic search converts much less than brand search and retargeting. So the sitewide rate fell {{convFall}} only because the mix got worse. This is a mix shift (Simpson's paradox). The funnel shows no broken step.", herrings: "The trap is to search for a broken group. There is none. The checkout A/B test and the analytics update happened at the same time but changed nothing.", next: "Take this to whoever runs paid search. Judge broad match by revenue per pound spent. Add negative keywords. Report conversion by campaign next to the sitewide number." },
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
        ticket: { ...OPS, subject: "Small dip, but revenue feels worse than it should", body: "Sitewide conversion is down only {{topFall}} — well within what we'd normally call noise — and returning-customer numbers are actually up after our loyalty push, so most of the team thinks we're fine. But a few customers mentioned checkout looked odd. Can you confirm there's really nothing wrong?" },
        facts: (h) => ({
      topFall: h.pc(h.top.conversionRate.pctChange), upCh: h.ch(h.seg("device", "mobile").pctChange), tabCh: h.ch(h.seg("device", "tablet").pctChange),
      brokenFall: h.pc(h.seg("device", "desktop").pctChange), retSess: h.ch(h.seg("userType", "returning").lens.sessions.delta),
    }),
        requires: (h) => h.top.conversionRate.pctChange < 0 && h.top.conversionRate.pctChange > -0.1 && h.seg("device", "desktop").pctChange < h.seg("device", "mobile").pctChange - 0.15,
        incident: { dimension: "device", segment: "desktop", type: "rate", shape: "cliff", startDay: 18, factor: 0.72, stage: "checkout" },
        masked: true,   // the other devices rise by design: they aren't rivals (see storyHolds)
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
          what: "There is a real, serious incident — it is just hidden. The checkout refactor on {{day:18}} broke conversion on desktop.",
          data: "The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers (their visits {{retSess}}) and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the desktop collapse. Segment by device and the pattern is unmistakable: mobile moved {{upCh}} and tablet, a small segment, {{tabCh}}, carried by the returning-customer surge, while desktop fell by {{brokenFall}} despite that same tailwind — so the bug itself cut desktop conversion by more than a quarter. Filtered to desktop, the funnel pins the loss to Checkout.",
          herrings: "The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
          next: "Roll back or fix the desktop checkout, and estimate the loss against what the loyalty surge should have delivered — not against last week's flat topline.",
          plain: { what: "There is a real, serious problem — but it is hidden. The checkout change on {{day:18}} broke conversion on desktop.", data: "The sitewide number barely moved. That is because the loyalty email in the same week brought a surge of returning customers (their visits {{retSess}}) and email visitors. Both groups buy much more than average. That lifted conversion on every device and hid the desktop collapse. Look at the Device report: mobile moved {{upCh}} and tablet, a small group, {{tabCh}}, because of the returning-customer surge. Desktop fell by {{brokenFall}}, even with that same help — so the bug itself cut desktop conversion by more than a quarter. The funnel, filtered to desktop, shows the loss at Checkout.", herrings: "The team saw the surge of returning users as good news. It was really hiding the problem. The loyalty email and the surge were real, but they were not the cause. The homepage banner had no effect.", next: "Fix or undo the desktop checkout change. Measure the loss against what the loyalty surge should have brought in — not against last week's flat total." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Revenue feels soft, but the numbers say we're fine", body: "Sitewide conversion is down only {{topFall}} — well within what we'd normally call noise — and returning-customer numbers are up after our loyalty push, so most of the team thinks we're fine. But a couple of customers complained that checkout 'froze'. Can you confirm there's really nothing wrong?" },
        facts: (h) => ({
      topFall: h.pc(h.top.conversionRate.pctChange), upCh: h.ch(h.seg("device", "desktop").pctChange), tabCh: h.ch(h.seg("device", "tablet").pctChange),
      brokenFall: h.pc(h.seg("device", "mobile").pctChange), retSess: h.ch(h.seg("userType", "returning").lens.sessions.delta),
    }),
        requires: (h) => h.top.conversionRate.pctChange < 0 && h.top.conversionRate.pctChange > -0.1 && h.seg("device", "mobile").pctChange < h.seg("device", "desktop").pctChange - 0.15,
        incident: { dimension: "device", segment: "mobile", type: "rate", shape: "cliff", startDay: 17, factor: 0.55, stage: "checkout" },
        masked: true,   // the other devices rise by design: they aren't rivals (see storyHolds)
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
          what: "There is a real, serious incident — it is just hidden. The checkout refactor on {{day:17}} broke conversion on mobile phones.",
          data: "The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers (their visits {{retSess}}) and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the mobile collapse. Segment by device and the pattern is unmistakable: desktop moved {{upCh}} and tablet, a small segment, {{tabCh}}, carried by the returning-customer surge, while mobile fell by {{brokenFall}} despite that same tailwind — so the bug itself cut mobile conversion almost in half. Filtered to mobile, the funnel pins the loss to Checkout.",
          herrings: "The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
          next: "Roll back or fix the mobile checkout, and estimate the loss against what the loyalty surge should have delivered — not against last week's flat topline.",
          plain: { what: "There is a real, serious problem — but it is hidden. The checkout change on {{day:17}} broke conversion on mobile phones.", data: "The sitewide number barely moved. That is because the loyalty email in the same week brought a surge of returning customers (their visits {{retSess}}) and email visitors. Both groups buy much more than average. That lifted conversion on every device and hid the mobile collapse. Look at the Device report: desktop moved {{upCh}} and tablet, a small group, {{tabCh}}, because of the returning-customer surge. Mobile fell by {{brokenFall}}, even with that same help — so the bug itself cut mobile conversion almost in half. The funnel, filtered to mobile, shows the loss at Checkout.", herrings: "The team saw the surge of returning users as good news. It was really hiding the problem. The loyalty email and the surge were real, but they were not the cause. The homepage banner had no effect.", next: "Fix or undo the mobile checkout change. Measure the loss against what the loyalty surge should have brought in — not against last week's flat total." },
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
        facts: (h) => ({
      fall: h.pc(h.seg("page", "product").pctChange),
      othersMax: h.pc(Math.max(...h.rows("page").filter((r) => r.id !== "product").map((r) => Math.abs(r.pctChange)))),
    }),
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
          what: "The best-selling range ran out of stock. A supplier delay, notified on {{day:13}}, meant that as the range sold through, more and more of its sizes and colours showed 'out of stock'.",
          data: "Visitors who landed straight on those product pages — from Shopping ads and search results — increasingly could not add to cart, so conversion for product-page landings slid from {{day:13}} and was down {{fall}} by the last week, while category, home and search-results landings moved by no more than {{othersMax}}. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to product-page landings, pins the drop to the Add to cart step.",
          herrings: "The new photography and the competitor's sale were coincidences; the sale nudged paid-search visits for a weekend, but those visitors converted normally.",
          next: "Chase the supplier, pause the Shopping ads for sold-out items, and put stock levels in the catalogue feed so ads stop sending people to pages they can't buy from.",
          plain: { what: "The best-selling range ran out of stock. A supplier delay was reported on {{day:13}}. As the range sold out, more and more sizes and colours showed 'out of stock'.", data: "Visitors who arrived straight on those product pages — from Shopping ads and search results — more and more often could not add to cart. So conversion for product-page landings slid from {{day:13}}, and by the last week it was down {{fall}}. Category, home and search-results landings moved by {{othersMax}} or less. The shape is the clue: a release or a payment failure breaks things all at once. A slide that gets worse each day points to something running out. The funnel, filtered to product-page landings, shows the drop at the Add to cart step.", herrings: "The new photos and the competitor's sale happened at the same time but were not the cause. The sale moved paid-search visits a little for one weekend, but those visitors bought at the normal rate.", next: "Chase the supplier. Pause Shopping ads for sold-out items. Put stock levels in the product feed, so ads stop sending people to pages where they cannot buy." },
        },
        },
      },
      {
        ticket: { ...OPS, subject: "Conversion is leaking and nobody knows where", body: "Conversion has been drifting down for about two weeks — no single bad day, just a slow leak that is still getting worse. Nothing risky has shipped. Before the board pack on Friday we need to know where the leak is, what is causing it and when it started." },
        facts: (h) => ({
      fall: h.pc(h.seg("campaign", "retargeting").pctChange),
      othersMax: h.pc(Math.max(...h.rows("campaign").filter((r) => r.id !== "retargeting").map((r) => Math.abs(r.pctChange)))),
    }),
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
          what: "The best-selling range ran out of stock. A supplier delay, notified on {{day:14}}, meant that as the range sold through, more and more of its products showed 'out of stock' — but the retargeting ads kept showing shoppers exactly the products they had looked at before, which were increasingly the sold-out ones.",
          data: "Retargeting visitors arrived wanting something they could no longer add to cart, so retargeting's conversion slid from {{day:14}} and was down {{fall}} by the last week, while no other campaign moved by more than {{othersMax}}. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to retargeting, pins the drop to the Add to cart step.",
          herrings: "The new photography and the competitor's sale were coincidences.",
          next: "Chase the supplier, and feed stock levels into the retargeting platform so sold-out products drop out of the ads automatically.",
          plain: { what: "The best-selling range ran out of stock. A supplier delay was reported on {{day:14}}. As the range sold out, more and more of its products showed 'out of stock'. But the retargeting ads kept showing shoppers the products they had looked at before — more and more often the sold-out ones.", data: "Retargeting visitors arrived wanting something they could no longer add to cart. So retargeting's conversion slid from {{day:14}}, and by the last week it was down {{fall}}. No other campaign moved by more than {{othersMax}}. The shape is the clue: a release or a payment failure breaks things all at once. A slide that gets worse each day points to something running out. The funnel, filtered to retargeting, shows the drop at the Add to cart step.", herrings: "The new photos and the competitor's sale happened at the same time but were not the cause.", next: "Chase the supplier. Send stock levels to the retargeting platform, so sold-out products leave the ads automatically." },
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
        facts: (h) => ({
      segFall: h.pc(h.seg("browser", "safari").pctChange), convFall: h.pc(h.top.conversionRate.pctChange), ordersCh: h.ch(h.top.orders.pctChange),
      covBefore: h.rate(h.coverage(0, 19 - 1), 0), covAfter: h.rate(h.coverage(19, 27), 0),
    }),
        requires: (h) => h.top.orders.pctChange > -0.05 && h.top.orders.pctChange < 0.08,
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
          what: "Nothing broke for customers. The tag-manager update on {{day:19}} changed how cookie consent loads, and Safari's tracking prevention blocked the new script — so from that day the purchase tag stopped firing for most Safari orders.",
          data: "In analytics, Safari's conversion rate 'collapsed' by {{segFall}} and the sitewide figure fell by {{convFall}}. But back-office orders, which come from the order database rather than from analytics, moved only {{ordersCh}} — their normal week-to-week range: analytics recorded {{covBefore}} of orders before {{day:19}} and only {{covAfter}} from then on. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can.",
          herrings: "Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
          next: "Stop the rollback, fix the consent script so the purchase tag fires in Safari, and put the analytics-vs-orders coverage figure on the dashboard so a tracking fault is obvious within a day.",
          plain: { what: "Nothing broke for customers. The tag-manager update on {{day:19}} changed how the cookie-consent script loads. Safari's tracking protection blocked the new script. So from that day, the purchase tag stopped working for most Safari orders.", data: "In analytics, Safari's conversion rate 'fell' by {{segFall}}, and the sitewide number fell by {{convFall}}. But back-office orders — from the order database, not from analytics — moved only {{ordersCh}}, their normal week-to-week range. Analytics recorded {{covBefore}} of orders before {{day:19}}, and only {{covAfter}} from then on. The funnel shows the drop at the Purchase step. A payment failure would look exactly the same. So the funnel alone cannot tell a broken checkout from a broken tag. Only a ground-truth number can.", herrings: "Rolling back the site would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.", next: "Stop the rollback. Fix the consent script so the purchase tag works in Safari. Put the analytics-vs-orders figure on the dashboard, so a tracking fault is clear within a day." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "Conversions have crashed — is mobile checkout broken?", body: "Analytics shows conversions down sharply this week and the CEO wants to know what broke. Engineering is ready to roll back the last few releases. Finance hasn't flagged anything yet. Is checkout broken, for whom, and since when? We need an answer before anyone rolls anything back." },
        facts: (h) => ({
      segFall: h.pc(h.seg("device", "mobile").pctChange), convFall: h.pc(h.top.conversionRate.pctChange), ordersCh: h.ch(h.top.orders.pctChange),
      covBefore: h.rate(h.coverage(0, 18 - 1), 0), covAfter: h.rate(h.coverage(18, 27), 0),
    }),
        requires: (h) => h.top.orders.pctChange > -0.05 && h.top.orders.pctChange < 0.08,
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
          what: "Nothing broke for customers. The new order-confirmation template went out on {{day:18}} without the purchase tag on its mobile layout — so from that day, orders placed on phones completed normally but most of them were never recorded in analytics.",
          data: "In analytics, mobile's conversion rate 'collapsed' by {{segFall}} and the sitewide figure fell by {{convFall}}. But back-office orders, which come from the order database rather than from analytics, moved only {{ordersCh}} — their normal week-to-week range: analytics recorded {{covBefore}} of orders before {{day:18}} and only {{covAfter}} from then on. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can.",
          herrings: "Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
          next: "Stop the rollback, add the purchase tag to the mobile confirmation template, and put the analytics-vs-orders coverage figure on the dashboard so a tracking fault is obvious within a day.",
          plain: { what: "Nothing broke for customers. The new order-confirmation page went live on {{day:18}} without the purchase tag on its mobile layout. So from that day, orders placed on phones completed normally, but most of them were never recorded in analytics.", data: "In analytics, mobile's conversion rate 'fell' by {{segFall}}, and the sitewide number fell by {{convFall}}. But back-office orders — from the order database, not from analytics — moved only {{ordersCh}}, their normal week-to-week range. Analytics recorded {{covBefore}} of orders before {{day:18}}, and only {{covAfter}} from then on. The funnel shows the drop at the Purchase step. A payment failure would look exactly the same. So the funnel alone cannot tell a broken checkout from a broken tag. Only a ground-truth number can.", herrings: "Rolling back the site would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.", next: "Stop the rollback. Add the purchase tag to the mobile confirmation page. Put the analytics-vs-orders figure on the dashboard, so a tracking fault is clear within a day." },
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
        ticket: { channel: "#exec", from: "Sam · CEO's office", subject: "Monday was our worst day in a month — what broke?", body: "Monday's conversion was the lowest we've seen in weeks and the CEO has asked what broke. Some of the segment reports look bad too. Please find the fault and tell us what to roll back before it costs us another day." },
        facts: (h) => {
      const wk1 = h.cd.topline.slice(0, 7).reduce((a, r) => a + r.conversionRate, 0) / 7;
      const small = h.cd.breakdowns.flatMap((d) => h.rows(d.key).filter((r) => r.shareLate < 0.1).map((r) => ({ ...r, dim: d.label }))).sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))[0];
      return {
        dayDip: h.pc(h.cd.topline[21].conversionRate / wk1 - 1), nextCh: h.ch(h.cd.topline[21 + 1].conversionRate / wk1 - 1),
        weekCh: h.ch(h.top.conversionRate.pctChange), worstSeg: `${small.name} (${small.dim})`, worstCh: h.ch(small.pctChange), worstOrders: String(Math.round(small.purchasesLate)),
      };
    },
        requires: (h) => {
      const wk1 = h.cd.topline.slice(0, 7).reduce((a, r) => a + r.conversionRate, 0) / 7;
      return Math.abs(h.cd.topline[21 + 1].conversionRate / wk1 - 1) < 0.1;
    },
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
          what: "Nothing is broken. Monday ({{day:21}}) was a UK bank holiday: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Tuesday.",
          data: "Monday's conversion was {{dayDip}} below the first week's daily average, and Tuesday's {{nextCh}} against it. Over the week as a whole, conversion is {{weekCh}} on the first week. The most alarming report was {{worstSeg}}, {{worstCh}} — but it had only about {{worstOrders}} orders in the week, and a segment that small swings that far by chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day.",
          herrings: "The CSS fix and the returns-policy update had no effect.",
          next: "Roll back nothing. Explain the calendar, and add bank holidays to the dashboard so the next one isn't mistaken for a fault.",
          plain: { what: "Nothing is broken. Monday ({{day:21}}) was a UK bank holiday. Fewer people shopped, and the people who did browse bought less. So traffic and conversion dipped for one day — in every group at the same time. They were back to normal on Tuesday.", data: "Monday's conversion was {{dayDip}} below the first week's daily average. Tuesday's was {{nextCh}} against it. Over the whole week, conversion is {{weekCh}} on the first week. The most alarming report was {{worstSeg}}, {{worstCh}}. But it had only about {{worstOrders}} orders in the week, and a group that small moves that much by chance. A real problem would be bigger than that normal variation, limited to one group, and still there the next day.", herrings: "The CSS fix and the returns-policy update had no effect.", next: "Roll back nothing. Explain the calendar. Add bank holidays to the dashboard, so the next one is not mistaken for a fault." },
        },
        },
      },
      {
        ticket: { channel: "#exec", from: "Sam · CEO's office", subject: "Thursday was a disaster — what broke?", body: "Thursday's conversion was the worst we've had in weeks and the CEO has asked what broke. Some of the segment reports look bad too. Please find the fault and tell us what to roll back before it happens again." },
        facts: (h) => {
      const wk1 = h.cd.topline.slice(0, 7).reduce((a, r) => a + r.conversionRate, 0) / 7;
      const small = h.cd.breakdowns.flatMap((d) => h.rows(d.key).filter((r) => r.shareLate < 0.1).map((r) => ({ ...r, dim: d.label }))).sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))[0];
      return {
        dayDip: h.pc(h.cd.topline[24].conversionRate / wk1 - 1), nextCh: h.ch(h.cd.topline[24 + 1].conversionRate / wk1 - 1),
        weekCh: h.ch(h.top.conversionRate.pctChange), worstSeg: `${small.name} (${small.dim})`, worstCh: h.ch(small.pctChange), worstOrders: String(Math.round(small.purchasesLate)),
      };
    },
        requires: (h) => {
      const wk1 = h.cd.topline.slice(0, 7).reduce((a, r) => a + r.conversionRate, 0) / 7;
      return Math.abs(h.cd.topline[24 + 1].conversionRate / wk1 - 1) < 0.1;
    },
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
          what: "Nothing is broken. On Thursday evening ({{day:24}}) the cup final was on national TV: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Friday.",
          data: "Thursday's conversion was {{dayDip}} below the first week's daily average, and Friday's {{nextCh}} against it. Over the week as a whole, conversion is {{weekCh}} on the first week. The most alarming report was {{worstSeg}}, {{worstCh}} — but it had only about {{worstOrders}} orders in the week, and a segment that small swings that far by chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day.",
          herrings: "The CSS fix and the returns-policy update had no effect.",
          next: "Roll back nothing. Explain the calendar, and add big televised events to the dashboard so the next one isn't mistaken for a fault.",
          plain: { what: "Nothing is broken. On Thursday evening ({{day:24}}) the cup final was on national TV. Fewer people shopped, and the people who did browse bought less. So traffic and conversion dipped for one day — in every group at the same time. They were back to normal on Friday.", data: "Thursday's conversion was {{dayDip}} below the first week's daily average. Friday's was {{nextCh}} against it. Over the whole week, conversion is {{weekCh}} on the first week. The most alarming report was {{worstSeg}}, {{worstCh}}. But it had only about {{worstOrders}} orders in the week, and a group that small moves that much by chance. A real problem would be bigger than that normal variation, limited to one group, and still there the next day.", herrings: "The CSS fix and the returns-policy update had no effect.", next: "Roll back nothing. Explain the calendar. Add big TV events to the dashboard, so the next one is not mistaken for a fault." },
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
        ticket: { ...GROWTH, subject: "Orders up, revenue down — is the dashboard wrong?", body: "Orders are up {{ordersUp}} on a normal week, yet revenue is down {{revFall}}, and finance says the average order is worth {{aovFall}} less than it was. Marketing are calling it a good month; finance thinks the analytics must be broken. Which is it? If something really has changed: where, what, and since when?" },
        facts: (h) => {
      const de = h.seg("country", "de").lens;
      return {
        ordersUp: h.pc(h.top.orders.pctChange), revFall: h.pc(h.top.revenue.pctChange), aovFall: h.pc(h.top.aov.pctChange), sessCh: h.ch(h.top.sessions.pctChange), convCh: h.ch(h.top.conversionRate.pctChange),
        deSess: h.ch(de.sessions.delta), deConv: h.ch(de.conversionRate.delta), deAovFall: h.pc(de.aov.delta), deAovWas: h.gbp2(de.aov.was), deAovNow: h.gbp2(de.aov.now),
        ukAovCh: h.ch(h.seg("country", "uk").lens.aov.delta),
      };
    },
        requires: (h) => h.top.orders.pctChange > 0.02 && h.top.revenue.pctChange < -0.02 && h.seg("country", "de").lens.aov.delta < -0.4,
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
          what: "Nothing broke, and the dashboard is right. When the staff discount scheme was relaunched on {{day:17}}, a 60%-off staff code was posted on a German deal-sharing site and spread fast.",
          data: "From that day German visits went {{deSess}} and German conversion {{deConv}}, because a big discount turns browsers into buyers. That is why orders went UP. But each German order was worth much less: Germany's average order fell {{deAovFall}}, from {{deAovWas}} to {{deAovNow}}. So revenue fell while orders rose. The UK's average order moved {{ukAovCh}}, and the smaller markets only wobbled the way small segments do. Read conversion alone and Germany looks like the best news in the business; view the Country report by average order value and it is plainly where the money is leaking. Sitewide, revenue = sessions × conversion × AOV: sessions moved {{sessCh}}, conversion {{convCh}} and AOV fell {{aovFall}} — the factor to segment. Back-office orders match analytics, so the tracking was never the problem.",
          herrings: "The EU delivery-partner switch and the price-comparison feed refresh were coincidences.",
          next: "The fix is commercial, not technical: cancel the code, tie staff discounts to staff accounts, and report average order value by market alongside conversion.",
          plain: { what: "Nothing broke, and the dashboard is right. The staff discount scheme was relaunched on {{day:17}}. A 60%-off staff code was posted on a German deal-sharing website and spread fast.", data: "From that day, German visits went {{deSess}} and German conversion {{deConv}}, because a big discount turns browsers into buyers. That is why orders went UP. But each German order was worth much less. Germany's average order fell {{deAovFall}}, from {{deAovWas}} to {{deAovNow}}. So revenue fell while orders rose. The UK's average order moved {{ukAovCh}}. The smaller markets only moved the way small groups do. If you read conversion alone, Germany looks like the best news in the business. View the Country report by average order value and you can see the money leaking. Sitewide, revenue = sessions × conversion × average order value. Sessions moved {{sessCh}}, conversion {{convCh}}, and average order value fell {{aovFall}}. That is the factor to segment. Back-office orders match analytics, so tracking was never the problem.", herrings: "The change of EU delivery partner and the price-comparison feed refresh happened at the same time but were not the cause.", next: "The fix is commercial, not technical. Cancel the code. Tie staff discounts to staff accounts. Report average order value by market next to conversion." },
        },
        },
      },
      {
        ticket: { ...GROWTH, subject: "More orders, less money — what's going on?", body: "Orders are up {{ordersUp}} on a normal week and the team are celebrating, but revenue is down {{revFall}} and finance says the average order is worth {{aovFall}} less than it was. Some people think the analytics is broken. Is it? If not: what changed, for whom, and since when?" },
        facts: (h) => {
      const ret = h.seg("userType", "returning").lens;
      return {
        ordersUp: h.pc(h.top.orders.pctChange), revFall: h.pc(h.top.revenue.pctChange), aovFall: h.pc(h.top.aov.pctChange), sessCh: h.ch(h.top.sessions.pctChange), convCh: h.ch(h.top.conversionRate.pctChange),
        retConv: h.ch(ret.conversionRate.delta), retAovFall: h.pc(ret.aov.delta), retAovWas: h.gbp2(ret.aov.was), retAovNow: h.gbp2(ret.aov.now),
        newAovCh: h.ch(h.seg("userType", "new").lens.aov.delta),
      };
    },
        requires: (h) => h.top.orders.pctChange > 0.02 && h.top.revenue.pctChange < -0.02 && h.seg("userType", "returning").lens.conversionRate.delta > 0,
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
          what: "Nothing broke, and the dashboard is right. On {{day:16}} the loyalty scheme's terms changed: free delivery for members now starts at £20 instead of £50.",
          data: "Returning customers — mostly members — used to add an extra item to reach £50; now they don't need to. Cheaper delivery tipped more of them into buying, so their conversion went {{retConv}} and orders went UP. But their average order fell {{retAovFall}}, from {{retAovWas}} to {{retAovNow}}, so revenue fell while orders rose. New customers' average order moved {{newAovCh}}. Read conversion alone and returning customers look like a success story; view New vs returning by average order value and the leak is plain. Sitewide, revenue = sessions × conversion × AOV: sessions moved {{sessCh}}, conversion {{convCh}} and AOV fell {{aovFall}} — the factor to segment. Back-office orders match analytics, so the tracking was never the problem.",
          herrings: "The competitor's free-returns offer and the homepage banner were coincidences.",
          next: "Whether the change was worth it is a commercial call — the threshold was cut to reward loyalty — but it should be judged on margin, not on the order count. Model the margin at £20, £35 and £50 before deciding.",
          plain: { what: "Nothing broke, and the dashboard is right. On {{day:16}} the loyalty scheme's terms changed. Free delivery for members now starts at £20 instead of £50.", data: "Returning customers — mostly members — used to add an extra item to reach £50. Now they do not need to. Cheaper delivery made more of them buy, so their conversion went {{retConv}}, and orders went UP. But their average order fell {{retAovFall}}, from {{retAovWas}} to {{retAovNow}}. So revenue fell while orders rose. New customers' average order moved {{newAovCh}}. If you read conversion alone, returning customers look like a success story. View New vs returning by average order value and you can see the leak. Sitewide, revenue = sessions × conversion × average order value. Sessions moved {{sessCh}}, conversion {{convCh}}, and average order value fell {{aovFall}}. That is the factor to segment. Back-office orders match analytics, so tracking was never the problem.", herrings: "The competitor's free-returns offer and the homepage banner happened at the same time but were not the cause.", next: "Whether the change was worth it is a business decision. The threshold was cut to reward loyal customers. But judge it on profit, not on the number of orders. Work out the profit at £20, £35 and £50 before deciding." },
        },
        },
      },
    ],
  },

  /* ---- 11 · Advanced: enterprise scale, and it's already over ------ */
  {
    id: "enterprise-outage", n: 11, difficulty: "Advanced", title: "Four markets, two warehouses",
    words: ["baseline", "anomaly", "funnelstep"],
    // Chrichton three years on: four main markets plus the rest of the world, two fulfilment hubs, about
    // 70,000 sessions and £1.7m a week. Traffic and basket size are scaled;
    // everything else is the same engine.
    scale: { sessions: 25, aov: 2.2 },
    outcomes: {
      los: ["LO3"], partly: ["LO1"], syllabus: ["Operations: delivery methods", "eCommerce technology: hosting and integration at scale"],
      skills: {
        research: "Finding a fault that lasted a few days, in one market, inside a week of data from all of them.",
        critical: "Reading the shape: a dip that has already ended is a different problem from one that is still going on.",
        operations: "Recognising a fulfilment-system fault from where it hit — one market's checkout — and sizing what it cost at enterprise volume.",
      },
      cv: "Traced a six-figure revenue loss at a multi-market retailer to a fulfilment-system fault that ran for several days in one country, showed it had already recovered, and set out the monitoring that would catch the next one (case-based analytics simulation).",
    },
    lesson: "Scale changes what a small percentage means. At enterprise volume a fault that runs for a few days in one market is a six-figure loss that a week's sitewide figure barely shows — find where it lives, when it started AND when it ended, and size it over the days it ran. A dip that has already healed needs a post-mortem, not a rollback.",
    variants: [
      {
        ticket: { ...OPS, subject: "Germany had its worst week in months — what happened?", body: "Chrichton now trades in four main markets plus the rest of the world, from two fulfilment hubs, and does about {{weekRev}} a week. The Germany country lead says last week was the worst she has seen and wants a root cause for Monday's trading call: what happened, when, and is it still happening? Finance want to know what it cost. Engineering say nothing shipped to the storefront." },
        facts: (h) => {
      const win = [19, 19 + 5 - 1], before = [win[0] - 7, win[1] - 7];
      const others = ["uk", "de", "fr", "us"].filter((id) => id !== "de");
      return {
        weekRev: h.gbpM(h.top.revenue.late), outFall: h.pc(h.windowCh("country", "de", win, before)),
        lost: h.gbp(h.sum("country", "de", before, "revenue") - h.sum("country", "de", win, "revenue"), 5000),
        last7Fall: h.pc(h.seg("country", "de").pctChange), siteRevCh: h.ch(h.top.revenue.pctChange),
        othersMax: h.pc(Math.max(...others.map((id) => Math.abs(h.seg("country", id).pctChange)))), segShare: h.pc(h.share("country", "de")),
      };
    },
        requires: (h) => {
      const win = [19, 19 + 5 - 1], before = [win[0] - 7, win[1] - 7], after = [19 + 5, 27];
      const lost = h.sum("country", "de", before, "revenue") - h.sum("country", "de", win, "revenue");
      return Math.abs(h.windowCh("country", "de", after, [after[0] - 14, after[1] - 14])) < 0.12 && lost >= 100000;
    },
        incident: { dimension: "country", segment: "de", type: "rate", shape: "spike-revert", startDay: 19, days: 5, factor: 0.3, stage: "checkout" },
        sessionShiftEvents: [],
        events: [
          { day: 18, label: "Peak-season delivery surcharge introduced across all markets", real: false },
          { day: 19, label: "EU fulfilment hub: warehouse system upgrade window", real: true },
          { day: 21, label: "Parcel-carrier industrial action reported in Europe", real: false },
        ],
        truth: { dimension: "country", segment: "de", startDay: 19, shape: "spike-revert", causeType: "fulfilment", explanation: {
          what: "The EU fulfilment hub's warehouse-system upgrade on {{day:19}} broke the delivery-slot feed to the German storefront. For five days German customers saw no delivery dates at checkout, and most of them gave up. The feed was fixed on {{day:24}} — before this ticket was raised.",
          data: "During the outage Germany's conversion ran {{outFall}} below the same days the week before, while the UK, France and the USA moved by no more than {{othersMax}} over the week. Filtered to Germany, the funnel pins the loss to the Checkout step. Against the same days the week before, the outage cost about {{lost}} of German revenue — at this scale a five-day fault in one market is a six-figure problem, even though the sitewide figure for the week moved only {{siteRevCh}}. By the time the ticket arrived the dip had already ended: from {{day:24}} Germany was back at its normal rate, which is why 'last 7 days' shows Germany down {{last7Fall}} rather than the {{outFall}} the outage itself cost.",
          herrings: "The delivery surcharge went live in every market and changed nothing in the data. The carrier industrial action was reported two days after the drop began, when Germany's conversion had already collapsed.",
          next: "There is nothing to roll back — it has already recovered. The work is the post-mortem: an alert on checkout conversion by market, a check of the delivery-slot feed in every upgrade runbook, and a loss estimate for the board that counts the five days, not the week.",
          plain: { what: "On {{day:19}} the EU warehouse's system was upgraded. The upgrade broke the delivery-date feed to the German website. For five days, German customers saw no delivery dates at checkout, and most of them gave up. The feed was fixed on {{day:24}} — before this ticket was sent.", data: "During those five days, Germany's conversion was {{outFall}} below the same days the week before. Over the week, the UK, France and the USA moved by {{othersMax}} or less. The funnel, filtered to Germany, shows the loss at the Checkout step. Compared with the same days the week before, the outage cost about {{lost}} of German revenue. At this size, a five-day fault in one market is a six-figure problem, even though the sitewide number for the week moved only {{siteRevCh}}. By the time the ticket arrived, the dip had already ended. From {{day:24}}, Germany was back to its normal rate. That is why 'last 7 days' shows Germany down {{last7Fall}}, not the {{outFall}} the outage itself cost.", herrings: "The delivery surcharge started in every market and changed nothing in the data. The carrier strike was reported two days after the drop began, when German conversion had already collapsed.", next: "There is nothing to roll back. It has already recovered. The work now is the review: an alert on checkout conversion by market, a check of the delivery-date feed in every upgrade plan, and a loss estimate for the board that counts the five days, not the week." },
        } },
      },
      {
        ticket: { ...OPS, subject: "France fell off a cliff last week — is it still broken?", body: "We're four main markets plus the rest of the world now, from two hubs, doing about {{weekRev}} a week. The France country lead says orders dried up for days last week and nobody told her why. For Monday's trading call: what happened, when did it start, has it stopped, and what did it cost? Engineering say nothing shipped to the storefront." },
        facts: (h) => {
      const win = [20, 20 + 4 - 1], before = [win[0] - 7, win[1] - 7];
      const others = ["uk", "de", "fr", "us"].filter((id) => id !== "fr");
      return {
        weekRev: h.gbpM(h.top.revenue.late), outFall: h.pc(h.windowCh("country", "fr", win, before)),
        lost: h.gbp(h.sum("country", "fr", before, "revenue") - h.sum("country", "fr", win, "revenue"), 5000),
        last7Fall: h.pc(h.seg("country", "fr").pctChange), siteRevCh: h.ch(h.top.revenue.pctChange),
        othersMax: h.pc(Math.max(...others.map((id) => Math.abs(h.seg("country", id).pctChange)))), segShare: h.pc(h.share("country", "fr")),
      };
    },
        requires: (h) => {
      const win = [20, 20 + 4 - 1], before = [win[0] - 7, win[1] - 7], after = [20 + 4, 27];
      const lost = h.sum("country", "fr", before, "revenue") - h.sum("country", "fr", win, "revenue");
      return Math.abs(h.windowCh("country", "fr", after, [after[0] - 14, after[1] - 14])) < 0.12 && lost >= 50000;
    },
        incident: { dimension: "country", segment: "fr", type: "rate", shape: "spike-revert", startDay: 20, days: 4, factor: 0.25, stage: "purchase" },
        sessionShiftEvents: [],
        events: [
          { day: 19, label: "Euro price list re-rounded after the exchange-rate move", real: false },
          { day: 20, label: "EU fulfilment hub: carrier booking integration updated", real: true },
          { day: 22, label: "Parcel-carrier industrial action reported in Europe", real: false },
        ],
        truth: { dimension: "country", segment: "fr", startDay: 20, shape: "spike-revert", causeType: "fulfilment", explanation: {
          what: "The EU fulfilment hub's carrier-booking integration was updated on {{day:20}}, and the new version rejected French addresses with a department code in the postcode field — which is most of them. For four days French orders failed at the final step. It was fixed on {{day:24}}.",
          data: "During the outage France's conversion ran {{outFall}} below the same days the week before, while the UK, Germany and the USA moved by no more than {{othersMax}} over the week; filtered to France, the funnel pins the loss to the Purchase step. Against the same days the week before, the four days cost about {{lost}} of French revenue, though the sitewide week moved only {{siteRevCh}} — France is only {{segShare}} of sales. The dip had already ended when the ticket arrived: 'last 7 days' shows France down {{last7Fall}}, not the {{outFall}} the outage itself cost.",
          herrings: "The euro price list was re-rounded a day earlier, in every eurozone market, and changed nothing. The carrier industrial action was reported two days after the drop began.",
          next: "Nothing to roll back — it has recovered. Add an alert on purchase conversion by market, test carrier integrations against real address formats from every market, and give the board the four-day loss.",
          plain: { what: "On {{day:20}} the EU warehouse's carrier-booking connection was updated. The new version rejected French addresses with a department code in the postcode box — which is most of them. For four days, French orders failed at the last step. It was fixed on {{day:24}}.", data: "During those four days, France's conversion was {{outFall}} below the same days the week before. Over the week, the UK, Germany and the USA moved by {{othersMax}} or less. The funnel, filtered to France, shows the loss at the Purchase step. Compared with the same days the week before, the four days cost about {{lost}} of French revenue. The sitewide week moved only {{siteRevCh}}, because France is only {{segShare}} of sales. The dip had already ended when the ticket arrived. 'Last 7 days' shows France down {{last7Fall}}, not the {{outFall}} the outage itself cost.", herrings: "The euro prices were re-rounded a day earlier, in every euro market, and changed nothing. The carrier strike was reported two days after the drop began.", next: "Nothing to roll back. It has recovered. Add an alert on purchase conversion by market. Test carrier connections with real address formats from every market. Give the board the four-day loss." },
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
        ticket: { ...GROWTH, subject: "Newsletter revenue has collapsed — did the new template kill it?", body: "Email revenue is down {{emailRevFall}} since last week and the newsletter team are in a panic. The template was just rebuilt, and the newsletter's send day was moved the day before. Marketing want to roll the template back and move the send day back, and they want it today. Before they do: what actually changed, and when?" },
        facts: (h) => {
      const em = h.seg("source", "email").lens, di = h.seg("source", "direct").lens;
      return {
        siteConvCh: h.ch(h.top.conversionRate.pctChange), siteRevCh: h.ch(h.top.revenue.pctChange), ordersCh: h.ch(h.top.orders.pctChange),
        emailRevFall: h.pc(em.revenue.delta), emailSessFall: h.pc(em.sessions.delta), emailConvCh: h.ch(em.conversionRate.delta),
        emailLost: String(Math.round((em.sessions.was - em.sessions.now) / 10) * 10), directGain: String(Math.round((di.sessions.now - di.sessions.was) / 10) * 10),
        directSessUp: h.ch(di.sessions.delta),
      };
    },
        requires: (h) => Math.abs(h.top.conversionRate.pctChange) < 0.05 && Math.abs(h.top.orders.pctChange) < 0.06 && Math.abs(h.top.revenue.pctChange) < 0.07,
        // Lost campaign tags: the newsletter's visits are counted as Direct.
        incident: { dimension: "source", segment: "email", to: "direct", type: "attribution", moves: "sessions", shape: "cliff", startDay: 17, factor: 0.3 },
        sessionShiftEvents: [],
        events: [
          { day: 16, label: "Newsletter send day moved from Tuesday to Thursday", real: false },
          { day: 17, label: "Newsletter template rebuilt in the new design system", real: true },
          { day: 18, label: "Checkout address autocomplete deployed", real: false },
        ],
        truth: { dimension: "source", segment: "email", startDay: 17, shape: "cliff", causeType: "attribution_change", explanation: {
          what: "Nothing happened to customers. When the newsletter template was rebuilt on {{day:17}}, the new links went out without their campaign tags. Analytics could no longer tell that those visitors came from the newsletter, so it filed them under Direct.",
          data: "Email's visits fell {{emailSessFall}} — about {{emailLost}} fewer a day — and its revenue {{emailRevFall}} with them, while Direct gained about {{directGain}} visits a day ({{directSessUp}}). Add the two together and nothing changed: sitewide conversion moved {{siteConvCh}}, revenue {{siteRevCh}} and back-office orders {{ordersCh}}. Email's own conversion rate, on the few visits still tagged, moved {{emailConvCh}} — a segment that small is noisy, and the visits that lost their tags went on buying under Direct. View Traffic source by sessions or revenue and the swap is plain to see. The funnel, filtered to email, shows no broken step, because nothing broke.",
          herrings: "Moving the send day could shift email's visits around the week, but it can't make Direct rise by what email lost, or leave the total unchanged. The checkout autocomplete changed nothing in the data.",
          next: "Put the campaign tags back in the template and check them in the tag-manager preview before every send. Nobody should move budget on this — the newsletter is working exactly as well as it was.",
          plain: { what: "Nothing happened to customers. The newsletter template was rebuilt on {{day:17}}. The new links went out without their tracking tags. So analytics could not tell those visitors came from the newsletter, and counted them as Direct.", data: "Email's visits fell {{emailSessFall}} — about {{emailLost}} fewer a day — and its revenue fell {{emailRevFall}} with them. Direct gained about {{directGain}} visits a day ({{directSessUp}}). Add the two together and nothing changed. Sitewide conversion moved {{siteConvCh}}, revenue {{siteRevCh}}, and back-office orders {{ordersCh}}. Email's own conversion rate, on the few visits still tagged, moved {{emailConvCh}}. A group that small is noisy, and the visits that lost their tags kept buying under Direct. View Traffic source by sessions or by revenue and you can see the swap. The funnel, filtered to email, shows no broken step, because nothing broke.", herrings: "Moving the send day could move email's visits around the week. But it cannot make Direct rise by what email lost, or leave the total the same. The checkout autocomplete changed nothing.", next: "Put the tracking tags back in the template. Check them in the tag-manager preview before every send. Nobody should move budget: the newsletter is working exactly as well as before." },
        } },
      },
      {
        ticket: { ...GROWTH, subject: "Retargeting has halved — pause the campaign?", body: "Retargeting's conversions have dropped by {{rtFall}} since last week, with no change in spend. Marketing want to pause it and move the budget into search. Is retargeting broken, and since when? We need a straight answer before the budget moves." },
        facts: (h) => {
      const rt = h.seg("campaign", "retargeting").lens, ge = h.seg("campaign", "generic").lens;
      return {
        siteConvCh: h.ch(h.top.conversionRate.pctChange), siteRevCh: h.ch(h.top.revenue.pctChange), ordersCh: h.ch(h.top.orders.pctChange),
        rtFall: h.pc(rt.conversionRate.delta), rtSessCh: h.ch(rt.sessions.delta), genConvUp: h.ch(ge.conversionRate.delta), genSessCh: h.ch(ge.sessions.delta),
      };
    },
        requires: (h) => Math.abs(h.top.conversionRate.pctChange) < 0.05 && Math.abs(h.top.orders.pctChange) < 0.06 && Math.abs(h.top.revenue.pctChange) < 0.07 && h.seg("campaign", "generic").lens.conversionRate.delta > 0.2,
        // A new attribution model: the last click loses credit to earlier touches.
        incident: { dimension: "campaign", segment: "retargeting", to: "generic", type: "attribution", moves: "credit", shape: "cliff", startDay: 16, factor: 0.45 },
        sessionShiftEvents: [],
        events: [
          { day: 15, label: "Ad creative refreshed across the display network", real: false },
          { day: 16, label: "Analytics attribution model switched to data-driven", real: true },
          { day: 18, label: "Product-page reviews widget upgraded", real: false },
        ],
        truth: { dimension: "campaign", segment: "retargeting", startDay: 16, shape: "cliff", causeType: "attribution_change", explanation: {
          what: "Nothing happened to customers. On {{day:16}} the analytics attribution model was switched from last click to data-driven. Retargeting ads are usually the LAST click before a purchase, so under the old model they got all the credit; the new model shares it with the searches that started the journey.",
          data: "From {{day:16}}, retargeting's conversions fell {{rtFall}} while its visits moved {{rtSessCh}}; generic search's conversions went {{genConvUp}}, with its visits moving {{genSessCh}}. Add the campaigns together and the total is unchanged: sitewide conversion moved {{siteConvCh}}, revenue {{siteRevCh}} and back-office orders {{ordersCh}}. The funnel, filtered to retargeting, shows no broken step. The credit moved; the customers didn't.",
          herrings: "The display creative refresh could change how retargeting performs, but it can't move the same conversions to generic search with the total unchanged. The reviews widget changed nothing in the data.",
          next: "Tell marketing before anyone reallocates budget: compare campaigns only under one attribution model, re-baseline the targets from {{day:16}}, and label the model change on every dashboard.",
          plain: { what: "Nothing happened to customers. On {{day:16}} the analytics attribution model was changed from 'last click' to 'data-driven'. Retargeting ads are usually the last click before a purchase. Under the old model they got all the credit. The new model shares the credit with the searches that started the journey.", data: "From {{day:16}}, retargeting's conversions fell {{rtFall}}, while its visits moved {{rtSessCh}}. Generic search's conversions went {{genConvUp}}, and its visits moved {{genSessCh}}. Add the campaigns together and the total is the same. Sitewide conversion moved {{siteConvCh}}, revenue {{siteRevCh}}, and back-office orders {{ordersCh}}. The funnel, filtered to retargeting, shows no broken step. The credit moved. The customers did not.", herrings: "The new ad creative could change how retargeting performs. But it cannot move the same conversions to generic search and leave the total the same. The reviews widget changed nothing.", next: "Tell marketing before anyone moves budget. Compare campaigns only under one attribution model. Reset the targets from {{day:16}}. Label the model change on every dashboard." },
        } },
      },
    ],
  },
];
