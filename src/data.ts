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
    status: 'finished',
    url: 'https://github.com/Rushi0070/VitalSync',
    urlLabel: 'github',
    stack: ['Python', 'ONNX Runtime', 'QNN', 'YOLO11n', 'Ollama', 'qwen3-vl', 'OpenCV', 'TypeScript'],
    config: [
      { key: 'providers', value: 'QNN → DirectML → CPU' },
      { key: 'conf_thresh', value: '0.4' },
      { key: 'nms_iou', value: '0.45' },
      { key: 'infer_every', value: '3rd frame' },
      { key: 'screenshot', value: '768px JPEG' },
    ],
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
