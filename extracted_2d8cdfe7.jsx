// Shared UI components: Nav, Footer, Logo, Pill

const { useState, useEffect, useRef, useMemo } = React;
const { Icons } = window;

function Logo({ size = 28 }) {
  return (
    <div className="nav-logo-mark" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.3" y2="16.3" />
      </svg>
    </div>
  );
}

function Nav({ route, go, dark, toggleDark }) {
  const links = [
    { id: "home", label: "Analyze" },
    { id: "how", label: "How it works" },
    { id: "about", label: "About" },
  ];
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => go("home")}>
          <Logo />
          <span>TruthLens</span>
        </div>
        <div className="nav-links">
          {links.map(l => (
            <button
              key={l.id}
              className={"nav-link" + (route === l.id ? " active" : "")}
              onClick={() => go(l.id)}
            >{l.label}</button>
          ))}
        </div>
        <div className="nav-right">
          <div className="pill" style={{ display: window.innerWidth < 720 ? "none" : "inline-flex" }}>
            <span className="pill-dot" /> API online
          </div>
          <button className="icon-btn" onClick={toggleDark} aria-label="Toggle dark mode">
            {dark ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo">
              <Logo />
              <span>TruthLens</span>
            </div>
            <p>An editorial approach to fake-news detection. Built with MiniMax AI, designed for readers, journalists, and researchers who care about what's actually true.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li onClick={() => go("home")}>Analyze</li>
                <li onClick={() => go("how")}>How it works</li>
                <li>API access</li>
                <li>Browser extension</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li onClick={() => go("about")}>About</li>
                <li>Methodology</li>
                <li>Partners</li>
                <li>Contact</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li>Media literacy guide</li>
                <li>Research papers</li>
                <li>Changelog</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-legal">
          <span>© 2026 TruthLens — An open-source editorial project</span>
          <span>Powered by MiniMax AI · v1.4.2</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Footer, Logo });
