import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import {
  Dog,
  VaccineRecord,
  DewormingRecord,
  TickFleaRecord,
  UserSettings,
  ScheduleItem,
  MedicationCourse,
  ExpenseRecord,
  WeightRecord,
  EmergencyClinic
} from '../types';
import * as storage from '../storage/db';
import bengaluruClinicsSeed from '../data/bengaluruClinics.json';
import {
  formatDate,
  generateVaccineSchedule,
  getNextDewormingDate,
  getNextTickFleaDate,
  diffInDays,
  parseDate
} from '../engine/scheduleEngine';

export interface DueItemAcrossDogs {
  dogId: string;
  dogName: string;
  dogPhoto?: string;
  itemType: 'vaccine' | 'deworming' | 'tick_flea' | 'medication';
  title: string;
  dueDate: string;
  status: 'overdue' | 'due_soon' | 'valid';
  daysDifference: number; // negative = overdue, positive = due in future
  urgency: 'high' | 'medium' | 'low';
}

export interface TrendFlag {
  type: 'weight_change' | 'general';
  severity: 'info' | 'warning';
  title: string;
  description: string;
  percentageChange?: number;
}

interface AppContextType {
  dogs: Dog[];
  activeDog: Dog | null;
  setActiveDogId: (id: string) => void;
  vaccineRecords: VaccineRecord[];
  dewormingRecords: DewormingRecord[];
  tickFleaRecords: TickFleaRecord[];
  medications: MedicationCourse[];
  expenses: ExpenseRecord[];
  weightRecords: WeightRecord[];
  allClinics: EmergencyClinic[];
  settings: UserSettings;
  effectiveDate: string; // Current or simulated date
  activeDogSchedule: ScheduleItem[];
  activeDogNextDeworming: { nextDueDate: string; status: any; recommendation: string } | null;
  activeDogNextTickFlea: { nextDueDate: string; status: any; recommendation: string } | null;
  urgentOverdueItems: DueItemAcrossDogs[];
  dueThisMonthItems: DueItemAcrossDogs[];
  activeDogTrends: TrendFlag[];
  activeAntibioticAlerts: MedicationCourse[];
  isLoading: boolean;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  // Actions
  addDog: (dog: Dog) => Promise<void>;
  updateDog: (dog: Dog) => Promise<void>;
  deleteDog: (id: string) => Promise<void>;
  addVaccineRecord: (record: VaccineRecord) => Promise<void>;
  deleteVaccineRecord: (id: string) => Promise<void>;
  addDewormingRecord: (record: DewormingRecord) => Promise<void>;
  deleteDewormingRecord: (id: string) => Promise<void>;
  addTickFleaRecord: (record: TickFleaRecord) => Promise<void>;
  deleteTickFleaRecord: (id: string) => Promise<void>;
  addMedication: (record: MedicationCourse) => Promise<void>;
  updateMedicationDose: (id: string, dosesTaken: number) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  addExpense: (record: ExpenseRecord) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addWeightRecord: (record: WeightRecord) => Promise<void>;
  deleteWeightRecord: (id: string) => Promise<void>;
  addCustomClinic: (clinic: EmergencyClinic) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  setSimulatedDate: (dateStr: string | null) => Promise<void>;
  seedDemo: () => Promise<void>;
  reloadAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeDogId, setActiveDogIdState] = useState<string | null>(null);
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
  const [dewormingRecords, setDewormingRecords] = useState<DewormingRecord[]>([]);
  const [tickFleaRecords, setTickFleaRecords] = useState<TickFleaRecord[]>([]);
  const [medications, setMedications] = useState<MedicationCourse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [customClinics, setCustomClinics] = useState<EmergencyClinic[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    language: 'en',
    theme: 'dark',
    city: 'Bengaluru',
    ownerName: 'Pet Parent',
    ownerPhone: '',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    enableInAppReminders: true,
    enableWhatsAppReminders: false,
    simulatedDate: null,
    societyConsentEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Load initial data
  const reloadAll = async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await storage.getSettings();
      setSettings(loadedSettings);

      const loadedDogs = await storage.getAllDogs();
      setDogs(loadedDogs);

      if (loadedDogs.length === 0) {
        setIsOnboardingOpen(true);
      } else {
        if (!activeDogId || !loadedDogs.some(d => d.id === activeDogId)) {
          setActiveDogIdState(loadedDogs[0].id);
        }
      }

      const vRecs = await storage.getVaccineRecords();
      setVaccineRecords(vRecs);

      const dRecs = await storage.getDewormingRecords();
      setDewormingRecords(dRecs);

      const tRecs = await storage.getTickFleaRecords();
      setTickFleaRecords(tRecs);

      const meds = await storage.getMedications();
      setMedications(meds);

      const exps = await storage.getExpenses();
      setExpenses(exps);

      const wts = await storage.getWeightRecords();
      setWeightRecords(wts);

      const clinics = await storage.getCustomClinics();
      setCustomClinics(clinics);
    } catch (err) {
      console.error('Failed to load local database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const activeDog = useMemo(() => {
    return dogs.find(d => d.id === activeDogId) || dogs[0] || null;
  }, [dogs, activeDogId]);

  const effectiveDate = useMemo(() => {
    return settings.simulatedDate || formatDate(new Date());
  }, [settings.simulatedDate]);

  // Dynamic schedules for active dog
  const activeDogSchedule = useMemo(() => {
    if (!activeDog) return [];
    return generateVaccineSchedule(activeDog, vaccineRecords, effectiveDate);
  }, [activeDog, vaccineRecords, effectiveDate]);

  const activeDogNextDeworming = useMemo(() => {
    if (!activeDog) return null;
    return getNextDewormingDate(activeDog, dewormingRecords, effectiveDate);
  }, [activeDog, dewormingRecords, effectiveDate]);

  const activeDogNextTickFlea = useMemo(() => {
    if (!activeDog) return null;
    return getNextTickFleaDate(activeDog, tickFleaRecords, effectiveDate);
  }, [activeDog, tickFleaRecords, effectiveDate]);

  // Aggregate items across all dogs (Multi-pet feature 18 & Dashboard)
  const { urgentOverdueItems, dueThisMonthItems } = useMemo(() => {
    const overdueList: DueItemAcrossDogs[] = [];
    const dueThisMonthList: DueItemAcrossDogs[] = [];
    const curDate = parseDate(effectiveDate);

    for (const d of dogs) {
      // 1. Vaccines
      const sched = generateVaccineSchedule(d, vaccineRecords, effectiveDate);
      for (const item of sched) {
        const itemDate = parseDate(item.dueDate);
        const daysDiff = diffInDays(itemDate, curDate);

        const dueItem: DueItemAcrossDogs = {
          dogId: d.id,
          dogName: d.name,
          dogPhoto: d.photoUrl,
          itemType: 'vaccine',
          title: item.vaccineName,
          dueDate: item.dueDate,
          status: daysDiff < 0 ? 'overdue' : daysDiff <= 14 ? 'due_soon' : 'valid',
          daysDifference: daysDiff,
          urgency: item.isCore ? 'high' : 'medium',
        };

        if (daysDiff < 0) {
          overdueList.push(dueItem);
        } else if (daysDiff <= 31) {
          dueThisMonthList.push(dueItem);
        }
      }

      // 2. Deworming
      const deworm = getNextDewormingDate(d, dewormingRecords, effectiveDate);
      const dewormDate = parseDate(deworm.nextDueDate);
      const dewormDiff = diffInDays(dewormDate, curDate);
      const dewormItem: DueItemAcrossDogs = {
        dogId: d.id,
        dogName: d.name,
        dogPhoto: d.photoUrl,
        itemType: 'deworming',
        title: 'Routine Deworming',
        dueDate: deworm.nextDueDate,
        status: dewormDiff < 0 ? 'overdue' : dewormDiff <= 7 ? 'due_soon' : 'valid',
        daysDifference: dewormDiff,
        urgency: 'medium',
      };
      if (dewormDiff < 0) {
        overdueList.push(dewormItem);
      } else if (dewormDiff <= 31) {
        dueThisMonthList.push(dewormItem);
      }

      // 3. Tick & Flea
      const tf = getNextTickFleaDate(d, tickFleaRecords, effectiveDate);
      const tfDate = parseDate(tf.nextDueDate);
      const tfDiff = diffInDays(tfDate, curDate);
      const tfItem: DueItemAcrossDogs = {
        dogId: d.id,
        dogName: d.name,
        dogPhoto: d.photoUrl,
        itemType: 'tick_flea',
        title: 'Tick & Flea Prevention',
        dueDate: tf.nextDueDate,
        status: tfDiff < 0 ? 'overdue' : tfDiff <= 7 ? 'due_soon' : 'valid',
        daysDifference: tfDiff,
        urgency: 'medium',
      };
      if (tfDiff < 0) {
        overdueList.push(tfItem);
      } else if (tfDiff <= 31) {
        dueThisMonthList.push(tfItem);
      }
    }

    // Sort overdue by most days overdue (most negative first)
    overdueList.sort((a, b) => a.daysDifference - b.daysDifference);
    // Sort due soon by closest upcoming first
    dueThisMonthList.sort((a, b) => a.daysDifference - b.daysDifference);

    return { urgentOverdueItems: overdueList, dueThisMonthItems: dueThisMonthList };
  }, [dogs, vaccineRecords, dewormingRecords, tickFleaRecords, effectiveDate]);

  // All emergency clinics (seed + custom)
  const allClinics: EmergencyClinic[] = useMemo(() => {
    return [...(bengaluruClinicsSeed as EmergencyClinic[]), ...customClinics];
  }, [customClinics]);

  // Active antibiotic alert (Feature 10: "finish full course")
  const activeAntibioticAlerts = useMemo(() => {
    if (!activeDog) return [];
    return medications.filter(m => m.dogId === activeDog.id && m.status === 'active' && m.isAntibiotic);
  }, [activeDog, medications]);

  // Trend Flags: Weight change > 10% in last 30 days (Feature 8)
  const activeDogTrends: TrendFlag[] = useMemo(() => {
    if (!activeDog) return [];
    const flags: TrendFlag[] = [];
    const dogWeights = weightRecords
      .filter(w => w.dogId === activeDog.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dogWeights.length >= 2) {
      const latest = dogWeights[dogWeights.length - 1];
      const previous = dogWeights[dogWeights.length - 2];
      const daysBetween = diffInDays(parseDate(latest.date), parseDate(previous.date));

      if (daysBetween <= 45 && previous.weightKg > 0) {
        const pctChange = ((latest.weightKg - previous.weightKg) / previous.weightKg) * 100;
        const absPct = Math.abs(pctChange);

        if (absPct >= 10) {
          flags.push({
            type: 'weight_change',
            severity: absPct >= 15 ? 'warning' : 'info',
            title: pctChange > 0 ? 'Rapid Weight Gain Detected' : 'Notable Weight Loss Detected',
            percentageChange: Math.round(pctChange * 10) / 10,
            description: `${activeDog.name} has changed by ${Math.abs(Math.round(pctChange))}% in ${daysBetween} days (${previous.weightKg} kg → ${latest.weightKg} kg). Worth mentioning to your vet during your next appointment.`,
          });
        }
      }
    }

    return flags;
  }, [activeDog, weightRecords]);

  // Actions
  const addDog = async (dog: Dog) => {
    await storage.saveDog(dog);
    setDogs(prev => [...prev, dog]);
    setActiveDogIdState(dog.id);
  };

  const updateDog = async (dog: Dog) => {
    await storage.saveDog(dog);
    setDogs(prev => prev.map(d => (d.id === dog.id ? dog : d)));

    // Cloud sync if user is logged in
    const token = localStorage.getItem('pawledger_token');
    if (token) {
      try {
        await fetch('/api/auth/sync-dog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dog }),
        });
      } catch (err) {
        console.warn('Background cloud sync skipped:', err);
      }
    }
  };

  const deleteDog = async (id: string) => {
    await storage.deleteDog(id);
    setDogs(prev => prev.filter(d => d.id !== id));
    setVaccineRecords(prev => prev.filter(r => r.dogId !== id));
    setDewormingRecords(prev => prev.filter(r => r.dogId !== id));
    setTickFleaRecords(prev => prev.filter(r => r.dogId !== id));
    setMedications(prev => prev.filter(m => m.dogId !== id));
    setExpenses(prev => prev.filter(e => e.dogId !== id));
    setWeightRecords(prev => prev.filter(w => w.dogId !== id));
    if (activeDogId === id) {
      const remaining = dogs.filter(d => d.id !== id);
      setActiveDogIdState(remaining[0]?.id || null);
    }
  };

  const addVaccineRecord = async (record: VaccineRecord) => {
    await storage.saveVaccineRecord(record);
    setVaccineRecords(prev => [...prev.filter(r => r.id !== record.id), record]);
  };

  const deleteVaccineRecord = async (id: string) => {
    await storage.deleteVaccineRecord(id);
    setVaccineRecords(prev => prev.filter(r => r.id !== id));
  };

  const addDewormingRecord = async (record: DewormingRecord) => {
    await storage.saveDewormingRecord(record);
    setDewormingRecords(prev => [...prev.filter(r => r.id !== record.id), record]);
  };

  const deleteDewormingRecord = async (id: string) => {
    await storage.deleteDewormingRecord(id);
    setDewormingRecords(prev => prev.filter(r => r.id !== id));
  };

  const addTickFleaRecord = async (record: TickFleaRecord) => {
    await storage.saveTickFleaRecord(record);
    setTickFleaRecords(prev => [...prev.filter(r => r.id !== record.id), record]);
  };

  const deleteTickFleaRecord = async (id: string) => {
    await storage.deleteTickFleaRecord(id);
    setTickFleaRecords(prev => prev.filter(r => r.id !== id));
  };

  const addMedication = async (record: MedicationCourse) => {
    await storage.saveMedication(record);
    setMedications(prev => [...prev.filter(m => m.id !== record.id), record]);
  };

  const updateMedicationDose = async (id: string, dosesTaken: number) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    const isCompleted = dosesTaken >= med.totalDoses;
    const updated: MedicationCourse = {
      ...med,
      dosesTaken,
      status: isCompleted ? 'completed' : 'active',
    };
    await storage.saveMedication(updated);
    setMedications(prev => prev.map(m => (m.id === id ? updated : m)));
  };

  const deleteMedication = async (id: string) => {
    await storage.deleteMedication(id);
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  const addExpense = async (record: ExpenseRecord) => {
    await storage.saveExpense(record);
    setExpenses(prev => [...prev.filter(e => e.id !== record.id), record]);
  };

  const deleteExpense = async (id: string) => {
    await storage.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addWeightRecord = async (record: WeightRecord) => {
    await storage.saveWeightRecord(record);
    setWeightRecords(prev => [...prev.filter(w => w.id !== record.id), record]);
    if (activeDog && activeDog.id === record.dogId) {
      await updateDog({ ...activeDog, weightKg: record.weightKg, updatedAt: new Date().toISOString() });
    }
  };

  const deleteWeightRecord = async (id: string) => {
    await storage.deleteWeightRecord(id);
    setWeightRecords(prev => prev.filter(w => w.id !== id));
  };

  const addCustomClinic = async (clinic: EmergencyClinic) => {
    await storage.saveCustomClinic(clinic);
    setCustomClinics(prev => [...prev.filter(c => c.id !== clinic.id), clinic]);
  };

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    await storage.saveSettings(updated);
    setSettings(updated);
  };

  const setSimulatedDate = async (dateStr: string | null) => {
    await updateSettings({ simulatedDate: dateStr });
  };

  const seedDemo = async () => {
    await storage.seedDemoDataIfEmpty();
    await reloadAll();
  };

  return (
    <AppContext.Provider
      value={{
        dogs,
        activeDog,
        setActiveDogId: setActiveDogIdState,
        vaccineRecords,
        dewormingRecords,
        tickFleaRecords,
        medications,
        expenses,
        weightRecords,
        allClinics,
        settings,
        effectiveDate,
        activeDogSchedule,
        activeDogNextDeworming,
        activeDogNextTickFlea,
        urgentOverdueItems,
        dueThisMonthItems,
        activeDogTrends,
        activeAntibioticAlerts,
        isLoading,
        isOnboardingOpen,
        setIsOnboardingOpen,
        addDog,
        updateDog,
        deleteDog,
        addVaccineRecord,
        deleteVaccineRecord,
        addDewormingRecord,
        deleteDewormingRecord,
        addTickFleaRecord,
        deleteTickFleaRecord,
        addMedication,
        updateMedicationDose,
        deleteMedication,
        addExpense,
        deleteExpense,
        addWeightRecord,
        deleteWeightRecord,
        addCustomClinic,
        updateSettings,
        setSimulatedDate,
        seedDemo,
        reloadAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
