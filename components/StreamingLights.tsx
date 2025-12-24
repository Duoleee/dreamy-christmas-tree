
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS } from '../constants';

const LIGHT_COUNT = 6;
const SEGMENTS = 120;

const LightStream = ({ index }: { index: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const curve = useMemo(() => {
    const points = [];
    const pointsCount = 7;
    const baseAngle = (index / LIGHT_COUNT) * Math.PI * 2;
    
    for (let i = 0; i < pointsCount; i++) {
      const angle = baseAngle + (i / pointsCount) * Math.PI * 4;
      const h = (i / (pointsCount-1)) * TREE_HEIGHT - (TREE_HEIGHT / 2);
      const r = (1 - (h + TREE_HEIGHT/2) / TREE_HEIGHT) * TREE_RADIUS + 1.2 + Math.random() * 0.8;
      
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        h,
        Math.sin(angle) * r
      ));
    }
    return new THREE.CatmullRomCurve3(points, true);
  }, [index]);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, SEGMENTS, 0.02, 8, true), [curve]);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#00aaff') },
      uOffset: { value: Math.random() * 5.0 }
    },
    vertexShader: `
      varying float vUv;
      void main() {
        vUv = uv.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOffset;
      varying float vUv;
      void main() {
        float flow = mod(vUv - (uTime * 0.1) + uOffset, 1.0);
        float beam = smoothstep(0.0, 0.05, flow) * smoothstep(0.3, 0.05, flow);
        float glow = pow(beam, 4.0) * 4.0;
        gl_FragColor = vec4(uColor * (beam + glow), beam * 0.7);
      }
    `
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial 
        args={[shaderArgs]} 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export const StreamingLights: React.FC = () => {
  return (
    <group>
      {Array.from({ length: LIGHT_COUNT }).map((_, i) => (
        <LightStream key={i} index={i} />
      ))}
    </group>
  );
};
