
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { AppState } from '../types';

interface PolaroidProps {
  position: [number, number, number];
  rotation: [number, number, number];
  imageUrl?: string;
  appState: AppState;
  isActive: boolean;
  onClick: (e: any) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ position, rotation, imageUrl, appState, isActive, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const photoMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  
  const texture = useMemo(() => {
     if (imageUrl) {
         const tex = new THREE.TextureLoader().load(imageUrl);
         tex.colorSpace = THREE.SRGBColorSpace;
         return tex;
     }
     return null;
  }, [imageUrl]);

  const initialPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const initialRot = useMemo(() => new THREE.Euler(...rotation), [rotation]);
  
  const explodedPos = useMemo(() => {
    const dir = initialPos.clone().normalize();
    const distance = 15 + Math.random() * 15; 
    return dir.multiplyScalar(distance).add(new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    ));
  }, [initialPos]);

  const explodedRot = useMemo(() => {
    return new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    if (isActive) {
      const parent = groupRef.current.parent;
      if (parent) {
        const camera = state.camera;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const downOffset = cameraUp.multiplyScalar(-0.8);

        const targetWorldPos = camera.position.clone()
            .add(forward.multiplyScalar(6))
            .add(downOffset);
        
        const inverseParentMatrix = parent.matrixWorld.clone().invert();
        const targetLocalPos = targetWorldPos.applyMatrix4(inverseParentMatrix);
        
        groupRef.current.position.lerp(targetLocalPos, 0.1);

        dummyObj.position.copy(targetWorldPos);
        dummyObj.lookAt(camera.position); 
        
        const mouseX = state.pointer.x;
        const mouseY = state.pointer.y;
        
        dummyObj.rotateY(-mouseX * 0.3);
        dummyObj.rotateX(mouseY * 0.3);
        
        const targetWorldQuat = dummyObj.quaternion;
        const parentWorldQuat = new THREE.Quaternion();
        parent.getWorldQuaternion(parentWorldQuat);
        const targetLocalQuat = parentWorldQuat.clone().invert().multiply(targetWorldQuat);
        
        groupRef.current.quaternion.slerp(targetLocalQuat, 0.15);
        groupRef.current.scale.lerp(new THREE.Vector3(2.2, 2.2, 2.2), 0.1);

        // 动态高光控制：让清漆层随着时间产生轻微掠影
        if (photoMaterialRef.current) {
          photoMaterialRef.current.clearcoatRoughness = 0.1 + Math.sin(time) * 0.05;
        }
      }
    } else {
      const targetPos = appState === AppState.SCATTER ? explodedPos : initialPos;
      const targetRotEuler = appState === AppState.SCATTER ? explodedRot : initialRot;
      const targetQuat = new THREE.Quaternion().setFromEuler(targetRotEuler);
      
      groupRef.current.position.lerp(targetPos, 0.05);
      groupRef.current.quaternion.slerp(targetQuat, 0.05);
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group 
        ref={groupRef} 
        onClick={(e) => {
            e.stopPropagation();
            onClick(e);
        }} 
        onPointerOver={() => document.body.style.cursor = 'pointer'} 
        onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* 1. 主相框 - 使用高级物理材质模拟哑光艺术纸 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1.45, 0.06]} />
        <meshPhysicalMaterial 
          color="#fdfdfd" 
          roughness={0.9} 
          metalness={0}
          reflectivity={0.2}
          clearcoat={0}
        />
      </mesh>

      {/* 2. 模拟凹槽边框 - 给照片一种“深嵌”感 */}
      <mesh position={[0, 0.1, 0.025]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
      
      {/* 3. 照片表面 - 关键的高级感：清漆层 + 物理反射 */}
      <mesh position={[0, 0.1, 0.035]}>
        <planeGeometry args={[1, 1]} />
        {texture ? (
           <meshPhysicalMaterial 
             ref={photoMaterialRef}
             map={texture} 
             side={THREE.DoubleSide} 
             roughness={0.2} 
             metalness={0.1}
             clearcoat={1.0}           // 开启清漆层，模拟照片涂层
             clearcoatRoughness={0.1} // 清漆层非常光滑
             reflectivity={0.5}
           />
        ) : (
           <meshStandardMaterial color="#222222" roughness={0.8} />
        )}
      </mesh>

      {/* 4. 底层背板投影 - 模拟细微的物理遮蔽 */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[1.22, 1.47]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      {/* 上传提示 */}
      {!texture && (
        <Html position={[0, 0.1, 0.04]} transform center pointerEvents="none" scale={0.2}>
             <div className="text-white text-center font-serif opacity-30 select-none whitespace-nowrap tracking-widest">
                MOMENT
             </div>
        </Html>
      )}
    </group>
  );
};
