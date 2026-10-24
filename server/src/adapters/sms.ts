import { db } from '../db/index.js';

export interface SmsMessage {
  id: string;
  toPhone: string;
  type: 'otp' | 'household_reminder' | 'opt_out' | 'vet_alert';
  message: string;
  otpCode?: string;
  timestamp: string;
  delivered: boolean;
}

export interface SmsAdapter {
  sendOtp(phone: string, otp: string): Promise<boolean>;
  sendHouseholdReminder(phone: string, message: string, dogName: string): Promise<boolean>;
  sendHandoverNotification(phone: string, dogName: string, handoverLink: string): Promise<boolean>;
}

export class MockSmsAdapter implements SmsAdapter {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const message = `[PawLedger] Your verification OTP is: ${otp}. Valid for 5 minutes. Do not share this with anyone.`;
    const record: SmsMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toPhone: phone,
      type: 'otp',
      message,
      otpCode: otp,
      timestamp: new Date().toISOString(),
      delivered: true,
    };
    db.insert('mockSmsInbox', record);
    console.log(`\n📱 [MOCK SMS to ${phone}]: ${message}\n`);
    return true;
  }

  async sendHouseholdReminder(phone: string, message: string, dogName: string): Promise<boolean> {
    const formatted = `[PawLedger Reminder for ${dogName}] ${message} (Reply STOP to opt-out)`;
    const record: SmsMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toPhone: phone,
      type: 'household_reminder',
      message: formatted,
      timestamp: new Date().toISOString(),
      delivered: true,
    };
    db.insert('mockSmsInbox', record);
    console.log(`\n💬 [MOCK WHATSAPP/SMS to ${phone}]: ${formatted}\n`);
    return true;
  }

  async sendHandoverNotification(phone: string, dogName: string, handoverLink: string): Promise<boolean> {
    const message = `[PawLedger] You have received custody transfer for ${dogName}. Click to claim: ${handoverLink}`;
    const record: SmsMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toPhone: phone,
      type: 'vet_alert',
      message,
      timestamp: new Date().toISOString(),
      delivered: true,
    };
    db.insert('mockSmsInbox', record);
    console.log(`\n🐾 [MOCK HANDOVER SMS to ${phone}]: ${message}\n`);
    return true;
  }
}

// Swappable factory
export function getSmsAdapter(): SmsAdapter {
  const adapterType = process.env.SMS_GATEWAY_ADAPTER || 'mock';
  if (adapterType === 'mock') {
    return new MockSmsAdapter();
  }
  // Production adapters for Twilio or Gupshup can be added here
  return new MockSmsAdapter();
}
