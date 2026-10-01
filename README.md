# Riffa & Noufal — Romantic 3D Love Story Photo Album 💍📖

A cinematic, couple-friendly, single-page love story website built with **Three.js**, **GSAP & ScrollTrigger**, and **Lenis**. Features a luxury 3D ring hero introduction with gold & diamond lighting reflections, and an interactive procedural 3D hardcover photo album with realistic page-turning physics and memories.

---

## 📁 Project Structure

```text
ROUND/
├── index.html          # Semantic HTML5 layout, loader, hero typography & book stage
├── style.css           # Romantic royal wine, gold foil & blush styling, responsive UI
├── main.js             # Master orchestrator: Lenis, ScrollTrigger scrub, audio & state
├── ring.js             # Three.js 3D Ring scene, GLTFLoader & procedural solitaire fallback
├── book.js             # Procedural 3D hardcover book, dynamic canvas spreads & page flips
├── package.json        # Vite dev server & production build config
├── BGaudio.mp3         # Romantic background music soundtrack
├── images/             # Couple photo gallery
│   ├── img1.jpg        # The Proposal (Pier with blue florals)
│   ├── img2.jpg        # Her radiant smile in the garden
│   ├── img3.jpg        # Seaside turquoise waters
│   └── img4.jpg        # Couple together hand-in-hand
├── models/             # 3D models directory
│   └── RING.glb        # Place your 3D ring model here!
└── audio/              # Background soundtrack directory (BGaudio.mp3)
```

---

## 🚀 Quick Start / How to Run

You can run the project using **Vite**, **Python**, or **Node / npx**:

### Option 1: Using Vite (Recommended)
```bash
# In the ROUND folder:
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Option 2: Using Python HTTP Server (Zero Install)
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

### Option 3: Using npx serve
```bash
npx serve .
```

---

## 💍 Where to Place `RING.glb`
Place your 3D ring GLTF/GLB file into:
```text
ROUND/models/RING.glb
```
> **Smart Fallback Included**: If `RING.glb` is not present or while you are testing, the engine automatically generates and renders an exquisite **procedural 18K yellow gold engagement ring** with a multi-faceted brilliant diamond solitaire and 6-prong crown, so the site works immediately without any missing asset errors!

---

## 📷 How to Add / Change Photos & Captions

Open [book.js](file:///c:/Users/aflua/Documents/WEB/ROUND/book.js) or [main.js](file:///c:/Users/aflua/Documents/WEB/ROUND/main.js).

Look at `defaultAlbumData` in `book.js`:
```javascript
export const defaultAlbumData = [
  {
    spreadIndex: 1,
    leftPage: {
      type: 'text',
      title: 'Our Journey',
      subtitle: 'Where Forever Began',
      quote: '“In you, I’ve found the love of my life...”',
      body: 'From the very first conversation...',
      date: 'Est. Forever'
    },
    rightPage: {
      type: 'photo',
      src: 'images/img1.jpg',
      title: 'The Proposal',
      subtitle: 'On Bended Knee',
      caption: 'Under the coastal breeze and blooming blue florals...',
      date: 'October 2024'
    }
  },
  // Add as many pages or spreads as you wish!
];
```

To add another photo:
1. Save your image into `images/` (e.g. `images/img5.jpg`).
2. Add a new spread object to `defaultAlbumData` with `src: 'images/img5.jpg'`.

---

## 🎨 How to Customize Names, Captions & Colors

### 1. Changing Names & Titles
In [index.html](file:///c:/Users/aflua/Documents/WEB/ROUND/index.html):
- Edit lines with `<h1 class="hero-name">Riffa</h1>` and `<h1 class="hero-name">Noufal</h1>`.
- Edit the cover title inside [book.js](file:///c:/Users/aflua/Documents/WEB/ROUND/book.js#L260): `ctx.fillText('RIFFA & NOUFAL', canvas.width / 2, 450);`.

### 2. Changing Color Palette
In [style.css](file:///c:/Users/aflua/Documents/WEB/ROUND/style.css#L7-L20):
```css
:root {
  --bg-dark: #0b0309;           /* Deep background */
  --bg-wine: #180613;           /* Romantic wine tone */
  --accent-gold: #dfbe82;       /* Champagne gold */
  --accent-blush: #e8a2aa;      /* Soft rose blush */
  --text-primary: #fff9f5;      /* Ivory white */
}
```

---

## ✨ Features Included
- **Three.js Ring Hero**: Smooth 2.8s entrance ease, gentle sinusoidal floating, PBR gold shine, and gemstone sparkling highlights.
- **ScrollTrigger Scrub**: Continuous scroll scrub fading, blurring, and parting names apart as user scrolls down.
- **Procedural 3D Hardcover Book**: Leather velvet cover with gold foil embossed titles and filigree, realistic page curls, drop shadows, and turning physics.
- **Interactive Reading**: Click on book, use on-screen Next/Prev controls, keyboard arrows (`←` / `→`), or touch swipe.
- **Synthesized Page-Turn Audio**: Authentic paper rustle via Web Audio API (zero audio file dependencies, with Mute/Unmute toggle).
- **Romantic Background**: Canvas-driven gold stardust and gentle rising heart bokeh particles.
- **Fully Responsive**: Adapts smoothly to mobile, tablet, and desktop viewports.

