import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { VaccineRecord, DewormingRecord, TickFleaRecord } from '../types';
import { X, Syringe, Bug, Pill, Camera } from 'lucide-react';
import { formatDate, addMonths, addWeeks, parseDate } from '../engine/scheduleEngine';
import rulesData from '../data/vaccineRules.json';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'vaccine' | 'deworming' | 'tick_flea';
  presetVaccineKey?: string;
  presetDoseNumber?: number;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  initialType = 'vaccine',
  presetVaccineKey,
  presetDoseNumber,
}) => {
  const { activeDog, effectiveDate, addVaccineRecord, addDewormingRecord, addTickFleaRecord } = useApp();
  const { t } = useI18n();

  const [recordType, setRecordType] = useState<'vaccine' | 'deworming' | 'tick_flea'>(initialType);

  // Vaccine fields
  const [vaccineKey, setVaccineKey] = useState(presetVaccineKey || 'dhppil');
  const [doseNumber, setDoseNumber] = useState(presetDoseNumber || 1);
  const [adminDate, setAdminDate] = useState(effectiveDate);
  const [batchNumber, setBatchNumber] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | undefined>(undefined);

  // Deworming fields
  const [dewormingMed, setDewormingMed] = useState('Drontal Plus');
  const [weightAtTime, setWeightAtTime] = useState(activeDog?.weightKg?.toString() || '');

  // Tick & Flea fields
  const [tickBrand, setTickBrand] = useState('Simparica Chewable');
  const [treatmentMethod, setTreatmentMethod] = useState<'oral_chew' | 'spot_on' | 'collar' | 'spray'>('oral_chew');

  if (!isOpen || !activeDog) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recordType === 'vaccine') {
      const selectedRule = rulesData.vaccines.find(v => v.key === vaccineKey);
      const vaccineName = selectedRule ? selectedRule.name : 'Custom Vaccine';
      const totalDoses = selectedRule ? selectedRule.doses.length : 3;

      // Auto-compute next due date based on rules
      const adminD = parseDate(adminDate);
      let nextDue: string;
      if (doseNumber < totalDoses) {
        nextDue = formatDate(addWeeks(adminD, 3));
      } else {
        nextDue = formatDate(addMonths(adminD, 12));
      }

      const rec: VaccineRecord = {
        id: `vrec_${Date.now()}`,
        dogId: activeDog.id,
        vaccineKey,
        vaccineName,
        doseNumber: Number(doseNumber),
        totalDoses,
        dateAdministered: adminDate,
        nextDueDate: nextDue,
        batchNumber: batchNumber.trim() || undefined,
        clinicName: clinicName.trim() || undefined,
        vetName: vetName.trim() || undefined,
        proofPhotoUrl,
        verifiedStatus: 'unverified',
        createdAt: new Date().toISOString(),
      };

      await addVaccineRecord(rec);
    } else if (recordType === 'deworming') {
      const adminD = parseDate(adminDate);
      const nextDue = formatDate(addMonths(adminD, 3));

      const rec: DewormingRecord = {
        id: `drec_${Date.now()}`,
        dogId: activeDog.id,
        medicationName: dewormingMed.trim(),
        dateAdministered: adminDate,
        nextDueDate: nextDue,
        weightAtTimeKg: weightAtTime ? parseFloat(weightAtTime) : undefined,
        createdAt: new Date().toISOString(),
      };

      await addDewormingRecord(rec);
    } else {
      const adminD = parseDate(adminDate);
      const intervalDays = tickBrand.toLowerCase().includes('bravecto') ? 90 : 30;
      const nextDue = formatDate(addWeeks(adminD, Math.floor(intervalDays / 7)));

      const rec: TickFleaRecord = {
        id: `tfrec_${Date.now()}`,
        dogId: activeDog.id,
        brandName: tickBrand.trim(),
        treatmentType: treatmentMethod,
        dateAdministered: adminDate,
        nextDueDate: nextDue,
        createdAt: new Date().toISOString(),
      };

      await addTickFleaRecord(rec);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Record Preventive Care</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${recordType === 'vaccine' ? 'active' : ''}`}
            onClick={() => setRecordType('vaccine')}
          >
            <Syringe size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {t('records.tabVaccines')}
          </button>
          <button
            type="button"
            className={`tab-btn ${recordType === 'deworming' ? 'active' : ''}`}
            onClick={() => setRecordType('deworming')}
          >
            <Pill size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {t('records.tabDeworming')}
          </button>
          <button
            type="button"
            className={`tab-btn ${recordType === 'tick_flea' ? 'active' : ''}`}
            onClick={() => setRecordType('tick_flea')}
          >
            <Bug size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {t('records.tabTickFlea')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {recordType === 'vaccine' && (
            <>
              <div className="form-group">
                <label className="form-label">Vaccine</label>
                <select
                  className="form-select"
                  value={vaccineKey}
                  onChange={e => setVaccineKey(e.target.value)}
                >
                  {rulesData.vaccines.map(v => (
                    <option key={v.key} value={v.key}>
                      {v.name} ({v.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Dose Number</label>
                  <select
                    className="form-select"
                    value={doseNumber}
                    onChange={e => setDoseNumber(Number(e.target.value))}
                  >
                    <option value={1}>Dose 1 (Primary)</option>
                    <option value={2}>Dose 2</option>
                    <option value={3}>Dose 3</option>
                    <option value={4}>Annual Booster</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date Given</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={adminDate}
                    onChange={e => setAdminDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">{t('records.batchNumber')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. A924B88"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('records.vet')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Ramesh"
                    value={vetName}
                    onChange={e => setVetName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('records.clinic')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cessna Lifeline, Domlur"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proof of Vaccination (Card Photo)</label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: '1px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: 'var(--bg-surface-elevated)',
                  }}
                >
                  <Camera size={18} />
                  <span>{proofPhotoUrl ? 'Photo Attached ✓' : 'Upload Card Sticker / Stamp'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                </label>
                {proofPhotoUrl && (
                  <img
                    src={proofPhotoUrl}
                    alt="Proof"
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}
                  />
                )}
              </div>
            </>
          )}

          {recordType === 'deworming' && (
            <>
              <div className="form-group">
                <label className="form-label">Medication Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Drontal Plus, Prazisam, Wormstop"
                  value={dewormingMed}
                  onChange={e => setDewormingMed(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Date Administered</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={adminDate}
                    onChange={e => setAdminDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dog Weight at Time (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={weightAtTime}
                    onChange={e => setWeightAtTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {recordType === 'tick_flea' && (
            <>
              <div className="form-group">
                <label className="form-label">Brand / Product</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Simparica, Bravecto, NexGard, Frontline"
                  value={tickBrand}
                  onChange={e => setTickBrand(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Administration Method</label>
                  <select
                    className="form-select"
                    value={treatmentMethod}
                    onChange={e => setTreatmentMethod(e.target.value as any)}
                  >
                    <option value="oral_chew">Oral Chewable</option>
                    <option value="spot_on">Spot-On Pipette</option>
                    <option value="collar">Protective Collar</option>
                    <option value="spray">Spray / Shampoo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date Given</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={adminDate}
                    onChange={e => setAdminDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="disclaimer-banner">
            {t('disclaimer')}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
