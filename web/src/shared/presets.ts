/**
 * shared/presets.ts
 * Client-side fallback preset list (mirrors backend JSON files).
 * The app always fetches from GET /presets at runtime; these are only used
 * if the network request fails.
 */
import type { Preset, PresetsResponse } from '../api/types';

export const FALLBACK_PRESETS: PresetsResponse = {
  video: [
    { platform: 'instagram_reels', label: 'Instagram Reels', mediaType: 'video', resolution: '1080x1920', codec: 'h264', fps: 30, bitrate: '20M', crf: 20, aspectMode: 'crop', maxDuration: 90 },
    { platform: 'tiktok',          label: 'TikTok',           mediaType: 'video', resolution: '1080x1920', codec: 'h264', fps: 30, bitrate: '15M', crf: 22, aspectMode: 'crop', maxDuration: 600 },
    { platform: 'youtube_shorts',  label: 'YouTube Shorts',   mediaType: 'video', resolution: '1080x1920', codec: 'h264', fps: 60, bitrate: '25M', crf: 18, aspectMode: 'crop', maxDuration: 60 },
    { platform: 'youtube_landscape',label:'YouTube (Landscape)',mediaType:'video', resolution:'1920x1080', codec:'h264', fps:60, bitrate:'40M', crf:18, aspectMode:'letterbox', maxDuration: null },
    { platform: 'twitter_video',   label: 'Twitter / X (Video)',mediaType:'video', resolution:'1280x720', codec:'h264', fps:30, bitrate:'10M', crf:23, aspectMode:'letterbox', maxDuration:140 },
    { platform: 'facebook_reels',  label: 'Facebook Reels',   mediaType: 'video', resolution: '1080x1920', codec: 'h264', fps: 30, bitrate: '20M', crf: 20, aspectMode: 'crop', maxDuration: 90 },
  ],
  image: [
    { platform: 'facebook_profile', label: 'Facebook Profile Photo', mediaType: 'image', resolution: '320x320',   codec: 'jpg', crf: 85, aspectMode: 'crop' },
    { platform: 'instagram_post',   label: 'Instagram Post',          mediaType: 'image', resolution: '1080x1080', codec: 'jpg', crf: 82, aspectMode: 'crop' },
    { platform: 'x_post',           label: 'X (Twitter) Post',        mediaType: 'image', resolution: '1200x675',  codec: 'jpg', crf: 80, aspectMode: 'letterbox' },
  ],
  audio: [
    { platform: 'social_post', label: 'Social Post (Audio)',     mediaType: 'audio', codec: 'mp3', bitrate: '128k' },
    { platform: 'podcast',     label: 'Podcast (High Quality)', mediaType: 'audio', codec: 'mp3', bitrate: '192k' },
  ],
};

export function getPresetByPlatform(platform: string, presets: PresetsResponse): Preset | undefined {
  for (const list of Object.values(presets)) {
    const found = list.find((p) => p.platform === platform);
    if (found) return found;
  }
  return undefined;
}
