import React, { useState } from 'react';
import { Sliders, Sparkles, RefreshCw, Info, Check, Eye } from 'lucide-react';
import { ColorGradingSettings, ColorPreset, TimelineClip } from '../types';

interface ColorGradingProps {
  selectedClip: TimelineClip | null;
  onUpdateColorSettings: (clipId: string, settings: ColorGradingSettings) => void;
}

export const colorPresets: ColorPreset[] = [
  {
    id: 'none',
    name: 'None (Bypass)',
    description: 'Clean, untouched source video profile.',
    previewColor: 'bg-slate-700',
    settings: {
      exposure: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      highlights: 0,
      shadows: 0,
      vignette: 0,
      lutPreset: 'none'
    }
  },
  {
    id: 'cinematic',
    name: 'Teal & Orange',
    description: 'Hollywood standard blockbusters. Warm skin, steel-blue shadows.',
    previewColor: 'bg-cyan-500',
    settings: {
      exposure: 5,
      contrast: 15,
      saturation: 10,
      temperature: 15,
      tint: -10,
      highlights: 5,
      shadows: -15,
      vignette: 20,
      lutPreset: 'cinematic'
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Futuristic sci-fi look. Saturated purples, cyans, and deep shadows.',
    previewColor: 'bg-fuchsia-500',
    settings: {
      exposure: -5,
      contrast: 25,
      saturation: 30,
      temperature: -20,
      tint: 25,
      highlights: 10,
      shadows: -10,
      vignette: 25,
      lutPreset: 'cyberpunk'
    }
  },
  {
    id: 'retro',
    name: '70s Vintage Film',
    description: '1970s analog film aesthetic. Sepia warmth, faded shadows, lowered saturation.',
    previewColor: 'bg-amber-600',
    settings: {
      exposure: 0,
      contrast: -10,
      saturation: -15,
      temperature: 25,
      tint: 10,
      highlights: -10,
      shadows: 15,
      vignette: 15,
      lutPreset: 'retro'
    }
  },
  {
    id: 'noir',
    name: 'Moody Noir',
    description: 'High-contrast monochromatic film. Heavy shadows, intense vignetting.',
    previewColor: 'bg-zinc-800',
    settings: {
      exposure: -10,
      contrast: 30,
      saturation: -100, // True black and white
      temperature: 0,
      tint: 0,
      highlights: -5,
      shadows: -25,
      vignette: 45,
      lutPreset: 'noir'
    }
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset Glow',
    description: 'Golden hour bliss. Rich oranges, high exposure, soft organic highlights.',
    previewColor: 'bg-orange-400',
    settings: {
      exposure: 10,
      contrast: 5,
      saturation: 20,
      temperature: 30,
      tint: 5,
      highlights: 15,
      shadows: -5,
      vignette: 10,
      lutPreset: 'warm-sunset'
    }
  },
  {
    id: 'dreamy',
    name: 'Dreamy Pastel',
    description: 'Ethereal lower contrast, raised shadows, soft bright highlights.',
    previewColor: 'bg-pink-300',
    settings: {
      exposure: 15,
      contrast: -20,
      saturation: -10,
      temperature: -5,
      tint: 15,
      highlights: 20,
      shadows: 20,
      vignette: 5,
      lutPreset: 'dreamy'
    }
  }
];

export const ColorGrading: React.FC<ColorGradingProps> = ({
  selectedClip,
  onUpdateColorSettings
}) => {
  const [moodPrompt, setMoodPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  if (!selectedClip) {
    return (
      <div className="h-full bg-[#0d0d0d] p-6 flex flex-col items-center justify-center text-center text-zinc-500 border-l border-zinc-800">
        <Sliders size={28} className="mb-3 text-zinc-700 animate-pulse" />
        <h3 className="font-serif italic text-base text-zinc-400">No Clip Selected</h3>
        <p className="text-[10px] text-zinc-600 max-w-[240px] mt-1.5 leading-relaxed">
          Select a video clip in the timeline below to open the professional color grading console.
        </p>
      </div>
    );
  }

  const { colorGrading } = selectedClip;

  // Handle slider changes
  const handleSliderChange = (key: keyof ColorGradingSettings, value: number) => {
    onUpdateColorSettings(selectedClip.id, {
      ...colorGrading,
      [key]: value
    });
  };

  // Preset Selection
  const applyPreset = (presetId: string) => {
    const preset = colorPresets.find(p => p.id === presetId);
    if (preset) {
      onUpdateColorSettings(selectedClip.id, { ...preset.settings });
      setAiExplanation(null); // Clear AI explanation if manually applying preset
    }
  };

  // AI Mood grading request
  const handleAIMoodGrade = async () => {
    if (!moodPrompt.trim()) return;

    setIsAnalyzing(true);
    setAiExplanation(null);

    try {
      const response = await fetch('/api/suggest-color-grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodPrompt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get grading suggestions');
      }

      // Build updated settings from AI payload
      const aiSettings: ColorGradingSettings = {
        exposure: Math.round(data.exposure),
        contrast: Math.round(data.contrast),
        saturation: Math.round(data.saturation),
        temperature: Math.round(data.temperature),
        tint: Math.round(data.tint),
        highlights: Math.round(data.highlights),
        shadows: Math.round(data.shadows),
        vignette: Math.round(data.vignette),
        lutPreset: data.lutPreset || 'none'
      };

      onUpdateColorSettings(selectedClip.id, aiSettings);
      setAiExplanation(data.explanation);
      setMoodPrompt('');
    } catch (err) {
      console.error('Error applying AI color grading:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full bg-[#0d0d0d] border-l border-zinc-800 flex flex-col" id="color-grading-panel">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0a0a0a]/60">
        <div className="flex items-center gap-2">
          <Sliders className="text-zinc-400" size={14} />
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Color Grading Console</h3>
        </div>
        <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full font-mono text-zinc-500">
          Clip: {selectedClip.id.substring(0, 5)}...
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* AI-Powered Mood Grading */}
        <div className="bg-[#0a0a0a] p-4 rounded border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles size={12} />
            <h4 className="font-serif italic text-sm text-zinc-100">AI Mood Colorist</h4>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Describe desired look (e.g. "moody green Fincher thriller" or "warm golden 90s film warmth").
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={moodPrompt}
              onChange={(e) => setMoodPrompt(e.target.value)}
              disabled={isAnalyzing}
              placeholder="e.g. cyberpunk neon dream..."
              className="flex-1 p-2 bg-black border border-zinc-800 focus:border-zinc-700 focus:ring-0 rounded text-xs text-zinc-200 focus:outline-none placeholder-zinc-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAIMoodGrade();
              }}
            />
            <button
              onClick={handleAIMoodGrade}
              disabled={isAnalyzing || !moodPrompt.trim()}
              className="px-4 bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 rounded-full text-[10px] uppercase tracking-wider font-bold text-zinc-950 transition-colors flex items-center justify-center shrink-0"
            >
              {isAnalyzing ? <RefreshCw className="animate-spin" size={11} /> : "Grade"}
            </button>
          </div>

          {aiExplanation && (
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded text-[10px] text-zinc-400 leading-relaxed flex gap-2">
              <Info size={12} className="shrink-0 mt-0.5 text-zinc-500" />
              <div>
                <span className="font-serif italic text-zinc-200 block mb-0.5">Cinematographer Analysis</span>
                {aiExplanation}
              </div>
            </div>
          )}
        </div>

        {/* Film Presets / LUTs */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
            <Eye size={11} className="text-zinc-600" />
            Film LUT Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {colorPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full border font-bold transition-all flex items-center gap-1.5 ${
                  colorGrading.lutPreset === preset.id
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${preset.previewColor}`} />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Sliders */}
        <div className="space-y-4 pt-4 border-t border-zinc-800/60">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold block">Manual Adjustments</label>

          {/* Exposure Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Exposure</span>
              <span className={colorGrading.exposure !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.exposure > 0 ? `+${colorGrading.exposure}` : colorGrading.exposure}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.exposure}
              onChange={(e) => handleSliderChange('exposure', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>

          {/* Contrast Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Contrast</span>
              <span className={colorGrading.contrast !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.contrast > 0 ? `+${colorGrading.contrast}` : colorGrading.contrast}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.contrast}
              onChange={(e) => handleSliderChange('contrast', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>

          {/* Saturation Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Saturation</span>
              <span className={colorGrading.saturation !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.saturation > 0 ? `+${colorGrading.saturation}` : colorGrading.saturation}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.saturation}
              onChange={(e) => handleSliderChange('saturation', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Temperature</span>
              <span className={colorGrading.temperature !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.temperature > 0 ? `Warm +${colorGrading.temperature}` : colorGrading.temperature < 0 ? `Cool ${colorGrading.temperature}` : '0'}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.temperature}
              onChange={(e) => handleSliderChange('temperature', parseInt(e.target.value))}
              className="w-full cursor-pointer h-1 bg-gradient-to-r from-blue-500 via-black to-amber-500 rounded appearance-none"
            />
          </div>

          {/* Tint Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Tint</span>
              <span className={colorGrading.tint !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.tint > 0 ? `Magenta +${colorGrading.tint}` : colorGrading.tint < 0 ? `Green ${colorGrading.tint}` : '0'}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.tint}
              onChange={(e) => handleSliderChange('tint', parseInt(e.target.value))}
              className="w-full cursor-pointer h-1 bg-gradient-to-r from-green-500 via-black to-fuchsia-500 rounded appearance-none"
            />
          </div>

          {/* Highlights Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Highlights</span>
              <span className={colorGrading.highlights !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.highlights > 0 ? `+${colorGrading.highlights}` : colorGrading.highlights}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.highlights}
              onChange={(e) => handleSliderChange('highlights', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>

          {/* Shadows Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Shadows</span>
              <span className={colorGrading.shadows !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.shadows > 0 ? `+${colorGrading.shadows}` : colorGrading.shadows}%
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={colorGrading.shadows}
              onChange={(e) => handleSliderChange('shadows', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>

          {/* Vignette Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Vignette</span>
              <span className={colorGrading.vignette !== 0 ? 'text-zinc-200 font-bold' : 'text-zinc-600'}>
                {colorGrading.vignette}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={colorGrading.vignette}
              onChange={(e) => handleSliderChange('vignette', parseInt(e.target.value))}
              className="w-full accent-zinc-100 cursor-pointer h-1 bg-black rounded appearance-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
