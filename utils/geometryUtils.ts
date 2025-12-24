
import * as THREE from 'three';
import { PARTICLE_COUNT, TREE_HEIGHT, TREE_RADIUS, COLORS } from '../constants';
import { Point3D } from '../types';

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const generateTreePoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const h = Math.random();
    const y = (h * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    const r = (1 - h) * TREE_RADIUS;
    const angle = h * 25 + (Math.random() * Math.PI * 2);
    const radius = Math.random() * r; 

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    points.push({
      x, 
      y, 
      z, 
      color: getRandomColor(),
      scale: Math.random() * 0.5 + 0.2
    });
  }
  return points;
};

export const generateExplosionPoints = (count: number): Point3D[] => {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    const radius = 10 + Math.random() * 10;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    points.push({
      x, y, z,
      color: getRandomColor(),
      scale: Math.random() * 0.5 + 0.2
    });
  }
  return points;
};

export const generateTreeSurfacePoints = (count: number): { position: [number, number, number], rotation: [number, number, number] }[] => {
  const items: { position: [number, number, number], rotation: [number, number, number] }[] = [];
  
  for (let i = 0; i < count; i++) {
    // 使用黄金分割比或者更均匀的螺旋分布来放置照片，避免视觉堆叠
    const h = 0.1 + (i / count) * 0.8; 
    const y = (h * TREE_HEIGHT) - (TREE_HEIGHT / 2);
    const r = (1 - h) * TREE_RADIUS + 0.5; // 稍微离开树体表面一点点
    
    const angle = (i * Math.PI * 2 * 0.618) + (Math.random() * 0.5); // 黄金角分布
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    const position: [number, number, number] = [x, y, z];
    
    const dummy = new THREE.Object3D();
    dummy.position.set(x, y, z);
    dummy.lookAt(x * 2, y, z * 2); // 保持朝外
    
    // 增加一点点随机倾斜，像挂在树上的装饰
    dummy.rotateZ((Math.random() - 0.5) * 0.2);
    dummy.rotateX((Math.random() - 0.5) * 0.1);
    
    const rotation: [number, number, number] = [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z];
    
    items.push({ position, rotation });
  }
  
  return items;
};
