import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import {
  AlertTriangle,
  Calendar,
  Syringe,
  FileCheck,
  PhoneCall,
  Scale,
  CloudSun,
  ShieldAlert,
  ChevronRight,
  Plus,
  Stethoscope,
  AlertOctagon,
  Pill,
  TrendingUp,
  Flame,
  Bug,
  Camera,
  Mic
} from 'lucide-react';
import { getDogAge } from '../engine/scheduleEngine';
import { MissedDoseModal } from '../components/MissedDoseModal';

interface HomeScreenProps {
  onOpenAddRecord: (type?: 'vaccine' | 'deworming' | 'tick_flea', vKey?: string, dose?: number) => void;
  onNavigateTab: (tab: any) => void;
  onOpenPetPassport: () => void;
  onOpenVisitSummary: () => void;
  onOpenEmergencyDirectory: () => void;
  onOpenLostDog: () => void;
  onOpenVoiceEntry: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAddRecord,
  onNavigateTab,
  onOpenPetPassport,
  onOpenVisitSummary,
  onOpenEmergencyDirectory,
  onOpenLostDog,
  onOpenVoiceEntry,
}) => {
  const {
    activeDog,
    urgentOverdueItems,
    dueThisMonthItems,
    effectiveDate,
    dogs,
    activeAntibioticAlerts,
    activeDogTrends,
  } = useApp();
  const { t } = useI18n();

  // Selected overdue item for guidance modal
  const [selectedOverdue, setSelectedOverdue] = useState<{
    vaccineName: string;
    daysOverdue: number;
    dogName: string;
    isPuppySeries: boolean;
  } | null>(null);

  if (!activeDog) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No dog profile found.</p>
      </div>
    );
  }

  const age = getDogAge(activeDog.dateOfBirth, effectiveDate);

  return (
    <div>
      {/* Active Dog Profile Snapshot */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <img
          src={activeDog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'}
          alt={activeDog.name}
          style={{
            width: '74px',
            height: '74px',
            borderRadius: 'var(--radius-md)',
            objectFit: 'cover',
            border: '2px solid var(--accent-amber)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{activeDog.name}</h2>
            <span className="badge badge-valid">
              {urgentOverdueItems.filter(i => i.dogId === activeDog.id).length === 0 ? t('common.upToDate') : 'Action Needed'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeDog.breed} • {age.formatted}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <span>Weight: {activeDog.weightKg ? `${activeDog.weightKg} kg` : 'Not set'}</span>
            <span>•</span>
            <span>Microchip: {activeDog.microchipNumber || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Urgent Overdue Section (Cross-dogs) */}
      {urgentOverdueItems.length > 0 && (
        <div className="card card-urgent">
          <div className="card-title" style={{ color: 'var(--accent-crimson)' }}>
            <AlertTriangle size={18} />
            <span>{t('home.urgentTitle')} ({urgentOverdueItems.length})</span>
          </div>
          <p className="card-subtitle">{t('home.urgentSubtitle')}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {urgentOverdueItems.map((item, idx) => {
              const daysOver = Math.abs(item.daysDifference);
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.dogName}:</span>
                      <span style={{ fontSize: '0.9rem' }}>{item.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span className="badge badge-overdue">
                        {t('common.daysOverdue', { count: daysOver })}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedOverdue({
                            vaccineName: item.title,
                            daysOverdue: daysOver,
                            dogName: item.dogName,
                            isPuppySeries: age.years < 1,
                          })
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-amber)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        {t('home.reviewGuidance')}
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpenAddRecord('vaccine')}
                  >
                    <Plus size={14} /> Record
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Grid (Add by Voice, Passport, 24x7 Vets, Visit Summary, Lost Dog) */}
      <div className="quick-action-grid">
        <div className="quick-action-card" onClick={onOpenVoiceEntry} id="quick-action-voice-entry">
          <div className="quick-action-icon" style={{ background: 'rgba(236, 72, 153, 0.18)', color: '#ec4899' }}>
            <Mic size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Add by Voice</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voice Record Entry</div>
          </div>
        </div>

        <div className="quick-action-card" onClick={onOpenPetPassport}>
          <div className="quick-action-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-teal)' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('home.petPassport')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Print & QR Pass</div>
          </div>
        </div>

        <div className="quick-action-card" onClick={onOpenVisitSummary}>
          <div className="quick-action-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Vet Visit 1-Pager</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3-Month Summary</div>
          </div>
        </div>

        <div className="quick-action-card" onClick={onOpenEmergencyDirectory}>
          <div className="quick-action-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-crimson)' }}>
            <PhoneCall size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>24x7 Emergency</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bengaluru Clinics</div>
          </div>
        </div>

        <div className="quick-action-card" onClick={onOpenLostDog}>
          <div className="quick-action-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
            <AlertOctagon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lost Dog Mode</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Poster & WhatsApp</div>
          </div>
        </div>
      </div>

      {/* Due This Month (Cross-dogs Feature 18) */}
      <div className="card">
        <div className="card-title">
          <Calendar size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>{t('home.dueThisMonth')}</span>
        </div>
        <p className="card-subtitle">
          Upcoming preventative schedule for {dogs.length > 1 ? 'all dogs' : activeDog.name}.
        </p>

        {dueThisMonthItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--accent-teal)', fontSize: '0.9rem', fontWeight: 600 }}>
            {t('home.noDueThisMonth')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dueThisMonthItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    {dogs.length > 1 && <span style={{ color: 'var(--accent-amber)' }}>[{item.dogName}] </span>}
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Due date: {item.dueDate}
                  </div>
                </div>
                <span className="badge badge-due">
                  {item.daysDifference === 0 ? t('common.today') : t('common.daysLeft', { count: item.daysDifference })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seasonal Alerts for Bengaluru (Feature 7) */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(99, 102, 241, 0.08) 100%)' }}>
        <div className="card-title">
          <CloudSun size={18} style={{ color: '#818CF8' }} />
          <span>{t('home.seasonalTipTitle')}</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Bug size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Monsoon Tick & Flea Alert:</strong> Bengaluru's humidity in damp areas (Sarjapur, Whitefield, Cubbon Park) surges tick populations. Check paw pads and ear flaps after outdoor walks.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Flame size={16} style={{ color: 'var(--accent-crimson)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Asphalt Heat Warning (11 AM - 4 PM):</strong> Bengaluru roads can reach 50°C in summer. Place the back of your hand on the pavement for 7 seconds; if it burns you, it burns your dog's pads!
            </div>
          </div>
        </div>
      </div>

      {/* Veterinary Guidance Disclaimer */}
      <div className="disclaimer-banner">
        <ShieldAlert size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        {t('disclaimer')}
      </div>

      {/* Missed Dose Guidance Modal */}
      {selectedOverdue && (
        <MissedDoseModal
          isOpen={!!selectedOverdue}
          onClose={() => setSelectedOverdue(null)}
          vaccineName={selectedOverdue.vaccineName}
          daysOverdue={selectedOverdue.daysOverdue}
          dogName={selectedOverdue.dogName}
          isPuppySeries={selectedOverdue.isPuppySeries}
        />
      )}
    </div>
  );
};
