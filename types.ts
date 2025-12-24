
import { ThreeElements } from '@react-three/fiber';

export enum AppState {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  color: string;
  scale: number;
}

// Extend global JSX namespace to include Three.js elements from @react-three/fiber
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      // Add a catch-all to prevent errors if specific elements or their attributes are missing in the current version's types
      [elemName: string]: any;
    }
  }
}
