// Everything on the page comes from here. Facts are taken from cv.md
// (career-ops), the canonical CV; nothing below is invented. Dates are only
// given where the CV states them.

export const PERSON = {
  name: 'Rushi Jhala',
  handle: 'rushi-jhala',
  role: 'MS Data Science, Stony Brook University',
  focus: ['computer vision', 'nlp', 'edge ai'],
  location: 'Long Island, NY',
  email: 'jhalarushi@gmail.com',
};

// One paragraph for the top of the page, made only of facts from the CV.
export const INTRO =
  'I’m a data science grad student at Stony Brook University. I build computer vision, NLP and edge AI systems: most recently real-time video analytics and alerting at Aivid Tech Vision, and a local-first focus tracker on a Snapdragon NPU for the Qualcomm Hackathon.';

// What I'm looking for (stated by Rushi, 2026-10-17).
export const LOOKING_FOR = 'Looking for full-time or internship roles from May 2027.';

export const LINKS = {
  github: 'https://github.com/Rushi0070',
  githubUser: 'Rushi0070',
  linkedin: 'https://linkedin.com/in/rushi-jhala-855076224',
  x: 'https://x.com/JhalaRushi',
  blog: 'https://sololeveling-phi.vercel.app/',
  resume: '/resume.pdf',
  email: 'mailto:jhalarushi@gmail.com',
};

// "Epoch 0" of the run: the first day of the B.Tech (CV: Oct 2021).
export const EPOCH0 = new Date(2021, 9, 1);
// The run's scheduled end: the expected MS graduation (CV: May 2027).
export const RUN_END = new Date(2027, 4, 31);

export type Kind = 'experience' | 'project' | 'education' | 'leadership';

export interface Checkpoint {
  id: string;
  kind: Kind;
  title: string;
  role: string;
  /** One line for cards, summarising the CV bullets (no new facts). */
  blurb: string;
  /** Shown exactly as written in the CV. */
  when?: string;
  /** Position on the timeline (only for checkpoints the CV dates). */
  at?: Date;
  status: 'finished' | 'running';
  url?: string;
  urlLabel?: string;
  stack: string[];
  /** Eval metrics, only figures stated in the CV. */
  evals?: { key: string; value: string; gauge?: number }[];
  /** Run-config style facts, straight from the CV. */
  config?: { key: string; value: string }[];
  lines: string[];
  photo?: { src: string; alt: string; caption: string };
}

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: 'aivid',
    kind: 'experience',
    title: 'Aivid Tech Vision',
    role: 'Computer Vision Intern',
    blurb: 'Real-time computer vision for people-counting, SOP compliance and alerting on AIVID BOTS.',
    when: 'Feb 2025 – July 2025',
    at: new Date(2025, 1, 1),
    status: 'finished',
    url: 'https://aivid.ai/about-us/',
    urlLabel: 'aivid.ai',
    stack: ['PyTorch', 'OpenCV', 'GStreamer', 'Docker', 'REST APIs'],
    evals: [
      { key: 'accuracy', value: '95%+', gauge: 0.95 },
      { key: 'review time', value: '−70%', gauge: 0.7 },
      { key: 'alert latency', value: '<5s' },
    ],
    lines: [
      'Engineered and deployed deep learning models for people-counting, demographic classification, and defect detection; achieved 95%+ accuracy on held-out test sets via hyperparameter tuning and precision/recall validation.',
      'Automated SOP-compliance workflows by integrating IP camera feeds with AIVID BOTS, removing repetitive manual review and cutting client review time by 70% while increasing audit throughput.',
      'Architected real-time alerting systems (fire, intrusion, theft) with sub-5s end-to-end latency, reducing critical incident response times for enterprise clients.',
      'Replaced OpenCV video capture with high-performance GStreamer pipelines to maximize FPS and optimize edge inference throughput across AIVID BOTS.',
      'Integrated CV pipelines with backend REST APIs to populate real-time dashboards and auto-generate inspection reports for stakeholders.',
    ],
  },
  {
    id: 'vitalsync',
    kind: 'project',
    title: 'VitalSync',
    role: 'Qualcomm Hackathon',
    blurb: 'A local-first focus and hydration tracker: YOLO11n on the Snapdragon NPU, qwen3-vl for screen activity.',
    status: 'finished',
    url: 'https://github.com/Rushi0070/VitalSync',
    urlLabel: 'github',
    stack: ['Python', 'ONNX Runtime', 'QNN', 'YOLO11n', 'Ollama', 'qwen3-vl', 'OpenCV', 'TypeScript'],
    lines: [
      'Prototyped a local-first focus and hydration tracker pairing YOLO11n with the qwen3-vl vision-language model; all webcam frames and screenshots stay on-device.',
      'Configured ONNX Runtime with a QNNExecutionProvider → DirectML → CPU provider chain so detection targets the Snapdragon NPU where available and falls back gracefully.',
      'Post-processed raw YOLO output into boxes behind a 0.4 confidence filter and NMS at 0.45 IoU, running inference on every 3rd frame rather than all of them.',
      'Added a sip check intersecting bottle/cup/glass boxes with a mouth zone taken from the top 35% of the largest person box, edge-triggered so one sip registers once, not every frame.',
      'Set up screen-activity classification (PRODUCTIVE / PROCRASTINATION) with qwen3-vl through Ollama, settling on 768px JPEG screenshots after smaller captures left on-screen window text unreadable to the model.',
    ],
    photo: {
      src: '/images/vitalsync.png',
      alt: 'The VitalSync team at work during the hackathon',
      caption: 'fig. vitalsync, hackathon floor',
    },
  },
  {
    id: 'sec-alpha-gen',
    kind: 'project',
    title: 'SEC Alpha Gen',
    role: 'Alphathon 2025',
    blurb: 'Tradable signals from SEC 10-K/10-Q filings, using FinBERT and RoBERTa to detect narrative shifts.',
    status: 'finished',
    url: 'https://github.com/Rushi0070/sec-investment-signals',
    urlLabel: 'github',
    stack: ['FinBERT', 'RoBERTa', 'CatBoost', 'SHAP'],
    lines: [
      'Built a quantitative NLP pipeline processing SEC 10-K/10-Q filings, using FinBERT and RoBERTa to detect narrative shifts and generate tradable signals.',
      'Trained a CatBoost model with SHAP explainability.',
    ],
  },
  {
    id: 'uber-demand',
    kind: 'project',
    title: 'Uber Demand Prediction',
    role: 'NYC Cab Forecasting',
    blurb: 'Production-grade time-series forecasting of NYC cab demand across zones with XGBoost.',
    status: 'finished',
    stack: ['Python', 'scikit-learn', 'XGBoost', 'DVC', 'Docker'],
    config: [
      { key: 'validation', value: 'sliding-window CV' },
      { key: 'metrics', value: 'MAE / RMSE' },
      { key: 'ci', value: 'GitHub Actions + pytest' },
    ],
    lines: [
      'Built a production-grade time-series forecasting pipeline to predict NYC cab demand across zones using XGBoost and scikit-learn.',
      'Engineered temporal and geospatial features, utilizing sliding-window cross-validation to evaluate model performance via MAE/RMSE metrics.',
      'Containerized the inference engine using Docker for consistent deployment and automated data versioning/reproducibility using DVC.',
      'Established a CI/CD workflow with GitHub Actions running unit tests (pytest).',
    ],
  },
  {
    id: 'stony-brook',
    kind: 'education',
    title: 'Stony Brook University',
    role: 'MS in Data Science',
    blurb: 'Master of Science in Data Science, Long Island, NY.',
    when: 'Sept 2025 – May 2027 (Expected)',
    at: new Date(2025, 8, 1),
    status: 'running',
    stack: [],
    lines: ['Master of Science in Data Science, Long Island, NY.'],
  },
  {
    id: 'pdeu',
    kind: 'education',
    title: 'Pandit Deendayal Energy University',
    role: 'B.Tech, Information and Communication Technology',
    blurb: 'B.Tech in Information and Communication Technology, Gandhinagar, India.',
    when: 'Oct 2021 – June 2025',
    at: new Date(2021, 9, 1),
    status: 'finished',
    stack: [],
    evals: [{ key: 'cgpa', value: '8.47', gauge: 0.847 }],
    lines: [
      'B.Tech in Information and Communication Technology (CGPA: 8.47), Gandhinagar, India.',
      'Relevant coursework: Data Structures and Algorithms, Operating Systems, Machine Learning, AI Systems, Database Management Systems, Cloud Architecture, Probability and Statistics, Computer Organization.',
    ],
  },
  {
    id: 'acm',
    kind: 'leadership',
    title: 'ACM Student Chapter, PDEU',
    role: 'Core Committee Member (Machine Learning)',
    blurb: 'Ran a two-day DSA workshop for 100+ students and mentored peers on problem-solving.',
    when: 'Sept 2023 – May 2024',
    at: new Date(2023, 8, 1),
    status: 'finished',
    stack: [],
    lines: [
      'Organized a two-day DSA workshop covering C++, linear structures, and graph algorithms for 100+ students.',
      'Facilitated peer learning sessions and provided mentoring on algorithmic problem-solving.',
    ],
  },
];

// The run config: the CV's skills, laid out like hyperparameters.
export const CONFIG: { key: string; value: string[] }[] = [
  { key: 'languages', value: ['Python', 'Java', 'SQL'] },
  { key: 'ml', value: ['PyTorch', 'HuggingFace Transformers', 'XGBoost', 'scikit-learn', 'OpenCV', 'NumPy', 'Pandas'] },
  { key: 'data_science', value: ['hypothesis testing', 'EDA', 'feature engineering', 'statistical modeling', 'SHAP', 'forecasting', 'data viz'] },
  { key: 'mlops', value: ['Docker', 'DVC', 'Git / GitHub Actions', 'AWS (EC2)'] },
  { key: 'databases', value: ['MySQL', 'PostgreSQL', 'MongoDB'] },
  { key: 'ai_tooling', value: ['Cursor', 'Claude', 'LLM agent workflows', 'prompt engineering', 'RAG', 'workflow automation'] },
];

// ---- offline ------------------------------------------------------------------

// The DJ side. Only what the photo and Rushi say; nothing about venues.
export const OFFLINE = {
  line: 'Outside of models and data, I DJ.',
  photo: {
    src: '/images/dj.jpg',
    small: '/images/dj-1100.jpg',
    width: 1776,
    height: 1184,
    alt: 'Rushi DJing at an outdoor event, under a white tent',
    caption: 'behind the decks · sep 2026',
  },
};

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Apple Music's official 30-second preview (the label's chosen highlight). */
  preview: string;
  /** Cover at 100px; artAt() asks Apple's CDN for any size. */
  art: string;
  /** The full song on Apple Music. */
  apple: string;
}

// On rotation: picked from Rushi's offline mix folder, matched to Apple's catalog.
export const PLAYLIST: Track[] = [
  {
    id: 'delilah',
    title: 'Delilah (pull me out of this)',
    artist: 'Fred again.. & Delilah Montagu',
    album: 'Actual Life 3 (January 1 - September 9 2022)',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b7/52/49/b75249d5-f30c-15bd-b6b6-2b2592a8273f/mzaf_16220054371150220513.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b0/9c/b7/b09cb72c-cca9-5d66-bc9d-a9b5e5f86b22/5054197236389.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/delilah-pull-me-out-of-this/1640463893?i=1640463908',
  },
  {
    id: 'marea',
    title: 'Marea (We’ve Lost Dancing)',
    artist: 'Fred again.. & The Blessed Madonna',
    album: 'Marea (We’ve Lost Dancing) - Single',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/15/ea/4e/15ea4ed2-f7fc-f87c-b44f-9ca2c628437a/mzaf_1763923556124349361.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/68/49/e4/6849e4dc-2692-20c7-b80f-6e823c245643/190296770036.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/marea-weve-lost-dancing/1553064273?i=1553064274',
  },
  {
    id: 'kyle',
    title: 'Kyle (I Found You)',
    artist: 'Fred again..',
    album: 'Actual Life (April 14 - December 17 2020)',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c3/a3/16/c3a31653-c795-bebf-d11f-e98a64f1ea8a/mzaf_3958148253223135567.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/b7/4f/2cb74fc9-7c37-a56e-2b57-7c284f224695/190295058562.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/kyle-i-found-you/1560355896?i=1560355898',
  },
  {
    id: 'jungle',
    title: 'Jungle',
    artist: 'Fred again..',
    album: 'USB',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/52/1a/40/521a4041-c628-be75-750b-c3b459a2f2b0/mzaf_7296001562809042319.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/cf/eb/fc/cfebfc00-935d-b7cb-ed55-6ed0bfdb1581/5026854879567.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/jungle/1884102759?i=1884104125',
  },
  {
    id: 'baby-again',
    title: 'Baby again..',
    artist: 'Fred again.., Skrillex & Four Tet',
    album: 'Baby again.. - Single',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/37/ad/61/37ad61d7-8656-bba8-4796-5177990f181b/mzaf_2502370054868255044.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/0f/b2/d5/0fb2d5e5-55f1-97e1-c6e7-1ab064e77cca/5054197600371.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/baby-again/1676442468?i=1676442470',
  },
  {
    id: 'danielle',
    title: 'Danielle (smile on my face)',
    artist: 'Fred again..',
    album: 'Actual Life 3 (January 1 - September 9 2022)',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4e/4c/47/4e4c4742-d67b-37d5-e08a-1313a90a9576/mzaf_8719106652897709176.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b0/9c/b7/b09cb72c-cca9-5d66-bc9d-a9b5e5f86b22/5054197236389.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/danielle-smile-on-my-face/1640463893?i=1640464458',
  },
  {
    id: 'clara',
    title: 'Clara (the night is dark)',
    artist: 'Fred again..',
    album: 'Actual Life 3 (January 1 - September 9 2022)',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b5/3f/c9/b53fc9c4-3dd5-200b-a6b9-c7c79748d1e2/mzaf_161652498091892939.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b0/9c/b7/b09cb72c-cca9-5d66-bc9d-a9b5e5f86b22/5054197236389.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/clara-the-night-is-dark/1640463893?i=1640464474',
  },
  {
    id: 'lights-out',
    title: 'Lights Out',
    artist: 'Fred again.., Romy & HAAi',
    album: 'Lights Out - Single',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/76/f6/0e/76f60e00-13aa-3f0c-8b9c-141f3252d55b/mzaf_6834729942846676511.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c1/c2/fc/c1c2fcbd-fda6-1f16-9fa0-c3d84594f534/190296275449.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/lights-out/1605184456?i=1605184461',
  },
];

export const artAt = (t: Track, px: number) => t.art.replace(/\/\d+x\d+bb\./, `/${px}x${px}bb.`);
export const spotifyOf = (t: Track) =>
  `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist.split(/,|&/)[0].trim()}`)}`;
