import { useRef, useCallback } from 'react'
import { EMOTION_SHADER_CONFIG } from '../shaders/alienShaders'

// Smooth easeInOut curve
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpColor(from, to, t) {
  return [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
  ]
}

const LERP_DURATION = 0.8 // seconds

/**
 * Hook that smoothly interpolates shader uniforms between emotion states.
 * Returns an object with updateUniforms(material, delta) to call each frame.
 *
 * @param {string} emotion - Current emotion state name
 * @returns {{ updateUniforms: (material: THREE.ShaderMaterial, delta: number) => void, getAnimParams: () => object }}
 */
export function useEmotionLerp(emotion) {
  const fromRef = useRef(null)
  const toRef = useRef(null)
  const lerpTRef = useRef(1.0) // start at 1 = fully arrived
  const prevEmotionRef = useRef(null)
  const currentRef = useRef(null)

  // Snapshot current values as "from" when emotion changes
  if (emotion !== prevEmotionRef.current) {
    const newTarget = EMOTION_SHADER_CONFIG[emotion] || EMOTION_SHADER_CONFIG.curious

    if (prevEmotionRef.current !== null && currentRef.current) {
      // Snapshot current interpolated state as "from"
      fromRef.current = { ...currentRef.current }
    } else {
      // First mount -- start from target directly
      fromRef.current = { ...newTarget }
    }

    toRef.current = newTarget
    lerpTRef.current = 0
    prevEmotionRef.current = emotion
  }

  const updateUniforms = useCallback((material, delta) => {
    if (!material || !material.uniforms) return

    const from = fromRef.current
    const to = toRef.current
    if (!from || !to) return

    // Advance lerp
    if (lerpTRef.current < 1) {
      lerpTRef.current = Math.min(1, lerpTRef.current + delta / LERP_DURATION)
    }

    const t = easeInOut(lerpTRef.current)

    // Compute current interpolated values
    const color = lerpColor(from.color, to.color, t)
    const glowIntensity = lerp(from.glowIntensity, to.glowIntensity, t)
    const rimStrength = lerp(from.rimStrength, to.rimStrength, t)
    const noiseAmplitude = lerp(from.noiseAmplitude, to.noiseAmplitude, t)
    const noiseSpeed = lerp(from.noiseSpeed, to.noiseSpeed, t)
    const noiseFreq = lerp(from.noiseFreq, to.noiseFreq, t)
    const floatAmp = lerp(from.floatAmp, to.floatAmp, t)
    const floatSpeed = lerp(from.floatSpeed, to.floatSpeed, t)
    const rotSpeed = lerp(from.rotSpeed, to.rotSpeed, t)
    const bloomIntensity = lerp(from.bloomIntensity, to.bloomIntensity, t)

    // Store current state for next transition snapshot
    currentRef.current = {
      color: [...color],
      glowIntensity,
      rimStrength,
      noiseAmplitude,
      noiseSpeed,
      noiseFreq,
      floatAmp,
      floatSpeed,
      rotSpeed,
      bloomIntensity,
    }

    // Write to material uniforms
    const u = material.uniforms
    u.uEmotionColor.value.set(color[0], color[1], color[2])
    u.uGlowIntensity.value = glowIntensity
    u.uRimStrength.value = rimStrength
    u.uNoiseAmplitude.value = noiseAmplitude
    u.uNoiseSpeed.value = noiseSpeed
    u.uNoiseFreq.value = noiseFreq
  }, [])

  const getAnimParams = useCallback(() => {
    const c = currentRef.current
    if (!c) {
      const fallback = EMOTION_SHADER_CONFIG[emotion] || EMOTION_SHADER_CONFIG.curious
      return {
        floatAmp: fallback.floatAmp,
        floatSpeed: fallback.floatSpeed,
        rotSpeed: fallback.rotSpeed,
        bloomIntensity: fallback.bloomIntensity,
      }
    }
    return {
      floatAmp: c.floatAmp,
      floatSpeed: c.floatSpeed,
      rotSpeed: c.rotSpeed,
      bloomIntensity: c.bloomIntensity,
    }
  }, [emotion])

  return { updateUniforms, getAnimParams }
}
