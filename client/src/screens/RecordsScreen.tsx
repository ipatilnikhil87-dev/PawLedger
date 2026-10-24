import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import {
  Syringe,
  Pill,
  Bug,
  Plus,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Calendar,
  Building2,
  UserCheck,
  Mic
} from 'lucide-react';
import { formatDate } from '../engine/scheduleEngine';

interface RecordsScreenProps {
  onOpenAddRecord: (type?: 'vaccine' | 'deworming' | 'tick_flea', vKey?: string, dose?: number) => void;
  onOpenVoiceEntry?: () => void;
}

export const RecordsScreen: React.FC<RecordsScreenProps> = ({
  onOpenAddRecord,
  onOpenVoiceEntry,
}) => {
  const {
    activeDog,
    vaccineRecords,
    dewormingRecords,
    tickFleaRecords,
    activeDogSchedule,
    activeDogNextDeworming,
    activeDogNextTickFlea,
    deleteVaccineRecord,
    deleteDewormingRecord,
    deleteTickFleaRecord,
  } = useApp();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'vaccines' | 'deworming' | 'tick_flea'>('vaccines');

  if (!activeDog) return null;

  const dogVaccines = vaccineRecords
    .filter(r => r.dogId === activeDog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const dogDeworming = dewormingRecords
    .filter(r => r.dogId === activeDog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const dogTickFlea = tickFleaRecords
    .filter(r => r.dogId === activeDog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  return (
    <div>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('records.title')}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tracking for {activeDog.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onOpenVoiceEntry && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenVoiceEntry}
              id="records-voice-entry-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Mic size={15} style={{ color: '#ec4899' }} /> Add by Voice
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenAddRecord(activeTab === 'vaccines' ? 'vaccine' : activeTab)}
          >
            <Plus size={16} /> {t('common.add')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'vaccines' ? 'active' : ''}`}
          onClick={() => setActiveTab('vaccines')}
        >
          <Syringe size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('records.tabVaccines')} ({dogVaccines.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'deworming' ? 'active' : ''}`}
          onClick={() => setActiveTab('deworming')}
        >
          <Pill size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('records.tabDeworming')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'tick_flea' ? 'active' : ''}`}
          onClick={() => setActiveTab('tick_flea')}
        >
          <Bug size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('records.tabTickFlea')}
        </button>
      </div>

      {/* TAB 1: VACCINES */}
      {activeTab === 'vaccines' && (
        <div>
          {/* Upcoming Dynamic Schedule Engine List */}
          <div className="card">
            <div className="card-title">
              <Calendar size={18} style={{ color: 'var(--accent-amber)' }} />
              <span>{t('records.nextScheduled')}</span>
            </div>
            <p className="card-subtitle">
              Calculated dynamically from date of birth and previous dose dates.
            </p>

            {activeDogSchedule.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-teal)' }}>
                All scheduled series doses and boosters are up to date!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeDogSchedule.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        {item.vaccineName}
                        {item.isCore && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginLeft: '6px' }}>
                            [CORE]
                          </span>
                        )}
                      </div>
                      <span
                        className={`badge ${
                          item.status === 'overdue'
                            ? 'badge-overdue'
                            : item.status === 'due_soon'
                            ? 'badge-due'
                            : 'badge-valid'
                        }`}
                      >
                        {item.status === 'overdue'
                          ? t('common.overdue')
                          : item.status === 'due_soon'
                          ? t('common.dueSoon')
                          : 'Scheduled'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {item.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                        Target: {item.dueDate}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenAddRecord('vaccine', item.vaccineKey, item.doseNumber)}
                      >
                        <Plus size={14} /> Log Dose {item.doseNumber}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Administered History */}
          <div className="card">
            <div className="card-title">
              <CheckCircle size={18} style={{ color: 'var(--accent-teal)' }} />
              <span>{t('records.historyTitle')}</span>
            </div>

            {dogVaccines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('records.noRecordsYet')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {dogVaccines.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {rec.vaccineName} (Dose {rec.doseNumber})
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Given on: <strong>{rec.dateAdministered}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {rec.verifiedStatus === 'verified' ? (
                          <span className="badge badge-verified" title="Verified by licensed vet">
                            <ShieldCheck size={12} /> {t('common.verified')}
                          </span>
                        ) : (
                          <span className="badge badge-due">
                            {t('common.unverified')}
                          </span>
                        )}
                        <button
                          className="icon-btn"
                          style={{ width: '28px', height: '28px', color: 'var(--accent-crimson)' }}
                          onClick={() => deleteVaccineRecord(rec.id)}
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {rec.batchNumber && <div>Batch: <strong>{rec.batchNumber}</strong></div>}
                      {rec.clinicName && <div>Clinic: {rec.clinicName}</div>}
                      {rec.vetName && <div>Vet: {rec.vetName}</div>}
                      {rec.verificationDetails && (
                        <div style={{ color: 'var(--accent-teal)', marginTop: '2px' }}>
                          ✓ Confirmed by {rec.verificationDetails.verifiedByVetName}
                        </div>
                      )}
                    </div>

                    {rec.proofPhotoUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={rec.proofPhotoUrl}
                          alt="Vaccine card proof"
                          style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEWORMING */}
      {activeTab === 'deworming' && (
        <div>
          {activeDogNextDeworming && (
            <div className="card">
              <div className="card-title">
                <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
                <span>Next Deworming Due</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '8px 0' }}>
                {activeDogNextDeworming.nextDueDate}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {activeDogNextDeworming.recommendation}
              </p>
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: '14px' }}
                onClick={() => onOpenAddRecord('deworming')}
              >
                <Plus size={16} /> Record Deworming Given
              </button>
            </div>
          )}

          <div className="card">
            <div className="card-title">
              <CheckCircle size={18} style={{ color: 'var(--accent-teal)' }} />
              <span>Deworming History</span>
            </div>

            {dogDeworming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No deworming doses logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {dogDeworming.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rec.medicationName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Date: {rec.dateAdministered} {rec.weightAtTimeKg && `• Weight: ${rec.weightAtTimeKg} kg`}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--accent-crimson)' }}
                      onClick={() => deleteDewormingRecord(rec.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TICK & FLEA */}
      {activeTab === 'tick_flea' && (
        <div>
          {activeDogNextTickFlea && (
            <div className="card">
              <div className="card-title">
                <Bug size={18} style={{ color: 'var(--accent-amber)' }} />
                <span>Next Tick & Flea Protection Due</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '8px 0' }}>
                {activeDogNextTickFlea.nextDueDate}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {activeDogNextTickFlea.recommendation}
              </p>
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: '14px' }}
                onClick={() => onOpenAddRecord('tick_flea')}
              >
                <Plus size={16} /> Record Preventative Given
              </button>
            </div>
          )}

          <div className="card">
            <div className="card-title">
              <CheckCircle size={18} style={{ color: 'var(--accent-teal)' }} />
              <span>Tick & Flea Prevention History</span>
            </div>

            {dogTickFlea.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tick/flea treatments logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {dogTickFlea.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rec.brandName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        Date: {rec.dateAdministered} • Method: {rec.treatmentType.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--accent-crimson)' }}
                      onClick={() => deleteTickFleaRecord(rec.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
