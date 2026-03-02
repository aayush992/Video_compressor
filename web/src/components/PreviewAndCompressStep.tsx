import React, { useRef, useState } from 'react';
import type { QualityLevel, LayoutOptions, LayoutStrategyResponse, MediaType, Job, EditParams } from '../api/types';
import type { AdvancedOptions } from './QualityStep';
import { startJob, getJob, downloadUrl } from '../api/client';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  uploadedPath: string;
  filename: string;
  platform: string;
  mediaType: MediaType;
  quality: QualityLevel;
  layoutOptions: LayoutOptions;
  strategy: LayoutStrategyResponse | null;
  thumbnailDataUrl: string | null;
  advancedOptions: AdvancedOptions;
  editParams?: EditParams | null;
  onBack: () => void;
  onReset: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  youtube_landscape: 'YouTube Landscape',
  twitter_video: 'Twitter / X',
  facebook_reels: 'Facebook Reels',
  instagram_post: 'Instagram Post',
  facebook_profile: 'Facebook Profile',
  x_post: 'X / Twitter Post',
  social_post: 'Social Post (Audio)',
  podcast: 'Podcast',
};

const QUALITY_LABELS: Record<QualityLevel, string> = {
  light: '⚡ Light',
  balanced: '⚖️ Balanced',
  best: '💎 Best',
};

let _pollTimer: ReturnType<typeof setInterval> | null = null;

export default function PreviewAndCompressStep({
  uploadedPath,
  filename,
  platform,
  mediaType,
  quality,
  layoutOptions,
  strategy,
  thumbnailDataUrl,
  advancedOptions,
  editParams,
  onBack,
  onReset,
}: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // output_filename is set directly by the backend once encoding is done
  const outputFilename = job?.output_filename
    ?? (job?.output?.originalPath ? job.output.originalPath.split(/[\\\/]/).pop() : null)
    ?? null;

  function stopPoll() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  async function handleCompress() {
    setError(null);
    setRunning(true);
    setEta(null);
    startTimeRef.current = Date.now();
    try {
      const created = await startJob({
        inputPath: uploadedPath,
        platform,
        mediaType,
        quality,
        layoutOptions,
        removeAudio: advancedOptions.removeAudio,
        normalizeLoudness: advancedOptions.normalizeLoudness,
        watermarkText: advancedOptions.watermarkText || undefined,
        watermarkPosition: advancedOptions.watermarkText ? advancedOptions.watermarkPosition : undefined,
        extractAudioOnly: advancedOptions.extractAudioOnly,
        silenceTrim: advancedOptions.silenceTrim,
        edit: editParams ?? undefined,
      });
      setJob(created);

      stopPoll();
      _pollTimer = setInterval(async () => {
        try {
          const updated = await getJob(created.id);
          setJob(updated);
          // ETA calculation
          if (updated.progress > 0.05) {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const estimated = elapsed / updated.progress;
            const remaining = Math.max(0, Math.round(estimated - elapsed));
            setEta(remaining);
          }
          if (updated.status === 'done' || updated.status === 'failed') {
            stopPoll();
            setRunning(false);
            setEta(null);
          }
        } catch { /* keep polling */ }
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start job.');
      setRunning(false);
    }
  }

  const estimatedSize = strategy?.sizeEstimates?.[quality] ?? null;
  const platformLabel = PLATFORM_LABELS[platform] ?? platform;

  return (
    <div className="step-container">
      <h2 className="step-title">Step 4 – Preview &amp; Compress</h2>

      {/* Summary card */}
      <div className="summary-card">
        {thumbnailDataUrl && (
          <img
            src={thumbnailDataUrl}
            alt="preview"
            className="summary-thumb"
          />
        )}
        <div className="summary-info">
          <div className="summary-row">
            <span className="summary-key">File</span>
            <span className="summary-val">{filename}</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Platform</span>
            <span className="summary-val">{platformLabel}</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Aspect</span>
            <span className="summary-val">{strategy?.targetAspect ?? '—'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Layout</span>
            <span className="summary-val summary-val-capitalize">{layoutOptions.mode}</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Quality</span>
            <span className="summary-val">{QUALITY_LABELS[quality]}</span>
          </div>
          {estimatedSize && (
            <div className="summary-row">
              <span className="summary-key">Est. size</span>
              <span className="summary-val">{estimatedSize}</span>
            </div>
          )}
          {advancedOptions.extractAudioOnly && (
            <div className="summary-row">
              <span className="summary-key">Mode</span>
              <span className="summary-val">🎵 Audio extraction</span>
            </div>
          )}
          {!advancedOptions.extractAudioOnly && advancedOptions.removeAudio && (
            <div className="summary-row">
              <span className="summary-key">Audio</span>
              <span className="summary-val">🔇 Removed</span>
            </div>
          )}
          {advancedOptions.normalizeLoudness && (
            <div className="summary-row">
              <span className="summary-key">Loudness</span>
              <span className="summary-val">📊 Normalized</span>
            </div>
          )}
          {advancedOptions.watermarkText && (
            <div className="summary-row">
              <span className="summary-key">Watermark</span>
              <span className="summary-val">"{advancedOptions.watermarkText}" ({advancedOptions.watermarkPosition})</span>
            </div>
          )}
          {advancedOptions.silenceTrim && (
            <div className="summary-row">
              <span className="summary-key">Silence trim</span>
              <span className="summary-val">✂️ On</span>
            </div>
          )}
        </div>
      </div>

      {/* Layout note */}
      {strategy && strategy.mode !== 'none' && (
        <p className="preview-note info">{strategy.safeAreaNote}</p>
      )}

      {/* Error */}
      {error && <p className="error-text">{error}</p>}

      {/* Progress */}
      {job && job.status !== 'done' && job.status !== 'failed' && (
        <div className="progress-wrapper">
          <div
            className="progress-bar"
            title={`${Math.round(job.progress * 100)}% complete`}
            style={{ width: `${Math.round(job.progress * 100)}%` }}
          />
          <span className="progress-label">{Math.round(job.progress * 100)}%</span>
          {eta !== null && eta > 0 && (
            <span className="progress-eta">⏱ ~{eta}s remaining</span>
          )}
        </div>
      )}

      {/* Done – download button */}
      {job?.status === 'done' && (
        <div className="done-banner">
          <span className="done-icon">✅</span>
          <div className="done-info">
            <div className="done-title">Compressed successfully!</div>
            <div className="done-stats">
              {job.original_size != null && (
                <span className="done-stat">Original: <strong>{formatBytes(job.original_size)}</strong></span>
              )}
              {job.compressed_size != null && (
                <span className="done-stat">Compressed: <strong>{formatBytes(job.compressed_size)}</strong></span>
              )}
              {job.percent_saved != null && job.percent_saved > 0 && (
                <span className="done-savings">{Math.round(job.percent_saved)}% smaller 🎉</span>
              )}
            </div>
          </div>
          {outputFilename ? (
            <a
              href={downloadUrl(outputFilename)}
              download={outputFilename}
              className="btn-download"
            >
              ⬇ Download
            </a>
          ) : (
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>Processing…</span>
          )}
        </div>
      )}

      {/* Failed */}
      {job?.status === 'failed' && (
        <p className="error-text">Encoding failed: {job.error ?? 'Unknown error'}</p>
      )}

      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack} disabled={running}>
          ← Back
        </button>

        {!job || job.status === 'failed' ? (
          <button
            className="btn-primary btn-compress"
            onClick={handleCompress}
            disabled={running}
          >
            {running ? 'Starting…' : '🚀 Compress & Download'}
          </button>
        ) : job.status === 'done' ? (
          <button className="btn-secondary" onClick={onReset}>
            Compress another file
          </button>
        ) : null}
      </div>
    </div>
  );
}
