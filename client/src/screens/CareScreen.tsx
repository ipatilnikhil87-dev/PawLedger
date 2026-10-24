import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import {
  HeartPulse,
  Pill,
  Receipt,
  TrendingUp,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Check,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AddMedicationModal } from '../components/AddMedicationModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { formatDate } from '../engine/scheduleEngine';

export const CareScreen: React.FC = () => {
  const {
    activeDog,
    medications,
    expenses,
    weightRecords,
    activeDogTrends,
    activeAntibioticAlerts,
    updateMedicationDose,
    deleteMedication,
    deleteExpense,
    addWeightRecord,
    deleteWeightRecord,
    effectiveDate,
  } = useApp();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'meds' | 'expenses' | 'trends'>('meds');
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Weight form
  const [newWeight, setNewWeight] = useState('');
  const [weightSuccess, setWeightSuccess] = useState(false);

  if (!activeDog) return null;

  const dogMeds = medications
    .filter(m => m.dogId === activeDog.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const dogExpenses = expenses
    .filter(e => e.dogId === activeDog.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const dogWeights = weightRecords
    .filter(w => w.dogId === activeDog.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute total expenses
  const totalExpenseInr = dogExpenses.reduce((acc, curr) => acc + curr.amountInr, 0);
  const totalReimbursedInr = dogExpenses.reduce((acc, curr) => acc + (curr.claimAmountInr || 0), 0);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    const wt = parseFloat(newWeight);
    await addWeightRecord({
      id: `wt_${Date.now()}`,
      dogId: activeDog.id,
      weightKg: wt,
      date: effectiveDate,
      notes: 'Logged via Care Screen',
    });
    setWeightSuccess(true);
    setNewWeight('');
    setTimeout(() => setWeightSuccess(false), 2500);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('care.title')}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Medication courses, expenses, and health trends for {activeDog.name}.
          </p>
        </div>

        {activeTab === 'meds' && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAddMedOpen(true)}>
            <Plus size={16} /> Course
          </button>
        )}
        {activeTab === 'expenses' && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAddExpenseOpen(true)}>
            <Plus size={16} /> Expense
          </button>
        )}
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'meds' ? 'active' : ''}`}
          onClick={() => setActiveTab('meds')}
        >
          <Pill size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('care.tabMeds')} ({dogMeds.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <Receipt size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('care.tabExpenses')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('care.tabTrends')}
        </button>
      </div>

      {/* TAB 1: MEDICATIONS */}
      {activeTab === 'meds' && (
        <div>
          {/* Feature 10: Antibiotic Compliance Alert */}
          {activeAntibioticAlerts.length > 0 && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)', border: '1px solid #6366F1', marginBottom: '12px' }}>
              <div className="card-title" style={{ color: '#818CF8' }}>
                <Pill size={18} />
                <span>Active Course: Finish the Full Antibiotic Course!</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                {activeDog.name} is on <strong>{activeAntibioticAlerts[0].medicationName}</strong> ({activeAntibioticAlerts[0].dosesTaken} of {activeAntibioticAlerts[0].totalDoses} doses given).
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Even if symptoms disappear, completing all prescribed doses prevents bacterial resistance and treatment failure.
              </p>
            </div>
          )}

          {dogMeds.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <Pill size={36} style={{ color: 'var(--accent-amber)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>No Active Medication Course</div>
              <p style={{ fontSize: '0.8rem', marginTop: '4px', marginBottom: '16px' }}>
                Track antibiotic schedules, eye drops, or chronic meds with completion tracking.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddMedOpen(true)}>
                <Plus size={16} /> Start New Course
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dogMeds.map(med => {
                const isFinished = med.dosesTaken >= med.totalDoses;
                const progressPct = Math.min(100, Math.round((med.dosesTaken / med.totalDoses) * 100));

                return (
                  <div
                    key={med.id}
                    className="card"
                    style={{
                      borderLeft: med.isAntibiotic ? '4px solid #6366F1' : '4px solid var(--accent-amber)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{med.medicationName}</h3>
                          {med.isAntibiotic && (
                            <span className="badge badge-due" style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', borderColor: '#6366F1' }}>
                              Antibiotic
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {med.dosage} • <span style={{ textTransform: 'capitalize' }}>{med.frequency.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${isFinished ? 'badge-valid' : 'badge-due'}`}>
                          {isFinished ? 'Completed' : `Dose ${med.dosesTaken} of ${med.totalDoses}`}
                        </span>
                        <button
                          className="icon-btn"
                          style={{ width: '28px', height: '28px', color: 'var(--accent-crimson)' }}
                          onClick={() => deleteMedication(med.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ margin: '12px 0 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        <span>Progress: {progressPct}%</span>
                        <span>Ends: {med.endDate}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: isFinished ? 'var(--accent-teal)' : 'var(--accent-amber)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {med.isAntibiotic && !isFinished && (
                      <div style={{ fontSize: '0.76rem', color: '#818CF8', background: 'rgba(99, 102, 241, 0.08)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }}>
                        ⚠️ <strong>Finish the entire course:</strong> Do not stop early even if your dog seems completely recovered.
                      </div>
                    )}

                    {!isFinished && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => updateMedicationDose(med.id, med.dosesTaken + 1)}
                        >
                          <Check size={14} /> Mark Dose Taken (+1)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSES & INSURANCE */}
      {activeTab === 'expenses' && (
        <div>
          {/* Yearly Spend Summary Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(16, 185, 129, 0.08) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                  Total Logged Care Spend
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                  ₹{totalExpenseInr.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-teal)' }}>Insurance Reimbursed</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  ₹{totalReimbursedInr.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {dogExpenses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <Receipt size={36} style={{ color: 'var(--accent-amber)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>No Expenses Logged Yet</div>
              <p style={{ fontSize: '0.8rem', marginTop: '4px', marginBottom: '16px' }}>
                Track vet consultation fees, vaccines, pet food, and insurance claims.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus size={16} /> Log First Expense
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dogExpenses.map(exp => (
                <div
                  key={exp.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        ₹{exp.amountInr.toLocaleString('en-IN')}
                      </span>
                      <span className="badge badge-due" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                        {exp.category}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {exp.clinicOrMerchant} • {exp.date}
                    </div>

                    {exp.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {exp.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {exp.insuranceClaimStatus === 'settled' && (
                      <span className="badge badge-valid" style={{ fontSize: '0.68rem' }}>Claim Settled</span>
                    )}
                    {exp.insuranceClaimStatus === 'submitted' && (
                      <span className="badge badge-due" style={{ fontSize: '0.68rem' }}>Claim Pending</span>
                    )}

                    <button
                      className="icon-btn"
                      style={{ color: 'var(--accent-crimson)' }}
                      onClick={() => deleteExpense(exp.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEIGHT & TRENDS */}
      {activeTab === 'trends' && (
        <div>
          {/* Trend Flag Alert */}
          {activeDogTrends.length > 0 && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(30, 41, 59, 0.8) 100%)', border: '1px solid var(--accent-amber)' }}>
              <div className="card-title" style={{ color: 'var(--accent-amber)' }}>
                <TrendingUp size={18} />
                <span>{activeDogTrends[0].title}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px' }}>
                {activeDogTrends[0].description}
              </p>
            </div>
          )}

          <div className="card">
            <div className="card-title">
              <Scale size={18} style={{ color: 'var(--accent-amber)' }} />
              <span>Weight & Growth Tracking</span>
            </div>
            <p className="card-subtitle">
              Current recorded weight: <strong>{activeDog.weightKg ? `${activeDog.weightKg} kg` : 'Unset'}</strong>
            </p>

            <form onSubmit={handleLogWeight} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="number"
                step="0.1"
                placeholder="Enter weight in kg"
                className="form-input"
                style={{ flex: 1 }}
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ minWidth: '90px' }}>
                <Plus size={16} /> Log Weight
              </button>
            </form>

            {weightSuccess && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', marginTop: '8px', fontWeight: 600 }}>
                ✓ Weight updated successfully!
              </div>
            )}
          </div>

          {/* Historical Weight Timeline */}
          <div className="card">
            <div className="card-title">
              <span>Historical Weight Timeline</span>
            </div>

            {dogWeights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No past weight readings logged.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {dogWeights.map(w => (
                  <div
                    key={w.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '1rem', fontWeight: 800 }}>{w.weightKg} kg</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                        {w.date} {w.notes && `• ${w.notes}`}
                      </span>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--accent-crimson)', width: '28px', height: '28px' }}
                      onClick={() => deleteWeightRecord(w.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddMedicationModal isOpen={isAddMedOpen} onClose={() => setIsAddMedOpen(false)} />
      <AddExpenseModal isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} />
    </div>
  );
};
