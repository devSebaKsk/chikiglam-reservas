import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'

interface SceneProps {
  children: React.ReactNode
  className?: string
}

export default function Scene({ children, className }: SceneProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {children}
        <OrbitControls enableZoom={false} enablePan={false} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}
