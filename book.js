/**
 * ===================================================================
 * RIFFA & NOUFAL — 3D STORY BOOK (book.js)
 * Procedural Hardcover 3D Album with Real-Time Canvas Page Texturing,
 * Photorealistic Spine & Page-Turning Physics, Sound Effects, and Controls.
 * ===================================================================
 */

/**
 * DEFAULT ALBUM CONFIGURATION
 * Add, remove, or modify photos and captions easily here!
 */
export const defaultAlbumData = [
  {
    spreadIndex: 1,
    leftPage: {
      type: 'text',
      title: 'Our Journey',
      subtitle: 'Where Forever Began',
      quote: '“In you, I’ve found the love of my life and my closest, truest friend.”',
      body: 'From the very first conversation to the quiet moments in between, every heartbeat has led us to this chapter. Here are the footprints of our shared adventure.',
      date: 'Est. Forever'
    },
    rightPage: {
      type: 'photo',
      src: 'images/img1.jpg',
      title: 'The Proposal',
      subtitle: 'On Bended Knee',
      caption: 'Under the coastal breeze and blooming blue florals, with trembling hands and a full heart, I asked for forever — and she said yes.',
      date: 'October 2024'
    }
  },
  {
    spreadIndex: 2,
    leftPage: {
      type: 'photo',
      src: 'images/img2.jpg',
      title: 'Her Radiant Grace',
      subtitle: 'Sunlit Serenity',
      caption: 'Her smile softens the world around her. In the quiet green canopy, looking at you, I knew tranquility had a name.',
      date: 'Cherished Memories'
    },
    rightPage: {
      type: 'photo',
      src: 'images/img3.jpg',
      title: 'By The Turquoise Sea',
      subtitle: 'Whispering Waves',
      caption: 'Standing by the turquoise tide and emerald cliffs. Every destination is extraordinary as long as you are by my side.',
      date: 'Paradise Together'
    }
  },
  {
    spreadIndex: 3,
    leftPage: {
      type: 'photo',
      src: 'images/img4.jpg',
      title: 'Two Hearts As One',
      subtitle: 'Pure Joy',
      caption: 'Walking together into every tomorrow. Hand in hand, soul to soul, ready for whatever life brings.',
      date: 'Our Unbreakable Bond'
    },
    rightPage: {
      type: 'closing',
      title: 'Forever Begins Here',
      subtitle: 'Riffa & Noufal',
      quote: '“Whatever our souls are made of, his and mine are the same.”',
      body: 'Thank you for being my anchor, my sweetest smile, and my greatest blessing. To a lifetime of laughter and everlasting devotion.',
      heart: '♥'
    }
  }
];

export class BookScene {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.albumData = options.albumData || defaultAlbumData;
    this.onPageChange = options.onPageChange || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.playSound = options.playSound || (() => {});

    // State
    this.isOpen = false;
    this.currentSpread = 0; // 0 = Closed cover, 1..N = Spreads
    this.totalSpreads = this.albumData.length;
    this.isAnimating = false;
    this.isActive = true;

    // Three.js instances
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.bookGroup = null;
    this.coverPivot = null;
    this.leafGroups = []; // Array of page meshes

    // Dimensions
    this.pageWidth = 3.2;
    this.pageHeight = 4.4;
    this.bookThickness = 0.4;
    this.coverThickness = 0.08;

    // Raycasting for interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  async init() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 100);
    this.updateCameraForDevice();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    const maxPR = window.innerWidth <= 768 ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPR));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Balanced exposure to prevent bright glare on pages
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // 4. Lighting
    this.setupLighting();

    // 5. Build Procedural Book Structure
    this.bookScale = 1.0;
    await this.buildBook();
    this.updateDeviceSizing();

    // 6. Setup Interaction & Events
    this.setupEvents();

    // 7. Render Loop
    this.animate();

    this.onStateChange({
      isOpen: false,
      currentSpread: 0,
      totalSpreads: this.totalSpreads
    });
  }

  setupLighting() {
    // Soft, romantic ambient light with wine tone (gentle, non-glaring)
    const ambientLight = new THREE.AmbientLight(0x321623, 0.85);
    this.scene.add(ambientLight);

    // Main key light with soft shadow (moderate intensity to keep paper comfortable to read)
    const keyLight = new THREE.DirectionalLight(0xfff7ea, 1.2);
    keyLight.position.set(4, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.001;
    this.scene.add(keyLight);

    // Gentle rose rim light highlighting edges
    const rimLight = new THREE.DirectionalLight(0xd98294, 0.9);
    rimLight.position.set(-6, -2, -4);
    this.scene.add(rimLight);

    // Warm soft fill light (low intensity to avoid washing out paper)
    const fillLight = new THREE.DirectionalLight(0xc9a76d, 0.4);
    fillLight.position.set(0, 3, 7);
    this.scene.add(fillLight);
  }

  updateDeviceSizing() {
    if (!this.camera || !this.canvas) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      // Mobile portrait: scale book so full spread fits comfortably on mobile screens
      const targetScale = Math.min(0.66, Math.max(0.48, aspect * 0.72));
      this.bookScale = targetScale;
      this.camera.fov = 42;
      this.camera.position.set(0, 0.08, 8.4);
    } else if (aspect < 1.4) {
      // Tablet / Medium
      this.bookScale = 0.82;
      this.camera.fov = 38;
      this.camera.position.set(0, 0.1, 7.8);
    } else {
      // Desktop
      this.bookScale = 1.0;
      this.camera.fov = 36;
      this.camera.position.set(0, 0.1, 7.6);
    }

    if (this.bookGroup) {
      this.bookGroup.scale.set(this.bookScale, this.bookScale, this.bookScale);
      if (!this.isOpen) {
        this.bookGroup.position.x = - (this.pageWidth / 2) * this.bookScale;
      } else {
        this.bookGroup.position.x = 0;
      }
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  updateCameraForDevice() {
    this.updateDeviceSizing();
  }

  /**
   * Procedural Book Construction
   */
  async buildBook() {
    this.bookGroup = new THREE.Group();
    const W = this.pageWidth;
    const H = this.pageHeight;
    const T = this.bookThickness;
    const CT = this.coverThickness;

    // Centered closed book position
    this.bookGroup.rotation.set(0.36, -0.22, -0.04);
    this.bookGroup.position.set(- (W / 2) * this.bookScale, 0, 0);

    // Materials
    const leatherColor = 0x24071b; // Royal burgundy wine velvet
    const goldLeafColor = 0xd4af37; // Gold foil accent

    // Leather cover material
    const coverLeatherMaterial = new THREE.MeshPhysicalMaterial({
      color: leatherColor,
      roughness: 0.45,
      metalness: 0.15,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4
    });

    // Gold gilded paper edge material
    const paperEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfc285,
      roughness: 0.35,
      metalness: 0.65
    });

    // Interior page plain material (warm antique ivory)
    const pagePaperEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xf6f0e4,
      roughness: 0.7,
      metalness: 0.05
    });

    // 1. Back Cover (Resting at the very bottom)
    const backCoverGeo = new THREE.BoxGeometry(W + 0.1, H + 0.1, CT);
    const backCoverMesh = new THREE.Mesh(backCoverGeo, coverLeatherMaterial);
    backCoverMesh.position.set(W / 2, 0, -CT);
    backCoverMesh.receiveShadow = true;
    backCoverMesh.castShadow = true;
    this.bookGroup.add(backCoverMesh);

    // 2. Spine
    const spineGeo = new THREE.CylinderGeometry(0.12, 0.12, H + 0.1, 32, 1, false, Math.PI / 2, Math.PI);
    const spineMesh = new THREE.Mesh(spineGeo, coverLeatherMaterial);
    spineMesh.position.set(0, 0, 0);
    spineMesh.rotation.y = Math.PI / 2;
    spineMesh.castShadow = true;
    this.bookGroup.add(spineMesh);

    // 3. Gilded Base Block (Sits strictly underneath all leaves so it never occludes pages)
    const baseBlockGeo = new THREE.BoxGeometry(W, H, 0.05);
    const baseBlockMaterials = [
      paperEdgeMaterial, // right gilded edge
      pagePaperEdgeMat,  // left (spine side)
      paperEdgeMaterial, // top gilded edge
      paperEdgeMaterial, // bottom gilded edge
      pagePaperEdgeMat,  // front
      pagePaperEdgeMat   // back
    ];
    this.baseBlockMesh = new THREE.Mesh(baseBlockGeo, baseBlockMaterials);
    this.baseBlockMesh.position.set(W / 2, 0, -0.025);
    this.baseBlockMesh.receiveShadow = true;
    this.bookGroup.add(this.baseBlockMesh);

    // 4. Front Cover Pivot (Hinged at the spine x=0, rests on top of closed leaves)
    const leafCount = this.albumData.length;
    this.coverClosedZ = 0.02 + leafCount * 0.012 + CT / 2;
    this.coverPivot = new THREE.Group();
    this.coverPivot.position.set(0, 0, this.coverClosedZ);

    // Load images async
    const loadedImages = await this.preloadAlbumImages();

    // Generate Front Cover Canvas Texture (Gold Foil Typography & Ornate Borders)
    const frontCoverTexture = this.generateFrontCoverTexture();
    // Inside front cover displays spread 1 leftPage (Intro & Romantic Dedication)
    const frontInnerTexture = await this.createPageCanvasTexture(
      this.albumData[0] ? this.albumData[0].leftPage : null,
      loadedImages,
      true
    );

    const frontCoverMaterials = [
      coverLeatherMaterial, // right
      coverLeatherMaterial, // left
      coverLeatherMaterial, // top
      coverLeatherMaterial, // bottom
      new THREE.MeshStandardMaterial({
        map: frontCoverTexture,
        roughness: 0.4,
        metalness: 0.25
      }), // front (exterior)
      new THREE.MeshStandardMaterial({
        map: frontInnerTexture,
        roughness: 0.65,
        metalness: 0.05
      })  // back (interior lining facing camera when open)
    ];

    const frontCoverGeo = new THREE.BoxGeometry(W + 0.1, H + 0.1, CT);
    const frontCoverMesh = new THREE.Mesh(frontCoverGeo, frontCoverMaterials);
    frontCoverMesh.position.set(W / 2, 0, 0);
    frontCoverMesh.castShadow = true;
    frontCoverMesh.receiveShadow = true;
    this.coverPivot.add(frontCoverMesh);
    this.bookGroup.add(this.coverPivot);

    // 5. Procedural Interactive Turning Leaves (Spreads)
    await this.generateSpreads(loadedImages);

    this.scene.add(this.bookGroup);
  }

  /**
   * Generates high-res canvas texture for the luxury leather & gold foil front cover
   */
  generateFrontCoverTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');

    // Rich burgundy velvet gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#2d0822');
    bgGrad.addColorStop(0.5, '#1e0517');
    bgGrad.addColorStop(1, '#11020d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle leather texture noise / vignette
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, 40, canvas.height); // Spine shadow edge

    // Gold Foil Gradient
    const goldGrad = ctx.createLinearGradient(150, 150, 850, 1250);
    goldGrad.addColorStop(0, '#fff4dc');
    goldGrad.addColorStop(0.3, '#dfbe82');
    goldGrad.addColorStop(0.7, '#a57930');
    goldGrad.addColorStop(1, '#f7dfaa');

    ctx.strokeStyle = goldGrad;
    ctx.fillStyle = goldGrad;

    // Double Ornate Gold Foil Border
    ctx.lineWidth = 6;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);

    // Victorian Corner Accents
    this.drawCornerFiligree(ctx, 60, 60, 1, 1);
    this.drawCornerFiligree(ctx, canvas.width - 60, 60, -1, 1);
    this.drawCornerFiligree(ctx, 60, canvas.height - 60, 1, -1);
    this.drawCornerFiligree(ctx, canvas.width - 60, canvas.height - 60, -1, -1);

    // Monogram Crest at top
    ctx.font = '36px "Great Vibes", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('Our Love Chronicle', canvas.width / 2, 280);

    // Decorative emblem
    ctx.font = '28px "Inter", sans-serif';
    ctx.fillText('❦', canvas.width / 2, 330);

    // Couple Names
    ctx.font = '600 68px "Cormorant Garamond", serif';
    ctx.fillText('RIFFA & NOUFAL', canvas.width / 2, 450);

    // Divider Line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 180, 490);
    ctx.lineTo(canvas.width / 2 + 180, 490);
    ctx.stroke();

    // Subtitle
    ctx.font = '300 28px "Inter", sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillText('OUR STORY', canvas.width / 2, 550);

    // Heart Emblem
    ctx.font = '48px serif';
    ctx.fillStyle = '#e8a2aa';
    ctx.fillText('♥', canvas.width / 2, 680);

    // Quote
    ctx.fillStyle = goldGrad;
    ctx.font = 'italic 30px "Cormorant Garamond", serif';
    ctx.fillText('“Two souls, one unending promise.”', canvas.width / 2, 790);

    // Bottom Filigree
    ctx.font = '24px "Inter", sans-serif';
    ctx.fillText('✦   ·   FOREVER   ·   ✦', canvas.width / 2, 1260);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  drawCornerFiligree(ctx, x, y, sx, sy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 15);
    ctx.lineTo(60, 15);
    ctx.arc(60, 40, 25, -Math.PI / 2, 0);
    ctx.moveTo(15, 15);
    ctx.lineTo(15, 60);
    ctx.arc(40, 60, 25, Math.PI, Math.PI / 2);
    ctx.stroke();
    ctx.restore();
  }

  generateEndpaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    // Warm antique cream marbled endpaper
    ctx.fillStyle = '#ede4d4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(168, 130, 72, 0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.arc(i, canvas.height / 2, 180, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Builds the individual turning leaf meshes
   */
  async generateSpreads(loadedImages) {
    const W = this.pageWidth;
    const H = this.pageHeight;

    // Number of turning leaves:
    // When cover opens: Spread 1 is visible (Left = Inside Cover, Right = Leaf 0 Front).
    // When Leaf 0 turns: Spread 2 is visible (Left = Leaf 0 Back, Right = Leaf 1 Front).
    // When Leaf 1 turns: Spread 3 is visible (Left = Leaf 1 Back, Right = Leaf 2 Front / End).
    const leafCount = this.albumData.length;

    for (let i = 0; i < leafCount; i++) {
      const currentSpread = this.albumData[i];
      const nextSpread = (i + 1 < this.albumData.length) ? this.albumData[i + 1] : null;

      // Front face: visible on the right when this leaf has not turned yet
      const frontPageData = currentSpread ? currentSpread.rightPage : null;
      const frontTex = await this.createPageCanvasTexture(frontPageData, loadedImages, false);

      // Back face: visible on the left after this leaf turns over
      const backPageData = nextSpread ? nextSpread.leftPage : (currentSpread ? currentSpread.leftPage : null);
      const backTex = await this.createPageCanvasTexture(backPageData, loadedImages, true);

      const leafPivot = new THREE.Group();
      // Precise leaf stacking heights so pages never clip or occlude each other
      const initialZ = 0.015 + (leafCount - 1 - i) * 0.012;
      const flippedZ = 0.015 + i * 0.012;
      leafPivot.position.set(0, 0, initialZ);

      const leafMaterials = [
        new THREE.MeshStandardMaterial({ color: 0xc8a463, roughness: 0.6 }), // right gilded edge
        new THREE.MeshStandardMaterial({ color: 0xdecbb1, roughness: 0.8 }), // left edge
        new THREE.MeshStandardMaterial({ color: 0xc8a463, roughness: 0.6 }), // top gilded edge
        new THREE.MeshStandardMaterial({ color: 0xc8a463, roughness: 0.6 }), // bottom gilded edge
        new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }), // Front face (+Z)
        new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide })   // Back face (-Z)
      ];

      const leafGeo = new THREE.BoxGeometry(W, H, 0.012);
      const leafMesh = new THREE.Mesh(leafGeo, leafMaterials);
      leafMesh.position.set(W / 2, 0, 0);
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;

      leafMesh.userData = { leafIndex: i };

      leafPivot.add(leafMesh);
      this.bookGroup.add(leafPivot);
      this.leafGroups.push({ pivot: leafPivot, mesh: leafMesh, initialZ, flippedZ });
    }
  }

  async preloadAlbumImages() {
    const cache = {};
    const promises = [];

    const loadImg = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { cache[url] = img; resolve(img); };
        img.onerror = () => { cache[url] = null; resolve(null); };
        img.src = url;
      });
    };

    this.albumData.forEach((spread) => {
      [spread.leftPage, spread.rightPage].forEach((page) => {
        if (page && page.src && !cache[page.src]) {
          promises.push(loadImg(page.src));
        }
      });
    });

    await Promise.all(promises);
    return cache;
  }

  /**
   * Render artistic page canvas with elegant serif typography,
   * vintage photo frame, drop shadows, dates, and romantic accents.
   */
  async createPageCanvasTexture(pageData, imageCache, isBackFace = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');

    // Warm, Soft, Eye-Friendly Antique Matte Parchment (Non-glaring)
    const bgGrad = ctx.createRadialGradient(512, 700, 60, 512, 700, 850);
    bgGrad.addColorStop(0, '#ede4d4');      // Gentle warm antique cream
    bgGrad.addColorStop(0.65, '#e4d7c3');   // Soft matte parchment
    bgGrad.addColorStop(1, '#d5c5ad');      // Subtle warm aged border
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Spine gradient shadow
    const spineShadow = ctx.createLinearGradient(isBackFace ? canvas.width : 0, 0, isBackFace ? canvas.width - 100 : 100, 0);
    spineShadow.addColorStop(0, 'rgba(0,0,0,0.25)');
    spineShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineShadow;
    ctx.fillRect(isBackFace ? canvas.width - 100 : 0, 0, 100, canvas.height);

    // Warm Burnished Bronze Borders
    ctx.strokeStyle = 'rgba(148, 110, 52, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    ctx.strokeStyle = 'rgba(148, 110, 52, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, canvas.width - 128, canvas.height - 128);

    if (!pageData) {
      return new THREE.CanvasTexture(canvas);
    }

    if (pageData.type === 'photo') {
      const img = imageCache[pageData.src];

      // 1. Photo Frame Dimensions
      const frameX = 110;
      const frameY = 120;
      const frameW = canvas.width - 220;
      const frameH = 750;

      // Soft Photo Drop Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(20, 5, 15, 0.35)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      // Soft Warm Matting for photo
      ctx.fillStyle = '#f6f1e8';
      ctx.fillRect(frameX - 12, frameY - 12, frameW + 24, frameH + 24);
      ctx.restore();

      // Deep Warm Gold frame line
      ctx.strokeStyle = '#c49f58';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(frameX - 6, frameY - 6, frameW + 12, frameH + 12);

      // Draw Photo
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(frameX, frameY, frameW, frameH);
        ctx.clip();

        // Object-fit cover math
        const imgRatio = img.width / img.height;
        const frameRatio = frameW / frameH;
        let sw, sh, sx, sy;

        if (imgRatio > frameRatio) {
          sh = img.height;
          sw = img.height * frameRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = img.width / frameRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, frameX, frameY, frameW, frameH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#2d0a1d';
        ctx.fillRect(frameX, frameY, frameW, frameH);
        ctx.fillStyle = '#dfbe82';
        ctx.font = '28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cherished Photo', canvas.width / 2, frameY + frameH / 2);
      }

      // Date Tag - Deep bronze for high contrast
      if (pageData.date) {
        ctx.fillStyle = '#6e4b1a';
        ctx.font = '600 24px "Inter", sans-serif';
        ctx.letterSpacing = '3px';
        ctx.textAlign = 'center';
        ctx.fillText(pageData.date.toUpperCase(), canvas.width / 2, 940);
      }

      // Photo Title - Rich deep espresso/ink
      ctx.fillStyle = '#14030e';
      ctx.font = '700 48px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.fillText(pageData.title || '', canvas.width / 2, 1010);

      // Decorative divider
      ctx.strokeStyle = 'rgba(156, 118, 56, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 90, 1045);
      ctx.lineTo(canvas.width / 2 + 90, 1045);
      ctx.stroke();

      // Caption - High contrast dark ink, larger readable font
      if (pageData.caption) {
        ctx.fillStyle = '#1c0715';
        ctx.font = 'italic 32px "Cormorant Garamond", serif';
        this.wrapText(ctx, pageData.caption, canvas.width / 2, 1100, 720, 44);
      }
    } else if (pageData.type === 'closing') {
      // Closing Spread
      ctx.fillStyle = '#d47885';
      ctx.font = '76px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥', canvas.width / 2, 360);

      ctx.fillStyle = '#14030e';
      ctx.font = '700 56px "Cormorant Garamond", serif';
      ctx.fillText(pageData.title, canvas.width / 2, 470);

      ctx.fillStyle = '#6e4b1a';
      ctx.font = '600 24px "Inter", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText(pageData.subtitle.toUpperCase(), canvas.width / 2, 530);

      ctx.strokeStyle = '#c49f58';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 130, 580);
      ctx.lineTo(canvas.width / 2 + 130, 580);
      ctx.stroke();

      ctx.fillStyle = '#0f020b';
      ctx.font = 'italic 34px "Cormorant Garamond", serif';
      this.wrapText(ctx, pageData.quote, canvas.width / 2, 660, 700, 48);

      ctx.fillStyle = '#1c0715';
      ctx.font = '500 26px "Inter", sans-serif';
      this.wrapText(ctx, pageData.body, canvas.width / 2, 860, 680, 42);

      ctx.fillStyle = '#6e4b1a';
      ctx.font = '600 22px "Inter", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('✦   E T E R N A L L Y   Y O U R S   ✦', canvas.width / 2, 1220);
    } else {
      // Intro / Text Page
      ctx.fillStyle = '#6e4b1a';
      ctx.font = '600 24px "Inter", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.textAlign = 'center';
      ctx.fillText(pageData.subtitle.toUpperCase(), canvas.width / 2, 300);

      ctx.fillStyle = '#14030e';
      ctx.font = '700 58px "Cormorant Garamond", serif';
      ctx.fillText(pageData.title, canvas.width / 2, 380);

      ctx.strokeStyle = '#c49f58';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 110, 420);
      ctx.lineTo(canvas.width / 2 + 110, 420);
      ctx.stroke();

      ctx.fillStyle = '#0f020b';
      ctx.font = 'italic 34px "Cormorant Garamond", serif';
      this.wrapText(ctx, pageData.quote, canvas.width / 2, 520, 700, 48);

      ctx.fillStyle = '#1c0715';
      ctx.font = '500 28px "Inter", sans-serif';
      this.wrapText(ctx, pageData.body, canvas.width / 2, 750, 700, 44);

      ctx.fillStyle = '#d47885';
      ctx.font = '38px serif';
      ctx.fillText('❦', canvas.width / 2, 1180);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  /**
   * ================= INTERACTION & ANIMATIONS =================
   */

  openBook() {
    if (this.isOpen || this.isAnimating) return;
    this.isAnimating = true;
    this.playSound('page');

    const duration = 1.8;

    // 1. Swing front cover open around spine (-172 degrees)
    gsap.to(this.coverPivot.rotation, {
      y: -Math.PI * 0.96,
      duration: duration,
      ease: 'power3.inOut'
    });

    // 2. Smoothly rotate book to face camera squarely as open spread
    gsap.to(this.bookGroup.rotation, {
      x: 0.18,
      y: 0.0,
      z: 0.0,
      duration: duration,
      ease: 'power3.inOut'
    });

    // 3. Re-center book spine to true center
    gsap.to(this.bookGroup.position, {
      x: 0.0,
      y: 0.0,
      z: 0.6,
      duration: duration,
      ease: 'power3.inOut',
      onComplete: () => {
        this.isOpen = true;
        this.currentSpread = 1;
        this.isAnimating = false;
        this.notifyState();
      }
    });
  }

  nextPage() {
    if (this.isAnimating) return;

    if (!this.isOpen) {
      this.openBook();
      return;
    }

    if (this.currentSpread >= this.totalSpreads) {
      return; // At end
    }

    this.isAnimating = true;
    this.playSound('page');

    const leafIndex = this.currentSpread - 1;
    const targetLeaf = this.leafGroups[leafIndex];

    if (targetLeaf) {
      // Real page curl / flip physics animation
      const tl = gsap.timeline({
        onComplete: () => {
          this.currentSpread++;
          this.isAnimating = false;
          this.notifyState();
        }
      });

      // Flip around spine
      tl.to(targetLeaf.pivot.rotation, {
        y: -Math.PI * 0.96,
        duration: 1.3,
        ease: 'power2.inOut'
      }, 0);

      // Mid-flip page curl & lift
      tl.to(targetLeaf.pivot.position, {
        z: 0.32,
        duration: 0.65,
        ease: 'power2.out'
      }, 0);

      // Land firmly on the left stack above the cover
      tl.to(targetLeaf.pivot.position, {
        z: targetLeaf.flippedZ,
        duration: 0.65,
        ease: 'power2.in'
      }, 0.65);
    } else {
      this.currentSpread++;
      this.isAnimating = false;
      this.notifyState();
    }
  }

  prevPage() {
    if (this.isAnimating || !this.isOpen) return;

    if (this.currentSpread <= 1) {
      // Close cover
      this.closeBook();
      return;
    }

    this.isAnimating = true;
    this.playSound('page');

    const leafIndex = this.currentSpread - 2;
    const targetLeaf = this.leafGroups[leafIndex];

    if (targetLeaf) {
      const tl = gsap.timeline({
        onComplete: () => {
          this.currentSpread--;
          this.isAnimating = false;
          this.notifyState();
        }
      });

      tl.to(targetLeaf.pivot.rotation, {
        y: 0,
        duration: 1.3,
        ease: 'power2.inOut'
      }, 0);

      tl.to(targetLeaf.pivot.position, {
        z: 0.32,
        duration: 0.65,
        ease: 'power2.out'
      }, 0);

      tl.to(targetLeaf.pivot.position, {
        z: targetLeaf.initialZ,
        duration: 0.65,
        ease: 'power2.in'
      }, 0.65);
    } else {
      this.currentSpread--;
      this.isAnimating = false;
      this.notifyState();
    }
  }

  closeBook() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.playSound('page');

    const duration = 1.6;

    // Flip all opened pages back to right side stack with their initial Z
    this.leafGroups.forEach((leaf) => {
      gsap.to(leaf.pivot.rotation, {
        y: 0,
        duration: 1.1,
        ease: 'power2.inOut'
      });
      gsap.to(leaf.pivot.position, {
        z: leaf.initialZ,
        duration: 1.1,
        ease: 'power2.inOut'
      });
    });

    // Close front cover
    gsap.to(this.coverPivot.rotation, {
      y: 0,
      duration: duration,
      delay: 0.3,
      ease: 'power3.inOut'
    });

    // Return book to centered resting 3D perspective
    gsap.to(this.bookGroup.rotation, {
      x: 0.36,
      y: -0.22,
      z: -0.04,
      duration: duration,
      delay: 0.3,
      ease: 'power3.inOut'
    });

    gsap.to(this.bookGroup.position, {
      x: - (this.pageWidth / 2) * this.bookScale,
      y: 0,
      z: 0,
      duration: duration,
      delay: 0.3,
      ease: 'power3.inOut',
      onComplete: () => {
        this.isOpen = false;
        this.currentSpread = 0;
        this.isAnimating = false;
        this.notifyState();
      }
    });
  }

  notifyState() {
    this.onStateChange({
      isOpen: this.isOpen,
      currentSpread: this.currentSpread,
      totalSpreads: this.totalSpreads
    });
  }

  setupEvents() {
    // Click on canvas raycasting (Desktop)
    this.canvas.addEventListener('click', (e) => {
      if (this.isAnimating) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!this.isOpen) {
        this.openBook();
        return;
      }

      if (this.mouse.x >= 0) {
        this.nextPage();
      } else {
        this.prevPage();
      }
    });

    // Subtle 3D hover tilt on closed book (Desktop only)
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isOpen || !this.bookGroup || window.innerWidth <= 768) return;

      const rect = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      gsap.to(this.bookGroup.rotation, {
        x: 0.36 - ny * 0.05,
        y: -0.22 + nx * 0.06,
        duration: 0.5,
        ease: 'power1.out'
      });
    });

    // Touch swipe & tap support for mobile phones
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (!e.changedTouches || !e.changedTouches[0] || this.isAnimating) return;
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;

      // Horizontal swipe detected
      if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      } else if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15 && elapsed < 450) {
        // Quick tap
        if (!this.isOpen) {
          this.openBook();
        } else {
          const rect = this.canvas.getBoundingClientRect();
          const tapX = e.changedTouches[0].clientX - rect.left;
          if (tapX > rect.width * 0.5) {
            this.nextPage();
          } else {
            this.prevPage();
          }
        }
      }
    }, { passive: true });

    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('visibilitychange', () => {
      this.isActive = !document.hidden;
    });
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.updateDeviceSizing();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.isActive || !this.renderer || !this.scene || !this.camera) return;

    this.renderer.render(this.scene, this.camera);
  }
}
