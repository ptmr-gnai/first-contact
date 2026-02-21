import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  VERTEX_SHADER,
  FRAGMENT_SHADER,
  DEFAULT_UNIFORMS,
  PATTERN_MAP,
} from '../shaders/alienShaders'
import { useEmotionLerp } from './useEmotionLerp'
import { COLORS } from '../constants'

// ---------------------------------------------------------------------------
// Pattern identification -- maps alienOutput.light to a visual pattern ID
// ---------------------------------------------------------------------------
function identifyPattern(light) {
  if (!light || !light.colors || light.colors.length === 0) return null

  const firstColor = light.colors[0]
  const direction = light.direction

  if (firstColor === COLORS.green && light.colors.length === 3) return 'yes'
  if (firstColor === COLORS.red) return 'no'
  if (firstColor === COLORS.blue && direction === 'inward') return 'self'
  if (firstColor === COLORS.blue && direction === 'outward') return 'other'
  if (firstColor === COLORS.blue) return 'self'
  if (firstColor === COLORS.yellow) return 'energy'
  if (firstColor === COLORS.white) return 'direction'
  if (firstColor === COLORS.amber) return 'home'

  return null
}

function patternDuration(light) {
  if (!light || !light.timing) return 1500
  return light.timing.reduce((a, b) => a + b, 0)
}

// ---------------------------------------------------------------------------
// AlienMesh -- R3F component rendered inside a <Canvas>
// Exposes getAnimParams() via ref for bloom controller
// ---------------------------------------------------------------------------
const AlienMesh = forwardRef(function AlienMesh(
  { emotion, alienOutput, clearLightPattern },
  ref
) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { updateUniforms, getAnimParams } = useEmotionLerp(emotion)

  // Expose getAnimParams to parent for bloom interpolation
  useImperativeHandle(ref, () => ({ getAnimParams }), [getAnimParams])

  // Pattern state in refs to avoid React re-renders
  const patternRef = useRef({
    active: false,
    id: null,
    startTime: 0,
    duration: 0,
    fadeOutStart: 0,
  })
  const prevLightRef = useRef(null)

  // Shader material uniforms -- created once
  const uniforms = useMemo(() => DEFAULT_UNIFORMS(), [])

  useFrame(({ clock }, delta) => {
    const material = materialRef.current
    const mesh = meshRef.current
    if (!material || !mesh) return

    const elapsed = clock.elapsedTime

    // 1. Update time uniform
    material.uniforms.uTime.value = elapsed

    // 2. Lerp emotion parameters
    updateUniforms(material, delta)

    // 3. Get current animation params for mesh movement
    const params = getAnimParams()

    // 4. Idle bob + slow rotation
    mesh.position.y = Math.sin(elapsed * params.floatSpeed) * params.floatAmp
    mesh.rotation.y += delta * params.rotSpeed

    // 5. Pattern logic -- driven by alienOutput.light changes
    const light = alienOutput?.light
    if (light && light !== prevLightRef.current) {
      prevLightRef.current = light
      const patternId = identifyPattern(light)
      if (patternId && PATTERN_MAP[patternId]) {
        const cfg = PATTERN_MAP[patternId]
        patternRef.current = {
          active: true,
          id: patternId,
          startTime: elapsed,
          duration: (patternDuration(light) + 200) / 1000,
          fadeOutStart: 0,
          type: cfg.type,
          color: cfg.color,
        }
        material.uniforms.uPatternType.value = cfg.type
        material.uniforms.uPatternColor.value.set(cfg.color[0], cfg.color[1], cfg.color[2])
      }
    }
    // Light was cleared externally
    if (!light && prevLightRef.current) {
      prevLightRef.current = null
      patternRef.current.active = false
      material.uniforms.uPatternIntensity.value = 0
    }

    // Animate active pattern
    const p = patternRef.current
    if (p.active) {
      const t = elapsed - p.startTime
      const progress = Math.min(t / p.duration, 1.0)

      let effectiveProgress = progress
      let intensity = 1.0

      if (p.id === 'yes') {
        const pulseT = (progress * 3) % 1
        effectiveProgress = pulseT
        intensity = 1.0 - progress * 0.3
      } else if (p.id === 'no') {
        intensity = Math.sin(progress * Math.PI) * 0.8 + 0.2
        effectiveProgress = progress
      } else if (p.id === 'self') {
        effectiveProgress = progress
        intensity = 1.0 - progress * 0.2
      } else if (p.id === 'other') {
        effectiveProgress = progress
        intensity = 1.0 - progress * 0.2
      } else if (p.id === 'energy') {
        intensity = 1.0 - progress * 0.3
        effectiveProgress = progress
      } else if (p.id === 'direction') {
        effectiveProgress = progress
        intensity = Math.sin(progress * Math.PI)
      } else if (p.id === 'home') {
        intensity = Math.sin(progress * Math.PI) * 0.7 + 0.3
        effectiveProgress = progress
      }

      material.uniforms.uPatternProgress.value = effectiveProgress
      material.uniforms.uPatternIntensity.value = intensity

      if (progress >= 1.0) {
        p.active = false
        material.uniforms.uPatternIntensity.value = 0
        if (clearLightPattern) clearLightPattern()
      }
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.0, 4]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
})

export default AlienMesh
