/**
 * CareHandoverPDFModal.tsx
 *
 * Allows a dog owner to:
 *  - Fill in temporary care instructions (food, feeding schedule, medicines,
 *    allergies, daily routine, special instructions, vet & emergency contacts)
 *  - Preview a well-formatted care guide card
 *  - Download as a PDF (uses browser print dialog → "Save as PDF")
 *  - Share via the Web Share API (with a download fallback)
 *
 * Care details are persisted in localStorage keyed by dogId so the owner
 * can edit and regenerate the PDF at any time.
 *
 * The caretaker receives a READ-ONLY PDF — no app interaction required.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Download,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Pencil,
} from 'lucide-react';

interface CareDetails {
  foodType: string;
  foodQuantity: string;
  feedingSchedule: string;
  medicines: string;
  allergies: string;
  dailyRoutine: string;
  specialInstructions: string;
  vetName: string;
  vetPhone: string;
  clinicName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const EMPTY_CARE: CareDetails = {
  foodType: '',
  foodQuantity: '',
  feedingSchedule: '',
  medicines: '',
  allergies: '',
  dailyRoutine: '',
  specialInstructions: '',
  vetName: '',
  vetPhone: '',
  clinicName: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

const STORAGE_KEY = (dogId: string) => `pawledger_care_guide_${dogId}`;

function buildPrintHTML(
  dogName: string,
  breed: string,
  photoUrl: string | undefined,
  care: CareDetails,
  ownerName: string,
  generatedDate: string,
): string {
  const row = (label: string, value: string) =>
    value.trim()
      ? `<tr>
          <td style="padding:6px 10px;font-weight:700;color:#374151;white-space:nowrap;vertical-align:top;width:160px;">${label}</td>
          <td style="padding:6px 10px;color:#111827;line-height:1.55;">${value.replace(/\n/g, '<br/>')}</td>
         </tr>`
      : '';

  const section = (title: string, rows: string) =>
    rows.trim()
      ? `<div style="margin-bottom:18px;">
           <div style="background:#f3f4f6;padding:7px 12px;border-radius:6px;font-weight:800;font-size:13px;letter-spacing:.5px;color:#6366f1;text-transform:uppercase;margin-bottom:4px;">${title}</div>
           <table style="width:100%;border-collapse:collapse;">${rows}</table>
         </div>`
      : '';

  const photoHTML = photoUrl
    ? `<img src="${photoUrl}" alt="${dogName}" style="width:88px;height:88px;border-radius:12px;object-fit:cover;border:3px solid #e0e7ff;flex-shrink:0;" />`
    : `<div style="width:88px;height:88px;border-radius:12px;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;">🐾</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Care Guide – ${dogName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',Arial,sans-serif;background:#fff;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{max-width:720px;margin:0 auto;padding:28px 24px;}
    @media print{body{margin:0;}.page{max-width:100%;padding:20px;}}
  </style>
</head>
<body>
<div class="page">
  <div style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#7c3aed 100%);border-radius:14px;padding:20px 22px;margin-bottom:22px;display:flex;align-items:center;gap:18px;">
    ${photoHTML}
    <div style="flex:1;">
      <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;">🐾 ${dogName}'s Care Guide</div>
      <div style="font-size:14px;color:#c7d2fe;margin-bottom:2px;">${breed}</div>
      <div style="font-size:12px;color:#a5b4fc;">Prepared by ${ownerName || 'Owner'} · ${generatedDate}</div>
    </div>
    <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 12px;text-align:center;flex-shrink:0;">
      <div style="font-size:11px;color:#c7d2fe;font-weight:600;">READ-ONLY</div>
      <div style="font-size:10px;color:#a5b4fc;margin-top:2px;">Care Guide for Caretaker</div>
    </div>
  </div>
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#92400e;line-height:1.5;">
    ⚠️ <strong>For temporary care only.</strong> This guide is provided by the dog's owner. The caretaker should not change the dog's health records. In an emergency, call the contacts listed below or go to the nearest vet clinic immediately.
  </div>
  ${section('🍖 Feeding', `${row('Food Type', care.foodType)}${row('Quantity / Portion', care.foodQuantity)}${row('Feeding Schedule', care.feedingSchedule)}`)}
  ${section('💊 Medicines & Health', `${row('Current Medicines', care.medicines)}${row('Allergies / Intolerances', care.allergies)}`)}
  ${section('🗓️ Daily Routine', `${row('Routine', care.dailyRoutine)}`)}
  ${section('📝 Special Instructions', `${row('Instructions', care.specialInstructions)}`)}
  ${section('📞 Emergency Contacts', `${row('Emergency Contact', care.emergencyContactName + (care.emergencyContactPhone ? ' · ' + care.emergencyContactPhone : ''))}${row('Veterinarian', care.vetName + (care.vetPhone ? ' · ' + care.vetPhone : ''))}${row('Clinic', care.clinicName)}`)}
  <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#9ca3af;">
    <span>Generated by PawLedger 🐾 · pawledger.app</span>
    <span>${generatedDate}</span>
  </div>
</div>
</body>
</html>`;
}

interface CareHandoverPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CareHandoverPDFModal: React.FC<CareHandoverPDFModalProps> = ({ isOpen, onClose }) => {
  const { activeDog, settings } = useApp();

  const [care, setCare] = useState<CareDetails>(EMPTY_CARE);
  const [isEditing, setIsEditing] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && activeDog) {
      const saved = localStorage.getItem(STORAGE_KEY(activeDog.id));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCare({ ...EMPTY_CARE, ...parsed });
          setIsEditing(false);
        } catch {
          setCare(EMPTY_CARE);
          setIsEditing(true);
        }
      } else {
        setCare({
          ...EMPTY_CARE,
          emergencyContactName: settings.emergencyContactName || settings.ownerName || '',
          emergencyContactPhone: settings.emergencyContactPhone || settings.ownerPhone || '',
        });
        setIsEditing(true);
      }
      setIsSaved(false);
      setShareStatus(null);
      setShowPreview(false);
    }
  }, [isOpen, activeDog?.id]);

  if (!isOpen || !activeDog) return null;

  const update = (field: keyof CareDetails, value: string) =>
    setCare(prev => ({ ...prev, [field]: value }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY(activeDog.id), JSON.stringify(care));
    setIsSaved(true);
    setIsEditing(false);
    setShowPreview(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const buildHTML = () =>
    buildPrintHTML(
      activeDog.name,
      activeDog.breed,
      activeDog.photoUrl,
      care,
      settings.ownerName,
      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    );

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      setShareStatus('Popup blocked. Please allow popups for this site to download the PDF.');
      return;
    }
    printWindow.document.write(buildHTML());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  const handleShare = async () => {
    const html = buildHTML();
    if (navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], `${activeDog.name}-CareGuide.html`, { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${activeDog.name}'s Care Guide`,
            text: `Temporary care instructions for ${activeDog.name}. Open the attached file in any browser to view.`,
            files: [file],
          });
          setShareStatus('Shared successfully!');
          setTimeout(() => setShareStatus(null), 2500);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Share API error:', err);
      }
    }
    // Fallback: download HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDog.name}-CareGuide.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareStatus('Saved as HTML — open in any browser to view, or use Print → Save as PDF.');
    setTimeout(() => setShareStatus(null), 5000);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY(activeDog.id));
    setCare({ ...EMPTY_CARE, emergencyContactName: settings.ownerName || '', emergencyContactPhone: settings.ownerPhone || '' });
    setIsEditing(true);
    setShowPreview(false);
  };

  const F = (
    id: string, label: string, key: keyof CareDetails,
    placeholder: string, multiline = false, required = false,
  ) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`care-${id}`}>
        {label}{required && <span style={{ color: 'var(--accent-crimson)' }}> *</span>}
      </label>
      {multiline ? (
        <textarea id={`care-${id}`} className="form-textarea" rows={3} placeholder={placeholder}
          value={care[key]} onChange={e => update(key, e.target.value)} />
      ) : (
        <input id={`care-${id}`} type="text" className="form-input" placeholder={placeholder}
          value={care[key]} onChange={e => update(key, e.target.value)} required={required} />
      )}
    </div>
  );

  const hasAnyData = Object.values(care).some(v => v.trim() !== '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '580px', width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(79,70,229,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Temporary Care Guide</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                PDF care guide for {activeDog.name}'s caretaker
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px' }}>

          {/* Dog banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(79,70,229,0.06))', border: '1px solid rgba(99,102,241,0.25)', marginBottom: '18px' }}>
            {activeDog.photoUrl ? (
              <img src={activeDog.photoUrl} alt={activeDog.name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.3)' }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🐾</div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{activeDog.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{activeDog.breed} · {activeDog.gender}</div>
            </div>
            {!isEditing && hasAnyData && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => setIsEditing(true)}>
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#818cf8', marginBottom: '10px' }}>🍖 Feeding</div>
              {F('food-type', 'Food Type', 'foodType', 'e.g., Royal Canin Medium Adult, homemade rice + chicken', false, true)}
              {F('food-qty', 'Quantity / Portion', 'foodQuantity', 'e.g., 1 cup (200 g) per meal')}
              {F('feed-sch', 'Feeding Schedule', 'feedingSchedule', 'e.g., 7 AM and 7 PM — fresh water always available', true)}

              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#818cf8', margin: '18px 0 10px' }}>💊 Medicines & Health</div>
              {F('medicines', 'Current Medicines', 'medicines', 'e.g., Metronidazole 400 mg — 1 tablet twice daily with food for 5 days', true)}
              {F('allergies', 'Allergies / Intolerances', 'allergies', 'e.g., Allergic to chicken — avoid all poultry')}

              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#818cf8', margin: '18px 0 10px' }}>🗓️ Daily Routine & Instructions</div>
              {F('routine', 'Daily Routine', 'dailyRoutine', 'e.g., Morning walk 6:30 AM · 20 min. Afternoon nap. Evening walk 6 PM.', true)}
              {F('special', 'Special Instructions', 'specialInstructions', 'e.g., Afraid of thunderstorms — use thunder shirt. No table scraps.', true)}

              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#818cf8', margin: '18px 0 10px' }}>📞 Emergency Contacts</div>
              {F('emg-name', 'Emergency Contact Name', 'emergencyContactName', 'e.g., Nikhil (Owner)', false, true)}
              {F('emg-phone', 'Emergency Contact Phone', 'emergencyContactPhone', 'e.g., +91 98765 43210', false, true)}
              {F('vet-name', 'Veterinarian Name', 'vetName', 'e.g., Dr. Priya Sharma')}
              {F('vet-phone', 'Vet Phone', 'vetPhone', 'e.g., +91 80 4567 8901')}
              {F('clinic', 'Clinic Name', 'clinicName', 'e.g., Cessna Lifeline Veterinary Hospital, Marathahalli')}

              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSaved ? <><Check size={16} /> Saved!</> : <><FileText size={16} /> Save &amp; Preview Care Guide</>}
              </button>
            </form>
          ) : (
            <div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Check size={15} /> Care details saved — ready to generate PDF
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Tap <strong>Download PDF</strong> to save a printable guide, or <strong>Share</strong> to send it via WhatsApp, email, or other apps.
                </div>
              </div>

              <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setShowPreview(v => !v)}>
                {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>

              {showPreview && (
                <div style={{ marginBottom: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <iframe ref={previewRef} title="Care Guide Preview" srcDoc={buildHTML()} style={{ width: '100%', height: '520px', border: 'none', background: '#fff' }} sandbox="allow-same-origin" />
                </div>
              )}
            </div>
          )}

          {shareStatus && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', fontSize: '0.82rem', color: '#818cf8', marginTop: '12px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              {shareStatus}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {!isEditing && hasAnyData && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" style={{ flex: 2, minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleDownloadPDF}>
              <Download size={16} /> Download PDF
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)', flexShrink: 0 }} onClick={handleClear} title="Clear and start over">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
