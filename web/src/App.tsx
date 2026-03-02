import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UploadScreen } from './components/UploadScreen';
import PlatformAndLayoutStep from './components/PlatformAndLayoutStep';
import EditStep from './components/EditStep';
import QualityStep from './components/QualityStep';
import type { AdvancedOptions } from './components/QualityStep';
import { DEFAULT_ADVANCED } from './components/QualityStep';
import PreviewAndCompressStep from './components/PreviewAndCompressStep';
import LoginScreen from './components/LoginScreen';
import HistoryPage from './components/HistoryPage';
import { getPresets } from './api/client';
import { initAuthToken, clearAuthToken, getStoredToken, getMe, setAuthToken } from './api/auth';
import type {
  UploadResponse,
  Preset,
  QualityLevel,
  LayoutOptions,
  LayoutStrategyResponse,
  MediaType,
  EditParams,
} from './api/types';

// Set VITE_GOOGLE_CLIENT_ID in .env.local for Google Sign-In
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

type Step = 'upload' | 'platform' | 'edit' | 'quality' | 'preview';
type Page = 'compressor' | 'history' | 'login';

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  platform: 'Platform',
  edit: 'Edit',
  quality: 'Quality',
  preview: 'Compress',
};

const DEFAULT_LAYOUT: LayoutOptions = {
  mode: 'crop',
  safeAreaPreference: 'center',
  backgroundType: 'blur',
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  // 'login' is used as an overlay page — after login, user lands back on compressor/history
  const [page, setPage] = useState<Page>('compressor');
  const [loginReturnTo, setLoginReturnTo] = useState<Page>('compressor');

  const [step, setStep] = useState<Step>('upload');
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [platform, setPlatform] = useState('');
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions>(DEFAULT_LAYOUT);
  const [quality, setQuality] = useState<QualityLevel>('balanced');
  const [strategy, setStrategy] = useState<LayoutStrategyResponse | null>(null);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>(DEFAULT_ADVANCED);
  const [editParams, setEditParams] = useState<EditParams>({});
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Rehydrate auth + load presets on mount
  useEffect(() => {
    initAuthToken();
    const token = getStoredToken();
    if (token) {
      getMe()
        .then((user) => { setIsAuthenticated(true); setUserEmail(user.email); })
        .catch(() => { clearAuthToken(); });
    }
    getPresets()
      .then((r) => {
        const all = [...(r.video ?? []), ...(r.image ?? []), ...(r.audio ?? [])];
        setPresets(all);
      })
      .catch(() => {});
  }, []);

  function handleAuthenticated(token: string, email: string) {
    setAuthToken(token);
    setIsAuthenticated(true);
    setUserEmail(email);
    setPage(loginReturnTo);
  }

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    setUserEmail('');
    setPage('compressor');
    handleReset();
  }

  /** Navigate to login, remembering where to return */
  function goToLogin(returnTo: Page = 'compressor') {
    setLoginReturnTo(returnTo);
    setPage('login');
  }

  function handleHistoryClick() {
    if (!isAuthenticated) {
      goToLogin('history');
    } else {
      setPage('history');
    }
  }

  function handleFileReady(up: UploadResponse, dataUrl: string | null) {
    setUpload(up);
    setThumbnailDataUrl(dataUrl);
    setStep('platform');
  }

  function handleReset() {
    setStep('upload');
    setUpload(null);
    setThumbnailDataUrl(null);
    setPlatform('');
    setLayoutOptions(DEFAULT_LAYOUT);
    setQuality('balanced');
    setStrategy(null);
    setAdvancedOptions(DEFAULT_ADVANCED);
    setEditParams({});
  }

  const stepOrder: Step[] = ['upload', 'platform', 'edit', 'quality', 'preview'];
  const stepIndex = stepOrder.indexOf(step);

  // ── Login overlay ──────────────────────────────────────────────────────────
  if (page === 'login') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="app-root">
          <button className="back-to-app" onClick={() => setPage('compressor')}>
            ← Back to app
          </button>
          <LoginScreen onAuthenticated={handleAuthenticated} />
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="app-root">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-brand" onClick={() => { setPage('compressor'); handleReset(); }}>
              <h1 className="app-title">🎬 Media Compressor</h1>
              <p className="app-tagline">Video · Image · Audio — free, no limits</p>
            </div>
            <div className="app-header-actions">
              <button
                className="nav-btn"
                onClick={() => setDarkMode((v) => !v)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>

              <button
                className={`nav-btn ${page === 'history' ? 'nav-btn--active' : ''}`}
                onClick={handleHistoryClick}
                title={isAuthenticated ? 'View your compression history' : 'Sign in to view history'}
              >
                📋 History
              </button>

              {isAuthenticated ? (
                <>
                  <span className="user-email" title={userEmail}>👤 {userEmail}</span>
                  <button className="logout-btn" onClick={handleLogout}>Sign out</button>
                </>
              ) : (
                <button className="sign-in-btn" onClick={() => goToLogin('compressor')}>
                  Sign in / Register
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── History page ── */}
        {page === 'history' && (
          <div className="app-content">
            <HistoryPage onBack={() => setPage('compressor')} />
          </div>
        )}

        {/* ── Compressor (always accessible) ── */}
        {page === 'compressor' && (
          <>
            {/* 4-step indicator */}
            <div className="steps-row">
              {stepOrder.map((st, i) => (
                <React.Fragment key={st}>
                  <div className="step-item">
                    <div className={`step-dot ${step === st ? 'step-dot--active' : ''} ${i < stepIndex ? 'step-dot--done' : ''}`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <div className="step-label">{STEP_LABELS[st]}</div>
                  </div>
                  {i < stepOrder.length - 1 && (
                    <div className={`step-line ${i < stepIndex ? 'step-line--done' : ''}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="app-content">
              {step === 'upload' && (
                <>
                  <UploadScreen onFileReady={handleFileReady} />
                  {!isAuthenticated && (
                    <p className="anon-note">
                      💡 <button className="inline-link" onClick={() => goToLogin('compressor')}>Sign in</button>
                      {' '}to save compression history and download batches as ZIP.
                    </p>
                  )}
                </>
              )}
              {step === 'platform' && upload && (
                <PlatformAndLayoutStep
                  presets={presets}
                  selectedPlatform={platform}
                  onPlatformChange={setPlatform}
                  layoutOptions={layoutOptions}
                  onLayoutChange={setLayoutOptions}
                  uploadedPath={upload.path}
                  thumbnailDataUrl={thumbnailDataUrl}
                  onStrategyLoad={setStrategy}
                  onNext={() => setStep('edit')}
                />
              )}
              {step === 'edit' && upload && (
                <EditStep
                  uploadedPath={upload.path}
                  upload={upload}
                  thumbnailDataUrl={thumbnailDataUrl}
                  onBack={() => setStep('platform')}
                  onNext={(params) => { setEditParams(params); setStep('quality'); }}
                />
              )}
              {step === 'quality' && (
                <QualityStep
                  quality={quality}
                  onChange={setQuality}
                  strategy={strategy}
                  mediaType={upload?.mediaType ?? 'video'}
                  advancedOptions={advancedOptions}
                  onAdvancedChange={setAdvancedOptions}
                  onBack={() => setStep('edit')}
                  onNext={() => setStep('preview')}
                />
              )}
              {step === 'preview' && upload && (
                <PreviewAndCompressStep
                  uploadedPath={upload.path}
                  filename={upload.filename}
                  platform={platform}
                  mediaType={upload.mediaType as MediaType}
                  quality={quality}
                  layoutOptions={layoutOptions}
                  strategy={strategy}
                  thumbnailDataUrl={thumbnailDataUrl}
                  advancedOptions={advancedOptions}
                  editParams={editParams}
                  onBack={() => setStep('quality')}
                  onReset={handleReset}
                />
              )}
            </div>
          </>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}



