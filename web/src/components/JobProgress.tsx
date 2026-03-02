import React, { useEffect, useRef, useState } from 'react';
import { getJob, downloadUrl } from '../api/client';
import type { Job } from '../api/types';

interface JobProgressProps {
  jobId: string;
  onReset: () => void;
}

export function JobProgress({ jobId, onReset }: JobProgressProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const updated = await getJob(jobId);
        setJob(updated);
        if (updated.status === 'done' || updated.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to poll job status');
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  const pct = job ? Math.round(job.progress * 100) : 0;
  const isDone = job?.status === 'done';
  const isFailed = job?.status === 'failed';

  // Derive download filename from output path
  const outputFilename = job?.output?.originalPath
    ? job.output.originalPath.split(/[\\/]/).pop() ?? ''
    : '';

  return (
    <div style={s.container}>
      <h2>
        {isDone ? 'Done!' : isFailed ? 'Failed' : 'Compressing…'}
      </h2>

      {/* Progress bar */}
      <div style={s.track}>
        <div style={{
          ...s.fill,
          width: `${pct}%`,
          background: isFailed ? '#e55' : isDone ? '#4c4' : '#646cff',
        }} />
      </div>
      <p style={s.pct}>{pct}%  {job && <span style={{ color: '#888' }}>({job.status})</span>}</p>

      {isFailed && (
        <p style={s.errText}>{job?.error ?? 'Compression failed.'}</p>
      )}

      {isDone && (
        <div style={s.doneBox}>
          <p style={{ color: '#4c4', margin: 0 }}>Compression complete!</p>
          {job?.output && (
            <p style={s.small}>
              {job.output.width && job.output.height && `${job.output.width}×${job.output.height}`}
              {job.output.duration && ` · ${Math.round(job.output.duration)}s`}
              {job.output.codec && ` · ${job.output.codec}`}
            </p>
          )}
          {outputFilename && (
            <a href={downloadUrl(outputFilename)} download={outputFilename} style={s.dlBtn}>
              Download
            </a>
          )}
        </div>
      )}

      {error && <p style={s.errText}>{error}</p>}

      {(isDone || isFailed || error) && (
        <button style={s.resetBtn} onClick={onReset}>Compress Another</button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 },
  track: { width: 440, height: 20, background: '#333', borderRadius: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 10, transition: 'width .4s ease' },
  pct: { margin: 0, color: '#ccc' },
  errText: { color: '#e55', textAlign: 'center' },
  doneBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  small: { fontSize: 13, color: '#aaa', margin: 0 },
  dlBtn: {
    display: 'inline-block', padding: '10px 28px', background: '#4c4',
    color: '#000', borderRadius: 8, textDecoration: 'none', fontWeight: 700,
  },
  resetBtn: {
    padding: '10px 28px', fontSize: 15, cursor: 'pointer',
    borderRadius: 8, background: '#555', color: '#fff', border: 'none',
  },
};
