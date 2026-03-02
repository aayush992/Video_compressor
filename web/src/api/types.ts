// TypeScript types mirroring Python Pydantic models exactly

export type MediaType = 'video' | 'image' | 'audio';
export type QualityLevel = 'light' | 'balanced' | 'best';

export interface CropParams {
  w: number;
  h: number;
  x: number;
  y: number;
}

export interface EditParams {
  crop?: CropParams | null;
  rotate?: number | null;   // 90 | 180 | 270 clockwise
  flipH?: boolean;
  flipV?: boolean;
  fixOrientation?: boolean;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  codec: string;
  audioChannels?: number;
  bitDepth?: number;
  channels?: number;
  mime_type: string;
  originalPath: string;
}

export interface EncodingOptions {
  platform: string;
  resolution?: string;
  codec: string;
  fps?: number;
  bitrate?: string;
  crf?: number;
  aspectMode?: string;
  deviceClass: string;
  mediaType: MediaType;
}

export interface Job {
  id: string;
  status: 'pending' | 'encoding' | 'done' | 'failed';
  progress: number;
  error: string | null;
  input: MediaMetadata | null;
  output: MediaMetadata | null;
  // Auth / ownership
  user_id?: string | null;
  // Metadata
  output_filename?: string | null;
  outputUrl?: string | null;   // Cloudinary / remote URL (preferred for download)
  platform?: string | null;
  quality?: string | null;
  media_type?: string | null;
  created_at?: string | null;
  // Stats
  original_size?: number | null;
  compressed_size?: number | null;
  percent_saved?: number | null;
}

export interface Preset {
  platform: string;
  label: string;
  mediaType: MediaType;
  resolution?: string;
  codec: string;
  fps?: number;
  bitrate?: string;
  crf?: number;
  aspectMode?: string;
  maxDuration?: number | null;
}

/** Response from GET /presets – grouped by mediaType */
export type PresetsResponse = Record<MediaType, Preset[]>;

export interface LayoutOptions {
  mode: 'crop' | 'pad' | 'none';
  safeAreaPreference: 'center' | 'top' | 'bottom';
  backgroundType: 'blur' | 'black';
}

export interface DetectionBox {
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutStrategyResponse {
  mode: 'crop' | 'pad' | 'none';
  targetAspect: string | null;
  safeAreaNote: string;
  backgroundType: 'blur' | 'black' | 'none';
  cropRegion: {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null;
  detections: DetectionBox[];
  detectionMode: 'mediapipe' | 'yolo' | 'none';
  sizeEstimates: Record<QualityLevel, string>;
  sourceSize: {
    width: number;
    height: number;
    duration: number | null;
  };
}

export interface StartJobRequest {
  inputPath: string;
  outputPath?: string;
  platform: string;
  mediaType: MediaType;
  deviceClass?: string;
  quality?: QualityLevel;
  layoutOptions?: LayoutOptions;
  trimStart?: number;
  trimEnd?: number;
  // Audio options
  removeAudio?: boolean;
  normalizeLoudness?: boolean;
  // Watermark options
  watermarkText?: string;
  watermarkPosition?: 'bottomright' | 'bottomleft' | 'topleft' | 'topright' | 'center';
  watermarkLogoPath?: string;
  // Special modes
  extractAudioOnly?: boolean;
  silenceTrim?: boolean;
  // Edit / transform step
  edit?: EditParams | null;
}

export interface PlatformSuggestion {
  platform: string;
  label: string;
  reason: string;
}

export interface UserPreset {
  name: string;
  platform: string;
  quality: QualityLevel;
  layoutMode: string;
  removeAudio: boolean;
  normalizeLoudness: boolean;
  watermarkText: string;
  watermarkPosition: string;
}

export interface AnalyzeRequest {
  path: string;
}

export interface UploadResponse {
  filename: string;
  path: string;
  mediaType: MediaType;
  metadata: MediaMetadata | null;
}

// ---------------------------------------------------------------------------
// Auth types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  tokenId: string;
}
