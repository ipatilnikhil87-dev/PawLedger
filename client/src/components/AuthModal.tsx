import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, ShieldCheck, Lock, LogOut, Trash2, Check } from 'lucide-react';
import * as storage from '../storage/db';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  formatFirebaseError,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

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

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogout }) => {
  const { settings, updateSettings, reloadAll } = useApp();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const token = localStorage.getItem('pawledger_token');
  const userEmail = localStorage.getItem('pawledger_user_email') || settings.ownerEmail;
  const userName = localStorage.getItem('pawledger_user_name') || settings.ownerName;
  const userPhoto = localStorage.getItem('pawledger_user_photo') || settings.ownerPhoto;

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

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

      // Merge local data (non-blocking)
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

      await updateSettings({
        ownerName: firebaseUser.displayName || settings.ownerName || 'Pet Parent',
        ownerEmail: firebaseUser.email || undefined,
        ownerPhoto: firebaseUser.photoURL || undefined,
        firebaseUid: firebaseUser.uid,
      });

      await reloadAll();
      setMessage('Successfully signed in with Google! Cloud sync active.');
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
    await reloadAll();
    // Redirect to the initial login screen via the App-level callback
    onClose();
    onLogout?.();
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently erase your PawLedger account and all server medical records? This follows DPDP Act Right to Erasure.')) {
      return;
    }

    try {
      const authToken = localStorage.getItem('pawledger_token');
      if (authToken) {
        await fetch('/api/auth/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
      await handleLogout();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Account & Security</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--status-overdue-bg)',
              color: 'var(--status-overdue-text)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              marginBottom: '14px',
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
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
              marginBottom: '14px',
              border: '1px solid var(--status-valid-border)',
              lineHeight: 1.4,
            }}
          >
            {message}
          </div>
        )}

        {/* STATE A: Logged In Account Display */}
        {token ? (
          <div>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName || 'User'}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--accent-teal)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                  }}
                >
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {userName || 'Pet Parent'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-teal)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userEmail || 'Google Authenticated'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Multi-Device Cloud Sync Active
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-secondary btn-block" onClick={handleLogout}>
                <LogOut size={16} /> Log Out / Switch Google Account
              </button>

              <button
                className="btn btn-danger btn-block"
                onClick={handleDeleteAccount}
                style={{ marginTop: '8px' }}
              >
                <Trash2 size={16} /> Delete Account & Erase All Cloud Data (DPDP)
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: Not Logged In */
          <div>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                fontSize: '0.82rem',
                lineHeight: '1.5',
              }}
            >
              <ShieldCheck
                size={18}
                style={{ color: 'var(--accent-teal)', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}
              />
              <strong>Guest Mode Active:</strong> PawLedger works 100% offline without requiring an account. Sign in with Google to enable cross-device synchronization and automatic cloud backup for your dog health records!
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#ffffff',
                color: '#1f2937',
                fontSize: '0.94rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <GoogleIcon size={18} />
              <span>{loading ? 'Opening Google Sign-In...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
