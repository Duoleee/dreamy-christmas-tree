
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 150;

export const FloatingParticles: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random() * 100;
      const factor = 15 + Math.random() * 15;
      const speed = 0.01 + Math.random() * 0.02;
      const xFactor = (Math.random() - 0.5) * 60;
      const yFactor = (Math.random() - 0.5) * 60;
      const zFactor = (Math.random() - 0.5) * 60;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    particles.forEach((particle, i) => {
      let { t, speed } = particle;
      t = particle.t += speed / 2;
      
      const s = Math.cos(t) * 0.5 + 0.5;

      dummy.position.set(
        particle.xFactor + Math.cos(t / 4) * 2,
        particle.yFactor + Math.sin(t / 5) * 2,
        particle.zFactor + Math.cos(t / 6) * 2
      );
      dummy.scale.setScalar(s * 0.1 + 0.05);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#FFFACD" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};
