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
  'I build models that see, read, and run right where the data is. Lately: real-time video alerts at Aivid Tech Vision, and an on-device focus tracker on a Snapdragon NPU.';

// What I'm looking for (stated by Rushi, 2026-10-17).
export const LOOKING_FOR = 'Open to full-time and internship roles from May 2027.';

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
    blurb: 'Cameras that count people, check SOPs and raise the alarm in under 5 seconds.',
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
      'Shipped people-counting, demographic and defect-detection models at 95%+ held-out accuracy.',
      'Wired IP cameras into AIVID BOTS to automate SOP checks, cutting client review time by 70%.',
      'Built real-time alerts for fire, intrusion and theft: under 5 seconds, end to end.',
      'Swapped OpenCV capture for GStreamer pipelines to push more frames through edge inference.',
      'Piped results through REST APIs into live dashboards and inspection reports that write themselves.',
    ],
  },
  {
    id: 'vitalsync',
    kind: 'project',
    title: 'VitalSync',
    role: 'Qualcomm Hackathon',
    blurb: 'Notices every sip and every slack-off. Not one frame leaves the device.',
    status: 'finished',
    url: 'https://github.com/Rushi0070/VitalSync',
    urlLabel: 'github',
    stack: ['Python', 'ONNX Runtime', 'QNN', 'YOLO11n', 'Ollama', 'qwen3-vl', 'OpenCV', 'TypeScript'],
    lines: [
      'A focus and hydration tracker: YOLO11n watches the webcam, qwen3-vl reads the screen, nothing leaves the device.',
      'ONNX Runtime tries the Snapdragon NPU first (QNN), then DirectML, then CPU.',
      'Raw YOLO output becomes boxes at 0.4 confidence and 0.45 IoU NMS, on every 3rd frame.',
      'A sip counts when a cup, bottle or glass meets the mouth zone (top 35% of the person box), once per sip, not per frame.',
      'qwen3-vl, via Ollama, labels the screen PRODUCTIVE or PROCRASTINATION from 768px JPEGs; anything smaller blurred the window text.',
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
    blurb: 'Reads between the lines of 10-Ks and 10-Qs, and turns what changed into signals.',
    status: 'finished',
    url: 'https://github.com/Rushi0070/sec-investment-signals',
    urlLabel: 'github',
    stack: ['FinBERT', 'RoBERTa', 'CatBoost', 'SHAP'],
    lines: [
      'FinBERT and RoBERTa read SEC 10-K and 10-Q filings, catch narrative shifts, and turn them into tradable signals.',
      'A CatBoost model makes the call; SHAP explains it.',
    ],
  },
  {
    id: 'uber-demand',
    kind: 'project',
    title: 'Uber Demand Prediction',
    role: 'NYC Cab Forecasting',
    blurb: 'Where New York will want a cab next, zone by zone.',
    status: 'finished',
    stack: ['Python', 'scikit-learn', 'XGBoost', 'DVC', 'Docker'],
    config: [
      { key: 'validation', value: 'sliding-window CV' },
      { key: 'metrics', value: 'MAE / RMSE' },
      { key: 'ci', value: 'GitHub Actions + pytest' },
    ],
    lines: [
      'Time-series forecasting of NYC cab demand per zone, with XGBoost and scikit-learn.',
      'Temporal and geospatial features, scored with sliding-window CV on MAE and RMSE.',
      'Docker for the inference engine; DVC so every dataset version can be reproduced.',
      'CI/CD on GitHub Actions, with pytest unit tests.',
    ],
  },
  {
    id: 'stony-brook',
    kind: 'education',
    title: 'Stony Brook University',
    role: 'MS in Data Science',
    blurb: 'Where I am now, on Long Island.',
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
    blurb: 'Undergrad in Gandhinagar, India.',
    when: 'Oct 2021 – June 2025',
    at: new Date(2021, 9, 1),
    status: 'finished',
    stack: [],
    evals: [{ key: 'cgpa', value: '8.47', gauge: 0.847 }],
    lines: [
      'B.Tech in Information and Communication Technology, Gandhinagar, India. CGPA 8.47.',
      'Coursework: DSA, operating systems, machine learning, AI systems, databases, cloud architecture, probability and statistics, computer organization.',
    ],
  },
  {
    id: 'acm',
    kind: 'leadership',
    title: 'ACM Student Chapter, PDEU',
    role: 'Core Committee Member (Machine Learning)',
    blurb: 'Two days, 100+ students, a lot of graphs.',
    when: 'Sept 2023 – May 2024',
    at: new Date(2023, 8, 1),
    status: 'finished',
    stack: [],
    lines: [
      'Ran a two-day DSA workshop for 100+ students: C++, linear structures, graph algorithms.',
      'Led peer study sessions and mentored on algorithmic problem-solving.',
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

// ---- blog -------------------------------------------------------------------------

// Rushi's posts on sololeveling, newest first. Title, summary, tags and
// read time are as the blog shows them; `inside` is from the post's headings.
export const BLOG_LINE = 'Notes on machine learning, math, and whatever else is rattling around.';

export interface Post {
  id: string;
  title: string;
  blurb: string;
  date: string;
  minutes: number;
  tags: string[];
  inside: string[];
  url: string;
}

export const POSTS: Post[] = [
  {
    id: 'ai-hardware',
    title: 'Things you need to know about AI from a hardware perspective',
    blurb: 'Flops, cores, threads, memory bandwidth, warps and tensor cores, explained from the ground up by opening up an actual GPU.',
    date: 'Aug 22, 2026',
    minutes: 20,
    tags: ['hardware', 'gpu', 'ml'],
    inside: ['flops', 'cores vs threads', 'cpu vs gpu', 'memory bandwidth', 'simd', 'warps and grids', 'tensor cores'],
    url: 'https://sololeveling-phi.vercel.app/blog/things-you-need-to-know-about-for-a-hardware-perspective-in-ai',
  },
];

// ---- after hours ------------------------------------------------------------------

// The music side (Rushi, 2026-10-17): loves music, DJs part-time at Stony Brook.
export const AFTER_HOURS = {
  line: 'I love music, and DJing for Stony Brook part-time.',
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

// On rotation: Rushi's picks, matched to Apple's catalog.
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
    id: 'one-more-time',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5d/93/d8/5d93d83f-ad1e-da4d-1d79-9937bdff24ec/mzaf_14396932211949300852.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/one-more-time/697194953?i=697195462',
  },
  {
    id: 'quiereme',
    title: 'Quiereme',
    artist: 'LATIN MAFIA, Fred again.. & bby',
    album: '9 months & 50 hours',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/36/22/fe/3622fe22-59d3-4501-9c38-de53fbfee2fb/mzaf_1679209494278292245.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/90/52/6e/90526e94-89c7-8387-458f-1972f7995d48/1200214495824.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/quiereme/6796842304?i=6796842525',
  },
  {
    id: 'bonita',
    title: 'Bonita',
    artist: 'Fred again.. & LATIN MAFIA',
    album: '9 months & 50 hours',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/cb/a9/41/cba941cc-0fe3-636b-fe33-162c61f3248d/mzaf_3542307672108078551.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/90/52/6e/90526e94-89c7-8387-458f-1972f7995d48/1200214495824.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/bonita/6796842304?i=6796842311',
  },
  {
    id: 'benjy-chord',
    title: 'benjy chord',
    artist: 'Fred again.. & LATIN MAFIA',
    album: '9 months & 50 hours',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a1/b1/ad/a1b1adb9-d124-3203-6a80-f658e51fee45/mzaf_2816432194768603664.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/90/52/6e/90526e94-89c7-8387-458f-1972f7995d48/1200214495824.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/benjy-chord/6796842304?i=6796842312',
  },
  {
    id: 'leavemealone',
    title: 'leavemealone',
    artist: 'Fred again.. & Baby Keem',
    album: 'leavemealone - Single',
    preview: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fe/cb/47/fecb476a-cee9-cbc3-0894-62580f11ab1d/mzaf_12124886779666198890.plus.aac.p.m4a',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f7/da/f7/f7daf71b-52b2-c906-1d68-eec11a75b2f6/5054197912979.jpg/100x100bb.jpg',
    apple: 'https://music.apple.com/us/album/leavemealone/1720043736?i=1720043991',
  },
];

export const artAt = (t: Track, px: number) => t.art.replace(/\/\d+x\d+bb\./, `/${px}x${px}bb.`);
export const spotifyOf = (t: Track) =>
  `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist.split(/,|&/)[0].trim()}`)}`;
