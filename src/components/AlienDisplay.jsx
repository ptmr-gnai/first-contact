import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useGame } from '../context/GameContext'
import AlienMesh from '../three/AlienMesh'

// Imperatively updates bloom intensity each frame from lerped emotion params
function BloomController({ alienMeshRef, bloomRef }) {
  useFrame(() => {
    if (bloomRef.current && alienMeshRef.current) {
      const { bloomIntensity } = alienMeshRef.current.getAnimParams()
      bloomRef.current.intensity = bloomIntensity
    }
  })
  return null
}

export default function AlienDisplay() {
  const { alienEmotion, alienOutput, clearLightPattern } = useGame()
  const emotion = alienEmotion || 'curious'
  const bloomRef = useRef()
  const alienMeshRef = useRef()

  return (
    <div className="flex items-center justify-center flex-1 relative">
      <div style={{ width: 300, height: 300 }}>
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
          <EffectComposer>
            <Bloom
              ref={bloomRef}
              intensity={1.2}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
          <BloomController alienMeshRef={alienMeshRef} bloomRef={bloomRef} />
        </Canvas>
      </div>
    </div>
  )
}
