import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { ShieldCheck, LogOut, Check, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import * as storage from '../storage/db';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  formatFirebaseError,
  User,
} from '../firebase';

interface LoginSyncScreenProps {
  onEnterHome: () => void;
}

// Google "G" logo SVG
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const LoginSyncScreen: React.FC<LoginSyncScreenProps> = ({ onEnterHome }) => {
  const { settings, updateSettings, reloadAll } = useApp();
  const { t } = useI18n();

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pawledger_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Sync Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        const storedToken = localStorage.getItem('pawledger_token');
        if (storedToken) {
          setToken(storedToken);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // 1. Trigger Google Sign-In Popup (account chooser)
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      setCurrentUser(firebaseUser);

      // 2. Establish user session on PawLedger backend
      console.log('[PawLedger Cloud Sync] Initiating session for Google user:', firebaseUser.email || firebaseUser.uid);
      let sessionRes: Response;
      try {
        sessionRes = await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            phone: firebaseUser.phoneNumber || '',
          }),
        });
      } catch (networkErr: any) {
        console.error('[PawLedger Cloud Sync] Network failure connecting to backend on port 4000:', networkErr);
        throw new Error(
          'Cannot reach PawLedger cloud sync server. Please ensure the backend server is running on port 4000 (run "npm run dev").'
        );
      }

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({}));
        const serverError = errorData.error;
        console.error(`[PawLedger Cloud Sync] Session establishment failed (HTTP ${sessionRes.status}):`, serverError || sessionRes.statusText);

        if (sessionRes.status === 504 || sessionRes.status === 502) {
          throw new Error(
            'PawLedger cloud backend is not running or unreachable (HTTP ' + sessionRes.status + '). Start the backend server with "npm run dev".'
          );
        }
        throw new Error(
          serverError || `Failed to establish cloud sync session (HTTP ${sessionRes.status}).`
        );
      }

      const sessionData = await sessionRes.json();
      const accessToken = sessionData.accessToken;

      localStorage.setItem('pawledger_token', accessToken);
      localStorage.setItem('pawledger_refresh_token', sessionData.refreshToken);
      localStorage.setItem('pawledger_user_email', firebaseUser.email || '');
      localStorage.setItem('pawledger_user_name', firebaseUser.displayName || '');
      localStorage.setItem('pawledger_user_photo', firebaseUser.photoURL || '');
      localStorage.setItem('pawledger_user_uid', firebaseUser.uid);
      setToken(accessToken);

      // 3. Merge local guest data to this user's cloud account (non-blocking)
      try {
        const localDogs = await storage.getAllDogs();
        const localVaccines = await storage.getVaccineRecords();
        const localDeworming = await storage.getDewormingRecords();
        const localMeds = await storage.getMedications();
        const localExpenses = await storage.getExpenses();

        if (localDogs.length > 0 || localVaccines.length > 0) {
          const mergeRes = await fetch('/api/auth/merge-guest-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ localDogs, localVaccines, localDeworming, localMeds, localExpenses }),
          });
          if (!mergeRes.ok) {
            console.warn('[PawLedger Cloud Sync] Non-critical: Guest data merge returned status:', mergeRes.status);
          }
        }
      } catch (mergeErr) {
        console.warn('[PawLedger Cloud Sync] Non-critical error merging guest records:', mergeErr);
      }

      // 4. Update settings with user's Google display name, email, and photo
      await updateSettings({
        ownerName: firebaseUser.displayName || settings.ownerName || 'Pet Parent',
        ownerEmail: firebaseUser.email || undefined,
        ownerPhoto: firebaseUser.photoURL || undefined,
        firebaseUid: firebaseUser.uid,
      });

      await reloadAll();
      setMessage(`Signed in as ${firebaseUser.displayName || firebaseUser.email}! Syncing vault...`);

      // 5. Navigate to Home
      setTimeout(() => {
        onEnterHome();
      }, 700);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign-out error:', err);
    }
    localStorage.removeItem('pawledger_token');
    localStorage.removeItem('pawledger_refresh_token');
    localStorage.removeItem('pawledger_user_email');
    localStorage.removeItem('pawledger_user_name');
    localStorage.removeItem('pawledger_user_photo');
    localStorage.removeItem('pawledger_user_uid');
    localStorage.removeItem('pawledger_user_phone');
    setToken(null);
    setCurrentUser(null);
    // Clear Google-specific fields from settings so the UI shows fresh state
    await updateSettings({
      ownerPhoto: undefined,
      ownerEmail: undefined,
      firebaseUid: undefined,
    });
    setMessage('Logged out. Sign in with another Google account or continue in Guest Mode.');
  };

  const isUserAuthenticated = Boolean(token && currentUser);
  const displayName = currentUser?.displayName || localStorage.getItem('pawledger_user_name') || settings.ownerName || 'Pet Parent';
  const displayEmail = currentUser?.email || localStorage.getItem('pawledger_user_email') || settings.ownerEmail || '';
  const displayPhoto = currentUser?.photoURL || localStorage.getItem('pawledger_user_photo') || settings.ownerPhoto || '';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08) 0%, var(--bg-primary) 70%)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '30px 24px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1))',
              border: '1px solid var(--accent-amber)',
              fontSize: '2.1rem',
              marginBottom: '12px',
            }}
          >
            🐾
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>
            PawLedger
          </h1>
          <div style={{ fontSize: '0.86rem', color: 'var(--accent-amber)', fontWeight: 600, marginTop: '2px' }}>
            Dog Health & Vaccination Tracker
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Bengaluru & India First • Secure Google Cloud Sync
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div
            style={{
              background: 'var(--status-overdue-bg)',
              color: 'var(--status-overdue-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              marginBottom: '18px',
              border: '1px solid var(--status-overdue-border)',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: 'var(--status-valid-bg)',
              color: 'var(--status-valid-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              marginBottom: '18px',
              border: '1px solid var(--status-valid-border)',
              lineHeight: 1.4,
            }}
          >
            {message}
          </div>
        )}

        {/* STATE 1: Already Signed In with Google */}
        {isUserAuthenticated ? (
          <div>
            <div
              style={{
                background: 'rgba(5, 150, 105, 0.12)',
                border: '1px solid var(--accent-teal)',
                padding: '18px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt={displayName}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-teal)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'var(--accent-teal)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.4rem',
                      margin: '0 auto',
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Check size={11} />
                </div>
              </div>

              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-teal)', marginTop: '2px', fontWeight: 600 }}>
                {displayEmail}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Isolated Cloud Vault • Cross-Device Sync Active
              </div>
            </div>

            <button
              type="button"
              id="continue-to-home-btn"
              className="btn btn-primary btn-block"
              style={{
                padding: '13px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
              onClick={onEnterHome}
            >
              <span>Continue to Home Page</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={handleLogout}
              >
                <LogOut size={14} /> Switch Account
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={onEnterHome}
              >
                Use Offline
              </button>
            </div>
          </div>
        ) : (
          /* STATE 2: Not Signed In - Google Sign In & Guest Mode */
          <div>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                fontSize: '0.82rem',
                lineHeight: '1.5',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <ShieldCheck
                size={18}
                style={{ color: 'var(--accent-teal)', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}
              />
              <strong>Seamless Google Sign-In:</strong> Sign in with your personal or family Google account. Your pet records are securely saved to your private cloud profile and sync across all your phones and tablets!
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '13px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#ffffff',
                color: '#1f2937',
                fontSize: '0.96rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <GoogleIcon size={20} />
              <span>{loading ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              Sign in with any Gmail or Google Workspace account
            </div>

            {/* Separator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '22px 0 18px 0',
                color: 'var(--text-dim)',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Guest Mode Entry Button */}
            <button
              type="button"
              id="continue-as-guest-btn"
              className="btn btn-secondary btn-block"
              style={{
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 600,
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={onEnterHome}
            >
              <UserCheck size={18} style={{ color: 'var(--accent-amber)' }} />
              <span>Continue in Guest Mode (Offline)</span>
            </button>
            <div style={{ textAlign: 'center', fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              100% offline functionality • No Google account required
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        🔒 DPDP Act 2023 Compliant • Purpose Limitation • Right to Erasure
      </div>
    </div>
  );
};
