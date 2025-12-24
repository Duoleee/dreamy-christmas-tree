
import React, { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

import { TreeParticles } from './components/TreeParticles';
import { FloatingParticles } from './components/FloatingParticles';
import { TreeTopStar } from './components/TreeTopStar';
import { AudioPlayer } from './components/AudioPlayer';
import { PhotoCollection } from './components/PhotoCollection';
import { AppState } from './types';

const SceneContainer = ({ children, appState, handPos }: { children: React.ReactNode, appState: AppState, handPos: THREE.Vector2 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler());
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const rotationX = -handPos.y * 0.4;
    const rotationY = handPos.x * 0.7;
    
    if (appState !== AppState.FOCUS) {
      targetRotation.current.y += delta * 0.15;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y + rotationY, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotationX, 0.05);
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotationY * 0.3, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotationX * 0.3, 0.05);
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uiVisible, setUiVisible] = useState(true);
  const [handPos, setHandPos] = useState(new THREE.Vector2(0, 0));
  
  const [isGestureEnabled, setIsGestureEnabled] = useState(false);
  const [isMPLoading, setIsMPLoading] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<string>("None");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const appStateRef = useRef<AppState>(AppState.TREE);
  useEffect(() => { appStateRef.current = appState; }, [appState]);

  const hideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('ui-hidden');
  };

  const predict = useCallback(() => {
    if (landmarkerRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        const hand = results.landmarks[0];
        const nx = (hand[9].x - 0.5) * -2; 
        const ny = (hand[9].y - 0.5) * -2;
        setHandPos(new THREE.Vector2(nx, ny));

        const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        const handScale = dist(hand[0], hand[9]);
        const tips = [8, 12, 16, 20];
        const avgTipDist = tips.reduce((sum, tip) => sum + dist(hand[0], hand[tip]), 0) / tips.length;
        const extensionRatio = avgTipDist / handScale;
        const pinchDistRatio = dist(hand[4], hand[8]) / handScale;

        let newGesture = "Tracking...";
        let targetState = appStateRef.current;

        if (extensionRatio < 1.35) {
          targetState = AppState.TREE;
          newGesture = "Fist: Assemble";
        } else if (extensionRatio > 1.7) {
          targetState = AppState.SCATTER;
          newGesture = "Open: Scatter";
        } else if (pinchDistRatio < 0.28) {
          targetState = AppState.FOCUS;
          newGesture = "Pinch: Focus";
        }

        if (targetState !== appStateRef.current) {
          setAppState(targetState);
          if (targetState !== AppState.FOCUS) setActivePhotoIndex(null);
        }
        setDetectedGesture(newGesture);
      } else {
        setDetectedGesture("Hand not found");
      }
    }
    animationFrameRef.current = requestAnimationFrame(predict);
  }, []);

  const toggleGestures = async () => {
    if (isGestureEnabled) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      setIsGestureEnabled(false);
      setHandPos(new THREE.Vector2(0, 0));
      setDetectedGesture("None");
      return;
    }

    setIsMPLoading(true);
    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: { ideal: 30 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsGestureEnabled(true);
          setIsMPLoading(false);
          predict();
        };
      }
    } catch (err) {
      console.error("Gesture Init Error:", err);
      alert("请检查摄像头权限。");
      setIsMPLoading(false);
    }
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasStarted(true);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImgs = Array.from(e.target.files).map(f => URL.createObjectURL(f));
      setImages(prev => [...prev, ...newImgs].slice(0, 10));
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] relative overflow-hidden">
      {!hasStarted && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black transition-all duration-1000">
           <div className="flex flex-col items-center gap-12 text-center px-6">
              <div className="flex flex-col gap-4">
                <h2 className="cinzel text-3xl tracking-[0.3em] text-[#d4af37]">Dreamy Christmas</h2>
                <p className="cinzel text-[10px] text-[#d4af37]/60 tracking-[0.2em] uppercase">Interactive Glow Experience</p>
              </div>
              <button onClick={handleStart} className="glass-btn px-16 py-5 rounded-full cinzel text-[#fceea7] text-xl tracking-[0.3em] hover:scale-110 active:scale-95 shadow-[0_0_60px_rgba(212,175,55,0.4)] transition-all duration-500">
                ENTER MAGIC
              </button>
           </div>
        </div>
      )}

      <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${isGestureEnabled && uiVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
        <video ref={videoRef} className="w-48 h-36 rounded-2xl border-2 border-[#d4af37]/40 bg-black/50 backdrop-blur-lg scale-x-[-1] object-cover" playsInline muted />
      </div>

      <div className={`absolute inset-0 pointer-events-none z-20 flex flex-col items-center transition-opacity duration-1000 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
        <h1 className="serif text-5xl md:text-7xl mt-16 font-bold bg-gradient-to-b from-[#FFFACD] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(212,175,55,0.6)] text-center px-4 tracking-[0.15em] uppercase">
          MERRY CHRISTMAS
        </h1>

        <div className="absolute top-8 right-8 flex flex-col gap-4 pointer-events-auto z-50">
          <AudioPlayer forceStart={hasStarted} />
          <button onClick={toggleGestures} className={`glass-btn p-3 rounded-full cinzel text-[#fceea7] shadow-xl ${isGestureEnabled ? 'state-active' : ''}`}>
             {isMPLoading ? "..." : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>}
          </button>
          <label className="glass-btn p-3 rounded-full cinzel text-[#fceea7] cursor-pointer shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {isGestureEnabled && (
          <div className="gesture-indicator">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
            <span>{detectedGesture}</span>
          </div>
        )}

        <div className="absolute bottom-24 flex gap-4 pointer-events-auto">
          {[AppState.TREE, AppState.SCATTER, AppState.FOCUS].map((state) => (
            <button key={state} onClick={() => {setAppState(state); if(state !== AppState.FOCUS) setActivePhotoIndex(null);}} className={`glass-btn px-6 py-2 rounded-full cinzel text-[10px] tracking-[0.2em] uppercase transition-all ${appState === state ? 'state-active scale-110' : 'opacity-60'}`}>
              {state}
            </button>
          ))}
        </div>

        <p className="absolute bottom-10 cinzel text-[10px] opacity-40 uppercase tracking-[0.6em] text-center px-4">
          {isGestureEnabled ? "FIST: ASSEMBLE • OPEN: SCATTER • PINCH: FOCUS" : "TOGGLE GESTURE OR USE BUTTONS"}
        </p>
      </div>

      <Canvas dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.8 }} onCreated={hideLoader}>
        <PerspectiveCamera makeDefault position={[0, 2, 25]} fov={40} />
        <OrbitControls enableZoom={appState !== AppState.FOCUS} enablePan={false} maxPolarAngle={Math.PI / 1.7} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={50} color="#FFD700" />
        <Suspense fallback={null}>
          <SceneContainer appState={appState} handPos={handPos}>
            <TreeParticles appState={appState} onInteract={() => {}} />
            <TreeTopStar appState={appState} />
            <PhotoCollection images={images} appState={appState} handPos={handPos} activePhotoIndex={activePhotoIndex} setActivePhotoIndex={setActivePhotoIndex} />
          </SceneContainer>
          <FloatingParticles />
        </Suspense>
        <EffectComposer>
          <Bloom luminanceThreshold={0.4} intensity={1.5} radius={0.8} mipmapBlur />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.03} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default App;
