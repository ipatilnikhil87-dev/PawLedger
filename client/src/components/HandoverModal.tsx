import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Send, HeartHandshake, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({ isOpen, onClose }) => {
  const { activeDog } = useApp();
  const { t } = useI18n();

  const [recipientPhone, setRecipientPhone] = useState('+91 ');
  const [handoverType, setHandoverType] = useState<'adoption' | 'foster' | 'transfer'>('adoption');
  const [notes, setNotes] = useState('Adoption through rescue foundation. Complete vaccination history attached.');
  const [loading, setLoading] = useState(false);
  const [handoverUrl, setHandoverUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('pawledger_token');

  if (!isOpen || !activeDog) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/handover/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          dogId: activeDog.id,
          recipientPhone,
          handoverType,
          notes,
        }),
      });

      const data = await res.json();
      if (data.handoverLink) {
        setHandoverUrl(data.handoverLink);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (handoverUrl) {
      navigator.clipboard.writeText(handoverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartHandshake size={22} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Adoption & Foster Handover</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="card-subtitle">
          Transfer custody of <strong>{activeDog.name}</strong> with their complete, verifiable immunization and medical history to an adopter or foster parent. An immutable ownership history trail is preserved.
        </p>

        {!handoverUrl ? (
          <form onSubmit={handleInitiate}>
            <div className="form-group">
              <label className="form-label">Transfer Type</label>
              <select
                className="form-select"
                value={handoverType}
                onChange={e => setHandoverType(e.target.value as any)}
              >
                <option value="adoption">Permanent Adoption</option>
                <option value="foster">Temporary Foster Care</option>
                <option value="transfer">Ownership Transfer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">New Parent / Adopter Phone Number *</label>
              <input
                type="tel"
                required
                className="form-input"
                placeholder="+91 98765 43210"
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Handover Notes / Instructions</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <Send size={16} /> {loading ? 'Creating Transfer Code...' : 'Generate Transfer Link'}
            </button>
          </form>
        ) : (
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '8px' }}>
              ✓ Handover Transfer Link Generated!
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                readOnly
                value={handoverUrl}
                className="form-input"
                style={{ fontSize: '0.78rem' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              A notification has also been dispatched via our SMS gateway to {recipientPhone}. The recipient can claim the dog profile in 1 tap.
            </div>

            <a
              href={handoverUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-block btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={14} /> Preview Adopter Claim View
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
