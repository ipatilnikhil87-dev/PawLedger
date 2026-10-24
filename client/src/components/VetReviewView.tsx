import React, { useState, useEffect } from 'react';
import { ShieldCheck, Stethoscope, CheckCircle, XCircle, Building2, UserCheck, AlertTriangle } from 'lucide-react';

interface VetReviewViewProps {
  token: string;
  onExit: () => void;
}

export const VetReviewView: React.FC<VetReviewViewProps> = ({ token, onExit }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vet form
  const [vetName, setVetName] = useState('Dr. Priya Sharma, MVSc');
  const [clinicName, setClinicName] = useState('Cessna Lifeline Veterinary Hospital, Bengaluru');
  const [vetRegNumber, setVetRegNumber] = useState('KA-VC-9021');
  const [notes, setNotes] = useState('Subcutaneous injection verified with physical booklet stamp.');
  const [submitting, setSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vet-verification/review/${token}`);
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Failed to load record.');
        }
        setData(resData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [token]);

  const handleSubmit = async (action: 'verified' | 'rejected') => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vet-verification/submit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          vetName,
          clinicName,
          vetRegNumber,
          notes,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      setSuccessStatus(action);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-main)' }}>
        <Stethoscope size={40} style={{ color: 'var(--accent-teal)', animation: 'spin 1.5s infinite linear' }} />
        <p style={{ marginTop: '12px' }}>Loading Pet Health Record for Doctor Review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-crimson)', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Verification Link Unavailable</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onExit}>Return to PawLedger</button>
      </div>
    );
  }

  const { dog, record } = data;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>
      {/* Top Banner */}
      <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--accent-teal)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
          <Stethoscope size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Veterinary Doctor Portal</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            One-tap clinical verification for canine immunizations in India.
          </p>
        </div>
      </div>

      {successStatus ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', border: '2px solid var(--accent-teal)' }}>
          <CheckCircle size={52} style={{ color: 'var(--accent-teal)', margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>
            Immunization Record {successStatus === 'verified' ? 'Verified!' : 'Rejected'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Thank you, Dr. {vetName}. The verified digital badge and hospital audit entry have been recorded on the pet's official ledger.
          </p>
          <button className="btn btn-primary" onClick={onExit}>Close View</button>
        </div>
      ) : (
        <>
          {/* Patient Details Card */}
          <div className="card">
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
              <img
                src={dog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80'}
                alt={dog.name}
                style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{dog.name}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {dog.breed} • DOB: {dog.dateOfBirth}
                </div>
                {dog.microchipNumber && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                    Microchip: {dog.microchipNumber}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-amber)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Entry to Verify:
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {record.vaccineName} (Dose {record.doseNumber})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Date Administered: <strong>{record.dateAdministered}</strong> • Next Due: <strong>{record.nextDueDate}</strong>
              </div>
              {record.batchNumber && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Sticker Batch: {record.batchNumber}
                </div>
              )}
            </div>

            {record.proofPhotoUrl && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Uploaded Card Photo Proof:
                </div>
                <img
                  src={record.proofPhotoUrl}
                  alt="Vaccination card"
                  style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            )}
          </div>

          {/* Doctor Verification Form */}
          <div className="card">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
              Doctor Stamp & Sign-off
            </h4>

            <div className="form-group">
              <label className="form-label">Doctor Name & Degree *</label>
              <input
                type="text"
                required
                className="form-input"
                value={vetName}
                onChange={e => setVetName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Hospital / Clinic *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">VCI / State Reg. No.</label>
                <input
                  type="text"
                  className="form-input"
                  value={vetRegNumber}
                  onChange={e => setVetRegNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Clinical Remarks / Batch Notes</label>
              <input
                type="text"
                className="form-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleSubmit('rejected')}
                disabled={submitting}
              >
                Reject Entry
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, background: 'var(--accent-teal)' }}
                onClick={() => handleSubmit('verified')}
                disabled={submitting}
              >
                <ShieldCheck size={18} /> Confirm & Certify
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
