/**
 * ===================================================================
 * RIFFA & NOUFAL — 3D RING EXPERIENCE (ring.js)
 * High-fidelity Three.js Ring Scene with Cinematic Hero Animation,
 * PBR Lighting, Environment Reflections, and Procedural Solitaire Fallback.
 * ===================================================================
 */

export class RingScene {
  constructor(canvasElement, onProgress, onLoaded) {
    this.canvas = canvasElement;
    this.onProgress = onProgress || (() => {});
    this.onLoaded = onLoaded || (() => {});

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ringGroup = null;
    this.ringMesh = null;
    this.lightsGroup = null;
    
    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    this.isActive = true;
    this.isLoaded = false;

    // Floating animation parameters
    this.baseRotationSpeed = 0.45;
    this.rotationMultiplier = 1.0;
    this.floatAmplitude = 0.08;
    this.floatFrequency = 1.2;

    this.init();
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();

    // 2. Camera setup
    const aspect = (this.canvas.clientWidth / this.canvas.clientHeight) || (window.innerWidth / window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 50 : 40, aspect, 0.1, 100);
    this.updateCameraForDevice();

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    // Mobile performance: cap at 1.75 on mobile, 2 on desktop
    const maxPR = window.innerWidth <= 768 ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPR));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // 4. Lighting & Studio Environment
    this.setupLighting();
    this.setupEnvironment();

    // 5. Container group for the ring
    this.ringGroup = new THREE.Group();
    this.ringGroup.position.set(0, -1.8, 0); // Start below for cinematic entrance
    this.ringGroup.scale.set(0.01, 0.01, 0.01); // Start small
    this.ringGroup.rotation.set(0.4, 0, -0.2);
    this.scene.add(this.ringGroup);

    // 6. Load GLTF model or procedural fallback
    this.loadRingModel();

    // 7. Event listeners
    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

    // 8. Start render loop
    this.animate();
  }

  setupLighting() {
    this.lightsGroup = new THREE.Group();

    // Soft Ambient Light with wine/blush tone
    const ambientLight = new THREE.AmbientLight(0x4a2233, 1.4);
    this.lightsGroup.add(ambientLight);

    // Warm Key Light (Champagne Gold highlight)
    const keyLight = new THREE.DirectionalLight(0xfffae8, 3.2);
    keyLight.position.set(4, 5, 4);
    this.lightsGroup.add(keyLight);

    // Rose Rim Light (Subtle edge glow)
    const rimLight = new THREE.DirectionalLight(0xfca5a5, 2.5);
    rimLight.position.set(-4, -2, -3);
    this.lightsGroup.add(rimLight);

    // Top Sparkle Point Light for diamond glint
    const sparkleLight = new THREE.PointLight(0xffffff, 2.8, 8);
    sparkleLight.position.set(0, 2.5, 1.8);
    this.lightsGroup.add(sparkleLight);

    // Bottom soft fill
    const fillLight = new THREE.DirectionalLight(0xdba37d, 1.2);
    fillLight.position.set(0, -4, 2);
    this.lightsGroup.add(fillLight);

    this.scene.add(this.lightsGroup);
  }

  setupEnvironment() {
    // Generate a luxury studio PMREM gradient environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x190515);

    // Romantic studio reflection gradient spheres
    const sphereGeo = new THREE.SphereGeometry(10, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffd1a4,
      side: THREE.BackSide
    });
    envScene.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Warm soft reflection lights in environment
    const warmLight = new THREE.PointLight(0xffe6b3, 5, 20);
    warmLight.position.set(5, 5, 5);
    envScene.add(warmLight);

    const blushLight = new THREE.PointLight(0xe88a9a, 4, 20);
    blushLight.position.set(-5, -5, -5);
    envScene.add(blushLight);

    const renderTarget = pmremGenerator.fromScene(envScene);
    this.scene.environment = renderTarget.texture;
    pmremGenerator.dispose();
  }

  loadRingModel() {
    const loader = new THREE.GLTFLoader();
    const modelPaths = ['RING.glb', './RING.glb', 'models/RING.glb', '/models/RING.glb'];

    const luxuryGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffdf88),
      emissive: new THREE.Color(0x1a0f03),
      metalness: 0.96,
      roughness: 0.13,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 1.0,
      envMapIntensity: 1.6
    });

    const tryLoad = (index) => {
      if (index >= modelPaths.length) {
        console.info('[RingScene] RING.glb not found at local paths. Activating luxury procedural engagement ring.');
        this.buildProceduralRing();
        this.finishLoading();
        return;
      }

      loader.load(
        modelPaths[index],
        (gltf) => {
          console.info('[RingScene] Successfully loaded 3D model:', modelPaths[index]);
          this.ringMesh = gltf.scene;

          // Remove any imported scene lights or cameras from the GLB
          const toRemove = [];
          this.ringMesh.traverse((child) => {
            if (child.isLight || child.isCamera) {
              toRemove.push(child);
            }
          });
          toRemove.forEach((node) => {
            if (node.parent) node.parent.remove(node);
          });

          // Compute bounding box and center/scale
          const box = new THREE.Box3().setFromObject(this.ringMesh);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = 2.6 / (maxDim || 1);
          this.ringMesh.scale.setScalar(targetScale);
          this.ringMesh.position.sub(center.multiplyScalar(targetScale));

          // Polish materials with luxury champagne gold & diamond reflections
          this.ringMesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.geometry) {
                child.geometry.computeVertexNormals();
              }

              // Apply or enhance materials
              if (!child.material || child.material.name === '' || child.material.isMeshBasicMaterial) {
                child.material = luxuryGoldMaterial;
              } else {
                child.material.metalness = 0.96;
                child.material.roughness = 0.14;
                child.material.color = new THREE.Color(0xffdf88);
                child.material.clearcoat = 0.85;
                child.material.envMapIntensity = 1.6;
                child.material.needsUpdate = true;
              }
            }
          });

          this.ringGroup.add(this.ringMesh);
          this.finishLoading();
        },
        (xhr) => {
          if (xhr.total > 0) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            this.onProgress(percent);
          }
        },
        (error) => {
          console.debug('[RingScene] Failed loading path:', modelPaths[index], error);
          tryLoad(index + 1);
        }
      );
    };

    tryLoad(0);
  }

  /**
   * Procedural Solitaire Engagement Ring
   * Crafted with realistic 18k yellow gold band, 6-prong crown,
   * brilliant cut diamond solitaire, and side pavé gemstones.
   */
  buildProceduralRing() {
    const proceduralGroup = new THREE.Group();

    // 1. Luxury 18K Yellow Gold Material
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd780,
      emissive: 0x221303,
      metalness: 0.96,
      roughness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0
    });

    // 2. Brilliant Cut Diamond Material
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.92,
      thickness: 1.2,
      ior: 2.417,
      transparent: true,
      opacity: 0.98,
      reflectivity: 1.0,
      clearcoat: 1.0
    });

    // 3. Torus Ring Band
    const ringBandGeo = new THREE.TorusGeometry(1.2, 0.14, 32, 100);
    const ringBand = new THREE.Mesh(ringBandGeo, goldMaterial);
    ringBand.rotation.x = Math.PI / 2;
    proceduralGroup.add(ringBand);

    // 4. Center Solitaire Diamond
    // High-facet diamond geometry using Octahedron + facets
    const diamondGeo = new THREE.OctahedronGeometry(0.55, 2);
    diamondGeo.scale(1.1, 1.3, 1.1);
    const diamond = new THREE.Mesh(diamondGeo, diamondMaterial);
    diamond.position.set(0, 1.28, 0);
    diamond.rotation.y = Math.PI / 4;
    proceduralGroup.add(diamond);

    // 5. Crown & 6 Gold Prongs holding the diamond
    const crownRingGeo = new THREE.TorusGeometry(0.35, 0.05, 16, 32);
    const crownRing = new THREE.Mesh(crownRingGeo, goldMaterial);
    crownRing.position.set(0, 1.08, 0);
    crownRing.rotation.x = Math.PI / 2;
    proceduralGroup.add(crownRing);

    const prongCount = 6;
    for (let i = 0; i < prongCount; i++) {
      const angle = (i / prongCount) * Math.PI * 2;
      const prongGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 12);
      const prong = new THREE.Mesh(prongGeo, goldMaterial);
      const radius = 0.38;
      prong.position.set(Math.cos(angle) * radius, 1.25, Math.sin(angle) * radius);
      prong.rotation.z = -Math.cos(angle) * 0.18;
      prong.rotation.x = Math.sin(angle) * 0.18;
      proceduralGroup.add(prong);
    }

    // 6. Accent Pavé Diamonds along the shoulders
    const paveCount = 6;
    for (let i = 1; i <= paveCount; i++) {
      const offsetAngle = 0.18 * i;
      [-1, 1].forEach((side) => {
        const theta = Math.PI / 2 + side * offsetAngle;
        const x = 1.2 * Math.cos(theta);
        const y = 1.2 * Math.sin(theta);
        const paveGeo = new THREE.OctahedronGeometry(0.08, 1);
        const paveMesh = new THREE.Mesh(paveGeo, diamondMaterial);
        paveMesh.position.set(x, y, 0);
        proceduralGroup.add(paveMesh);
      });
    }

    proceduralGroup.rotation.x = 0.2;
    proceduralGroup.scale.set(1.1, 1.1, 1.1);
    this.ringMesh = proceduralGroup;
    this.ringGroup.add(this.ringMesh);
  }

  finishLoading() {
    this.isLoaded = true;
    this.onLoaded();
  }

  /**
   * Cinematic Entrance Animation
   * Ring rises from center, scaling smoothly up into place (duration 2.8s)
   */
  playCinematicEntrance() {
    if (!this.ringGroup) return;

    gsap.killTweensOf(this.ringGroup.position);
    gsap.killTweensOf(this.ringGroup.scale);
    gsap.killTweensOf(this.ringGroup.rotation);

    // Initial state
    this.ringGroup.position.set(0, -1.2, 0);
    this.ringGroup.scale.set(0.02, 0.02, 0.02);
    this.ringGroup.rotation.set(0.6, -0.8, -0.3);

    // Slow, smooth cinematic easing (power3.out / expo.out, ~3 seconds)
    const tl = gsap.timeline();

    tl.to(this.ringGroup.position, {
      y: 0,
      duration: 3.0,
      ease: 'expo.out'
    }, 0);

    tl.to(this.ringGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 3.2,
      ease: 'power3.out'
    }, 0);

    tl.to(this.ringGroup.rotation, {
      x: 0.25,
      y: 0.1,
      z: 0.05,
      duration: 3.4,
      ease: 'expo.out'
    }, 0);

    // Soft camera push-in
    gsap.fromTo(this.camera.position, 
      { z: 6.2 },
      { z: 4.8, duration: 3.5, ease: 'power2.out' }
    );
  }

  /**
   * Connect to ScrollTrigger scrub:
   * As user scrolls down, ring speeds up its spin and drifts/scales slightly
   */
  updateScrollProgress(progress) {
    if (!this.ringGroup) return;

    // Multiply rotation speed with scroll
    this.rotationMultiplier = 1.0 + progress * 3.5;

    // Slight scale up and drift back
    const targetScale = 1.0 + progress * 0.45;
    this.ringGroup.scale.setScalar(targetScale);
    this.ringGroup.position.y = -progress * 0.6;
    this.ringGroup.rotation.x = 0.25 + progress * 0.8;
  }

  updateCameraForDevice() {
    if (!this.camera || !this.canvas) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;
    if (aspect < 1.0) {
      // Mobile portrait: wider FOV and centered framing between top and bottom names
      this.camera.fov = 48;
      this.camera.position.set(0, 0.05, 5.8);
    } else {
      this.camera.fov = 40;
      this.camera.position.set(0, 0.2, 5.2);
    }
    this.camera.updateProjectionMatrix();
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.updateCameraForDevice();
    this.renderer.setSize(width, height, false);
  }

  onVisibilityChange() {
    this.isActive = !document.hidden;
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    if (!this.isActive || !this.renderer || !this.scene || !this.camera) return;

    const elapsedTime = this.clock.getElapsedTime();

    if (this.ringGroup && this.isLoaded) {
      // Continuous slow, smooth rotation
      this.ringGroup.rotation.y += 0.008 * this.rotationMultiplier;

      // Gentle floating sine motion
      const floatOffset = Math.sin(elapsedTime * this.floatFrequency) * this.floatAmplitude;
      if (!gsap.isTweening(this.ringGroup.position)) {
        this.ringGroup.position.y = floatOffset;
      }

      // Subtle wobble
      this.ringGroup.rotation.z = 0.05 + Math.cos(elapsedTime * 0.8) * 0.04;
    }

    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    this.isActive = false;
  }

  resume() {
    this.isActive = true;
  }

  destroy() {
    this.pause();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    if (this.renderer) this.renderer.dispose();
  }
}

