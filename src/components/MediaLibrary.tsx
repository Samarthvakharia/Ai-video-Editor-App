import React, { useState } from 'react';
import { Video, Sparkles, Upload, FileVideo, Plus, Trash2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { MediaClip } from '../types';

interface MediaLibraryProps {
  clips: MediaClip[];
  onAddClip: (clip: MediaClip) => void;
  onDeleteClip: (id: string) => void;
  onAddToTimeline: (clip: MediaClip) => void;
}

export const stockClips: MediaClip[] = [
  {
    id: 'stock-joyride',
    name: 'Coastal Road Joyride',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?q=80&w=300&auto=format&fit=crop',
    aspectRatio: '16:9',
    isGenerated: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stock-escapes',
    name: 'Alpine Valley Ascent',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300&auto=format&fit=crop',
    aspectRatio: '16:9',
    isGenerated: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stock-campfire',
    name: 'Campfire Wilderness Glow',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=300&auto=format&fit=crop',
    aspectRatio: '16:9',
    isGenerated: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stock-skyline',
    name: 'Metropolitan Nightscape',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=300&auto=format&fit=crop',
    aspectRatio: '16:9',
    isGenerated: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'stock-dirtroad',
    name: 'Redwood Valley Cruise',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    duration: 10,
    thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=300&auto=format&fit=crop',
    aspectRatio: '16:9',
    isGenerated: false,
    createdAt: new Date().toISOString()
  }
];

// Beautiful, reassuring loading messages for the video generator
const loadingMessages = [
  "Initializing Veo 3 engine...",
  "Analyzing semantic prompt context...",
  "Synthesizing high-fidelity lighting grids...",
  "Rendering spatial frame geometry (this takes a minute)...",
  "Optimizing cinematic motion vectors...",
  "Running temporal consistency passes...",
  "Finalizing color space and encoding stream...",
  "Assembling video bits and transferring...",
];

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  clips,
  onAddClip,
  onDeleteClip,
  onAddToTimeline
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'generate'>('library');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // Generation status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [operationName, setOperationName] = useState<string | null>(null);

  // Interval for changing message
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev + 1) % loadingMessages.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    
    // Create a temporary video element to read actual duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration) || 10;
      const newClip: MediaClip = {
        id: `user-${Date.now()}`,
        name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        url: url,
        duration: duration,
        thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300&auto=format&fit=crop',
        aspectRatio: '16:9',
        isGenerated: false,
        createdAt: new Date().toISOString()
      };
      onAddClip(newClip);
    };
    tempVideo.src = url;
  };

  // Start the Veo 3 Video Generation
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGenerationStep(0);
    setGenerationError(null);
    setOperationName(null);

    try {
      // 1. Post start request to Express API
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start generation on the server");
      }

      const opName = startData.operationName;
      setOperationName(opName);

      // 2. Poll status of operation
      let attempts = 0;
      const maxAttempts = 50; // Poll for up to ~4-5 minutes
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("Video generation timed out. Please try again.");
        }

        attempts++;
        console.log(`Polling attempt ${attempts} for operation ${opName}...`);

        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName }),
        });

        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          throw new Error(statusData.error || "Failed to poll status from the server");
        }

        if (statusData.done) {
          if (statusData.error) {
            throw new Error(statusData.error.message || "Model reported a generation error");
          }

          // 3. Complete! Fetch the downloaded video
          console.log("Operation completed! Downloading video...");
          const downloadRes = await fetch('/api/video-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: opName }),
          });

          if (!downloadRes.ok) {
            const errorText = await downloadRes.text();
            throw new Error(`Failed to download completed video: ${errorText}`);
          }

          const blob = await downloadRes.blob();
          const localUrl = URL.createObjectURL(blob);

          // Construct a nice title
          const title = prompt.length > 25 ? prompt.substring(0, 22) + '...' : prompt;

          // Add generated video to the library
          const newGeneratedClip: MediaClip = {
            id: `veo-${Date.now()}`,
            name: `Veo: ${title}`,
            url: localUrl,
            duration: 6, // Veo 3 previews are typically 5-6 seconds
            thumbnail: aspectRatio === '16:9' 
              ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop'
              : 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=300&auto=format&fit=crop',
            aspectRatio: aspectRatio,
            isGenerated: true,
            promptUsed: prompt,
            createdAt: new Date().toISOString()
          };

          onAddClip(newGeneratedClip);
          setIsGenerating(false);
          setPrompt('');
          setActiveTab('library');
        } else {
          // Poll again in 6 seconds
          setTimeout(poll, 6000);
        }
      };

      // Start polling
      setTimeout(poll, 6000);

    } catch (err: any) {
      console.error("Video Generation Error:", err);
      setGenerationError(err.message || "An unexpected error occurred during generation.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-zinc-800" id="media-library-container">
      {/* Tab bar header */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'library'
              ? 'text-zinc-100 border-b border-zinc-100 bg-black/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
          }`}
          id="tab-library"
        >
          <FileVideo size={13} />
          Media Bin ({clips.length})
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'generate'
              ? 'text-amber-500 border-b border-amber-500 bg-black/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/10'
          }`}
          id="tab-generate"
        >
          <Sparkles size={13} className="text-amber-500" />
          AI Generator
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'library' ? (
          <div className="space-y-4">
            {/* Upload Area */}
            <label className="flex flex-col items-center justify-center p-5 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg cursor-pointer bg-[#0a0a0a] hover:bg-black/60 transition-all group">
              <Upload className="text-zinc-500 group-hover:text-zinc-300 transition-colors mb-2" size={18} />
              <span className="text-xs uppercase tracking-wider font-medium text-zinc-300">Import Local Video</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-600 mt-1">MP4, WebM assets</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Clips List */}
            <div className="grid grid-cols-2 gap-3">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="group relative bg-[#0a0a0a] rounded border border-zinc-800 hover:border-zinc-700 overflow-hidden transition-all flex flex-col justify-between"
                  id={`media-clip-${clip.id}`}
                >
                  {/* Thumbnail / Video Preview Area */}
                  <div className="aspect-video relative bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={clip.thumbnail}
                      alt={clip.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-75 group-hover:opacity-60 transition-all duration-300"
                    />
                    
                    {/* Duration badge */}
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[8px] font-mono text-zinc-400 border border-zinc-900">
                      {Math.floor(clip.duration / 60)}:{(clip.duration % 60).toString().padStart(2, '0')}
                    </div>

                    {/* Aspect ratio badge */}
                    <div className="absolute top-1 left-1 bg-black/80 px-1 rounded text-[8px] font-mono text-zinc-500 border border-zinc-900">
                      {clip.aspectRatio}
                    </div>

                    {/* AI Tag */}
                    {clip.isGenerated && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-zinc-950 p-0.5 rounded-full" title="AI Generated with Veo">
                        <Sparkles size={8} />
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => onAddToTimeline(clip)}
                        className="bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-wider font-bold shadow-lg transition-all"
                        title="Add to sequence"
                      >
                        Add to Timeline
                      </button>
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="p-2 border-t border-zinc-900">
                    <div className="text-[10px] font-medium text-zinc-300 truncate" title={clip.name}>
                      {clip.name}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono">
                        {clip.id.startsWith('stock-') ? 'Stock' : clip.isGenerated ? 'Veo 3' : 'Local'}
                      </span>
                      {/* Delete option (Only for custom/AI clips) */}
                      {!clip.id.startsWith('stock-') && (
                        <button
                          onClick={() => onDeleteClip(clip.id)}
                          className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition-colors"
                          title="Delete clip"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg">
              <div className="flex gap-2.5 items-start">
                <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif italic text-sm text-zinc-100">Veo 3.1 Neural Generator</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Type a high-fidelity visual description to generate an entirely new 6-second video clip using Google's state-of-the-art Veo 3.1 model.
                  </p>
                </div>
              </div>
            </div>

            {/* Prompt input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Visual Description / Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="A high-altitude cinematic drone shot hovering over a neon cyberpunk city at night, heavy rain, reflective puddle streets, volumetric purple searchlights..."
                className="w-full h-28 p-3 text-xs bg-[#050505] border border-zinc-800 focus:border-zinc-700 focus:ring-0 rounded text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Aspect ratio selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAspectRatio('16:9')}
                  className={`py-2 px-3 rounded-md border text-[10px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 ${
                    aspectRatio === '16:9'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-[#050505] border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="w-4 h-2 border border-current rounded-xs flex-shrink-0" />
                  16:9
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2 px-3 rounded-md border text-[10px] uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 ${
                    aspectRatio === '9:16'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-[#050505] border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="w-2 h-4 border border-current rounded-xs flex-shrink-0" />
                  9:16
                </button>
              </div>
            </div>

            {/* Error Display */}
            {generationError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-200 rounded-lg flex gap-2 items-start">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <div className="text-[10px] leading-relaxed">
                  <span className="font-semibold block mb-0.5">Generation Failed</span>
                  {generationError}
                </div>
              </div>
            )}

            {/* Submit / Loading */}
            {isGenerating ? (
              <div className="p-6 bg-[#050505] border border-zinc-800 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw size={20} className="text-amber-500 animate-spin" />
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300 animate-pulse block">
                    Generating Video
                  </span>
                  <span className="text-[9px] text-zinc-500 font-medium block italic h-8 flex items-center justify-center max-w-[200px] mx-auto">
                    "{loadingMessages[generationStep]}"
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-1000 animate-pulse" 
                    style={{ width: `${((generationStep + 1) / loadingMessages.length) * 100}%` }}
                  />
                </div>
                <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-mono">
                  Veo rendering process active
                </span>
              </div>
            ) : (
              <button
                onClick={handleGenerateVideo}
                disabled={!prompt.trim()}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-700 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-widest rounded-full shadow-lg transition-all flex items-center justify-center gap-1.5"
                id="btn-generate-veo"
              >
                <Sparkles size={12} className="text-amber-500" />
                Synthesize Video
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
