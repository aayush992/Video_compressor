import React, { useRef, useState } from 'react';
import { uploadFile, detectMediaType } from '../api/client';
import type { UploadResponse } from '../api/types';

interface UploadScreenProps {
  onFileReady: (upload: UploadResponse, thumbnailDataUrl: string | null) => void;
}

/** Generate a browser-side data URL for preview purposes (no upload needed). */
async function generateThumbnail(file: File): Promise<string | null> {
  const type = file.type;
  if (type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string ?? null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  if (type.startsWith('video/')) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 4);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });
  }
  return null; // audio – no thumbnail
}

interface QueuedFile {
  file: File;
  thumb: string | null;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  result?: UploadResponse;
  error?: string;
}

function fileTypeIcon(file: File): string {
  if (file.type.startsWith('video/')) return '🎬';
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type.startsWith('audio/')) return '🎵';
  return '📄';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadScreen({ onFileReady }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setGlobalError(null);

    // Kick off thumbnail generation immediately (runs concurrently with upload)
    const thumbPromises = arr.map((file) => generateThumbnail(file));

    // Show queue right away – don't wait for anything
    const entries: QueuedFile[] = arr.map((file) => ({
      file, thumb: null, status: 'uploading' as const, progress: 0,
    }));
    setQueue(entries);

    // Patch in thumbnails as each one resolves (background update)
    arr.forEach((_, i) => {
      thumbPromises[i].then((thumb) => {
        if (thumb) setQueue((prev) => {
          const next = [...prev];
          if (next[i]) next[i] = { ...next[i], thumb };
          return next;
        });
      });
    });

    // Start uploading the first file, passing its thumb promise so they race
    uploadEntry(arr[0], 0, thumbPromises[0]);
  }

  async function uploadEntry(file: File, index: number, thumbPromise: Promise<string | null>) {
    try {
      // Upload + thumbnail run in parallel; the upload is always the slow part
      const [result, thumb] = await Promise.all([
        uploadFile(file, (pct) =>
          setQueue((prev) => {
            const next = [...prev];
            if (next[index]) {
              const clamped = Math.min(99, Math.round(pct * 100));
              // Progress must never decrease (guards against e.total fluctuation)
              const current = next[index].progress;
              if (clamped > current) {
                next[index] = { ...next[index], progress: clamped };
              }
            }
            return next;
          })
        ),
        thumbPromise,
      ]);
      if (!result.mediaType) result.mediaType = detectMediaType(file);
      setQueue((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], status: 'done', progress: 100, result, thumb: thumb ?? next[index].thumb };
        return next;
      });
      onFileReady(result, thumb);
    } catch (err: unknown) {
      let msg = 'Upload failed. Please try again.';
      if (err && typeof err === 'object') {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 413) msg = 'File too large — max 500 MB.';
        else if (status === 415) msg = 'Unsupported file type.';
        else if (status === 429) msg = 'Server busy — please try again in 30 seconds.';
        else if (status === 503 || status === 502) msg = 'Backend is starting up — please retry in a moment.';
        else if (status && status >= 500) msg = `Server error (${status}) — please retry.`;
        else if ((err as { code?: string }).code === 'ERR_NETWORK' || (err as { code?: string }).code === 'ECONNABORTED') {
          msg = 'Connection failed — check your internet or try a smaller file.';
        } else if (err instanceof Error && err.message) {
          msg = err.message;
        }
      }
      setQueue((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], status: 'error', progress: 0, error: msg };
        return next;
      });
    }
  }

  async function uploadOne(index: number) {
    const entry = queue[index];
    if (!entry) return;
    setQueue((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'uploading', progress: 0, error: undefined };
      return next;
    });
    await uploadEntry(entry.file, index, generateThumbnail(entry.file));
  }

  const hasQueue = queue.length > 0;

  return (
    <div className="step-container">
      <h2 className="step-title">Upload Media</h2>
      <p className="step-subtitle">Supports video (MP4, MOV), images (JPG, PNG, WebP), and audio (MP3, WAV, AAC)</p>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drop-zone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          await handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="drop-icon-large">📂</span>
        <p className="drop-title">Drop your file here</p>
        <p className="drop-subtitle">Upload starts immediately — or click to browse</p>
        <div className="drop-media-types">
          <span className="media-type-chip">🎬 Video</span>
          <span className="media-type-chip">🖼️ Image</span>
          <span className="media-type-chip">🎵 Audio</span>
        </div>
        <button className="drop-browse-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
          Browse Files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        aria-label="Upload media files"
        className="input-hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {globalError && <p className="error-text">{globalError}</p>}

      {/* File queue */}
      {hasQueue && (
        <div className="file-queue">
          <div className="file-queue-header">
            <span className="file-queue-title">{queue.length} file{queue.length !== 1 ? 's' : ''} selected</span>
            <button className="file-queue-clear" onClick={() => setQueue([])}>✕ Clear</button>
          </div>

          {queue.map((item, i) => (
            <div key={i} className="file-queue-item">
              <div className="file-thumb">
                {item.thumb
                  ? <img src={item.thumb} alt="" />
                  : <span className="file-thumb-icon">{fileTypeIcon(item.file)}</span>
                }
              </div>

              <div className="file-info">
                <span className="file-name">{item.file.name}</span>
                <span className="file-meta">{formatBytes(item.file.size)}</span>
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <div className="file-mini-bar">
                    <div className="file-mini-bar-fill" style={{ width: `${item.status === 'processing' ? 100 : item.progress}%` }} />
                  </div>
                )}
                {item.status === 'error' && (
                  <span className="file-item-error">{item.error}</span>
                )}
              </div>

              <div className="file-action">
                {item.status === 'pending' && (
                  <button className="file-upload-btn" onClick={() => uploadOne(i)}>Upload →</button>
                )}
                {item.status === 'uploading' && (
                  <span className="file-uploading">⏳ {item.progress}%</span>
                )}
                {item.status === 'processing' && (
                  <span className="file-uploading">⚙️ Analysing…</span>
                )}
                {item.status === 'done' && <span className="file-done">✅ Done</span>}
                {item.status === 'error' && (
                  <button className="file-retry-btn" onClick={() => uploadOne(i)}>↺ Retry</button>
                )}
              </div>
            </div>
          ))}

          {queue.length > 1 && queue.some((q) => q.status === 'pending') && (
            <p className="file-batch-note">
              💡 Click "Upload →" on each remaining file to compress it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}




