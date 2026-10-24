import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, Sliders, History, RefreshCw, Smartphone } from 'lucide-react';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'flags' | 'sms' | 'audit'>('sms');
  const [flags, setFlags] = useState<any[]>([]);
  const [smsMessages, setSmsMessages] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, sRes, aRes] = await Promise.all([
        fetch('/api/admin/feature-flags'),
        fetch('/api/admin/sms-inbox'),
        fetch('/api/admin/audit-logs'),
      ]);

      const fData = await fRes.json();
      const sData = await sRes.json();
      const aData = await aRes.json();

      if (fData.flags) setFlags(fData.flags);
      if (sData.messages) setSmsMessages(sData.messages);
      if (aData.logs) setAuditLogs(aData.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleFlag = async (key: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/feature-flags/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '620px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Admin Console & Mock Gateway</h3>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="icon-btn" onClick={loadData} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
            onClick={() => setActiveTab('sms')}
          >
            <Smartphone size={14} style={{ display: 'inline', marginRight: '4px' }} />
            SMS / WhatsApp Inbox ({smsMessages.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'flags' ? 'active' : ''}`}
            onClick={() => setActiveTab('flags')}
          >
            Feature Flags
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Audit Logs
          </button>
        </div>

        {/* TAB 1: MOCK SMS / WHATSAPP INBOX */}
        {activeTab === 'sms' && (
          <div>
            <p className="card-subtitle">
              Live inspection of simulated SMS & WhatsApp messages dispatched by the server (OTP codes, household reminders, handover alerts).
            </p>

            {smsMessages.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 10px', fontSize: '0.85rem' }}>
                No messages dispatched yet. Trigger an OTP login or household reminder to see live outgoing SMS logs.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {smsMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                        To: {msg.toPhone}
                      </span>
                      <span className="badge badge-valid" style={{ fontSize: '0.65rem' }}>
                        {msg.type.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '8px 0', lineHeight: '1.4' }}>
                      {msg.message}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Timestamp: {msg.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FEATURE FLAGS */}
        {activeTab === 'flags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {flags.map(f => (
              <div
                key={f.key}
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
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{f.key}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.description}</div>
                </div>

                <button
                  className={`btn btn-sm ${f.enabled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleToggleFlag(f.key, f.enabled)}
                >
                  {f.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: 'var(--accent-teal)' }}>{log.action}</strong>
                  <span style={{ color: 'var(--text-dim)' }}>{log.timestamp}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  User: {log.userId} • {log.details}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
