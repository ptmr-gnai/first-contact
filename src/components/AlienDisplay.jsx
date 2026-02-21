import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGame } from '../context/GameContext'
import AlienMesh from '../three/AlienMesh'
import { EMOTION_SHADER_CONFIG } from '../shaders/alienShaders'

export default function AlienDisplay() {
  const { alienEmotion, alienOutput, clearLightPattern, strikes } = useGame()
  const emotion = alienEmotion || 'curious'
  const alienMeshRef = useRef()
  const prevStrikesRef = useRef(strikes)
  const [strikeFlash, setStrikeFlash] = useState(0) // 0=none, 1/2/3=strike level

  const cfg = EMOTION_SHADER_CONFIG[emotion] || EMOTION_SHADER_CONFIG.curious

  // Detect strike changes and trigger CSS reactions
  useEffect(() => {
    if (strikes > prevStrikesRef.current) {
      setStrikeFlash(strikes)
      const holdMs = strikes >= 3 ? 2000 : strikes >= 2 ? 1000 : 200
      const timer = setTimeout(() => setStrikeFlash(0), holdMs)
      prevStrikesRef.current = strikes
      return () => clearTimeout(timer)
    }
    prevStrikesRef.current = strikes
  }, [strikes])

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

  // Strike reaction styles
  const strikeStyle = useMemo(() => {
    if (strikeFlash === 0) return {}
    if (strikeFlash >= 3) {
      return {
        filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 15px rgba(239, 68, 68, 0.6))',
        transform: 'scale(0.85)',
        opacity: 0.4,
        transition: 'all 0.6s ease-out',
      }
    }
    if (strikeFlash >= 2) {
      return {
        filter: 'drop-shadow(0 0 25px rgba(239, 68, 68, 0.7)) drop-shadow(0 0 12px rgba(239, 68, 68, 0.4))',
        animation: 'alienShake 0.4s ease-in-out',
        transition: 'filter 0.3s ease-out',
      }
    }
    return {
      filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))',
      animation: 'alienShake 0.2s ease-in-out',
      transition: 'filter 0.2s ease-out',
    }
  }, [strikeFlash])

  const combinedStyle = {
    width: 300,
    height: 300,
    ...glowStyle,
    ...(strikeFlash > 0 ? strikeStyle : {}),
  }

  return (
    <div className="flex items-center justify-center flex-1 relative">
      <div style={combinedStyle}>
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

      <style>{`
        @keyframes alienShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}
