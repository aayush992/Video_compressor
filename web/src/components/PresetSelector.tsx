import React, { useEffect, useState } from 'react';
import { getPresets } from '../api/client';
import { FALLBACK_PRESETS } from '../shared/presets';
import type { Preset, PresetsResponse, MediaMetadata, MediaType, UploadResponse } from '../api/types';

interface PresetSelectorProps {
  upload: UploadResponse;
  onSelectPreset: (preset: Preset) => void;
}

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  video: 'Video',
  image: 'Image',
  audio: 'Audio',
};

export function PresetSelector({ upload, onSelectPreset }: PresetSelectorProps) {
  const [presets, setPresets] = useState<PresetsResponse>(FALLBACK_PRESETS);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const mediaType = upload.mediaType;
  const meta: MediaMetadata | null = upload.metadata;

  useEffect(() => {
    getPresets()
      .then((data) => {
        setPresets(data);
        const list = data[mediaType] ?? [];
        if (list.length > 0) setSelected(list[0].platform);
      })
      .catch(() => {
        // fallback already set
        const list = FALLBACK_PRESETS[mediaType] ?? [];
        if (list.length > 0) setSelected(list[0].platform);
      })
      .finally(() => setLoading(false));
  }, [mediaType]);

  const platformList: Preset[] = presets[mediaType] ?? [];

  function handleStart() {
    const preset = platformList.find((p) => p.platform === selected);
    if (preset) onSelectPreset(preset);
  }

  if (loading) return <p>Loading presets…</p>;

  return (
    <div style={s.container}>
      <h2>Select {MEDIA_TYPE_LABELS[mediaType]} Preset</h2>

      {/* Source info */}
      <div style={s.meta}>
        <strong>File:</strong> {upload.filename}
        {meta && (
          <>
            {meta.width && meta.height && ` · ${meta.width}×${meta.height}`}
            {meta.fps && ` · ${meta.fps}fps`}
            {meta.duration && ` · ${Math.round(meta.duration)}s`}
            {meta.codec && ` · ${meta.codec}`}
          </>
        )}
      </div>

      {/* Preset list */}
      <div style={s.list}>
        {platformList.map((p) => (
          <div
            key={p.platform}
            style={{ ...s.item, ...(selected === p.platform ? s.itemSelected : {}) }}
            onClick={() => setSelected(p.platform)}
          >
            <span style={s.itemLabel}>{p.label}</span>
            <span style={s.itemMeta}>
              {p.resolution ? `${p.resolution}` : ''}
              {p.fps ? ` @ ${p.fps}fps` : ''}
              {p.bitrate ? ` · ${p.bitrate}` : ''}
              {p.codec ? ` · ${p.codec}` : ''}
            </span>
          </div>
        ))}
      </div>

      {platformList.length === 0 && (
        <p style={{ color: '#aaa' }}>No presets available for {mediaType}.</p>
      )}

      <button style={s.button} onClick={handleStart} disabled={!selected}>
        Start Compression
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32, width: '100%', maxWidth: 520 },
  meta: { background: '#1a1a1a', padding: '8px 16px', borderRadius: 6, fontSize: 13, color: '#ccc', width: '100%' },
  list: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%' },
  item: {
    background: '#1a1a1a', borderRadius: 10, padding: '12px 16px',
    cursor: 'pointer', border: '2px solid transparent',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  itemSelected: { borderColor: '#646cff' },
  itemLabel: { color: '#fff', fontSize: 15, fontWeight: 600 },
  itemMeta: { color: '#888', fontSize: 12 },
  button: {
    padding: '10px 28px', fontSize: 15, cursor: 'pointer',
    borderRadius: 8, background: '#646cff', color: '#fff', border: 'none',
    marginTop: 8,
  },
};
