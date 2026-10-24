import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Calendar, FastForward, RotateCcw } from 'lucide-react';
import { formatDate, addDays, addMonths, parseDate } from '../engine/scheduleEngine';

interface TimeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimeSimulatorModal: React.FC<TimeSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { effectiveDate, settings, setSimulatedDate } = useApp();
  const { t } = useI18n();
  const [customDate, setCustomDate] = useState(effectiveDate);

  if (!isOpen) return null;

  const actualToday = formatDate(new Date());

  const handleFastForward = (months: number) => {
    const base = parseDate(effectiveDate);
    const newDate = addMonths(base, months);
    const dateStr = formatDate(newDate);
    setSimulatedDate(dateStr);
    setCustomDate(dateStr);
  };

  const handleReset = () => {
    setSimulatedDate(null);
    setCustomDate(actualToday);
  };

  const handleApplyCustom = () => {
    if (customDate) {
      setSimulatedDate(customDate === actualToday ? null : customDate);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">{t('settings.timeSimulatorTitle')}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="card-subtitle" style={{ marginBottom: '16px' }}>
          {t('settings.timeSimulatorDesc')}
        </p>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Effective App Date:</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            {effectiveDate} {settings.simulatedDate ? '(Simulated)' : '(Actual Today)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Real Device Date: {actualToday}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Fast-Forward Quick Presets</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleFastForward(1)}>
              <FastForward size={14} /> +1 Month
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleFastForward(3)}>
              <FastForward size={14} /> +3 Months
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleFastForward(12)}>
              <FastForward size={14} /> +1 Year
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Set Custom Simulation Date</label>
          <input
            type="date"
            className="form-input"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleReset}>
            <RotateCcw size={16} /> Reset Today
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApplyCustom}>
            Apply Date
          </button>
        </div>
      </div>
    </div>
  );
};
