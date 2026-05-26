import React, { useState, useEffect, useRef } from 'react';
import './Tutorial.css';

const jutsuData = [
  {
    id: 'rasengan',
    name: 'Rasengan',
    kanji: '螺旋丸',
    hand: 'left',
    color: '#38bdf8',
    colorDark: '#0ea5e9',
    glow: 'rgba(56,189,248,0.6)',
    description: 'The Spiraling Sphere — a self-sustaining, concentrated spinning ball of chakra.',
    anime: 'Naruto',
    gesture: 'Open Palm',
    instructions: [
      'Extend your LEFT hand toward the camera',
      'Spread all five fingers wide open',
      'Keep your palm fully flat and facing forward',
      'Hold the pose steady — blue chakra will spiral!'
    ],
  },
  {
    id: 'chidori',
    name: 'Chidori',
    kanji: '千鳥',
    hand: 'right',
    color: '#a78bfa',
    colorDark: '#7c3aed',
    glow: 'rgba(167,139,250,0.6)',
    description: 'One Thousand Birds — a lightning blade that pierces anything in its path.',
    anime: 'Naruto',
    gesture: 'Open Palm',
    instructions: [
      'Extend your RIGHT hand toward the camera',
      'Spread all five fingers wide open',
      'Keep your palm fully flat and facing forward',
      'Hold the pose — lightning will crackle!'
    ],
  },
  {
    id: 'fireball',
    name: 'Fireball Jutsu',
    kanji: '火遁',
    hand: 'either',
    color: '#fb923c',
    colorDark: '#ea580c',
    glow: 'rgba(251,146,60,0.6)',
    description: 'Katon: Gōkakyū — a massive fireball that consumes everything in its wake.',
    anime: 'Naruto',
    gesture: 'Thumbs Up',
    instructions: [
      'Make a fist with either hand',
      'Extend your thumb straight upward',
      'Curl index, middle, ring, and pinky fingers',
      'Hold firm — fire ignites!'
    ],
  },
  {
    id: 'hollow-purple',
    name: 'Hollow Purple',
    kanji: '虚式　紫',
    hand: 'either',
    color: '#c084fc',
    colorDark: '#9333ea',
    glow: 'rgba(192,132,252,0.6)',
    description: 'Imaginary Technique — the fusion of Red and Blue, obliterating all matter.',
    anime: 'Jujutsu Kaisen',
    gesture: 'Pinch',
    instructions: [
      'Touch your thumb tip to your index finger tip',
      'Form a small O-shape with those two fingers',
      'Curl middle, ring, and pinky fingers inward',
      'Maintain the pinch — purple void expands!'
    ],
  }
];

const GestureIllustration = ({ jutsu, size = 160 }) => {
  const c = jutsu.color;
  const s = size;
  const scale = s / 200;

  if (jutsu.id === 'rasengan' || jutsu.id === 'chidori') {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="gesture-svg">
        <defs>
          <radialGradient id={`glow-${jutsu.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill={`url(#glow-${jutsu.id})`} />
        {/* Palm */}
        <ellipse cx="100" cy="128" rx="32" ry="36" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Wrist */}
        <path d="M 80 158 Q 80 170 85 175 Q 100 178 115 175 Q 120 170 120 158" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Thumb */}
        <path d="M 68 118 Q 50 108 44 90 Q 41 76 48 68" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Index */}
        <path d="M 84 94 Q 83 68 82 45 Q 82 33 86 26" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Middle */}
        <path d="M 99 88 Q 99 58 99 30 Q 99 18 103 12" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Ring */}
        <path d="M 114 92 Q 116 62 116 38 Q 116 26 112 20" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Pinky */}
        <path d="M 127 104 Q 132 82 133 64 Q 133 54 130 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Fingertip dots */}
        <circle cx="86" cy="26" r="3.5" fill={c} />
        <circle cx="103" cy="12" r="3.5" fill={c} />
        <circle cx="112" cy="20" r="3.5" fill={c} />
        <circle cx="130" cy="48" r="3.5" fill={c} />
        <circle cx="48" cy="68" r="3" fill={c} />
        {/* Wrist dot */}
        <circle cx="100" cy="160" r="4" fill={c} />
        {/* Knuckle line */}
        <path d="M 78 110 Q 100 105 124 112" fill="none" stroke={c} strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3,3"/>
      </svg>
    );
  }

  if (jutsu.id === 'fireball') {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="gesture-svg">
        <defs>
          <radialGradient id="glow-fireball" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c} stopOpacity="0.25" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#glow-fireball)" />

        {/* ── FIST BODY ── */}
        {/* Main knuckle row — 4 rounded rectangles side by side */}
        <rect x="62" y="95" width="18" height="16" rx="5" fill="none" stroke={c} strokeWidth="2.5"/>
        <rect x="82" y="91" width="18" height="20" rx="5" fill="none" stroke={c} strokeWidth="2.5"/>
        <rect x="102" y="91" width="18" height="20" rx="5" fill="none" stroke={c} strokeWidth="2.5"/>
        <rect x="122" y="95" width="16" height="16" rx="5" fill="none" stroke={c} strokeWidth="2.5"/>
        {/* Palm connecting the knuckles */}
        <rect x="62" y="109" width="76" height="30" rx="8" fill="none" stroke={c} strokeWidth="2.5"/>
        {/* Wrist */}
        <path d="M 72 139 L 72 158 Q 72 165 100 165 Q 128 165 128 158 L 128 139" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>

        {/* ── THUMB POINTING UP ── */}
        {/* Thumb base from side of fist */}
        <path d="M 62 120 Q 50 118 46 108 Q 43 96 48 82 Q 52 70 58 58 Q 62 48 65 38"
          fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
        {/* Thumb outline — right side */}
        <path d="M 62 120 Q 56 118 58 105 Q 60 90 64 75 Q 68 60 72 45"
          fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Thumb tip flat cap */}
        <path d="M 65 38 Q 69 34 72 45" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Thumb tip dot */}
        <circle cx="68" cy="40" r="4" fill={c}/>
        {/* Thumb knuckle crease */}
        <path d="M 50 95 Q 57 93 62 97" fill="none" stroke={c} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round"/>

        {/* Wrist landmark dot */}
        <circle cx="100" cy="152" r="4" fill={c}/>
      </svg>
    );
  }

  // Pinch — Hollow Purple
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" className="gesture-svg">
      <defs>
        <radialGradient id="glow-hp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#glow-hp)" />

      {/* ── PALM ── */}
      <rect x="72" y="115" width="56" height="44" rx="10" fill="none" stroke={c} strokeWidth="2.5"/>
      {/* Wrist */}
      <path d="M 82 159 L 82 172 Q 82 178 100 178 Q 118 178 118 172 L 118 159"
        fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>

      {/* ── INDEX FINGER — extended, curves down to pinch point ── */}
      {/* Left edge */}
      <path d="M 82 115 Q 80 96 76 80 Q 72 66 74 56"
        fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Right edge */}
      <path d="M 96 115 Q 94 96 90 80 Q 86 66 84 56"
        fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Fingertip cap */}
      <path d="M 74 56 Q 79 48 84 56" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>

      {/* ── THUMB — sweeps across to meet index tip ── */}
      {/* Outer edge */}
      <path d="M 72 130 Q 56 124 52 112 Q 48 98 54 84 Q 60 70 72 60 Q 76 56 79 52"
        fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Inner edge */}
      <path d="M 72 122 Q 60 117 58 106 Q 56 94 62 82 Q 67 72 76 63"
        fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Thumb tip cap */}
      <path d="M 79 52 Q 81 48 76 63" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>

      {/* ── PINCH CONTACT POINT ── */}
      <circle cx="79" cy="54" r="10" fill="none" stroke={c} strokeWidth="2" strokeDasharray="4,3"/>
      <circle cx="79" cy="54" r="4" fill={c}/>

      {/* ── CURLED MIDDLE, RING, PINKY ── shown as bumps over palm ── */}
      {/* Middle — small arc peeking above palm */}
      <path d="M 100 115 Q 100 104 104 98 Q 108 92 110 98 Q 112 104 110 115"
        fill="none" stroke={c} strokeWidth="2" strokeOpacity="0.65" strokeLinecap="round"/>
      {/* Ring */}
      <path d="M 112 115 Q 113 106 116 101 Q 119 96 121 102 Q 123 108 122 115"
        fill="none" stroke={c} strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
      {/* Pinky */}
      <path d="M 121 115 Q 122 108 124 104 Q 126 100 127 105 Q 128 110 127 115"
        fill="none" stroke={c} strokeWidth="1.8" strokeOpacity="0.35" strokeLinecap="round"/>

      {/* Wrist landmark dot */}
      <circle cx="100" cy="168" r="4" fill={c}/>
    </svg>
  );
};

const ChakraParticles = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.2 - Math.random() * 0.5,
      alpha: 0.1 + Math.random() * 0.5,
      color: ['#38bdf8','#a78bfa','#fb923c','#c084fc'][Math.floor(Math.random()*4)]
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} className="chakra-particles" />;
};



const Tutorial = ({ onStart }) => {
  const [selectedJutsu, setSelectedJutsu] = useState(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 100);
    const t2 = setTimeout(() => setCardsVisible(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="tutorial-root">
      <ChakraParticles />

      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Hero Section */}
      <header className={`hero ${heroVisible ? 'visible' : ''}`}>
        <h1 className="hero-title">
          <a
            href="https://github.com/ubp-as/Naruto-Jutsu-Visualizer"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-title-link"
          >
            <span className="hero-title-en">Jutsu-Visualizer</span>
          </a>
        </h1>
        <p className="hero-subtitle">
          Use your hands to cast real-time jutsu effects.<br />
          Point your webcam — your chakra awaits.
        </p>

        <div className="hero-stats">
          <div className="stat"><span className="stat-num">4</span><span className="stat-label">Jutsu</span></div>
          <div className="stat-divider"/>
          <div className="stat"><span className="stat-num">2</span><span className="stat-label">Anime Series</span></div>
          <div className="stat-divider"/>
          <div className="stat"><span className="stat-num">60fps</span><span className="stat-label">Real-Time</span></div>
        </div>
      </header>

      {/* Section label */}
      <div className={`section-label ${cardsVisible ? 'visible' : ''}`}>
        <span className="section-line" />
        <span>SELECT TECHNIQUE</span>
        <span className="section-line" />
      </div>

      {/* Jutsu Grid */}
      <div className={`jutsu-grid ${cardsVisible ? 'visible' : ''}`}>
        {jutsuData.map((jutsu, i) => (
          <button
            key={jutsu.id}
            className="jutsu-card"
            onClick={() => setSelectedJutsu(jutsu)}
            style={{ '--c': jutsu.color, '--glow': jutsu.glow, animationDelay: `${i * 0.08}s` }}
          >
            <div className="card-anime-tag">{jutsu.anime}</div>
            <div className="card-illustration">
              <GestureIllustration jutsu={jutsu} size={110} />
            </div>
            <div className="card-body">
              <div className="card-kanji">{jutsu.kanji}</div>
              <h3 className="card-name">{jutsu.name}</h3>
              <div className="card-meta">
                <span className="card-gesture-tag">{jutsu.gesture}</span>
              </div>
            </div>
            <div className="card-footer">
              <span className="card-hand">{jutsu.hand === 'either' ? 'Either Hand' : `${jutsu.hand.charAt(0).toUpperCase() + jutsu.hand.slice(1)} Hand`}</span>
              <span className="card-arrow">→</span>
            </div>
            <div className="card-glow-border" />
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className={`cta-section ${cardsVisible ? 'visible' : ''}`}>
        <button className="launch-btn" onClick={() => onStart()}>
          <span className="launch-icon">⦿</span>
          <span className="launch-text">
            <span className="launch-main">Activate Webcam</span>
            <span className="launch-sub">All jutsu available simultaneously</span>
          </span>
        </button>
        <p className="cta-hint">
          Click any jutsu above to learn the gesture first
        </p>
      </div>

      {/* Modal */}
      {selectedJutsu && (
        <div className="modal-backdrop" onClick={() => setSelectedJutsu(null)}>
          <div
            className="modal"
            style={{ '--c': selectedJutsu.color, '--glow': selectedJutsu.glow }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedJutsu(null)}>✕</button>

            <div className="modal-top">
              <div className="modal-illustration">
                <GestureIllustration jutsu={selectedJutsu} size={200} />
              </div>
              <div className="modal-info">
                <div className="modal-anime">{selectedJutsu.anime}</div>
                <div className="modal-kanji">{selectedJutsu.kanji}</div>
                <h2 className="modal-name">{selectedJutsu.name}</h2>
                <p className="modal-desc">{selectedJutsu.description}</p>
                <div className="modal-tags">
                  <span className="modal-tag">{selectedJutsu.gesture}</span>
                  <span className="modal-tag">
                    {selectedJutsu.hand === 'either' ? 'Either Hand' : `${selectedJutsu.hand.charAt(0).toUpperCase() + selectedJutsu.hand.slice(1)} Hand`}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-steps">
              <h4 className="steps-heading">HOW TO PERFORM</h4>
              <ol className="steps-list">
                {selectedJutsu.instructions.map((step, idx) => (
                  <li key={idx} style={{ '--step-color': selectedJutsu.color }}>
                    <span className="step-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="modal-tip">
              <span className="tip-icon">⚡</span>
              {selectedJutsu.hand === 'either'
                ? 'You can use either hand for this technique — try both!'
                : `Use your ${selectedJutsu.hand.toUpperCase()} hand only for this jutsu.`}
            </div>

            <button
              className="modal-launch-btn"
              onClick={() => onStart(selectedJutsu.id)}
            >
              Practice {selectedJutsu.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tutorial;
