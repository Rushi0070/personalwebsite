import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

// "Dark notebook": the portfolio keeps its own identity (dark ground, cyan
// accent, live status) and borrows the blog's reading ideas: one long page,
// a section index that follows you, and notes in the margin.

const BLOG_URL = 'https://sololeveling-phi.vercel.app/';

const LINKS = {
  email: 'mailto:jhalarushi@gmail.com',
  linkedin: 'https://linkedin.com/in/rushi-jhala-855076224',
  github: 'https://github.com/Rushi0070',
  x: 'https://x.com/JhalaRushi',
  resume: '/resume.pdf',
};

// --- Content ------------------------------------------------------------------

interface Metric {
  value: string;
  label: string;
}

interface Entry {
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  url?: string;
  urlLabel?: string;
  tags: string[];
  metrics?: Metric[];
  body: ReactNode;
  note?: ReactNode;
  figure?: { src: string; alt: string; caption: string };
}

const EXPERIENCE: Entry[] = [
  {
    id: 'aivid-tech-vision',
    title: 'Aivid Tech Vision',
    subtitle: 'Computer Vision Intern',
    date: 'Feb 2025 – July 2025',
    url: 'https://aivid.ai/about-us/',
    urlLabel: 'aivid.ai',
    tags: ['Edge AI', 'PyTorch', 'Docker', 'OpenCV', 'Real-time Systems'],
    metrics: [
      { value: '95%+', label: 'model accuracy' },
      { value: '−70%', label: 'manual review time' },
      { value: '<5s', label: 'alert latency' },
      { value: '−40%', label: 'network bandwidth' },
    ],
    body: (
      <ul>
        <li>Engineered and deployed deep learning models for people-counting, demographic classification, and product defect detection; achieved 95%+ accuracy.</li>
        <li>Automated SOP-compliance workflows by integrating IP camera feeds with AIVID BOTS, reducing client manual review time by 70%.</li>
        <li>Architected real-time alerting systems (fire, intrusion, theft) with sub-5s end-to-end latency.</li>
        <li>Optimized edge inference via model quantization and distributed pipelines, reducing network bandwidth consumption by 40%.</li>
      </ul>
    ),
  },
];

const PROJECTS: Entry[] = [
  {
    id: 'sec-alpha-gen',
    title: 'SEC Alpha Gen',
    subtitle: 'Alphathon 2025',
    url: 'https://github.com/Rushi0070/sec-investment-signals',
    urlLabel: 'github',
    tags: ['NLP', 'FinBERT', 'CatBoost', 'SHAP', 'Quantitative Finance'],
    metrics: [
      { value: '76.92%', label: 'accuracy' },
      { value: '1.90', label: 'Sharpe ratio' },
    ],
    body: (
      <p>
        Quantitative NLP pipeline processing SEC 10-K/10-Q filings. Utilized FinBERT and RoBERTa to detect narrative shifts and generate tradable signals. Trained CatBoost with SHAP explainability achieving 76.92% accuracy and 1.90 Sharpe ratio.
      </p>
    ),
  },
  {
    id: 'uber-demand-forecast',
    title: 'Uber Demand Forecast',
    subtitle: 'MLOps Pipeline',
    tags: ['MLOps', 'XGBoost', 'DVC', 'Docker', 'CI/CD'],
    body: (
      <p>
        Production-grade time-series forecasting pipeline for NYC cab demand using XGBoost. Engineered temporal and geospatial features with sliding-window cross-validation. Containerized with Docker, versioned with DVC, and CI/CD with GitHub Actions.
      </p>
    ),
  },
];

const BUILDS: Entry[] = [
  {
    id: 'vitalsync',
    title: 'VitalSync',
    subtitle: 'Columbia University Hackathon // Qualcomm',
    url: 'https://github.com/Rushi0070/VitalSync',
    urlLabel: 'github',
    tags: ['Edge AI', 'Snapdragon NPU', 'Qwen 6B VLM', 'YOLOv8', 'ONNX', 'React Native', 'On-Device ML'],
    metrics: [
      { value: 'NPU', label: 'Qwen 6B VLM via ONNX' },
      { value: 'GPU', label: 'YOLOv8 activity tracking' },
    ],
    note: (
      <>
        <span className="note-key">sponsors</span>
        Qualcomm, Columbia University
        <span className="note-key">team</span>
        Ishan Vaghani, Ying Lo, Charisse Lai
      </>
    ),
    figure: {
      src: '/images/vitalsync.png',
      alt: 'The VitalSync team working at the Columbia University Hackathon',
      caption: 'VitalSync, built at the Columbia University Hackathon, sponsored by Qualcomm',
    },
    body: (
      <>
        <p>
          Just wrapped up an incredible week at the Columbia University Hackathon, sponsored by Qualcomm, where our team architected VitalSync: a multi-device ecosystem that redefines productivity through on-device edge intelligence. Designed to bridge the gap between deep-work "flow states" and physical well-being, VitalSync leverages the Snapdragon platform to run a dual-model pipeline: a Qwen 6B VLM on the NPU (via ONNX) for deep screen-context analysis and a YOLOv8 model on the integrated GPU for real-time physical activity tracking.
        </p>
        <p>
          The core of VitalSync is accountability; when the system detects procrastination or a vital need for hydration and movement, it triggers a persistent "task-locked" popup that only closes once the vision models verify the task has been completed. This entire experience is managed via a React Native Android remote featuring seamless state persistence and haptic feedback, allowing users to initiate background PC sessions directly from their phones.
        </p>
        <p>
          By optimizing model memory loading to preserve primary compute for daily tasks, we have created a performance "Vital Score" summary system that scales from personal wellness to enterprise-level employee productivity, proving that the future of private, responsive AI belongs on the edge.
        </p>
      </>
    ),
  },
];

const STACK: { title: string; items: string[] }[] = [
  { title: 'Languages', items: ['Python', 'C++', 'Java', 'SQL', 'TypeScript'] },
  { title: 'ML & AI', items: ['PyTorch', 'TensorFlow', 'HuggingFace', 'XGBoost', 'OpenCV'] },
  { title: 'Infrastructure', items: ['Docker', 'AWS SageMaker', 'Git', 'DVC', 'Linux'] },
  { title: 'Tools', items: ['Pandas', 'NumPy', 'Streamlit', 'Plotly', 'pytest'] },
];

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'experience', label: 'experience' },
  { id: 'projects', label: 'projects' },
  { id: 'builds', label: 'recent builds' },
  { id: 'stack', label: 'stack' },
  { id: 'about', label: 'about' },
  { id: 'contact', label: 'contact' },
];

// --- Hooks --------------------------------------------------------------------

// The last section whose top has crossed a line near the top of the viewport.
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const ticking = useRef(false);
  useEffect(() => {
    const READ_LINE = 140;
    const update = () => {
      ticking.current = false;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= READ_LINE) current = id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);
  return [active, setActive] as const;
}

// Adds .is-visible to .reveal elements as they scroll into view.
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// --- Small pieces -------------------------------------------------------------

function External({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function LiveClock() {
  const fmt = () =>
    new Date()
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
      .toLowerCase();
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const t = setInterval(() => setTime(fmt()), 30_000);
    return () => clearInterval(t);
  }, []);
  return <time>{time}</time>;
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return (
    <div className="progress" aria-hidden="true">
      <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

function SectionHead({ index, id, title }: { index: number; id: string; title: string }) {
  return (
    <header className="section-head reveal">
      <span className="section-num mono">{String(index).padStart(2, '0')} /</span>
      <h2 id={`${id}-title`}>{title}</h2>
    </header>
  );
}

function EntryCard({ e }: { e: Entry }) {
  const hasNote = Boolean(e.date || e.url || e.note);
  return (
    <article id={e.id} className="entry reveal">
      <div className="entry-main">
        <h3>{e.title}</h3>
        <p className="entry-sub mono">{e.subtitle}</p>
        {e.metrics && (
          <div className="metrics">
            {e.metrics.map((m) => (
              <div key={m.label} className="metric">
                <span className="metric-value mono">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        )}
        {e.figure && (
          <figure>
            <img src={e.figure.src} alt={e.figure.alt} loading="lazy" />
            <figcaption>{e.figure.caption}</figcaption>
          </figure>
        )}
        <div className="entry-body">{e.body}</div>
        <ul className="chips" aria-label="Technologies">
          {e.tags.map((t) => (
            <li key={t} className="chip mono">{t}</li>
          ))}
        </ul>
      </div>
      {hasNote && (
        <aside className="entry-note">
          {e.date && <span className="note-date mono">{e.date}</span>}
          {e.url && (
            <External href={e.url} className="note-link mono">
              {e.urlLabel ?? e.url} ↗
            </External>
          )}
          {e.note && <span className="note-extra">{e.note}</span>}
        </aside>
      )}
    </article>
  );
}

// --- Page ---------------------------------------------------------------------

const SECTION_IDS = SECTIONS.map((s) => s.id);

export default function App() {
  const [active, setActive] = useActiveSection(SECTION_IDS);
  useReveal();

  const go = (ev: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    ev.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  return (
    <div className="site">
      <a href="#main" className="skip-link">Skip to content</a>
      <ReadingProgress />

      <header className="topbar">
        <div className="topbar-inner">
          <a href="#top" className="brand" onClick={(ev) => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="brand-name">rushi jhala</span>
            <span className="brand-sub mono">ms data science · stony brook</span>
          </a>
          <nav className="topnav mono" aria-label="Primary">
            <a href="#experience" onClick={(ev) => go(ev, 'experience')}>work</a>
            <a href="#builds" onClick={(ev) => go(ev, 'builds')}>builds</a>
            <External href={BLOG_URL}>blog ↗</External>
            <a href={LINKS.resume} download="Rushi_Jhala_Resume.pdf">resume ↓</a>
          </nav>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="status mono">
          <span className="status-dot" aria-hidden="true" />
          open to work
          <span className="status-sep">·</span>
          <span className="status-loc">long island, ny · <LiveClock /> et</span>
        </div>
        <h1 className="hero-title">
          Bridging <span className="dim">Theory</span>
          <br />
          &amp; Production.
        </h1>
        <p className="hero-lede">
          I am a Data Science Graduate Student specializing in Computer Vision and NLP. My work focuses on building robust, scalable intelligent systems for high-stakes environments like FinTech and Industrial IoT.
        </p>
        <dl className="facts mono">
          <div><dt>now</dt><dd>MS Data Science, Stony Brook University</dd></div>
          <div><dt>prev</dt><dd>Computer Vision Intern, Aivid Tech Vision</dd></div>
          <div><dt>writing</dt><dd><External href={BLOG_URL}>sololeveling</External>, notes on machine learning</dd></div>
        </dl>
        <div className="hero-actions">
          <a className="btn btn-primary" href={LINKS.resume} download="Rushi_Jhala_Resume.pdf">download resume</a>
          <a className="btn" href={LINKS.email}>email me</a>
          <External className="btn" href={LINKS.github}>github ↗</External>
        </div>
      </section>

      <div className="layout">
        <nav className="index mono" aria-label="Sections">
          <div className="index-label">index</div>
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.id} className={active === s.id ? 'is-active' : ''}>
                <a href={`#${s.id}`} onClick={(ev) => go(ev, s.id)}>
                  <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="main" className="content">
          <section id="experience" aria-labelledby="experience-title">
            <SectionHead index={1} id="experience" title="experience" />
            {EXPERIENCE.map((e) => <EntryCard key={e.id} e={e} />)}
          </section>

          <section id="projects" aria-labelledby="projects-title">
            <SectionHead index={2} id="projects" title="projects" />
            {PROJECTS.map((e) => <EntryCard key={e.id} e={e} />)}
          </section>

          <section id="builds" aria-labelledby="builds-title">
            <SectionHead index={3} id="builds" title="recent builds" />
            {BUILDS.map((e) => <EntryCard key={e.id} e={e} />)}
          </section>

          <section id="stack" aria-labelledby="stack-title">
            <SectionHead index={4} id="stack" title="stack" />
            <div className="stack reveal">
              {STACK.map((c) => (
                <div key={c.title} className="stack-col">
                  <h3 className="stack-title mono">{c.title}</h3>
                  <ul>
                    {c.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="about" aria-labelledby="about-title">
            <SectionHead index={5} id="about" title="about" />
            <div className="about reveal">
              <div className="about-card">
                <h3 className="about-label mono">education</h3>
                <p><strong>Stony Brook University</strong><br />MS Data Science</p>
                <p><strong>PDEU, India</strong><br />B.Tech ICT (8.47 GPA)</p>
              </div>
              <div className="about-card">
                <h3 className="about-label mono">leadership impact</h3>
                <p>
                  As Core Committee Member (ML) at ACM Student Chapter PDEU, I organized a two-day DSA workshop covering C++, linear structures, and graph algorithms for 100+ students, and facilitated peer learning sessions for algorithmic problem-solving.
                </p>
              </div>
            </div>
          </section>

          <section id="contact" aria-labelledby="contact-title">
            <SectionHead index={6} id="contact" title="contact" />
            <ul className="contact reveal">
              <li><span className="contact-key mono">email</span><a href={LINKS.email}>jhalarushi@gmail.com</a></li>
              <li><span className="contact-key mono">linkedin</span><External href={LINKS.linkedin}>rushi-jhala ↗</External></li>
              <li><span className="contact-key mono">github</span><External href={LINKS.github}>Rushi0070 ↗</External></li>
              <li><span className="contact-key mono">x</span><External href={LINKS.x}>@JhalaRushi ↗</External></li>
              <li><span className="contact-key mono">resume</span><a href={LINKS.resume} download="Rushi_Jhala_Resume.pdf">Rushi_Jhala_Resume.pdf ↓</a></li>
            </ul>
          </section>
        </main>
      </div>

      <footer className="footer mono">
        <span>© {new Date().getFullYear()} rushi jhala</span>
        <span>
          <External href={BLOG_URL}>blog</External> · <External href={LINKS.linkedin}>linkedin</External> ·{' '}
          <External href={LINKS.github}>github</External>
        </span>
      </footer>
    </div>
  );
}
