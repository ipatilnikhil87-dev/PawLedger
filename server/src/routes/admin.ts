import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

export const adminRouter = Router();

// 1. Feature flags
adminRouter.get('/feature-flags', (req: Request, res: Response): void => {
  res.json({ flags: db.get('featureFlags') });
});

adminRouter.post('/feature-flags/:key', (req: Request, res: Response): void => {
  const { key } = req.params;
  const { enabled } = req.body;

  const updated = db.update(
    'featureFlags',
    f => f.key === key,
    f => ({ ...f, enabled: Boolean(enabled) })
  );

  if (!updated) {
    res.status(404).json({ error: 'Feature flag not found.' });
    return;
  }

  res.json({ success: true, flag: updated });
});

// 2. Mock SMS / WhatsApp Inbox (For local testing & development review!)
adminRouter.get('/sms-inbox', (req: Request, res: Response): void => {
  const inbox = db.get('mockSmsInbox').slice(-50).reverse();
  res.json({ count: inbox.length, messages: inbox });
});

// 3. Audit Logs
adminRouter.get('/audit-logs', (req: Request, res: Response): void => {
  const logs = db.get('auditLogs').slice(-100).reverse();
  res.json({ count: logs.length, logs });
});

// 4. System Health & Database Stats
adminRouter.get('/stats', (req: Request, res: Response): void => {
  res.json({
    usersCount: db.get('users').length,
    activeSessions: db.get('sessions').filter(s => s.isValid).length,
    dogsCount: db.get('dogs').length,
    vaccineRecordsCount: db.get('vaccineRecords').length,
    householdMembersCount: db.get('householdMembers').length,
    vetVerificationsCount: db.get('vetVerifications').length,
    handoversCount: db.get('handovers').length,
    societyConsentsCount: db.get('societyConsents').length,
    timestamp: new Date().toISOString(),
  });
});
