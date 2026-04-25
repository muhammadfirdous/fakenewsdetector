// How It Works & About pages

function HowItWorks() {
  const I = window.Icons;
  const steps = [
    {
      ico: <I.Database size={20} />,
      title: "Data ingestion",
      desc: "We accept article text, a headline, or a URL. For URLs, the page is fetched, the main content extracted (via Readability), and metadata logged — domain, author, publication date."
    },
    {
      ico: <I.Brain size={20} />,
      title: "Contextual AI analysis",
      desc: "MiniMax reads the full text with a system prompt tuned for editorial scrutiny. It extracts claims, evaluates tone, flags vague attributions, and drafts reasoning — not just a score."
    },
    {
      ico: <I.Network size={20} />,
      title: "Cross-referencing",
      desc: "Each extracted claim is searched against Snopes, Reuters Fact Check, PolitiFact, AP, and primary documents (ECB releases, academic preprints, gov registries). Matches are weighted by recency and source authority."
    },
    {
      ico: <I.Scale size={20} />,
      title: "Verdict output",
      desc: "The reasoning is consolidated into a verdict (REAL / FAKE / UNCERTAIN), a confidence score (0–100), and an explanation. Every signal is surfaced — you never get a black-box answer."
    },
  ];
  return (
    <div className="container">
      <section className="hero" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="hero-eyebrow fade-up"><span className="pill"><span className="pill-dot" /> THE PIPELINE</span></div>
        <h1 className="fade-up d-1">How TruthLens reads<br/>an article.</h1>
        <p className="hero-sub fade-up d-2">Four stages. Every one is explainable. Every one is audit-logged. Here's what happens in the four seconds between your paste and your verdict.</p>
      </section>

      <div className="flow-wrap">
        <div className="flow-steps">
          {steps.map((s, i) => (
            <div key={i} className="flow-step fade-up" style={{ animationDelay: `${0.08 * i}s` }}>
              <div className="step-num">STEP {String(i + 1).padStart(2, "0")}</div>
              <div className="step-ico">{s.ico}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="flow-arrow"><I.ArrowRight size={14} /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <section className="section" style={{ marginTop: 40 }}>
        <div className="section-header">
          <div className="eyebrow" style={{ marginBottom: 12 }}>WHAT WE DON'T DO</div>
          <h2>Where we draw the line.</h2>
        </div>
        <div className="features-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { title: "We don't replace judgment", desc: "TruthLens is a second pair of eyes. A high confidence score is a signal, not a verdict. You still make the call." },
            { title: "We don't censor", desc: "We flag and explain. We never remove, suppress, or down-rank content on behalf of third parties." },
            { title: "We don't guess when we shouldn't", desc: "When evidence is mixed, we say so — UNCERTAIN is a valid answer and we return it without apology." },
          ].map((f, i) => (
            <div key={i} className="feature-card fade-up" style={{ animationDelay: `${0.05 * i}s` }}>
              <h3 style={{ fontSize: 22 }}>{f.title}</h3>
              <p style={{ marginTop: 8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function About() {
  const I = window.Icons;
  return (
    <div className="container">
      <section className="hero" style={{ paddingTop: 64, paddingBottom: 40, textAlign: "left" }}>
        <div className="hero-eyebrow fade-up" style={{ justifyContent: "flex-start" }}>
          <span className="pill"><span className="pill-dot" /> ABOUT THE PROJECT</span>
        </div>
        <h1 className="serif fade-up d-1" style={{ textAlign: "left", margin: "0 0 24px", fontSize: "clamp(48px, 7vw, 84px)" }}>
          A tool built by<br/>people who miss<br/>the old newsroom.
        </h1>
      </section>

      <div className="about-grid">
        <div className="about-body">
          <p className="about-lead fade-up">
            The internet made publishing free and verification optional. <em>TruthLens</em> is a small attempt to put the second part back.
          </p>
          <p className="fade-up d-1">
            We built TruthLens because the patterns of misinformation are remarkably consistent, and most readers don't have time to learn them. A recently registered domain. A quote attributed to a fictional character. A preprint reported as settled science. A cohort of 142 people stretched into a public-health claim.
          </p>
          <p className="muted fade-up d-2">
            A trained editor catches these in seconds. TruthLens is trying to catch them in milliseconds — not to replace the editor, but to give every reader a version of that instinct on demand. We show our reasoning at every step because a verdict without an explanation is just another authority asking for your trust.
          </p>
          <p className="fade-up d-3">
            The engine behind the scenes is <span className="link-line">MiniMax-M1</span>, a reasoning model tuned for long-context editorial tasks. The cross-reference layer pulls from Snopes, Reuters Fact Check, PolitiFact, AP, primary government registries, and academic preprint servers. Everything is open-source except the API key.
          </p>
          <p className="muted fade-up d-4">
            If you're a journalist, researcher, or educator and you'd like API access, we're running a free tier for qualified projects. Reach out.
          </p>
        </div>
        <aside className="about-side">
          <dl>
            <dt>Project</dt>
            <dd>TruthLens v1.4.2 · 2026</dd>
            <dt>Engine</dt>
            <dd>MiniMax-M1 (reasoning tier)</dd>
            <dt>Cross-ref sources</dt>
            <dd>12 fact-check DBs · 200K+ primary docs</dd>
            <dt>License</dt>
            <dd>Open-source (MIT) · API-gated</dd>
            <dt>Built by</dt>
            <dd>Three ex-journalists, one ML researcher, and a lot of coffee.</dd>
            <dt>Contact</dt>
            <dd><span className="link-line">hello@truthlens.org</span></dd>
          </dl>
        </aside>
      </div>

      <section className="section" style={{ paddingTop: 96 }}>
        <div className="stats-band">
          <div className="stats-band-inner">
            <div>
              <div className="stat-label">The editorial standard</div>
              <h2 className="serif" style={{ color: "#F0EBE1", fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 18 }}>
                "Trust, but verify — and show your work."
              </h2>
              <p className="stat-desc">That's the principle. Every verdict TruthLens returns comes with the reasoning behind it, the sources it checked, and the signals it weighted. No black boxes.</p>
            </div>
            <div>
              <div className="stat-label">Why we're doing this</div>
              <p className="stat-desc" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "none" }}>
                Because a democracy doesn't work without a shared baseline of fact. And because the people best equipped to separate signal from noise — editors, fact-checkers, beat reporters — have never been more outnumbered by the people trying to pollute the signal.
              </p>
              <div className="stat-source" style={{ marginTop: 18 }}>THE TRUTHLENS TEAM · APRIL 2026</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

window.HowItWorks = HowItWorks;
window.About = About;
