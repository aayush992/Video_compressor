import axios from 'axios';
import type {
  Job,
  PresetsResponse,
  MediaMetadata,
  StartJobRequest,
  AnalyzeRequest,
  UploadResponse,
  MediaType,
  LayoutStrategyResponse,
  PlatformSuggestion,
  UserPreset,
  EditParams,
} from './types';
import { getStoredToken } from './auth';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 0,           // no timeout – large video uploads can take a while
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

// Inject JWT on every request if present
client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/** Fetch all platform presets grouped by mediaType */
export async function getPresets(): Promise<PresetsResponse> {
  const res = await client.get<PresetsResponse>('/presets');
  return res.data;
}

/** Analyze any file and return its metadata */
export async function analyzeFile(path: string): Promise<MediaMetadata> {
  const body: AnalyzeRequest = { path };
  const res = await client.post<MediaMetadata>('/analyze', body);
  return res.data;
}

/** Upload a file to the backend (multipart) */
export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await client.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      // e.total can be 0 or change between events in some browsers
      if (onProgress && e.total && e.total > 0) {
        // Clamp to [0, 0.99] during upload; caller sets 100 on completion
        onProgress(Math.min(0.99, e.loaded / e.total));
      }
    },
  });
  return res.data;
}

/** Start a new encoding job */
export async function startJob(req: StartJobRequest): Promise<Job> {
  const res = await client.post<Job>('/jobs', { deviceClass: 'desktop', ...req });
  return res.data;
}

/** Poll the status / progress of a job */
export async function getJob(jobId: string): Promise<Job> {
  const res = await client.get<Job>(`/jobs/${jobId}`);
  return res.data;
}

/** Build a URL to download a processed file */
export function downloadUrl(filename: string): string {
  return `${API_BASE}/download/${filename}`;
}

/** Detect mediaType from file mime type */
export function detectMediaType(file: File): MediaType {
  const { type } = file;
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  return 'video'; // fallback
}

/** Get layout/crop strategy for a file + target platform */
export async function getLayoutStrategy(
  inputPath: string,
  platform: string,
  userPreference: 'crop' | 'pad' | '' = '',
): Promise<LayoutStrategyResponse> {
  const res = await client.post<LayoutStrategyResponse>('/layout-strategy', {
    inputPath,
    platform,
    userPreference,
  });
  return res.data;
}

/** Get AI platform suggestions based on file dimensions */
export async function suggestPlatform(inputPath: string): Promise<PlatformSuggestion[]> {
  const res = await client.post<{ suggestions: PlatformSuggestion[] }>('/suggest-platform', { inputPath });
  return res.data.suggestions;
}

/** Save a named preset for the current user (requires auth) */
export async function saveUserPreset(preset: UserPreset): Promise<void> {
  await client.post('/user-presets', preset);
}

/** Load saved presets for the current user (requires auth) */
export async function getUserPresets(): Promise<UserPreset[]> {
  const res = await client.get<{ presets: UserPreset[] }>('/user-presets');
  return res.data.presets;
}

/** Delete a named preset for the current user (requires auth) */
export async function deleteUserPreset(name: string): Promise<void> {
  await client.delete(`/user-presets/${encodeURIComponent(name)}`);
}

/** Generate a short edit preview clip (5 s by default) */
export async function previewEdit(
  inputPath: string,
  edit: EditParams,
  previewDuration = 5.0,
): Promise<{ previewFilename: string; previewPath: string }> {
  const res = await client.post<{ previewFilename: string; previewPath: string }>(
    '/jobs/preview-edit',
    { inputPath, edit, previewDuration },
  );
  return res.data;
}
