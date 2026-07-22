export interface MediaClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  thumbnail: string;
  aspectRatio: '16:9' | '9:16';
  isGenerated: boolean;
  promptUsed?: string;
  createdAt: string;
}

export interface ColorGradingSettings {
  exposure: number;     // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  temperature: number;  // -100 to 100
  tint: number;         // -100 to 100
  highlights: number;   // -100 to 100
  shadows: number;      // -100 to 100
  vignette: number;     // 0 to 100
  lutPreset: string;    // 'none', 'cinematic', 'cyberpunk', 'retro', 'noir', 'warm-sunset', 'dreamy'
}

export interface TimelineClip {
  id: string;          // Unique instance ID on timeline
  mediaId: string;     // Reference to MediaClip id
  startOffset: number; // Cut start time relative to original clip (seconds)
  endOffset: number;   // Cut end time relative to original clip (seconds)
  timelineStart: number; // Start time on the overall timeline (seconds)
  duration: number;    // endOffset - startOffset
  track: number;       // Layer/track index (default 0)
  colorGrading: ColorGradingSettings;
}

export type TransitionType =
  | 'none'
  | 'crossfade'
  | 'zoom'
  | 'wipe-left'
  | 'wipe-right'
  | 'glitch'
  | 'ripple'
  | 'slide-left'
  | 'slide-right'
  | 'spin';

export interface TimelineTransition {
  id: string;          // Unique ID
  fromClipId: string;  // Left clip
  toClipId: string;    // Right clip
  type: TransitionType;
  duration: number;    // seconds (e.g. 0.5 to 2)
  aiPrompt?: string;   // description of what was generated
  isAIGenerated: boolean;
  veoTransitionUrl?: string; // Optional URL if generated via Veo 3 morphing
}

export interface TransitionPreset {
  type: TransitionType;
  name: string;
  description: string;
  icon: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  settings: ColorGradingSettings;
  previewColor: string; // Tailwind hex or class
}

export interface ExportSettings {
  format: 'mp4' | 'gif' | 'webm';
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
}
