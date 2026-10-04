"use client";

import { useEffect, useRef, useState } from "react";
import "./wow.css";
import {
  ArrowUpRight,
  ArrowUp,
  Sun,
  Moon,
  Menu,
  X,
  Play,
  Pause,
  Eye,
  Linkedin,
  Twitter,
  Dribbble,
  Award,
  Palette,
  Compass,
  LayoutGrid,
  Fingerprint,
  Layers,
  Star,
  Hourglass,
  Hexagon,
  Triangle,
  Circle,
  Zap,
  Command,
} from "lucide-react";

function isReduced() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/* ---------- helpers ---------- */
function Split({ text, base = 0 }: { text: string; base?: number }) {
  return (
    <span aria-label={text} role="text">
      {text.split("").map((c, i) => (
        <span key={i} aria-hidden="true" className="wow-char" style={{ animationDelay: `${base + i * 0.035}s` }}>
          {c === " " ? "\u00A0" : c}
        </span>
      ))}
    </span>
  );
}

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (isReduced()) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return val;
}

/* ---------- data (mirrors kstoimenov.com structure) ---------- */
const SERVICES = [
  { icon: LayoutGrid, title: "Product design", a: "Product", b: "Design" },
  { icon: Compass, title: "Digital strategy", a: "Digital", b: "Strategy" },
  { icon: Layers, title: "Web design", a: "Web", b: "Design" },
  { icon: Fingerprint, title: "Brand identity", a: "Brand", b: "Identity" },
  { icon: Palette, title: "Service design", a: "Service", b: "Design" },
];

const WORKS = [
  { tag: "Cyber security", title: "Acronis Cyber Protect", bg1: "linear-gradient(135deg,#01218f,#000a3d)", bg2: "linear-gradient(135deg,#1a2cff,#000a3d)", soon: false },
  { tag: "Finance", title: "Polygon", bg1: "linear-gradient(135deg,#0e131f,#2b3a67)", bg2: "linear-gradient(135deg,#1a1a1a,#4b47d6)", soon: false },
  { tag: "Finance", title: "DB Digital Wallet", bg1: "linear-gradient(135deg,#0b3b8f,#2bbfff)", bg2: "linear-gradient(135deg,#2bbfff,#9a8ff7)", soon: false },
  { tag: "Hosting", title: "WP Engine", bg1: "linear-gradient(135deg,#c8ccd2,#7d8aa0)", bg2: "linear-gradient(135deg,#cddef4,#5b7fb4)", soon: true },
  { tag: "Finance", title: "Orion", bg1: "linear-gradient(135deg,#0c0c0c,#2a2a35)", bg2: "linear-gradient(135deg,#23232e,#6f6bff)", soon: false },
  { tag: "Healthcare", title: "Macmillan cancer support", bg1: "linear-gradient(135deg,#1d7a5f,#0c2e26)", bg2: "linear-gradient(135deg,#37e0a8,#0c2e26)", soon: false },
];

const TESTIMONIALS = [
  { q: "He treated a cancer-support product with the care it deserved: clearer journeys, less friction, and a system our whole team could finally build on.", n: "Richard Dood", r: "Digital Director @Macmillan" },
  { q: "He turned a developer-first product into something anyone could navigate. Sharp, fast, and grounded in how our users actually work.", n: "Peter Stacho", r: "COO @Polygon.io" },
  { q: "Krasi moves at the pace of the idea, not the org chart. He prototyped, tested, and refined faster than our roadmap could keep up.", n: "Amori Langstaff", r: "Product Innovation @WP Engine" },
  { q: "We handed Krasi a rough idea and got back a fundable product. Fast, opinionated, and genuinely invested in whether we won.", n: "Carlos Strazzer", r: "CEO @Ventures Lab" },
  { q: "Nothing is beyond possibility when working with Krasi. Deep curiosity, investment and expertise in every project. Genuinely dedicated to his craft.", n: "Gaidar Magdanurov", r: "COO @Acronis" },
];

const PARTNERS = ["Acronis", "Constructor", "Ringier", "Macmillan", "Endava", "Simplebet", "Jeton", "Lottoland", "Dojo", "TELUS", "Claim Compass", "Brand Quadergy", "polygon.io", "Efes Club", "jobpal", "Unilever"];

const ABOUT_WORDS =
  "With a holistic approach that balances aesthetics with usability, I craft digital products that deliver exceptional user experiences. Specialising in turning complex challenges into intuitive solutions, I offer a suite of design services that breathe life into your vision. Through collaborative ideation, rigorous research, and iterative design processes, I ensure that every detail aligns with your goals, enriching the lives of your users with every interaction.".split(" ");

const GLYPH_AFTER: Record<number, "pop" | "spin" | "burst"> = {};
GLYPH_AFTER[ABOUT_WORDS.indexOf("usability,")] = "pop";
GLYPH_AFTER[ABOUT_WORDS.indexOf("solutions,")] = "spin";
GLYPH_AFTER[ABOUT_WORDS.indexOf("processes,")] = "burst";

function Glyph({ kind }: { kind: "pop" | "spin" | "burst" }) {
  if (kind === "pop")
    return (
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)" />
        <rect x="10.2" y="10.2" width="3.6" height="3.6" transform="rotate(45 12 12)" fill="currentColor" stroke="none" />
      </svg>
    );
  if (kind === "spin")
    return (
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5.5" r="2.6" /><circle cx="17.5" cy="9.5" r="2.6" /><circle cx="15.5" cy="16.5" r="2.6" /><circle cx="8.5" cy="16.5" r="2.6" /><circle cx="6.5" cy="9.5" r="2.6" />
    </svg>
  );
}

/* ---------- page ---------- */
export default function WowPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [introDone, setIntroDone] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const [introCount, setIntroCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [playing, setPlaying] = useState(false);
  const [metricsIn, setMetricsIn] = useState(false);
  const [aboutProgress, setAboutProgress] = useState(0);
  const [scramble, setScramble] = useState("remarkable");
  const [knobOn, setKnobOn] = useState(true);
  const [stageScale, setStageScale] = useState(0.62);
  const [quoteShift, setQuoteShift] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const cursorLabel = useRef<HTMLSpanElement | null>(null);
  const heroCanvas = useRef<HTMLCanvasElement | null>(null);
  const heroInnerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLElement | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);
  const metricsRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const quoteRef = useRef<HTMLElement | null>(null);

  const m12 = useCountUp(12, metricsIn);
  const m87 = useCountUp(87, metricsIn);
  const m3 = useCountUp(3, metricsIn);
  const m6 = useCountUp(6, metricsIn);

  /* theme init + persist (like reference localStorage) */
  useEffect(() => {
    try {
      if (localStorage.getItem("wow-theme") === "light") setTheme("light");
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("wow-theme", theme);
    } catch { /* noop */ }
  }, [theme]);

  /* intro overlay: counter + panel wipe */
  useEffect(() => {
    if (isReduced()) {
      setIntroDone(true);
      setIntroGone(true);
      return;
    }
    const id = window.setInterval(() => {
      setIntroCount((c) => {
        if (c >= 100) {
          window.clearInterval(id);
          return 100;
        }
        return Math.min(100, c + 7);
      });
    }, 50);
    const t1 = window.setTimeout(() => setIntroDone(true), 1250);
    const t2 = window.setTimeout(() => setIntroGone(true), 2200);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  /* scramble for "remarkable" */
  useEffect(() => {
    if (isReduced()) return;
    const glyphs = "abcdefghijklmnopqrstuvwxyz!?<>/{}";
    let frame = 0;
    const target = "remarkable";
    const id = window.setInterval(() => {
      frame += 1;
      setScramble(
        target.split("").map((c, i) => (i < frame / 2 ? c : glyphs[Math.floor(Math.random() * glyphs.length)])).join("")
      );
      if (frame / 2 >= target.length) window.clearInterval(id);
    }, 70);
    return () => window.clearInterval(id);
  }, []);

  /* custom cursor with lerp */
  useEffect(() => {
    const el = cursorRef.current;
    if (!el || isReduced()) return;
    if (window.matchMedia?.("(hover: none)").matches) return;
    const pos = { x: -100, y: -100, tx: -100, ty: -100 };
    let raf = 0;
    const move = (e: MouseEvent) => {
      pos.tx = e.clientX;
      pos.ty = e.clientY;
    };
    const over = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.("[data-cursor]") as HTMLElement | null;
      el.classList.toggle("is-hover", !!t);
      const label = t?.getAttribute("data-cursor") ?? "";
      el.classList.toggle("has-label", label.length > 2);
      if (cursorLabel.current) cursorLabel.current.textContent = label || "";
    };
    const loop = () => {
      pos.x += (pos.tx - pos.x) * 0.22;
      pos.y += (pos.ty - pos.y) * 0.22;
      el.setAttribute("style", `transform:translate(${pos.x}px,${pos.y}px);opacity:1`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* hero shader: drifting aurora blobs */
  useEffect(() => {
    const canvas = heroCanvas.current;
    if (!canvas || isReduced()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth * Math.min(2, window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * Math.min(2, window.devicePixelRatio || 1);
    };
    resize();
    window.addEventListener("resize", resize);
    const blobs = [
      { x: 0.25, y: 0.35, r: 0.42, c: "rgba(111,107,255,0.5)", s: 0.00042, p: 0 },
      { x: 0.72, y: 0.5, r: 0.5, c: "rgba(55,224,168,0.34)", s: 0.00031, p: 2 },
      { x: 0.5, y: 0.75, r: 0.46, c: "rgba(216,255,62,0.20)", s: 0.00025, p: 4 },
      { x: 0.85, y: 0.22, r: 0.3, c: "rgba(255,90,77,0.22)", s: 0.0005, p: 1 },
    ];
    const dark = () => rootRef.current?.getAttribute("data-theme") !== "light";
    const draw = (t: number) => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dark() ? "#08080a" : "#fafaf8";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = dark() ? "lighter" : "multiply";
      blobs.forEach((b) => {
        const x = (b.x + Math.sin(t * b.s + b.p) * 0.12) * w;
        const y = (b.y + Math.cos(t * b.s * 1.3 + b.p) * 0.1) * h;
        const r = b.r * Math.max(w, h) * (1 + Math.sin(t * 0.0004 + b.p) * 0.08);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  /* scroll choreography: progress + hero parallax + layered parallax + scrub + stage + drift */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const vh = window.innerHeight;
        const y = window.scrollY;
        const max = Math.max(1, document.documentElement.scrollHeight - vh);
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${(y / max).toFixed(4)})`;
        }
        const hero = heroInnerRef.current;
        if (hero) {
          const fade = Math.min(1, y / (vh * 0.85));
          hero.style.transform = `translate3d(0,${(y * 0.22).toFixed(1)}px,0)`;
          hero.style.opacity = `${Math.max(0, 1 - fade * 1.15).toFixed(3)}`;
        }
        if (!isReduced()) {
          rootRef.current?.querySelectorAll<HTMLElement>("[data-px]").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) return;
            const c = r.top + r.height / 2 - vh / 2;
            const speed = parseFloat(el.getAttribute("data-px") || "0");
            el.style.translate = `0 ${(-c * speed).toFixed(1)}px`;
          });
        }
        const about = aboutRef.current;
        if (about) {
          const r = about.getBoundingClientRect();
          const total = Math.max(1, r.height - vh * 0.6);
          setAboutProgress(Math.min(1, Math.max(0, -(r.top - vh * 0.35) / total)));
        }
        const stage = stageRef.current;
        if (stage) {
          const r = stage.getBoundingClientRect();
          const vis = Math.min(1, Math.max(0, 1 - r.top / (vh * 0.95)));
          const eased = 1 - Math.pow(1 - vis, 2);
          setStageScale(0.62 + 0.38 * eased);
        }
        const q = quoteRef.current;
        if (q) {
          const qr = q.getBoundingClientRect();
          setQuoteShift(Math.max(-1, Math.min(1, (vh / 2 - (qr.top + qr.height / 2)) / vh)));
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* reveals + metrics trigger + active section */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.15 }
    );
    root.querySelectorAll(".wow-reveal,.wow-maskline").forEach((n) => io.observe(n));
    const mio = new IntersectionObserver(([e]) => e.isIntersecting && setMetricsIn(true), { threshold: 0.3 });
    if (metricsRef.current) mio.observe(metricsRef.current);
    const secs = ["home", "about", "services", "works", "partners", "footer"];
    const sio = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    secs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sio.observe(el);
    });
    return () => {
      io.disconnect();
      mio.disconnect();
      sio.disconnect();
    };
  }, []);

  const activeFor = (id: string) => (active === id ? "active" : "");

  return (
    <div ref={rootRef} data-theme={theme} className="wow-root relative -mx-4 -mt-6 sm:-mx-6">
      {/* intro page-transition overlay */}
      {!introGone && (
        <div className={`wow-intro ${introDone ? "done" : ""}`} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="wow-intro-panel" style={{ transitionDelay: `${i * 45}ms` }} />
          ))}
          <span className="wow-intro-count">{introCount}%</span>
        </div>
      )}

      {/* custom cursor: ring + cross + label */}
      <div ref={cursorRef} className="wow-cursor" aria-hidden="true" style={{ opacity: 0 }}>
        <span ref={cursorLabel} className="wow-cursor-clabel" />
        <div className="wow-cursor-ring">
          <span className="wow-cursor-cross" />
        </div>
      </div>

      {/* scroll progress hairline */}
      <div className="wow-progress" aria-hidden="true"><i ref={progressRef} /></div>

      {/* floating pill nav */}
      <nav aria-label="Primary" className="wow-pill hidden md:flex">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="cursor-pointer"
          data-cursor="Theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <a href="#works" className={`cursor-pointer ${active === "works" ? "active" : ""}`}>Work</a>
        <a href="#services" className={`cursor-pointer ${activeFor("services")}`}>Services+</a>
        <a href="#partners" className={`cursor-pointer ${activeFor("partners")}`}>Pricing</a>
        <a href="#about" className={`cursor-pointer ${activeFor("about")}`}>About</a>
        <a href="#footer" className="wow-talk cursor-pointer" data-cursor="Talk">Let&apos;s talk <ArrowUpRight size={15} /></a>
      </nav>

      {/* mobile bar + overlay menu */}
      <div className="fixed inset-x-4 top-[4.2rem] z-[60] flex items-center justify-between md:hidden">
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme" className="wow-card cursor-pointer p-3 transition-colors duration-200">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open menu" className="wow-card flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
          {menuOpen ? <X size={16} /> : <Menu size={16} />} {menuOpen ? "Close" : "Menu"}
        </button>
      </div>
      {menuOpen && (
        <div className="wow-card fixed inset-x-4 top-32 z-[60] flex flex-col gap-1 p-3 md:hidden">
          {[["Work", "#works"], ["Services+", "#services"], ["Pricing", "#partners"], ["About", "#about"]].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setMenuOpen(false)} className="cursor-pointer rounded-xl px-4 py-3 text-lg font-medium transition-colors duration-200 hover:bg-white/5">{l}</a>
          ))}
          <a href="#footer" onClick={() => setMenuOpen(false)} className="wow-cta mt-2 justify-center">Let&apos;s talk <ArrowUpRight size={16} /></a>
        </div>
      )}

      {/* ============ HERO ============ */}
      <header id="home" className="wow-hero px-4 pt-44 pb-20 text-center sm:px-6 md:pt-52">
        <h1 className="sr-only">From Wireframes to Wow&apos;s — elevating UX to the remarkable</h1>
        <canvas ref={heroCanvas} aria-hidden="true" />
        <div className="wow-hero-fade" />
        <div className="wow-hero-hl" />
        <div ref={heroInnerRef} className="wow-hero-inner relative flex flex-col items-center">
        <div className="wow-logo-ring relative mb-8" role="img" aria-label="KRS logo">KRS</div>
        <div className="relative" aria-hidden="true">
          <p className="wow-sans text-[11vw] leading-[0.95] font-medium tracking-tight sm:text-[7vw] lg:text-[5.2rem]"><Split text="From Wireframes" base={0.1} /></p>
          <p className="wow-serif text-[13vw] leading-[1] italic sm:text-[8vw] lg:text-[6rem]"><Split text="to Wow's" base={0.55} /></p>
          <p className="wow-sans mt-2 text-[11vw] leading-[0.95] font-medium tracking-tight sm:text-[7vw] lg:text-[5.2rem]"><Split text="elevating UX to the" base={0.9} /></p>
          <p className="wow-serif mt-1 text-[13vw] leading-[1] italic sm:text-[8vw] lg:text-[6rem]" style={{ color: "var(--wow-accent)" }}>{scramble}</p>
        </div>
        <a href="#footer" className="wow-cta relative mt-10 cursor-pointer" data-cursor="Book">
          Book a call <ArrowUpRight size={17} />
        </a>
        <div className="relative mt-10 flex w-full max-w-6xl flex-col gap-2 px-2 text-xs uppercase tracking-[0.18em] sm:flex-row sm:justify-between" style={{ color: "var(--wow-muted)" }} data-px="0.06">
          <p>Design lead shaping product systems and AI-driven experiences</p>
          <p>For founders who need it shipped, not workshopped</p>
        </div>
        <div className="wow-cue relative mt-12" aria-hidden="true">
          <span className="wow-cue-track"><span className="wow-cue-dot" /></span>
          <span>Scroll</span>
        </div>
        </div>
      </header>

      {/* ============ ABOUT (scroll scrub + glyphs + rail) ============ */}
      <section id="about" ref={aboutRef} className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
        <p className="wow-chip mb-8" data-px="-0.06">About</p>
        <p className="wow-sans max-w-5xl text-2xl leading-snug font-medium sm:text-4xl md:text-[2.9rem] md:leading-[1.25]">
          {ABOUT_WORDS.map((w, i) => {
            const lit = i / ABOUT_WORDS.length < aboutProgress;
            const glyph = GLYPH_AFTER[i];
            return (
              <span key={i}>
                <span className="wow-word" style={{ opacity: lit ? 1 : 0.14 }}>
                  {["products", "solutions,", "processes,"].includes(w) ? (
                    <u style={{ textDecorationColor: "var(--wow-accent)" }}>{w}</u>
                  ) : w}{" "}
                </span>
                {glyph && (
                  <span className={`wow-glyph ${lit ? "lit" : ""}`} data-anim={glyph} aria-hidden="true">
                    <Glyph kind={glyph} />
                  </span>
                )}
              </span>
            );
          })}
        </p>
        <div aria-hidden="true" className="pointer-events-none absolute top-24 right-2 hidden h-[70%] md:block lg:right-0">
          <div className="wow-rail h-full">
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                className="wow-tick"
                style={{ top: `${(i / 25) * 100}%`, width: i % 8 === 0 ? 18 : 7, background: i / 26 < aboutProgress ? "var(--wow-accent)" : undefined }}
              />
            ))}
            <span className="wow-railcap" style={{ top: 0, transform: `translateY(${aboutProgress * 420}px)` }} />
          </div>
        </div>
      </section>

      {/* ============ PLAY REAL (scroll-scaled stage) ============ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Showreel">
        <div ref={stageRef} className="wow-stage wow-card overflow-hidden" style={{ transform: `scale(${stageScale})` }} data-cursor={playing ? "Pause" : "Play"}>
          <div className="flex items-center justify-between gap-4 overflow-hidden border-b px-5 py-4" style={{ borderColor: "var(--wow-line)" }}>
            <div className="wow-marquee-track wow-sans gap-8 text-xl font-semibold whitespace-nowrap" aria-hidden="true">
              {[0, 1].map((k) => (
                <span key={k} className="flex gap-8 pr-8">
                  <span>Play Real</span><span className="wow-serif italic" style={{ color: "var(--wow-accent)" }}>Play Real</span>
                  <span>Play Real</span><span className="wow-serif italic" style={{ color: "var(--wow-accent)" }}>Play Real</span>
                </span>
              ))}
            </div>
            <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause showreel" : "Play showreel"} className="wow-cta shrink-0 cursor-pointer !p-4">
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
          <div className="relative flex h-64 items-center justify-center sm:h-96" style={{ background: "radial-gradient(600px 300px at 30% 20%, rgba(111,107,255,0.45), transparent), radial-gradient(700px 340px at 75% 70%, rgba(55,224,168,0.35), transparent), #0b0b10" }}>
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
            <p className={`wow-sans relative text-5xl font-bold tracking-tight text-white transition-all duration-300 sm:text-7xl ${playing ? "scale-110 blur-[1px]" : ""}`}>REEL <span className="wow-serif font-normal italic" style={{ color: "var(--wow-accent)" }}>’26</span></p>
            {playing && <span className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> PLAYING</span>}
          </div>
        </div>
      </section>

      {/* ============ METRICS (slide-up + count-up) ============ */}
      <section ref={metricsRef} className="wow-reveal mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-16 sm:px-6 lg:grid-cols-4">
        {[
          [m12, "", "Years", "Crafting digital products globally"],
          [m87, "", "Projects", "Across 6 continents in 6 core domains"],
          [m3, "+", "Years", "Average period of work cooperation"],
          [m6, "k", "Hours", "In UX research and prototyping UI solutions"],
        ].map(([v, suf, label, desc], i) => (
          <div key={i} className="wow-card num overflow-hidden p-6 transition-colors duration-200 hover:border-[var(--wow-accent)]">
            <span className="wow-maskline">
              <span className="wow-maskinner wow-sans text-5xl font-bold tracking-tight" style={{ transitionDelay: `${i * 0.12}s` }}>
                {v}{suf as string} <span className="align-top text-sm font-medium" style={{ color: "var(--wow-accent)" }}>{label as string}</span>
              </span>
            </span>
            <p className="mt-3 text-sm" style={{ color: "var(--wow-muted)" }}>{desc as string}</p>
          </div>
        ))}
      </section>

      {/* ============ SERVICES ============ */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="wow-reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between" data-px="0.03">
          <div>
            <p className="wow-serif text-4xl italic sm:text-5xl">Services<em className="not-italic" style={{ color: "var(--wow-accent)" }}>+</em> <span className="wow-sans text-2xl font-medium not-italic sm:text-3xl">for better digital products</span></p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--wow-muted)" }}>Six disciplines, one person on the hook for the outcome. From rough idea to something people actually use — without agency overhead.</p>
          </div>
          <a href="#works" className="wow-cta w-fit cursor-pointer">View services <ArrowUpRight size={16} /></a>
        </div>
        <div className="wow-services mt-10">
          {SERVICES.map((s, si) => (
            <a key={s.title} href="#footer" className="wow-row wow-reveal group flex cursor-pointer items-center gap-4 px-2 py-6 sm:gap-8 sm:px-4" style={{ transitionDelay: `${si * 60}ms` }} data-cursor="Open">
              <span className="wow-card hidden p-3 sm:block"><s.icon size={22} /></span>
              <span className="wow-sans flex-1 text-2xl font-semibold tracking-tight transition-transform duration-200 group-hover:translate-x-1 sm:text-4xl">
                <span className="wow-roll"><span className="wow-roll-inner"><span>{s.title}</span><span style={{ color: "var(--wow-accent)" }}>{s.title}</span></span></span>
              </span>
              <span className="hidden text-right text-[0.7rem] leading-tight tracking-[0.16em] uppercase sm:block" style={{ color: "var(--wow-faint)" }}>{s.a}<br />{s.b}</span>
              <ArrowUpRight size={22} className="transition-all duration-200 group-hover:rotate-45" style={{ color: "var(--wow-accent)" }} />
            </a>
          ))}
        </div>
        <div className="wow-reveal mt-14">
          <p className="wow-sans text-2xl font-semibold">Who I build for</p>
          <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--wow-muted)" }}>From corporate giants to pre-seed founders, I&apos;ve built for both, and I&apos;ll get you there too.</p>
          <p className="mt-1 text-xs tracking-[0.18em] uppercase" style={{ color: "var(--wow-faint)" }}>A decade of shipping innovative, tailored work.</p>
        </div>
      </section>

      {/* ============ WORKS ============ */}
      <section id="works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="wow-chip mb-10" data-px="-0.06">Selected works</p>
        <div className="flex flex-col gap-16">
          {WORKS.map((w, idx) => (
            <article key={w.title} className="wow-reveal">
              {idx > 0 && <div className="wow-div mb-14" aria-hidden="true" />}
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[0.7rem] tracking-[0.18em] uppercase" style={{ color: "var(--wow-accent)" }}>{w.tag}</p>
                  <h3 className="wow-sans text-3xl font-bold tracking-tight sm:text-4xl">{w.title}</h3>
                </div>
                {w.soon ? (
                  <span className="wow-chip">Coming soon</span>
                ) : (
                  <a href="#footer" className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors duration-200 hover:text-[var(--wow-accent)]" data-cursor="View case">View project <ArrowUpRight size={16} /></a>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="wow-media wow-zoom flex h-64 items-end p-5 sm:h-80 md:col-span-2" style={{ background: w.bg1 }} data-cursor="View case" data-px={idx % 2 ? "0.04" : "-0.04"} tabIndex={0} role="link" aria-label={`${w.title} case study`}>
                  <p className="wow-sans max-w-xs text-xl leading-tight font-semibold text-white">{w.title} — dashboard · design system · {w.tag}</p>
                </div>
                <div className="wow-media wow-zoom hidden h-64 sm:h-80 md:block" style={{ background: w.bg2 }} data-cursor="View case" data-px="0.06" />
                <div className="wow-media h-40" style={{ background: w.bg2, filter: "brightness(0.85)" }} data-cursor="View case" data-px="0.03" />
                <div className="wow-media h-40" style={{ background: w.bg1, filter: "brightness(1.15)" }} data-cursor="View case" data-px="-0.03" />
                <div className="wow-media hidden h-40 sm:block" style={{ background: "linear-gradient(135deg,#18181b,#3f3f46)" }} data-cursor="View case" />
              </div>
            </article>
          ))}
        </div>

        {/* CTA: masked lines + eye + portrait knob */}
        <div className="wow-reveal mx-auto max-w-3xl py-24 text-center">
          <span className="wow-maskline"><span className="wow-maskinner wow-sans text-2xl font-medium">Want to see <Eye className="inline" size={26} style={{ color: "var(--wow-accent)" }} /></span></span>
          <span className="wow-maskline"><span className="wow-maskinner mt-2 text-4xl sm:text-6xl" style={{ transitionDelay: "0.12s" }}>
            <span className="wow-serif italic">how I</span>{" "}
            <button type="button" onClick={() => setKnobOn(!knobOn)} aria-pressed={knobOn} aria-label="Toggle portrait" className="wow-knob cursor-pointer" data-cursor="Hi!">
              <span className="wow-knob-face" style={{ filter: knobOn ? "none" : "grayscale(1)" }}>K</span>
              <span className="wow-sans text-sm font-semibold">{knobOn ? "Krasi" : "Hello"}</span>
            </button>{" "}
            <span className="wow-serif italic">enable</span>
          </span></span>
          <span className="wow-maskline"><span className="wow-maskinner wow-sans mt-2 text-4xl font-bold tracking-tight sm:text-6xl" style={{ transitionDelay: "0.24s" }}>companies?</span></span>
          <p className="mx-auto mt-5 max-w-md text-sm" style={{ color: "var(--wow-muted)" }}>A few projects I&apos;m proud of, built with industry-leading corporations and independent partners alike.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="#footer" className="wow-cta cursor-pointer">View all works</a>
            <a href="#footer" aria-label="View all works" className="wow-cta cursor-pointer !px-4"><ArrowUpRight size={18} /></a>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS (pinned deck) ============ */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6" aria-label="Testimonials">
        <p className="wow-serif text-4xl sm:text-5xl">What <em style={{ color: "var(--wow-accent)" }}>people</em> have to say</p>
        <p className="mt-3 max-w-lg text-sm" style={{ color: "var(--wow-muted)" }}>Curious what it&apos;s really like to work with me? Don&apos;t take my word for it. Here&apos;s what clients say.</p>
        <div className="mt-10 flex flex-col gap-4 pb-16">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.n} className="wow-tcard wow-card p-7 shadow-2xl sm:p-9" style={{ zIndex: i + 1, transform: `scale(${1 - (TESTIMONIALS.length - 1 - i) * 0.02})`, marginBottom: i === TESTIMONIALS.length - 1 ? 0 : "-2rem" }}>
              <blockquote className="wow-sans text-lg leading-relaxed font-medium sm:text-2xl">&ldquo;{t.q}&rdquo;</blockquote>
              <figcaption className="mt-5 text-sm" style={{ color: "var(--wow-muted)" }}><strong style={{ color: "var(--wow-text)" }}>{t.n}</strong> — {t.r}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ============ QUOTE (horizontal drift + glyphs) ============ */}
      <section ref={quoteRef} className="relative overflow-hidden border-y py-24 text-center" style={{ borderColor: "var(--wow-line)" }} aria-label="Manifesto">
        <p className="wow-sans text-3xl font-medium tracking-tight sm:text-5xl" style={{ transform: `translateX(${quoteShift * 120}px)` }}>Design to scale</p>
        <p className="wow-serif mt-2 text-4xl italic sm:text-6xl" style={{ transform: `translateX(${quoteShift * -140}px)`, color: "var(--wow-accent)" }}>&amp; drive experiences</p>
        <p className="wow-sans mt-2 text-3xl font-medium tracking-tight sm:text-5xl" style={{ transform: `translateX(${quoteShift * 100}px)` }}>with data</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-hidden="true">
          <span className="wow-qchip"><Star size={20} /></span>
          <span className="wow-qchip"><Command size={20} /></span>
          <span className="wow-qchip"><Hexagon size={20} /></span>
          <span className="wow-qchip"><Triangle size={20} /></span>
          <span className="wow-qchip"><Circle size={20} /></span>
          <span className="wow-qchip"><Zap size={20} /></span>
          <span className="wow-qchip"><Hourglass size={20} /></span>
        </div>
      </section>

      {/* ============ PARTNERS ============ */}
      <section id="partners" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="wow-serif text-4xl sm:text-5xl" data-px="-0.05">Valuable<br /><em style={{ color: "var(--wow-accent)" }}>Partners</em></p>
        <p className="mt-3 text-sm" style={{ color: "var(--wow-muted)" }}>Trusted by teams from pre-seed start-ups to the Fortune 500.</p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-3 lg:grid-cols-4" style={{ borderColor: "var(--wow-line)", background: "var(--wow-line)" }}>
          {PARTNERS.map((p) => (
            <div key={p} className="flex h-24 cursor-pointer items-center justify-center px-4 text-center transition-colors duration-200 hover:bg-[rgba(128,128,128,0.12)]" style={{ background: "var(--wow-bg)" }} data-cursor={p}>
              <span className="wow-sans text-sm font-semibold tracking-wide" style={{ color: "var(--wow-muted)" }}>{p}</span>
            </div>
          ))}
          <a href="#footer" className="flex h-24 cursor-pointer items-center justify-center gap-2 px-4 text-center transition-colors duration-200 hover:bg-[rgba(128,128,128,0.12)]" style={{ background: "var(--wow-panel2)", color: "var(--wow-accent)" }} data-cursor="Join">
            <span className="wow-sans text-sm font-semibold">Your company</span><Star size={16} />
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer id="footer" className="border-t px-4 pt-20 pb-10 sm:px-6" style={{ borderColor: "var(--wow-line)" }}>
        <div className="mx-auto max-w-6xl">
          <span className="wow-maskline"><span className="wow-maskinner wow-foot-h wow-sans" data-px="-0.04">Get in touch</span></span>
          <p className="mt-4 max-w-xl text-sm sm:text-base" style={{ color: "var(--wow-muted)" }}>
            I build products that move people, and move the business.{" "}
            <a href="mailto:hello@krs.design" className="cursor-pointer underline decoration-[var(--wow-accent)] underline-offset-4 transition-colors duration-200 hover:text-[var(--wow-accent)]">Prefer to write? Send a note.</a>
          </p>
          <a href="mailto:hello@krs.design" className="wow-footer-contact wow-sans mt-8 inline-flex cursor-pointer items-center gap-3" data-cursor="Say hi" data-px="0.05">
            Contact <ArrowUpRight size={64} style={{ color: "var(--wow-accent)" }} />
          </a>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              [Linkedin, "LinkedIn"],
              [Twitter, "X"],
              [Palette, "Behance"],
              [Dribbble, "Dribbble"],
              [Award, "Awwwards"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Linkedin;
              return (
                <a key={label as string} href="#footer" className="wow-social cursor-pointer" aria-label={label as string}>
                  <I size={18} style={{ color: "var(--wow-accent)" }} /> <span className="text-sm font-medium">{label as string}</span>
                </a>
              );
            })}
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center" style={{ borderColor: "var(--wow-line)", color: "var(--wow-faint)" }}>
            <p>© 2026 KRS — All rights reserved · From Wireframes to Wow&apos;s</p>
            <div className="flex gap-5">
              <a href="#home" className="cursor-pointer transition-colors duration-200 hover:text-[var(--wow-text)]">Privacy policy</a>
              <a href="#home" className="cursor-pointer transition-colors duration-200 hover:text-[var(--wow-text)]">Terms &amp; Conditions</a>
            </div>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: isReduced() ? "auto" : "smooth" })} aria-label="Back to top" className="wow-card flex cursor-pointer items-center gap-2 p-3 transition-colors duration-200 hover:border-[var(--wow-accent)]">
              <span className="wow-sans text-xs font-bold">KRS</span><ArrowUp size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
