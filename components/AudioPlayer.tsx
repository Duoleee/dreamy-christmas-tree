
import React, { useEffect, useRef, useState } from 'react';
import { CHRISTMAS_MUSIC_URL } from '../constants';

interface AudioPlayerProps {
  forceStart?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ forceStart }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // When forceStart becomes true (user clicked "ENTER MAGIC"), attempt to play
  useEffect(() => {
    if (forceStart && audioRef.current) {
      const playAudio = async () => {
        try {
          audioRef.current!.volume = 0.4;
          await audioRef.current!.play();
          setIsPlaying(true);
          setLoadError(false);
        } catch (err) {
          console.warn("Playback blocked or failed. User needs to toggle manually.", err);
          setIsPlaying(false);
        }
      };
      playAudio();
    }
  }, [forceStart]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas events
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setLoadError(false);
        })
        .catch(err => {
          console.error("Manual playback error:", err);
          setLoadError(true);
        });
    }
  };

  const handleAudioError = () => {
    console.error("Audio failed to load from URL:", CHRISTMAS_MUSIC_URL);
    setLoadError(true);
  };

  return (
    <div className="relative">
      <audio 
        ref={audioRef} 
        src={CHRISTMAS_MUSIC_URL} 
        loop 
        preload="auto"
        onError={handleAudioError}
      />
      <button 
        onClick={togglePlay}
        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-3 transition-all border shadow-lg relative group flex items-center gap-2 overflow-hidden w-12 hover:w-32 pointer-events-auto ${loadError ? 'border-red-500/50' : 'border-white/20'}`}
        title={isPlaying ? "暂停音乐" : "播放音乐"}
      >
        <div className="flex-shrink-0">
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </div>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-sm font-serif ml-1">
             {loadError ? "Error" : (isPlaying ? "Pause" : "Play")}
        </span>
        
        {/* Interaction hint if not playing */}
        {!isPlaying && !loadError && (
           <span className="absolute -top-1 -right-1 flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
           </span>
        )}
      </button>
    </div>
  );
};
