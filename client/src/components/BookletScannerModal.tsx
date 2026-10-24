import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  Building2,
  User,
} from 'lucide-react';
import {
  IOCRAdapter,
  MockOCRAdapter,
  TesseractOCRAdapter,
  SAMPLE_BOOKLET_PRESETS,
  SampleCardPreset,
  BookletOCRResult,
} from '../adapters/ocr';
import rulesData from '../data/vaccineRules.json';

interface BookletScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordSaved?: () => void;
}

export const BookletScannerModal: React.FC<BookletScannerModalProps> = ({
  isOpen,
  onClose,
  onRecordSaved,
}) => {
  const { activeDog, addVaccineRecord } = useApp();
  const { t } = useI18n();

  // Step: 'upload' | 'scanning' | 'review' | 'success'
  const [step, setStep] = useState<'upload' | 'scanning' | 'review' | 'success'>('upload');

  // Image source
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Engine selection
  const [engineType, setEngineType] = useState<'mock' | 'tesseract'>('mock');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');

  // Editable Form fields populated by OCR
  const [vaccineKey, setVaccineKey] = useState<string>('dhppil');
  const [vaccineName, setVaccineName] = useState<string>('');
  const [dateAdministered, setDateAdministered] = useState<string>('');
  const [nextDueDate, setNextDueDate] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [clinicName, setClinicName] = useState<string>('');
  const [vetName, setVetName] = useState<string>('');
  const [doseNumber, setDoseNumber] = useState<number>(1);
  const [ocrResult, setOcrResult] = useState<BookletOCRResult | null>(null);

  if (!isOpen || !activeDog) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedPresetId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset: SampleCardPreset) => {
    setSelectedImage(preset.imageUrl);
    setSelectedPresetId(preset.id);
  };

  const startScanning = async () => {
    if (!selectedImage) return;

    setStep('scanning');
    setScanProgress(5);
    setProgressStatus('Initializing OCR engine...');

    const adapter: IOCRAdapter =
      engineType === 'tesseract' ? new TesseractOCRAdapter() : new MockOCRAdapter();

    try {
      const result = await adapter.processCardImage(selectedImage, (pct, status) => {
        setScanProgress(pct);
        setProgressStatus(status);
      });

      setOcrResult(result);
      setVaccineKey(result.vaccineKey.value);
      setVaccineName(result.vaccineName.value);
      setDateAdministered(result.dateAdministered.value);
      setNextDueDate(result.nextDueDate.value);
      setBatchNumber(result.batchNumber.value);
      setClinicName(result.clinicName.value);
      setVetName(result.vetName.value);
      setDoseNumber(result.doseNumber.value);

      setStep('review');
    } catch (err) {
      console.error('OCR Processing error:', err);
      // Fallback
      setStep('review');
    }
  };

  const handleSaveVerifiedRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    const rule = (rulesData as any).rules.find((r: any) => r.key === vaccineKey);
    const totalDoses = rule ? rule.doses.length : 3;

    const id = `vac_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    await addVaccineRecord({
      id,
      dogId: activeDog.id,
      vaccineKey,
      vaccineName: vaccineName || rule?.name || 'Vaccine',
      doseNumber: Number(doseNumber),
      totalDoses,
      dateAdministered,
      nextDueDate,
      batchNumber,
      clinicName,
      vetName,
      proofPhotoUrl: selectedImage || undefined,
      verifiedStatus: 'unverified', // Unverified until vet review
      notes: `Digitized via Booklet OCR Scanner on ${new Date().toLocaleDateString()}`,
      createdAt,
    });

    setStep('success');
    setTimeout(() => {
      onRecordSaved?.();
      onClose();
      // Reset state
      setStep('upload');
      setSelectedImage(null);
      setSelectedPresetId(null);
    }, 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ocr-modal-title">
      <div
        className="modal-content"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 id="ocr-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                Booklet OCR Scanner
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Digitize paper card for <strong style={{ color: 'var(--color-text)' }}>{activeDog.name}</strong>
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
              borderRadius: '8px',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Upload / Choose Preset */}
        {step === 'upload' && (
          <div>
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                fontSize: '0.85rem',
              }}
            >
              <Info size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Upload a photo of the vaccination card or booklet sticker. PawLedger extracts the vaccine name, batch number, date, and next due date, highlighting any uncertain handwriting for your review.
              </div>
            </div>

            {/* Upload Area */}
            <div
              style={{
                border: selectedImage ? '2px solid var(--color-primary)' : '2px dashed var(--color-border)',
                borderRadius: '12px',
                padding: '0.75rem',
                textAlign: 'center',
                background: 'var(--color-bg-subtle)',
                marginBottom: '1rem',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                id="booklet-file-input"
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                }}
                aria-label="Upload vaccination card photo"
              />

              {selectedImage ? (
                <div>
                  <img
                    src={selectedImage}
                    alt="Card Preview"
                    style={{
                      maxHeight: '110px',
                      maxWidth: '100%',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginBottom: '0.4rem',
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                    ✓ Photo loaded. Click or tap to change.
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem auto',
                    }}
                  >
                    <Camera size={24} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Take photo or browse files
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Supports camera capture, PNG, JPG, or SVG booklets
                  </div>
                </div>
              )}
            </div>

            {/* Presets for Demo & Testing */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
                OR TRY SAMPLE INDIAN PET BOOKLETS:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {SAMPLE_BOOKLET_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {preset.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {preset.difficulty === 'messy_handwritten'
                          ? '⚠️ Cursive / smudged test'
                          : preset.difficulty === 'clear'
                          ? '✅ Clear printed sticker'
                          : '📋 Annual booster sticker'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OCR Engine Picker */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--color-bg-subtle)',
                marginBottom: '1.5rem',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>OCR Recognition Engine</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {engineType === 'mock' ? 'Instant local adapter with confidence simulation' : 'Tesseract.js on-device Web Worker'}
                </div>
              </div>
              <select
                value={engineType}
                onChange={(e) => setEngineType(e.target.value as 'mock' | 'tesseract')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text)',
                }}
              >
                <option value="mock">Local Mock (Fast)</option>
                <option value="tesseract">Tesseract.js (Live)</option>
              </select>
            </div>

            {/* Action Button */}
            <button
              type="button"
              id="start-ocr-scan-btn"
              onClick={startScanning}
              disabled={!selectedImage}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '10px',
                border: 'none',
                background: selectedImage
                  ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                  : 'var(--color-border)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: selectedImage ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: selectedImage ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
              }}
            >
              <Sparkles size={18} />
              Scan Booklet Card
            </button>
          </div>
        )}

        {/* Step 2: Scanning in progress */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <RefreshCw size={28} style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Scanning Booklet Card...
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {progressStatus || 'Running optical character recognition...'}
            </p>

            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: 'var(--color-border)',
                overflow: 'hidden',
                margin: '0 auto',
                maxWidth: '360px',
              }}
            >
              <div
                style={{
                  width: `${scanProgress}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              {scanProgress}%
            </div>
          </div>
        )}

        {/* Step 3: Review Screen (Highlighted Low-Confidence Fields) */}
        {step === 'review' && (
          <form onSubmit={handleSaveVerifiedRecord}>
            {/* Warning banner if low confidence items exist */}
            {ocrResult && ocrResult.warnings.length > 0 && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'flex-start',
                  fontSize: '0.82rem',
                }}
              >
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '2px' }}>
                    Low confidence or handwritten fields detected
                  </div>
                  {ocrResult.warnings.map((w, idx) => (
                    <div key={idx} style={{ color: 'var(--color-text)' }}>• {w}</div>
                  ))}
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#92400e' }}>
                    Fields bordered in amber require your confirmation before saving.
                  </div>
                </div>
              </div>
            )}

            {/* Card preview badge */}
            {selectedImage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1rem',
                }}
              >
                <img
                  src={selectedImage}
                  alt="Scanned card"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Original Card Proof</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Photo will be safely archived with this vaccine entry
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-border)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Rescan
                </button>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {/* Vaccine Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Vaccine Type
                  {ocrResult?.vaccineKey.isLowConfidence && (
                    <span style={{ color: '#d97706', marginLeft: '6px', fontSize: '0.75rem' }}>
                      (⚠️ Verify type)
                    </span>
                  )}
                </label>
                <select
                  value={vaccineKey}
                  onChange={(e) => {
                    setVaccineKey(e.target.value);
                    const rule = (rulesData as any).rules.find((r: any) => r.key === e.target.value);
                    if (rule) setVaccineName(rule.name);
                  }}
                  id="ocr-vaccine-key"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: ocrResult?.vaccineKey.isLowConfidence ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text)',
                  }}
                >
                  {(rulesData as any).rules.map((r: any) => (
                    <option key={r.key} value={r.key}>
                      {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dose & Date Given (Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Dose #
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={doseNumber}
                    onChange={(e) => setDoseNumber(parseInt(e.target.value, 10) || 1)}
                    id="ocr-dose-number"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Date Given
                    {ocrResult?.dateAdministered.isLowConfidence && (
                      <span style={{ color: '#d97706', marginLeft: '6px', fontSize: '0.75rem' }}>(⚠️ Low confidence)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={dateAdministered}
                    onChange={(e) => setDateAdministered(e.target.value)}
                    required
                    id="ocr-date-administered"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: ocrResult?.dateAdministered.isLowConfidence ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              {/* Next Due Date & Batch Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Next Due Date
                    {ocrResult?.nextDueDate.isLowConfidence && (
                      <span style={{ color: '#d97706', marginLeft: '6px', fontSize: '0.75rem' }}>(⚠️ Estimated)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    required
                    id="ocr-next-due-date"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: ocrResult?.nextDueDate.isLowConfidence ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Batch / Lot No.
                    {ocrResult?.batchNumber.isLowConfidence && (
                      <span style={{ color: '#d97706', marginLeft: '6px', fontSize: '0.75rem' }}>(⚠️ Verify)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    placeholder="e.g. B492A08-IN"
                    onChange={(e) => setBatchNumber(e.target.value)}
                    id="ocr-batch-number"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: ocrResult?.batchNumber.isLowConfidence ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              {/* Clinic & Vet Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Clinic / Hospital
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    placeholder="e.g. Cessna Lifeline, Domlur"
                    onChange={(e) => setClinicName(e.target.value)}
                    id="ocr-clinic-name"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Veterinarian Name
                  </label>
                  <input
                    type="text"
                    value={vetName}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    onChange={(e) => setVetName(e.target.value)}
                    id="ocr-vet-name"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Medical Disclaimer */}
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.25rem',
                textAlign: 'center',
              }}
            >
              ⚠️ General veterinary guidance only. Always confirm extracted vaccine information with your licensed vet.
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStep('upload')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="submit"
                id="save-verified-record-btn"
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={18} />
                Confirm & Save Record
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Success confirmation */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Vaccination Record Saved!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Card proof archived in IndexedDB. Schedule and pet passport updated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
