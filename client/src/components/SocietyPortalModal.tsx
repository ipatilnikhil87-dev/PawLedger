import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Building2, ShieldCheck, Check, Trash2, Eye, ShieldAlert } from 'lucide-react';

interface SocietyPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocietyPortalModal: React.FC<SocietyPortalModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, dogs } = useApp();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'consent' | 'admin_view'>('consent');
  const [societyName, setSocietyName] = useState('Prestige Shantiniketan');
  const [flatNumber, setFlatNumber] = useState('Tower 12, Flat 402');
  const [selectedDogId, setSelectedDogId] = useState(activeDog?.id || dogs[0]?.id || '');
  const [consents, setConsents] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Admin view state
  const [adminReport, setAdminReport] = useState<any>(null);
  const [adminSocietyQuery, setAdminSocietyQuery] = useState('Prestige Shantiniketan');

  const token = localStorage.getItem('pawledger_token');

  const loadConsents = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/society/my-consents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.consents) setConsents(data.consents);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdminReport = async () => {
    try {
      const res = await fetch(`/api/society/admin/${encodeURIComponent(adminSocietyQuery)}`);
      const data = await res.json();
      setAdminReport(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConsents();
      loadAdminReport();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGrantConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatusMessage('Please login first to submit official society consent.');
      return;
    }

    try {
      const res = await fetch('/api/society/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dogId: selectedDogId,
          societyName,
          flatNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message);
        loadConsents();
        loadAdminReport();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    try {
      const res = await fetch('/api/society/revoke-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ consentId }),
      });
      const data = await res.json();
      setStatusMessage(data.message);
      loadConsents();
      loadAdminReport();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '580px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={22} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Apartment Society / RWA Mode</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'consent' ? 'active' : ''}`}
            onClick={() => setActiveTab('consent')}
          >
            My Consents & Opt-In
          </button>
          <button
            className={`tab-btn ${activeTab === 'admin_view' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin_view');
              loadAdminReport();
            }}
          >
            Committee Admin View
          </button>
        </div>

        {statusMessage && (
          <div style={{ background: 'var(--status-valid-bg)', color: 'var(--status-valid-text)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '14px', border: '1px solid var(--status-valid-border)' }}>
            {statusMessage}
          </div>
        )}

        {/* TAB 1: RESIDENT CONSENT MANAGER */}
        {activeTab === 'consent' && (
          <div>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.82rem', lineHeight: '1.5' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-teal)', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              <strong>DPDP Act Privacy Guarantee:</strong> When you opt-in, your apartment committee admin only sees high-level immunization status (Valid / Overdue / Due Soon). Your dog's private health notes, weights, prescriptions, and vet bills are <em>never</em> disclosed. You can revoke consent in 1 tap anytime.
            </div>

            <form onSubmit={handleGrantConsent} style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                Opt-in Dog to Apartment Society
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Dog</label>
                  <select
                    className="form-select"
                    value={selectedDogId}
                    onChange={e => setSelectedDogId(e.target.value)}
                  >
                    {dogs.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.breed})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Flat / Villa No.</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={flatNumber}
                    onChange={e => setFlatNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Apartment / Gated Community Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Prestige Shantiniketan, Sobha Dream Acres"
                  value={societyName}
                  onChange={e => setSocietyName(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-sm">
                <Check size={16} /> Grant Explicit Consent
              </button>
            </form>

            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              Active Consents ({consents.length})
            </h4>

            {consents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px', textAlign: 'center' }}>
                No active society consents.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {consents.map(c => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.societyName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Dog: <strong>{c.dogName}</strong> • {c.flatNumber}
                      </div>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRevokeConsent(c.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMITTEE ADMIN VIEW */}
        {activeTab === 'admin_view' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Society Name..."
                value={adminSocietyQuery}
                onChange={e => setAdminSocietyQuery(e.target.value)}
              />
              <button className="btn btn-secondary btn-sm" onClick={loadAdminReport}>
                Filter
              </button>
            </div>

            {adminReport && (
              <div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opted-In Pets</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{adminReport.summary.totalConsentedDogs}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-teal)' }}>Fully Compliant</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                      {adminReport.summary.compliantDogs}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>Compliance</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      {adminReport.summary.compliancePercentage}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminReport.residentPets.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: p.overallVaccineStatus === 'valid' ? '3px solid var(--accent-teal)' : '3px solid var(--accent-crimson)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {p.dogName} ({p.breed}) • Flat: {p.flatNumber}
                        </div>
                        <span className={`badge ${p.overallVaccineStatus === 'valid' ? 'badge-valid' : 'badge-overdue'}`}>
                          {p.overallVaccineStatus.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Resident: {p.ownerName} • Rabies: <strong style={{ color: p.rabiesImmunization.includes('Active') ? 'var(--accent-teal)' : 'var(--accent-crimson)' }}>{p.rabiesImmunization}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="disclaimer-banner" style={{ marginTop: '14px' }}>
                  {adminReport.privacyNotice}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
