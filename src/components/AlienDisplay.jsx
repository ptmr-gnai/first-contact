import { useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGame } from '../context/GameContext'
import AlienMesh from '../three/AlienMesh'
import { EMOTION_SHADER_CONFIG } from '../shaders/alienShaders'

export default function AlienDisplay() {
  const { alienEmotion, alienOutput, clearLightPattern } = useGame()
  const emotion = alienEmotion || 'curious'
  const alienMeshRef = useRef()

  const cfg = EMOTION_SHADER_CONFIG[emotion] || EMOTION_SHADER_CONFIG.curious

  // CSS glow replaces postprocessing Bloom -- simpler, no circular ref issues
  const glowStyle = useMemo(() => {
    const [r, g, b] = cfg.color
    const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`
    const blur = Math.round(cfg.bloomIntensity * 20)
    const spread = Math.round(cfg.bloomIntensity * 10)
    return {
      filter: `drop-shadow(0 0 ${blur}px rgba(${rgb}, ${cfg.glowIntensity})) drop-shadow(0 0 ${spread}px rgba(${rgb}, ${cfg.glowIntensity * 0.5}))`,
      transition: 'filter 0.8s ease-in-out',
    }
  }, [cfg])

  return (
    <div className="flex items-center justify-center flex-1 relative">
      <div style={{ width: 300, height: 300, ...glowStyle }}>
        <Canvas
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 0, 3.2], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <AlienMesh
            ref={alienMeshRef}
            emotion={emotion}
            alienOutput={alienOutput}
            clearLightPattern={clearLightPattern}
          />
        </Canvas>
      </div>
    </div>
  )
}
