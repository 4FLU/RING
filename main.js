/**
 * ===================================================================
 * RIFFA & NOUFAL — LOVE STORY ALBUM (main.js)
 * Master Orchestrator: Lenis Smooth Scroll, GSAP ScrollTrigger Scrub,
 * Ambient Particle Canvas, Web Audio Synthesizer, and 3D Scenes.
 * ===================================================================
 */

import { RingScene } from './ring.js';
import { BookScene, defaultAlbumData } from './book.js';

/**
 * ================= EASY CUSTOMIZATION CONFIG =================
 * Change names, dates, quotes, and photos right here!
 */
export const STORY_CONFIG = {
  couple: {
    partner1: 'Riffa',
    partner1Tagline: 'My Soulmate',
    partner1Subtext: 'The Light in My Life',
    partner2: 'Noufal',
    partner2Tagline: 'My Always',
    partner2Subtext: 'My Anchor & My Heart',
    shortDate: 'October 2024'
  },
  // Photos gallery list - easily add, remove, or change!
  photos: [
    'images/img1.jpg',
    'images/img2.jpg',
    'images/img3.jpg',
    'images/img4.jpg'
  ]
};

// Application State
let ringScene = null;
let bookScene = null;
let lenis = null;
let isAudioEnabled = true;
let audioCtx = null;

// DOM Elements
const loaderScreen = document.getElementById('loader-screen');
const loaderBar = document.getElementById('loader-bar');
const loaderPercent = document.getElementById('loader-percent');

const ringCanvas = document.getElementById('ring-canvas');
const bookCanvas = document.getElementById('book-canvas');
const particleCanvas = document.getElementById('particle-canvas');

const heroSection = document.getElementById('hero-section');
const nameRiffa = document.getElementById('name-riffa');
const nameNoufal = document.getElementById('name-noufal');
const heroEmblem = document.getElementById('hero-emblem');
const scrollIndicator = document.getElementById('scroll-indicator');

const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const btnCloseBook = document.getElementById('btn-close-book');
const pageCounterText = document.getElementById('page-counter-text');
const counterDots = document.getElementById('counter-dots');
const bookHint = document.getElementById('book-hint');
const bookFinishActions = document.getElementById('book-finish-actions');

const soundToggleBtn = document.getElementById('sound-toggle');
const btnBackToTop = document.getElementById('btn-back-to-top');

/* ===================================================================
   1. AMBIENT PARTICLES (STARDUST & FLOATING GLOW HEARTS)
   =================================================================== */
class AmbientParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.count = window.innerWidth <= 768 ? 24 : 52;
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 0.8,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.6 + 0.2,
        isHeart: Math.random() < 0.2, // 20% delicate floating hearts
        pulseSpeed: Math.random() * 0.02 + 0.01,
        angle: Math.random() * Math.PI * 2
      });
    }

    this.render();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  drawHeart(ctx, x, y, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size * 0.5, size * 0.5);
    ctx.fillStyle = `rgba(232, 162, 170, ${opacity * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-3, -3, -6, 0, 0, 6);
    ctx.bezierCurveTo(6, 0, 3, -3, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.angle += p.pulseSpeed;

      // Wrap around
      if (p.y < -20) {
        p.y = this.canvas.height + 20;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -20) p.x = this.canvas.width + 20;
      if (p.x > this.canvas.width + 20) p.x = -20;

      const currentOpacity = p.opacity + Math.sin(p.angle) * 0.2;

      if (p.isHeart) {
        this.drawHeart(this.ctx, p.x, p.y, p.size, Math.max(0.1, currentOpacity));
      } else {
        // Shimmering Golden Dust
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(223, 190, 130, ${Math.max(0.05, currentOpacity)})`;
        this.ctx.shadowColor = 'rgba(223, 190, 130, 0.4)';
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    requestAnimationFrame(this.render.bind(this));
  }
}

/* ===================================================================
   2. PROCEDURAL WEB AUDIO SYNTHESIZER (PAPER TURN SOUND)
   =================================================================== */
function playPageTurnSound() {
  if (!isAudioEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Realistic paper rustle / whoosh using filtered noise sweep
    const bufferSize = audioCtx.sampleRate * 0.35; // 350ms swoosh
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    // Bandpass filter for authentic paper texture
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.3);
    filter.Q.setValueAtTime(3.0, audioCtx.currentTime);

    // Gain envelope
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.06);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    whiteNoise.start();
    whiteNoise.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.debug('[Audio] Synthesizer muted or unsupported:', err);
  }
}

/* ===================================================================
   3. CUSTOM CURSOR
   =================================================================== */
function setupCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const follower = document.getElementById('custom-cursor-follower');
  if (!cursor || !follower) return;

  window.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    follower.style.left = `${e.clientX}px`;
    follower.style.top = `${e.clientY}px`;
  });

  const interactiveElements = document.querySelectorAll('button, a, .book-3d-stage, .scroll-indicator');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/* ===================================================================
   4. LENIS SMOOTH SCROLLING + GSAP INTEGRATION
   =================================================================== */
function setupSmoothScrolling() {
  if (typeof Lenis === 'undefined') return;

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: isTouch ? 1.0 : 1.2
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/* ===================================================================
   5. HERO REVEAL & SCROLL ANIMATION (SECTION 1 & 2)
   =================================================================== */
function playHeroCinematicReveal() {
  // Hide loader
  loaderScreen.classList.add('fade-out');
  document.body.classList.remove('is-loading');

  // Trigger 3D Ring rise and scale
  ringScene.playCinematicEntrance();

  // Timeline for Names and Hero Text
  const heroTl = gsap.timeline({ delay: 0.8 });
  const isMobile = window.innerWidth <= 768;

  // Blur-to-sharp reveal: On desktop slides horizontally, on mobile slides vertically
  // Riffa reveal
  heroTl.fromTo(nameRiffa, 
    { opacity: 0, x: isMobile ? 0 : -50, y: isMobile ? -25 : 0, filter: 'blur(16px)' },
    { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 2.2, ease: 'expo.out' },
    0
  );

  // Noufal reveal
  heroTl.fromTo(nameNoufal, 
    { opacity: 0, x: isMobile ? 0 : 50, y: isMobile ? 25 : 0, filter: 'blur(16px)' },
    { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 2.2, ease: 'expo.out' },
    0.15
  );

  // Center Emblem below ring
  heroTl.fromTo(heroEmblem,
    { opacity: 0, y: isMobile ? 15 : 30, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, ease: 'power2.out' },
    0.8
  );

  // Scroll Indicator
  heroTl.to(scrollIndicator, {
    opacity: 1,
    duration: 1.4,
    ease: 'power2.out'
  }, 1.2);
}

function setupScrollScrubTransition() {
  // Scrub animation connecting Section 1 Hero to Section 2 Book
  gsap.registerPlugin(ScrollTrigger);

  const heroWrapper = document.getElementById('hero-section');
  const ringCanvasWrapper = document.getElementById('ring-3d-wrapper');
  const isMobile = window.innerWidth <= 768;

  // Scrub timeline: As user scrolls down, hero fades and blurs out
  const scrubTl = gsap.timeline({
    scrollTrigger: {
      trigger: heroWrapper,
      start: 'top top',
      end: isMobile ? '+=60%' : '+=100%',
      scrub: 1.1,
      onUpdate: (self) => {
        // Send scroll progress to ring scene to spin faster and drift
        ringScene.updateScrollProgress(self.progress);

        // Optimization: pause ring rendering once scrolled completely past
        if (self.progress >= 0.98) {
          ringScene.pause();
        } else {
          ringScene.resume();
        }
      }
    }
  });

  // Riffa drifts away: left on desktop, up on mobile
  scrubTl.to(nameRiffa, {
    x: isMobile ? 0 : -90,
    y: isMobile ? -60 : 0,
    opacity: 0,
    filter: 'blur(20px)',
    ease: 'power1.in'
  }, 0);

  // Noufal drifts away: right on desktop, down on mobile
  scrubTl.to(nameNoufal, {
    x: isMobile ? 0 : 90,
    y: isMobile ? 60 : 0,
    opacity: 0,
    filter: 'blur(20px)',
    ease: 'power1.in'
  }, 0);

  // Center emblem and scroll prompt fade out
  scrubTl.to([heroEmblem, scrollIndicator], {
    opacity: 0,
    filter: 'blur(12px)',
    y: 40,
    ease: 'power1.in'
  }, 0);

  // Ring 3D canvas fades out
  scrubTl.to(ringCanvasWrapper, {
    opacity: 0,
    filter: 'blur(15px)',
    ease: 'power1.in'
  }, 0);

  // Smooth entrance for Book Section
  const bookHeader = document.getElementById('book-header');
  const bookStage = document.getElementById('book-stage');
  const bookControls = document.getElementById('book-controls');

  gsap.fromTo([bookHeader, bookStage, bookControls], 
    { opacity: 0, y: 60, filter: 'blur(14px)' },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      stagger: 0.15,
      duration: 1.6,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: '#book-section',
        start: 'top 75%'
      }
    }
  );
}

/* ===================================================================
   6. BOOK UI CONTROLS & SYNCHRONIZATION
   =================================================================== */
function setupBookUI() {
  // Generate dot indicators
  counterDots.innerHTML = '';
  // Dot 0 = Closed cover, Dots 1..N = Spreads
  for (let i = 0; i <= defaultAlbumData.length; i++) {
    const dot = document.createElement('div');
    dot.className = `counter-dot ${i === 0 ? 'active' : ''}`;
    dot.dataset.spread = i;
    dot.addEventListener('click', () => {
      if (i === 0) bookScene.closeBook();
      else {
        if (!bookScene.isOpen) bookScene.openBook();
        // Step to target
        let diff = i - bookScene.currentSpread;
        if (diff > 0) {
          while (diff-- > 0) bookScene.nextPage();
        } else if (diff < 0) {
          while (diff++ < 0) bookScene.prevPage();
        }
      }
    });
    counterDots.appendChild(dot);
  }

  // Buttons
  btnPrevPage.addEventListener('click', () => bookScene.prevPage());
  btnNextPage.addEventListener('click', () => bookScene.nextPage());
  btnCloseBook.addEventListener('click', () => bookScene.closeBook());

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      bookScene.nextPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      bookScene.prevPage();
    }
  });

  // Romantic Background Audio Controller (BGaudio.mp3)
  const bgAudio = document.getElementById('bg-audio');

  const updateAudioUI = () => {
    const soundOnIcon = soundToggleBtn.querySelector('.sound-icon-on');
    const soundOffIcon = soundToggleBtn.querySelector('.sound-icon-off');
    const label = soundToggleBtn.querySelector('.sound-label');

    if (isAudioEnabled) {
      soundOnIcon.style.display = 'block';
      soundOffIcon.style.display = 'none';
      label.textContent = 'Music On';
      if (bgAudio) {
        bgAudio.volume = 0.55;
        bgAudio.play().catch(e => console.debug('[Audio] Gesture needed:', e));
      }
    } else {
      soundOnIcon.style.display = 'none';
      soundOffIcon.style.display = 'block';
      label.textContent = 'Muted';
      if (bgAudio) {
        bgAudio.pause();
      }
    }
  };

  soundToggleBtn.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    updateAudioUI();
    if (isAudioEnabled) playPageTurnSound();
  });

  // Start background romantic music upon user's first click or touch interaction
  const unlockAudioOnGesture = () => {
    if (isAudioEnabled && bgAudio && bgAudio.paused) {
      bgAudio.volume = 0.55;
      bgAudio.play().then(() => {
        document.removeEventListener('click', unlockAudioOnGesture);
        document.removeEventListener('touchstart', unlockAudioOnGesture);
      }).catch(() => {});
    }
  };
  document.addEventListener('click', unlockAudioOnGesture);
  document.addEventListener('touchstart', unlockAudioOnGesture);

  // Scroll to book indicator
  scrollIndicator.addEventListener('click', () => {
    if (lenis) {
      lenis.scrollTo('#book-section', { offset: -40, duration: 1.8 });
    } else {
      document.getElementById('book-section').scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Back to Top button
  btnBackToTop.addEventListener('click', () => {
    if (lenis) {
      lenis.scrollTo(0, { duration: 2.2 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function handleBookStateChange(state) {
  const { isOpen, currentSpread, totalSpreads } = state;

  // Update Page Counter Text
  if (!isOpen || currentSpread === 0) {
    pageCounterText.textContent = 'Closed Cover';
    btnPrevPage.disabled = true;
    btnNextPage.disabled = false;
    btnNextPage.querySelector('span').textContent = 'Open Book';
    bookHint.classList.remove('hidden');
    bookFinishActions.classList.remove('visible');
  } else {
    pageCounterText.textContent = `Spread ${currentSpread} of ${totalSpreads}`;
    btnPrevPage.disabled = false;
    btnNextPage.querySelector('span').textContent = 'Next';
    bookHint.classList.add('hidden');

    if (currentSpread >= totalSpreads) {
      btnNextPage.disabled = true;
      bookFinishActions.classList.add('visible');
    } else {
      btnNextPage.disabled = false;
      bookFinishActions.classList.remove('visible');
    }
  }

  // Update Dots
  const dots = counterDots.querySelectorAll('.counter-dot');
  dots.forEach((dot, index) => {
    if (index === currentSpread) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

/* ===================================================================
   7. INITIALIZATION LIFECYCLE
   =================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // 1. Ambient Background Particles
  new AmbientParticles(particleCanvas);

  // 2. Custom cursor
  setupCustomCursor();

  // 3. Lenis Smooth Scroll
  setupSmoothScrolling();

  // 4. UI Controls
  setupBookUI();

  // 5. Initialize 3D Book Scene
  bookScene = new BookScene(bookCanvas, {
    albumData: defaultAlbumData,
    playSound: playPageTurnSound,
    onStateChange: handleBookStateChange
  });

  // 6. Initialize 3D Ring Scene with Loader Progress
  let simulatedProgress = 20;
  const progressTimer = setInterval(() => {
    if (simulatedProgress < 90) {
      simulatedProgress += 15;
      loaderBar.style.width = `${simulatedProgress}%`;
      loaderPercent.textContent = `${simulatedProgress}%`;
    }
  }, 120);

  ringScene = new RingScene(
    ringCanvas,
    (percent) => {
      loaderBar.style.width = `${percent}%`;
      loaderPercent.textContent = `${percent}%`;
    },
    () => {
      // Ring loaded
      clearInterval(progressTimer);
      loaderBar.style.width = '100%';
      loaderPercent.textContent = '100%';

      setTimeout(() => {
        playHeroCinematicReveal();
        setupScrollScrubTransition();
      }, 500);
    }
  );
});

