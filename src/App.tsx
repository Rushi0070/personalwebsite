import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  ArrowUpRight, 
  Mail, 
  Linkedin, 
  Github,
  Volume2,
  VolumeX,
  Download,
  MapPin,
  Calendar,
  Twitter
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface ListItemProps {
  index: string;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  tags: string[];
  link?: string;
  playHover: () => void;
  date?: string;
  companyUrl?: string;
}

interface StackCategory {
  title: string;
  items: string[];
}

// --- DEVICE DETECTION HOOK ---
const useDeviceDetect = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(width < 768 || (hasTouch && width < 1024));
      setIsTablet(width >= 768 && width < 1024);
      
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const isSlowConnection = (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType === '2g';
      
      setIsLowPower(prefersReducedMotion || hardwareConcurrency <= 2 || isSlowConnection);
    };

    checkDevice();
    
    // Debounced resize handler
    let resizeTimer: number;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(checkDevice, 150);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', checkDevice, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkDevice);
      clearTimeout(resizeTimer);
    };
  }, []);

  return { isMobile, isTablet, isLowPower };
};

// --- OPTIMIZED AUDIO ENGINE (Mobile-compatible) ---
const useSound = () => {
  const [isMuted, setIsMuted] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const isInitializedRef = useRef(false);

  // Create noise buffer for hover sounds
  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  // Play a short confirmation sound (for mobile unlock feedback)
  const playUnlockSound = useCallback((ctx: AudioContext) => {
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch {
      // Silently fail
    }
  }, []);

  const initAudio = useCallback(async () => {
    // If already initialized, just resume and unmute
    if (isInitializedRef.current && audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        playUnlockSound(audioCtxRef.current);
        setIsMuted(false);
      } catch (e) {
        console.warn('Audio resume failed:', e);
      }
      return;
    }

    try {
      // Create AudioContext (with webkit prefix for older iOS)
      const AudioContextClass = window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      
      // Mobile browsers start AudioContext in suspended state
      // Must resume within user gesture handler
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Create the noise buffer for hover effects
      bufferRef.current = createNoiseBuffer(ctx);
      isInitializedRef.current = true;
      
      // Play confirmation sound so user knows audio is working
      playUnlockSound(ctx);
      
      setIsMuted(false);
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }, [createNoiseBuffer, playUnlockSound]);

  const playHover = useCallback(() => {
    if (isMuted || !audioCtxRef.current || !bufferRef.current) return;
    
    const ctx = audioCtxRef.current;
    
    // Ensure context is running (can get suspended on mobile after tab switch)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return; // Skip this sound, next one will work
    }
    
    try {
      const t = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = bufferRef.current;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start(t);
      source.stop(t + 0.02);
    } catch {
      // Silently fail for audio errors
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // initAudio is async but we don't need to await here
      // The state update will happen after audio is ready
      initAudio();
    } else {
      setIsMuted(true);
    }
  }, [isMuted, initAudio]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { isMuted, toggleMute, playHover };
};

// --- OPTIMIZED THREE.JS BACKGROUND ---
const FlowFieldBackground = memo(({ isMobile, isLowPower }: { isMobile: boolean; isLowPower: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || isLowPower) return;

    let animationId: number;
    let isRunning = true;

    const initThreeJS = () => {
      const THREE = (window as unknown as { THREE: typeof import('three') }).THREE;
      if (!THREE || !containerRef.current) return;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.002);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.z = isMobile ? 70 : 50;

      const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: !isMobile,
        powerPreference: 'high-performance'
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      containerRef.current.appendChild(renderer.domElement);

      const particleCount = isMobile ? 1500 : 4000;
      
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      
      const xRange = isMobile ? 150 : 300;
      const yRange = isMobile ? 250 : 150;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * xRange;
        positions[i3 + 1] = (Math.random() - 0.5) * yRange;
        positions[i3 + 2] = (Math.random() - 0.5) * 100;
        velocities[i3] = Math.random() * 0.05 + 0.02;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
        size: isMobile ? 0.25 : 0.15,
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const fovRad = (75 * Math.PI / 180) / 2;
      let planeHeight = 2 * Math.tan(fovRad) * camera.position.z;
      let planeWidth = planeHeight * (window.innerWidth / window.innerHeight);

      let mouseX = 0, mouseY = 0;
      let targetX = 0, targetY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        targetX = ((e.clientX / window.innerWidth) - 0.5) * planeWidth;
        targetY = -((e.clientY / window.innerHeight) - 0.5) * planeHeight;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          targetX = ((touch.clientX / window.innerWidth) - 0.5) * planeWidth;
          targetY = -((touch.clientY / window.innerHeight) - 0.5) * planeHeight;
        }
      };
      
      if (!isMobile) {
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
      } else {
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
      }

      const boundX = isMobile ? 80 : 150;
      const boundY = isMobile ? 120 : 80;
      const interactionRadius = isMobile ? 80 : 60;
      const interactionRadiusSq = interactionRadius * interactionRadius;

      const animate = () => {
        if (!isRunning) return;
        animationId = requestAnimationFrame(animate);
        
        mouseX += (targetX - mouseX) * 0.1;
        mouseY += (targetY - mouseY) * 0.1;

        const pos = points.geometry.attributes.position.array as Float32Array;
        const time = performance.now() * 0.0005;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          const px = pos[i3];
          const py = pos[i3 + 1];
          const pz = pos[i3 + 2];

          let vx = velocities[i3];
          let vy = Math.sin(px * 0.05 + time) * 0.01;
          let vz = Math.cos(px * 0.03 + time) * 0.01;

          const dx = mouseX - px;
          const dy = mouseY - py;
          
          if (Math.abs(dx) < interactionRadius && Math.abs(dy) < interactionRadius) {
            const dz = -pz;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < interactionRadiusSq) {
              const dist = Math.sqrt(distSq);
              const normDist = dist / interactionRadius;
              const influence = (1 - normDist) ** 3;

              vx += (dx * 0.005 + -dy * 0.02 + (Math.random() - 0.5) * 0.05) * influence;
              vy += (dy * 0.005 + dx * 0.02 + (Math.random() - 0.5) * 0.05) * influence;
              vz += dz * 0.005 * influence;

              if (dist < 10) {
                const push = (10 - dist) * 0.02;
                vx -= dx * push;
                vy -= dy * push;
              }
            }
          }

          pos[i3] += vx;
          pos[i3 + 1] += vy;
          pos[i3 + 2] += vz;

          if (pos[i3] > boundX) {
            pos[i3] = -boundX;
            pos[i3 + 1] = (Math.random() - 0.5) * boundY * 2;
            pos[i3 + 2] = (Math.random() - 0.5) * 100;
          }
          if (pos[i3 + 1] > boundY) pos[i3 + 1] = -boundY;
          if (pos[i3 + 1] < -boundY) pos[i3 + 1] = boundY;
        }
        
        points.geometry.attributes.position.needsUpdate = true;
        scene.rotation.y = Math.sin(time * 0.1) * 0.02;
        renderer.render(scene, camera);
      };

      animate();

      let resizeTimeout: number;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          
          planeHeight = 2 * Math.tan(fovRad) * camera.position.z;
          planeWidth = planeHeight * (width / height);
        }, 100);
      };
      
      window.addEventListener('resize', handleResize, { passive: true });

      cleanupRef.current = () => {
        isRunning = false;
        cancelAnimationFrame(animationId);
        clearTimeout(resizeTimeout);
        
        if (!isMobile) {
          document.removeEventListener('mousemove', handleMouseMove);
        } else {
          document.removeEventListener('touchmove', handleTouchMove);
        }
        window.removeEventListener('resize', handleResize);
        
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    };

    if ((window as unknown as { THREE: unknown }).THREE) {
      initThreeJS();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = initThreeJS;
      document.head.appendChild(script);
    }

    return () => {
      cleanupRef.current?.();
    };
  }, [isMobile, isLowPower]);

  if (isLowPower) {
    return <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-gray-900 to-black" />;
  }

  return <div ref={containerRef} className="fixed inset-0 z-0 bg-black" aria-hidden="true" />;
});

FlowFieldBackground.displayName = 'FlowFieldBackground';

// --- LIST ITEM COMPONENT ---
const ListItem = memo(({ index, title, subtitle, description, tags, link, playHover, date, companyUrl }: ListItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    playHover();
  };

  return (
    <div 
      className="group border-t border-white/20 hover:border-white/60 transition-colors duration-300"
      onMouseEnter={playHover}
    >
      <div 
        className="py-5 sm:py-6 md:py-8 flex flex-col md:flex-row md:items-baseline justify-between gap-2 md:gap-4 cursor-pointer"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="flex items-baseline gap-3 sm:gap-4 md:gap-6 md:w-1/3">
          <span className="font-mono text-xs md:text-sm text-gray-500 font-medium">0{index}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-white group-hover:text-cyan-200 transition-colors duration-300">
                {title}
              </h3>
              {companyUrl && (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-500 hover:text-cyan-400 transition-colors p-1 hover:bg-white/10 rounded"
                  title="Visit company website"
                  aria-label={`Visit ${title} website (opens in new tab)`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </div>
            {subtitle && (
              <p className="text-xs md:text-sm font-mono text-cyan-400 mt-1 md:mt-2 font-medium">
                {subtitle}
              </p>
            )}
            {date && (
              <p className="text-[10px] sm:text-xs font-mono text-gray-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {date}
              </p>
            )}
          </div>
        </div>

        <div className="hidden md:block md:w-1/6 font-mono text-xs text-gray-400 uppercase tracking-widest font-medium group-hover:text-white transition-colors">
          {tags?.[0]} 
        </div>

        {/* Mobile: Always show on tap, Desktop: Show on hover */}
        <div className={`md:w-1/2 overflow-hidden transition-all duration-500 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 md:group-hover:max-h-80 md:group-hover:opacity-100'}`}
        >
          <div className="text-gray-200 text-sm md:text-base leading-relaxed mb-4 md:mb-6 max-w-lg mt-4 md:mt-0">
            {description}
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {tags.slice(1).map((t) => (
              <span 
                key={t} 
                className="text-[10px] md:text-xs font-mono text-gray-300 border border-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        
        {link && (
          <ArrowUpRight className="hidden md:block w-5 h-5 lg:w-6 lg:h-6 text-gray-400 group-hover:text-white group-hover:-translate-y-1 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
        )}
      </div>
    </div>
  );
});

ListItem.displayName = 'ListItem';

// --- BUILD ITEM COMPONENT ---
interface BuildItemProps {
  index: string;
  title: string;
  subtitle: string;
  image?: string;
  description: React.ReactNode;
  tags: string[];
  link?: string;
  collaborators?: string;
  sponsors?: string;
  playHover: () => void;
}

const BuildItem = memo(({ index, title, subtitle, image, description, tags, link, collaborators, sponsors, playHover }: BuildItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    playHover();
  };

  return (
    <div 
      className="group border-t border-white/20 hover:border-white/60 transition-colors duration-300"
      onMouseEnter={playHover}
    >
      <div 
        className="py-5 sm:py-6 md:py-8 cursor-pointer"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 md:gap-4">
          <div className="flex items-baseline gap-3 sm:gap-4 md:gap-6">
            <span className="font-mono text-xs md:text-sm text-gray-500 font-medium">0{index}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-white group-hover:text-blue-300 transition-colors duration-300">
                  {title}
                </h3>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-500 hover:text-blue-400 transition-colors p-1 hover:bg-white/10 rounded"
                    title="View repository"
                    aria-label={`View ${title} repository (opens in new tab)`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-xs md:text-sm font-mono text-blue-400 mt-1 md:mt-2 font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-widest font-medium group-hover:text-white transition-colors">
            <span>{isExpanded ? 'Collapse' : 'View Details'}</span>
            <span className={`inline-block transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              &#9662;
            </span>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-500 ease-in-out
          ${isExpanded ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pt-6 md:pt-8">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 mb-6 md:mb-8">
              {image && (
                <div className="lg:w-2/5 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 self-start">
                  <img 
                    src={image} 
                    alt={title}
                    className="w-full h-auto object-cover aspect-[4/3]"
                    loading="lazy"
                  />
                </div>
              )}
              
              <div className="lg:w-3/5">
                <div className="text-gray-200 text-sm md:text-base leading-relaxed mb-4 md:mb-6">
                  {description}
                </div>

                {sponsors && (
                  <p className="text-xs md:text-sm font-mono text-blue-400/80 mb-2">
                    <span className="text-gray-500">Sponsors:</span> {sponsors}
                  </p>
                )}

                {collaborators && (
                  <p className="text-xs md:text-sm font-mono text-blue-400/80 mb-4 md:mb-6">
                    <span className="text-gray-500">Team:</span> {collaborators}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-2">
              {tags.map((t) => (
                <span 
                  key={t} 
                  className="text-[10px] md:text-xs font-mono text-gray-300 border border-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BuildItem.displayName = 'BuildItem';

// --- STACK CATEGORY ---
const StackCategory = memo(({ title, items, playHover }: StackCategory & { playHover: () => void }) => (
  <div onMouseEnter={playHover} className="group">
    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 sm:mb-6 pb-2 border-b border-white/10 group-hover:border-white/40 transition-colors inline-block">
      {title}
    </h3>
    <ul className="space-y-2 sm:space-y-3">
      {items.map(item => (
        <li key={item} className="text-sm text-gray-300 hover:text-white transition-colors cursor-default block font-medium py-1">
          {item}
        </li>
      ))}
    </ul>
  </div>
));

StackCategory.displayName = 'StackCategory';

// --- SECTION COMPONENTS ---
const WorkSection = memo(({ playHover }: { playHover: () => void }) => (
  <section className="animate-in fade-in" aria-labelledby="work-heading">
    <h2 id="work-heading" className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6 sm:mb-8 md:mb-12 font-bold">
      Professional Experience
    </h2>
    <div className="w-full">
      <ListItem 
        index="1"
        title="Aivid Tech Vision"
        subtitle="Computer Vision Intern"
        date="Feb 2025 – July 2025"
        companyUrl="https://aivid.ai/about-us/"
        description={
          <ul className="list-disc pl-4 space-y-2 sm:space-y-3 text-gray-200">
            <li>Engineered and deployed deep learning models for people-counting, demographic classification, and product defect detection; achieved 95%+ accuracy.</li>
            <li>Automated SOP-compliance workflows by integrating IP camera feeds with AIVID BOTS, reducing client manual review time by 70%.</li>
            <li>Architected real-time alerting systems (fire, intrusion, theft) with sub-5s end-to-end latency.</li>
            <li>Optimized edge inference via model quantization and distributed pipelines, reducing network bandwidth consumption by 40%.</li>
          </ul>
        }
        tags={['Edge AI', 'PyTorch', 'Docker', 'OpenCV', 'Real-time Systems']}
        playHover={playHover}
      />
    </div>
  </section>
));

WorkSection.displayName = 'WorkSection';

const ProjectsSection = memo(({ playHover }: { playHover: () => void }) => (
  <section className="animate-in fade-in" aria-labelledby="projects-heading">
    <h2 id="projects-heading" className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6 sm:mb-8 md:mb-12 font-bold">
      Academic & Personal Projects
    </h2>
    <div className="w-full">
      <ListItem 
        index="1"
        title="SEC Alpha Gen"
        subtitle="Alphathon 2025"
        description="Quantitative NLP pipeline processing SEC 10-K/10-Q filings. Utilized FinBERT and RoBERTa to detect narrative shifts and generate tradable signals. Trained CatBoost with SHAP explainability achieving 76.92% accuracy and 1.90 Sharpe ratio."
        tags={['NLP', 'FinBERT', 'CatBoost', 'SHAP', 'Quantitative Finance']}
        link="#"
        companyUrl="https://github.com/Rushi0070/sec-investment-signals"
        playHover={playHover}
      />
      <ListItem 
        index="2"
        title="Uber Demand Forecast"
        subtitle="MLOps Pipeline"
        description="Production-grade time-series forecasting pipeline for NYC cab demand using XGBoost. Engineered temporal and geospatial features with sliding-window cross-validation. Containerized with Docker, versioned with DVC, and CI/CD with GitHub Actions."
        tags={['MLOps', 'XGBoost', 'DVC', 'Docker', 'CI/CD']}
        link="#"
        playHover={playHover}
      />
    </div>
  </section>
));

ProjectsSection.displayName = 'ProjectsSection';

const BuildsSection = memo(({ playHover }: { playHover: () => void }) => (
  <section className="animate-in fade-in" aria-labelledby="builds-heading">
    <h2 id="builds-heading" className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-6 sm:mb-8 md:mb-12 font-bold">
      Recent Builds
    </h2>
    <div className="w-full">
      <BuildItem 
        index="1"
        title="VitalSync"
        subtitle="Columbia University Hackathon // Qualcomm"
        image="/images/vitalsync.png"
        description={
          <>
            <p className="mb-4">
              Just wrapped up an incredible week at the Columbia University Hackathon, sponsored by Qualcomm, where our team architected VitalSync: a multi-device ecosystem that redefines productivity through on-device edge intelligence. Designed to bridge the gap between deep-work "flow states" and physical well-being, VitalSync leverages the Snapdragon platform to run a dual-model pipeline: a Qwen 6B VLM on the NPU (via ONNX) for deep screen-context analysis and a YOLOv8 model on the integrated GPU for real-time physical activity tracking.
            </p>
            <p className="mb-4">
              The core of VitalSync is accountability; when the system detects procrastination or a vital need for hydration and movement, it triggers a persistent "task-locked" popup that only closes once the vision models verify the task has been completed. This entire experience is managed via a React Native Android remote featuring seamless state persistence and haptic feedback, allowing users to initiate background PC sessions directly from their phones.
            </p>
            <p>
              By optimizing model memory loading to preserve primary compute for daily tasks, we have created a performance "Vital Score" summary system that scales from personal wellness to enterprise-level employee productivity, proving that the future of private, responsive AI belongs on the edge.
            </p>
          </>
        }
        tags={['Edge AI', 'Snapdragon NPU', 'Qwen 6B VLM', 'YOLOv8', 'ONNX', 'React Native', 'On-Device ML']}
        link="https://github.com/Rushi0070/VitalSync"
        sponsors="Qualcomm, Columbia University"
        collaborators="Ishan Vaghani, Ying Lo, Charisse Lai"
        playHover={playHover}
      />
    </div>
  </section>
));

BuildsSection.displayName = 'BuildsSection';

const AboutSection = memo(() => (
  <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 md:gap-16 animate-in fade-in" aria-labelledby="about-heading">
    <div className="lg:col-span-5">
      <h2 id="about-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-tight mb-6 sm:mb-8 text-white text-balance">
        Bridging <br className="hidden sm:block"/><span className="text-gray-500">Theory</span> & <br className="hidden sm:block"/>Production.
      </h2>
    </div>
    <div className="lg:col-span-7 space-y-8 sm:space-y-12 md:space-y-16">
      <div>
        <p className="text-base sm:text-lg md:text-xl font-normal leading-relaxed text-gray-200 mb-6 sm:mb-8">
          I am a Data Science Graduate Student specializing in Computer Vision and NLP. My work focuses on building robust, scalable intelligent systems for high-stakes environments like FinTech and Industrial IoT.
        </p>
        <div className="grid grid-cols-2 gap-6 sm:gap-8 font-mono text-xs text-gray-400 uppercase tracking-widest font-medium">
          <div>
            <span className="block text-white mb-2 font-bold">Education</span>
            <span className="text-gray-300">Stony Brook Univ.</span><br/>
            MS Data Science
          </div>
          <div>
            <span className="block text-white mb-2 font-bold">Undergrad</span>
            <span className="text-gray-300">PDEU, India</span><br/>
            B.Tech ICT (8.47 GPA)
          </div>
        </div>
      </div>
      <div className="space-y-4 border-t border-white/20 pt-6 sm:pt-8">
        <h3 className="text-base sm:text-lg font-bold text-white">Leadership Impact</h3>
        <p className="text-sm md:text-base text-gray-300 font-normal leading-relaxed">
          As Core Committee Member (ML) at ACM Student Chapter PDEU, I organized a two-day DSA workshop covering C++, linear structures, and graph algorithms for 100+ students, and facilitated peer learning sessions for algorithmic problem-solving.
        </p>
      </div>
    </div>
  </section>
));

AboutSection.displayName = 'AboutSection';

const StackSection = memo(({ playHover }: { playHover: () => void }) => {
  const categories = useMemo<StackCategory[]>(() => [
    { title: "Languages", items: ["Python", "C++", "Java", "SQL", "TypeScript"] },
    { title: "ML & AI", items: ["PyTorch", "TensorFlow", "HuggingFace", "XGBoost", "OpenCV"] },
    { title: "Infrastructure", items: ["Docker", "AWS SageMaker", "Git", "DVC", "Linux"] },
    { title: "Tools", items: ["Pandas", "NumPy", "Streamlit", "Plotly", "pytest"] }
  ], []);

  return (
    <section className="animate-in fade-in" aria-labelledby="stack-heading">
      <h2 id="stack-heading" className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6 sm:mb-8 md:mb-12 font-bold">
        Technical Arsenal
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12 lg:gap-16">
        {categories.map((cat, i) => (
          <div key={cat.title} className={`stagger-${i + 1}`}>
            <StackCategory {...cat} playHover={playHover} />
          </div>
        ))}
      </div>
    </section>
  );
});

StackSection.displayName = 'StackSection';

// --- MAIN COMPONENT ---
export default function ArtisticPortfolio() {
  const [activeSection, setActiveSection] = useState('work');
  const { isMuted, toggleMute, playHover } = useSound();
  const { isMobile, isLowPower } = useDeviceDetect();
  
  const navItems = useMemo(() => ['work', 'projects', 'builds', 'about', 'stack'], []);
  
  const handleNavClick = useCallback((sec: string) => {
    setActiveSection(sec);
    playHover();
  }, [playHover]);

  const renderSection = useMemo(() => {
    switch (activeSection) {
      case 'work': return <WorkSection playHover={playHover} />;
      case 'projects': return <ProjectsSection playHover={playHover} />;
      case 'builds': return <BuildsSection playHover={playHover} />;
      case 'about': return <AboutSection />;
      case 'stack': return <StackSection playHover={playHover} />;
      default: return null;
    }
  }, [activeSection, playHover]);

  return (
    <div className="min-h-screen min-h-[100dvh] text-white font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden bg-black">
      <FlowFieldBackground isMobile={isMobile} isLowPower={isLowPower} />
      
      {/* Skip to main content for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-cyan-500 focus:text-black focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      
      {!isLowPower && (
        <div 
          className="fixed inset-0 pointer-events-none z-[1] opacity-20 brightness-100 contrast-150 mix-blend-overlay"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
          aria-hidden="true"
        />
      )}

      {/* Header - Left */}
      <header className="fixed top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 z-50 mix-blend-difference safe-left safe-top mobile-header-left">
        <h1 className="text-sm md:text-base font-bold tracking-widest uppercase text-white truncate">
          Rushi Jhala
        </h1>
        <p className="text-[10px] md:text-xs font-mono text-gray-300 mt-1 font-medium leading-relaxed">
          <span className="hidden xs:inline">Stony Brook University</span>
          <span className="xs:hidden">SBU</span>
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> // </span>
          <span className="hidden xs:inline">MS Data Science</span>
          <span className="xs:hidden">MSDS</span>
        </p>
      </header>

      {/* Header - Right */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50 mix-blend-difference text-right safe-right safe-top mobile-header-right">
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full pulse-glow flex-shrink-0" />
          <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-mono tracking-wider sm:tracking-widest uppercase text-white font-bold leading-tight">
            <span className="hidden xs:inline">Seeking Summer 2026 Internship</span>
            <span className="xs:hidden">Open to Work</span>
          </span>
        </div>
        <p className="hidden sm:flex text-[10px] md:text-xs font-mono text-gray-300 mt-1 font-medium items-center justify-end gap-1">
          <MapPin className="w-3 h-3" />
          Long Island, NY
        </p>
      </div>

      {/* Navigation */}
      <nav 
        className="fixed bottom-4 left-3 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 z-50 flex gap-2 xs:gap-3 sm:gap-4 md:gap-8 mix-blend-difference overflow-x-auto max-w-[55vw] xs:max-w-[60vw] sm:max-w-[60vw] md:max-w-none no-scrollbar safe-left safe-bottom select-none-touch mobile-bottom-nav"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((sec) => (
          <button
            key={sec}
            onClick={() => handleNavClick(sec)}
            className={`text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-wider sm:tracking-widest transition-all duration-300 whitespace-nowrap py-2 min-w-[36px] xs:min-w-[40px] sm:min-w-[44px] min-h-[36px] xs:min-h-[40px] sm:min-h-[44px] flex items-center justify-center
              ${activeSection === sec ? 'text-white' : 'text-gray-400 hover:text-white active:text-cyan-300'}`}
            aria-current={activeSection === sec ? 'page' : undefined}
          >
            {sec}
          </button>
        ))}
      </nav>

      {/* Socials & Audio */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 flex gap-1 xs:gap-2 sm:gap-4 md:gap-5 mix-blend-difference items-center safe-right safe-bottom mobile-bottom-icons">
        <button 
          onClick={toggleMute}
          onMouseEnter={playHover}
          className="text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
          title={isMuted ? "Enable Sound" : "Mute Sound"}
          aria-label={isMuted ? "Enable Sound" : "Mute Sound"}
          aria-pressed={!isMuted}
        >
          {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        <a 
          href="/resume.pdf" 
          download="Rushi_Jhala_Resume.pdf"
          onMouseEnter={playHover}
          className="text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center" 
          title="Download Resume"
          aria-label="Download Resume (PDF)"
        >
          <Download className="w-4 h-4 md:w-5 md:h-5" />
        </a>

        <a 
          href="mailto:jhalarushi@gmail.com" 
          onMouseEnter={playHover} 
          className="text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center" 
          aria-label="Send Email"
        >
          <Mail className="w-4 h-4 md:w-5 md:h-5" />
        </a>
        
        <a 
          href="https://linkedin.com/in/rushi-jhala-855076224" 
          onMouseEnter={playHover} 
          className="text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center" 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="LinkedIn Profile (opens in new tab)"
        >
          <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
        </a>
        
        <a 
          href="https://github.com/rushijhala" 
          onMouseEnter={playHover} 
          className="hidden sm:flex text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center" 
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub Profile (opens in new tab)"
        >
          <Github className="w-4 h-4 md:w-5 md:h-5" />
        </a>
        
        <a 
          href="https://x.com/JhalaRushi" 
          onMouseEnter={playHover} 
          className="hidden sm:flex text-gray-400 hover:text-white active:text-cyan-300 transition-colors p-2 min-w-[44px] min-h-[44px] items-center justify-center" 
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter/X Profile (opens in new tab)"
        >
          <Twitter className="w-4 h-4 md:w-5 md:h-5" />
        </a>
      </div>

      {/* Main Content */}
      <main 
        id="main-content"
        className="relative z-10 pt-24 sm:pt-28 pb-28 sm:pb-32 md:pb-40 px-4 sm:px-6 md:px-12 lg:px-24 max-w-7xl mx-auto min-h-screen min-h-[100dvh] flex flex-col justify-center"
        role="main"
      >
        {renderSection}
      </main>
      </div>
  );
}
