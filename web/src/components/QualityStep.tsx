import React, { useState } from 'react';
import type { QualityLevel, LayoutStrategyResponse } from '../api/types';

export interface AdvancedOptions {
  removeAudio: boolean;
  normalizeLoudness: boolean;
  watermarkText: string;
  watermarkPosition: 'bottomright' | 'bottomleft' | 'topleft' | 'topright' | 'center';
  silenceTrim: boolean;
  extractAudioOnly: boolean;
}

export const DEFAULT_ADVANCED: AdvancedOptions = {
  removeAudio: false,
  normalizeLoudness: false,
  watermarkText: '',
  watermarkPosition: 'bottomright',
  silenceTrim: false,
  extractAudioOnly: false,
};

interface Props {
  quality: QualityLevel;
  onChange: (q: QualityLevel) => void;
  strategy: LayoutStrategyResponse | null;
  mediaType: string;
  advancedOptions: AdvancedOptions;
  onAdvancedChange: (opts: AdvancedOptions) => void;
  onBack: () => void;
  onNext: () => void;
}

const QUALITY_META: Record<QualityLevel, { emoji: string; title: string; desc: string }> = {
  light: {
    emoji: '⚡',
    title: 'Light',
    desc: 'Smaller file, faster – great for quick shares where size matters most.',
  },
  balanced: {
    emoji: '⚖️',
    title: 'Balanced',
    desc: 'Good quality / size trade-off. Recommended for most social platforms.',
  },
  best: {
    emoji: '💎',
    title: 'Best',
    desc: 'Maximum quality, larger file – ideal for archiving or high-fidelity uploads.',
  },
};

const WATERMARK_POS_LABELS: Record<string, string> = {
  bottomright: 'Bottom right',
  bottomleft: 'Bottom left',
  topleft: 'Top left',
  topright: 'Top right',
  center: 'Center',
};

export default function QualityStep({
  quality,
  onChange,
  strategy,
  mediaType,
  advancedOptions,
  onAdvancedChange,
  onBack,
  onNext,
}: Props) {
  const sizeEstimates = strategy?.sizeEstimates ?? null;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isVideo = mediaType === 'video';
  const isAudio = mediaType === 'audio';

  function patch(partial: Partial<AdvancedOptions>) {
    onAdvancedChange({ ...advancedOptions, ...partial });
  }

  return (
    <div className="step-container">
      <h2 className="step-title">Step 3 – Quality</h2>

      <div className="quality-grid">
        {(Object.keys(QUALITY_META) as QualityLevel[]).map((q) => {
          const meta = QUALITY_META[q];
          const size = sizeEstimates?.[q] ?? null;
          const active = quality === q;
          return (
            <button
              key={q}
              className={`quality-card ${active ? 'active' : ''}`}
              data-quality={q}
              onClick={() => onChange(q)}
            >
              {q === 'balanced' && <span className="quality-recommended">Recommended</span>}
              <span className="quality-emoji">{meta.emoji}</span>
              <span className="quality-title">{meta.title}</span>
              <span className="quality-desc">{meta.desc}</span>
              {size && (
                <span className="quality-size">
                  {mediaType === 'image' ? 'Size' : 'Est. size'}: <strong>{size}</strong>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advanced options */}
      <div className="advanced-section">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '▲' : '▼'} Advanced options
        </button>

        {showAdvanced && (
          <div className="advanced-body">
            {/* Audio-only extraction (video only) */}
            {isVideo && (
              <label className="adv-checkbox">
                <input
                  type="checkbox"
                  checked={advancedOptions.extractAudioOnly}
                  onChange={(e) => patch({ extractAudioOnly: e.target.checked, removeAudio: false })}
                />
                <span>
                  <strong>Extract audio only</strong>
                  <small> — Save the audio track as MP3 instead of compressing video</small>
                </span>
              </label>
            )}

            {/* Remove audio (video only, not when extracting) */}
            {isVideo && !advancedOptions.extractAudioOnly && (
              <label className="adv-checkbox">
                <input
                  type="checkbox"
                  checked={advancedOptions.removeAudio}
                  onChange={(e) => patch({ removeAudio: e.target.checked, normalizeLoudness: e.target.checked ? false : advancedOptions.normalizeLoudness })}
                />
                <span>
                  <strong>Remove audio</strong>
                  <small> — Strip the audio track from the output video</small>
                </span>
              </label>
            )}

            {/* Normalize loudness */}
            {!advancedOptions.removeAudio && (
              <label className="adv-checkbox">
                <input
                  type="checkbox"
                  checked={advancedOptions.normalizeLoudness}
                  onChange={(e) => patch({ normalizeLoudness: e.target.checked })}
                />
                <span>
                  <strong>Normalize loudness</strong>
                  <small> — Apply EBU R128 loudness normalization (loudnorm)</small>
                </span>
              </label>
            )}

            {/* Silence trim (audio) */}
            {(isAudio || isVideo) && (
              <label className="adv-checkbox">
                <input
                  type="checkbox"
                  checked={advancedOptions.silenceTrim}
                  onChange={(e) => patch({ silenceTrim: e.target.checked })}
                />
                <span>
                  <strong>Trim silence</strong>
                  <small> — Remove leading &amp; trailing silence automatically</small>
                </span>
              </label>
            )}

            {/* Watermark text (video + image only, not when extracting audio) */}
            {!isAudio && !advancedOptions.extractAudioOnly && (
              <div className="adv-field">
                <label className="adv-label">
                  Watermark text
                  <small> — Overlaid on the video/image</small>
                </label>
                <input
                  className="adv-input"
                  type="text"
                  placeholder="e.g. © My Brand 2024"
                  value={advancedOptions.watermarkText}
                  onChange={(e) => patch({ watermarkText: e.target.value })}
                />
                {advancedOptions.watermarkText && (
                  <select
                    className="adv-select"
                    aria-label="Watermark position"
                    title="Watermark position"
                    value={advancedOptions.watermarkPosition}
                    onChange={(e) => patch({ watermarkPosition: e.target.value as AdvancedOptions['watermarkPosition'] })}
                  >
                    {Object.entries(WATERMARK_POS_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}

