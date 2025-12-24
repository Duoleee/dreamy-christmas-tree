
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT } from '../constants';
import { AppState } from '../types';

export const TreeTopStar: React.FC<{ appState: AppState }> = ({ appState }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.35;
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle - Math.PI/2) * radius;
      const y = Math.sin(angle - Math.PI/2) * radius;
      
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3
  }), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 1.2;
    
    const targetScale = appState === AppState.TREE ? 1 : 0;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    
    // Slight bobbing
    groupRef.current.position.y = (TREE_HEIGHT / 2 + 0.5) + Math.sin(t * 2) * 0.1;
  });

  return (
    <group ref={groupRef} position={[0, TREE_HEIGHT / 2 + 0.5, 0]}>
      <mesh>
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        <meshStandardMaterial 
          color="#FFE135" 
          emissive="#FFD700"
          emissiveIntensity={2} 
          metalness={1}
          roughness={0}
        />
      </mesh>
      <pointLight distance={10} intensity={10} color="#FFD700" decay={2} />
    </group>
  );
};
