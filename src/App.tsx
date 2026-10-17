import { Fragment, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

// The portfolio is laid out like a post on the blog (sololeveling): one long
// page in an 850px column, a sticky "on this page" index in the left gutter,
// margin notes in the right gutter, and a reading-progress bar along the top.

const BLOG_URL = 'https://sololeveling-phi.vercel.app/';

const LINKS = {
  email: 'mailto:jhalarushi@gmail.com',
  linkedin: 'https://linkedin.com/in/rushi-jhala-855076224',
  github: 'https://github.com/Rushi0070',
  x: 'https://x.com/JhalaRushi',
  resume: '/resume.pdf',
};

// --- Content ------------------------------------------------------------------

interface Entry {
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  url?: string;
  urlLabel?: string;
  tags: string[];
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
    note: (
      <>
        sponsors: Qualcomm, Columbia University.
        <br />
        built with Ishan Vaghani, Ying Lo, Charisse Lai.
      </>
    ),
    figure: {
      src: '/images/vitalsync.png',
      alt: 'VitalSync',
      caption: 'VitalSync, built at the Columbia University Hackathon sponsored by Qualcomm',
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

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

const HEADINGS: Heading[] = [
  { id: 'experience', text: 'experience', level: 2 },
  ...EXPERIENCE.map((e) => ({ id: e.id, text: e.title, level: 3 as const })),
  { id: 'projects', text: 'projects', level: 2 },
  ...PROJECTS.map((e) => ({ id: e.id, text: e.title, level: 3 as const })),
  { id: 'recent-builds', text: 'recent builds', level: 2 },
  ...BUILDS.map((e) => ({ id: e.id, text: e.title, level: 3 as const })),
  { id: 'stack', text: 'stack', level: 2 },
  { id: 'education', text: 'education', level: 2 },
  { id: 'leadership', text: 'leadership', level: 2 },
  { id: 'contact', text: 'contact', level: 2 },
];

// --- Small pieces -------------------------------------------------------------

const tag = (t: string) => `#${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function H({ id, level, children }: { id: string; level: 2 | 3; children: ReactNode }) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag id={id}>
      {children}
      <a className="anchor" href={`#${id}`} aria-label="Link to this section">#</a>
    </Tag>
  );
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function EntryBlock({ e }: { e: Entry }) {
  const hasNote = e.date || e.url || e.note;
  return (
    <>
      <H id={e.id} level={3}>
        {e.title}
      </H>
      {hasNote && (
        <aside className="marginnote">
          {e.date && <>{e.date}<br /></>}
          {e.url && <External href={e.url}>{e.urlLabel ?? e.url} ↗</External>}
          {e.url && e.note && <br />}
          {e.note}
        </aside>
      )}
      <p className="entry-meta">
        {e.subtitle}
        {e.tags.length > 0 && <span> · {e.tags.map(tag).join('  ')}</span>}
      </p>
      {e.figure && (
        <figure>
          <img src={e.figure.src} alt={e.figure.alt} loading="lazy" />
          <figcaption>{e.figure.caption}</figcaption>
        </figure>
      )}
      {e.body}
    </>
  );
}

// --- Chrome -------------------------------------------------------------------

function Nav() {
  return (
    <nav className="site-nav mono">
      <a href="/" className="site-name">~/rushijhala</a>
      <div className="site-links">
        <External href={BLOG_URL}>[blog]</External>
        <a href={LINKS.resume} download="Rushi_Jhala_Resume.pdf">[resume]</a>
        <a href="#contact">[contact]</a>
      </div>
    </nav>
  );
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
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

// Highlights the section you are reading: the last heading whose top has
// scrolled above a line near the top of the viewport (same rule as the blog).
function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? '');
  const ticking = useRef(false);

  useEffect(() => {
    const READ_LINE = 120;
    const update = () => {
      ticking.current = false;
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= READ_LINE) current = h.id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = headings[headings.length - 1].id;
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
  }, [headings]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  return (
    <nav className="toc-fixed" aria-label="Table of contents">
      <div className="toc-label">on this page</div>
      <ul className="toc-list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={`toc-item ${active === h.id ? 'is-active' : ''}`}
            style={{ paddingLeft: 12 + (h.level - 2) * 12 }}
          >
            <a href={`#${h.id}`} onClick={(e) => go(e, h.id)}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LiveClock() {
  const fmt = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const t = setInterval(() => setTime(fmt()), 30_000);
    return () => clearInterval(t);
  }, []);
  return <>{time.toLowerCase()} et</>;
}

// --- Page ---------------------------------------------------------------------

export default function App() {
  return (
    <div className="site">
      <ReadingProgress />
      <Nav />

      <main>
        <article className="post">
          <Toc headings={HEADINGS} />

          <header>
            <h1 className="post-title">rushi jhala</h1>
            <p className="post-summary">
              Data Science graduate student at Stony Brook University, specializing in Computer Vision and NLP.
            </p>
            <div className="post-meta">
              <span>Long Island, NY · <LiveClock /></span>
              <span> · Seeking Summer 2026 Internship</span>
              <span> · #cv #nlp #edge-ai #mlops</span>
            </div>
          </header>

          <div className="prose">
            <p>
              I am a Data Science Graduate Student specializing in Computer Vision and NLP. My work focuses on building robust, scalable intelligent systems for high-stakes environments like FinTech and Industrial IoT.
            </p>
            <p>
              I also write about machine learning on my blog, <External href={BLOG_URL}>sololeveling</External>.
            </p>

            <div className="callout">
              <span className="callout-mark">›</span>
              <p>
                tl;dr: computer vision intern at Aivid Tech Vision (95%+ accuracy models, sub-5s alerting on the edge), quantitative NLP on SEC filings for Alphathon 2025, and VitalSync, an on-device AI build for the Qualcomm-sponsored Columbia University Hackathon.
              </p>
            </div>

            <H id="experience" level={2}>experience</H>
            {EXPERIENCE.map((e) => (
              <EntryBlock key={e.id} e={e} />
            ))}

            <H id="projects" level={2}>projects</H>
            {PROJECTS.map((e) => (
              <EntryBlock key={e.id} e={e} />
            ))}

            <H id="recent-builds" level={2}>recent builds</H>
            {BUILDS.map((e) => (
              <EntryBlock key={e.id} e={e} />
            ))}

            <H id="stack" level={2}>stack</H>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>area</th>
                    <th>tools</th>
                  </tr>
                </thead>
                <tbody>
                  {STACK.map((c) => (
                    <tr key={c.title}>
                      <td><strong>{c.title}</strong></td>
                      <td>
                        {c.items.map((item, i) => (
                          <Fragment key={item}>
                            {i > 0 && ', '}
                            <code>{item}</code>
                          </Fragment>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H id="education" level={2}>education</H>
            <ul>
              <li><strong>Stony Brook University</strong>, MS Data Science</li>
              <li><strong>PDEU, India</strong>, B.Tech ICT (8.47 GPA)</li>
            </ul>

            <H id="leadership" level={2}>leadership</H>
            <p>
              As Core Committee Member (ML) at ACM Student Chapter PDEU, I organized a two-day DSA workshop covering C++, linear structures, and graph algorithms for 100+ students, and facilitated peer learning sessions for algorithmic problem-solving.
            </p>

            <H id="contact" level={2}>contact</H>
            <p>You can reach me here:</p>
            <ul>
              <li>email: <a href={LINKS.email}>jhalarushi@gmail.com</a></li>
              <li>linkedin: <External href={LINKS.linkedin}>rushi-jhala</External></li>
              <li>github: <External href={LINKS.github}>Rushi0070</External></li>
              <li>x: <External href={LINKS.x}>@JhalaRushi</External></li>
              <li>resume: <a href={LINKS.resume} download="Rushi_Jhala_Resume.pdf">Rushi_Jhala_Resume.pdf</a></li>
            </ul>
          </div>

          <div className="rule" aria-hidden="true" />
        </article>
      </main>

      <footer className="site-footer mono">
        <span>© {new Date().getFullYear()} · rushi jhala</span>
        <span>
          <External href={BLOG_URL}>blog</External> · <a href={LINKS.email}>email</a> ·{' '}
          <External href={LINKS.github}>github</External>
        </span>
      </footer>
    </div>
  );
}
