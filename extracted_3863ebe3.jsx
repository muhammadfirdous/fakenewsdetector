// Landing / Home page

const { useState: useStateL, useRef: useRefL } = React;

function Landing({ go, setPending, setResult }) {
  const [tab, setTab] = useStateL("text");
  const [text, setText] = useStateL("");
  const [step, setStep] = useStateL(0);
  const [loading, setLoading] = useStateL(false);
  const [stepLabel, setStepLabel] = useStateL(window.ANALYSIS_STEPS[0]);
  const taRef = useRefL(null);
  const I = window.Icons;

  const examples = [
    { label: "ECB holds rates steady at 3.75%", text: "The European Central Bank held its deposit rate steady at 3.75% on Thursday, with President Christine Lagarde signalling a likely cut in June as eurozone inflation eases to 2.4%. Market participants interpret the pause as confidence that inflation is on a sustainable path." },
    { label: "Shocking: secret experiment...", text: "SHOCKING: Tom Hanks EXPOSED as victim of secret government experiment. They don't want you to know! Share before this post is taken down!!! Dr. Harold Finch has revealed the truth about the Clandestine Biomedical Division." },
    { label: "Study finds supplement reduces risk", text: "A new study finds a dietary supplement may reduce Alzheimer's risk by 34%, scientists say. The preprint from researchers at a major university is linked to improved cognitive outcomes in a small cohort." },
  ];

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setPending(text);
    try {
      const result = await window.analyzeContent(text, {
        onStep: (i, label) => { setStep(i); setStepLabel(label); }
      });
      setResult(result);
      setLoading(false);
      go("results");
    } catch (e) {
      setLoading(false);
      alert("We couldn't complete the analysis. Please try again.");
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <>
      <div className="container">
        <section className="hero">
          <div className="hero-eyebrow fade-up">
            <span className="pill"><span className="pill-dot" /> EDITORIAL AI · v1.4</span>
            <span className="pill" style={{ background: "transparent" }}>
              <I.Sparkles size={11} /> Powered by MiniMax
            </span>
          </div>
          <h1 className="fade-up d-1">
            Detect fake news in seconds,<br/>with the patience of an <em>editor.</em>
          </h1>
          <p className="hero-sub fade-up d-2">
            Paste an article, a headline, or a URL. TruthLens reads it the way a desk editor would — weighing sources, checking claims, and explaining its reasoning in plain English.
          </p>

          <div className="input-block fade-up d-3">
            <div className="input-tabs">
              {["text", "headline", "url"].map(t => (
                <button
                  key={t}
                  className={"input-tab" + (tab === t ? " active" : "")}
                  onClick={() => setTab(t)}
                >{t.toUpperCase()}</button>
              ))}
            </div>
            <textarea
              ref={taRef}
              className="input-area"
              placeholder={
                tab === "url" ? "https://example.com/article..." :
                tab === "headline" ? "Paste a headline you saw on social media…" :
                "Paste the full article text here. TruthLens works best with 2–3 paragraphs so it can evaluate tone, sourcing, and claims."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={tab === "text" ? 4 : 2}
            />
            <div className="input-footer">
              <div className="input-meta">
                {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Waiting for input"} · <span className="kbd">⌘</span> <span className="kbd">↵</span> to analyze
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={!text.trim() || loading}
              >
                {loading ? "Analyzing…" : "Analyze"}
                {!loading && <I.ArrowRight size={16} />}
              </button>
            </div>
          </div>

          <div className="examples-row fade-up d-4">
            <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4 }}>Try:</span>
            {examples.map((ex, i) => (
              <button key={i} className="example-chip" onClick={() => { setText(ex.text); setTab(i === 2 ? "text" : i === 1 ? "headline" : "text"); taRef.current && taRef.current.focus(); }}>
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 40 }}>
          <div className="section-header">
            <div className="eyebrow" style={{ marginBottom: 12 }}>THE METHOD</div>
            <h2>A newsroom's rigor,<br/>at the speed of a search.</h2>
            <p>Four layers of signal, weighted and explained. You see every step of the reasoning — not just the verdict.</p>
          </div>
          <div className="features-grid">
            {[
              { n: "01", ico: <I.Brain size={20} />, title: "AI Reasoning", desc: "MiniMax reads the full article and explains — in plain English — why the claims hold up or don't." },
              { n: "02", ico: <I.Network size={20} />, title: "Cross-Reference", desc: "Every claim is checked against Snopes, Reuters Fact Check, PolitiFact, and primary sources." },
              { n: "03", ico: <I.ShieldCheck size={20} />, title: "Source Credibility", desc: "Domain history, editorial track record, bias rating, and WHOIS data — all considered." },
              { n: "04", ico: <I.Zap size={20} />, title: "Instant Results", desc: "A full verdict in under four seconds, with confidence score and the reasoning behind it." },
            ].map((f, i) => (
              <div key={i} className="feature-card fade-up" style={{ animationDelay: `${0.05 * i}s` }}>
                <div className="feature-num">{f.n}</div>
                <div className="feature-icon">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="stats-band">
            <div className="stats-band-inner">
              <div>
                <div className="stat-label">The scale of the problem</div>
                <div className="stat-number">86<sup>%</sup></div>
                <p className="stat-desc">of internet users globally have been exposed to fake news online. Most couldn't tell it was fake.</p>
                <div className="stat-source">SOURCE · IPSOS / CIGI GLOBAL SURVEY</div>
              </div>
              <div>
                <div className="stat-label">Misinformation on social</div>
                <div className="stat-number">~40<sup>%</sup></div>
                <p className="stat-desc">of content circulating on major social platforms contains misleading claims, fabricated quotes, or unverifiable attributions.</p>
                <div className="stat-source">SOURCE · MIT MEDIA LAB · 2025</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div className="eyebrow" style={{ marginBottom: 12 }}>FOR WHOM</div>
            <h2>Built for readers who still<br/>care about the difference.</h2>
          </div>
          <div className="features-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { ico: <I.Book size={20} />, title: "Journalists", desc: "Triage claims before spending hours chasing them down." },
              { ico: <I.Users size={20} />, title: "Educators", desc: "Teach media literacy with transparent, explainable verdicts." },
              { ico: <I.Eye size={20} />, title: "Curious readers", desc: "Know whether the article your uncle shared holds up." },
            ].map((f, i) => (
              <div key={i} className="feature-card fade-up" style={{ animationDelay: `${0.05 * i}s` }}>
                <div className="feature-icon">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {loading && (
        <div className="analyzing-overlay">
          <div className="analyzing-box">
            <div className="spinner-ring" />
            <div className="eyebrow">Analysis in progress</div>
            <h3 style={{ marginTop: 12 }}>Reading carefully.</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 8 }}>
              TruthLens is weighing the source, the claims, and the language. This takes a few seconds.
            </p>
            <div className="step">STEP {String(step + 1).padStart(2, "0")}/06 · {stepLabel}</div>
          </div>
        </div>
      )}
    </>
  );
}

window.Landing = Landing;
