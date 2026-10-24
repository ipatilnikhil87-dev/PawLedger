import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import { ExpenseRecord } from '../types';
import { X, Receipt, Camera, Check } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, effectiveDate, addExpense } = useApp();
  const { t } = useI18n();

  const [category, setCategory] = useState<ExpenseRecord['category']>('vaccine');
  const [amountInr, setAmountInr] = useState('');
  const [date, setDate] = useState(effectiveDate);
  const [clinicOrMerchant, setClinicOrMerchant] = useState('');
  const [insuranceClaimStatus, setInsuranceClaimStatus] = useState<ExpenseRecord['insuranceClaimStatus']>('not_claimed');
  const [claimAmount, setClaimAmount] = useState('');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');

  if (!isOpen || !activeDog) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInr) return;

    const newExpense: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      dogId: activeDog.id,
      category,
      amountInr: parseFloat(amountInr),
      date,
      clinicOrMerchant: clinicOrMerchant.trim() || 'General Pet Care',
      insuranceClaimStatus,
      claimAmountInr: claimAmount ? parseFloat(claimAmount) : undefined,
      receiptPhotoUrl,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await addExpense(newExpense);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Log Healthcare Expense</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
              >
                <option value="vaccine">Vaccination</option>
                <option value="consultation">Vet Consultation</option>
                <option value="medication">Medication / Pharmacy</option>
                <option value="emergency">Emergency / Surgery</option>
                <option value="food">Prescription Food / Diet</option>
                <option value="grooming">Grooming & Hygiene</option>
                <option value="insurance">Insurance Premium</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹ INR) *</label>
              <input
                type="number"
                step="1"
                required
                className="form-input"
                placeholder="e.g. 1500"
                value={amountInr}
                onChange={e => setAmountInr(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Clinic / Merchant</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Cessna, TailsLife"
                value={clinicOrMerchant}
                onChange={e => setClinicOrMerchant(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Insurance claim status */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
            <label className="form-label">Pet Insurance Claim Tracking</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                className="form-select"
                value={insuranceClaimStatus}
                onChange={e => setInsuranceClaimStatus(e.target.value as any)}
              >
                <option value="not_claimed">Not Claimed</option>
                <option value="submitted">Claim Submitted</option>
                <option value="settled">Claim Settled / Reimbursed</option>
                <option value="rejected">Claim Rejected</option>
              </select>

              {insuranceClaimStatus !== 'not_claimed' && (
                <input
                  type="number"
                  className="form-input"
                  placeholder="Reimbursed ₹"
                  value={claimAmount}
                  onChange={e => setClaimAmount(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Receipt or Bill Photo</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <Camera size={18} />
              <span>{receiptPhotoUrl ? 'Receipt Attached ✓' : 'Upload Tax Invoice / Receipt'}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
