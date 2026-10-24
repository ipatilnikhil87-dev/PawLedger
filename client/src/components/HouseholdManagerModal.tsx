import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { X, Users, Phone, Bell, Send, Check, Trash2, Clock, ShieldCheck } from 'lucide-react';

interface HouseholdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HouseholdManagerModal: React.FC<HouseholdManagerModalProps> = ({ isOpen, onClose }) => {
  const { dogs, activeDog } = useApp();
  const { t } = useI18n();

  const [members, setMembers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [relationship, setRelationship] = useState<'family' | 'walker' | 'sitter'>('family');
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>(dogs.map(d => d.id));
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const token = localStorage.getItem('pawledger_token');

  const loadMembers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/household', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.members) setMembers(data.members);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) loadMembers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatusMessage('Please login first to enable household WhatsApp/SMS reminders.');
      return;
    }

    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          relationship,
          permissions: relationship === 'family' ? 'edit' : 'reminders_only',
          dogIds: selectedDogIds,
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setName('');
        setPhone('+91 ');
        setStatusMessage('Household member added! They will receive reminders without installing the app.');
        loadMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestReminder = async (memberId: string) => {
    try {
      const res = await fetch('/api/household/send-reminder-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberId,
          dogName: activeDog?.name || 'Bruno',
          reminderTitle: 'Upcoming Annual Rabies Booster',
          reminderDate: 'in 5 days',
        }),
      });
      const data = await res.json();
      setStatusMessage(data.message);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await fetch(`/api/household/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadMembers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '540px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Household & Walker Reminders</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="card-subtitle">
          Family members, dog walkers, or pet sitters receive automatic WhatsApp/SMS reminders without having to install anything!
        </p>

        {statusMessage && (
          <div style={{ background: 'var(--status-valid-bg)', color: 'var(--status-valid-text)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '14px', border: '1px solid var(--status-valid-border)' }}>
            {statusMessage}
          </div>
        )}

        {!token && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--accent-amber)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.82rem' }}>
            🔒 <strong>Account Required:</strong> Please sign in with your phone number to dispatch WhatsApp/SMS alerts to external contacts.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Active Care Team ({members.length})</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : '+ Add Person'}
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAddMember} style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Ramesh (Walker), Anita (Sister)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role / Relationship</label>
                <select
                  className="form-select"
                  value={relationship}
                  onChange={e => setRelationship(e.target.value as any)}
                >
                  <option value="family">Family Member</option>
                  <option value="walker">Dog Walker</option>
                  <option value="sitter">Pet Sitter / Boarder</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Quiet Hours Start</label>
                <input
                  type="time"
                  className="form-input"
                  value={quietStart}
                  onChange={e => setQuietStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quiet Hours End</label>
                <input
                  type="time"
                  className="form-input"
                  value={quietEnd}
                  onChange={e => setQuietEnd(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-sm" style={{ marginTop: '8px' }}>
              <Check size={14} /> Save & Enable Reminders
            </button>
          </form>
        )}

        {/* Member List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map(m => (
            <div
              key={m.id}
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
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {m.name} <span className="badge badge-due" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>{m.relationship}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {m.phone} • Quiet: {m.quietHoursStart} - {m.quietHoursEnd}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTestReminder(m.id)}
                  title="Test WhatsApp/SMS alert dispatch"
                >
                  <Send size={12} /> Test Ping
                </button>
                <button
                  className="icon-btn"
                  style={{ color: 'var(--accent-crimson)', width: '32px', height: '32px' }}
                  onClick={() => handleDeleteMember(m.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
