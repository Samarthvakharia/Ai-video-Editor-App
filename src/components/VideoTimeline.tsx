import React from 'react';
import { ChevronLeft, ChevronRight, Trash2, Eye, Sliders, Scissors, Layers, Plus } from 'lucide-react';
import { TimelineClip, TimelineTransition, MediaClip } from '../types';

interface VideoTimelineProps {
  timelineClips: TimelineClip[];
  transitions: TimelineTransition[];
  mediaClips: MediaClip[];
  selectedClipId: string | null;
  selectedTransitionId: string | null;
  currentTime: number; // in seconds
  totalDuration: number; // in seconds
  onSelectClip: (clipId: string) => void;
  onSelectTransition: (transitionId: string) => void;
  onRemoveClip: (clipId: string) => void;
  onMoveClip: (index: number, direction: 'left' | 'right') => void;
  onTrimClip: (clipId: string, startOffset: number, endOffset: number) => void;
  onSeek: (time: number) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  timelineClips,
  transitions,
  mediaClips,
  selectedClipId,
  selectedTransitionId,
  currentTime,
  totalDuration,
  onSelectClip,
  onSelectTransition,
  onRemoveClip,
  onMoveClip,
  onTrimClip,
  onSeek
}) => {

  // Click on ruler to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const targetTime = clickPercent * totalDuration;
    onSeek(Math.max(0, Math.min(totalDuration, targetTime)));
  };

  // Find media clip name
  const getMediaClip = (mediaId: string): MediaClip | undefined => {
    return mediaClips.find(c => c.id === mediaId);
  };

  // Handle timeline clip trimming
  const handleTrimChange = (clip: TimelineClip, e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const media = getMediaClip(clip.mediaId);
    if (!media) return;

    const val = parseFloat(e.target.value);
    if (type === 'start') {
      const newStart = Math.min(val, clip.endOffset - 1); // Maintain at least 1s duration
      onTrimClip(clip.id, newStart, clip.endOffset);
    } else {
      const newEnd = Math.max(val, clip.startOffset + 1); // Maintain at least 1s duration
      onTrimClip(clip.id, clip.startOffset, Math.min(newEnd, media.duration));
    }
  };

  return (
    <div className="bg-[#0a0a0a] border-t border-zinc-800 p-4 flex flex-col space-y-3 shrink-0" id="video-timeline-container">
      {/* Timeline Toolbar */}
      <div className="flex justify-between items-center text-xs text-zinc-500 border-b border-zinc-900/60 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-serif italic text-zinc-300 flex items-center gap-1.5">
            <Layers size={12} className="text-zinc-500" /> Track 1 (V1)
          </span>
          <span className="text-zinc-800">|</span>
          <span className="font-mono bg-zinc-900 px-2.5 py-1 rounded text-zinc-300 font-bold border border-zinc-800">
            {Math.floor(currentTime / 60).toString().padStart(2, '0')}:
            {(currentTime % 60).toFixed(1).padStart(4, '0')} 
            <span className="text-zinc-700 text-[10px] ml-1">/</span>
            <span className="text-zinc-500 text-[10px] ml-1">
              {Math.floor(totalDuration / 60).toString().padStart(2, '0')}:
              {Math.floor(totalDuration % 60).toString().padStart(2, '0')}.0
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider text-zinc-600">
          <span className="flex items-center gap-1"><Sliders size={10} /> Active filters rendered live</span>
          <span className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span className="flex items-center gap-1"><Scissors size={10} /> Trim handles active</span>
        </div>
      </div>

      {/* Main Timeline Window */}
      {timelineClips.length === 0 ? (
        <div className="h-28 flex flex-col items-center justify-center text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-[#0d0d0d]/30 py-6">
          <Scissors size={20} className="mb-2 text-zinc-700 animate-pulse" />
          <span className="font-serif italic text-sm text-zinc-400">Timeline is Empty</span>
          <span className="text-[10px] text-zinc-600 max-w-[280px] mt-1.5 leading-relaxed">
            Click "+ Add to Timeline" on any clip in the Media Bin above to construct your sequence.
          </span>
        </div>
      ) : (
        <div className="relative flex flex-col">
          
          {/* Time ruler bar */}
          <div 
            onClick={handleRulerClick}
            className="h-6 w-full bg-zinc-950 border-b border-zinc-800/40 rounded-t-lg relative cursor-ew-resize select-none overflow-hidden"
            id="timeline-ruler"
          >
            {/* Rule Tick Marks */}
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => {
              if (totalDuration <= 0) return null;
              const leftPercent = (i / totalDuration) * 100;
              const isMajor = i % 5 === 0;
              return (
                <div 
                  key={i} 
                  className="absolute bottom-0 flex flex-col items-center justify-end"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  {isMajor && (
                    <span className="text-[8px] font-mono text-zinc-500 mb-1">{i}s</span>
                  )}
                  <div className={`w-[1px] bg-zinc-800 ${isMajor ? 'h-3' : 'h-1.5'}`} />
                </div>
              );
            })}

            {/* Playhead Marker */}
            {totalDuration > 0 && (
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] z-30 pointer-events-none"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="w-3 h-3 bg-amber-500 rotate-45 absolute -top-1.5 -left-[5px] rounded-sm shadow-md" />
              </div>
            )}
          </div>

          {/* Sequence Tracks */}
          <div className="bg-[#0d0d0d]/40 p-3 rounded-b-lg border border-t-0 border-zinc-800/80 flex items-center overflow-x-auto min-h-[90px] gap-1 relative">
            
            {timelineClips.map((clip, idx) => {
              const media = getMediaClip(clip.mediaId);
              if (!media) return null;

              const isSelected = selectedClipId === clip.id;
              
              // Find matching transition after this clip
              const nextClip = timelineClips[idx + 1];
              const transition = nextClip 
                ? transitions.find(t => t.fromClipId === clip.id && t.toClipId === nextClip.id)
                : null;

              const isTransitionSelected = transition && selectedTransitionId === transition.id;

              return (
                <React.Fragment key={clip.id}>
                  {/* Timeline Clip Card */}
                  <div
                    className={`shrink-0 flex flex-col justify-between p-2 rounded border h-16 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-600 shadow-[0_0_12px_rgba(255,255,255,0.05)] ring-1 ring-zinc-500/30'
                        : 'bg-black border-zinc-800 hover:border-zinc-700'
                    }`}
                    style={{ width: `${Math.max(160, clip.duration * 18)}px` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                    }}
                    id={`timeline-clip-${clip.id}`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-zinc-300 truncate block">
                          {media.name}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 block mt-0.5">
                          Trim: {clip.startOffset.toFixed(1)}s - {clip.endOffset.toFixed(1)}s ({clip.duration.toFixed(1)}s)
                        </span>
                      </div>

                      {/* Swap / Move buttons */}
                      <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {idx > 0 && (
                          <button
                            onClick={() => onMoveClip(idx, 'left')}
                            className="p-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                            title="Move clip left"
                          >
                            <ChevronLeft size={10} />
                          </button>
                        )}
                        {idx < timelineClips.length - 1 && (
                          <button
                            onClick={() => onMoveClip(idx, 'right')}
                            className="p-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                            title="Move clip right"
                          >
                            <ChevronRight size={10} />
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveClip(clip.id)}
                          className="p-0.5 bg-zinc-900 border border-zinc-800 hover:border-red-900 hover:bg-red-950/20 text-zinc-600 hover:text-red-400 rounded transition-colors ml-1"
                          title="Remove clip"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Trimming range sliders */}
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      {/* Left Trim Handle */}
                      <div className="flex-1 flex flex-col">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-wider font-semibold">Start In</span>
                        <input
                          type="range"
                          min="0"
                          max={media.duration}
                          step="0.1"
                          value={clip.startOffset}
                          onChange={(e) => handleTrimChange(clip, e, 'start')}
                          className="w-full h-1 bg-black accent-zinc-100 rounded cursor-ew-resize appearance-none"
                        />
                      </div>
                      
                      {/* Right Trim Handle */}
                      <div className="flex-1 flex flex-col">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-wider font-semibold">End Out</span>
                        <input
                          type="range"
                          min="0"
                          max={media.duration}
                          step="0.1"
                          value={clip.endOffset}
                          onChange={(e) => handleTrimChange(clip, e, 'end')}
                          className="w-full h-1 bg-black accent-zinc-100 rounded cursor-ew-resize appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inter-Clip Transition Node */}
                  {transition && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransition(transition.id);
                      }}
                      className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                        isTransitionSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] scale-110 font-bold'
                          : transition.type !== 'none'
                          ? 'bg-[#0a0a0a] text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:scale-105'
                          : 'bg-[#0a0a0a] text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'
                      }`}
                      title={transition.type !== 'none' ? `Transition: ${transition.type} (${transition.duration}s)` : 'No active transition (cut)'}
                      id={`timeline-transition-${transition.id}`}
                    >
                      <span className="text-[9px] font-semibold">
                        {transition.type === 'none' ? 'Cut' : 'T'}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
