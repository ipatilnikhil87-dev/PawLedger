import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Dog,
  VaccineRecord,
  DewormingRecord,
  TickFleaRecord,
  UserSettings,
  MedicationCourse,
  ExpenseRecord,
  WeightRecord,
  EmergencyClinic
} from '../types';

interface PawLedgerDB extends DBSchema {
  dogs: {
    key: string;
    value: Dog;
  };
  vaccineRecords: {
    key: string;
    value: VaccineRecord;
    indexes: { 'by-dog': string };
  };
  dewormingRecords: {
    key: string;
    value: DewormingRecord;
    indexes: { 'by-dog': string };
  };
  tickFleaRecords: {
    key: string;
    value: TickFleaRecord;
    indexes: { 'by-dog': string };
  };
  medications: {
    key: string;
    value: MedicationCourse;
    indexes: { 'by-dog': string };
  };
  expenses: {
    key: string;
    value: ExpenseRecord;
    indexes: { 'by-dog': string };
  };
  weightRecords: {
    key: string;
    value: WeightRecord;
    indexes: { 'by-dog': string };
  };
  customClinics: {
    key: string;
    value: EmergencyClinic;
  };
  settings: {
    key: string;
    value: any;
  };
  auditLogs: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      action: string;
      details: string;
      dogId?: string;
    };
  };
}

const DB_NAME = 'pawledger_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PawLedgerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PawLedgerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PawLedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dogs')) {
          db.createObjectStore('dogs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('vaccineRecords')) {
          const store = db.createObjectStore('vaccineRecords', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('dewormingRecords')) {
          const store = db.createObjectStore('dewormingRecords', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('tickFleaRecords')) {
          const store = db.createObjectStore('tickFleaRecords', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('medications')) {
          const store = db.createObjectStore('medications', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const store = db.createObjectStore('expenses', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('weightRecords')) {
          const store = db.createObjectStore('weightRecords', { keyPath: 'id' });
          store.createIndex('by-dog', 'dogId');
        }

        if (!db.objectStoreNames.contains('customClinics')) {
          db.createObjectStore('customClinics', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('auditLogs')) {
          db.createObjectStore('auditLogs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ----------------- Dogs -----------------

export async function getAllDogs(): Promise<Dog[]> {
  const db = await getDB();
  return db.getAll('dogs');
}

export async function getDog(id: string): Promise<Dog | undefined> {
  const db = await getDB();
  return db.get('dogs', id);
}

export async function saveDog(dog: Dog): Promise<void> {
  const db = await getDB();
  await db.put('dogs', dog);
}

export async function deleteDog(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['dogs', 'vaccineRecords', 'dewormingRecords', 'tickFleaRecords'], 'readwrite');
  await tx.objectStore('dogs').delete(id);

  // Cascade delete records for this dog
  const vStore = tx.objectStore('vaccineRecords');
  const vIndex = vStore.index('by-dog');
  let vCursor = await vIndex.openCursor(id);
  while (vCursor) {
    await vCursor.delete();
    vCursor = await vCursor.continue();
  }

  const dStore = tx.objectStore('dewormingRecords');
  const dIndex = dStore.index('by-dog');
  let dCursor = await dIndex.openCursor(id);
  while (dCursor) {
    await dCursor.delete();
    dCursor = await dCursor.continue();
  }

  const tStore = tx.objectStore('tickFleaRecords');
  const tIndex = tStore.index('by-dog');
  let tCursor = await tIndex.openCursor(id);
  while (tCursor) {
    await tCursor.delete();
    tCursor = await tCursor.continue();
  }

  await tx.done;
}

// ----------------- Vaccine Records -----------------

export async function getVaccineRecords(dogId?: string): Promise<VaccineRecord[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('vaccineRecords', 'by-dog', dogId);
  }
  return db.getAll('vaccineRecords');
}

export async function saveVaccineRecord(record: VaccineRecord): Promise<void> {
  const db = await getDB();
  await db.put('vaccineRecords', record);
}

export async function deleteVaccineRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vaccineRecords', id);
}

// ----------------- Deworming Records -----------------

export async function getDewormingRecords(dogId?: string): Promise<DewormingRecord[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('dewormingRecords', 'by-dog', dogId);
  }
  return db.getAll('dewormingRecords');
}

export async function saveDewormingRecord(record: DewormingRecord): Promise<void> {
  const db = await getDB();
  await db.put('dewormingRecords', record);
}

export async function deleteDewormingRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('dewormingRecords', id);
}

// ----------------- Tick & Flea Records -----------------

export async function getTickFleaRecords(dogId?: string): Promise<TickFleaRecord[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('tickFleaRecords', 'by-dog', dogId);
  }
  return db.getAll('tickFleaRecords');
}

export async function saveTickFleaRecord(record: TickFleaRecord): Promise<void> {
  const db = await getDB();
  await db.put('tickFleaRecords', record);
}

export async function deleteTickFleaRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tickFleaRecords', id);
}

// ----------------- Medications -----------------

export async function getMedications(dogId?: string): Promise<MedicationCourse[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('medications', 'by-dog', dogId);
  }
  return db.getAll('medications');
}

export async function saveMedication(record: MedicationCourse): Promise<void> {
  const db = await getDB();
  await db.put('medications', record);
}

export async function deleteMedication(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('medications', id);
}

// ----------------- Expenses -----------------

export async function getExpenses(dogId?: string): Promise<ExpenseRecord[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('expenses', 'by-dog', dogId);
  }
  return db.getAll('expenses');
}

export async function saveExpense(record: ExpenseRecord): Promise<void> {
  const db = await getDB();
  await db.put('expenses', record);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}

// ----------------- Weight Records -----------------

export async function getWeightRecords(dogId?: string): Promise<WeightRecord[]> {
  const db = await getDB();
  if (dogId) {
    return db.getAllFromIndex('weightRecords', 'by-dog', dogId);
  }
  return db.getAll('weightRecords');
}

export async function saveWeightRecord(record: WeightRecord): Promise<void> {
  const db = await getDB();
  await db.put('weightRecords', record);
}

export async function deleteWeightRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('weightRecords', id);
}

// ----------------- Custom Clinics -----------------

export async function getCustomClinics(): Promise<EmergencyClinic[]> {
  const db = await getDB();
  return db.getAll('customClinics');
}

export async function saveCustomClinic(clinic: EmergencyClinic): Promise<void> {
  const db = await getDB();
  await db.put('customClinics', clinic);
}

export async function deleteCustomClinic(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('customClinics', id);
}


// ----------------- Settings -----------------

const DEFAULT_SETTINGS: UserSettings = {
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
};

export async function getSettings(): Promise<UserSettings> {
  const db = await getDB();
  const res = await db.get('settings', 'user_settings');
  return res ? { ...DEFAULT_SETTINGS, ...res.value } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'user_settings', value: settings });
}

// ----------------- Export / Import -----------------

export interface BackupPayload {
  version: number;
  exportedAt: string;
  dogs: Dog[];
  vaccineRecords: VaccineRecord[];
  dewormingRecords: DewormingRecord[];
  tickFleaRecords: TickFleaRecord[];
  medications?: MedicationCourse[];
  expenses?: ExpenseRecord[];
  weightRecords?: WeightRecord[];
  customClinics?: EmergencyClinic[];
  settings: UserSettings;
}

export async function exportAllLocalData(): Promise<string> {
  const db = await getDB();
  const dogs = await db.getAll('dogs');
  const vaccineRecords = await db.getAll('vaccineRecords');
  const dewormingRecords = await db.getAll('dewormingRecords');
  const tickFleaRecords = await db.getAll('tickFleaRecords');
  const medications = await db.getAll('medications');
  const expenses = await db.getAll('expenses');
  const weightRecords = await db.getAll('weightRecords');
  const customClinics = await db.getAll('customClinics');
  const settings = await getSettings();

  const payload: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    dogs,
    vaccineRecords,
    dewormingRecords,
    tickFleaRecords,
    medications,
    expenses,
    weightRecords,
    customClinics,
    settings,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importLocalData(jsonString: string): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const payload: BackupPayload = JSON.parse(jsonString);
    if (!payload.dogs || !Array.isArray(payload.dogs)) {
      throw new Error('Invalid backup format: missing dogs array.');
    }

    const db = await getDB();
    const tx = db.transaction(
      ['dogs', 'vaccineRecords', 'dewormingRecords', 'tickFleaRecords', 'medications', 'expenses', 'weightRecords', 'customClinics', 'settings'],
      'readwrite'
    );

    for (const d of payload.dogs) {
      await tx.objectStore('dogs').put(d);
    }
    for (const v of payload.vaccineRecords || []) {
      await tx.objectStore('vaccineRecords').put(v);
    }
    for (const de of payload.dewormingRecords || []) {
      await tx.objectStore('dewormingRecords').put(de);
    }
    for (const tf of payload.tickFleaRecords || []) {
      await tx.objectStore('tickFleaRecords').put(tf);
    }
    for (const m of payload.medications || []) {
      await tx.objectStore('medications').put(m);
    }
    for (const ex of payload.expenses || []) {
      await tx.objectStore('expenses').put(ex);
    }
    for (const wt of payload.weightRecords || []) {
      await tx.objectStore('weightRecords').put(wt);
    }
    for (const c of payload.customClinics || []) {
      await tx.objectStore('customClinics').put(c);
    }
    if (payload.settings) {
      await tx.objectStore('settings').put({ key: 'user_settings', value: payload.settings });
    }

    await tx.done;
    return {
      success: true,
      message: 'Backup restored successfully.',
      count: payload.dogs.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to restore backup.',
      count: 0,
    };
  }
}

// ----------------- Sample Demo Data Seed -----------------

export async function seedDemoDataIfEmpty(): Promise<boolean> {
  const dogs = await getAllDogs();
  if (dogs.length > 0) return false;

  const bruno: Dog = {
    id: 'dog_demo_bruno',
    name: 'Bruno',
    breed: 'Golden Retriever',
    dateOfBirth: '2026-05-15',
    gender: 'male',
    breedSize: 'large',
    weightKg: 14.5,
    microchipNumber: '956000012345678',
    isNeutered: false,
    color: 'Golden',
    photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
    medicalNotes: 'Loves swimming, slightly allergic to chicken treats.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const milo: Dog = {
    id: 'dog_demo_milo',
    name: 'Milo',
    breed: 'Indian Pariah (Indie)',
    dateOfBirth: '2024-02-10',
    gender: 'male',
    breedSize: 'medium',
    weightKg: 18.2,
    microchipNumber: '956000087654321',
    isNeutered: true,
    color: 'Tan & White',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    medicalNotes: 'Rescued from Indiranagar; very resilient, fearful of firecrackers.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveDog(bruno);
  await saveDog(milo);

  // Sample records for Bruno (puppy series in progress)
  const v1: VaccineRecord = {
    id: 'rec_v1',
    dogId: 'dog_demo_bruno',
    vaccineKey: 'dhppil',
    vaccineName: 'DHPPiL / 7-in-1',
    doseNumber: 1,
    totalDoses: 3,
    dateAdministered: '2026-07-04',
    nextDueDate: '2026-08-01',
    batchNumber: 'NOBIVAC-84920B',
    clinicName: 'Cessna Lifeline Veterinary Hospital, Domlur',
    vetName: 'Dr. Ramesh Kumar',
    verifiedStatus: 'verified',
    verificationDetails: {
      verifiedByVetName: 'Dr. Ramesh Kumar, MVSc',
      clinicName: 'Cessna Lifeline, Domlur, Bengaluru',
      verifiedAt: '2026-07-04T11:30:00Z',
      notes: 'Administered right sc, no adverse reaction.',
    },
    createdAt: new Date().toISOString(),
  };

  const v2: VaccineRecord = {
    id: 'rec_v2',
    dogId: 'dog_demo_bruno',
    vaccineKey: 'dhppil',
    vaccineName: 'DHPPiL / 7-in-1',
    doseNumber: 2,
    totalDoses: 3,
    dateAdministered: '2026-08-05',
    nextDueDate: '2026-09-02',
    batchNumber: 'VANGUARD-PLUS-5L',
    clinicName: 'MyPet Hospital, Koramangala',
    vetName: 'Dr. Ananya Rao',
    verifiedStatus: 'verified',
    verificationDetails: {
      verifiedByVetName: 'Dr. Ananya Rao',
      clinicName: 'MyPet Hospital, Koramangala',
      verifiedAt: '2026-08-05T16:00:00Z',
    },
    createdAt: new Date().toISOString(),
  };

  await saveVaccineRecord(v1);
  await saveVaccineRecord(v2);

  // Milo adult records
  const vMiloRabies: VaccineRecord = {
    id: 'rec_vm1',
    dogId: 'dog_demo_milo',
    vaccineKey: 'rabies',
    vaccineName: 'Anti-Rabies Vaccine (ARV)',
    doseNumber: 2,
    totalDoses: 2,
    dateAdministered: '2025-10-15',
    nextDueDate: '2026-10-15',
    batchNumber: 'RAKSHARAB-9921',
    clinicName: 'Sanjay Gandhi Animal Care Centre',
    vetName: 'Dr. Suresh Babu',
    verifiedStatus: 'verified',
    createdAt: new Date().toISOString(),
  };

  await saveVaccineRecord(vMiloRabies);

  // Deworming records
  await saveDewormingRecord({
    id: 'dew_1',
    dogId: 'dog_demo_bruno',
    medicationName: 'Drontal Plus Puppy Suspension',
    dateAdministered: '2026-09-10',
    nextDueDate: '2026-10-10',
    weightAtTimeKg: 13.2,
    createdAt: new Date().toISOString(),
  });

  // Tick & flea
  await saveTickFleaRecord({
    id: 'tf_1',
    dogId: 'dog_demo_bruno',
    brandName: 'Simparica Chewable',
    treatmentType: 'oral_chew',
    dateAdministered: '2026-09-15',
    nextDueDate: '2026-10-15',
    createdAt: new Date().toISOString(),
  });

  // Sample medication course for Bruno (Antibiotic course with compliance warning)
  await saveMedication({
    id: 'med_1',
    dogId: 'dog_demo_bruno',
    medicationName: 'Cephalexin 250mg',
    dosage: '1 tablet twice daily with meals',
    frequency: 'twice_daily',
    startDate: '2026-10-18',
    endDate: '2026-10-25',
    totalDoses: 14,
    dosesTaken: 10,
    isAntibiotic: true,
    refillReminderDate: '2026-10-24',
    notes: 'Prescribed by Cessna Lifeline for mild skin allergy/pyoderma. Must finish entire 7-day course.',
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  // Sample expenses
  await saveExpense({
    id: 'exp_1',
    dogId: 'dog_demo_bruno',
    category: 'vaccine',
    amountInr: 2400,
    date: '2026-08-05',
    clinicOrMerchant: 'MyPet Hospital, Koramangala',
    insuranceClaimStatus: 'settled',
    claimAmountInr: 1900,
    notes: 'DHPPiL Dose 2 + health consultation fee. Covered under Digit Pet Insurance.',
    createdAt: new Date().toISOString(),
  });

  await saveExpense({
    id: 'exp_2',
    dogId: 'dog_demo_bruno',
    category: 'food',
    amountInr: 7800,
    date: '2026-09-01',
    clinicOrMerchant: 'Heads Up For Tails, Indiranagar',
    insuranceClaimStatus: 'not_claimed',
    notes: 'Royal Canin Maxi Puppy dry food (15kg bag).',
    createdAt: new Date().toISOString(),
  });

  // Sample weight tracking records for Bruno
  await saveWeightRecord({ id: 'wt_1', dogId: 'dog_demo_bruno', weightKg: 8.5, date: '2026-07-04', notes: 'At 7 weeks visit' });
  await saveWeightRecord({ id: 'wt_2', dogId: 'dog_demo_bruno', weightKg: 11.8, date: '2026-08-05', notes: 'At 11 weeks visit' });
  await saveWeightRecord({ id: 'wt_3', dogId: 'dog_demo_bruno', weightKg: 14.5, date: '2026-09-10', notes: 'Routine checkup' });

  return true;
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'dogs',
      'vaccineRecords',
      'dewormingRecords',
      'tickFleaRecords',
      'medications',
      'expenses',
      'weightRecords',
      'customClinics',
      'settings',
      'auditLogs',
    ],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('dogs').clear(),
    tx.objectStore('vaccineRecords').clear(),
    tx.objectStore('dewormingRecords').clear(),
    tx.objectStore('tickFleaRecords').clear(),
    tx.objectStore('medications').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('weightRecords').clear(),
    tx.objectStore('customClinics').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('auditLogs').clear(),
  ]);
  await tx.done;
}

