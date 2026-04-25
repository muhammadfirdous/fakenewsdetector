import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ArrowRight, ArrowLeft, Brain, Network, ShieldCheck, Zap,
  Globe, Book, Users, Eye, Flag, AlertTriangle, Check, X,
  Sun, Moon, ExternalLink, Clock, Clipboard, Layers, ChevronDown,
  Sparkles, FileText, Type, Menu, MessageCircle, Send, RotateCcw,
  Image as ImageIcon, Upload
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8001");

const VALID_PAGES = ["landing", "how", "about", "results"];

function readPageFromHash() {
  if (typeof window === "undefined") return "landing";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.includes(hash) ? hash : "landing";
}

const LOADING_STEPS = [
  "Ingesting content",
  "Extracting claims",
  "Contextual AI analysis",
  "Cross-referencing sources",
  "Scoring credibility",
  "Composing verdict",
];

const FALLBACK_VERIFY_PHASES = [
  { key: "extract_claims", label: "Extracting claims" },
  { key: "source_credibility", label: "Checking source credibility" },
  { key: "verify_claims", label: "Verifying claims against online sources" },
  { key: "fact_check_db", label: "Searching fact-checker databases" },
  { key: "spread", label: "Analyzing spread pattern" },
  { key: "image_visual", label: "Analyzing image" },
  { key: "red_flags", label: "Detecting red flags" },
  { key: "final_verdict", label: "Generating final verdict" },
];

async function streamVerify(payload, { onEvent, signal }) {
  const response = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    let detail = `Verification failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.detail) detail = body.detail;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  if (!response.body) throw new Error("Streaming not supported in this environment.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIndex;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLines = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      if (!dataLines.length) continue;
      const text = dataLines.join("\n");
      try {
        onEvent(JSON.parse(text));
      } catch (e) {
        console.warn("Bad SSE chunk:", text, e);
      }
    }
  }
}

const EXAMPLES = [
  "NASA confirms the Moon is drifting away from Earth at 3.8cm per year",
  "Breaking: New study finds that 5G towers cause migraines in 80% of people",
  "Scientists discover high levels of microplastics in bottled water brands",
];

// ===== Helpers =====

function mapVerdict(v) {
  if (!v) return "UNCERTAIN";
  const lower = v.toLowerCase();
  if (lower === "true" || lower === "likely true") return "REAL";
  if (lower === "fake" || lower === "likely fake") return "FAKE";
  return "UNCERTAIN";
}

function verdictLabel(v) {
  if (v === "REAL") return "Credible.";
  if (v === "FAKE") return "Not Credible.";
  return "Inconclusive.";
}

function verdictBadge(v) {
  if (v === "REAL") return "\u2713 VERIFIED \u00B7 REAL";
  if (v === "FAKE") return "\u2717 FLAGGED \u00B7 FAKE";
  return "\u2014 REVIEW \u00B7 UNCERTAIN";
}

function verdictCss(v) {
  if (v === "REAL") return "verdict-real";
  if (v === "FAKE") return "verdict-fake";
  return "verdict-uncertain";
}

function pillCss(v) {
  if (v === "REAL") return "pill-real";
  if (v === "FAKE") return "pill-fake";
  return "pill-uncertain";
}

function mapRedFlags(flags) {
  if (!flags || !flags.length) return [];
  return flags.map((f, i) => {
    const severity = i === 0 ? "critical" : i === 1 ? "high" : "moderate";
    const parts = f.split(":").map(s => s.trim());
    return {
      title: parts[0] || f,
      desc: parts[1] || f,
      severity,
    };
  });
}

function mapReasoning(r) {
  if (!r) return [];
  return r.split(/\n\n+/).filter(Boolean);
}

function sourceRatingBars(rating) {
  const r = (rating || "").toLowerCase();
  if (r === "high") return 5;
  if (r === "mixed") return 3;
  if (r === "low") return 1;
  return 2;
}

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ===== Logo =====

function Logo({ onClick }) {
  return (
    <button className="logo" onClick={onClick} type="button">
      <div className="logo-mark">
        <Search />
      </div>
      <span className="logo-text">TruthLens</span>
    </button>
  );
}

// ===== Confidence Ring =====

function ConfidenceRing({ value, verdict }) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="confidence-ring-container">
      <div className={`confidence-ring ${verdictCss(verdict)}`}>
        <svg viewBox="0 0 180 180">
          <circle className="track" cx="90" cy="90" r={r} />
          <circle
            className="fill-ring"
            cx="90" cy="90" r={r}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="confidence-value">
          <span className="confidence-number">{value}%</span>
          <span className="confidence-label">Confidence</span>
        </div>
      </div>
    </div>
  );
}

// ===== Nav =====

function Nav({ page, setPage, darkMode, toggleDark }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [page]);

  const NAV_ITEMS = [
    { key: "landing", label: "Analyze" },
    { key: "how", label: "How it works" },
    { key: "about", label: "About" },
  ];

  const go = (key) => {
    setPage(key);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Logo onClick={() => go("landing")} />
        <div className="nav-links">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              className={`nav-pill ${page === key ? "active" : ""}`}
              onClick={() => go(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div className="api-pill">
            <span className="api-dot" />
            API online
          </div>
          <button className="dark-toggle" onClick={toggleDark} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="nav-hamburger"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <div
        id="mobile-nav-panel"
        className={`nav-mobile-panel ${menuOpen ? "open" : ""}`}
        hidden={!menuOpen}
      >
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            className={`nav-mobile-link ${page === key ? "active" : ""}`}
            onClick={() => go(key)}
          >
            {label}
          </button>
        ))}
        <div className="nav-mobile-api">
          <span className="api-dot" /> API online
        </div>
      </div>
    </nav>
  );
}

// ===== Footer =====

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-left">
          <span>TruthLens</span> &mdash; Editorial AI for news verification.
        </div>
        <div className="footer-right">Built with care</div>
      </div>
    </footer>
  );
}

// ===== Loading Overlay =====

function LoadingOverlay({ step, phases, currentPhase, completedPhases, errorPhases, label }) {
  const usingPhases = Array.isArray(phases) && phases.length > 0;
  let stepNum, total, currentLabel;

  if (usingPhases) {
    total = String(phases.length).padStart(2, "0");
    const idx = Math.max(
      0,
      phases.findIndex((p) => p.key === currentPhase),
    );
    const completedCount = completedPhases ? completedPhases.size : 0;
    const activeIdx = currentPhase ? idx : Math.max(0, completedCount - 1);
    stepNum = String(Math.min(phases.length, completedCount + (currentPhase ? 1 : 0)) || 1).padStart(2, "0");
    currentLabel = (phases[activeIdx] && phases[activeIdx].label) || phases[0].label;
  } else {
    const stepIndex = Math.min(step, LOADING_STEPS.length - 1);
    stepNum = String(stepIndex + 1).padStart(2, "0");
    total = String(LOADING_STEPS.length).padStart(2, "0");
    currentLabel = LOADING_STEPS[stepIndex];
  }

  return (
    <div className="loading-overlay">
      <div className="spinner-container">
        <div className="spinner-ring spinner-outer" />
        <div className="spinner-ring spinner-inner" />
      </div>
      <div className="loading-step">
        STEP {stepNum}/{total} &middot; {currentLabel}
      </div>
      <div className="loading-label">{label || "Analyzing your content"}</div>

      {usingPhases && (
        <ul className="loading-phases">
          {phases.map((p) => {
            const done = completedPhases && completedPhases.has(p.key);
            const errored = errorPhases && errorPhases.has(p.key);
            const active = currentPhase === p.key;
            return (
              <li
                key={p.key}
                className={`loading-phase ${
                  errored ? "errored" : done ? "done" : active ? "active" : "idle"
                }`}
              >
                <span className="loading-phase-dot" aria-hidden="true">
                  {errored ? <X size={12} /> : done ? <Check size={12} /> : active ? "•" : ""}
                </span>
                <span className="loading-phase-label">{p.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ===== Image Panel (upload / drag-drop / paste) =====

const IMAGE_ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function validateImageFile(file) {
  if (!file) return "No file selected.";
  if (!IMAGE_ACCEPTED_MIMES.includes(file.type)) {
    return "Unsupported file type. Please use PNG, JPG, or WebP.";
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Max 5MB.`;
  }
  return null;
}

function ImagePanel({
  imageFile,
  imageURL,
  imageContext,
  imageError,
  dragActive,
  onSelectFile,
  onClearFile,
  onContextChange,
  onDragStateChange,
  active,
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) onSelectFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) onDragStateChange(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
  };

  useEffect(() => {
    if (!active) return undefined;
    const handlePaste = (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onSelectFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [active, onSelectFile]);

  return (
    <div className="image-panel">
      {!imageFile ? (
        <label
          className={`image-drop-zone ${dragActive ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            className="image-drop-input"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) onSelectFile(file);
              e.target.value = "";
            }}
          />
          <div className="image-drop-icon">
            <Upload size={22} />
          </div>
          <div className="image-drop-title">
            Drop a news screenshot here, or click to browse
          </div>
          <div className="image-drop-hint">
            PNG, JPG or WebP &middot; max 5MB &middot; Ctrl/Cmd+V to paste
          </div>
        </label>
      ) : (
        <div className="image-preview-wrap">
          {imageURL && (
            <img src={imageURL} alt="Selected preview" className="image-preview" />
          )}
          <button
            type="button"
            className="image-remove-btn"
            onClick={onClearFile}
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
          <div className="image-preview-meta">
            <span className="image-preview-name" title={imageFile.name}>{imageFile.name}</span>
            <span className="image-preview-size">{formatBytes(imageFile.size)}</span>
          </div>
        </div>
      )}

      {imageError && <div className="image-error">{imageError}</div>}

      <textarea
        className="input-textarea image-context-textarea"
        placeholder="Add context about this image (optional)"
        value={imageContext}
        onChange={(e) => onContextChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

// ===== Landing Page =====

function Landing({ onAnalyze, onAnalyzeImage }) {
  const [inputMode, setInputMode] = useState("text");
  const [inputValue, setInputValue] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [imageContext, setImageContext] = useState("");
  const [imageError, setImageError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => { if (imageURL) URL.revokeObjectURL(imageURL); };
  }, [imageURL]);

  const selectImageFile = useCallback((file) => {
    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setImageFile(file);
    setImageURL((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const clearImageFile = useCallback(() => {
    setImageFile(null);
    setImageURL((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setImageError(null);
  }, []);

  const handleSubmit = () => {
    if (inputMode === "image") {
      if (!imageFile) return;
      onAnalyzeImage(imageFile, imageContext.trim(), imageURL);
      return;
    }
    if (!inputValue.trim()) return;
    onAnalyze(inputValue.trim(), inputMode);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) handleSubmit();
  };

  const canSubmit = inputMode === "image" ? !!imageFile : !!inputValue.trim();

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="eyebrow-row anim-fadeUp">
            <span className="pill">EDITORIAL AI &middot; v1.4</span>
            <span className="pill">Powered by MiniMax</span>
          </div>

          <h1 className="hero-title anim-fadeUp d-1">
            Detect fake news in seconds,<br />
            with the patience of an <em>editor.</em>
          </h1>

          <p className="hero-subtitle anim-fadeUp d-2">
            Paste any article, headline, or URL. TruthLens reads it like a seasoned journalist
            and gives you a clear, reasoned verdict.
          </p>

          {/* Input Block */}
          <div className="input-block anim-scaleIn d-3">
            <div className="input-card">
              <div className="input-tabs">
                {[
                  { key: "text", icon: <FileText size={12} />, label: "TEXT" },
                  { key: "headline", icon: <Type size={12} />, label: "HEADLINE" },
                  { key: "url", icon: <Globe size={12} />, label: "URL" },
                  { key: "image", icon: <ImageIcon size={12} />, label: "IMAGE" },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`input-tab ${inputMode === t.key ? "active" : ""}`}
                    onClick={() => setInputMode(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="input-body">
                {inputMode === "image" ? (
                  <ImagePanel
                    active={inputMode === "image"}
                    imageFile={imageFile}
                    imageURL={imageURL}
                    imageContext={imageContext}
                    imageError={imageError}
                    dragActive={dragActive}
                    onSelectFile={selectImageFile}
                    onClearFile={clearImageFile}
                    onContextChange={setImageContext}
                    onDragStateChange={setDragActive}
                  />
                ) : (
                  <textarea
                    className="input-textarea"
                    placeholder={
                      inputMode === "url"
                        ? "Paste article URL here..."
                        : inputMode === "headline"
                        ? "Type a headline to verify..."
                        : "Paste article text or claim here..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={4}
                    inputMode={inputMode === "url" ? "url" : "text"}
                    autoCapitalize={inputMode === "url" ? "off" : "sentences"}
                    autoCorrect={inputMode === "url" ? "off" : "on"}
                    spellCheck={inputMode !== "url"}
                  />
                )}
              </div>
              <div className="input-footer">
                <span className="word-count">
                  {inputMode === "image"
                    ? (imageFile ? formatBytes(imageFile.size) : "No image selected")
                    : `${wordCount(inputValue)} words`}
                </span>
                <button
                  className="btn btn-primary"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  Analyze <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Example chips */}
            <div className="example-chips">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="example-chip"
                  onClick={() => { setInputValue(ex); setInputMode("text"); }}
                  title={ex}
                >
                  {ex.length > 60 ? ex.slice(0, 57) + "..." : ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container">
        <div className="features-grid">
          {[
            { icon: <Brain size={22} />, title: "AI Reasoning", desc: "Deep contextual analysis powered by large language models." },
            { icon: <Network size={22} />, title: "Cross-Reference", desc: "Claims verified against multiple independent sources." },
            { icon: <ShieldCheck size={22} />, title: "Source Credibility", desc: "Domain reputation, bias rating, and factual history." },
            { icon: <Zap size={22} />, title: "Instant Results", desc: "Full editorial-grade analysis in under 30 seconds." },
          ].map((f, i) => (
            <div key={i} className={`card feature-card anim-fadeUp d-${i + 1}`}>
              <div className="feature-icon">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Band */}
      <section className="container">
        <div className="stats-band anim-fadeUp">
          <div>
            <div className="stat-number">86%</div>
            <p className="stat-label">of people have been exposed to<br />fake news online</p>
          </div>
          <div>
            <div className="stat-number">~40%</div>
            <p className="stat-label">of viral content contains<br />misleading information</p>
          </div>
        </div>
      </section>

      {/* Built For */}
      <section className="container built-for anim-fadeUp">
        <h2>Built for</h2>
        <div className="built-for-grid">
          {[
            { icon: <Book size={22} />, title: "Journalists", desc: "Verify sources before publishing." },
            { icon: <Users size={22} />, title: "Educators", desc: "Teach media literacy with real tools." },
            { icon: <Eye size={22} />, title: "Curious readers", desc: "Check before you share." },
          ].map((b, i) => (
            <div key={i} className={`card built-for-card anim-fadeUp d-${i + 1}`}>
              <div className="feature-icon">{b.icon}</div>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===== Results Chat (follow-up Q&A) =====

const QA_SUGGESTIONS = [
  "Why was this flagged?",
  "What makes this source credible?",
  "Summarize the reasoning in one sentence.",
];

function ResultsChat({ result }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  const send = useCallback(async (textArg) => {
    const isRetry = typeof textArg === "string";
    const question = (isRetry ? textArg : input).trim();
    if (!question || loading) return;

    let baseMessages = messages;
    if (!isRetry) {
      baseMessages = [...messages, { role: "user", content: question }];
      setMessages(baseMessages);
      setInput("");
    }
    setError(null);
    setLoading(true);

    try {
      const history = baseMessages.slice(0, -1).slice(-20);
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, messages: history, results: result }),
      });
      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          if (body && body.detail) detail = body.detail;
        } catch { /* keep default */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, loading, messages, result]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const showEmpty = messages.length === 0 && !loading && !error;

  return (
    <div className="card qa-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><MessageCircle size={16} /></div>
          <span className="section-label">Ask a follow-up</span>
        </div>

        <div className="qa-messages" ref={scrollRef} aria-live="polite">
          {showEmpty && (
            <div className="qa-empty">
              <p>Ask a question about these results. The assistant reads the verdict, reasoning, red flags, and source profile shown above.</p>
              <div className="qa-suggestions">
                {QA_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="qa-suggestion"
                    onClick={() => send(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`qa-bubble qa-${m.role}`}>
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="qa-bubble qa-assistant qa-loading" aria-label="Assistant is typing">
              <span className="qa-dot" />
              <span className="qa-dot" />
              <span className="qa-dot" />
            </div>
          )}
        </div>

        {error && (
          <div className="qa-error" role="alert">
            <span>{error}</span>
            {lastUserMessage && (
              <button
                type="button"
                className="qa-retry"
                onClick={() => send(lastUserMessage.content)}
                disabled={loading}
              >
                <RotateCcw size={12} /> Retry
              </button>
            )}
          </div>
        )}

        <form
          className="qa-input-row"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <input
            ref={inputRef}
            className="qa-input"
            type="text"
            placeholder="Ask a question about your results..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Ask a question about your results"
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary qa-send"
            disabled={loading || !input.trim()}
            aria-label="Send question"
          >
            <Send size={16} />
            <span className="qa-send-label">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== Results Page =====

function Results({ result, query, onBack, imagePreviewURL }) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const verdict = mapVerdict(result.verdict);
  const vCss = verdictCss(verdict);
  const flags = mapRedFlags(result.red_flags);
  const paragraphs = mapReasoning(result.reasoning);
  const confidence = result.confidence_score || 0;
  const source = result.source_credibility || {};
  const crossrefs = result.fact_checks || [];
  const now = new Date();
  const timestamp = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    + " at " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const displayParagraphs = reasoningExpanded ? paragraphs : paragraphs.slice(0, 2);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      {/* Header */}
      <div className="results-header anim-fadeUp">
        <div className="results-meta">
          <span className="results-timestamp">{timestamp}</span>
          <span className="results-excerpt" title={query}>
            {query && query.length > 80 ? query.slice(0, 77) + "..." : query}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Analyze another
        </button>
      </div>

      {(imagePreviewURL || result.extracted_text) && (
        <div className="image-result-banner anim-fadeUp">
          {imagePreviewURL && (
            <img
              src={imagePreviewURL}
              alt="Submitted screenshot"
              className="results-image-thumb"
            />
          )}
          {result.extracted_text && (
            <div className="card extracted-text-card">
              <div className="card-body">
                <div className="section-header">
                  <div className="section-icon"><Type size={16} /></div>
                  <span className="section-label">Extracted text</span>
                </div>
                <p className="extracted-text-body">{result.extracted_text}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verdict Hero Card */}
      <div className={`verdict-card ${vCss} anim-scaleIn`}>
        <div className="verdict-content">
          <span className={`pill pill-verdict ${pillCss(verdict)} font-mono`}>
            {verdictBadge(verdict)}
          </span>
          <h1 className="verdict-title">{verdictLabel(verdict)}</h1>
          <p className="verdict-summary">{result.summary}</p>
        </div>
        <ConfidenceRing value={confidence} verdict={verdict} />
      </div>

      {/* Results Grid */}
      <div className="results-grid">
        <div className="results-left">
          {/* Reasoning Card */}
          <div className="card anim-fadeUp d-1">
            <div className="card-body">
              <div className="section-header">
                <div className="section-icon"><FileText size={16} /></div>
                <span className="section-label">The editor's notes</span>
              </div>
              <div className="reasoning-text">
                {displayParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {paragraphs.length > 2 && (
                <button
                  className={`expandable-trigger ${reasoningExpanded ? "open" : ""}`}
                  onClick={() => setReasoningExpanded(!reasoningExpanded)}
                >
                  {reasoningExpanded ? "Show less" : "Read full analysis"}
                  <ChevronDown size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Red Flags Card */}
          <div className="card anim-fadeUp d-2">
            <div className="card-body">
              <div className="section-header">
                <div className="section-icon"><Flag size={16} /></div>
                <span className="section-label">
                  {flags.length > 0 ? "Warning signals" : "No warning signals"}
                </span>
              </div>
              {flags.length > 0 ? (
                flags.map((f, i) => (
                  <div key={i} className={`flag-item severity-${f.severity}`}>
                    <div>
                      <span className={`flag-severity ${f.severity}`}>
                        {f.severity.toUpperCase()}
                      </span>
                      <div className="flag-title">{f.title}</div>
                      <div className="flag-desc">{f.desc}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-flags">
                  <Check size={20} />
                  <div>
                    <p style={{ fontWeight: 600 }}>No red flags detected</p>
                    <p>Content appears consistent and well-sourced.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cross-References Card */}
          {crossrefs.length > 0 && (
            <div className="card anim-fadeUp d-3">
              <div className="card-body">
                <div className="section-header">
                  <div className="section-icon"><Layers size={16} /></div>
                  <span className="section-label">Cross-references</span>
                </div>
                {crossrefs.map((cr, i) => {
                  const crVerdict = cr.status?.toLowerCase().includes("true") ? "REAL"
                    : cr.status?.toLowerCase().includes("false") || cr.status?.toLowerCase().includes("fake") ? "FAKE"
                    : "UNCERTAIN";
                  return (
                    <div key={i} className="crossref-card">
                      <div className="crossref-source">{cr.source || "Source"}</div>
                      <div className="crossref-title">"{cr.claim}"</div>
                      <div className="crossref-meta">
                        <span className={`pill ${pillCss(crVerdict)}`} style={{ fontSize: 10 }}>
                          {cr.status}
                        </span>
                        {cr.url && (
                          <a href={cr.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: "var(--terracotta)", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                            View <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="results-right">
          {/* Source Card */}
          <div className="card anim-fadeUp d-2">
            <div className="card-body">
              <div className="section-header">
                <div className="section-icon"><Globe size={16} /></div>
                <span className="section-label">Source profile</span>
              </div>
              <div className="source-domain">{source.domain || "Unknown domain"}</div>
              <div className="bar-meter">
                {[1,2,3,4,5].map((n) => {
                  const bars = sourceRatingBars(source.rating);
                  const rating = (source.rating || "").toLowerCase();
                  let cls = "";
                  if (n <= bars) {
                    cls = rating === "high" ? "filled" : rating === "low" ? "filled-low" : "filled-mixed";
                  }
                  return <div key={n} className={`bar-segment ${cls}`} />;
                })}
              </div>
              <dl className="source-details">
                {source.rating && (
                  <div className="source-detail">
                    <dt>Reputation</dt>
                    <dd>{source.rating}</dd>
                  </div>
                )}
                {source.bias && (
                  <div className="source-detail">
                    <dt>Bias</dt>
                    <dd>{source.bias}</dd>
                  </div>
                )}
                {source.description && (
                  <div className="source-detail">
                    <dt>Description</dt>
                    <dd style={{ fontSize: 13, fontWeight: 400, maxWidth: 200 }}>{source.description}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Side Card */}
          <div className="card anim-fadeUp d-3">
            <div className="card-body">
              <div className="section-header">
                <div className="section-icon"><Sparkles size={16} /></div>
                <span className="section-label">Analysis metadata</span>
              </div>
              <div className="side-meta">
                <div className="side-meta-row">
                  <span className="side-meta-label">Model</span>
                  <span className="side-meta-value">MiniMax</span>
                </div>
                <div className="side-meta-row">
                  <span className="side-meta-label">Claims evaluated</span>
                  <span className="side-meta-value">
                    {(result.claims_breakdown && result.claims_breakdown.length) || crossrefs.length || "N/A"}
                  </span>
                </div>
                <div className="side-meta-row">
                  <span className="side-meta-label">Sources consulted</span>
                  <span className="side-meta-value">
                    {(result.all_sources && result.all_sources.length)
                      ? result.all_sources.length
                      : (crossrefs.length > 0 ? crossrefs.length + "+" : "N/A")}
                  </span>
                </div>
                <div className="side-meta-row">
                  <span className="side-meta-label">Flags</span>
                  <span className="side-meta-value">{flags.length}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="side-meta-label" style={{ display: "block", marginBottom: 8 }}>Confidence trend</span>
                  <div className="sparkline">
                    {[40, 55, 65, 50, 70, 75, 60, confidence, confidence].map((v, i) => (
                      <div key={i} className="sparkline-bar" style={{ height: `${Math.max(v * 0.24, 4)}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VerificationSections result={result} loading={false} />

      <ResultsChat result={result} />

      {result.disclaimer && (
        <p className="results-disclaimer">{result.disclaimer}</p>
      )}
    </div>
  );
}

// ===== Verification Sections (claim breakdown, fact-checks, spread, image, sources) =====

function claimVerdictPill(v) {
  const u = (v || "").toString().toLowerCase();
  if (u.includes("confirm")) return "pill-real";
  if (u.includes("false") || u.includes("fake")) return "pill-fake";
  if (u.includes("disput")) return "pill-uncertain";
  return "pill-uncertain";
}

function ClaimBreakdownCard({ claims }) {
  const [expanded, setExpanded] = useState(() => new Set());

  if (!claims || claims.length === 0) return null;
  const toggle = (i) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="card verify-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><Layers size={16} /></div>
          <span className="section-label">Claim-by-claim breakdown</span>
        </div>
        <div className="claim-list">
          {claims.map((c, i) => {
            const open = expanded.has(i);
            return (
              <div key={i} className="claim-item">
                <button
                  type="button"
                  className={`claim-header ${open ? "open" : ""}`}
                  onClick={() => toggle(i)}
                  aria-expanded={open}
                >
                  <div className="claim-header-text">
                    <span className={`pill ${claimVerdictPill(c.verdict)} font-mono claim-verdict-pill`}>
                      {c.verdict || "Unconfirmed"} {Number.isFinite(c.confidence) ? `· ${c.confidence}%` : ""}
                    </span>
                    <span className="claim-text">{c.claim}</span>
                  </div>
                  <ChevronDown size={16} className="claim-chevron" />
                </button>
                {open && (
                  <div className="claim-body">
                    {c.reasoning && <p className="claim-reasoning">{c.reasoning}</p>}
                    <EvidenceList title="Supporting" items={c.evidence_for} tone="real" />
                    <EvidenceList title="Contradicting" items={c.evidence_against} tone="fake" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EvidenceList({ title, items, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`evidence-block evidence-${tone}`}>
      <div className="evidence-title">{title}</div>
      <ul className="evidence-list">
        {items.map((it, i) => (
          <li key={i} className="evidence-item">
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="evidence-link"
              title={it.url}
            >
              {it.title || it.url} <ExternalLink size={11} />
            </a>
            {it.snippet && <p className="evidence-snippet">{it.snippet}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FactChecksWebCard({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card verify-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><ShieldCheck size={16} /></div>
          <span className="section-label">Fact-checker results</span>
        </div>
        <ul className="factcheck-web-list">
          {items.map((fc, i) => (
            <li key={i} className="factcheck-web-item">
              <div className="factcheck-meta">
                <span className="factcheck-source">{fc.source}</span>
                <span className={`pill ${claimVerdictPill(fc.status)} font-mono`} style={{ fontSize: 10 }}>
                  {fc.status}
                </span>
              </div>
              <a href={fc.url} target="_blank" rel="noopener noreferrer" className="factcheck-link">
                {fc.claim} <ExternalLink size={12} />
              </a>
              {fc.snippet && <p className="factcheck-snippet">{fc.snippet}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SpreadCard({ spread }) {
  if (!spread || (!spread.pattern && !spread.reasoning)) return null;
  return (
    <div className="card verify-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><Network size={16} /></div>
          <span className="section-label">Cross-reference summary</span>
        </div>
        <div className="spread-stats">
          <div className="spread-stat">
            <span className="spread-stat-num">{spread.mainstream_count ?? 0}</span>
            <span className="spread-stat-label">Mainstream outlets</span>
          </div>
          <div className="spread-stat">
            <span className="spread-stat-num">{spread.fringe_count ?? 0}</span>
            <span className="spread-stat-label">Other sources</span>
          </div>
          <div className="spread-stat">
            <span className="spread-stat-pattern">{spread.pattern || "unknown"}</span>
            <span className="spread-stat-label">Spread pattern</span>
          </div>
        </div>
        {spread.reasoning && <p className="spread-reasoning">{spread.reasoning}</p>}
      </div>
    </div>
  );
}

function ImageVisualCard({ visual }) {
  if (!visual || (!visual.description && (!visual.claims || !visual.claims.length))) return null;
  return (
    <div className="card verify-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><ImageIcon size={16} /></div>
          <span className="section-label">Image analysis</span>
        </div>
        {visual.description && <p className="image-visual-desc">{visual.description}</p>}
        {visual.claims && visual.claims.length > 0 && (
          <ul className="image-visual-claims">
            {visual.claims.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function SourcesListCard({ urls }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="card verify-card anim-fadeUp">
      <div className="card-body">
        <div className="section-header">
          <div className="section-icon"><Globe size={16} /></div>
          <span className="section-label">All sources consulted</span>
        </div>
        <ul className="sources-list">
          {urls.map((u, i) => {
            let host = u;
            try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
            return (
              <li key={i}>
                <a href={u} target="_blank" rel="noopener noreferrer" title={u}>
                  {host} <ExternalLink size={11} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function VerificationSections({ result }) {
  if (!result) return null;
  const hasAny =
    (result.claims_breakdown && result.claims_breakdown.length) ||
    (result.fact_checks_web && result.fact_checks_web.length) ||
    (result.spread_analysis && result.spread_analysis.pattern) ||
    (result.image_visual && (result.image_visual.description || (result.image_visual.claims || []).length)) ||
    (result.all_sources && result.all_sources.length);
  if (!hasAny) return null;
  return (
    <div className="verification-stack">
      <ClaimBreakdownCard claims={result.claims_breakdown} />
      <FactChecksWebCard items={result.fact_checks_web} />
      <SpreadCard spread={result.spread_analysis} />
      <ImageVisualCard visual={result.image_visual} />
      <SourcesListCard urls={result.all_sources} />
      {result.search_enabled === false && (
        <p className="search-disabled-note">
          Web search not configured (no <code>BRAVE_SEARCH_API_KEY</code>) — verdict based on
          AI reasoning only. Add a key to <code>.env</code> for live web verification.
        </p>
      )}
    </div>
  );
}

// ===== How It Works =====

function HowItWorks() {
  return (
    <div className="container">
      <section className="how-hero anim-fadeUp">
        <h1>How TruthLens reads an article.</h1>
        <p className="hero-subtitle" style={{ marginTop: 16 }}>
          Every piece of content goes through a multi-step editorial pipeline.
        </p>
      </section>

      <div className="steps-grid">
        {[
          { icon: <Clipboard size={22} />, num: "01", title: "Ingest", desc: "Content is parsed and normalized from any format: URL, text, or headline." },
          { icon: <Brain size={22} />, num: "02", title: "Analyze", desc: "AI extracts core claims and evaluates them against known patterns." },
          { icon: <Network size={22} />, num: "03", title: "Cross-reference", desc: "Claims are verified against independent fact-checking databases." },
          { icon: <FileText size={22} />, num: "04", title: "Verdict", desc: "A reasoned editorial verdict is composed with confidence scoring." },
        ].map((s, i) => (
          <div key={i} className={`card step-card anim-fadeUp d-${i + 1}`}>
            <div className="step-number">Step {s.num}</div>
            <div className="step-icon">{s.icon}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <section className="dont-section anim-fadeUp">
        <h2>What we don't do</h2>
        <div className="dont-grid">
          {[
            { icon: <X size={22} />, title: "No censorship", desc: "We never remove or block content. We only inform." },
            { icon: <Eye size={22} />, title: "No tracking", desc: "Your queries are not stored, logged, or sold." },
            { icon: <AlertTriangle size={22} />, title: "No absolutes", desc: "We present confidence levels, not binary truth claims." },
          ].map((d, i) => (
            <div key={i} className={`card dont-card anim-fadeUp d-${i + 1}`}>
              <div className="feature-icon">{d.icon}</div>
              <h4>{d.title}</h4>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===== About =====

function About() {
  return (
    <div className="container">
      <section className="about-hero anim-fadeUp">
        <h1>A tool built by people<br />who miss the old newsroom.</h1>
      </section>

      <div className="about-grid anim-fadeUp d-1">
        <div className="about-body">
          <p className="about-lead">
            TruthLens was born from a simple frustration: the best editorial instincts
            should not be locked behind paywalls and newsroom doors.
          </p>
          <p>
            We built this tool to give everyone access to the kind of rigorous, multi-source
            verification that used to happen only in professional newsrooms. Every analysis
            follows the same editorial standards: source the claim, check the source, weigh
            the evidence, and present the findings transparently.
          </p>
          <p>
            Our AI does not replace human judgment. It augments it. Think of TruthLens as a
            tireless research assistant that reads faster than you can, but always shows its
            work so you can make the final call.
          </p>
        </div>
        <div className="card about-sidebar">
          <div className="card-body">
            <dl className="about-meta">
              <div>
                <dt>Version</dt>
                <dd>1.4 (Editorial)</dd>
              </div>
              <div>
                <dt>Engine</dt>
                <dd>MiniMax LLM</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>Multi-database</dd>
              </div>
              <div>
                <dt>Privacy</dt>
                <dd>No data stored</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="stats-band about-quote-band anim-fadeUp d-2" style={{ gridTemplateColumns: "1fr", padding: "48px 32px" }}>
        <div>
          <p className="about-quote" style={{ color: "var(--cream)" }}>
            "The best fact-check is the one that happens before you hit share."
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== Main App =====

export default function FakeNewsDetectorFrontend() {
  const [page, setPageState] = useState(readPageFromHash);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [imagePreviewURL, setImagePreviewURL] = useState(null);
  const [verifyPhases, setVerifyPhases] = useState(FALLBACK_VERIFY_PHASES);
  const [verifyCurrent, setVerifyCurrent] = useState(null);
  const [verifyDone, setVerifyDone] = useState(() => new Set());
  const [verifyErrored, setVerifyErrored] = useState(() => new Set());
  const stepInterval = useRef(null);
  const verifyAbort = useRef(null);

  const setPage = useCallback((next) => {
    setPageState(next);
    const target = `#${next}`;
    if (window.location.hash !== target) {
      window.history.pushState(null, "", target);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setPageState(readPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#landing");
    }
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode((d) => !d);

  const resetVerifyProgress = useCallback(() => {
    setVerifyPhases(FALLBACK_VERIFY_PHASES);
    setVerifyCurrent(null);
    setVerifyDone(new Set());
    setVerifyErrored(new Set());
  }, []);

  const handleVerifyEvent = useCallback((event) => {
    const { step, status, data } = event || {};
    if (!step) return;

    if (step === "init" && status === "done") {
      if (data && Array.isArray(data.phases) && data.phases.length) {
        setVerifyPhases(data.phases);
      }
      setResult((prev) => ({
        ...(prev || {}),
        title: data?.title || (prev && prev.title) || "",
        domain: data?.domain || (prev && prev.domain) || "",
        input_kind: data?.input_kind || (prev && prev.input_kind) || "text",
        search_enabled: !!data?.search_enabled,
        disclaimer: data?.disclaimer || (prev && prev.disclaimer) || "",
      }));
      return;
    }

    if (status === "started") {
      setVerifyCurrent(step);
      return;
    }

    if (status === "error") {
      setVerifyErrored((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
      setVerifyCurrent((cur) => (cur === step ? null : cur));
      return;
    }

    if (status === "done") {
      setVerifyDone((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
      setVerifyCurrent((cur) => (cur === step ? null : cur));

      setResult((prev) => {
        const base = prev || {};
        switch (step) {
          case "extract_claims":
            return { ...base, entities: data?.entities || base.entities, raw_claims: data?.claims || [] };
          case "source_credibility":
            return {
              ...base,
              source_assessment: data || base.source_assessment,
              source_credibility: {
                domain: data?.domain || base.domain || "",
                rating: data?.rating || "unknown",
                bias: data?.bias || "unknown",
                description: data?.description || data?.reasoning || "",
              },
            };
          case "verify_claims":
            return { ...base, claims_breakdown: data?.claims || [] };
          case "fact_check_db":
            return {
              ...base,
              fact_checks_web: data?.fact_checks || [],
              fact_checks: data?.fact_checks || base.fact_checks || [],
            };
          case "spread":
            return { ...base, spread_analysis: data || base.spread_analysis };
          case "image_visual":
            return { ...base, image_visual: data || base.image_visual };
          case "red_flags":
            return {
              ...base,
              red_flags_detailed: data?.red_flags || [],
              red_flags: (data?.red_flags || []).map((f) =>
                typeof f === "string" ? f : `${f.category}: ${f.description}`
              ),
            };
          case "final_verdict":
            return {
              ...base,
              verdict: data?.verdict || base.verdict,
              confidence_score: data?.confidence ?? base.confidence_score ?? 0,
              summary: data?.summary || base.summary || "",
              reasoning: data?.reasoning || base.reasoning || "",
            };
          case "complete":
            return {
              ...base,
              ...data,
              red_flags: (data?.red_flags_detailed || []).map((f) =>
                typeof f === "string" ? f : `${f.category}: ${f.description}`
              ),
              fact_checks: data?.fact_checks_web || base.fact_checks || [],
              source_credibility: {
                domain: data?.source_assessment?.domain || base.domain || "",
                rating: data?.source_assessment?.rating || "unknown",
                bias: data?.source_assessment?.bias || "unknown",
                description:
                  data?.source_assessment?.description ||
                  data?.source_assessment?.reasoning ||
                  "",
              },
            };
          default:
            return base;
        }
      });

      if (step === "complete") {
        setVerifyCurrent(null);
      }
    }
  }, []);

  const runVerify = useCallback(async (payload, displayQuery) => {
    if (verifyAbort.current) {
      try { verifyAbort.current.abort(); } catch { /* ignore */ }
    }
    const controller = new AbortController();
    verifyAbort.current = controller;

    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setQuery(displayQuery || "");
    setResult({ verdict: "", confidence_score: 0, summary: "", reasoning: "" });
    resetVerifyProgress();
    setPage("results");

    try {
      await streamVerify(payload, {
        onEvent: handleVerifyEvent,
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
      verifyAbort.current = null;
    }
  }, [handleVerifyEvent, resetVerifyProgress]);

  const analyzeContent = useCallback(async (input, mode) => {
    const isUrl = mode === "url" || /^https?:\/\//i.test(input);
    const payload = isUrl
      ? { input_kind: "url", url: input }
      : { input_kind: "text", text: input };
    await runVerify(payload, input);
  }, [runVerify]);

  const analyzeImage = useCallback(async (file, contextText, previewObjectURL) => {
    setImagePreviewURL(previewObjectURL || null);
    let base64;
    try {
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = String(reader.result || "");
          const comma = r.indexOf(",");
          resolve(comma >= 0 ? r.slice(comma + 1) : r);
        };
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
    } catch (err) {
      setError(err.message || "Could not read image.");
      setPage("results");
      return;
    }
    await runVerify(
      {
        input_kind: "image",
        image_base64: base64,
        mime_type: file.type || "image/png",
        context: contextText || "",
      },
      contextText ? contextText : `Image: ${file.name}`,
    );
  }, [runVerify]);

  const handleBack = () => {
    setResult(null);
    setError(null);
    if (imagePreviewURL) {
      URL.revokeObjectURL(imagePreviewURL);
      setImagePreviewURL(null);
    }
    setPage("landing");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ivory)", color: "var(--charcoal)" }}>
      <Nav page={page} setPage={setPage} darkMode={darkMode} toggleDark={toggleDark} />

      {loading && (
        <LoadingOverlay
          step={loadingStep}
          phases={verifyPhases}
          currentPhase={verifyCurrent}
          completedPhases={verifyDone}
          errorPhases={verifyErrored}
          label="Verifying against the web"
        />
      )}

      <main>
        {page === "landing" && (
          <Landing onAnalyze={analyzeContent} onAnalyzeImage={analyzeImage} />
        )}

        {page === "results" && !loading && (
          error ? (
            <div className="container" style={{ paddingTop: 80 }}>
              <div className="card error-card anim-scaleIn">
                <AlertTriangle size={40} style={{ color: "var(--fake)" }} />
                <h3>Analysis Failed</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={handleBack}>
                  <ArrowLeft size={14} /> Try again
                </button>
              </div>
            </div>
          ) : result ? (
            <Results result={result} query={query} onBack={handleBack} imagePreviewURL={imagePreviewURL} />
          ) : (
            <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
              <div className="card error-card">
                <p style={{ color: "var(--stone)" }}>No results to display.</p>
                <button className="btn btn-ghost" onClick={handleBack} style={{ marginTop: 16 }}>
                  <ArrowLeft size={14} /> Go back
                </button>
              </div>
            </div>
          )
        )}

        {page === "how" && <HowItWorks />}
        {page === "about" && <About />}
      </main>

      <Footer />
    </div>
  );
}
