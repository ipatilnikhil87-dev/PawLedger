import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { Language, ThemeMode } from '../types';
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Download,
  Upload,
  Calendar,
  Sparkles,
  Shield,
  Lock,
  Users,
  ShieldCheck,
  HeartHandshake,
  Building2,
  Sliders,
  Check
} from 'lucide-react';
import { exportAllLocalData, importLocalData } from '../storage/db';

interface SettingsScreenProps {
  onOpenTimeSimulator: () => void;
  onOpenAuth: () => void;
  onOpenHousehold: () => void;
  onOpenVetVerification: () => void;
  onOpenHandover: () => void;
  onOpenSociety: () => void;
  onOpenAdmin: () => void;
  onOpenLegal?: (tab?: 'privacy' | 'terms' | 'dpdp') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenTimeSimulator,
  onOpenAuth,
  onOpenHousehold,
  onOpenVetVerification,
  onOpenHandover,
  onOpenSociety,
  onOpenAdmin,
  onOpenLegal,
}) => {
  const { settings, updateSettings, reloadAll, seedDemo, effectiveDate } = useApp();
  const { language, setLanguage, t } = useI18n();

  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(settings.ownerPhone);
  const [city, setCity] = useState(settings.city);
  const [isSaved, setIsSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const token = localStorage.getItem('pawledger_token');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      city: city.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    updateSettings({ language: newLang });
  };

  const handleThemeChange = (mode: ThemeMode) => {
    updateSettings({ theme: mode });
  };

  const handleExportBackup = async () => {
    try {
      const dataStr = await exportAllLocalData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pawledger_backup_${effectiveDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupStatus('Exported successfully!');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err: any) {
      setBackupStatus(`Export error: ${err.message}`);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const res = await importLocalData(text);
        if (res.success) {
          await reloadAll();
          setBackupStatus(`Restored ${res.count} dog(s) and records successfully!`);
        } else {
          setBackupStatus(`Import failed: ${res.message}`);
        }
      } catch (err: any) {
        setBackupStatus(`Import failed: ${err.message}`);
      }
      setTimeout(() => setBackupStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('settings.title')}</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Preferences, sharing manager, cloud sync, and DPDP privacy settings.
        </p>
      </div>

      {/* Account & Security Banner */}
      <div className="card" style={{ background: token ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(30, 41, 59, 0.8) 100%)' : 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: token ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: token ? 'var(--accent-teal)' : 'var(--accent-amber)', overflow: 'hidden' }}>
              {settings.ownerPhoto ? (
                <img src={settings.ownerPhoto} alt={settings.ownerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Lock size={20} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {token ? (settings.ownerName || 'Google Account Synced') : 'Guest Mode (Offline-First)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {token ? (settings.ownerEmail || 'Multi-device cloud sync active') : 'Click to sign in with Google'}
              </div>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onOpenAuth}>
            {token ? 'Manage Account' : 'Sign in with Google'}
          </button>
        </div>
      </div>

      {/* Connected Community & Medical Features */}
      <div className="card">
        <div className="card-title">
          <Building2 size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>Sharing, Community & Vets</span>
        </div>
        <p className="card-subtitle">
          Manage integrations, family access, and apartment society compliance.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '12px' }}
            onClick={onOpenHousehold}
          >
            <Users size={18} style={{ color: 'var(--accent-amber)' }} />
            <div style={{ textAlign: 'left', marginLeft: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Household & Walker Reminders</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Send WhatsApp alerts to family without them installing the app</div>
            </div>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '12px' }}
            onClick={onOpenVetVerification}
          >
            <ShieldCheck size={18} style={{ color: 'var(--accent-teal)' }} />
            <div style={{ textAlign: 'left', marginLeft: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Vet Verification Link & QR</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Send 10-second verification link to your veterinarian</div>
            </div>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '12px' }}
            onClick={onOpenSociety}
          >
            <Building2 size={18} style={{ color: '#818CF8' }} />
            <div style={{ textAlign: 'left', marginLeft: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Apartment Society / RWA Portal</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Opt-in compliance status disclosure with DPDP consent safeguards</div>
            </div>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '12px' }}
            onClick={onOpenHandover}
          >
            <HeartHandshake size={18} style={{ color: 'var(--accent-amber)' }} />
            <div style={{ textAlign: 'left', marginLeft: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Adoption & Foster Handover</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Transfer custody and full records to an adopter or foster</div>
            </div>
          </button>
        </div>
      </div>

      {/* Language Selector */}
      <div className="card">
        <div className="card-title">
          <Globe size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>{t('settings.languageSection')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
          <button
            className={`btn btn-sm ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('en')}
          >
            English
          </button>
          <button
            className={`btn btn-sm ${language === 'hi' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('hi')}
          >
            हिन्दी (Hindi)
          </button>
          <button
            className={`btn btn-sm ${language === 'kn' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('kn')}
          >
            ಕನ್ನಡ (Kannada)
          </button>
          <button
            className={`btn btn-sm ${language === 'ta' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleLanguageChange('ta')}
          >
            தமிழ் (Tamil)
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card">
        <div className="card-title">
          <Settings size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>{t('settings.profileSection')}</span>
        </div>

        <form onSubmit={handleSaveProfile} style={{ marginTop: '12px' }}>
          <div className="form-group">
            <label className="form-label">Parent / Owner Name</label>
            <input
              type="text"
              className="form-input"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 43210"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '6px' }}>
            {isSaved ? <span style={{ color: 'var(--accent-teal)' }}><Check size={14} /> Saved</span> : t('common.save')}
          </button>
        </form>
      </div>

      {/* Appearance / Theme */}
      <div className="card">
        <div className="card-title">
          {settings.theme === 'dark' ? <Moon size={18} style={{ color: 'var(--accent-amber)' }} /> : <Sun size={18} style={{ color: 'var(--accent-amber)' }} />}
          <span>{t('settings.themeSection')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <button
            className={`btn btn-sm ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon size={14} /> {t('settings.themeDark')}
          </button>
          <button
            className={`btn btn-sm ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('light')}
          >
            <Sun size={14} /> {t('settings.themeLight')}
          </button>
        </div>
      </div>

      {/* Time Simulation Tool & Admin Console */}
      <div className="card">
        <div className="card-title">
          <Calendar size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>Testing & System Administration</span>
        </div>
        <p className="card-subtitle">
          Test schedules with time simulation or inspect mock SMS gateway messages and audit logs.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onOpenTimeSimulator}>
            Date Simulator ({effectiveDate})
          </button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onOpenAdmin}>
            <Sliders size={14} /> Admin & SMS Logs
          </button>
        </div>
      </div>

      {/* Local Data Backup / Restore */}
      <div className="card">
        <div className="card-title">
          <Download size={18} style={{ color: 'var(--accent-teal)' }} />
          <span>{t('settings.backupSection')}</span>
        </div>
        <p className="card-subtitle">
          Export your pets and vaccination history to a portable JSON file or restore anytime.
        </p>

        {backupStatus && (
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', marginBottom: '10px', fontWeight: 600 }}>
            {backupStatus}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleExportBackup}>
            <Download size={14} /> {t('settings.exportBtn')}
          </button>

          <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer' }}>
            <Upload size={14} /> {t('settings.importBtn')}
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportBackup}
            />
          </label>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '14px', paddingTop: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', color: 'var(--accent-amber)' }}
            onClick={seedDemo}
          >
            <Sparkles size={14} /> Load Demo Seed Data (Bruno & Milo)
          </button>
        </div>
      </div>

      {/* DPDP Act Compliance & Legal Center */}
      <div className="card" style={{ background: 'var(--bg-surface-elevated)' }}>
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <Shield size={16} style={{ color: 'var(--accent-teal)' }} />
          <span>Privacy & Data Sovereignty (DPDP Act, 2023)</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '6px' }}>
          {t('settings.dpdpNotice')}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenLegal?.('privacy')}
            id="open-privacy-policy-btn"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenLegal?.('terms')}
            id="open-terms-btn"
          >
            Terms & Vet Disclaimer
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--accent-crimson)' }}
            onClick={() => onOpenLegal?.('dpdp')}
            id="open-erasure-btn"
          >
            Right to Erasure
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '10px' }}>
          PawLedger is an independent open pet health ledger. Not affiliated with any commercial pet food or pharmaceutical brand.
        </p>
      </div>
    </div>
  );
};
