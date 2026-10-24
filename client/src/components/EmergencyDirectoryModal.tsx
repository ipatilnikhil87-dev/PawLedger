import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { EmergencyClinic } from '../types';
import { X, PhoneCall, MapPin, Plus, ShieldAlert, Clock, Building2, Check } from 'lucide-react';

interface EmergencyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyDirectoryModal: React.FC<EmergencyDirectoryModalProps> = ({ isOpen, onClose }) => {
  const { allClinics, addCustomClinic } = useApp();
  const { t } = useI18n();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [is24x7, setIs24x7] = useState(true);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newClinic: EmergencyClinic = {
      id: `clinic_${Date.now()}`,
      name: name.trim(),
      area: area.trim() || 'Bengaluru',
      address: address.trim(),
      phone: phone.trim(),
      is24x7,
      notes: notes.trim(),
      isUserAdded: true,
    };

    await addCustomClinic(newClinic);
    setIsAddingNew(false);
    setName('');
    setPhone('');
    setAddress('');
    setArea('');
    setNotes('');
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
            <PhoneCall size={20} style={{ color: 'var(--accent-crimson)' }} />
            <h3 className="modal-title">Bengaluru 24x7 Emergency Vets</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Emergency Disclaimer Banner */}
        <div className="disclaimer-banner" style={{ background: 'rgba(239, 68, 68, 0.12)', borderLeft: '3px solid var(--accent-crimson)', color: 'var(--text-main)' }}>
          <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--accent-crimson)' }} />
          <strong>Verify Before Relying:</strong> Emergency doctor availability varies by shift. Always call ahead while in transit so the triage team can prepare an oxygen cage or surgery room.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Saved Offline ({allClinics.length} Centers)
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAddingNew(!isAddingNew)}
          >
            <Plus size={14} /> {isAddingNew ? 'Cancel' : 'Add Custom Vet'}
          </button>
        </div>

        {/* Form to add custom vet */}
        {isAddingNew && (
          <form onSubmit={handleAddClinic} style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Add Personal Regular / Emergency Vet</h4>
            
            <div className="form-group">
              <label className="form-label">Hospital / Vet Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Dr. Anand's Pet Clinic"
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
                  placeholder="+91 98..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Area / Locality</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jayanagar"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="Street address"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-sm">
              <Check size={16} /> Save Clinic
            </button>
          </form>
        )}

        {/* Clinic List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allClinics.map(clinic => (
            <div
              key={clinic.id}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700 }}>{clinic.name}</h4>
                    {clinic.isUserAdded && (
                      <span className="badge badge-valid" style={{ fontSize: '0.65rem' }}>Personal Vet</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 600, marginTop: '2px' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    {clinic.area}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {clinic.address}
                  </div>
                </div>

                <a
                  href={`tel:${clinic.phone}`}
                  className="btn btn-primary"
                  style={{ minWidth: '95px', padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <PhoneCall size={14} /> Call Now
                </a>
              </div>

              {clinic.notes && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  {clinic.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
