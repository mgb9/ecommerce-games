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

   Event labels are deliberately oblique: a real changelog entry wouldn't
   pre-name the dimension, segment or cause for you (also tested).
   ============================================================ */

const OPS = { channel: "#cro-team", from: "Priya · Ops" };
const GROWTH = { channel: "#cro-team", from: "Dev · Growth Lead" };
const days = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const CASES = [
  /* ---- 1 · Beginner: one payment route fails ---------------------- */
  {
    id: "paypal-gateway", n: 1, difficulty: "Beginner",
    words: ["segmentation", "gateway", "redherring", "funnelstep"],   // glossary terms for the case report
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
          explanation: "The 'backend infrastructure patch' was really a PayPal integration update. It broke payment for many customers paying with PayPal: PayPal's conversion rate fell by about two-thirds, while every other payment method moved only within its usual week-to-week wobble (small ones such as bank transfer wobble most, because they have few orders). PayPal handles about a quarter of checkouts, so this one failure explains the whole revenue drop. The marketing campaign was real and did bring in more email visitors, but they converted at the normal rate, so the campaign was not the cause. The database maintenance two days earlier changed nothing in the data.",
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
          explanation: "The certificate rotation missed one certificate: the one Apple Pay uses to identify Chrichton as a merchant. From day 17 almost every Apple Pay payment failed, so Apple Pay's conversion rate collapsed by more than 90%, while card, PayPal and bank transfer moved only within their usual week-to-week wobble. Apple Pay handles only about one checkout in eight, which is why the sitewide drop is a moderate 10–15% rather than a crash — and why it is easy to dismiss. The marketing campaign was real and did bring in more email visitors, but they converted at the normal rate. The database maintenance two days earlier changed nothing in the data.",
        },
      },
    ],
  },

  /* ---- 2 · Intermediate: a fault that lives in an intersection ---- */
  {
    id: "mobile-safari-bug", n: 2, difficulty: "Intermediate",
    words: ["crosstab", "segmentation", "funnelstep", "redherring"],   // glossary terms for the case report
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
          explanation: "Release v4.2 changed the checkout layout. This broke the 'Add to cart' button, but only in the Safari browser on mobile phones — a common kind of bug: not Safari on desktop, and not Chrome or Firefox on phones. If you check Device on its own, Mobile is down about a fifth — a real drop, but nowhere near a broken checkout, because three in four mobile visitors use other browsers and were not affected. If you check Browser on its own, Safari is down about a third, because about half of Safari visitors are on desktop and were fine. Each single report points at half of the answer, and either half on its own is the wrong diagnosis. Only the Device × Browser cross-tab isolates Mobile plus Safari, where conversion fell by around 90% while every other combination moved only within its normal wobble. The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally — a change in volume, not quality. The internal brand-refresh announcement had no effect on customers.",
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
          explanation: "Release v4.2 replaced the delivery-date picker in checkout, and the new picker failed in Safari on Mac desktops: customers could not choose a delivery slot, so they could not complete checkout. Phones were fine, which is why nobody on the team could reproduce it. If you check Device on its own, Desktop is down about a fifth — a real drop, but three in four desktop visitors use other browsers and were fine. If you check Browser on its own, Safari is down by about half, because about half of Safari visitors are on desktop — tempting, but naming Safari alone is the wrong diagnosis: Safari on phones and tablets was fine. Only the Device × Browser cross-tab isolates Desktop plus Safari, where conversion fell by more than 80% while every other combination moved only within its normal wobble. The competitor's price-match offer was real and moved some paid-search visitors away, but those who stayed converted normally. The internal brand-refresh announcement had no effect on customers.",
        },
      },
    ],
  },

  /* ---- 3 · Intermediate: the average falls, nothing broke --------- */
  {
    id: "traffic-mix", n: 3, difficulty: "Intermediate",
    words: ["mixshift", "conversion", "segmentation", "redherring"],   // glossary terms for the case report
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
          explanation: "Nothing on the site broke. Check any traffic source's own conversion rate — including paid social's — and none of them fell by more than its ordinary week-to-week wobble. What changed is the MIX of traffic. A 3× paid-social push flooded the site with low-intent visitors, and paid social converts far below organic and email; at the same time organic, your best-converting source, dipped. More visitors, lower-quality average. The sitewide rate fell only because the composition of traffic got worse — not because any page or checkout failed. This is a mix shift (a Simpson's-paradox effect): the aggregate moves even though no underlying group did. The trap is to go hunting for a broken segment; the honest finding is that there is none, and the conversation belongs with marketing about traffic quality and targeting, not with engineering. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
        },
      },
      {
        ticket: { ...GROWTH, subject: "More traffic, lower conversion — is the site broken?", body: "Traffic is up but sitewide conversion has slipped and revenue hasn't grown with the visits. Nobody has touched the checkout and error rates are normal. We did just switch our search ads to a broad-match strategy to grow volume. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence." },
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
          explanation: "Nothing on the site broke. Check any campaign's own conversion rate — including generic search's — and none of them fell by more than its ordinary week-to-week wobble. What changed is the MIX of traffic. Switching search ads to broad match roughly tripled generic, non-brand search visits: people who typed loosely related phrases, many of whom were never going to buy, and generic search converts well below brand search and retargeting. Brand search's share fell at the same time. More visitors, lower-quality average: the sitewide rate fell only because the composition of traffic got worse. This is a mix shift (a Simpson's-paradox effect). The trap is to go hunting for a broken segment; the honest finding is that there is none, and the conversation belongs with whoever runs paid search, not with engineering. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
        },
      },
    ],
  },

  /* ---- 4 · Advanced: a real fault hidden by good news ------------- */
  {
    id: "masked-desktop", n: 4, difficulty: "Advanced",
    words: ["masking", "mixshift", "segmentation"],   // glossary terms for the case report
    lesson: "A calm topline does not mean nothing is wrong. A favourable mix shift can mask a severe localised fault — segment anyway, and treat good news that arrives with a dip as possible camouflage.",
    variants: [
      {
        ticket: { ...OPS, subject: "Small dip, but revenue feels worse than it should", body: "Sitewide conversion is only down a few percent — well within what we'd normally call noise — and returning-customer numbers are actually up after our loyalty push, so most of the team thinks we're fine. But revenue is softer than that small dip suggests, and a few customers mentioned checkout looked odd. Can you confirm there's really nothing wrong?" },
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
          explanation: "There is a real, serious incident — it is just hidden. The checkout refactor broke conversion on desktop from day 18. The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the desktop collapse. Segment by device and the pattern is unmistakable: mobile is UP, typically by 10–20%, carried by the returning-customer surge (tablet is a small segment, so its figure swings either way), while desktop is DOWN by about a fifth despite that same tailwind — so the bug itself cut desktop conversion by more than a quarter. The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
        },
      },
      {
        ticket: { ...OPS, subject: "Revenue feels soft, but the numbers say we're fine", body: "Sitewide conversion is only down a few percent — well within what we'd normally call noise — and returning-customer numbers are up after our loyalty push, so most of the team thinks we're fine. But revenue is softer than that small dip suggests, and a couple of customers complained that checkout 'froze'. Can you confirm there's really nothing wrong?" },
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
          explanation: "There is a real, serious incident — it is just hidden. The checkout refactor broke conversion on mobile phones from day 17. The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers and email traffic, both of which convert well above average — that favourable mix shift lifted conversion on every device and masked the mobile collapse. Segment by device and the pattern is unmistakable: desktop is UP, typically by 10–15%, carried by the returning-customer surge (tablet is a small segment, so its figure swings either way), while mobile is DOWN by more than a third despite that same tailwind — so the bug itself cut mobile conversion almost in half. The team read the returning-user surge as good news; it was actually camouflage. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect.",
        },
      },
    ],
  },

  /* ---- 5 · Intermediate: a slow bleed, not a cliff --------------- */
  {
    id: "stockout-slow-bleed", n: 5, difficulty: "Intermediate",
    words: ["funnelstep", "baseline", "anomaly"],   // glossary terms for the case report
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
          explanation: "The best-selling range ran out of stock. A supplier delay, notified on day 13, meant that as the range sold through, more and more of its sizes and colours showed 'out of stock'. Visitors who landed straight on those product pages — from Shopping ads and search results — increasingly could not add to cart, so conversion for product-page landings slid from day 13 and was down by about half by the last week, while category, home and search-results landings held. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to product-page landings, pins the drop to the Add to cart step. The new photography and the competitor's sale were coincidences; the sale nudged paid-search visits for a weekend, but those visitors converted normally.",
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
          explanation: "The best-selling range ran out of stock. A supplier delay, notified on day 14, meant that as the range sold through, more and more of its products showed 'out of stock' — but the retargeting ads kept showing shoppers exactly the products they had looked at before, which were increasingly the sold-out ones. Retargeting visitors arrived wanting something they could no longer add to cart, so retargeting's conversion slid from day 14 and was down by about half by the last week, while every other campaign held. The shape is the clue: a deploy or a gateway failure breaks things all at once, but a slide that deepens day after day points to something being used up. Funnel exploration, filtered to retargeting, pins the drop to the Add to cart step. The new photography and the competitor's sale were coincidences.",
        },
      },
    ],
  },

  /* ---- 6 · Advanced: the dashboard is wrong, not the shop --------- */
  {
    id: "false-alarm-tracking", n: 6, difficulty: "Advanced",
    words: ["groundtruth", "funnelstep", "anomaly"],   // glossary terms for the case report
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
          explanation: "Nothing broke for customers. The tag-manager update changed how cookie consent loads, and Safari's tracking prevention blocked the new script — so from day 19 the purchase tag stopped firing for most Safari orders. In analytics, Safari's conversion rate 'collapsed' by about 90% and the sitewide figure fell by about a fifth. But back-office orders, which come from the order database rather than from analytics, never dipped: analytics normally records about 96% of orders, and from day 19 it recorded only about three-quarters. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can. Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
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
          explanation: "Nothing broke for customers. The new order-confirmation template went out without the purchase tag on its mobile layout — so from day 18, orders placed on phones completed normally but most of them were never recorded in analytics. In analytics, mobile's conversion rate 'collapsed' by about 85% and the sitewide figure fell by nearly a third. But back-office orders, which come from the order database rather than from analytics, never dipped: analytics normally records about 96% of orders, and from day 18 it recorded only about two-thirds. The funnel pins the drop to the Purchase step — exactly what a gateway failure would also show — so the funnel alone can't tell a broken checkout from a broken tag; only a ground-truth number can. Rolling the site back would have fixed nothing. The payment provider's maintenance and the sale emails had no effect on conversion.",
        },
      },
    ],
  },

  /* ---- 7 · Advanced: nothing is broken ---------------------------- */
  {
    id: "normal-week", n: 7, difficulty: "Advanced",
    words: ["noise", "baseline", "anomaly"],   // glossary terms for the case report
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
          explanation: "Nothing is broken. Monday was a UK bank holiday: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Tuesday. Over the week as a whole, conversion is within a few percent of the first week. The reports that looked alarming were small segments with only a few dozen orders a week, where a swing of 20% or more between two weeks is ordinary chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day. The CSS fix and the returns-policy update had no effect. The right call is to roll back nothing and explain the calendar.",
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
          explanation: "Nothing is broken. On Thursday evening the cup final was on national TV: fewer people shopped, and the people who browsed bought less, so traffic and conversion dipped for one day — in every segment at once — and were back to normal on Friday. Over the week as a whole, conversion is within a few percent of the first week. The reports that looked alarming were small segments with only a few dozen orders a week, where a swing of 20% or more between two weeks is ordinary chance. A real incident would show a drop that is bigger than that normal variation, confined to one group, and still there the next day. The CSS fix and the returns-policy update had no effect. The right call is to roll back nothing and explain the calendar.",
        },
      },
    ],
  },
];
