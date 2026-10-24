import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { Dog, BreedSize, Gender } from '../types';
import { Plus, Check, Trash2, Edit2, Shield, Calendar, Scale, Dog as DogIcon } from 'lucide-react';
import { getDogAge, formatDate } from '../engine/scheduleEngine';

interface DogsScreenProps {
  onOpenAddDog: () => void;
}

export const DogsScreen: React.FC<DogsScreenProps> = ({ onOpenAddDog }) => {
  const { dogs, activeDog, setActiveDogId, deleteDog, effectiveDate } = useApp();
  const { t } = useI18n();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteDog(id);
    setConfirmDeleteId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('dogs.title')}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Manage multiple pets and their individual immunization records.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpenAddDog}>
          <Plus size={16} /> {t('dogs.addDog')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {dogs.map(dog => {
          const isActive = dog.id === activeDog?.id;
          const age = getDogAge(dog.dateOfBirth, effectiveDate);

          return (
            <div
              key={dog.id}
              className="card"
              style={{
                border: isActive ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                position: 'relative',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent-amber)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} /> {t('dogs.activeBadge')}
                </div>
              )}

              <div style={{ display: 'flex', gap: '14px' }}>
                <img
                  src={dog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=240&q=80'}
                  alt={dog.name}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                  }}
                />

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{dog.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {dog.breed} • <span style={{ textTransform: 'capitalize' }}>{dog.gender}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    <div>
                      <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {age.formatted}
                    </div>
                    <div>
                      <Scale size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {dog.weightKg ? `${dog.weightKg} kg` : 'Weight unset'}
                    </div>
                  </div>
                </div>
              </div>

              {dog.microchipNumber && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '10px', background: 'var(--bg-surface-elevated)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                  Microchip ID: <strong>{dog.microchipNumber}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                {!isActive ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setActiveDogId(dog.id)}
                  >
                    {t('dogs.switchToDog')}
                  </button>
                ) : (
                  <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center' }}>
                    Currently viewing this dog's records
                  </div>
                )}

                {dogs.length > 1 && (
                  <button
                    className="icon-btn"
                    style={{ color: 'var(--accent-crimson)' }}
                    onClick={() => setConfirmDeleteId(dog.id)}
                    title="Delete dog profile"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--accent-crimson)', marginBottom: '8px' }}>
              Confirm Profile Deletion
            </h3>
            <p className="card-subtitle">
              {t('dogs.deleteConfirm')}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(confirmDeleteId)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
