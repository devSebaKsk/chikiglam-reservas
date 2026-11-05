import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec4 modelPos = modelMatrix * vec4(position, 1.0);
    float elevation = sin(modelPos.x * 1.5 + uTime) * 0.15
                    + sin(modelPos.y * 2.0 + uTime * 0.8) * 0.1;
    vElevation = elevation;
    modelPos.z += elevation;
    gl_Position = projectionMatrix * viewMatrix * modelPos;
  }
`

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vec3 pink   = vec3(0.957, 0.024, 0.545);
    vec3 purple = vec3(0.435, 0.157, 0.816);
    vec3 cyan   = vec3(0.102, 0.871, 0.871);

    float mixFactor = vUv.x + vElevation * 2.0;
    vec3 color = mix(purple, pink, sin(mixFactor + uTime * 0.3) * 0.5 + 0.5);
    color = mix(color, cyan, sin(vUv.y * 3.14 + uTime * 0.5) * 0.3);

    float alpha = 0.45 + vElevation * 1.2;
    gl_FragColor = vec4(color, alpha);
  }
`

export default function WaveBackground() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh rotation={[-Math.PI / 4, 0, 0]} position={[0, -1, -2]}>
      <planeGeometry args={[16, 8, 64, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
        uniforms={{ uTime: { value: 0 } }}
      />
    </mesh>
  )
}
