import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Sparkles, Sliders, Layers } from 'lucide-react';
import { TimelineClip, TimelineTransition, ColorGradingSettings, MediaClip } from '../types';

interface PreviewPlayerProps {
  timelineClips: TimelineClip[];
  transitions: TimelineTransition[];
  mediaClips: MediaClip[];
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  timelineAspectRatio: '16:9' | '9:16';
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  timelineClips,
  transitions,
  mediaClips,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayStateChange,
  timelineAspectRatio
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const [activeClips, setActiveClips] = useState<{
    clipA: TimelineClip | null;
    clipB: TimelineClip | null;
    transition: TimelineTransition | null;
    progress: number; // 0 to 1
  }>({ clipA: null, clipB: null, transition: null, progress: 0 });

  const [isMuted, setIsMuted] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Get matching media asset details
  const getMedia = (mediaId: string): MediaClip | undefined => {
    return mediaClips.find(m => m.id === mediaId);
  };

  // Determine active clips and transitions based on master currentTime
  useEffect(() => {
    if (timelineClips.length === 0) {
      setActiveClips({ clipA: null, clipB: null, transition: null, progress: 0 });
      return;
    }

    // Find if we are currently inside any clip's timeline window
    // (There could be overlap if a transition is active!)
    let clipA: TimelineClip | null = null;
    let clipB: TimelineClip | null = null;
    let activeTransition: TimelineTransition | null = null;
    let progress = 0;

    for (let i = 0; i < timelineClips.length; i++) {
      const clip = timelineClips[i];
      const start = clip.timelineStart;
      const end = start + clip.duration;

      if (currentTime >= start && currentTime <= end) {
        if (!clipA) {
          clipA = clip;
        } else {
          // We are in an overlap region!
          clipB = clip;
          
          // Find matching transition
          const trans = transitions.find(t => t.fromClipId === clipA!.id && t.toClipId === clip.id);
          if (trans) {
            activeTransition = trans;
            // Calculate progress of transition
            const transStart = clip.timelineStart; // Clip B starts at overlap
            const transEnd = clipA!.timelineStart + clipA!.duration; // Clip A ends at end of overlap
            const transDuration = transEnd - transStart;
            progress = Math.max(0, Math.min(1, (currentTime - transStart) / (transDuration || 1)));
          }
          break;
        }
      }
    }

    // Fallback if we just passed the last clip slightly
    if (!clipA && timelineClips.length > 0 && currentTime >= timelineClips[timelineClips.length - 1].timelineStart + timelineClips[timelineClips.length - 1].duration) {
      clipA = timelineClips[timelineClips.length - 1];
    }

    setActiveClips({ clipA, clipB, transition: activeTransition, progress });
  }, [currentTime, timelineClips, transitions]);

  // Sync active video assets when clips change or seek occurs
  useEffect(() => {
    const syncVideo = (video: HTMLVideoElement | null, clip: TimelineClip | null) => {
      if (!video) return;
      if (!clip) {
        video.src = '';
        return;
      }

      const media = getMedia(clip.mediaId);
      if (!media) return;

      // Calculate desired media local playback time
      const clipLocalTime = clip.startOffset + (currentTime - clip.timelineStart);

      // Only re-set src if it changed to prevent flashing
      if (video.src !== media.url) {
        video.src = media.url;
        video.load();
      }

      // Sync time if drift is > 0.15s
      if (Math.abs(video.currentTime - clipLocalTime) > 0.15) {
        video.currentTime = clipLocalTime;
      }

      // Handle play states
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    // If we have an active Veo Transition video bridge, play that instead during transition!
    if (activeClips.transition?.veoTransitionUrl && activeClips.clipB) {
      // Play transition video on video1 slot
      if (video1Ref.current && video1Ref.current.src !== activeClips.transition.veoTransitionUrl) {
        video1Ref.current.src = activeClips.transition.veoTransitionUrl;
        video1Ref.current.load();
      }
      
      const transDuration = activeClips.transition.duration;
      const transProgress = activeClips.progress;
      if (video1Ref.current) {
        video1Ref.current.currentTime = transProgress * video1Ref.current.duration;
        if (isPlaying) video1Ref.current.play().catch(() => {});
        else video1Ref.current.pause();
      }

      // Preload / Pause clipB on video2 slot
      if (video2Ref.current) {
        const mediaB = getMedia(activeClips.clipB.mediaId);
        if (mediaB && video2Ref.current.src !== mediaB.url) {
          video2Ref.current.src = mediaB.url;
        }
        video2Ref.current.currentTime = activeClips.clipB.startOffset;
        video2Ref.current.pause();
      }
    } else {
      // Standard real-time rendering
      syncVideo(video1Ref.current, activeClips.clipA);
      syncVideo(video2Ref.current, activeClips.clipB);
    }
  }, [activeClips.clipA?.id, activeClips.clipB?.id, activeClips.transition?.veoTransitionUrl, isPlaying]);

  // Master frame animation loop for tracking play clock
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = () => {
      const now = performance.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const totalDuration = timelineClips.length > 0
        ? timelineClips[timelineClips.length - 1].timelineStart + timelineClips[timelineClips.length - 1].duration
        : 0;

      const nextTime = currentTime + delta;
      if (nextTime >= totalDuration) {
        onTimeUpdate(totalDuration);
        onPlayStateChange(false); // Stop playing at sequence end
      } else {
        onTimeUpdate(nextTime);
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, currentTime, timelineClips]);

  // Mute toggle sync
  useEffect(() => {
    if (video1Ref.current) video1Ref.current.muted = isMuted;
    if (video2Ref.current) video2Ref.current.muted = isMuted;
  }, [isMuted]);

  // Helper to construct real-time color grading CSS filter string
  const getFilterStyle = (settings: ColorGradingSettings): string => {
    const parts = [
      `brightness(${100 + settings.exposure}%)`,
      `contrast(${100 + settings.contrast}%)`,
      `saturate(${100 + settings.saturation}%)`,
    ];

    if (settings.lutPreset === 'noir') {
      parts.push('grayscale(100%)');
    }
    if (settings.lutPreset === 'retro') {
      parts.push('sepia(35%) contrast(90%)');
    }

    return parts.join(' ');
  };

  // Helper overlay styles for Temperature / Tint / Vignette
  const getOverlayStyles = (settings: ColorGradingSettings) => {
    const overlays: React.CSSProperties[] = [];

    // Temperature (Blue for cool, orange for warm)
    if (settings.temperature > 0) {
      overlays.push({
        background: 'rgba(249, 115, 22, 0.25)', // orange
        opacity: settings.temperature / 100,
        mixBlendMode: 'color-burn',
      });
    } else if (settings.temperature < 0) {
      overlays.push({
        background: 'rgba(59, 130, 246, 0.25)', // blue
        opacity: Math.abs(settings.temperature) / 100,
        mixBlendMode: 'color-dodge',
      });
    }

    // Tint (Green for cool-tint, magenta/rose for warm-tint)
    if (settings.tint > 0) {
      overlays.push({
        background: 'rgba(236, 72, 153, 0.2)', // magenta
        opacity: settings.tint / 100,
        mixBlendMode: 'overlay',
      });
    } else if (settings.tint < 0) {
      overlays.push({
        background: 'rgba(34, 197, 94, 0.15)', // green
        opacity: Math.abs(settings.tint) / 100,
        mixBlendMode: 'overlay',
      });
    }

    // LUT preset specific aesthetic overrides
    if (settings.lutPreset === 'cyberpunk') {
      overlays.push({
        background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(59,130,246,0.15) 100%)',
        mixBlendMode: 'color-dodge',
      });
    } else if (settings.lutPreset === 'warm-sunset') {
      overlays.push({
        background: 'rgba(245, 158, 11, 0.12)', // amber
        mixBlendMode: 'soft-light',
      });
    } else if (settings.lutPreset === 'dreamy') {
      overlays.push({
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(1px)',
        mixBlendMode: 'screen',
      });
    }

    return overlays;
  };

  // Transition style computations
  const getTransitionStyles = () => {
    const { progress, transition } = activeClips;
    if (!transition || transition.type === 'none') {
      return {
        clipA: {} as React.CSSProperties,
        clipB: {} as React.CSSProperties,
      };
    }

    const type = transition.type;

    switch (type) {
      case 'crossfade':
        return {
          clipA: { opacity: 1 - progress },
          clipB: { opacity: progress },
        };
      case 'zoom':
        return {
          clipA: {
            opacity: 1 - progress,
            transform: `scale(${1 + progress * 0.4})`,
            filter: `blur(${progress * 6}px)`,
          },
          clipB: {
            opacity: progress,
            transform: `scale(${0.7 + progress * 0.3})`,
            filter: `blur(${(1 - progress) * 6}px)`,
          },
        };
      case 'wipe-left':
        return {
          clipA: { zIndex: 10 },
          clipB: {
            zIndex: 20,
            clipPath: `inset(0 0 0 ${100 - progress * 100}%)`,
          },
        };
      case 'wipe-right':
        return {
          clipA: { zIndex: 10 },
          clipB: {
            zIndex: 20,
            clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
          },
        };
      case 'slide-left':
        return {
          clipA: { transform: `translateX(${-progress * 100}%)` },
          clipB: { transform: `translateX(${100 - progress * 100}%)` },
        };
      case 'slide-right':
        return {
          clipA: { transform: `translateX(${progress * 100}%)` },
          clipB: { transform: `translateX(${-100 + progress * 100}%)` },
        };
      case 'spin':
        return {
          clipA: {
            opacity: 1 - progress,
            transform: `rotate(${progress * 180}deg) scale(${1 - progress * 0.3})`,
            filter: `blur(${progress * 8}px)`,
          },
          clipB: {
            opacity: progress,
            transform: `rotate(${-180 + progress * 180}deg) scale(${0.7 + progress * 0.3})`,
            filter: `blur(${(1 - progress) * 8}px)`,
          },
        };
      case 'glitch':
        // Simulates high speed flicker displacement
        const glitchShift = isPlaying ? (Math.random() - 0.5) * 12 : 0;
        const glitchOpacity = progress > 0.3 && progress < 0.7 && isPlaying 
          ? (Math.random() > 0.4 ? 0.3 : 0.8) 
          : progress;
        return {
          clipA: {
            opacity: 1 - progress,
            transform: `translateX(${-glitchShift}px)`,
            filter: progress > 0.2 && progress < 0.8 ? 'hue-rotate(90deg) contrast(200%)' : 'none'
          },
          clipB: {
            opacity: glitchOpacity,
            transform: `translateX(${glitchShift}px)`,
            filter: progress > 0.2 && progress < 0.8 ? 'hue-rotate(-90deg) saturate(300%)' : 'none'
          },
        };
      case 'ripple':
        return {
          clipA: {
            opacity: 1 - progress,
            filter: `contrast(130%) saturate(140%) scale(${1 + progress * 0.15})`,
            borderRadius: `${progress * 80}px`,
          },
          clipB: {
            opacity: progress,
            filter: `contrast(130%) saturate(140%) scale(${1.15 - progress * 0.15})`,
          }
        };
      default:
        return { clipA: {}, clipB: {} };
    }
  };

  const transStyles = getTransitionStyles();

  return (
    <div className="flex-1 bg-[#080808] flex flex-col justify-between" id="preview-player-container">
      {/* Top player utility header */}
      <div className="px-4 py-2 bg-black/40 border-b border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-semibold text-zinc-500">
          <Maximize2 size={11} className="text-zinc-600" /> Widescreen Preview
        </span>
        
        {activeClips.transition && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-semibold animate-pulse">
            <Sparkles size={10} />
            {activeClips.transition.veoTransitionUrl ? 'Playing Veo 3 Video Bridge' : `Real-time: ${activeClips.transition.type.toUpperCase()}`}
          </div>
        )}
      </div>

      {/* Main Screen/Stage */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div 
          ref={containerRef}
          className={`relative bg-black rounded shadow-2xl overflow-hidden border border-zinc-850 transition-all duration-300 ${
            timelineAspectRatio === '16:9' ? 'aspect-video w-full max-w-2xl' : 'aspect-[9/16] h-[340px]'
          }`}
          id="player-screen-stage"
        >
          {timelineClips.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-zinc-600 bg-[#080808]">
              <Layers size={28} className="text-zinc-800 mb-3 animate-pulse" />
              <h4 className="font-serif italic text-base text-zinc-400">Sequence Preview Screen</h4>
              <p className="text-[10px] text-zinc-600 max-w-[280px] mt-1.5 leading-relaxed">
                Add cinematic clips to the timeline below to see real-time edits, transitions, and grading filters.
              </p>
            </div>
          ) : (
            <>
              {/* VIDEO 1 SLOT (Clip A or active playing clip) */}
              {activeClips.clipA && (
                <div 
                  className="absolute inset-0 transition-clip"
                  style={{
                    ...transStyles.clipA,
                    filter: getFilterStyle(activeClips.clipA.colorGrading),
                  }}
                >
                  <video
                    ref={video1Ref}
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Dynamic Color Grading Overlays (Temp, Tint, Vignette) */}
                  {getOverlayStyles(activeClips.clipA.colorGrading).map((style, idx) => (
                    <div key={idx} className="absolute inset-0 pointer-events-none" style={style} />
                  ))}

                  {/* Radial Vignette layer */}
                  {activeClips.clipA.colorGrading.vignette > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, transparent 30%, rgba(0,0,0,${activeClips.clipA.colorGrading.vignette / 120}) 100%)`
                      }}
                    />
                  )}
                </div>
              )}

              {/* VIDEO 2 SLOT (Clip B in active transition overlay) */}
              {activeClips.clipB && !activeClips.transition?.veoTransitionUrl && (
                <div 
                  className="absolute inset-0 transition-clip"
                  style={{
                    ...transStyles.clipB,
                    filter: getFilterStyle(activeClips.clipB.colorGrading),
                  }}
                >
                  <video
                    ref={video2Ref}
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />

                  {/* Dynamic Color Grading Overlays */}
                  {getOverlayStyles(activeClips.clipB.colorGrading).map((style, idx) => (
                    <div key={idx} className="absolute inset-0 pointer-events-none" style={style} />
                  ))}

                  {/* Radial Vignette layer */}
                  {activeClips.clipB.colorGrading.vignette > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, transparent 30%, rgba(0,0,0,${activeClips.clipB.colorGrading.vignette / 120}) 100%)`
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Control Panel Footer */}
      <div className="px-4 py-3 bg-[#0d0d0d] border-t border-zinc-800 flex justify-between items-center gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTimeUpdate(0)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title="Reset/Rewind"
          >
            <RotateCcw size={14} />
          </button>
          
          <button
            onClick={() => onPlayStateChange(!isPlaying)}
            disabled={timelineClips.length === 0}
            className={`p-3 rounded-full shadow-lg flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400' 
                : 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-700'
            }`}
            id="btn-play-pause"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
