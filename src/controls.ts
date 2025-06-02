import * as THREE from 'three'
import { Gauge } from './gauge'

export class TouchControls {
  private camera: THREE.Camera
  private domElement: HTMLElement
  private interactiveObjects: Gauge[] = []
  private selectedObject: Gauge | null = null
  private raycaster: THREE.Raycaster
  private touchStart: { x: number; y: number } | null = null
  private lastTouch: { x: number; y: number } | null = null
  private initialDistance: number = 0
  private isMultiTouch: boolean = false
  private isDragging: boolean = false
  private rotationSpeed: number = 0.005
  private panSpeed: number = 0.002
  private zoomSpeed: number = 0.01
  
  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.raycaster = new THREE.Raycaster()
    
    this.bindEvents()
  }
  
  private bindEvents() {
    // Touch events
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false })
    
    // Mouse events (for desktop testing)
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    
    // Prevent context menu
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
  }
  
  addInteractiveObject(object: Gauge) {
    this.interactiveObjects.push(object)
  }
  
  private getTouchPosition(touch: Touch): { x: number; y: number } {
    const rect = this.domElement.getBoundingClientRect()
    return {
      x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((touch.clientY - rect.top) / rect.height) * 2 + 1
    }
  }
  
  private getMousePosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.domElement.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
  }
  
  private checkIntersection(position: { x: number; y: number }): Gauge | null {
    this.raycaster.setFromCamera(new THREE.Vector2(position.x, position.y), this.camera)
    
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true)
    
    if (intersects.length > 0) {
      // Find the gauge that contains the intersected object
      let object = intersects[0].object
      while (object.parent && !(object instanceof Gauge)) {
        object = object.parent as THREE.Object3D
      }
      return object instanceof Gauge ? object : null
    }
    
    return null
  }
  
  private onTouchStart(event: TouchEvent) {
    event.preventDefault()
    
    if (event.touches.length === 1) {
      // Single touch
      const touch = event.touches[0]
      const position = this.getTouchPosition(touch)
      this.touchStart = position
      this.lastTouch = position
      
      // Check for gauge selection
      const gauge = this.checkIntersection(position)
      if (gauge) {
        this.selectedObject = gauge
        this.showGaugeOverlay(gauge)
      }
    } else if (event.touches.length === 2) {
      // Multi-touch (pinch/zoom)
      this.isMultiTouch = true
      const touch1 = this.getTouchPosition(event.touches[0])
      const touch2 = this.getTouchPosition(event.touches[1])
      this.initialDistance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y)
    }
  }
  
  private onTouchMove(event: TouchEvent) {
    event.preventDefault()
    
    if (event.touches.length === 1 && !this.isMultiTouch) {
      // Single touch drag
      const touch = event.touches[0]
      const position = this.getTouchPosition(touch)
      
      if (this.selectedObject && this.lastTouch) {
        // Drag selected gauge
        const deltaX = position.x - this.lastTouch.x
        const deltaY = position.y - this.lastTouch.y
        
        this.selectedObject.position.x += deltaX * 5
        this.selectedObject.position.y += deltaY * 5
        
        this.isDragging = true
      } else if (this.lastTouch) {
        // Rotate camera
        const deltaX = position.x - this.lastTouch.x
        const deltaY = position.y - this.lastTouch.y
        
        this.camera.rotation.y -= deltaX * this.rotationSpeed * 100
        this.camera.rotation.x -= deltaY * this.rotationSpeed * 100
        
        // Clamp vertical rotation
        this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x))
      }
      
      this.lastTouch = position
    } else if (event.touches.length === 2) {
      // Pinch zoom
      const touch1 = this.getTouchPosition(event.touches[0])
      const touch2 = this.getTouchPosition(event.touches[1])
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y)
      
      const scale = distance / this.initialDistance
      const cameraPos = this.camera.position
      const targetZ = cameraPos.z / scale
      
      // Clamp zoom
      cameraPos.z = Math.max(2, Math.min(10, targetZ))
      
      this.initialDistance = distance
    }
  }
  
  private onTouchEnd(event: TouchEvent) {
    event.preventDefault()
    
    if (event.touches.length === 0) {
      // Check for tap (no dragging occurred)
      if (!this.isDragging && this.touchStart && this.selectedObject) {
        this.handleGaugeTap(this.selectedObject)
      }
      
      // Reset states
      this.selectedObject = null
      this.touchStart = null
      this.lastTouch = null
      this.isMultiTouch = false
      this.isDragging = false
      
      this.hideGaugeOverlay()
    }
  }
  
  // Mouse event handlers for desktop
  private onMouseDown(event: MouseEvent) {
    const position = this.getMousePosition(event)
    this.touchStart = position
    this.lastTouch = position
    
    const gauge = this.checkIntersection(position)
    if (gauge) {
      this.selectedObject = gauge
      this.showGaugeOverlay(gauge)
    }
  }
  
  private onMouseMove(event: MouseEvent) {
    if (!this.lastTouch) return
    
    const position = this.getMousePosition(event)
    
    if (this.selectedObject) {
      // Drag gauge
      const deltaX = position.x - this.lastTouch.x
      const deltaY = position.y - this.lastTouch.y
      
      this.selectedObject.position.x += deltaX * 5
      this.selectedObject.position.y += deltaY * 5
      
      this.isDragging = true
    } else {
      // Rotate camera
      const deltaX = position.x - this.lastTouch.x
      const deltaY = position.y - this.lastTouch.y
      
      this.camera.rotation.y -= deltaX * this.rotationSpeed * 100
      this.camera.rotation.x -= deltaY * this.rotationSpeed * 100
      
      this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x))
    }
    
    this.lastTouch = position
  }
  
  private onMouseUp(event: MouseEvent) {
    if (!this.isDragging && this.selectedObject) {
      this.handleGaugeTap(this.selectedObject)
    }
    
    this.selectedObject = null
    this.touchStart = null
    this.lastTouch = null
    this.isDragging = false
    
    this.hideGaugeOverlay()
  }
  
  private onWheel(event: WheelEvent) {
    event.preventDefault()
    
    const delta = event.deltaY * this.zoomSpeed
    const cameraPos = this.camera.position
    
    cameraPos.z = Math.max(2, Math.min(10, cameraPos.z + delta))
  }
  
  private handleGaugeTap(gauge: Gauge) {
    // Double-tap to expand gauge
    const now = Date.now()
    const lastTap = gauge.userData.lastTap || 0
    
    if (now - lastTap < 300) {
      // Double tap detected
      this.expandGauge(gauge)
    }
    
    gauge.userData.lastTap = now
  }
  
  private expandGauge(gauge: Gauge) {
    // Animate gauge to fullscreen
    // This could trigger a modal or overlay with more detailed controls
    console.log('Expanding gauge:', gauge)
  }
  
  private showGaugeOverlay(gauge: Gauge) {
    // Show metadata overlay for selected gauge
    let overlay = document.querySelector('.gauge-overlay') as HTMLElement
    
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.className = 'gauge-overlay'
      document.body.appendChild(overlay)
    }
    
    const config = (gauge as any).config
    overlay.innerHTML = `
      <div class="gauge-label">${config.label}</div>
      <div class="gauge-value">0</div>
      <div class="gauge-trend">² +5.2%</div>
    `
    
    overlay.classList.add('active')
    
    // Update overlay position
    const updateOverlayPosition = () => {
      const vector = new THREE.Vector3()
      gauge.getWorldPosition(vector)
      vector.project(this.camera)
      
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight
      
      overlay.style.left = `${x + 60}px`
      overlay.style.top = `${y - 30}px`
    }
    
    updateOverlayPosition()
    gauge.userData.overlayUpdate = updateOverlayPosition
  }
  
  private hideGaugeOverlay() {
    const overlay = document.querySelector('.gauge-overlay')
    if (overlay) {
      overlay.classList.remove('active')
    }
  }
  
  update() {
    // Update overlay positions
    this.interactiveObjects.forEach(gauge => {
      if (gauge.userData.overlayUpdate) {
        gauge.userData.overlayUpdate()
      }
    })
  }
}