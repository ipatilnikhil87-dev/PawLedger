import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, ShieldCheck, QrCode, Copy, Check, ExternalLink } from 'lucide-react';

interface VetVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VetVerificationModal: React.FC<VetVerificationModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, vaccineRecords } = useApp();
  const { t } = useI18n();

  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    vaccineRecords.filter(r => r.dogId === activeDog?.id)[0]?.id || ''
  );
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('pawledger_token');

  if (!isOpen || !activeDog) return null;

  const dogVaccines = vaccineRecords.filter(r => r.dogId === activeDog.id);

  const handleGenerateLink = async () => {
    if (!selectedRecordId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/vet-verification/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ recordId: selectedRecordId, dogId: activeDog.id }),
      });
      const data = await res.json();
      if (data.verificationUrl) {
        setVerificationUrl(data.verificationUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent-teal)' }} />
            <h3 className="modal-title">Vet Verification Link & QR</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="card-subtitle">
          Send a 1-tap verification link to your veterinarian or show them a QR code. Your vet can verify or stamp the record in 10 seconds without having to download or register!
        </p>

        {dogVaccines.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
            Please record a vaccination first before requesting vet verification.
          </div>
        ) : (
          <div>
            <div className="form-group">
              <label className="form-label">Select Vaccine Dose to Verify</label>
              <select
                className="form-select"
                value={selectedRecordId}
                onChange={e => {
                  setSelectedRecordId(e.target.value);
                  setVerificationUrl(null);
                }}
              >
                {dogVaccines.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vaccineName} (Dose {v.doseNumber}) - {v.dateAdministered} [{v.verifiedStatus.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {!verificationUrl ? (
              <button
                className="btn btn-primary btn-block"
                onClick={handleGenerateLink}
                disabled={loading}
              >
                <QrCode size={16} /> {loading ? 'Generating...' : 'Generate 7-Day Expiring Link'}
              </button>
            ) : (
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', marginTop: '14px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '8px' }}>
                  ✓ Expiring Verification Link Ready:
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    readOnly
                    value={verificationUrl}
                    className="form-input"
                    style={{ fontSize: '0.78rem' }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valid for 7 days</span>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Open Doctor Review View
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
