'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei'
import { useRef, Suspense, useMemo, memo } from 'react'
import * as THREE from 'three'

const AnimatedSphere = memo(function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
    }
  })

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color="#3b82f6"
          speed={2}
          distort={0.4}
          radius={1}
          metalness={0.8}
          roughness={0.2}
          emissive="#1e40af"
          emissiveIntensity={0.3}
        />
      </mesh>
    </Float>
  )
})

const ParticleField = memo(function ParticleField() {
  const points = useRef<THREE.Points>(null)
  const particlesCount = 250 // Reduced for better performance

  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3)
    for (let i = 0; i < particlesCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [particlesCount])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x = state.clock.getElapsedTime() * 0.05
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#06b6d4"
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  )
})

// Fallback component for loading state
function BackgroundFallback() {
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 animate-pulse" />
  )
}

export const Background3D = memo(function Background3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Suspense fallback={<BackgroundFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          className="opacity-50"
          dpr={[1, 2]} // Limit pixel ratio for better performance
          performance={{ min: 0.5 }} // Lower performance threshold
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} color="#3b82f6" intensity={1} />
          <pointLight position={[-10, -10, -10]} color="#06b6d4" intensity={0.5} />
          <AnimatedSphere />
          <ParticleField />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            enableDamping={false} // Disable damping for better performance
          />
        </Canvas>
      </Suspense>
    </div>
  )
})