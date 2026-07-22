import React, { useState, useEffect } from 'react';
import { 
  Video, Sparkles, Sliders, Layers, Play, Pause, RotateCcw, 
  Settings, Film, Download, Check, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { MediaClip, TimelineClip, TimelineTransition, ColorGradingSettings, ExportSettings } from './types';
import { MediaLibrary, stockClips } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { VideoTimeline } from './components/VideoTimeline';
import { ColorGrading } from './components/ColorGrading';
import { TransitionGenerator } from './components/TransitionGenerator';

export default function App() {
  // --- States ---
  const [mediaClips, setMediaClips] = useState<MediaClip[]>(stockClips);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [transitions, setTransitions] = useState<TimelineTransition[]>([]);
  
  // Selection States
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  
  // Playback States
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineAspectRatio, setTimelineAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // UI active panels
  const [activeSidePanel, setActiveSidePanel] = useState<'color' | 'transition'>('color');

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState('');
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);

  // --- Helper: Recalculate Timeline starts ---
  const recalculateTimeline = (
    clips: TimelineClip[],
    transList: TimelineTransition[]
  ): TimelineClip[] => {
    if (clips.length === 0) return [];

    const updatedClips = [...clips];
    updatedClips[0] = {
      ...updatedClips[0],
      timelineStart: 0,
      duration: updatedClips[0].endOffset - updatedClips[0].startOffset
    };

    for (let i = 1; i < updatedClips.length; i++) {
      const prevClip = updatedClips[i - 1];
      // Find transition between prevClip and updatedClips[i]
      const trans = transList.find(t => t.fromClipId === prevClip.id && t.toClipId === updatedClips[i].id);
      const transDur = (trans && trans.type !== 'none') ? trans.duration : 0;

      const timelineStart = Math.max(0, prevClip.timelineStart + prevClip.duration - transDur);
      updatedClips[i] = {
        ...updatedClips[i],
        timelineStart,
        duration: updatedClips[i].endOffset - updatedClips[i].startOffset
      };
    }

    return updatedClips;
  };

  // --- Calculate total timeline duration ---
  const totalDuration = timelineClips.length > 0
    ? timelineClips[timelineClips.length - 1].timelineStart + timelineClips[timelineClips.length - 1].duration
    : 0;

  // --- Actions ---

  // Add new clip to Media Library
  const handleAddMediaClip = (clip: MediaClip) => {
    setMediaClips((prev) => [clip, ...prev]);
  };

  // Delete clip from Media Library
  const handleDeleteMediaClip = (id: string) => {
    setMediaClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Add Clip to Timeline Sequence
  const handleAddToTimeline = (mediaClip: MediaClip) => {
    const defaultColor: ColorGradingSettings = {
      exposure: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      highlights: 0,
      shadows: 0,
      vignette: 0,
      lutPreset: 'none'
    };

    const newTimelineClip: TimelineClip = {
      id: `timeline-item-${Date.now()}`,
      mediaId: mediaClip.id,
      startOffset: 0,
      endOffset: mediaClip.duration,
      timelineStart: 0, // Computed below
      duration: mediaClip.duration,
      track: 0,
      colorGrading: defaultColor
    };

    let updatedClips = [...timelineClips, newTimelineClip];
    let updatedTransitions = [...transitions];

    // If there's an existing clip, bridge them with a default CUT transition
    if (timelineClips.length > 0) {
      const prevClip = timelineClips[timelineClips.length - 1];
      const newTransition: TimelineTransition = {
        id: `trans-${Date.now()}`,
        fromClipId: prevClip.id,
        toClipId: newTimelineClip.id,
        type: 'none',
        duration: 1.0,
        isAIGenerated: false
      };
      updatedTransitions.push(newTransition);
    }

    // Recalculate timeline offsets
    updatedClips = recalculateTimeline(updatedClips, updatedTransitions);

    setTimelineClips(updatedClips);
    setTransitions(updatedTransitions);
    setSelectedClipId(newTimelineClip.id);
    setActiveSidePanel('color');
  };

  // Remove clip from Timeline
  const handleRemoveTimelineClip = (clipId: string) => {
    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return;

    let updatedClips = timelineClips.filter((c) => c.id !== clipId);
    
    // Filter out transitions attached to this clip
    let updatedTransitions = transitions.filter(
      (t) => t.fromClipId !== clipId && t.toClipId !== clipId
    );

    // If we removed a clip from the middle, we need to stitch the surrounding clips together
    if (clipIndex > 0 && clipIndex < timelineClips.length - 1) {
      const leftClip = timelineClips[clipIndex - 1];
      const rightClip = timelineClips[clipIndex + 1];
      
      const newStitchedTransition: TimelineTransition = {
        id: `trans-stitch-${Date.now()}`,
        fromClipId: leftClip.id,
        toClipId: rightClip.id,
        type: 'none',
        duration: 1.0,
        isAIGenerated: false
      };
      updatedTransitions.push(newStitchedTransition);
    }

    updatedClips = recalculateTimeline(updatedClips, updatedTransitions);

    setTimelineClips(updatedClips);
    setTransitions(updatedTransitions);
    
    if (selectedClipId === clipId) setSelectedClipId(null);
    if (currentTime > 0) setCurrentTime(0);
  };

  // Rearrange clips (Move index left/right)
  const handleMoveClip = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= timelineClips.length) return;

    const updatedClips = [...timelineClips];
    // Swap items
    const temp = updatedClips[index];
    updatedClips[index] = updatedClips[targetIdx];
    updatedClips[targetIdx] = temp;

    // Completely rebuild transitions based on new indices to prevent broken bridges
    const newTransitions: TimelineTransition[] = [];
    for (let i = 0; i < updatedClips.length - 1; i++) {
      const fromC = updatedClips[i];
      const toC = updatedClips[i + 1];

      // Try to find old matching transition to preserve settings
      const existing = transitions.find(
        (t) => t.fromClipId === fromC.id && t.toClipId === toC.id
      ) || {
        id: `trans-swap-${Date.now()}-${i}`,
        fromClipId: fromC.id,
        toClipId: toC.id,
        type: 'none',
        duration: 1.0,
        isAIGenerated: false
      };
      newTransitions.push(existing as TimelineTransition);
    }

    const calculated = recalculateTimeline(updatedClips, newTransitions);
    setTimelineClips(calculated);
    setTransitions(newTransitions);
  };

  // Trim clip length
  const handleTrimClip = (clipId: string, startOffset: number, endOffset: number) => {
    const updatedClips = timelineClips.map((clip) => {
      if (clip.id === clipId) {
        return {
          ...clip,
          startOffset,
          endOffset,
          duration: endOffset - startOffset
        };
      }
      return clip;
    });

    const calculated = recalculateTimeline(updatedClips, transitions);
    setTimelineClips(calculated);
  };

  // Update Color grading settings on a clip
  const handleUpdateColorSettings = (clipId: string, settings: ColorGradingSettings) => {
    setTimelineClips((prev) =>
      prev.map((clip) => (clip.id === clipId ? { ...clip, colorGrading: settings } : clip))
    );
  };

  // Update transition details (e.g. change type or duration)
  const handleUpdateTransition = (transitionId: string, updates: Partial<TimelineTransition>) => {
    const updatedTransitions = transitions.map((t) =>
      t.id === transitionId ? { ...t, ...updates } : t
    );
    setTransitions(updatedTransitions);

    // Transitions impact starts, so recalculate
    const calculated = recalculateTimeline(timelineClips, updatedTransitions);
    setTimelineClips(calculated);
  };

  // Select a transition to open side panel
  const handleSelectTransition = (id: string) => {
    setSelectedTransitionId(id);
    setSelectedClipId(null);
    setActiveSidePanel('transition');
  };

  // Select a clip to open color panel
  const handleSelectClip = (id: string) => {
    setSelectedClipId(id);
    setSelectedTransitionId(null);
    setActiveSidePanel('color');
  };

  // Get active transition clip data (A and B adjacent clips)
  const getSelectedTransitionClips = () => {
    if (!selectedTransitionId) return { clipA: null, clipB: null };
    const trans = transitions.find((t) => t.id === selectedTransitionId);
    if (!trans) return { clipA: null, clipB: null };

    const clipA = timelineClips.find((c) => c.id === trans.fromClipId) || null;
    const clipB = timelineClips.find((c) => c.id === trans.toClipId) || null;
    return { clipA, clipB };
  };

  const { clipA: transClipA, clipB: transClipB } = getSelectedTransitionClips();
  const activeTransition = transitions.find((t) => t.id === selectedTransitionId) || null;
  const selectedClip = timelineClips.find((c) => c.id === selectedClipId) || null;

  // --- Mock Export Sequence ---
  const triggerExport = () => {
    if (timelineClips.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportDownloadUrl(null);

    const steps = [
      { text: "Reading timeline sequence and tracks...", duration: 1500 },
      { text: "Compositing clip transition matrices...", duration: 1800 },
      { text: "Rendering Color Grading LUT frames (60 FPS)...", duration: 2500 },
      { text: "Blending custom Veo 3 AI video bridges...", duration: 2000 },
      { text: "Stitching digital spatial audio channels...", duration: 1200 },
      { text: "Muxing and exporting high-fidelity H.264 MP4...", duration: 1500 }
    ];

    let currentStepIdx = 0;
    
    const runExportStep = () => {
      if (currentStepIdx >= steps.length) {
        setExportProgress(100);
        setExportStep("Export Complete!");
        // Set the exported download URL as the first clip's URL
        const firstClipUrl = getClipUrl();
        setExportDownloadUrl(firstClipUrl);
        return;
      }

      const step = steps[currentStepIdx];
      setExportStep(step.text);
      
      const calculatedProgress = Math.round((currentStepIdx / steps.length) * 100);
      setExportProgress(calculatedProgress);

      setTimeout(() => {
        currentStepIdx++;
        runExportStep();
      }, step.duration);
    };

    runExportStep();
  };

  const getClipUrl = () => {
    if (timelineClips.length === 0) return "";
    const firstMediaId = timelineClips[0].mediaId;
    const media = mediaClips.find((m) => m.id === firstMediaId);
    return media ? media.url : "";
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden flex flex-col" id="applet-root">
      {/* Top Main Navigation Header */}
      <header className="h-14 bg-[#0d0d0d] border-b border-zinc-800 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-xl text-white tracking-tight">CineVeo AI Studio</span>
          </div>
          <div className="hidden md:flex space-x-6 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
            <span className="text-zinc-100">Workspace</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Neural Assets</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Sequence Master</span>
          </div>
        </div>

        {/* Global Configuration Controls */}
        <div className="flex items-center gap-4">
          {/* Sequence Ratio toggle */}
          <div className="flex items-center bg-[#0a0a0a] border border-zinc-800 rounded-full p-0.5">
            <button
              onClick={() => setTimelineAspectRatio('16:9')}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                timelineAspectRatio === '16:9'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <div className="w-3 h-2 border border-current rounded-xs" />
              16:9
            </button>
            <button
              onClick={() => setTimelineAspectRatio('9:16')}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                timelineAspectRatio === '9:16'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <div className="w-2 h-3 border border-current rounded-xs" />
              9:16
            </button>
          </div>

          <button
            onClick={triggerExport}
            disabled={timelineClips.length === 0}
            className="bg-zinc-100 hover:bg-white text-zinc-950 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed h-9 px-5 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-all flex items-center gap-1.5"
            id="btn-export-project"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Side: Media Library and Veo 3 Video Generator */}
        <div className="w-80 shrink-0 h-full border-r border-zinc-800 bg-[#0d0d0d]">
          <MediaLibrary
            clips={mediaClips}
            onAddClip={handleAddMediaClip}
            onDeleteClip={handleDeleteMediaClip}
            onAddToTimeline={handleAddToTimeline}
          />
        </div>

        {/* Center: Preview Player */}
        <div className="flex-1 h-full flex flex-col min-w-0 bg-[#080808]">
          <PreviewPlayer
            timelineClips={timelineClips}
            transitions={transitions}
            mediaClips={mediaClips}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={setCurrentTime}
            onPlayStateChange={setIsPlaying}
            timelineAspectRatio={timelineAspectRatio}
          />
        </div>

        {/* Right Side: AI Scene Transitions / Color Grading Adjuster */}
        <div className="w-80 shrink-0 h-full border-l border-zinc-800 bg-[#0d0d0d]">
          {activeSidePanel === 'color' ? (
            <ColorGrading
              selectedClip={selectedClip}
              onUpdateColorSettings={handleUpdateColorSettings}
            />
          ) : (
            <TransitionGenerator
              activeTransition={activeTransition}
              clipA={transClipA}
              clipB={transClipB}
              mediaClips={mediaClips}
              onUpdateTransition={handleUpdateTransition}
              onClose={() => {
                setSelectedTransitionId(null);
                setActiveSidePanel('color');
              }}
            />
          )}
        </div>
      </div>

      {/* Horizontal Multi-track Timeline Footer */}
      <VideoTimeline
        timelineClips={timelineClips}
        transitions={transitions}
        mediaClips={mediaClips}
        selectedClipId={selectedClipId}
        selectedTransitionId={selectedTransitionId}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSelectClip={handleSelectClip}
        onSelectTransition={handleSelectTransition}
        onRemoveClip={handleRemoveTimelineClip}
        onMoveClip={handleMoveClip}
        onTrimClip={handleTrimClip}
        onSeek={setCurrentTime}
      />

      {/* EXPORTING PROGRESS OVERLAY MODAL */}
      {isExporting && (
        <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <Film size={16} className="text-amber-500" />
                <h3 className="font-serif italic text-base text-white">Rendering Master File</h3>
              </div>
              {!exportDownloadUrl && (
                <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-amber-500 font-bold border border-zinc-800">
                  {exportProgress}%
                </span>
              )}
              {exportDownloadUrl && (
                <button
                  onClick={() => setIsExporting(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {exportDownloadUrl ? (
              <div className="space-y-4 text-center py-2 flex flex-col items-center">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/30 mb-2">
                  <Check size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif italic text-lg text-white">Export Complete</h4>
                  <p className="text-[11px] text-zinc-500 max-w-[280px] leading-relaxed">
                    All color grades, scene filters, and neural transitions have been baked into the master file.
                  </p>
                </div>
                
                <div className="w-full pt-4 flex gap-2">
                  <a
                    href={exportDownloadUrl}
                    download="cineveo_final_master.mp4"
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-full shadow-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} /> Download Video
                  </a>
                  <button
                    onClick={() => setIsExporting(false)}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs uppercase tracking-wider rounded-full transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2.5">
                  <RefreshCw size={12} className="text-amber-500 animate-spin shrink-0" />
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {exportStep}
                  </span>
                </div>
                <div className="w-full bg-zinc-900 border border-zinc-800/60 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300" 
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 font-mono block tracking-wider uppercase">
                  Do not close this tab. Neural engine rendering in progress.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
