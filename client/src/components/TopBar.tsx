import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { Dog as DogIcon, Calendar, Moon, Sun, Bell, ChevronDown, Plus } from 'lucide-react';

interface TopBarProps {
  onOpenTimeSimulator: () => void;
  onOpenAddDog: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenTimeSimulator, onOpenAddDog }) => {
  const { dogs, activeDog, setActiveDogId, settings, updateSettings, effectiveDate } = useApp();
  const { t } = useI18n();
  const [isDogDropdownOpen, setIsDogDropdownOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  const isSimulated = !!settings.simulatedDate;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-badge">
          <span className="paw-icon">🐾</span> PawLedger
        </div>

        {activeDog && (
          <div style={{ position: 'relative' }}>
            <button
              className="dog-switcher-pill"
              onClick={() => setIsDogDropdownOpen(!isDogDropdownOpen)}
              title={t('dogs.switchToDog')}
            >
              <img
                src={activeDog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=120&q=80'}
                alt={activeDog.name}
                className="dog-avatar-sm"
              />
              <span>{activeDog.name}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {isDogDropdownOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 59 }}
                  onClick={() => setIsDogDropdownOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 60,
                    minWidth: '180px',
                    padding: '6px',
                  }}
                >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 8px' }}>
                  {t('dogs.title')} ({dogs.length})
                </div>
                {dogs.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setActiveDogId(d.id);
                      setIsDogDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: d.id === activeDog?.id ? 'var(--bg-surface-elevated)' : 'transparent',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: d.id === activeDog?.id ? 700 : 500,
                    }}
                  >
                    <img
                      src={d.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=80&q=80'}
                      alt={d.name}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span>{d.name}</span>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '4px' }}>
                  <button
                    onClick={() => {
                      setIsDogDropdownOpen(false);
                      onOpenAddDog();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--accent-amber)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={16} />
                    <span>{t('dogs.addDog')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {/* Time Simulator Badge */}
        <button
          className="time-sim-badge"
          onClick={onOpenTimeSimulator}
          title="Fast-forward date to test reminders & overdue engine"
        >
          <Calendar size={12} />
          <span>{isSimulated ? `Sim: ${effectiveDate}` : effectiveDate}</span>
        </button>

        {/* User Profile Avatar if logged in with Google */}
        {settings.ownerPhoto && (
          <img
            src={settings.ownerPhoto}
            alt={settings.ownerName}
            title={`Signed in as ${settings.ownerName} (${settings.ownerEmail || ''})`}
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-teal)' }}
          />
        )}

        {/* Theme Toggle */}
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
