import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import { Gauge } from './gauge'
import { TouchControls } from './controls'
import gsap from 'gsap'

export class Scene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private gauges: Gauge[] = []
  private controls: TouchControls
  private cockpit: THREE.Group
  private ambientParticles: THREE.Points
  
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.composer = new EffectComposer(this.renderer)
    this.cockpit = new THREE.Group()
    this.controls = new TouchControls(this.camera, this.renderer.domElement)
    this.ambientParticles = this.createDustParticles()
  }
  
  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.8
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    document.getElementById('app')?.appendChild(this.renderer.domElement)
    
    // Setup camera
    this.camera.position.set(0, 0, 5)
    this.camera.lookAt(0, 0, 0)
    
    // Setup scene
    this.scene.fog = new THREE.Fog(0x000511, 5, 20)
    this.scene.background = new THREE.Color(0x000511)
    
    // Setup lighting
    this.setupLighting()
    
    // Setup cockpit environment
    this.setupCockpit()
    
    // Create gauges
    this.createGauges()
    
    // Setup postprocessing
    this.setupPostProcessing()
    
    // Add dust particles
    this.scene.add(this.ambientParticles)
    
    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this))
    
    // Initial animation
    this.playIntroAnimation()
  }
  
  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3)
    this.scene.add(ambientLight)
    
    // Key light
    const keyLight = new THREE.DirectionalLight(0x4cc9ff, 0.5)
    keyLight.position.set(5, 5, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 50
    this.scene.add(keyLight)
    
    // Fill lights
    const fillLight1 = new THREE.PointLight(0xff7b54, 0.8, 10)
    fillLight1.position.set(-3, -2, 2)
    this.scene.add(fillLight1)
    
    const fillLight2 = new THREE.PointLight(0x4cc9ff, 0.6, 10)
    fillLight2.position.set(3, -2, 2)
    this.scene.add(fillLight2)
    
    // Rim light
    const rimLight = new THREE.SpotLight(0xffffff, 0.3)
    rimLight.position.set(0, 5, -5)
    rimLight.angle = Math.PI / 4
    rimLight.penumbra = 0.5
    this.scene.add(rimLight)
  }
  
  private setupCockpit() {
    // Create cockpit frame
    const frameGeometry = new THREE.TorusGeometry(8, 0.3, 8, 50)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 0.5
    })
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial)
    frame.rotation.x = Math.PI / 2
    frame.position.z = -2
    this.cockpit.add(frame)
    
    // Add copper piping details
    const pipeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4)
    const pipeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.8,
      roughness: 0.3
    })
    
    for (let i = 0; i < 6; i++) {
      const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial)
      const angle = (i / 6) * Math.PI * 2
      pipe.position.x = Math.cos(angle) * 3
      pipe.position.y = Math.sin(angle) * 3
      pipe.position.z = -1
      pipe.rotation.z = angle + Math.PI / 2
      this.cockpit.add(pipe)
    }
    
    this.scene.add(this.cockpit)
  }
  
  private createGauges() {
    const positions = [
      { x: -1.5, y: 0.8 },
      { x: 1.5, y: 0.8 },
      { x: -1.5, y: -0.8 },
      { x: 1.5, y: -0.8 }
    ]
    
    const configs = [
      { label: 'Revenue', color: 0x4cc9ff, min: 0, max: 100000 },
      { label: 'Active Users', color: 0x7fff7f, min: 0, max: 5000 },
      { label: 'Conversion', color: 0xff7b54, min: 0, max: 100 },
      { label: 'Performance', color: 0xffd700, min: 0, max: 100 }
    ]
    
    positions.forEach((pos, i) => {
      const gauge = new Gauge(this.scene, configs[i])
      gauge.position.set(pos.x, pos.y, 0)
      this.gauges.push(gauge)
      this.controls.addInteractiveObject(gauge)
      
      // Set demo values
      const demoValues = [42000, 1234, 68.5, 92.3]
      gauge.setValue(demoValues[i])
    })
  }
  
  private createDustParticles(): THREE.Points {
    const particleCount = 500
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
      sizes[i] = Math.random() * 0.05
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    })
    
    return new THREE.Points(geometry, material)
  }
  
  private setupPostProcessing() {
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.4,
      0.85
    )
    this.composer.addPass(bloomPass)
    
    const filmPass = new FilmPass()
    this.composer.addPass(filmPass)
  }
  
  private playIntroAnimation() {
    // Animate camera
    gsap.from(this.camera.position, {
      z: 15,
      duration: 2,
      ease: 'power3.out'
    })
    
    // Animate gauges spinning up
    this.gauges.forEach((gauge, i) => {
      gauge.playSpinUpAnimation(i * 0.2)
    })
    
    // Animate cockpit
    gsap.from(this.cockpit.rotation, {
      z: Math.PI,
      duration: 3,
      ease: 'power2.out'
    })
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this))
    
    // Update controls
    this.controls.update()
    
    // Update gauges
    this.gauges.forEach(gauge => gauge.update())
    
    // Rotate dust particles
    this.ambientParticles.rotation.y += 0.0001
    
    // Subtle camera movement
    this.camera.position.x = Math.sin(Date.now() * 0.0001) * 0.1
    this.camera.position.y = Math.cos(Date.now() * 0.0001) * 0.1
    
    // Render
    this.composer.render()
  }
  
  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.composer.setSize(window.innerWidth, window.innerHeight)
  }
}