#!/usr/bin/env python3
"""Curate the six real GA xlsx exports (25 Aug - 3 Nov 2015) into the
fieldcase-data.js module for Data Detective's Case 5. Merchant anonymised:
ballicom -> chrichton. Point GA at the directory holding the six
'Analytics-*.xlsx' workbooks (source of truth lives in OneDrive:
Modules/14 eBusiness Fundamentals/Google analytics data). Needs openpyxl."""
import openpyxl, json, re, os

GA = os.environ.get("GA_DIR", "/Users/markbonnett/Library/CloudStorage/OneDrive-UniversityofWarwick/Modules/14 eBusiness Fundamentals/Google analytics data")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "engine", "fieldcase-data.js")

def anon(s):
    return re.sub(r"ballicom", "chrichton", s, flags=re.I)

def load(fname):
    wb = openpyxl.load_workbook(os.path.join(GA, fname), data_only=True)
    return wb

def rows_of(wb, sheet="Dataset1"):
    return list(wb[sheet].iter_rows(values_only=True))

def r2(x): return round(x, 2) if isinstance(x, float) else x
def r4(x): return round(x, 4) if isinstance(x, float) else x

# standard GA row: name, sessions, %new, newUsers, bounce, pages, dur, conv, trans, revenue
def std_row(rid, r, conv_idx=7, trans_idx=8, rev_idx=9):
    return {
        "id": rid, "name": anon(str(r[0])),
        "sessions": round(r[1]), "pctNew": r4(r[2]), "newUsers": round(r[3]),
        "bounce": r4(r[4]), "pages": r2(r[5]), "dur": r2(r[6]),
        "conv": r4(r[conv_idx]), "trans": round(r[trans_idx]), "revenue": r2(r[rev_idx]),
    }

def tail_row(total, kept, name, rid, trans_idx=8, rev_idx=9):
    """The '(all other …)' row, derived by SUBTRACTING the kept rows from the
    report's own total row — GA exports truncate the long tail, so summing
    the leftover named rows understates it. Weighted metrics recovered via
    session-weighted sums."""
    S = total[1] - sum(r[1] for r in kept)
    wsum = lambda i: total[1]*total[i] - sum(r[1]*r[i] for r in kept)
    trans = round(total[trans_idx] - sum(r[trans_idx] for r in kept))
    rev = total[rev_idx] - sum(r[rev_idx] for r in kept)
    return {"id": rid, "name": name, "sessions": round(S),
            "pctNew": r4(wsum(2)/S), "newUsers": round(total[3] - sum(r[3] for r in kept)),
            "bounce": r4(wsum(4)/S), "pages": r2(wsum(5)/S), "dur": r2(wsum(6)/S),
            "conv": r4(trans/S), "trans": trans, "revenue": r2(rev)}

out = {}

# ---- Channels ----
wb = load("Analytics-All Traffic-Channels 20150825-20151103.xlsx")
rows = rows_of(wb)[1:]
chan, chan_total = [], None
for r in rows:
    if r[0] is None:
        chan_total = std_row("ch-total", ("Total",)+r[1:])
    else:
        chan.append(std_row("ch-" + r[0].lower().replace(" ", ""), r))
out["channels"] = {"rows": chan, "total": chan_total}

# daily sessions
d2 = rows_of(wb, "Dataset2")[1:]
daily = [{"date": r[0].strftime("%d %b"), "sessions": r[1]} for r in d2 if r[0] is not None]
out["daily"] = daily

# ---- Source / Medium ----
wb = load("Analytics-All Traffic-Source Medium 20150825-20151103.xlsx")
all_rows = rows_of(wb)[1:]
sm_total = next(r for r in all_rows if r[0] is None)
rows = [r for r in all_rows if r[0] is not None]
FORCE = ["sandbox.paypal.com / referral", "live.sagepay.com / referral",
         "192.168.1.100:7777 / referral", "2staging.ballicom.co.uk / referral",
         "workshop.ballicom.co.uk / referral", "myvouchercodes.co.uk / referral",
         "voucherslug.co.uk / referral", "mail.google.com / referral",
         "facebook.com / referral"]
top = rows[:16]
keep = list(top)
for f in FORCE:
    m = next((r for r in rows if r[0] == f), None)
    if m is not None and all(k[0] != f for k in keep): keep.append(m)
sm = [std_row("sm-" + re.sub(r"[^a-z0-9]+", "-", anon(r[0]).lower()).strip("-"), r) for r in keep]
sm.append(tail_row(sm_total, keep, "(all other sources)", "sm-other"))
out["sourceMedium"] = {"rows": sm}

# ---- Age (cols: ...,'Transactions','Revenue','E-commerce Conversion Rate') ----
wb = load("Analytics-Audience-Demographics- Age 20150825-20151103.xlsx")
rows = rows_of(wb)[1:]
age, age_total = [], None
for r in rows:
    row = std_row("age-" + (str(r[0]).replace("+","plus").replace("-","-") if r[0] else "total"),
                  r if r[0] else ("Total",)+r[1:], conv_idx=9, trans_idx=7, rev_idx=8)
    if r[0] is None: age_total = row; age_total["id"] = "age-total"
    else: age.append(row)
out["age"] = {"rows": age, "total": age_total}

# ---- Device (same col order as age) ----
wb = load("Analytics-Audience-Mobile-Overview 20150825-20151103.xlsx")
rows = rows_of(wb)[1:]
dev, dev_total = [], None
for r in rows:
    row = std_row("dev-" + (str(r[0]) if r[0] else "total"),
                  r if r[0] else ("Total",)+r[1:], conv_idx=9, trans_idx=7, rev_idx=8)
    row["name"] = row["name"].capitalize() if r[0] else row["name"]
    if r[0] is None: dev_total = row
    else: dev.append(row)
out["device"] = {"rows": dev, "total": dev_total}

# ---- Landing pages (same col order as age/device) ----
wb = load("Analytics-Behaviour-Landing Pages 20150825-20151103.xlsx")
all_rows = rows_of(wb)[1:]
lp_total = next(r for r in all_rows if r[0] is None)
rows = [r for r in all_rows if r[0] is not None and isinstance(r[1], (int, float))]
keep = rows[:22]
lp = [std_row(f"lp-{i}", r, conv_idx=9, trans_idx=7, rev_idx=8) for i, r in enumerate(keep)]
lp.append(tail_row(lp_total, keep, "(all other landing pages)", "lp-other", trans_idx=7, rev_idx=8))
out["landingPages"] = {"rows": lp}

# ---- Google Shopping (?ref=PLA) summary — provenance for the 'pla-waste'
# clue and FIELD_EXPLANATION, whose figures come from the WHOLE export, not
# just the top rows kept above. Landing-page cols: 0 page, 1 sessions,
# 4 bounce, 6 avg duration (s), 7 transactions, 8 revenue.
# CAVEAT: GA truncated this export to its 1,000 busiest pages (smallest kept
# row = 29 sessions), and the report total (lp_total) is far larger than the
# sum of named rows. PLA pages can't be picked out of that unnamed tail, so
# these aggregates cover ONLY the named PLA rows present in the export (a
# lower bound on all PLA traffic). The 200+ session count is NOT affected:
# every page with >=200 sessions is above the 29-session cut-off.
#   basis        — plain-English statement of the above, kept with the data
#   exportedRows / exportedSessions — named rows in the export, and their sessions
#   reportSessions — the report's own total row (incl. the truncated tail)
#   pages        — named landing-page rows whose URL ends '?ref=PLA'
#   products     — distinct product ids (the '.pNNNN.html' suffix) among them
#   sessions     — sum of sessions over those PLA rows
#   bounce       — session-weighted bounce rate (fraction, like row 'bounce')
#   dur          — session-weighted avg session duration, seconds
#   trans / revenue — summed transactions / revenue (£) on PLA-landing sessions
#   conv         — trans / sessions (fraction, like row 'conv')
#   zeroSaleOver200 — PLA pages with >=200 sessions and 0 transactions
#   zeroSaleOver200Products — same test after summing a product's PLA URLs
#   zeroSaleOver200Pages — those pages (sessions desc): name, sessions, bounce, dur
#   worst        — the first of those (most sessions, still no sale)
pla = [r for r in rows if r[0].endswith("?ref=PLA")]
pid = lambda u: re.search(r"\.p(\d+)\.html", u).group(1)
pla_S = sum(r[1] for r in pla)
pla_trans = round(sum(r[7] for r in pla))
pla_by_prod = {}
for r in pla:
    acc = pla_by_prod.setdefault(pid(r[0]), [0, 0])
    acc[0] += r[1]; acc[1] += r[7]
zero200 = sorted([r for r in pla if r[1] >= 200 and r[7] == 0], key=lambda r: -r[1])
zero200_rows = [{"name": anon(r[0]), "sessions": round(r[1]), "bounce": r4(r[4]), "dur": r2(r[6])}
                for r in zero200]
pla_summary = {
    "basis": ("Named ?ref=PLA rows in the 1,000-row Landing Pages export only; "
              "GA truncated the long tail (pages under 29 sessions), so these "
              "aggregates are a lower bound on all Shopping-ad traffic."),
    "exportedRows": len(rows), "exportedSessions": round(sum(r[1] for r in rows)),
    "reportSessions": round(lp_total[1]),
    "pages": len(pla), "products": len(pla_by_prod),
    "sessions": round(pla_S),
    "bounce": r4(sum(r[1]*r[4] for r in pla) / pla_S),
    "dur": r2(sum(r[1]*r[6] for r in pla) / pla_S),
    "trans": pla_trans, "revenue": r2(sum(r[8] for r in pla)),
    "conv": r4(pla_trans / pla_S),
    "zeroSaleOver200": len(zero200),
    "zeroSaleOver200Products": sum(1 for s, t in pla_by_prod.values() if s >= 200 and t == 0),
    "zeroSaleOver200Pages": zero200_rows,
    "worst": zero200_rows[0] if zero200_rows else None,
}

# ---- Products ----
wb = load("Analytics-Conversions-eCommerce-Product Performance 20150825-20151103.xlsx")
all_rows = rows_of(wb)[1:]
pr_total = next(r for r in all_rows if r[0] is None)
rows = [r for r in all_rows if r[0] is not None and isinstance(r[1], (int, float))]
by_qty = sorted(rows, key=lambda r: -r[1])[:14]
by_rev = sorted(rows, key=lambda r: -r[3])[:10]
keepset, keep = set(), []
for r in by_qty + by_rev:
    if r[0] not in keepset:
        keepset.add(r[0]); keep.append(r)
keep.sort(key=lambda r: -r[1])
prod_row = lambda rid, r: {"id": rid, "name": anon(r[0]), "qty": round(r[1]), "purchases": round(r[2]),
                           "revenue": r2(r[3]), "avgPrice": r2(r[4]), "avgQty": r2(r[5])}
prods = [prod_row(f"pr-{i}", r) for i, r in enumerate(keep)]
# Added 2026-10-08, with their own ids (pr-b*) so every row above keeps its id:
# the most-bought products by UNIQUE PURCHASES — so a ranking by buyers can be
# read off the report (Case 10: the top sellers by buyers are Samsung TVs and a
# TomTom, not the contracts and trade baskets that top revenue and units) — and
# the two iPad bulk orders Case 9's clue cites (60 iPad Air and 20 iPad mini 2,
# one purchase each), which the quantity/revenue cut had left out.
by_buyers = sorted(rows, key=lambda r: -r[2])[:14]
ipads = [r for r in rows if (str(r[0]).startswith("Apple iPad Air Wi-Fi - tablet - 16 GB") and r[1] == 60)
         or (str(r[0]).startswith("Apple iPad mini 2 Wi-Fi - tablet - 16 GB") and r[1] == 20)]
assert len(ipads) == 2, ipads
extra = []
for r in by_buyers + ipads:
    if r[0] not in keepset:
        keepset.add(r[0]); extra.append(r)
prods += [prod_row(f"pr-b{j}", r) for j, r in enumerate(extra)]
keep += extra
prods.sort(key=lambda p: -p["qty"])   # the report's default order: by quantity
oq = pr_total[1] - sum(r[1] for r in keep)
op = pr_total[2] - sum(r[2] for r in keep)
orev = pr_total[3] - sum(r[3] for r in keep)
prods.append({"id": "pr-other", "name": "(all other products)", "qty": round(oq),
              "purchases": round(op), "revenue": r2(orev),
              "avgPrice": r2(orev/max(1, oq)), "avgQty": r2(oq/max(1, op))})
out["products"] = {"rows": prods}
out["plaSummary"] = pla_summary   # appended last so existing keys keep their order

# print landing page + product ids so clue mapping can reference them
for row in out["landingPages"]["rows"]:
    print(row["id"], "|", row["name"][:80], "| sess", row["sessions"], "| trans", row["trans"], "| bounce", row["bounce"])
print("---")
for row in out["products"]["rows"]:
    print(row["id"], "|", row["name"][:60], "| qty", row["qty"], "| purch", row["purchases"], "| avgQty", row["avgQty"])
print("---")
for row in out["sourceMedium"]["rows"]:
    print(row["id"], "|", row["name"])
print("---")
print("PLA:", {k: v for k, v in pla_summary.items() if k not in ("basis", "zeroSaleOver200Pages")})

js = ("/* GENERATED by gen_fieldcase.py — curated from six REAL Google Analytics\n"
      "   exports (an anonymised UK electronics retailer, 25 Aug – 3 Nov 2015).\n"
      "   Real data, lightly curated: long-tail rows are aggregated into\n"
      "   '(N other …)' rows; every number that matters is untouched.\n"
      "   Do not hand-edit — regenerate from the source workbooks. */\n"
      "export const FIELD_DATA = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n")
with open(OUT, "w") as f:
    f.write(js)
print("\nwrote", OUT, len(js), "bytes")
