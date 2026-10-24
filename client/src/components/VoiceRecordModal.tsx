import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/context';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Syringe,
  Bug,
  Pill,
  Receipt,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { VaccineRecord, DewormingRecord, TickFleaRecord, MedicationCourse, ExpenseRecord } from '../types';
import { formatDate, addMonths, addWeeks, parseDate } from '../engine/scheduleEngine';
import rulesData from '../data/vaccineRules.json';

interface VoiceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RecordCategory = 'vaccine' | 'deworming' | 'tick_flea' | 'medication' | 'expense';

interface ParsedResult {
  category: RecordCategory;
  dogId: string;
  dogName: string;
  confidence: number;
  // Vaccine fields
  vaccineKey?: string;
  vaccineName?: string;
  doseNumber?: number;
  batchNumber?: string;
  clinicName?: string;
  vetName?: string;
  adminDate?: string;
  nextDueDate?: string;
  // Deworming fields
  dewormingMed?: string;
  weightKg?: number;
  // Tick flea fields
  tickBrand?: string;
  // Medication fields
  medName?: string;
  dosage?: string;
  frequency?: 'once_daily' | 'twice_daily' | 'thrice_daily' | 'custom';
  totalDays?: number;
  isAntibiotic?: boolean;
  // Expense fields
  expenseCategory?: 'vaccine' | 'medication' | 'consultation' | 'grooming' | 'food' | 'emergency' | 'insurance';
  amount?: number;
  notes?: string;
}

export const VoiceRecordModal: React.FC<VoiceRecordModalProps> = ({ isOpen, onClose }) => {
  const {
    dogs,
    activeDog,
    effectiveDate,
    addVaccineRecord,
    addDewormingRecord,
    addTickFleaRecord,
    addMedication,
    addExpense,
  } = useApp();
  const { t } = useI18n();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [parsedData, setParsedData] = useState<ParsedResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const fallbackLangRef = useRef<'en-IN' | string>('en-IN');
  const isRetryingRef = useRef(false);

  // Audio Recording Fallback State (when browser cloud speech services are offline or blocked)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechCloudUnavailable, setSpeechCloudUnavailable] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check speech recognition capability on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechCloudUnavailable(true);
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const stopLocalAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }
    setIsRecordingAudio(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Cleanup recognition on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopLocalAudioRecording();
      setErrorMessage(null);
    }
  }, [isOpen]);

  const startLocalAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        setIsRecordingAudio(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      setErrorMessage(null);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission check or recording failed:', err);
      setIsRecordingAudio(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar or type below.');
      } else {
        setErrorMessage('Microphone is unavailable. Please type your entry or choose a sample command below.');
      }
    }
  };

  const startListeningSession = async (useFallbackLang = false) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechCloudUnavailable(true);
      startLocalAudioRecording();
      return;
    }

    // 1. Proactively verify/request microphone hardware permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release tracks immediately so speech recognition has exclusive device access
        stream.getTracks().forEach(track => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission check failed:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar or type below.');
          setIsListening(false);
          return;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No microphone detected. Please connect a microphone or use text entry below.');
          setIsListening(false);
          return;
        }
      }
    }

    // 2. Teardown existing instance before creating a new one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      // Single-shot phrase recognition avoids socket timeout/disconnect network errors in Chrome
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langToUse = useFallbackLang
        ? (navigator.language || 'en-US')
        : (fallbackLangRef.current || 'en-IN');
      recognition.lang = langToUse;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = currentTranscript.trim();
        if (cleaned) {
          setTranscript(cleaned);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error, event);
        setIsListening(false);

        if (event.error === 'network') {
          // If en-IN failed with network and we haven't tried fallback yet, retry with browser locale
          if (!useFallbackLang && !isRetryingRef.current) {
            isRetryingRef.current = true;
            fallbackLangRef.current = navigator.language || 'en-US';
            console.log('Retrying speech recognition with locale fallback:', fallbackLangRef.current);
            setTimeout(() => {
              isRetryingRef.current = false;
              startListeningSession(true);
            }, 250);
            return;
          }

          // If network error persists in this browser/environment:
          // Smoothly activate local audio voice recording without showing a repetitive blocking error!
          setSpeechCloudUnavailable(true);
          console.log('Browser speech services unreachable; smoothly activating local audio voice recording.');
          startLocalAudioRecording();
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar or type below.');
        } else if (event.error === 'no-speech') {
          setSpeechCloudUnavailable(true);
          startLocalAudioRecording();
        } else if (event.error === 'audio-capture') {
          setErrorMessage('No microphone was found or microphone is busy in another app.');
        } else if (event.error !== 'aborted') {
          setSpeechCloudUnavailable(true);
          startLocalAudioRecording();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not start SpeechRecognition, falling back to local recording:', err);
      setIsListening(false);
      setSpeechCloudUnavailable(true);
      startLocalAudioRecording();
    }
  };

  // Parse transcript whenever it changes significantly
  useEffect(() => {
    if (!transcript.trim()) {
      setParsedData(null);
      return;
    }
    const result = parseVoiceTranscript(transcript, dogs, activeDog, effectiveDate);
    setParsedData(result);
  }, [transcript, dogs, activeDog, effectiveDate]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (isListening || isRecordingAudio) {
      stopListening();
      stopLocalAudioRecording();
      return;
    }

    setErrorMessage(null);
    setIsSaved(false);

    if (speechCloudUnavailable) {
      startLocalAudioRecording();
      return;
    }

    fallbackLangRef.current = 'en-IN';
    startListeningSession(false);
  };

  const applyPreset = (presetText: string) => {
    stopListening();
    stopLocalAudioRecording();
    setTranscript(presetText);
    setIsSaved(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!parsedData) return;

    try {
      const targetDogId = parsedData.dogId || activeDog?.id || (dogs[0]?.id ?? '');

      if (parsedData.category === 'vaccine') {
        const vKey = parsedData.vaccineKey || 'dhppil';
        const rule = rulesData.vaccines.find(v => v.key === vKey);
        const adminD = parsedData.adminDate ? parseDate(parsedData.adminDate) : parseDate(effectiveDate);
        const dose = parsedData.doseNumber || 1;
        const totalDoses = rule ? rule.doses.length : 3;

        const nextDue =
          parsedData.nextDueDate ||
          (dose < totalDoses
            ? formatDate(addWeeks(adminD, 3))
            : formatDate(addMonths(adminD, 12)));

        const record: VaccineRecord = {
          id: `vrec_${Date.now()}`,
          dogId: targetDogId,
          vaccineKey: vKey,
          vaccineName: parsedData.vaccineName || rule?.name || 'Anti-Rabies',
          doseNumber: dose,
          totalDoses,
          dateAdministered: parsedData.adminDate || effectiveDate,
          nextDueDate: nextDue,
          batchNumber: parsedData.batchNumber,
          clinicName: parsedData.clinicName,
          vetName: parsedData.vetName,
          verifiedStatus: 'unverified',
          createdAt: new Date().toISOString(),
          notes: `Added via Voice Entry: "${transcript}"`,
        };
        await addVaccineRecord(record);
      } else if (parsedData.category === 'deworming') {
        const adminD = parsedData.adminDate ? parseDate(parsedData.adminDate) : parseDate(effectiveDate);
        const nextDue = parsedData.nextDueDate || formatDate(addMonths(adminD, 3));

        const record: DewormingRecord = {
          id: `drec_${Date.now()}`,
          dogId: targetDogId,
          medicationName: parsedData.dewormingMed || 'Drontal Plus',
          dateAdministered: parsedData.adminDate || effectiveDate,
          nextDueDate: nextDue,
          weightAtTimeKg: parsedData.weightKg || activeDog?.weightKg,
          createdAt: new Date().toISOString(),
          notes: `Added via Voice Entry: "${transcript}"`,
        };
        await addDewormingRecord(record);
      } else if (parsedData.category === 'tick_flea') {
        const adminD = parsedData.adminDate ? parseDate(parsedData.adminDate) : parseDate(effectiveDate);
        const intervalDays = (parsedData.tickBrand || '').toLowerCase().includes('bravecto') ? 90 : 30;
        const nextDue = parsedData.nextDueDate || formatDate(addWeeks(adminD, Math.floor(intervalDays / 7)));

        const record: TickFleaRecord = {
          id: `tfrec_${Date.now()}`,
          dogId: targetDogId,
          brandName: parsedData.tickBrand || 'Simparica Chewable',
          treatmentType: 'oral_chew',
          dateAdministered: parsedData.adminDate || effectiveDate,
          nextDueDate: nextDue,
          createdAt: new Date().toISOString(),
        };
        await addTickFleaRecord(record);
      } else if (parsedData.category === 'medication') {
        const startD = parsedData.adminDate || effectiveDate;
        const days = parsedData.totalDays || 5;
        const endD = formatDate(addWeeks(parseDate(startD), Math.ceil(days / 7)));

        const record: MedicationCourse = {
          id: `med_${Date.now()}`,
          dogId: targetDogId,
          medicationName: parsedData.medName || 'Prescribed Medication',
          dosage: parsedData.dosage || '1 tablet',
          frequency: parsedData.frequency || 'twice_daily',
          startDate: startD,
          endDate: endD,
          totalDoses: days * 2,
          dosesTaken: 1,
          isAntibiotic: Boolean(parsedData.isAntibiotic),
          notes: `Voice Entry: ${transcript}`,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        await addMedication(record);
      } else if (parsedData.category === 'expense') {
        const record: ExpenseRecord = {
          id: `exp_${Date.now()}`,
          dogId: targetDogId,
          category: parsedData.expenseCategory || 'consultation',
          amountInr: parsedData.amount || 1000,
          date: parsedData.adminDate || effectiveDate,
          clinicOrMerchant: parsedData.clinicName || 'Veterinary Clinic',
          notes: parsedData.notes || `Voice record: ${transcript}`,
          insuranceClaimStatus: 'not_claimed',
          createdAt: new Date().toISOString(),
        };
        await addExpense(record);
      }

      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
        setTranscript('');
        setParsedData(null);
        setRecordedAudioUrl(null);
      }, 1200);
    } catch (err: any) {
      console.error('Error saving voice record:', err);
      setErrorMessage('Failed to save record: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleReset = () => {
    setTranscript('');
    setParsedData(null);
    setIsSaved(false);
    setErrorMessage(null);
    setRecordedAudioUrl(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '560px',
          width: '92%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(219, 39, 119, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ec4899',
              }}
            >
              <Mic size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Add by Voice</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Speak naturally in English or Hindi-English to log records
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
          {/* Microphone Listening Stage */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              borderRadius: 'var(--radius-lg)',
              background: (isListening || isRecordingAudio)
                ? 'radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, rgba(20, 20, 28, 0.8) 70%)'
                : 'var(--bg-surface-elevated)',
              border: (isListening || isRecordingAudio) ? '1.5px solid #ec4899' : '1px solid var(--border-subtle)',
              marginBottom: '18px',
              transition: 'all 0.25s ease',
            }}
          >
            <button
              type="button"
              id="voice-mic-toggle-btn"
              onClick={toggleListening}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: (isListening || isRecordingAudio)
                  ? 'linear-gradient(135deg, #ec4899, #be185d)'
                  : 'linear-gradient(135deg, var(--color-primary), #4f46e5)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: (isListening || isRecordingAudio)
                  ? '0 0 25px rgba(236, 72, 153, 0.65)'
                  : '0 4px 14px rgba(0, 0, 0, 0.3)',
                animation: (isListening || isRecordingAudio) ? 'pulse 1.4s infinite' : 'none',
                transition: 'all 0.2s ease',
              }}
              title={(isListening || isRecordingAudio) ? 'Click to stop recording' : 'Click to start voice input'}
            >
              {(isListening || isRecordingAudio) ? <Mic size={32} /> : <MicOff size={30} />}
            </button>

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: (isListening || isRecordingAudio) ? '#ec4899' : 'var(--text-main)' }}>
                {isListening
                  ? 'Listening (Live Speech)... Speak now'
                  : isRecordingAudio
                  ? `Recording Voice Memo (${formatSeconds(recordingSeconds)})... Tap to Finish`
                  : 'Tap Microphone to Speak'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {(isListening || isRecordingAudio)
                  ? 'e.g., "Bruno received Rabies booster today, batch R-402, Dr. Sharma"'
                  : speechCloudUnavailable
                  ? 'Local microphone voice recording active (tap to record voice memo)'
                  : 'Supports vaccines, deworming, medications, tick prevention, and vet expenses'}
              </div>
            </div>
          </div>

          {/* Recorded Audio Memo Playback */}
          {recordedAudioUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(236, 72, 153, 0.12)',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={16} /> Voice Memo:
              </div>
              <audio src={recordedAudioUrl} controls style={{ height: '32px', flex: 1 }} />
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setRecordedAudioUrl(null)}
                title="Discard audio recording"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.82rem',
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transcription / Text Input Area */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Spoken Transcript or Text Entry:
              </label>
              {transcript && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={handleReset}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>
            <textarea
              id="voice-transcript-input"
              value={transcript}
              onChange={e => {
                setTranscript(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g., Bruno got his Anti-Rabies vaccination today batch R9012 at Cessna Lifeline Dr. Rao"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                resize: 'none',
              }}
            />
          </div>

          {/* Quick Voice Demo Presets */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              💡 Quick Voice Samples (Tap to Test Recognition):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() =>
                  applyPreset(
                    `${activeDog?.name || 'Bruno'} received Anti-Rabies vaccination today, batch code R9012, at Cessna Lifeline Dr. Rao`
                  )
                }
              >
                <Syringe size={13} style={{ color: 'var(--accent-teal)' }} />
                <span>"Vaccination: Anti-Rabies today, batch R9012, Cessna Lifeline"</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() =>
                  applyPreset(
                    `Gave ${activeDog?.name || 'Bruno'} Simparica chewable for tick and flea today next due in 30 days`
                  )
                }
              >
                <Bug size={13} style={{ color: 'var(--accent-amber)' }} />
                <span>"Tick & Flea: Simparica chewable given today"</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() =>
                  applyPreset(
                    `Drontal Plus deworming tablet given to ${activeDog?.name || 'Bruno'} today, weight 28kg`
                  )
                }
              >
                <Pill size={13} style={{ color: '#a855f7' }} />
                <span>"Deworming: Drontal Plus given today, weight 28kg"</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() =>
                  applyPreset(
                    `Started Amoxicillin 250mg twice daily for 5 days for minor skin infection`
                  )
                }
              >
                <Pill size={13} style={{ color: '#ef4444' }} />
                <span>"Medication: Amoxicillin 250mg twice daily for 5 days"</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() =>
                  applyPreset(
                    `Paid 1500 rupees consultation and ear cleaning fee at Cessna Lifeline`
                  )
                }
              >
                <Receipt size={13} style={{ color: 'var(--accent-teal)' }} />
                <span>"Expense: Paid 1500 rupees consultation at Cessna Lifeline"</span>
              </button>
            </div>
          </div>

          {/* Structured Parsed Review Preview */}
          {parsedData && (
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--accent-teal)',
                padding: '16px',
                animation: 'fadeIn 0.25s ease-out',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-teal)' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-teal)' }}>
                    Parsed Record ({parsedData.category.toUpperCase().replace('_', ' ')})
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--accent-teal)',
                    fontWeight: 700,
                  }}
                >
                  {parsedData.confidence}% Confidence
                </span>
              </div>

              {/* Editable Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Pet Name</label>
                  <select
                    value={parsedData.dogId}
                    onChange={e => {
                      const selected = dogs.find(d => d.id === e.target.value);
                      setParsedData(prev => prev ? { ...prev, dogId: e.target.value, dogName: selected?.name || '' } : null);
                    }}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {dogs.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Date Administered</label>
                  <input
                    type="date"
                    value={parsedData.adminDate || effectiveDate}
                    onChange={e => setParsedData(prev => prev ? { ...prev, adminDate: e.target.value } : null)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>

                {parsedData.category === 'vaccine' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Vaccine</label>
                      <input
                        type="text"
                        value={parsedData.vaccineName || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, vaccineName: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Batch Number</label>
                      <input
                        type="text"
                        placeholder="e.g. R9012"
                        value={parsedData.batchNumber || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, batchNumber: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Clinic / Hospital</label>
                      <input
                        type="text"
                        placeholder="e.g. Cessna Lifeline"
                        value={parsedData.clinicName || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, clinicName: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Veterinarian</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Rao"
                        value={parsedData.vetName || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, vetName: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </>
                )}

                {parsedData.category === 'deworming' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Medication</label>
                      <input
                        type="text"
                        value={parsedData.dewormingMed || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, dewormingMed: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={parsedData.weightKg || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, weightKg: parseFloat(e.target.value) } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </>
                )}

                {parsedData.category === 'tick_flea' && (
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Brand / Product</label>
                    <input
                      type="text"
                      value={parsedData.tickBrand || ''}
                      onChange={e => setParsedData(prev => prev ? { ...prev, tickBrand: e.target.value } : null)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                    />
                  </div>
                )}

                {parsedData.category === 'medication' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Medicine Name</label>
                      <input
                        type="text"
                        value={parsedData.medName || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, medName: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Dosage & Frequency</label>
                      <input
                        type="text"
                        value={`${parsedData.dosage || ''} ${parsedData.frequency || ''}`.trim()}
                        onChange={e => setParsedData(prev => prev ? { ...prev, dosage: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </>
                )}

                {parsedData.category === 'expense' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Amount (₹)</label>
                      <input
                        type="number"
                        value={parsedData.amount || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, amount: parseFloat(e.target.value) } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Clinic / Vendor</label>
                      <input
                        type="text"
                        value={parsedData.clinicName || ''}
                        onChange={e => setParsedData(prev => prev ? { ...prev, clinicName: e.target.value } : null)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Success Notification */}
          {isSaved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid var(--accent-teal)',
                color: 'var(--accent-teal)',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Record saved successfully to PawLedger!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              id="voice-save-record-btn"
              className="btn btn-primary"
              style={{
                flex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: parsedData ? 'linear-gradient(135deg, #ec4899, #be185d)' : undefined,
                border: parsedData ? 'none' : undefined,
              }}
              disabled={!parsedData || isSaved}
              onClick={handleSave}
            >
              <CheckCircle2 size={16} />
              <span>{isSaved ? 'Saved!' : 'Save Voice Record'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Intelligent Natural Language Parser for Voice Input
function parseVoiceTranscript(
  text: string,
  dogs: any[],
  activeDog: any,
  effectiveDate: string
): ParsedResult {
  const clean = text.toLowerCase();

  // 1. Identify Target Dog
  let targetDog = activeDog || dogs[0];
  for (const d of dogs) {
    if (clean.includes(d.name.toLowerCase())) {
      targetDog = d;
      break;
    }
  }

  // 2. Identify Category
  let category: RecordCategory = 'vaccine';
  if (
    clean.includes('deworm') ||
    clean.includes('worm') ||
    clean.includes('kiwof') ||
    clean.includes('drontal')
  ) {
    category = 'deworming';
  } else if (
    clean.includes('simparica') ||
    clean.includes('bravecto') ||
    clean.includes('nexgard') ||
    clean.includes('tick') ||
    clean.includes('flea')
  ) {
    category = 'tick_flea';
  } else if (
    clean.includes('amoxicillin') ||
    clean.includes('antibiotic') ||
    clean.includes('tablet') ||
    clean.includes('capsule') ||
    clean.includes('syrup') ||
    clean.includes('mg') ||
    clean.includes('twice daily') ||
    clean.includes('once daily')
  ) {
    category = 'medication';
  } else if (
    clean.includes('rupees') ||
    clean.includes('rs') ||
    clean.includes('inr') ||
    clean.includes('spent') ||
    clean.includes('cost') ||
    clean.includes('bill') ||
    clean.includes('fee') ||
    clean.includes('paid')
  ) {
    category = 'expense';
  }

  // 3. Extract Date
  let adminDate = effectiveDate;
  if (clean.includes('yesterday')) {
    const d = parseDate(effectiveDate);
    d.setDate(d.getDate() - 1);
    adminDate = formatDate(d);
  }

  // 4. Category-specific extraction
  const result: ParsedResult = {
    category,
    dogId: targetDog?.id || '',
    dogName: targetDog?.name || 'Bruno',
    confidence: 90,
    adminDate,
  };

  // Extract Batch Number
  const batchMatch = text.match(/(?:batch|lot)\s*(?:code|no|number|#)?\s*[:\-]?\s*([a-zA-Z0-9\-]+)/i);
  if (batchMatch) {
    result.batchNumber = batchMatch[1].trim();
  }

  // Extract Clinic
  if (clean.includes('cessna')) {
    result.clinicName = 'Cessna Lifeline Veterinary Hospital';
  } else if (clean.includes('cupa')) {
    result.clinicName = 'CUPA Small Animal Hospital';
  } else if (clean.includes('sanjeevani')) {
    result.clinicName = 'Sanjeevani Veterinary Clinic';
  } else if (clean.includes('care')) {
    result.clinicName = 'CARE Veterinary Hospital';
  }

  // Extract Doctor/Vet Name
  const vetMatch = text.match(/(?:dr\.?|doctor)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (vetMatch) {
    result.vetName = `Dr. ${vetMatch[1].trim()}`;
  }

  if (category === 'vaccine') {
    if (clean.includes('rabies') || clean.includes('anti-rabies') || clean.includes('arv')) {
      result.vaccineKey = 'rabies';
      result.vaccineName = 'Anti-Rabies';
    } else if (clean.includes('dhppil') || clean.includes('9 in 1') || clean.includes('7 in 1') || clean.includes('puppy shot')) {
      result.vaccineKey = 'dhppil';
      result.vaccineName = 'DHPPiL (Core)';
    } else if (clean.includes('kennel') || clean.includes('cough') || clean.includes('bordetella')) {
      result.vaccineKey = 'kennel_cough';
      result.vaccineName = 'Kennel Cough (KC)';
    } else if (clean.includes('corona')) {
      result.vaccineKey = 'corona';
      result.vaccineName = 'Canine Coronavirus';
    } else {
      result.vaccineKey = 'custom';
      result.vaccineName = 'Routine Vaccine';
    }
  } else if (category === 'deworming') {
    if (clean.includes('kiwof')) {
      result.dewormingMed = 'Kiwof Plus';
    } else if (clean.includes('drontal')) {
      result.dewormingMed = 'Drontal Plus';
    } else {
      result.dewormingMed = 'Drontal Plus';
    }

    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kgs)/i);
    if (weightMatch) {
      result.weightKg = parseFloat(weightMatch[1]);
    } else if (targetDog?.weightKg) {
      result.weightKg = targetDog.weightKg;
    }
  } else if (category === 'tick_flea') {
    if (clean.includes('bravecto')) {
      result.tickBrand = 'Bravecto Chewable (90-day)';
    } else if (clean.includes('nexgard')) {
      result.tickBrand = 'NexGard Spectra';
    } else {
      result.tickBrand = 'Simparica Chewable (30-day)';
    }
  } else if (category === 'medication') {
    if (clean.includes('amoxicillin')) {
      result.medName = 'Amoxicillin';
      result.isAntibiotic = true;
    } else if (clean.includes('cefpodoxime')) {
      result.medName = 'Cefpodoxime';
      result.isAntibiotic = true;
    } else if (clean.includes('metronidazole')) {
      result.medName = 'Metronidazole';
      result.isAntibiotic = true;
    } else {
      result.medName = 'Prescribed Medication';
    }

    const doseMatch = text.match(/(\d+\s*(?:mg|ml|tablets?|capsules?))/i);
    if (doseMatch) result.dosage = doseMatch[1];
    else result.dosage = '1 tablet';

    if (clean.includes('twice')) result.frequency = 'twice_daily';
    else if (clean.includes('thrice')) result.frequency = 'thrice_daily';
    else result.frequency = 'once_daily';

    const daysMatch = text.match(/(\d+)\s*days/i);
    result.totalDays = daysMatch ? parseInt(daysMatch[1], 10) : 5;
  } else if (category === 'expense') {
    const amtMatch = text.match(/(?:rs\.?|inr|rupees|₹|\bcost\b|\bspent\b|\bpaid\b)\s*[:\-]?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
      text.match(/(\d+)\s*(?:rupees|rs|inr)/i);
    if (amtMatch) {
      result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    } else {
      result.amount = 1200;
    }

    if (clean.includes('consultation') || clean.includes('checkup') || clean.includes('fee')) {
      result.expenseCategory = 'consultation';
    } else if (clean.includes('medicine') || clean.includes('pharmacy') || clean.includes('drug')) {
      result.expenseCategory = 'medication';
    } else if (clean.includes('grooming')) {
      result.expenseCategory = 'grooming';
    } else if (clean.includes('food')) {
      result.expenseCategory = 'food';
    } else {
      result.expenseCategory = 'consultation';
    }
  }

  return result;
}
