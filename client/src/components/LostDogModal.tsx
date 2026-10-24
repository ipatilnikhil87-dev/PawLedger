import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, AlertOctagon, Share2, Copy, Printer, Check, Phone, MapPin } from 'lucide-react';

interface LostDogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LostDogModal: React.FC<LostDogModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, settings, effectiveDate } = useApp();
  const { t } = useI18n();

  const [lastSeenLocation, setLastSeenLocation] = useState('Near Cubbon Park, Bengaluru');
  const [lastSeenDate, setLastSeenDate] = useState(effectiveDate);
  const [contactPhone, setContactPhone] = useState(settings.ownerPhone || '+91 98765 43210');
  const [rewardAmount, setRewardAmount] = useState('₹10,000');
  const [distinctFeatures, setDistinctFeatures] = useState('Wearing red collar, very friendly, responds to name.');
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !activeDog) return null;

  const handleCopyWhatsApp = () => {
    const message = `🚨 *URGENT: LOST DOG IN BENGALURU* 🚨

Please help us find *${activeDog.name.toUpperCase()}*!

🐕 *Breed:* ${activeDog.breed}
🎨 *Color/Markings:* ${activeDog.color || 'Tan / Golden'}
📍 *Last Seen:* ${lastSeenLocation}
📅 *Date & Time:* ${lastSeenDate}
🏷️ *Microchip No.:* ${activeDog.microchipNumber || 'Chipped'}
✨ *Details:* ${distinctFeatures}
💰 *Substantial Reward:* ${rewardAmount} (No questions asked)

📞 *PLEASE CALL IMMEDIATELY:*
Primary: *${contactPhone}*
Parent: *${settings.ownerName}*

Please forward this to all Bengaluru pet parent, resident & RWA WhatsApp groups! 🙏`;

    navigator.clipboard.writeText(message);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '560px', maxHeight: '94vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-crimson)' }}>
            <AlertOctagon size={24} />
            <h3 className="modal-title">Lost Dog Emergency Mode</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, background: '#25D366', color: '#FFFFFF', borderColor: '#25D366' }}
            onClick={handleCopyWhatsApp}
          >
            {copiedText ? <Check size={18} /> : <Copy size={18} />}
            <span>{copiedText ? 'WhatsApp Text Copied!' : 'Copy WhatsApp Blast Text'}</span>
          </button>

          <button className="btn btn-secondary" onClick={handlePrintPoster} title="Print emergency poster">
            <Printer size={18} /> Print Poster
          </button>
        </div>

        {/* Printable Poster Preview */}
        <div
          id="lost-dog-poster"
          style={{
            background: '#FFFFFF',
            color: '#000000',
            border: '8px solid #DC2626',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              padding: '8px',
              fontSize: '1.8rem',
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              borderRadius: '4px',
              marginBottom: '14px',
            }}
          >
            MISSING / LOST DOG
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <img
              src={activeDog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'}
              alt={activeDog.name}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '4px solid #000000',
              }}
            />
          </div>

          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '4px 0', color: '#111827' }}>
            "{activeDog.name.toUpperCase()}"
          </h2>

          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
            {activeDog.breed} • <span style={{ textTransform: 'capitalize' }}>{activeDog.gender}</span>
          </div>

          <div
            style={{
              background: '#FEF2F2',
              border: '2px dashed #DC2626',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '14px',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ marginBottom: '4px' }}>
              📍 <strong>Last Seen Location:</strong> {lastSeenLocation}
            </div>
            <div style={{ marginBottom: '4px' }}>
              📅 <strong>Date Missing:</strong> {lastSeenDate}
            </div>
            {activeDog.microchipNumber && (
              <div style={{ marginBottom: '4px' }}>
                🏷️ <strong>Microchip ID:</strong> {activeDog.microchipNumber}
              </div>
            )}
            <div>
              ✨ <strong>Distinguishing Notes:</strong> {distinctFeatures}
            </div>
          </div>

          <div
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              padding: '12px',
              borderRadius: '6px',
              fontWeight: 900,
            }}
          >
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Cash Reward For Safe Return: {rewardAmount}
            </div>
            <div style={{ fontSize: '1.5rem', marginTop: '4px' }}>
              📞 Call: {contactPhone}
            </div>
          </div>
        </div>

        {/* Customization options */}
        <div style={{ marginTop: '16px', background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>Customize Poster Details</h4>
          
          <div className="form-group">
            <label className="form-label">Last Seen Location in Bengaluru</label>
            <input
              type="text"
              className="form-input"
              value={lastSeenLocation}
              onChange={e => setLastSeenLocation(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Emergency Phone</label>
              <input
                type="tel"
                className="form-input"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reward Amount</label>
              <input
                type="text"
                className="form-input"
                value={rewardAmount}
                onChange={e => setRewardAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Collar Description</label>
            <input
              type="text"
              className="form-input"
              value={distinctFeatures}
              onChange={e => setDistinctFeatures(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
