
import React, { useMemo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTreeSurfacePoints } from '../utils/geometryUtils';
import { Polaroid } from './Polaroid';
import { AppState } from '../types';

interface PhotoCollectionProps {
  images: string[];
  appState: AppState;
  handPos: THREE.Vector2;
  activePhotoIndex: number | null;
  setActivePhotoIndex: (index: number | null) => void;
}

export const PhotoCollection: React.FC<PhotoCollectionProps> = ({ images, appState, handPos, activePhotoIndex, setActivePhotoIndex }) => {
  const locations = useMemo(() => generateTreeSurfacePoints(10), []);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // 手势触发 FOCUS 模式时，根据手部位置选择最接近的照片
  useEffect(() => {
    if (appState === AppState.FOCUS) {
      if (activePhotoIndex === null && groupRef.current) {
        let minDistance = Infinity;
        let bestIndex = 0;

        // 手部的 nx, ny 在 App.tsx 中已经归一化到 [-1, 1]
        // 这里的逻辑是将所有照片投影到屏幕空间，找到离手部最近的那张
        locations.forEach((loc, i) => {
          const worldPos = new THREE.Vector3(...loc.position);
          // 获取 group 的世界变换，因为 group 会随手部移动旋转
          groupRef.current!.localToWorld(worldPos);
          
          // 投影到屏幕归一化坐标 [-1, 1]
          const screenPos = worldPos.project(camera);
          
          // 计算 2D 距离（忽略 Z 轴）
          const dist = Math.hypot(screenPos.x - handPos.x, screenPos.y - handPos.y);
          
          if (dist < minDistance) {
            minDistance = dist;
            bestIndex = i;
          }
        });

        setActivePhotoIndex(bestIndex);
      }
    } else {
      // 离开 FOCUS 模式时清空焦点
      setActivePhotoIndex(null);
    }
  }, [appState]);

  return (
    <group ref={groupRef}>
      {locations.map((loc, i) => (
        <Polaroid
          key={i}
          position={loc.position}
          rotation={loc.rotation}
          imageUrl={images[i]}
          appState={appState}
          isActive={activePhotoIndex === i}
          onClick={() => setActivePhotoIndex(activePhotoIndex === i ? null : i)}
        />
      ))}
    </group>
  );
};
