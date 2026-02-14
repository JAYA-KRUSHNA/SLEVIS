'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

// Holographic Grid Floor
function HolographicGrid() {
    const gridRef = useRef<THREE.GridHelper>(null);

    useFrame((state) => {
        if (gridRef.current) {
            gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 2;
        }
    });

    return (
        <group position={[0, -2, 0]}>
            <gridHelper
                ref={gridRef}
                args={[100, 100, '#00F0FF', '#00F0FF']}
                position={[0, 0, 0]}
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial
                    color="#00F0FF"
                    opacity={0.02}
                    transparent
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

// Floating Particles
function Particles({ count = 500 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            const scale = Math.random() * 0.05 + 0.01;
            temp.push({ x, y, z, scale });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (mesh.current) {
            const time = state.clock.elapsedTime;
            particles.forEach((particle, i) => {
                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3(
                    particle.x + Math.sin(time + i) * 0.1,
                    particle.y + Math.cos(time + i * 0.5) * 0.1,
                    particle.z
                );
                matrix.setPosition(position);
                matrix.scale(new THREE.Vector3(particle.scale, particle.scale, particle.scale));
                mesh.current!.setMatrixAt(i, matrix);
            });
            mesh.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#00F0FF" transparent opacity={0.6} />
        </instancedMesh>
    );
}

// Rotating Wireframe Globe
function HolographicGlobe() {
    const globeRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (globeRef.current) {
            globeRef.current.rotation.y = time * 0.2;
            globeRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = time * 0.3;
            ringRef.current.rotation.x = Math.PI / 3;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.z = -time * 0.2;
            ring2Ref.current.rotation.x = Math.PI / 2.5;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group>
                {/* Main Globe */}
                <mesh ref={globeRef}>
                    <icosahedronGeometry args={[2, 1]} />
                    <meshBasicMaterial
                        color="#00F0FF"
                        wireframe
                        transparent
                        opacity={0.4}
                    />
                </mesh>

                {/* Inner Sphere */}
                <mesh>
                    <sphereGeometry args={[1.8, 32, 32]} />
                    <meshBasicMaterial
                        color="#FF0099"
                        transparent
                        opacity={0.05}
                    />
                </mesh>

                {/* Orbiting Ring 1 */}
                <mesh ref={ringRef}>
                    <torusGeometry args={[3, 0.02, 16, 100]} />
                    <meshBasicMaterial color="#00F0FF" transparent opacity={0.6} />
                </mesh>

                {/* Orbiting Ring 2 */}
                <mesh ref={ring2Ref}>
                    <torusGeometry args={[3.5, 0.01, 16, 100]} />
                    <meshBasicMaterial color="#FF0099" transparent opacity={0.4} />
                </mesh>

                {/* Core Glow */}
                <pointLight color="#00F0FF" intensity={2} distance={10} />
                <pointLight color="#FF0099" intensity={1} distance={8} />
            </group>
        </Float>
    );
}

// Data Streams (Matrix-like effect)
function DataStreams() {
    const lineRefs = useRef<THREE.Line[]>([]);

    const streams = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 40;
            const z = (Math.random() - 0.5) * 40;
            temp.push({ x, z, speed: Math.random() * 2 + 1 });
        }
        return temp;
    }, []);

    return (
        <group>
            {streams.map((stream, i) => (
                <DataStream key={i} x={stream.x} z={stream.z} speed={stream.speed} />
            ))}
        </group>
    );
}

function DataStream({ x, z, speed }: { x: number; z: number; speed: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const yOffset = useRef(Math.random() * 20);

    useFrame(() => {
        if (groupRef.current) {
            yOffset.current -= speed * 0.02;
            if (yOffset.current < -20) yOffset.current = 20;
            groupRef.current.position.y = yOffset.current;
        }
    });

    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i < 10; i++) {
            pts.push(new THREE.Vector3(0, i * 0.5, 0));
        }
        return pts;
    }, []);

    const lineGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [points]);

    const lineMaterial = useMemo(() => {
        return new THREE.LineBasicMaterial({ color: '#00F0FF', transparent: true, opacity: 0.3 });
    }, []);

    const line = useMemo(() => {
        return new THREE.Line(lineGeometry, lineMaterial);
    }, [lineGeometry, lineMaterial]);

    return (
        <group ref={groupRef} position={[x, 0, z]}>
            <primitive object={line} />
        </group>
    );
}

// Main Scene Component
export default function Scene3D({ children }: { children?: React.ReactNode }) {
    return (
        <div className="canvas-container">
            <Canvas
                camera={{ position: [0, 2, 10], fov: 60 }}
                gl={{ antialias: true, alpha: true }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.1} />
                <pointLight position={[10, 10, 10]} color="#00F0FF" intensity={0.5} />
                <pointLight position={[-10, -10, -10]} color="#FF0099" intensity={0.3} />

                {/* Background */}
                <color attach="background" args={['#020205']} />
                <fog attach="fog" args={['#020205', 10, 50]} />

                {/* Stars */}
                <Stars
                    radius={100}
                    depth={50}
                    count={5000}
                    factor={4}
                    saturation={0}
                    fade
                    speed={1}
                />

                {/* Scene Elements */}
                <HolographicGrid />
                <HolographicGlobe />
                <Particles count={300} />
                <DataStreams />

                {/* Controls */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2}
                    minPolarAngle={Math.PI / 3}
                />
            </Canvas>
            {children}
        </div>
    );
}
