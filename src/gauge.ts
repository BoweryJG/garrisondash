import * as THREE from 'three'
import gsap from 'gsap'
import { supabase } from './main'

interface GaugeConfig {
  label: string
  color: number
  min: number
  max: number
  supabaseTable?: string
  supabaseField?: string
}

export class Gauge extends THREE.Object3D {
  private config: GaugeConfig
  private needle: THREE.Group
  // private needleMesh: THREE.Mesh
  // private faceMesh: THREE.Mesh
  // private glassMesh: THREE.Mesh
  private tickMarks: THREE.Group
  private digitDisplay: THREE.Group
  private value: number = 0
  private targetValue: number = 0
  private glowLight!: THREE.PointLight
  private condensationTexture!: THREE.Texture
  
  constructor(scene: THREE.Scene, config: GaugeConfig) {
    super()
    this.config = config
    this.needle = new THREE.Group()
    this.tickMarks = new THREE.Group()
    this.digitDisplay = new THREE.Group()
    
    // Create gauge components
    this.createBezel()
    this.createFace()
    this.createTickMarks()
    this.createNeedle()
    this.createGlass()
    this.createGlowLight()
    this.createDigitalDisplay()
    
    // Add components to gauge
    this.add(this.tickMarks)
    this.add(this.needle)
    this.add(this.digitDisplay)
    
    // Start data polling if configured
    if (config.supabaseTable && config.supabaseField) {
      this.startDataPolling()
    }
    
    // this.faceMesh = this.children.find(child => child.name === 'face') as THREE.Mesh
    // this.glassMesh = this.children.find(child => child.name === 'glass') as THREE.Mesh
    // this.needleMesh = this.needle.children[0] as THREE.Mesh
    
    // Add to scene
    scene.add(this)
    scene.add(this.glowLight)
  }
  
  private createBezel() {
    const bezelGeometry = new THREE.TorusGeometry(0.5, 0.08, 8, 50)
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 1
    })
    
    const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial)
    bezel.castShadow = true
    bezel.receiveShadow = true
    this.add(bezel)
    
    // Add screw details
    const screwGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.03)
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      metalness: 0.95,
      roughness: 0.1
    })
    
    for (let i = 0; i < 4; i++) {
      const screw = new THREE.Mesh(screwGeometry, screwMaterial)
      const angle = (i / 4) * Math.PI * 2
      screw.position.x = Math.cos(angle) * 0.52
      screw.position.y = Math.sin(angle) * 0.52
      screw.position.z = 0.05
      screw.rotation.x = Math.PI / 2
      this.add(screw)
    }
  }
  
  private createFace() {
    const faceGeometry = new THREE.CircleGeometry(0.48, 64)
    const faceTexture = this.createFaceTexture()
    
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      map: faceTexture,
      color: 0x1a1a2e,
      metalness: 0.1,
      roughness: 0.8,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8
    })
    
    const face = new THREE.Mesh(faceGeometry, faceMaterial)
    face.position.z = -0.02
    face.name = 'face'
    this.add(face)
  }
  
  private createFaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Background
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, '#2a2a3a')
    gradient.addColorStop(1, '#1a1a2a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    
    // Add vintage texture
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1)
    }
    ctx.globalAlpha = 1
    
    // Label
    ctx.font = 'bold 24px Arial'
    ctx.fillStyle = '#' + this.config.color.toString(16).padStart(6, '0')
    ctx.textAlign = 'center'
    ctx.fillText(this.config.label.toUpperCase(), 256, 400)
    
    return new THREE.CanvasTexture(canvas)
  }
  
  private createTickMarks() {
    const tickMaterial = new THREE.MeshBasicMaterial({ 
      color: this.config.color,
      transparent: true,
      opacity: 0.8
    })
    
    // Major ticks
    for (let i = 0; i <= 10; i++) {
      const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 1.25
      const tickGeometry = new THREE.BoxGeometry(0.02, i % 2 === 0 ? 0.08 : 0.05, 0.01)
      const tick = new THREE.Mesh(tickGeometry, tickMaterial)
      
      const radius = 0.4
      tick.position.x = Math.cos(angle) * radius
      tick.position.y = Math.sin(angle) * radius
      tick.position.z = 0.01
      tick.rotation.z = angle + Math.PI / 2
      
      this.tickMarks.add(tick)
      
      // Add numbers
      if (i % 2 === 0) {
        const value = this.config.min + (i / 10) * (this.config.max - this.config.min)
        const numberTexture = this.createNumberTexture(value)
        const numberMaterial = new THREE.MeshBasicMaterial({ 
          map: numberTexture,
          transparent: true,
          opacity: 0.7
        })
        const numberMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.1, 0.05),
          numberMaterial
        )
        
        numberMesh.position.x = Math.cos(angle) * 0.32
        numberMesh.position.y = Math.sin(angle) * 0.32
        numberMesh.position.z = 0.01
        
        this.tickMarks.add(numberMesh)
      }
    }
  }
  
  private createNumberTexture(value: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    
    ctx.font = '20px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(value.toFixed(0), 64, 32)
    
    return new THREE.CanvasTexture(canvas)
  }
  
  private createNeedle() {
    // Needle shaft
    const needleGeometry = new THREE.BoxGeometry(0.015, 0.35, 0.005)
    const needleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0
    })
    
    const needleShaft = new THREE.Mesh(needleGeometry, needleMaterial)
    needleShaft.position.y = 0.175
    needleShaft.castShadow = true
    
    // Needle tip
    const tipGeometry = new THREE.ConeGeometry(0.02, 0.05, 8)
    const tipMaterial = new THREE.MeshPhysicalMaterial({
      color: this.config.color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: this.config.color,
      emissiveIntensity: 0.5
    })
    
    const tip = new THREE.Mesh(tipGeometry, tipMaterial)
    tip.position.y = 0.35
    tip.rotation.z = Math.PI
    
    // Needle center cap
    const capGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.02)
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      metalness: 0.95,
      roughness: 0.05
    })
    
    const cap = new THREE.Mesh(capGeometry, capMaterial)
    cap.rotation.x = Math.PI / 2
    cap.position.z = 0.02
    
    this.needle.add(needleShaft)
    this.needle.add(tip)
    this.needle.add(cap)
    
    // Set initial rotation
    this.needle.rotation.z = -Math.PI * 1.25
  }
  
  private createGlass() {
    const glassGeometry = new THREE.SphereGeometry(0.52, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 0.95,
      thickness: 0.5,
      envMapIntensity: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    
    const glass = new THREE.Mesh(glassGeometry, glassMaterial)
    glass.position.z = 0.1
    glass.scale.z = 0.3
    glass.name = 'glass'
    this.add(glass)
    
    // Add condensation effect
    this.addCondensation(glass)
  }
  
  private addCondensation(glass: THREE.Mesh) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    // Create condensation pattern
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const radius = Math.random() * 10 + 2
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    
    this.condensationTexture = new THREE.CanvasTexture(canvas)
    
    // Apply to glass material
    const material = glass.material as THREE.MeshPhysicalMaterial
    material.alphaMap = this.condensationTexture
    material.needsUpdate = true
  }
  
  private createGlowLight() {
    this.glowLight = new THREE.PointLight(this.config.color, 0.5, 2)
    this.glowLight.position.z = 0.3
  }
  
  private createDigitalDisplay() {
    const displayGeometry = new THREE.PlaneGeometry(0.2, 0.08)
    const displayCanvas = document.createElement('canvas')
    displayCanvas.width = 256
    displayCanvas.height = 64
    
    const displayTexture = new THREE.CanvasTexture(displayCanvas)
    const displayMaterial = new THREE.MeshBasicMaterial({
      map: displayTexture,
      transparent: true,
      opacity: 0.8
    })
    
    const display = new THREE.Mesh(displayGeometry, displayMaterial)
    display.position.y = -0.25
    display.position.z = 0.02
    
    this.digitDisplay.add(display)
    this.digitDisplay.userData.canvas = displayCanvas
    this.digitDisplay.userData.texture = displayTexture
  }
  
  private updateDigitalDisplay() {
    const canvas = this.digitDisplay.userData.canvas as HTMLCanvasElement
    const texture = this.digitDisplay.userData.texture as THREE.CanvasTexture
    const ctx = canvas.getContext('2d')!
    
    // Clear
    ctx.clearRect(0, 0, 256, 64)
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 0, 256, 64)
    
    // Text
    ctx.font = 'bold 32px monospace'
    ctx.fillStyle = '#' + this.config.color.toString(16).padStart(6, '0')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.value.toFixed(0), 128, 32)
    
    texture.needsUpdate = true
  }
  
  playSpinUpAnimation(delay: number = 0) {
    // Spin needle wildly then settle
    gsap.timeline({ delay })
      .to(this.needle.rotation, {
        z: Math.PI * 2,
        duration: 0.8,
        ease: 'power2.in'
      })
      .to(this.needle.rotation, {
        z: -Math.PI * 1.25,
        duration: 1.2,
        ease: 'elastic.out(1, 0.3)'
      })
    
    // Flash glow
    gsap.timeline({ delay })
      .to(this.glowLight, {
        intensity: 2,
        duration: 0.5,
        ease: 'power2.out'
      })
      .to(this.glowLight, {
        intensity: 0.5,
        duration: 1,
        ease: 'power2.inOut'
      })
  }
  
  setValue(value: number) {
    this.targetValue = THREE.MathUtils.clamp(value, this.config.min, this.config.max)
  }
  
  update() {
    // Smooth value interpolation
    this.value = THREE.MathUtils.lerp(this.value, this.targetValue, 0.1)
    
    // Update needle rotation
    const normalizedValue = (this.value - this.config.min) / (this.config.max - this.config.min)
    const targetRotation = -Math.PI * 1.25 + normalizedValue * Math.PI * 1.5
    
    // Add subtle physics-based overshoot
    const currentRotation = this.needle.rotation.z
    const diff = targetRotation - currentRotation
    this.needle.rotation.z += diff * 0.1
    
    // Update digital display
    this.updateDigitalDisplay()
    
    // Update glow position
    if (this.glowLight) {
      this.glowLight.position.copy(this.position)
      this.glowLight.position.z += 0.3
    }
  }
  
  private async startDataPolling() {
    if (!this.config.supabaseTable || !this.config.supabaseField) return
    
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from(this.config.supabaseTable!)
          .select(this.config.supabaseField!)
          .single()
        
        if (!error && data) {
          const value = (data as any)[this.config.supabaseField!]
          if (typeof value === 'number') {
            this.setValue(value)
          }
        }
      } catch (err) {
        console.error('Error fetching gauge data:', err)
      }
    }
    
    // Initial fetch
    fetchData()
    
    // Poll every 5 seconds
    setInterval(fetchData, 5000)
    
    // Subscribe to realtime changes
    supabase
      .channel(`gauge_${this.config.label}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.config.supabaseTable!
        },
        (payload) => {
          if (payload.new && this.config.supabaseField! in payload.new) {
            const value = (payload.new as any)[this.config.supabaseField!]
            if (typeof value === 'number') {
              this.setValue(value)
            }
          }
        }
      )
      .subscribe()
  }
}