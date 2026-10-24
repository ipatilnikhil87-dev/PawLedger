import React, { useState } from 'react';
import { clearAllLocalData } from '../storage/db';
import { X, ShieldCheck, FileText, Scale, Lock, Trash2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'dpdp';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'dpdp'>(initialTab);
  const [erasureConfirmed, setErasureConfirmed] = useState(false);
  const [erasureSuccess, setErasureSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRightToErasure = async () => {
    // If logged in, call backend delete account
    const token = localStorage.getItem('pawledger_token');
    if (token) {
      try {
        await fetch('/api/auth/delete-account', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Server erasure request failed:', err);
      }
      localStorage.removeItem('pawledger_token');
      localStorage.removeItem('pawledger_user');
    }

    // Clear local IndexedDB storage
    await clearAllLocalData();
    setErasureSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <h2 id="legal-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Privacy & Legal Center
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                India DPDP Act (2023) Compliance & Terms
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.4rem',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'privacy' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'privacy' ? 'white' : 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Privacy Policy (DPDP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'terms' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'terms' ? 'white' : 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Terms & Vet Disclaimer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dpdp')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'dpdp' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'dpdp' ? 'white' : 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Right to Erasure (DPDP)
          </button>
        </div>

        {/* Privacy Policy */}
        {activeTab === 'privacy' && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Digital Personal Data Protection Act (DPDP), 2023 Compliance
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              PawLedger operates under strict privacy-first and local-first data principles.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                <strong>1. Local-First Default:</strong> Your dog's health data, vaccine certificates, photos, weight logs, and expense receipts are stored strictly on your device inside IndexedDB. No health data is uploaded to our servers unless you explicitly trigger cloud backup, pet passport sharing, or vet verification.
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                <strong>2. Purpose Limitation:</strong> Contact numbers (SMS/WhatsApp) are used solely to deliver scheduled vaccination alerts and pet care reminders requested by you. They are never shared, sold, or used for unsolicited commercial marketing.
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                <strong>3. Notice & Explicit Consent:</strong> Every sharing mechanism (Pet Passport QR link, Society Mode, Vet Verification) requires affirmative user consent. You can revoke any active link or token at any time.
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
                <strong>4. Society & RWA Privacy Guard:</strong> When participating in apartment community mode, your Resident Welfare Association (RWA) or Society Admin is permitted to see ONLY compliance status badges (<code>Valid</code>, <code>Due Soon</code>, or <code>Overdue</code>). Your dog's private medical notes, weight logs, and clinic bills are strictly redacted.
              </div>
            </div>
          </div>
        )}

        {/* Terms of Service & Medical Disclaimer */}
        {activeTab === 'terms' && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
            <div
              style={{
                padding: '0.875rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-danger)', fontSize: '0.95rem' }}>
                  Mandatory Medical & Veterinary Disclaimer
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                  PawLedger is an informational reminder and record-keeping tool. <strong>Nothing in this application constitutes veterinary medical advice, diagnosis, or prescription.</strong> Always consult a registered veterinary practitioner (BVSc/MVSc) for any health concerns or before administering medications and vaccines.
                </p>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              User Terms of Service
            </h3>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Informational Guidelines:</strong> Vaccination schedules are derived from WSAVA guidelines and standard Indian veterinary protocols, but your individual dog's health conditions may require an adjusted schedule determined by your vet.</li>
              <li><strong>Emergency Directory:</strong> Bengaluru emergency 24x7 clinic contacts are provided for quick reference. Owners must independently verify hours and availability before transport during emergencies.</li>
              <li><strong>User Responsibility:</strong> Owners are responsible for the accuracy of manually entered or scanned records and verifying OCR-extracted batch numbers.</li>
            </ul>
          </div>
        )}

        {/* DPDP Right to Erasure */}
        {activeTab === 'dpdp' && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Right to Erasure & Data Portability
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Under the Digital Personal Data Protection Act, 2023, you have the absolute legal right to withdraw consent and request total erasure of all your personal and pet health data from our systems.
            </p>

            {erasureSuccess ? (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  All Personal & Pet Data Permanently Erased
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Reloading clean guest workspace...
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Trash2 size={18} color="var(--color-danger)" />
                  <strong style={{ color: 'var(--color-danger)' }}>Permanent Account & Data Deletion</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  This action immediately:
                  <br />• Deletes all dog profiles, records, photos, and expense logs from your local browser IndexedDB.
                  <br />• Erases server account credentials and revokes all active pet passport QR links and vet verification tokens.
                  <br />• Irreversible action. Export your backup first if you wish to preserve your history.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    id="confirm-erasure-chk"
                    checked={erasureConfirmed}
                    onChange={(e) => setErasureConfirmed(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="confirm-erasure-chk" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    I understand this will permanently delete all my pet records and account data.
                  </label>
                </div>

                <button
                  type="button"
                  id="execute-right-to-erasure-btn"
                  onClick={handleRightToErasure}
                  disabled={!erasureConfirmed}
                  style={{
                    padding: '0.7rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: erasureConfirmed ? 'var(--color-danger)' : 'var(--color-border)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: erasureConfirmed ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Trash2 size={16} />
                  Execute Total Erasure (DPDP Act)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
