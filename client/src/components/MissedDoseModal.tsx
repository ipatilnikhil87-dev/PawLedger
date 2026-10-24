import React from 'react';
import { X, AlertTriangle, HelpCircle, PhoneCall, Stethoscope } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { getMissedDoseGuidance } from '../engine/scheduleEngine';

interface MissedDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaccineName: string;
  daysOverdue: number;
  dogName: string;
  isPuppySeries: boolean;
}

export const MissedDoseModal: React.FC<MissedDoseModalProps> = ({
  isOpen,
  onClose,
  vaccineName,
  daysOverdue,
  dogName,
  isPuppySeries,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const guidance = getMissedDoseGuidance(vaccineName, daysOverdue, isPuppySeries);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-crimson)' }}>
            <AlertTriangle size={22} />
            <h3 className="modal-title">Overdue Guidance for {dogName}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'var(--status-overdue-bg)', border: '1px solid var(--status-overdue-border)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, color: 'var(--status-overdue-text)', fontSize: '0.95rem' }}>
            {vaccineName} ({daysOverdue} days overdue)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px' }}>
            Urgency: <strong style={{ textTransform: 'capitalize' }}>{guidance.urgency}</strong>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
            Why Timing Matters:
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {guidance.explanation}
          </p>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-amber)', marginBottom: '8px' }}>
            <HelpCircle size={16} />
            <span>Questions to ask your veterinarian:</span>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {guidance.recommendedQuestionsForVet.map((q, idx) => (
              <li key={idx} style={{ fontStyle: 'italic' }}>{q}</li>
            ))}
          </ul>
        </div>

        <div className="disclaimer-banner">
          <Stethoscope size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          This information is for education only and does NOT constitute veterinary advice. Never administer prescription products without consulting a registered veterinarian.
        </div>

        <button className="btn btn-primary btn-block" onClick={onClose}>
          Understood
        </button>
      </div>
    </div>
  );
};
