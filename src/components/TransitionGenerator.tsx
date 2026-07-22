import React, { useState } from 'react';
import { Sparkles, ArrowRight, RefreshCw, Layers, Check, Info, Settings, Zap, Play } from 'lucide-react';
import { TimelineTransition, TransitionType, MediaClip, TimelineClip, TransitionPreset } from '../types';

interface TransitionGeneratorProps {
  activeTransition: TimelineTransition | null;
  clipA: TimelineClip | null;
  clipB: TimelineClip | null;
  mediaClips: MediaClip[];
  onUpdateTransition: (transitionId: string, updates: Partial<TimelineTransition>) => void;
  onClose: () => void;
}

export const transitionPresets: TransitionPreset[] = [
  {
    type: 'crossfade',
    name: 'Cross Dissolve',
    description: 'Classic soft linear overlap. Smoothly blends Clip A into Clip B.',
    icon: '🌓'
  },
  {
    type: 'zoom',
    name: 'Zoom Blur',
    description: 'Rapid dynamic scaling with cinematic radial blur. High energy.',
    icon: '🔍'
  },
  {
    type: 'wipe-left',
    name: 'Wipe Left',
    description: 'Linear wipe sliding edge from right to left across the screen.',
    icon: '◀️'
  },
  {
    type: 'wipe-right',
    name: 'Wipe Right',
    description: 'Linear wipe sliding edge from left to right across the screen.',
    icon: '▶️'
  },
  {
    type: 'glitch',
    name: 'Analog Glitch',
    description: 'High-tech digital static, chromatic shifts, and noise flash. Futuristic.',
    icon: '⚡'
  },
  {
    type: 'ripple',
    name: 'Liquid Ripple',
    description: 'Organic watery ripple distortion waves that expand from center.',
    icon: '🌊'
  },
  {
    type: 'slide-left',
    name: 'Slide Left',
    description: 'Push slide transition. Clip B physically pushes Clip A leftward.',
    icon: '⬅️'
  },
  {
    type: 'slide-right',
    name: 'Slide Right',
    description: 'Push slide transition. Clip B physically pushes Clip A rightward.',
    icon: '➡️'
  },
  {
    type: 'spin',
    name: 'Spin Dissolve',
    description: 'Rotational twist dissolve with motion blur. Perfect for action cuts.',
    icon: '🔄'
  }
];

// Beautiful loading messages for the custom transition clip generator
const veoLoadingMessages = [
  "Dreaming up transition kinematics...",
  "Morphing pixels of Clip A into Clip B...",
  "Applying generative motion synthesis...",
  "Computing optical flow vectors in Veo 3...",
  "Smoothing temporal frame interpolation...",
  "Rendering final seamless video bridge (nearly there)...",
];

export const TransitionGenerator: React.FC<TransitionGeneratorProps> = ({
  activeTransition,
  clipA,
  clipB,
  mediaClips,
  onUpdateTransition,
  onClose
}) => {
  const [transitionIdea, setTransitionIdea] = useState('');
  const [isDesigning, setIsDesigning] = useState(false);
  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [veoLoadingStep, setVeoLoadingStep] = useState(0);
  const [aiJustification, setAiJustification] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [veoPromptSuggested, setVeoPromptSuggested] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interval for changing message
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingVeo) {
      interval = setInterval(() => {
        setVeoLoadingStep((prev) => (prev + 1) % veoLoadingMessages.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [isGeneratingVeo]);

  if (!activeTransition || !clipA || !clipB) {
    return (
      <div className="h-full bg-[#0d0d0d] p-6 flex flex-col items-center justify-center text-center text-zinc-500 border-l border-zinc-800">
        <Layers size={28} className="mb-3 text-zinc-700 animate-pulse" />
        <h3 className="font-serif italic text-base text-zinc-400">No Transition Slot Selected</h3>
        <p className="text-[10px] text-zinc-600 max-w-[240px] mt-1.5 leading-relaxed">
          Select any of the transition badges <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">T</span> between two timeline clips to open this AI designer.
        </p>
      </div>
    );
  }

  // Get Media Clip names/descriptions
  const mediaA = mediaClips.find(m => m.id === clipA.mediaId);
  const mediaB = mediaClips.find(m => m.id === clipB.mediaId);

  const clipAName = mediaA ? mediaA.name : 'Clip A';
  const clipBName = mediaB ? mediaB.name : 'Clip B';
  const clipADesc = mediaA?.promptUsed || mediaA?.name || 'Inaugural scenery';
  const clipBDesc = mediaB?.promptUsed || mediaB?.name || 'Inaugural scenery';

  // Apply a manual transition preset
  const handleApplyPreset = (type: TransitionType) => {
    onUpdateTransition(activeTransition.id, { type });
  };

  // Ask AI to design a transition
  const handleAIDesignTransition = async () => {
    setIsDesigning(true);
    setErrorMsg(null);
    setAiJustification(null);
    setAiTitle(null);
    setVeoPromptSuggested(null);

    try {
      const response = await fetch('/api/suggest-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipAPrompt: clipADesc,
          clipBPrompt: clipBDesc,
          transitionIdea: transitionIdea
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to suggest transition');
      }

      onUpdateTransition(activeTransition.id, {
        type: data.transitionType as TransitionType,
        duration: data.duration,
        aiPrompt: data.veoPrompt,
        isAIGenerated: true
      });

      setAiJustification(data.justification);
      setAiTitle(data.title);
      setVeoPromptSuggested(data.veoPrompt);
      setTransitionIdea('');
    } catch (err: any) {
      console.error('Error generating AI transition:', err);
      setErrorMsg(err.message || 'Failed to design transition');
    } finally {
      setIsDesigning(false);
    }
  };

  // Generate a Veo 3 Morph Transition Clip
  const handleGenerateVeoTransition = async () => {
    const prompt = veoPromptSuggested || activeTransition.aiPrompt;
    if (!prompt) return;

    setIsGeneratingVeo(true);
    setVeoLoadingStep(0);
    setErrorMsg(null);

    try {
      // 1. Trigger generate
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Seamless transitions morphing: ${prompt}`,
          aspectRatio: mediaA?.aspectRatio || '16:9'
        })
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || 'Failed to start generative transition clip');
      }

      const opName = startData.operationName;

      // 2. Poll status
      let attempts = 0;
      const maxAttempts = 30;
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Video generation timed out.');
        }
        attempts++;

        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName })
        });

        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          throw new Error(statusData.error || 'Failed to poll status');
        }

        if (statusData.done) {
          if (statusData.error) {
            throw new Error(statusData.error.message || 'Generation error');
          }

          // 3. Download
          const downloadRes = await fetch('/api/video-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: opName })
          });

          if (!downloadRes.ok) {
            throw new Error('Failed to download transition clip');
          }

          const blob = await downloadRes.blob();
          const localUrl = URL.createObjectURL(blob);

          // Update transition with the custom morphing video clip
          onUpdateTransition(activeTransition.id, {
            veoTransitionUrl: localUrl
          });

          setIsGeneratingVeo(false);
        } else {
          setTimeout(poll, 6000);
        }
      };

      setTimeout(poll, 6000);
    } catch (err: any) {
      console.error('Error generating Veo transition:', err);
      setErrorMsg(err.message || 'Failed to generate custom morph video');
      setIsGeneratingVeo(false);
    }
  };

  return (
    <div className="h-full bg-[#0d0d0d] border-l border-zinc-800 flex flex-col" id="transition-generator-panel">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0a0a0a]/60">
        <div className="flex items-center gap-2">
          <Layers className="text-zinc-400" size={14} />
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Scene Transition Lab</h3>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 font-bold transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Bridge Indicator */}
        <div className="flex items-center justify-center gap-2.5 p-3 bg-[#0a0a0a] rounded border border-zinc-800">
          <div className="text-[9px] uppercase tracking-wider bg-black px-2.5 py-1 border border-zinc-800 rounded text-zinc-400 truncate max-w-[100px]">
            {clipAName}
          </div>
          <ArrowRight size={12} className="text-zinc-600 shrink-0" />
          <div className="bg-zinc-800 text-zinc-100 font-mono text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-zinc-700">
            {activeTransition.type.toUpperCase()}
          </div>
          <ArrowRight size={12} className="text-zinc-600 shrink-0" />
          <div className="text-[9px] uppercase tracking-wider bg-black px-2.5 py-1 border border-zinc-800 rounded text-zinc-400 truncate max-w-[100px]">
            {clipBName}
          </div>
        </div>

        {/* AI Transition Suggestion Prompt */}
        <div className="bg-[#0a0a0a] p-4 rounded border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles size={12} />
            <h4 className="font-serif italic text-sm text-zinc-100">AI Match-Cut Director</h4>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Analyze the color and movement dynamics of both clips to find a perfect cinematic link, or seed a creative transition idea.
          </p>

          <div className="space-y-2">
            <input
              type="text"
              value={transitionIdea}
              onChange={(e) => setTransitionIdea(e.target.value)}
              disabled={isDesigning}
              placeholder="e.g. morph through fire, dissolve..."
              className="w-full p-2 bg-black border border-zinc-800 focus:border-zinc-700 focus:ring-0 rounded text-xs text-zinc-200 focus:outline-none placeholder-zinc-700"
            />
            <button
              onClick={handleAIDesignTransition}
              disabled={isDesigning}
              className="w-full py-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-950 transition-colors flex items-center justify-center gap-1.5"
            >
              {isDesigning ? <RefreshCw className="animate-spin" size={11} /> : <Sparkles size={11} />}
              {isDesigning ? "Analyzing Clips..." : "Synthesize Transition Concept"}
            </button>
          </div>

          {aiTitle && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-300 flex items-center gap-1">
                <Zap size={11} className="text-amber-500" />
                Designed: {aiTitle}
              </div>
              {aiJustification && (
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/85 rounded text-[10px] text-zinc-400 leading-relaxed flex gap-2">
                  <Info size={12} className="shrink-0 mt-0.5 text-zinc-500" />
                  <div>
                    <span className="font-serif italic text-zinc-200 block mb-0.5">Editorial Choice</span>
                    {aiJustification}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Veo Morph Clip Generation */}
        {(veoPromptSuggested || activeTransition.aiPrompt) && (
          <div className="p-4 bg-[#0a0a0a] rounded border border-zinc-800 space-y-3">
            <div className="flex items-center gap-1.5 text-amber-500">
              <Sparkles size={12} />
              <h4 className="font-serif italic text-sm text-zinc-100">Generative Morphing Bridge</h4>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Synthesize a physical video bridge based on the designed prompt utilizing Veo 3's temporal consistency model.
            </p>
            <div className="p-2.5 bg-black rounded border border-zinc-800 text-[10px] font-mono text-amber-500 italic leading-relaxed">
              "{veoPromptSuggested || activeTransition.aiPrompt}"
            </div>

            {isGeneratingVeo ? (
              <div className="p-4 bg-black rounded border border-zinc-800 flex flex-col items-center justify-center text-center space-y-2.5">
                <RefreshCw size={16} className="text-amber-500 animate-spin" />
                <span className="text-[10px] text-zinc-500 animate-pulse">
                  "{veoLoadingMessages[veoLoadingStep]}"
                </span>
              </div>
            ) : activeTransition.veoTransitionUrl ? (
              <div className="flex items-center justify-between p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                  <Check size={11} className="text-emerald-500" /> Morphing clip active!
                </span>
                <button
                  onClick={handleGenerateVeoTransition}
                  className="text-[9px] uppercase tracking-wider font-bold bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-full text-zinc-300 transition-colors"
                >
                  Regen
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateVeoTransition}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-full text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
              >
                <Play size={11} />
                Generate Morph Video
              </button>
            )}
          </div>
        )}

        {/* Manual Configuration */}
        <div className="space-y-4 pt-4 border-t border-zinc-800/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Transition Presets</label>
            <div className="text-[9px] uppercase tracking-wider text-zinc-600 font-mono flex items-center gap-1">
              <Settings size={9} /> Engine Live
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {transitionPresets.map((preset) => (
              <button
                key={preset.type}
                onClick={() => handleApplyPreset(preset.type)}
                className={`p-3 rounded border text-left flex items-start gap-2 transition-all ${
                  activeTransition.type === preset.type
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
                title={preset.description}
              >
                <span className="text-base shrink-0 select-none mt-0.5">{preset.icon}</span>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold truncate block">
                    {preset.name}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-600 truncate block">
                    {preset.type === 'none' ? 'Cut' : 'FX dissolve'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Duration Slider */}
          {activeTransition.type !== 'none' && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-400 uppercase tracking-wider">Transition Duration</span>
                <span className="text-zinc-200 font-bold">{activeTransition.duration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={activeTransition.duration}
                onChange={(e) => onUpdateTransition(activeTransition.id, { duration: parseFloat(e.target.value) })}
                className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
              />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-200 rounded text-[10px] leading-relaxed">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
