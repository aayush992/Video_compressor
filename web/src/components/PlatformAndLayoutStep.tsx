import React, { useEffect, useRef, useState } from 'react';
import type { Preset, LayoutOptions, LayoutStrategyResponse, PlatformSuggestion } from '../api/types';
import { getLayoutStrategy, suggestPlatform } from '../api/client';

interface Props {
  presets: Preset[];
  selectedPlatform: string;
  onPlatformChange: (p: string) => void;
  layoutOptions: LayoutOptions;
  onLayoutChange: (l: LayoutOptions) => void;
  uploadedPath: string;         // server-side path returned after upload
  thumbnailDataUrl: string | null;  // browser-side preview for the canvas
  onStrategyLoad: (s: LayoutStrategyResponse) => void;
  onNext: () => void;
}

const MODE_LABELS: Record<string, string> = {
  crop: 'Crop – fill the frame, trim edges',
  pad: 'Pad – keep full frame, add background',
};

const PLATFORM_CARDS = [
  { platform: 'instagram_reels', icon: '📸', name: 'Instagram Reels', aspect: '9:16' },
  { platform: 'tiktok', icon: '🎵', name: 'TikTok', aspect: '9:16' },
  { platform: 'youtube_shorts', icon: '▶️', name: 'YT Shorts', aspect: '9:16' },
  { platform: 'youtube_landscape', icon: '📺', name: 'YouTube', aspect: '16:9' },
  { platform: 'twitter_video', icon: '🐦', name: 'X / Twitter', aspect: '16:9' },
  { platform: 'facebook_reels', icon: '👍', name: 'Facebook', aspect: '9:16' },
];

export default function PlatformAndLayoutStep({
  presets,
  selectedPlatform,
  onPlatformChange,
  layoutOptions,
  onLayoutChange,
  uploadedPath,
  thumbnailDataUrl,
  onStrategyLoad,
  onNext,
}: Props) {
  const [strategy, setStrategy] = useState<LayoutStrategyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlatformSuggestion[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Group presets by mediaType for section headers
  const grouped = presets.reduce<Record<string, Preset[]>>((acc, p) => {
    (acc[p.mediaType] ??= []).push(p);
    return acc;
  }, {});

  // Fetch platform suggestions when a new file is uploaded
  useEffect(() => {
    if (!uploadedPath) return;
    suggestPlatform(uploadedPath)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [uploadedPath]);

  // Fetch layout strategy whenever platform or layout mode changes
  useEffect(() => {
    if (!selectedPlatform || !uploadedPath) return;
    let cancelled = false;
    setLoading(true);
    getLayoutStrategy(uploadedPath, selectedPlatform, layoutOptions.mode === 'none' ? '' : layoutOptions.mode as 'crop' | 'pad')
      .then((s) => {
        if (cancelled) return;
        setStrategy(s);
        onStrategyLoad(s);
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPlatform, layoutOptions.mode, uploadedPath]);

  // Draw overlay on canvas whenever strategy or thumbnail changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !thumbnailDataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const cw = img.naturalWidth;
      const ch = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // --- Draw detection bounding boxes first (below crop overlay) ---
      if (strategy?.detections?.length) {
        strategy.detections.forEach((det) => {
          const isFace = det.label === 'face';
          ctx.strokeStyle = isFace ? '#4ade80' : '#60a5fa';
          ctx.lineWidth   = 2;
          ctx.strokeRect(det.x * cw, det.y * ch, det.w * cw, det.h * ch);

          // Label chip
          const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
          ctx.font      = `bold ${Math.max(11, cw * 0.013)}px Inter, sans-serif`;
          const tw      = ctx.measureText(label).width + 8;
          const ty      = det.y * ch - 2;
          const chipY   = ty - Math.max(14, cw * 0.02);
          ctx.fillStyle = isFace ? 'rgba(74,222,128,0.85)' : 'rgba(96,165,250,0.85)';
          ctx.fillRect(det.x * cw, Math.max(0, chipY), tw, Math.max(14, cw * 0.02));
          ctx.fillStyle = '#000';
          ctx.fillText(label, det.x * cw + 4, Math.max(11, chipY + cw * 0.016));
        });
      }

      if (strategy?.mode === 'crop' && strategy.cropRegion) {
        const { x, y, w, h } = strategy.cropRegion;

        // Dim everything outside the crop region
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.fillRect(0, 0, cw, y * ch);
        ctx.fillRect(0, (y + h) * ch, cw, ch - (y + h) * ch);
        ctx.fillRect(0, y * ch, x * cw, h * ch);
        ctx.fillRect((x + w) * cw, y * ch, cw - (x + w) * cw, h * ch);

        // Crop border
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(x * cw, y * ch, w * cw, h * ch);
      } else if (strategy?.mode === 'pad') {
        ctx.fillStyle = 'rgba(99,102,241,0.25)';
        const targetRatio = strategy.targetAspect
          ? (() => {
              const [tw, th] = strategy.targetAspect.split(':').map(Number);
              return tw / th;
            })()
          : cw / ch;
        const srcRatio = cw / ch;

        if (srcRatio > targetRatio) {
          const barH = (ch - cw / targetRatio) / 2;
          ctx.fillRect(0, 0, cw, barH);
          ctx.fillRect(0, ch - barH, cw, barH);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(0, barH, cw, ch - 2 * barH);
          ctx.setLineDash([]);
        } else {
          // Add left/right bars
          const barW = (cw - ch * targetRatio) / 2;
          ctx.fillRect(0, 0, barW, ch);
          ctx.fillRect(cw - barW, 0, barW, ch);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(barW, 0, cw - 2 * barW, ch);
          ctx.setLineDash([]);
        }
      }
    };
    img.src = thumbnailDataUrl;
  }, [strategy, thumbnailDataUrl]);

  return (
    <div className="step-container">
      <h2 className="step-title">Step 2 – Platform &amp; Layout</h2>

      {/* AI platform suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestion-bar">
          <span className="suggestion-label">💡 AI suggests:</span>
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s.platform}
              className={`suggestion-chip ${selectedPlatform === s.platform ? 'active' : ''}`}
              title={s.reason}
              onClick={() => onPlatformChange(s.platform)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Platform picker — visual grid */}
      <div className="field-group">
        <span className="field-label">Target platform</span>
        <div className="platform-grid">
          {PLATFORM_CARDS.map(({ platform, icon, name, aspect }) => (
            <button
              key={platform}
              className={`platform-card ${selectedPlatform === platform ? 'active' : ''}`}
              data-platform={platform}
              onClick={() => onPlatformChange(platform)}
              type="button"
            >
              <span className="platform-icon">{icon}</span>
              <span className="platform-name">{name}</span>
              <span className="platform-aspect">{aspect}</span>
            </button>
          ))}
        </div>
        {/* Fallback select for other presets */}
        <select
          id="platform-select"
          className="select-input"
          aria-label="Select platform from full list"
          title="Select platform from full list"
          value={selectedPlatform}
          onChange={(e) => onPlatformChange(e.target.value)}
        >
          <option value="">— or choose from all presets —</option>
          {Object.entries(grouped).map(([mt, list]) => (
            <optgroup key={mt} label={mt.charAt(0).toUpperCase() + mt.slice(1)}>
              {list.map((p) => (
                <option key={p.platform} value={p.platform}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Layout mode toggle */}
      <div className="field-group">
        <span className="field-label">Layout mode</span>
        <div className="toggle-row">
          {(['crop', 'pad'] as const).map((m) => (
            <button
              key={m}
              className={`toggle-btn ${layoutOptions.mode === m ? 'active' : ''}`}
              onClick={() => onLayoutChange({ ...layoutOptions, mode: m })}
            >
              {m === 'crop' ? '✂️ ' : '🖼️ '}{MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas preview */}
      {thumbnailDataUrl && (
        <div className="preview-wrapper">
          {loading && <div className="preview-loading">Detecting subjects…</div>}
          <canvas ref={canvasRef} className="preview-canvas" />
          {strategy && (
            <>
              {/* Detection badge */}
              {strategy.detectionMode !== 'none' && (
                <div className="detection-badge">
                  {strategy.detections.length > 0 ? (
                    <>
                      <span className="det-dot det-dot--found" />
                      {strategy.detections.length} subject{strategy.detections.length !== 1 ? 's' : ''} detected
                      <span className="det-backend"> via {strategy.detectionMode}</span>
                    </>
                  ) : (
                    <>
                      <span className="det-dot det-dot--none" />
                      No subjects detected — using safe crop
                      <span className="det-backend"> ({strategy.detectionMode})</span>
                    </>
                  )}
                </div>
              )}
              <p className="preview-note">{strategy.safeAreaNote}</p>
            </>
          )}
        </div>
      )}

      <button
        className="btn-primary"
        disabled={!selectedPlatform}
        onClick={onNext}
      >
        Next →
      </button>
    </div>
  );
}
