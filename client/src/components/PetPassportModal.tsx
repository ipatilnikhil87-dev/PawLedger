import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Printer, ShieldCheck, Share2, QrCode, Lock, Globe, Check } from 'lucide-react';
import { getDogAge } from '../engine/scheduleEngine';

interface PetPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PetPassportModal: React.FC<PetPassportModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, vaccineRecords, dewormingRecords, settings, effectiveDate } = useApp();
  const { t } = useI18n();

  const [isShareLinkActive, setIsShareLinkActive] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !activeDog) return null;

  const age = getDogAge(activeDog.dateOfBirth, effectiveDate);
  const dogVaccines = vaccineRecords
    .filter(r => r.dogId === activeDog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const dogDeworming = dewormingRecords
    .filter(r => r.dogId === activeDog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const handlePrint = () => {
    window.print();
  };

  const shareUrl = `https://pawledger.in/p/${activeDog.id}?token=pass_${Date.now().toString(36)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '600px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛂</span>
            <h3 className="modal-title">Official Pet Health Passport</h3>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Print or Save as PDF">
              <Printer size={16} /> Print / PDF
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Passport Card */}
        <div
          id="pet-passport-document"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '2px solid var(--accent-amber)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Watermark badge */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-20px',
              fontSize: '8rem',
              opacity: 0.04,
              pointerEvents: 'none',
            }}
          >
            🐾
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-amber)', fontWeight: 800 }}>
                Republic of India • Canine Health Record
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900 }}>PawLedger Pet Passport</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Passport ID</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                PL-{activeDog.id.replace('dog_', '').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Dog identity row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <img
              src={activeDog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'}
              alt={activeDog.name}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                border: '2px solid var(--border-strong)',
              }}
            />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Pet Name:</span><br />
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{activeDog.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Breed:</span><br />
                <strong>{activeDog.breed}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span><br />
                <strong>{activeDog.dateOfBirth} ({age.formatted})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Gender / Status:</span><br />
                <strong style={{ textTransform: 'capitalize' }}>{activeDog.gender} • {activeDog.isNeutered ? 'Neutered' : 'Intact'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)' }}>Microchip Identifier:</span><br />
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-amber)' }}>
                  {activeDog.microchipNumber || 'No Microchip Logged'}
                </strong>
              </div>
            </div>
          </div>

          {/* Certified Vaccinations Table */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-teal)' }} />
              Certified Immunization History
            </h4>

            {dogVaccines.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px' }}>
                No verified vaccination history recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dogVaccines.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--bg-surface)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      borderLeft: rec.verifiedStatus === 'verified' ? '3px solid var(--accent-teal)' : '3px solid var(--accent-amber)',
                    }}
                  >
                    <div>
                      <strong>{rec.vaccineName} (Dose {rec.doseNumber})</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Date: {rec.dateAdministered} • Batch: {rec.batchNumber || 'N/A'}
                      </div>
                      {rec.vetName && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Vet: {rec.vetName} ({rec.clinicName || 'Clinic'})
                        </div>
                      )}
                    </div>
                    <div>
                      {rec.verifiedStatus === 'verified' ? (
                        <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>
                          ✓ Vet Verified
                        </span>
                      ) : (
                        <span className="badge badge-due" style={{ fontSize: '0.68rem' }}>
                          Self-Reported
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owner details */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div>
              Owner: <strong>{settings.ownerName}</strong> ({settings.city})
            </div>
            <div>
              Contact: <strong>{settings.ownerPhone || 'Emergency contact on file'}</strong>
            </div>
          </div>
        </div>

        {/* Public Share / QR Code Controls */}
        <div style={{ marginTop: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} style={{ color: 'var(--accent-amber)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Revocable Public Passport Link</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Share read-only health proof with airlines, boarding kennels, or society admins.
                </div>
              </div>
            </div>

            <button
              className={`btn btn-sm ${isShareLinkActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => setIsShareLinkActive(!isShareLinkActive)}
            >
              {isShareLinkActive ? 'Revoke Link' : 'Enable Link'}
            </button>
          </div>

          {isShareLinkActive && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="form-input"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', height: '36px' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />} {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', marginTop: '6px' }}>
                ✓ Link expires automatically in 30 days. You can revoke it anytime.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
