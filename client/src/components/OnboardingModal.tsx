import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { Dog, Language, BreedSize, Gender } from '../types';
import { Sparkles, Globe, Heart, ShieldCheck, ChevronRight, Check } from 'lucide-react';
import { formatDate } from '../engine/scheduleEngine';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOG_AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80', // Golden
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80', // Indie
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80', // Lab
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80', // Beagle
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80', // Shih Tzu
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { addDog, updateSettings, seedDemo, effectiveDate } = useApp();
  const { language, setLanguage, t } = useI18n();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Dog form state
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('Indie / Indian Pariah');
  const [dob, setDob] = useState(() => {
    // Default to ~3 months ago
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return formatDate(d);
  });
  const [gender, setGender] = useState<Gender>('male');
  const [breedSize, setBreedSize] = useState<BreedSize>('medium');
  const [weightKg, setWeightKg] = useState('8.5');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [isNeutered, setIsNeutered] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(DOG_AVATAR_PRESETS[1]);

  if (!isOpen) return null;

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    updateSettings({ language: lang });
    setStep(2);
  };

  const handleDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDog: Dog = {
      id: `dog_${Date.now()}`,
      name: name.trim(),
      breed: breed.trim() || 'Indie / Mixed',
      dateOfBirth: dob,
      gender,
      breedSize,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      microchipNumber: microchipNumber.trim() || undefined,
      isNeutered,
      photoUrl,
      medicalNotes: 'Profile created in PawLedger.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addDog(newDog);
    onClose();
  };

  const handleQuickSeedDemo = async () => {
    await seedDemo();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-sheet" style={{ maxWidth: '480px' }}>
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🐾</div>
              <h2 className="modal-title" style={{ fontSize: '1.4rem' }}>
                {t('onboarding.welcomeTitle')}
              </h2>
              <p className="card-subtitle" style={{ marginTop: '8px' }}>
                {t('onboarding.welcomeSubtitle')}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ textAlign: 'center', marginBottom: '12px' }}>
                <Globe size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {t('onboarding.chooseLanguage')}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect('en')}
                >
                  English
                </button>
                <button
                  className={`btn ${language === 'hi' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect('hi')}
                >
                  हिन्दी (Hindi)
                </button>
                <button
                  className={`btn ${language === 'kn' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect('kn')}
                >
                  ಕನ್ನಡ (Kannada)
                </button>
                <button
                  className={`btn ${language === 'ta' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect('ta')}
                >
                  தமிழ் (Tamil)
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickSeedDemo}
                style={{ width: '100%', color: 'var(--accent-amber)' }}
              >
                <Sparkles size={16} /> Explore with Demo Dogs (Bruno & Milo)
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleDogSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">{t('onboarding.addFirstDogTitle')}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Step 2 of 2</span>
            </div>

            <p className="card-subtitle">{t('onboarding.addFirstDogSubtitle')}</p>

            <div className="form-group">
              <label className="form-label">{t('onboarding.dogNameLabel')} *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={t('onboarding.dogNamePlaceholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">{t('onboarding.breedLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('onboarding.breedPlaceholder')}
                  value={breed}
                  onChange={e => setBreed(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('onboarding.dobLabel')} *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={dob}
                  max={effectiveDate}
                  onChange={e => setDob(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">{t('onboarding.genderLabel')}</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                >
                  <option value="male">{t('onboarding.male')}</option>
                  <option value="female">{t('onboarding.female')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('onboarding.breedSizeLabel')}</label>
                <select
                  className="form-select"
                  value={breedSize}
                  onChange={e => setBreedSize(e.target.value as BreedSize)}
                >
                  <option value="toy">Toy (&lt; 5 kg)</option>
                  <option value="small">Small (5 - 10 kg)</option>
                  <option value="medium">Medium (10 - 25 kg)</option>
                  <option value="large">Large (25 - 45 kg)</option>
                  <option value="giant">Giant (&gt; 45 kg)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">{t('onboarding.weightLabel')}</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('onboarding.microchipLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="15-digit chip ID"
                  value={microchipNumber}
                  onChange={e => setMicrochipNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pick Photo Avatar</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {DOG_AVATAR_PRESETS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Preset"
                    onClick={() => setPhotoUrl(url)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: photoUrl === url ? '3px solid var(--accent-amber)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="disclaimer-banner">
              {t('disclaimer')}
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <Sparkles size={18} /> {t('onboarding.completeBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
