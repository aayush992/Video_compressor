import React, { useState } from 'react';
import type { EditParams, CropParams, UploadResponse, MediaType } from '../api/types';
import { previewEdit, downloadUrl } from '../api/client';

interface Props {
  uploadedPath: string;
  upload: UploadResponse | null;
  thumbnailDataUrl: string | null;
  onBack: () => void;
  onNext: (params: EditParams) => void;
}

interface CropPreset {
  label: string;
  value: string | null; // null = original / no crop
  ratio: [number, number] | null;
}

const CROP_PRESETS: CropPreset[] = [
  { label: 'Original', value: null, ratio: null },
  { label: '9:16', value: '9:16', ratio: [9, 16] },
  { label: '16:9', value: '16:9', ratio: [16, 9] },
  { label: '1:1', value: '1:1', ratio: [1, 1] },
  { label: '4:5', value: '4:5', ratio: [4, 5] },
  { label: '4:3', value: '4:3', ratio: [4, 3] },
];

function computeCenterCrop(
  ratio: [number, number],
  srcW: number,
  srcH: number,
): CropParams {
  const [tw, th] = ratio;
  const targetRatio = tw / th;
  const srcRatio = srcW / srcH;

  let cropW: number;
  let cropH: number;

  if (srcRatio > targetRatio) {
    // source is wider → crop width
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
  } else {
    // source is taller → crop height
    cropW = srcW;
    cropH = Math.round(srcW / targetRatio);
  }

  // Make even (required by some codecs)
  cropW = cropW % 2 === 0 ? cropW : cropW - 1;
  cropH = cropH % 2 === 0 ? cropH : cropH - 1;

  const x = Math.round((srcW - cropW) / 2);
  const y = Math.round((srcH - cropH) / 2);

  return { w: cropW, h: cropH, x, y };
}

export default function EditStep({
  uploadedPath,
  upload,
  thumbnailDataUrl,
  onBack,
  onNext,
}: Props) {
  const mediaType: MediaType = (upload?.mediaType ?? 'video') as MediaType;
  const isVideo = mediaType === 'video';

  const srcW = upload?.metadata?.width ?? 1920;
  const srcH = upload?.metadata?.height ?? 1080;

  const [cropAspect, setCropAspect] = useState<string | null>(null);
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [fixOrientation, setFixOrientation] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  function buildEditParams(): EditParams {
    const preset = CROP_PRESETS.find((p) => p.value === cropAspect);
    let crop: CropParams | null = null;
    if (preset?.ratio) {
      crop = computeCenterCrop(preset.ratio, srcW, srcH);
    }
    return {
      crop: crop ?? undefined,
      rotate: rotate !== 0 ? rotate : undefined,
      flipH: flipH || undefined,
      flipV: flipV || undefined,
      fixOrientation: fixOrientation || undefined,
    };
  }

  function handleReset() {
    setCropAspect(null);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setFixOrientation(false);
    setPreviewUrl(null);
    setPreviewError('');
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewUrl(null);
    try {
      const result = await previewEdit(uploadedPath, buildEditParams(), 5.0);
      setPreviewUrl(downloadUrl(result.previewFilename));
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed.');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleNext() {
    onNext(buildEditParams());
  }

  // CSS transform for live thumbnail preview
  const thumbStyle: React.CSSProperties = {
    transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
  };

  const hasEdits = cropAspect !== null || rotate !== 0 || flipH || flipV || fixOrientation;

  return (
    <div className="step-container">
      <h2 className="step-title">Step 3 – Edit</h2>
      <p className="step-subtitle">Crop, rotate, or flip before compressing.</p>

      {/* Live preview box */}
      <div className="field-group">
        <div className="edit-preview-box">
          {thumbnailDataUrl ? (
            <>
              <img
                src={thumbnailDataUrl}
                alt="preview"
                className="edit-thumb"
                style={thumbStyle}
              />
              {cropAspect && (
                <div className="edit-crop-overlay">
                  <span className="edit-crop-label">{cropAspect}</span>
                </div>
              )}
            </>
          ) : (
            <span className="edit-thumb-placeholder">No preview available</span>
          )}
        </div>
      </div>

      {/* Crop presets */}
      <div className="field-group">
        <div className="field-label">Crop aspect ratio</div>
        <div className="edit-ratio-row">
          {CROP_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`edit-ratio-btn ${cropAspect === preset.value ? 'active' : ''}`}
              onClick={() => setCropAspect(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="field-group">
        <div className="field-label">Rotation</div>
        <div className="edit-rotate-row">
          {([0, 90, 180, 270] as const).map((deg) => (
            <button
              key={deg}
              className={`edit-rotate-btn ${rotate === deg ? 'active' : ''}`}
              onClick={() => setRotate(deg)}
              type="button"
            >
              {deg === 0 ? 'None' : `${deg}°`}
            </button>
          ))}
        </div>
      </div>

      {/* Flip toggles */}
      <div className="field-group">
        <div className="field-label">Flip</div>
        <div className="toggle-row">
          <button
            className={`toggle-btn ${flipH ? 'active' : ''}`}
            onClick={() => setFlipH((v) => !v)}
            type="button"
          >
            Flip Horizontal
          </button>
          <button
            className={`toggle-btn ${flipV ? 'active' : ''}`}
            onClick={() => setFlipV((v) => !v)}
            type="button"
          >
            Flip Vertical
          </button>
          {isVideo && (
            <button
              className={`toggle-btn ${fixOrientation ? 'active' : ''}`}
              onClick={() => setFixOrientation((v) => !v)}
              type="button"
            >
              Fix Orientation
            </button>
          )}
        </div>
      </div>

      {/* 5-second video preview (video only) */}
      {isVideo && (
        <div className="field-group edit-preview-section">
          <button
            className="btn-secondary"
            onClick={handlePreview}
            disabled={previewLoading}
            type="button"
          >
            {previewLoading ? 'Generating preview…' : '▶ Preview 5s clip'}
          </button>
          {previewError && <p className="error-text">{previewError}</p>}
          {previewUrl && (
            <div className="edit-video-preview">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={previewUrl} controls autoPlay muted loop />
              <p className="edit-preview-note">5-second preview with edits applied.</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack} type="button">
          ← Back
        </button>
        {hasEdits && (
          <button className="btn-secondary" onClick={handleReset} type="button">
            Reset edits
          </button>
        )}
        <button className="btn-primary" onClick={handleNext} type="button">
          Next →
        </button>
      </div>
    </div>
  );
}
