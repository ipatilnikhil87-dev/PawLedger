import React from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Printer, Stethoscope, Scale, Pill, ShieldCheck, HelpCircle } from 'lucide-react';
import { getDogAge, diffInDays, parseDate } from '../engine/scheduleEngine';

interface VetVisitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VetVisitSummaryModal: React.FC<VetVisitSummaryModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, vaccineRecords, dewormingRecords, medications, weightRecords, activeDogTrends, effectiveDate } = useApp();
  const { t } = useI18n();

  if (!isOpen || !activeDog) return null;

  const age = getDogAge(activeDog.dateOfBirth, effectiveDate);
  const curDate = parseDate(effectiveDate);

  // Filter items in the last 90 days (3 months)
  const recentVaccines = vaccineRecords.filter(r => {
    if (r.dogId !== activeDog.id) return false;
    const days = diffInDays(curDate, parseDate(r.dateAdministered));
    return days >= 0 && days <= 95;
  });

  const recentDeworming = dewormingRecords.filter(r => {
    if (r.dogId !== activeDog.id) return false;
    const days = diffInDays(curDate, parseDate(r.dateAdministered));
    return days >= 0 && days <= 95;
  });

  const activeMeds = medications.filter(m => m.dogId === activeDog.id && m.status === 'active');
  const recentWeights = weightRecords
    .filter(w => w.dogId === activeDog.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '580px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stethoscope size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">3-Month Vet Visit Summary</h3>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Print or save as PDF">
              <Printer size={16} /> Print 1-Pager
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 1-Page Summary Sheet */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontSize: '0.82rem',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeDog.name}</h3>
                <div style={{ color: 'var(--text-muted)' }}>
                  {activeDog.breed} • {age.formatted} • <span style={{ textTransform: 'capitalize' }}>{activeDog.gender}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Generated on:<br />
                <strong>{effectiveDate}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Weight & Growth Trajectory */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Scale size={15} /> Weight & Physical Trends (Last 90 Days)
            </div>
            {recentWeights.length > 0 ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                {recentWeights.slice(0, 4).map(w => (
                  <span key={w.id} style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                    {w.date}: <strong>{w.weightKg} kg</strong>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Current recorded weight: {activeDog.weightKg ? `${activeDog.weightKg} kg` : 'Unset'}</div>
            )}

            {activeDogTrends.length > 0 && (
              <div style={{ marginTop: '6px', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid var(--accent-amber)', padding: '6px 8px', borderRadius: '0 4px 4px 0' }}>
                {activeDogTrends[0].description}
              </div>
            )}
          </div>

          {/* Section 2: Recent Vaccines & Preventatives */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheck size={15} /> Vaccines & Deworming (Last 90 Days)
            </div>
            {recentVaccines.length === 0 && recentDeworming.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No vaccines or deworming recorded in the last 3 months.</div>
            ) : (
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {recentVaccines.map(v => (
                  <li key={v.id}>
                    <strong>{v.vaccineName} (Dose {v.doseNumber})</strong> on {v.dateAdministered} {v.batchNumber && `[Batch: ${v.batchNumber}]`}
                  </li>
                ))}
                {recentDeworming.map(d => (
                  <li key={d.id}>
                    Deworming: <strong>{d.medicationName}</strong> on {d.dateAdministered}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section 3: Active Medications */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: '#818CF8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Pill size={15} /> Current Medications & Dosage
            </div>
            {activeMeds.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No active daily medications.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeMeds.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <strong>{m.medicationName}</strong> — {m.dosage} ({m.dosesTaken}/{m.totalDoses} doses taken)
                    {m.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Note: {m.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Questions to ask the Doctor */}
          <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <HelpCircle size={15} style={{ color: 'var(--accent-amber)' }} /> Questions for this Appointment
            </div>
            <ul style={{ paddingLeft: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Review next booster schedule and ensure rabies certificate is valid.</li>
              <li>Check ears and coat for Bengaluru monsoon humidity dermatitis or tick exposure.</li>
              <li>Confirm current deworming dosage based on latest weight.</li>
            </ul>
          </div>
        </div>

        <div className="disclaimer-banner" style={{ marginTop: '14px' }}>
          {t('disclaimer')}
        </div>
      </div>
    </div>
  );
};
