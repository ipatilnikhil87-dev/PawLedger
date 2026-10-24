import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { getSmsAdapter } from '../adapters/sms.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const householdRouter = Router();
const smsAdapter = getSmsAdapter();

// List household members
householdRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const members = db.get('householdMembers').filter(m => m.ownerId === userId);
  res.json({ members });
});

// Add household member / walker / sitter
householdRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { name, phone, relationship, permissions, dogIds, reminderTypes, quietHoursStart, quietHoursEnd } = req.body;

  if (!name || !phone) {
    res.status(400).json({ error: 'Name and phone number are required.' });
    return;
  }

  const cleanPhone = phone.replace(/[\s-]/g, '');

  const member = {
    id: `hm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId: userId,
    name: name.trim(),
    phone: cleanPhone,
    relationship: relationship || 'family', // 'family' | 'walker' | 'sitter'
    permissions: permissions || 'reminders_only', // 'view' | 'edit' | 'reminders_only'
    dogIds: Array.isArray(dogIds) ? dogIds : [],
    reminderTypes: Array.isArray(reminderTypes) ? reminderTypes : ['vaccine', 'deworming', 'medication'],
    quietHoursStart: quietHoursStart || '22:00',
    quietHoursEnd: quietHoursEnd || '07:00',
    optOut: false,
    createdAt: new Date().toISOString(),
  };

  db.insert('householdMembers', member);
  db.logAudit(userId, 'HOUSEHOLD_INVITE', `Added ${name} (${cleanPhone}) as ${relationship}`);

  res.status(201).json({ success: true, member });
});

// Update member permissions & reminder controls
householdRouter.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;
  const updates = req.body;

  const updated = db.update(
    'householdMembers',
    m => m.id === id && m.ownerId === userId,
    m => ({ ...m, ...updates, updatedAt: new Date().toISOString() })
  );

  if (!updated) {
    res.status(404).json({ error: 'Household member not found.' });
    return;
  }

  res.json({ success: true, member: updated });
});

// Delete member
householdRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.params;

  const removed = db.remove('householdMembers', m => m.id === id && m.ownerId === userId);
  if (!removed) {
    res.status(404).json({ error: 'Household member not found.' });
    return;
  }

  db.logAudit(userId, 'HOUSEHOLD_REMOVE', `Removed household member ${id}`);
  res.json({ success: true, message: 'Household member removed.' });
});

// Trigger a test/manual reminder dispatch to household member (Feature 2)
householdRouter.post('/send-reminder-now', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { memberId, dogName, reminderTitle, reminderDate } = req.body;

  const member = db.get('householdMembers').find(m => m.id === memberId && m.ownerId === userId);
  if (!member) {
    res.status(404).json({ error: 'Household member not found.' });
    return;
  }

  if (member.optOut) {
    res.status(400).json({ error: 'Member has opted out of notifications.' });
    return;
  }

  // Quiet hours check
  const now = new Date();
  const currentHourMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isQuietHours = currentHourMinute >= member.quietHoursStart || currentHourMinute < member.quietHoursEnd;

  const messageText = `${reminderTitle} is scheduled on ${reminderDate || 'soon'}. Please coordinate with pet parent ${req.user!.name || ''}.`;

  await smsAdapter.sendHouseholdReminder(member.phone, messageText, dogName || 'Pet');
  db.logAudit(userId, 'REMINDER_DISPATCH', `Dispatched reminder to ${member.name} (${member.phone})`);

  res.json({
    success: true,
    message: `Reminder sent to ${member.name} via WhatsApp/SMS mock adapter.`,
    quietHoursSuppressed: isQuietHours,
  });
});

// Opt-out webhook handler ("STOP" response)
householdRouter.post('/webhook/opt-out', (req, res: Response): void => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: 'Phone number required' });
    return;
  }

  const cleanPhone = phone.replace(/[\s-]/g, '');
  let updatedCount = 0;

  const members = db.get('householdMembers');
  for (const m of members) {
    if (m.phone === cleanPhone) {
      m.optOut = true;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    db.save();
    console.log(`🔕 [OPT-OUT]: ${cleanPhone} opted out of all future PawLedger reminders.`);
  }

  res.json({ success: true, message: `Phone ${cleanPhone} unsubscribed.`, count: updatedCount });
});
