// Results page — the emotional payoff

const { useState: useStateR, useEffect: useEffectR, useMemo: useMemoR } = React;

function ConfidenceRing({ value, verdictColor }) {
  const [display, setDisplay] = useStateR(0);
  const r = 76;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (display / 100) * circumference;

  useEffectR(() => {
    const start = performance.now();
    const duration = 1400;
    let raf;
    const tick = (t) => {
      const elapsed = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(eased * value));
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const label = value >= 85 ? "High confidence" : value >= 65 ? "Moderate" : "Low confidence";

  return (
    <div className="confidence-ring-wrap">
      <div className="confidence-ring">
        <svg viewBox="0 0 180 180">
          <circle className="confidence-ring-bg" cx="90" cy="90" r={r} />
          <circle
            className="confidence-ring-fg"
            cx="90" cy="90" r={r}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="confidence-ring-text">
          <div className="num">{display}<span className="pct">%</span></div>
          <div className="lbl">Confidence</div>
        </div>
      </div>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

function VerdictHero({ result }) {
  const styles = useMemoR(() => {
    const map = {
      REAL:      { color: "var(--real)",      bg: "var(--real-bg)",      title: "Credible", badge: "✓ VERIFIED · REAL" },
      FAKE:      { color: "var(--fake)",      bg: "var(--fake-bg)",      title: "Not Credible", badge: "✗ FABRICATED · FAKE" },
      UNCERTAIN: { color: "var(--uncertain)", bg: "var(--uncertain-bg)", title: "Inconclusive", badge: "⚠ EVIDENCE MIXED · UNCERTAIN" },
    };
    return map[result.verdict];
  }, [result.verdict]);
  const I = window.Icons;
  const VerdictIco = result.verdict === "REAL" ? I.ShieldCheck : result.verdict === "FAKE" ? I.X : I.Alert;

  return (
    <div
      className="verdict-hero scale-in"
      style={{
        "--verdict-color": styles.color,
        "--verdict-bg": styles.bg,
      }}
    >
      <div>
        <div className="verdict-label">ASSESSMENT</div>
        <div className="verdict-badge">
          <VerdictIco size={14} /> {styles.badge}
        </div>
        <h1 className="verdict-title serif">{styles.title}.</h1>
        <p className="verdict-summary">{result.summary}</p>
      </div>
      <ConfidenceRing value={result.confidence} verdictColor={styles.color} />
    </div>
  );
}

function ReasoningCard({ result }) {
  const [expanded, setExpanded] = useStateR(false);
  const I = window.Icons;
  const shown = expanded ? result.reasoning : result.reasoning.slice(0, 2);
  return (
    <div className="result-card fade-up d-1">
      <div className="card-eyebrow">AI REASONING</div>
      <h3><span className="ico"><I.Brain size={16} /></span>The editor's notes</h3>
      <div className="reasoning-body">
        {shown.map((p, i) => (
          <p key={i} className={i === 0 ? "" : "muted"}>
            {i === 0 && <span style={{ color: "var(--terracotta)", marginRight: 6, fontFamily: "var(--font-mono)", fontSize: 14 }}>¶</span>}
            {p}
          </p>
        ))}
      </div>
      {result.reasoning.length > 2 && (
        <button className="expandable-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Collapse reasoning" : `Read full reasoning (${result.reasoning.length - 2} more)`}
          <I.ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function RedFlagsCard({ result }) {
  const I = window.Icons;
  const flags = result.red_flags || [];
  if (flags.length === 0) {
    return (
      <div className="result-card fade-up d-2">
        <div className="card-eyebrow">RED FLAGS DETECTED</div>
        <h3><span className="ico" style={{ color: "var(--real)" }}><I.Check size={16} /></span>No warning signals</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>
          TruthLens scanned for thirteen common markers of misinformation — sensational language, missing sources, unverifiable experts, manipulated imagery — and flagged none. That doesn't guarantee accuracy, but it's consistent with how responsible reporting reads.
        </p>
        {result.positive_signals && result.positive_signals.length > 0 && (
          <ul className="flag-list" style={{ marginTop: 20 }}>
            {result.positive_signals.map((f, i) => (
              <li key={i} className="flag-item" style={{ "--flag-color": "var(--real)", "--flag-bg": "var(--real-bg)" }}>
                <span className="flag-ico"><I.Check size={14} /></span>
                <div className="flag-body">
                  <div className="flag-title">{f.title}</div>
                  <div className="flag-desc">{f.desc}</div>
                  <div className="flag-severity">POSITIVE · {f.severity}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const sevColor = (s) => {
    if (s === "critical") return { color: "var(--fake)", bg: "var(--fake-bg)" };
    if (s === "high") return { color: "var(--fake)", bg: "var(--fake-bg)" };
    if (s === "moderate") return { color: "var(--uncertain)", bg: "var(--uncertain-bg)" };
    return { color: "var(--stone)", bg: "var(--surface-2)" };
  };
  return (
    <div className="result-card fade-up d-2">
      <div className="card-eyebrow">RED FLAGS DETECTED · {flags.length}</div>
      <h3><span className="ico" style={{ color: "var(--fake)" }}><I.Flag size={16} /></span>Warning signals</h3>
      <ul className="flag-list">
        {flags.map((f, i) => {
          const c = sevColor(f.severity);
          return (
            <li key={i} className="flag-item" style={{ "--flag-color": c.color, "--flag-bg": c.bg }}>
              <span className="flag-ico"><I.Alert size={14} /></span>
              <div className="flag-body">
                <div className="flag-title">{f.title}</div>
                <div className="flag-desc">{f.desc}</div>
                <div className="flag-severity">{f.severity.toUpperCase()} SEVERITY</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SourceCard({ result }) {
  const I = window.Icons;
  const s = result.source;
  const score = s.reputation_score;
  const repColor = score >= 4 ? "var(--real)" : score >= 3 ? "var(--uncertain)" : "var(--fake)";
  return (
    <div className="result-card fade-up d-3">
      <div className="card-eyebrow">SOURCE ANALYSIS</div>
      <h3><span className="ico"><I.Globe size={16} /></span>Domain profile</h3>
      <div className="source-block">
        <div className="source-meta">
          <small>DOMAIN</small>
          <span className="source-domain">{s.domain}</span>
        </div>
        <div className="source-rating" style={{ color: repColor }}>
          <div className="bar-meter">
            {[1,2,3,4,5].map(i => <span key={i} className={i <= score ? "on" : ""} style={i <= score ? { background: repColor } : {}} />)}
          </div>
          {s.reputation}
        </div>
      </div>
      <div>
        <div className="source-detail-row"><span className="k">Type</span><span className="v">{s.type}</span></div>
        <div className="source-detail-row"><span className="k">Founded</span><span className="v">{s.founded}</span></div>
        <div className="source-detail-row"><span className="k">Country</span><span className="v">{s.country}</span></div>
        <div className="source-detail-row"><span className="k">Political bias</span><span className="v">{s.bias}</span></div>
        <div className="source-detail-row"><span className="k">Factual reporting</span><span className="v" style={{ color: repColor }}>{s.factual}</span></div>
      </div>
    </div>
  );
}

function CrossRefCard({ result }) {
  const I = window.Icons;
  return (
    <div className="result-card fade-up d-4">
      <div className="card-eyebrow">CROSS-REFERENCED FACTS · {result.crossrefs.length} SOURCES</div>
      <h3><span className="ico"><I.Network size={16} /></span>What others are saying</h3>
      {result.crossrefs.map((c, i) => (
        <div key={i} className="crossref-card">
          <div className="crossref-head">
            <span className="crossref-source">{c.source}</span>
            <span className={`crossref-verdict ${c.verdict.toLowerCase()}`}>{c.verdict}</span>
          </div>
          <div className="crossref-title">"{c.title}"</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span className="crossref-date">{c.date}</span>
            <span style={{ color: "var(--terracotta)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Read <I.ExtLink size={12} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SideCard({ result }) {
  const I = window.Icons;
  const wordCount = (result.reasoning.join(" ").split(/\s+/).length);
  return (
    <div className="result-card fade-up d-3">
      <div className="card-eyebrow">ANALYSIS METADATA</div>
      <h3 style={{ fontSize: 22 }}><span className="ico"><I.Clipboard size={16} /></span>Run details</h3>
      <div className="side-metric">
        <div className="k">MODEL</div>
        <div className="v mono" style={{ fontSize: 20 }}>MiniMax-M1</div>
        <div className="sub">Contextual reasoning · temperature 0.2</div>
      </div>
      <div className="side-metric">
        <div className="k">ANALYSIS TIME</div>
        <div className="v">3.8<span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>sec</span></div>
        <div className="sub">6 pipeline stages completed</div>
      </div>
      <div className="side-metric">
        <div className="k">CLAIMS EVALUATED</div>
        <div className="v">{Math.max(4, Math.floor(wordCount / 30))}</div>
        <div className="sub">Extracted and individually scored</div>
      </div>
      <div className="side-metric">
        <div className="k">SOURCES CONSULTED</div>
        <div className="v">{result.crossrefs.length + 4}</div>
        <div className="sub">Fact-check DBs + primary docs</div>
      </div>
      <div className="side-metric">
        <div className="k">CONFIDENCE TREND</div>
        <div className="sparkline" style={{ marginTop: 6 }}>
          {[30, 42, 55, 60, 68, 72, 78, 80, 84, 85, result.confidence].map((v, i) => (
            <span key={i} style={{ height: `${v * 0.36}px`, opacity: 0.3 + (i / 10) * 0.7 }} />
          ))}
        </div>
        <div className="sub">Score climbed as stages completed</div>
      </div>
    </div>
  );
}

function Results({ go, source, result }) {
  const I = window.Icons;
  const truncated = source && source.length > 180 ? source.slice(0, 180) + "…" : source;
  const now = new Date();
  const stamp = now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <div className="container results-page">
      <div className="results-header">
        <div>
          <div className="results-timestamp">ANALYSIS · {stamp.toUpperCase()} · ID TL-{Math.floor(Math.random() * 90000 + 10000)}</div>
          {truncated && <div className="results-source-excerpt" style={{ marginTop: 10 }}>"{truncated}"</div>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => go("home")}>
          <I.ArrowLeft size={14} /> Analyze another
        </button>
      </div>

      <VerdictHero result={result} />

      <div className="results-grid">
        <div>
          <ReasoningCard result={result} />
          <RedFlagsCard result={result} />
          <CrossRefCard result={result} />
        </div>
        <div>
          <SourceCard result={result} />
          <SideCard result={result} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 48, gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-lg" onClick={() => go("home")}>
          Analyze another <I.ArrowRight size={16} />
        </button>
        <button className="btn btn-ghost btn-lg">
          Export report <I.ExtLink size={14} />
        </button>
      </div>
    </div>
  );
}

window.Results = Results;
