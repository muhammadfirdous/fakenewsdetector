// App root + router

const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [route, setRoute] = useStateApp("home");
  const [pending, setPending] = useStateApp("");
  const [result, setResult] = useStateApp(null);
  const [dark, setDark] = useStateApp(false);
  const [tweaks, setTweaks] = useStateApp(/*EDITMODE-BEGIN*/{
    "demoVerdict": "auto",
    "accentHue": "terracotta",
    "serifChoice": "instrument",
    "showPaperGrain": true
  }/*EDITMODE-END*/);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffectApp(() => {
    // Accent swap via tweaks
    const map = {
      terracotta: ["#C66B3D", "#B05B30"],
      indigo: ["#4A5D8C", "#3D4F7A"],
      forest: ["#4A6B3A", "#3B5730"],
      plum: ["#7A4A5E", "#66394C"],
    };
    const [a, b] = map[tweaks.accentHue] || map.terracotta;
    document.documentElement.style.setProperty("--terracotta", a);
    document.documentElement.style.setProperty("--terracotta-hover", b);
  }, [tweaks.accentHue]);

  useEffectApp(() => {
    const fonts = {
      instrument: "'Instrument Serif', 'Fraunces', Georgia, serif",
      fraunces:   "'Fraunces', 'Instrument Serif', Georgia, serif",
      playfair:   "'Playfair Display', 'Fraunces', Georgia, serif",
    };
    document.documentElement.style.setProperty("--font-serif", fonts[tweaks.serifChoice] || fonts.instrument);
  }, [tweaks.serifChoice]);

  useEffectApp(() => {
    document.body.style.setProperty("--grain-opacity", tweaks.showPaperGrain ? "0.35" : "0");
    const st = document.getElementById("grain-toggle-style") || document.createElement("style");
    st.id = "grain-toggle-style";
    st.textContent = tweaks.showPaperGrain ? "" : "body::before { opacity: 0 !important; }";
    if (!document.getElementById("grain-toggle-style")) document.head.appendChild(st);
  }, [tweaks.showPaperGrain]);

  useEffectApp(() => {
    if (tweaks.demoVerdict === "auto" || !window.MOCKS) return;
    // If user is viewing results, swap the demo verdict
    if (route === "results" && tweaks.demoVerdict !== "auto") {
      setResult(window.MOCKS[tweaks.demoVerdict]);
    }
  }, [tweaks.demoVerdict, route]);

  const go = (r) => {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleSetResult = (r) => {
    // Respect tweak override if set
    if (tweaks.demoVerdict !== "auto" && window.MOCKS) {
      setResult(window.MOCKS[tweaks.demoVerdict]);
    } else {
      setResult(r);
    }
  };

  return (
    <>
      <window.Nav route={route} go={go} dark={dark} toggleDark={() => setDark(!dark)} />
      <main>
        {route === "home" && (
          <window.Landing go={go} setPending={setPending} setResult={handleSetResult} />
        )}
        {route === "results" && result && (
          <window.Results go={go} source={pending} result={result} />
        )}
        {route === "results" && !result && (
          <div className="container" style={{ padding: "120px 0", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>No analysis yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go("home")}>Start one</button>
          </div>
        )}
        {route === "how" && <window.HowItWorks />}
        {route === "about" && <window.About />}
      </main>
      <window.Footer go={go} />

      <TweaksHost tweaks={tweaks} setTweaks={setTweaks} onJumpResults={(v) => {
        if (window.MOCKS) {
          setResult(window.MOCKS[v]);
          setPending("Demo article — showing " + v.toLowerCase() + " verdict state for design review.");
          go("results");
        }
      }} />
    </>
  );
}

function TweaksHost({ tweaks, setTweaks, onJumpResults }) {
  const T = window.TweaksPanel;
  const Section = window.TweakSection;
  const Radio = window.TweakRadio;
  const Toggle = window.TweakToggle;
  const Button = window.TweakButton;

  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent && window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  if (!T) return null;

  return (
    <T title="Tweaks">
      <Section title="Verdict demo">
        <Radio
          value={tweaks.demoVerdict}
          onChange={(v) => update({ demoVerdict: v })}
          options={[
            { value: "auto", label: "Auto (detect from input)" },
            { value: "REAL", label: "Force REAL" },
            { value: "FAKE", label: "Force FAKE" },
            { value: "UNCERTAIN", label: "Force UNCERTAIN" },
          ]}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Button onClick={() => onJumpResults("REAL")}>Preview REAL</Button>
          <Button onClick={() => onJumpResults("FAKE")}>Preview FAKE</Button>
          <Button onClick={() => onJumpResults("UNCERTAIN")}>Preview UNCERTAIN</Button>
        </div>
      </Section>

      <Section title="Accent color">
        <Radio
          value={tweaks.accentHue}
          onChange={(v) => update({ accentHue: v })}
          options={[
            { value: "terracotta", label: "Warm Terracotta (default)" },
            { value: "indigo", label: "Deep Indigo" },
            { value: "forest", label: "Forest Green" },
            { value: "plum", label: "Aubergine Plum" },
          ]}
        />
      </Section>

      <Section title="Serif family">
        <Radio
          value={tweaks.serifChoice}
          onChange={(v) => update({ serifChoice: v })}
          options={[
            { value: "instrument", label: "Instrument Serif" },
            { value: "fraunces", label: "Fraunces" },
            { value: "playfair", label: "Playfair Display" },
          ]}
        />
      </Section>

      <Section title="Texture">
        <Toggle
          label="Paper grain overlay"
          value={tweaks.showPaperGrain}
          onChange={(v) => update({ showPaperGrain: v })}
        />
      </Section>
    </T>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
