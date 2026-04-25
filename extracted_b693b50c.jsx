// services/api.js — mock MiniMax-shaped analyzer
// In production this would POST to /api/analyze which wraps the real MiniMax API.
// The mock inspects the text for signal words to pick a verdict so demos feel alive.

const REAL_MOCK = {
  verdict: "REAL",
  confidence: 91,
  summary:
    "The article reports on the European Central Bank's decision to hold interest rates steady at 3.75%, citing moderating inflation and stable labor markets. Claims align with published ECB minutes and are corroborated by Reuters, Bloomberg, and the Financial Times.",
  reasoning: [
    "The piece cites named sources — ECB President Christine Lagarde's verbatim remarks from the 24 April policy meeting — and links to the official press release on ecb.europa.eu, which we verified resolves to a live government-published document.",
    "Quantitative claims (eurozone inflation at 2.4%, core at 2.9%, deposit rate held at 3.75%) match Eurostat's April 2026 flash estimate and the ECB's own rate decision record. No figures appear exaggerated or fabricated.",
    "Tone is measured and attributive. Sentences use hedging appropriate to monetary policy reporting ('signalled a likely cut in June', 'market participants interpret'). There are no emotionally charged superlatives or appeals to outrage.",
    "The outlet (Reuters) has a long-standing reputation for factual reporting and corrections policy. Byline identifies the reporter and their beat. The URL pattern and domain WHOIS records are consistent with legitimate Reuters infrastructure."
  ],
  red_flags: [],
  positive_signals: [
    { title: "Named, verifiable sources", desc: "Quotes attributed to specific officials with corroborating primary documents.", severity: "strong" },
    { title: "Quantitative precision", desc: "Figures match independent statistical agencies within rounding tolerance.", severity: "strong" },
    { title: "Neutral framing", desc: "Hedged language typical of professional financial journalism.", severity: "moderate" }
  ],
  source: {
    domain: "reuters.com",
    reputation: "High",
    reputation_score: 5,
    type: "Established news agency",
    country: "United Kingdom",
    founded: "1851",
    bias: "Center",
    factual: "Very High"
  },
  crossrefs: [
    { source: "Bloomberg", title: "ECB Holds Rates, Signals June Cut as Inflation Eases", verdict: "REAL", date: "2026-04-24" },
    { source: "Financial Times", title: "Lagarde keeps deposit rate at 3.75% amid softer price data", verdict: "REAL", date: "2026-04-24" },
    { source: "Snopes", title: "No fact-check filed — reporting consistent with primary sources", verdict: "REAL", date: "2026-04-24" }
  ]
};

const FAKE_MOCK = {
  verdict: "FAKE",
  confidence: 94,
  summary:
    "The article claims a celebrity's death and attributes it to a 'secret government experiment'. No mainstream outlet corroborates the event, the named 'Dr. Harold Finch' has no verifiable credentials, and the original URL was registered eight days ago.",
  reasoning: [
    "The central claim — that actor Tom Hanks died from an undisclosed CIA experiment on 21 April 2026 — does not appear in any verified news source. Cross-referencing against AP, Reuters, BBC, and Hanks' verified social accounts shows he posted publicly on 23 April.",
    "The piece attributes its source to 'Dr. Harold Finch, lead researcher at the Clandestine Biomedical Division.' No such division exists in any U.S. government org chart. The name itself is lifted from a CBS television series (Person of Interest, 2011–2016).",
    "The domain (daily-exposed-truth.net) was registered via a privacy-masked registrar on 16 April 2026. It has no 'About' page, no editorial staff, and the WHOIS contact is a shell LLC in Belize.",
    "Emotional and sensational language is heavily weighted. Words like 'SHOCKING', 'EXPOSED', 'THEY DON'T WANT YOU TO KNOW' appear 14 times. The piece ends with an appeal to share before 'the post is taken down' — a hallmark of engagement-bait disinformation."
  ],
  red_flags: [
    { title: "Unverifiable expert", desc: "The cited authority 'Dr. Harold Finch' is a fictional TV character with no real-world credentials.", severity: "critical" },
    { title: "Recently registered domain", desc: "daily-exposed-truth.net was created 8 days ago via a privacy-masking registrar.", severity: "critical" },
    { title: "Sensational language", desc: "Emotionally charged superlatives ('SHOCKING', 'EXPOSED') appear 14 times — far above baseline for news reporting.", severity: "high" },
    { title: "Missing primary sources", desc: "No quotes, documents, or links to official statements. All claims trace back to the article itself.", severity: "high" },
    { title: "Urgency manipulation", desc: "Calls to 'share before it's taken down' are characteristic of coordinated disinformation campaigns.", severity: "moderate" },
    { title: "Contradicted by verified activity", desc: "Subject posted publicly on verified social accounts two days after the claimed event.", severity: "critical" }
  ],
  positive_signals: [],
  source: {
    domain: "daily-exposed-truth.net",
    reputation: "Very Low",
    reputation_score: 1,
    type: "Unverified blog",
    country: "Unknown (privacy-masked WHOIS)",
    founded: "Registered 16 Apr 2026",
    bias: "Conspiratorial",
    factual: "Very Low"
  },
  crossrefs: [
    { source: "Snopes", title: "Tom Hanks is alive and has posted on verified social accounts since the alleged event", verdict: "FAKE", date: "2026-04-23" },
    { source: "Reuters Fact Check", title: "No record of 'Clandestine Biomedical Division' in any government registry", verdict: "FAKE", date: "2026-04-23" },
    { source: "PolitiFact", title: "Claim rated Pants on Fire — fabricated authority, fabricated event", verdict: "FAKE", date: "2026-04-24" }
  ]
};

const UNCERTAIN_MOCK = {
  verdict: "UNCERTAIN",
  confidence: 58,
  summary:
    "The article reports a new study claiming a specific dietary supplement reduces Alzheimer's risk by 34%. The underlying preprint exists but has not been peer-reviewed, the sample size is small, and the reporting outlet has not linked to the methodology.",
  reasoning: [
    "The study referenced is a real preprint on bioRxiv, uploaded 14 April 2026. However, preprints have not undergone peer review — their findings should be treated as preliminary, which the article does not disclose.",
    "The '34% risk reduction' figure is drawn from a self-reported cohort of 142 participants over 6 months. Statistical significance at this sample size is contested; the original authors themselves flag 'larger trials needed' in their discussion section.",
    "The reporting outlet (healthwire-daily.com) is a legitimate health-news site with a 7-year track record, but it has a history of amplifying early-stage findings without caveats. Its factual reporting rating from MBFC is 'Mixed'.",
    "No independent researchers have been quoted. A responsible write-up of a preprint typically includes at least one outside expert providing context — this one does not."
  ],
  red_flags: [
    { title: "Preprint presented as conclusion", desc: "Source study has not been peer-reviewed, but article frames findings as settled science.", severity: "high" },
    { title: "Small sample size", desc: "142 participants is below the threshold for broad public-health claims.", severity: "moderate" },
    { title: "No external expert commentary", desc: "Article relies solely on the study's own authors for interpretation.", severity: "moderate" }
  ],
  positive_signals: [
    { title: "Real underlying study", desc: "The cited preprint exists and is accessible on bioRxiv.", severity: "moderate" },
    { title: "Transparent sourcing", desc: "Authors and institution are named and verifiable.", severity: "moderate" }
  ],
  source: {
    domain: "healthwire-daily.com",
    reputation: "Mixed",
    reputation_score: 3,
    type: "Health news aggregator",
    country: "United States",
    founded: "2019",
    bias: "Center",
    factual: "Mixed"
  },
  crossrefs: [
    { source: "Science Media Centre", title: "Expert reaction: early-stage preprint, cautious interpretation advised", verdict: "UNCERTAIN", date: "2026-04-16" },
    { source: "FullFact", title: "Preprint is real but claims outpace the evidence presented", verdict: "UNCERTAIN", date: "2026-04-18" }
  ]
};

function pickMock(text) {
  const t = (text || "").toLowerCase();
  const fakeSignals = ["shocking", "exposed", "they don't want", "secret government", "big pharma", "miracle cure", "share before", "!!!"];
  const uncertainSignals = ["study finds", "new research", "preprint", "scientists say", "linked to", "may reduce"];
  if (fakeSignals.some(s => t.includes(s))) return FAKE_MOCK;
  if (uncertainSignals.some(s => t.includes(s))) return UNCERTAIN_MOCK;
  if (t.length < 30) return UNCERTAIN_MOCK;
  return REAL_MOCK;
}

// Simulated pipeline steps for the loading UX
window.ANALYSIS_STEPS = [
  "Ingesting content",
  "Extracting claims",
  "Contextual AI analysis",
  "Cross-referencing sources",
  "Scoring credibility",
  "Composing verdict"
];

window.analyzeContent = async function analyzeContent(text, { onStep } = {}) {
  // Simulate the 6-step pipeline
  for (let i = 0; i < window.ANALYSIS_STEPS.length; i++) {
    onStep && onStep(i, window.ANALYSIS_STEPS[i]);
    await new Promise(r => setTimeout(r, 380 + Math.random() * 220));
  }
  /* Production wiring would look like:
     const r = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ text }) });
     if (!r.ok) throw new Error('Analysis failed');
     return await r.json();
  */
  return pickMock(text);
};

window.MOCKS = { REAL: REAL_MOCK, FAKE: FAKE_MOCK, UNCERTAIN: UNCERTAIN_MOCK };
