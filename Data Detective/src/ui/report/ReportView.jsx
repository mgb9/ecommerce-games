import React, { useEffect, useId, useState } from "react";
import { T, btn, linkBtn } from "../theme.js";
import { useSessionState } from "../session.js";
import { MODULE } from "../outcomesModel.js";

/* The case report: a printable document the student saves as a PDF with
   the browser's own "Save as PDF" — which, in Chrome, produces a tagged,
   screen-reader-friendly PDF — rather than a library-drawn one. They can
   type their name and their reflection answers first; the answers print
   as text, and unanswered questions print as ruled lines to write on.
   On screen it reads as a paper document; in print (see GLOBAL_CSS) the
   game around it disappears. While it is open, the page title is set to
   the report's name, which browsers use as the PDF's file name. */
const NAME_KEY = "dd-student-name";
export const TONE = { pos: [T.posTint, T.pos], neg: [T.negTint, T.neg], amber: [T.amberTint, T.amber] };

export function useStudentName() {
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; } });
  useEffect(() => { try { localStorage.setItem(NAME_KEY, name); } catch {} }, [name]);
  return [name, setName];
}

// While a printable page is open its title is the document's name — which
// browsers use as the saved PDF's file name.
export function useDocumentTitle(title, name) {
  useEffect(() => {
    const previous = document.title;
    document.title = title + (name.trim() ? ` – ${name.trim()}` : "");
    return () => { document.title = previous; };
  }, [title, name]);
}

// The screen-only bar above a printable page: a way back, and Save as PDF.
export function PrintBar({ onBack, backLabel, note }) {
  return (
    <div className="dd-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, maxWidth: 860, margin: "0 auto 14px" }}>
      <button onClick={onBack} style={linkBtn}>{backLabel}</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, color: T.muted, maxWidth: 330, lineHeight: 1.45 }}>Opens your browser's print window — choose <b style={{ color: T.text }}>Save as PDF</b> as the destination.{note ? ` ${note}` : ""}</span>
        <button onClick={() => window.print()} style={{ ...btn(T.playerBtn), padding: "12px 22px", fontSize: 16 }}>Save as PDF</button>
      </div>
    </div>
  );
}

// A printable document: the article the print CSS keeps (GLOBAL_CSS), its
// header — kicker, title, meta line — and the student's (optional) name.
export function ReportArticle({ kicker, tag = "WM956-15 · LO3", title, meta, name, setName, children }) {
  const nameId = useId();
  return (
    <article className="dd-report" aria-labelledby="dd-report-title" style={{ background: "#FFFFFF", color: T.text, maxWidth: 860, margin: "0 auto", padding: "clamp(22px, 5vw, 46px) clamp(18px, 5vw, 50px)", borderRadius: 6, border: `1px solid ${T.border}`, boxShadow: "0 18px 40px -30px rgba(0,0,0,0.45)", fontSize: 15, lineHeight: 1.55 }}>
      <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>
          <span style={{ color: T.playerText }}>{kicker}</span>
          <span style={{ color: T.muted }}>{tag}</span>
        </div>
        <h1 id="dd-report-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 31px)", lineHeight: 1.15, letterSpacing: -0.5, margin: "10px 0 6px" }}>{title}</h1>
        <div style={{ fontSize: 13.5, color: T.muted }}>{meta.join(" · ")}</div>
        <div className="dd-noprint" style={{ marginTop: 14 }}>
          <label htmlFor={nameId} style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Your name <span style={{ fontWeight: 400, color: T.muted }}>(optional — printed on the report, saved only in this browser)</span></label>
          <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={{ width: "100%", maxWidth: 380, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: "inherit", color: T.text }} />
        </div>
        <div className="dd-print-only" style={{ marginTop: 10, fontSize: 14 }}><b>Name:</b> {name.trim() || "______________________________"}</div>
      </header>
      {children}
      <footer style={{ marginTop: 26, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 12.5, color: T.muted }}>
        Data Detective · WM956-15 e-commerce learning games · WMG, University of Warwick. Made in your browser — nothing in this report was sent anywhere.
      </footer>
    </article>
  );
}

export default function ReportView({ model, sessionKey, onBack }) {
  const [name, setName] = useStudentName();
  const [answers, setAnswers] = useSessionState(`${sessionKey}:answers`, {});
  useDocumentTitle(model.fileTitle, name);

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} backLabel="← back to your results" note="Your answers are included." />

      <ReportArticle kicker="Data Detective · Case report" tag={model.tag} title={model.title} meta={model.meta} name={name} setName={setName}>

        <Section title="At a glance">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, alignItems: "stretch" }}>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.muted }}>Your score</div>
              <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 40, lineHeight: 1.1, margin: "4px 0" }}>{model.score.got}<span style={{ color: T.muted, fontSize: 26 }}> / {model.score.outOf}</span></div>
              <div style={{ fontSize: 14, color: T.muted }}>calls right{model.score.detail ? ` · ${model.score.detail}` : ""}</div>
            </div>
            <div style={{ borderLeft: `5px solid ${T.player}`, background: T.panel2, borderRadius: "0 10px 10px 0", padding: "14px 16px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.playerText }}>The principle to remember</div>
              <p style={{ margin: "6px 0 0", fontSize: 15.5, fontWeight: 700, lineHeight: 1.5 }}>{model.principle}</p>
            </div>
          </div>
          {model.confidence && (
            <p style={{ margin: "14px 0 0", padding: "10px 14px", borderRadius: 10, background: TONE[model.confidence.verdict?.tone || "amber"][0] }}>
              <b>How sure you were:</b> {model.confidence.label}. {model.confidence.verdict?.text}
            </p>
          )}
        </Section>

        <Section title={model.callsTitle}>
          <div role="region" aria-label={`${model.callsTitle} (table)`} tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 460 }}>
              <thead>
                <tr>{["", "You said", "The truth", "Result"].map((h, i) => <th key={i} scope="col" style={{ textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {model.calls.map((c) => (
                  <tr key={c.label} style={{ verticalAlign: "top" }}>
                    <th scope="row" style={{ textAlign: "left", padding: "9px 10px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{c.label}</th>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}` }}>{c.you}</td>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, color: c.ok ? T.muted : T.text }}>{c.ok ? "Same" : c.truth}</td>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}><ResultTag ok={c.ok} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Feedback">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 18 }}>
            <BulletList title="What went well" items={model.wentWell} mark="✓" color={T.pos} empty="Finishing the case is a start — the trail below shows where to look next time." />
            <BulletList title="What to work on next time" items={model.workOn} mark="→" color={T.amber} empty="Nothing to fix on this one — try a fresh variant to make sure it wasn't luck." />
          </div>
        </Section>

        {model.develops && <Developed d={model.develops} />}

        <Section title="How you investigated">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 18 }}>
            {model.trail.map((t) => (
              <div key={t.heading}>
                <h3 style={subHead}>{t.heading}</h3>
                {t.items.length ? <ol style={{ margin: 0, paddingLeft: 22 }}>{t.items.map((x, i) => <li key={i} style={{ marginBottom: 2, breakInside: "avoid" }}>{x}</li>)}</ol> : <p style={{ margin: 0, color: T.muted }}>{t.empty}</p>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="What actually happened">
          <p style={{ margin: "0 0 12px" }}>{model.happened.text}</p>
          {model.happened.events && (
            <>
              <h3 style={subHead}>The timeline events</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {model.happened.events.map((e, i) => <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}><Tag tone={e.tone}>{e.tag}</Tag><span>{e.label}</span></li>)}
              </ul>
            </>
          )}
          {model.happened.clues && (
            <>
              <h3 style={subHead}>The clue chain</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {model.happened.clues.map((c) => (
                  <li key={c.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, breakInside: "avoid" }}>
                    <Tag tone={c.tone}>{c.tag}</Tag>
                    <span><b>{c.label}{c.core ? " (core clue)" : ""}.</b> {c.detail}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        {model.reply && (
          <Section title={`Your reply to ${model.reply.name}`}>
            <Reply reply={model.reply} value={answers.reply || ""} onChange={(v) => setAnswers((a) => ({ ...a, reply: v }))} />
          </Section>
        )}

        <Section title="Reflection — bring this to the seminar">
          <ol style={{ margin: 0, paddingLeft: 22 }}>
            {model.reflection.map((q, i) => <Answer key={i} question={q} value={answers[i] || ""} onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))} />)}
          </ol>
        </Section>

        {model.words.length > 0 && (
          <Section title="Words to know">
            <dl style={{ margin: 0 }}>
              {model.words.map((w) => (
                <div key={w.term} style={{ marginBottom: 8, breakInside: "avoid" }}>
                  <dt style={{ fontWeight: 700, display: "inline" }}>{w.term}: </dt>
                  <dd style={{ display: "inline", margin: 0 }}>{w.def}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </ReportArticle>
    </div>
  );
}

export const subHead = { fontSize: 13, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: T.muted, margin: "0 0 6px" };

export function Section({ title, children }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 10px", letterSpacing: -0.2, breakAfter: "avoid" }}>{title}</h2>
      {children}
    </section>
  );
}
export function Tag({ tone, children }) {
  const [bg, fg] = TONE[tone] || TONE.amber;
  return <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", padding: "2px 8px", borderRadius: 6, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
}
function ResultTag({ ok }) {
  return <Tag tone={ok ? "pos" : "neg"}><span aria-hidden="true">{ok ? "✓ " : "✗ "}</span>{ok ? "Correct" : "Not quite"}</Tag>;
}
function BulletList({ title, items, mark, color, empty }) {
  return (
    <div>
      <h3 style={subHead}>{title}</h3>
      {items.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((x, i) => <li key={i} style={{ display: "flex", gap: 8, marginBottom: 7, breakInside: "avoid" }}><span aria-hidden="true" style={{ color, fontWeight: 900 }}>{mark}</span><span>{x}</span></li>)}
        </ul>
      ) : <p style={{ margin: 0, color: T.muted }}>{empty}</p>}
    </div>
  );
}
// A reflection question with a box to answer in. In print, the answer
// appears as text — or, if blank, as ruled lines to write on by hand.
function Answer({ question, value, onChange }) {
  const id = useId();
  return (
    <li style={{ marginBottom: 16, breakInside: "avoid" }}>
      <label htmlFor={id} style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>{question}</label>
      <textarea id={id} className="dd-noprint" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer (optional) — it will be printed with the report"
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: "inherit", fontSize: 14.5, color: T.text, resize: "vertical" }} />
      <div className="dd-print-only">
        {value.trim()
          ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value}</p>
          : Array.from({ length: 4 }, (_, i) => <div key={i} style={{ height: 26, borderBottom: "1px solid #9A9A9E" }} />)}
      </div>
    </li>
  );
}

// What the case developed: the learning outcomes it serves (the module
// specification's wording), the skills practised and what that looked like
// here, and a line the student can use on a CV or in an interview.
function Developed({ d }) {
  const moduleHref = MODULE.url.replace(/^https:\/\//, "");
  return (
    <Section title="What this case developed">
      <h3 style={subHead}>Learning outcomes</h3>
      <ul style={{ margin: "0 0 6px", paddingLeft: 22 }}>
        {d.los.map((lo) => <li key={lo.code} style={{ marginBottom: 4, breakInside: "avoid" }}><b>{lo.code}{lo.partly ? " (partly)" : ""}</b> — {lo.text}</li>)}
      </ul>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: T.muted }}>
        Syllabus: {d.syllabus.join("; ")}. All the module's learning outcomes: <a href={MODULE.url} style={{ color: T.text, overflowWrap: "anywhere" }}>{moduleHref}</a>
      </p>
      <h3 style={subHead}>Skills you practised</h3>
      <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
        {d.skills.map((s) => (
          <li key={s.id} style={{ marginBottom: 8, breakInside: "avoid" }}>
            <b>{s.name}</b> <span style={{ color: T.muted, fontSize: 13.5 }}>({s.kind.toLowerCase()})</span> — {s.did}
          </li>
        ))}
      </ul>
      <h3 style={subHead}>For your CV or an interview</h3>
      <p style={{ margin: 0, padding: "10px 14px", borderLeft: `4px solid ${T.player}`, background: T.panel2, borderRadius: "0 8px 8px 0", breakInside: "avoid" }}>{d.cv}</p>
      <p style={{ margin: "6px 0 0", fontSize: 13.5, color: T.muted }}>In an interview, tell it as situation, task, action and result — and say it was a simulation: the method is what counts.</p>
    </Section>
  );
}

// The communication exercise: reply to the person who raised the ticket, for
// a reader who isn't an analyst. Prints as text, or as lines to write on.
function Reply({ reply, value, onChange }) {
  const id = useId();
  return (
    <div style={{ breakInside: "avoid" }}>
      <p style={{ margin: "0 0 8px" }}>
        {reply.from} asked: <i>“{reply.subject}”</i> Write the reply you would send — three to five sentences they could forward to their manager. Say what happened, how sure you are, what should happen next and who should do it. If you use a word like “segment” or “conversion rate”, say what it means.
      </p>
      <label htmlFor={id} style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>Your reply to {reply.name}</label>
      <textarea id={id} className="dd-noprint" rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your reply (optional) — it will be printed with the report"
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: "inherit", fontSize: 14.5, color: T.text, resize: "vertical" }} />
      <div className="dd-print-only">
        {value.trim()
          ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value}</p>
          : Array.from({ length: 6 }, (_, i) => <div key={i} style={{ height: 26, borderBottom: "1px solid #9A9A9E" }} />)}
      </div>
    </div>
  );
}
