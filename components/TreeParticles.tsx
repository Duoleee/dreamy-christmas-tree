
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTreePoints, generateExplosionPoints } from '../utils/geometryUtils';
import { PARTICLE_COUNT } from '../constants';
import { AppState } from '../types';

interface TreeParticlesProps {
  appState: AppState;
  onInteract: () => void;
}

export const TreeParticles: React.FC<TreeParticlesProps> = ({ appState }) => {
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
  const cubeMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const SPHERE_COUNT = Math.floor(PARTICLE_COUNT * 0.6);
  const CUBE_COUNT = PARTICLE_COUNT - SPHERE_COUNT;

  const treeData = useMemo(() => generateTreePoints(PARTICLE_COUNT), []);
  const scatterData = useMemo(() => generateExplosionPoints(PARTICLE_COUNT), []);
  
  const currentPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3).map(() => (Math.random() - 0.5) * 0.05), []);
  
  useMemo(() => {
    treeData.forEach((p, i) => {
      currentPositions[i * 3] = p.x;
      currentPositions[i * 3 + 1] = p.y;
      currentPositions[i * 3 + 2] = p.z;
    });
  }, []);

  useFrame((state, delta) => {
    if (!sphereMeshRef.current || !cubeMeshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    let targetData = appState === AppState.TREE ? treeData : scatterData;
    const lerpSpeed = appState === AppState.TREE ? 4.5 * delta : 2.5 * delta;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let tx = targetData[i].x;
      let ty = targetData[i].y;
      let tz = targetData[i].z;

      if (appState === AppState.SCATTER) {
        tx += Math.sin(time * 0.2 + i * 0.1) * 2;
        ty += Math.cos(time * 0.15 + i * 0.15) * 2;
        tz += Math.sin(time * 0.25 + i * 0.05) * 2;
      }

      currentPositions[i * 3] = THREE.MathUtils.lerp(currentPositions[i * 3], tx, lerpSpeed);
      currentPositions[i * 3 + 1] = THREE.MathUtils.lerp(currentPositions[i * 3 + 1], ty, lerpSpeed);
      currentPositions[i * 3 + 2] = THREE.MathUtils.lerp(currentPositions[i * 3 + 2], tz, lerpSpeed);

      dummy.position.set(currentPositions[i * 3], currentPositions[i * 3 + 1], currentPositions[i * 3 + 2]);
      
      const scale = appState === AppState.FOCUS ? targetData[i].scale * 0.3 : targetData[i].scale;
      dummy.scale.setScalar(scale * (1 + Math.sin(time * 3 + i) * 0.1));
      
      dummy.rotation.x += velocities[i * 3] + delta;
      dummy.rotation.y += velocities[i * 3 + 1] + delta;
      dummy.updateMatrix();
      
      const isSphere = i < SPHERE_COUNT;
      const mesh = isSphere ? sphereMeshRef.current : cubeMeshRef.current;
      const index = isSphere ? i : i - SPHERE_COUNT;
      
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(treeData[i].color));
    }
    
    sphereMeshRef.current.instanceMatrix.needsUpdate = true;
    cubeMeshRef.current.instanceMatrix.needsUpdate = true;
    if (sphereMeshRef.current.instanceColor) sphereMeshRef.current.instanceColor.needsUpdate = true;
    if (cubeMeshRef.current.instanceColor) cubeMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, SPHERE_COUNT]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshStandardMaterial metalness={1} roughness={0} emissive="#FFD700" emissiveIntensity={1.2} />
      </instancedMesh>
      <instancedMesh ref={cubeMeshRef} args={[undefined, undefined, CUBE_COUNT]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial metalness={1} roughness={0} emissive="#FFD700" emissiveIntensity={1.0} />
      </instancedMesh>
    </group>
  );
};
