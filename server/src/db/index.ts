import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'pawledger.db.json');

export interface DatabaseSchema {
  users: any[];
  sessions: any[];
  otpRequests: any[];
  dogs: any[];
  vaccineRecords: any[];
  dewormingRecords: any[];
  tickFleaRecords: any[];
  medications: any[];
  expenses: any[];
  householdMembers: any[];
  vetVerifications: any[];
  handovers: any[];
  societyConsents: any[];
  auditLogs: any[];
  featureFlags: any[];
  mockSmsInbox: any[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  sessions: [],
  otpRequests: [],
  dogs: [],
  vaccineRecords: [],
  dewormingRecords: [],
  tickFleaRecords: [],
  medications: [],
  expenses: [],
  householdMembers: [],
  vetVerifications: [],
  handovers: [],
  societyConsents: [],
  auditLogs: [],
  featureFlags: [
    { key: 'enable_whatsapp_reminders', enabled: true, description: 'Send household reminders over WhatsApp adapter' },
    { key: 'enable_vet_qr_verification', enabled: true, description: 'Allow generating QR codes for vet verification' },
    { key: 'enable_society_portal', enabled: true, description: 'RWA / Apartment society status dashboard' },
  ],
  mockSmsInbox: [],
};

class JsonDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return { ...DEFAULT_DB, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('Error loading db file, initializing default:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  public save(): void {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving db:', err);
    }
  }

  public get<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    return this.data[collection];
  }

  public insert<K extends keyof DatabaseSchema>(collection: K, item: any): any {
    this.data[collection].push(item);
    this.save();
    return item;
  }

  public update<K extends keyof DatabaseSchema>(
    collection: K,
    predicate: (item: any) => boolean,
    updater: (item: any) => any
  ): any | null {
    const arr = this.data[collection] as any[];
    const idx = arr.findIndex(predicate);
    if (idx !== -1) {
      arr[idx] = updater(arr[idx]);
      this.save();
      return arr[idx];
    }
    return null;
  }

  public remove<K extends keyof DatabaseSchema>(
    collection: K,
    predicate: (item: any) => boolean
  ): boolean {
    const arr = this.data[collection] as any[];
    const initialLen = arr.length;
    this.data[collection] = arr.filter(item => !predicate(item)) as any;
    const removed = this.data[collection].length < initialLen;
    if (removed) this.save();
    return removed;
  }

  public logAudit(userId: string, action: string, details: string, dogId?: string): void {
    this.insert('auditLogs', {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      action,
      details,
      dogId,
      timestamp: new Date().toISOString(),
    });
  }
}

export const db = new JsonDatabase();
