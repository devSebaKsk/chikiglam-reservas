import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BRAND_COLORS = ['#f4068b', '#6f28d0', '#1adede', '#fed801', '#f4068b', '#6f28d0']

interface BrandParticlesProps {
  count?: number
}

export default function BrandParticles({ count = 120 }: BrandParticlesProps) {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 14
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6

      const hex = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)]
      const color = new THREE.Color(hex)
      colors[i * 3]     = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return { positions, colors }
  }, [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.04
    meshRef.current.rotation.x = Math.sin(t * 0.02) * 0.1
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
