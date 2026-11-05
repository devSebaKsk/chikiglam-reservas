import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GoldenRainProps {
  count?: number
}

export default function GoldenRain({ count = 80 }: GoldenRainProps) {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = Math.random() * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      speeds[i] = 0.01 + Math.random() * 0.02
    }
    return { positions, speeds }
  }, [count])

  useFrame(() => {
    if (!meshRef.current) return
    const pos = meshRef.current.geometry.attributes.position

    for (let i = 0; i < count; i++) {
      (pos.array as Float32Array)[i * 3 + 1] -= speeds[i]
      if ((pos.array as Float32Array)[i * 3 + 1] < -5) {
        (pos.array as Float32Array)[i * 3 + 1] = 5
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#fed801"
        size={0.05}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
