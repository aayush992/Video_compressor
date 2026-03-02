import React, { useEffect, useState, useCallback } from 'react';
import { getHistory, downloadZip } from '../api/auth';
import { downloadUrl } from '../api/client';
import type { Job } from '../api/types';

interface Props {
  onBack: () => void;
}

function fmt(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const HistoryPage: React.FC<Props> = ({ onBack }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getHistory();
      setJobs(data);
    } catch {
      setError('Failed to load history. Are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleZipDownload = async () => {
    const filenames = jobs
      .filter((j) => selected.has(j.id) && j.output_filename)
      .map((j) => j.output_filename as string);
    if (!filenames.length) return;
    setZipping(true);
    try {
      const blob = await downloadZip(filenames);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed_files.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download ZIP.');
    } finally {
      setZipping(false);
    }
  };

  const doneJobs = jobs.filter((j) => j.status === 'done');
  const totalSaved =
    doneJobs.reduce((acc, j) => acc + (j.original_size || 0), 0) -
    doneJobs.reduce((acc, j) => acc + (j.compressed_size || 0), 0);

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Compression History</h2>
        {doneJobs.length > 0 && (
          <p className="history-stats">
            {doneJobs.length} file{doneJobs.length !== 1 ? 's' : ''} compressed &bull; {fmt(totalSaved)} saved total
          </p>
        )}
      </div>

      {loading && <p className="history-loading">Loading…</p>}
      {error && <p className="history-error">{error}</p>}

      {!loading && jobs.length === 0 && (
        <div className="history-empty">
          <p>No compressions yet. Go compress something! 🎬</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <>
          <div className="history-actions">
            <label className="select-all">
              <input
                type="checkbox"
                checked={selected.size === doneJobs.length && doneJobs.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelected(new Set(doneJobs.map((j) => j.id)));
                  else setSelected(new Set());
                }}
              />
              Select all done
            </label>
            {selected.size > 0 && (
              <button className="btn-primary" onClick={handleZipDownload} disabled={zipping}>
                {zipping ? 'Zipping…' : `⬇ Download ZIP (${selected.size})`}
              </button>
            )}
          </div>

          <div className="history-list">
            {jobs.map((job) => (
              <div key={job.id} className={`history-item status-${job.status}`}>
                {job.status === 'done' && (
                  <input
                    type="checkbox"
                    className="history-checkbox"
                    checked={selected.has(job.id)}
                    onChange={() => toggleSelect(job.id)}
                  />
                )}
                <div className="history-info">
                  <span className="history-platform">{job.platform || '—'}</span>
                  <span className="history-quality">{job.quality || '—'}</span>
                  <span className="history-type">{job.media_type || '—'}</span>
                  {job.status === 'done' && (
                    <span className="history-sizes">
                      {fmt(job.original_size)} → {fmt(job.compressed_size)}
                      {job.percent_saved != null && (
                        <span className="history-saved"> −{job.percent_saved}%</span>
                      )}
                    </span>
                  )}
                  {job.created_at && (
                    <span className="history-date">
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="history-actions-row">
                  <span className={`status-badge ${job.status}`}>{job.status}</span>
                  {job.status === 'done' && job.output_filename && (
                    <a
                      className="btn-secondary"
                      href={downloadUrl(job.output_filename)}
                      download
                    >
                      ⬇ Download
                    </a>
                  )}
                  {job.status === 'failed' && (
                    <span className="history-error-msg">{job.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryPage;
