import React, { useState, useEffect } from 'react';
import { HeartHandshake, ShieldCheck, CheckCircle, AlertTriangle, Dog, Calendar } from 'lucide-react';

interface HandoverClaimViewProps {
  token: string;
  onExit: () => void;
}

export const HandoverClaimView: React.FC<HandoverClaimViewProps> = ({ token, onExit }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const authToken = localStorage.getItem('pawledger_token');

  useEffect(() => {
    const fetchHandover = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/handover/inspect/${token}`);
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to inspect handover.');
        setData(resData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHandover();
  }, [token]);

  const handleClaim = async () => {
    if (!authToken) {
      alert('Please log in with your phone number first to link this pet to your account.');
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(`/api/handover/claim/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      setClaimed(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <HeartHandshake size={40} style={{ color: 'var(--accent-amber)', animation: 'spin 1.5s infinite linear' }} />
        <p style={{ marginTop: '12px' }}>Loading Pet Transfer Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-crimson)', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Handover Unavailable</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onExit}>Return to PawLedger</button>
      </div>
    );
  }

  const { dog, handover, vaccineCount, vaccines } = data;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--accent-amber)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
          <HeartHandshake size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pet Custody Handover</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Official transfer from {handover.fromOwnerName} ({handover.type})
          </p>
        </div>
      </div>

      {claimed ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', border: '2px solid var(--accent-teal)' }}>
          <CheckCircle size={52} style={{ color: 'var(--accent-teal)', margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>
            Welcome Home, {dog.name}! 🐕🎉
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Custody has been transferred to your PawLedger account along with all {vaccineCount} verified vaccination records and ownership audit log.
          </p>
          <button className="btn btn-primary" onClick={onExit}>Open My Pets Dashboard</button>
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
              <img
                src={dog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80'}
                alt={dog.name}
                style={{ width: '74px', height: '74px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{dog.name}</h3>
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

            {handover.notes && (
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: '14px' }}>
                <strong>Message from {handover.fromOwnerName}:</strong><br />
                <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>"{handover.notes}"</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldCheck size={16} /> Complete Medical Records Attached ({vaccineCount} Vaccines):
              </div>
              <ul style={{ paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {vaccines.map((v: any) => (
                  <li key={v.id}>
                    <strong>{v.vaccineName}</strong> (Dose {v.doseNumber}) on {v.dateAdministered} {v.verifiedStatus === 'verified' && '✓'}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onExit}>
              Decline
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={handleClaim}
              disabled={claiming}
            >
              <HeartHandshake size={18} /> {claiming ? 'Claiming...' : 'Accept Custody & Import'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
