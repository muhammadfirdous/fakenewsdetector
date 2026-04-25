// Minimal Lucide-style icon set as inline SVGs (React components).
// Stroke=1.75 for an editorial feel.

const Ico = (path, viewBox = "0 0 24 24") => ({ size = 18, className = "", strokeWidth = 1.75, ...rest } = {}) =>
  React.createElement(
    "svg",
    {
      width: size, height: size, viewBox, fill: "none",
      stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
      className, ...rest
    },
    ...(Array.isArray(path) ? path : [path])
  );

const pathEl = (d, extra = {}) => React.createElement("path", { d, ...extra });
const circEl = (cx, cy, r, extra = {}) => React.createElement("circle", { cx, cy, r, ...extra });
const lineEl = (x1, y1, x2, y2, extra = {}) => React.createElement("line", { x1, y1, x2, y2, ...extra });

window.Icons = {
  Sparkles: Ico([
    pathEl("M12 3v4"),
    pathEl("M12 17v4"),
    pathEl("M3 12h4"),
    pathEl("M17 12h4"),
    pathEl("M5.6 5.6l2.8 2.8"),
    pathEl("M15.6 15.6l2.8 2.8"),
    pathEl("M5.6 18.4l2.8-2.8"),
    pathEl("M15.6 8.4l2.8-2.8"),
  ]),
  Search: Ico([ circEl(11, 11, 7), pathEl("M21 21l-4.3-4.3") ]),
  ArrowRight: Ico([ pathEl("M5 12h14"), pathEl("M13 5l7 7-7 7") ]),
  ArrowLeft: Ico([ pathEl("M19 12H5"), pathEl("M11 19l-7-7 7-7") ]),
  ArrowDown: Ico([ pathEl("M12 5v14"), pathEl("M19 12l-7 7-7-7") ]),
  Check: Ico(pathEl("M5 13l4 4L19 7")),
  X: Ico([ pathEl("M18 6L6 18"), pathEl("M6 6l12 12") ]),
  Alert: Ico([ pathEl("M12 9v4"), pathEl("M12 17h.01"), pathEl("M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z") ]),
  Shield: Ico([ pathEl("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z") ]),
  ShieldCheck: Ico([ pathEl("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"), pathEl("M9 12l2 2 4-4") ]),
  Brain: Ico([ pathEl("M9.5 2A2.5 2.5 0 007 4.5v.5a3 3 0 00-3 3 3 3 0 00.5 5 3 3 0 001 5.5A2.5 2.5 0 009.5 21a2.5 2.5 0 002.5-2.5V4.5A2.5 2.5 0 009.5 2z"), pathEl("M14.5 2A2.5 2.5 0 0117 4.5v.5a3 3 0 013 3 3 3 0 01-.5 5 3 3 0 01-1 5.5A2.5 2.5 0 0114.5 21a2.5 2.5 0 01-2.5-2.5V4.5A2.5 2.5 0 0114.5 2z") ]),
  Link: Ico([ pathEl("M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"), pathEl("M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71") ]),
  Globe: Ico([ circEl(12, 12, 10), pathEl("M2 12h20"), pathEl("M12 2a15 15 0 010 20M12 2a15 15 0 000 20") ]),
  FileText: Ico([ pathEl("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"), pathEl("M14 2v6h6"), pathEl("M8 13h8"), pathEl("M8 17h5") ]),
  Zap: Ico(pathEl("M13 2L3 14h9l-1 8 10-12h-9l1-8z")),
  Book: Ico([ pathEl("M4 19.5V5a2 2 0 012-2h14v18H6a2 2 0 01-2-2z"), pathEl("M8 7h8"), pathEl("M8 11h5") ]),
  Sun: Ico([ circEl(12, 12, 4), pathEl("M12 2v2"), pathEl("M12 20v2"), pathEl("M4.93 4.93l1.41 1.41"), pathEl("M17.66 17.66l1.41 1.41"), pathEl("M2 12h2"), pathEl("M20 12h2"), pathEl("M4.93 19.07l1.41-1.41"), pathEl("M17.66 6.34l1.41-1.41") ]),
  Moon: Ico(pathEl("M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z")),
  Quote: Ico([ pathEl("M3 11h4v8H3zM14 11h4v8h-4z"), pathEl("M7 11V7a4 4 0 014-4"), pathEl("M18 11V7a4 4 0 014-4") ]),
  Eye: Ico([ pathEl("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"), circEl(12, 12, 3) ]),
  EyeOff: Ico([ pathEl("M9.88 9.88a3 3 0 104.24 4.24"), pathEl("M10.73 5.08A10.43 10.43 0 0112 5c7 0 11 8 11 8a13.16 13.16 0 01-1.67 2.68"), pathEl("M6.61 6.61A13.53 13.53 0 001 12s4 8 11 8a9.74 9.74 0 005.39-1.61"), lineEl(2, 2, 22, 22) ]),
  Network: Ico([ circEl(12, 5, 3), circEl(5, 19, 3), circEl(19, 19, 3), pathEl("M12 8v5"), pathEl("M7.5 16.5L10 13"), pathEl("M16.5 16.5L14 13") ]),
  Flag: Ico([ pathEl("M4 22V4a2 2 0 012-2h11l-2 5 2 5H6"), lineEl(4, 22, 4, 15) ]),
  Scale: Ico([ pathEl("M12 3v18"), pathEl("M6 8l-4 8h8z"), pathEl("M18 8l-4 8h8z"), pathEl("M6 8h12"), pathEl("M8 21h8") ]),
  Clock: Ico([ circEl(12, 12, 10), pathEl("M12 6v6l4 2") ]),
  Database: Ico([
    React.createElement("ellipse", { cx: 12, cy: 5, rx: 9, ry: 3 }),
    pathEl("M3 5v6a9 3 0 0018 0V5"),
    pathEl("M3 11v6a9 3 0 0018 0v-6"),
  ]),
  Layers: Ico([ pathEl("M12 2L2 7l10 5 10-5-10-5z"), pathEl("M2 17l10 5 10-5"), pathEl("M2 12l10 5 10-5") ]),
  Clipboard: Ico([ pathEl("M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"), React.createElement("rect", { x: 8, y: 2, width: 8, height: 4, rx: 1 }) ]),
  Users: Ico([ pathEl("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"), circEl(9, 7, 4), pathEl("M23 21v-2a4 4 0 00-3-3.87"), pathEl("M16 3.13a4 4 0 010 7.75") ]),
  ExtLink: Ico([ pathEl("M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"), pathEl("M15 3h6v6"), pathEl("M10 14L21 3") ]),
  Type: Ico([ pathEl("M4 7V4h16v3"), pathEl("M9 20h6"), pathEl("M12 4v16") ]),
  Compass: Ico([ circEl(12, 12, 10), pathEl("M16.24 7.76L14.12 14.12 7.76 16.24l2.12-6.36z") ]),
  Menu: Ico([ pathEl("M3 6h18"), pathEl("M3 12h18"), pathEl("M3 18h18") ]),
  Chevron: Ico(pathEl("M6 9l6 6 6-6")),
};
