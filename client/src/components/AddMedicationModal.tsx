import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { MedicationCourse } from '../types';
import { X, Pill, ShieldAlert, Check } from 'lucide-react';
import { formatDate, addDays, parseDate } from '../engine/scheduleEngine';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, effectiveDate, addMedication } = useApp();
  const { t } = useI18n();

  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('1 tablet');
  const [frequency, setFrequency] = useState<'once_daily' | 'twice_daily' | 'thrice_daily' | 'custom'>('twice_daily');
  const [startDate, setStartDate] = useState(effectiveDate);
  const [totalDays, setTotalDays] = useState('7');
  const [isAntibiotic, setIsAntibiotic] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen || !activeDog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName) return;

    const days = parseInt(totalDays, 10) || 7;
    const end = formatDate(addDays(parseDate(startDate), days));
    const dosesPerDay = frequency === 'thrice_daily' ? 3 : frequency === 'twice_daily' ? 2 : 1;
    const totalDoses = days * dosesPerDay;

    const newMed: MedicationCourse = {
      id: `med_${Date.now()}`,
      dogId: activeDog.id,
      medicationName: medicationName.trim(),
      dosage: dosage.trim(),
      frequency,
      startDate,
      endDate: end,
      totalDoses,
      dosesTaken: 0,
      isAntibiotic,
      refillReminderDate: days > 5 ? formatDate(addDays(parseDate(end), -2)) : undefined,
      notes: notes.trim() || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await addMedication(newMed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">New Medication Course</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Medication Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Amoxicillin, Cephalexin, Metronidazole, Eye Drops"
              value={medicationName}
              onChange={e => setMedicationName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Dosage</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1 tablet (250mg) with food"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select
                className="form-select"
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
              >
                <option value="once_daily">Once Daily (Every 24h)</option>
                <option value="twice_daily">Twice Daily (Every 12h)</option>
                <option value="thrice_daily">Thrice Daily (Every 8h)</option>
                <option value="custom">As needed / Custom</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="60"
                className="form-input"
                value={totalDays}
                onChange={e => setTotalDays(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              border: isAntibiotic ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={isAntibiotic}
                onChange={e => setIsAntibiotic(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-amber)' }}
              />
              <span>Is this an Antibiotic?</span>
            </label>
            {isAntibiotic && (
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', marginTop: '6px' }}>
                <ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Enables "Finish the Full Course" alerts to prevent bacterial resistance and treatment relapse.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Doctor Notes / Special Instructions</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Give after feeding, watch for soft stools."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Start Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
