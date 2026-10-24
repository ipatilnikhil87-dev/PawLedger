import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getSmsAdapter } from '../adapters/sms.js';

export const handoverRouter = Router();
const smsAdapter = getSmsAdapter();

// 1. Current owner initiates handover
handoverRouter.post('/initiate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { dogId, recipientPhone, handoverType, notes } = req.body;

  if (!dogId || !recipientPhone) {
    res.status(400).json({ error: 'Dog ID and recipient phone number are required.' });
    return;
  }

  const dog = db.get('dogs').find(d => d.id === dogId && d.ownerId === userId);
  if (!dog) {
    res.status(404).json({ error: 'Dog not found or you are not the registered owner.' });
    return;
  }

  const token = `handover_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days

  const handoverRecord = {
    token,
    dogId,
    fromUserId: userId,
    fromOwnerName: req.user!.name || 'Previous Owner',
    recipientPhone: recipientPhone.replace(/[\s-]/g, ''),
    handoverType: handoverType || 'adoption', // 'adoption' | 'foster' | 'transfer'
    notes,
    status: 'pending',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  db.insert('handovers', handoverRecord);
  db.logAudit(userId, 'HANDOVER_INITIATED', `Initiated custody transfer of ${dog.name} to ${recipientPhone}`, dogId);

  const handoverLink = `http://localhost:5173/#/handover/${token}`;
  await smsAdapter.sendHandoverNotification(recipientPhone, dog.name, handoverLink);

  res.status(201).json({
    success: true,
    token,
    handoverLink,
    expiresAt,
  });
});

// 2. Inspect handover details
handoverRouter.get('/inspect/:token', (req: Request, res: Response): void => {
  const { token } = req.params;

  const handover = db.get('handovers').find(h => h.token === token);
  if (!handover) {
    res.status(404).json({ error: 'Handover token not found.' });
    return;
  }

  if (handover.status !== 'pending') {
    res.status(400).json({ error: `This handover has already been ${handover.status}.` });
    return;
  }

  if (new Date(handover.expiresAt).getTime() < Date.now()) {
    res.status(410).json({ error: 'This handover link has expired.' });
    return;
  }

  const dog = db.get('dogs').find(d => d.id === handover.dogId);
  const vaccines = db.get('vaccineRecords').filter(r => r.dogId === handover.dogId);

  res.json({
    success: true,
    handover: {
      type: handover.handoverType,
      fromOwnerName: handover.fromOwnerName,
      notes: handover.notes,
      expiresAt: handover.expiresAt,
    },
    dog,
    vaccineCount: vaccines.length,
    vaccines,
  });
});

// 3. New owner claims custody
handoverRouter.post('/claim/:token', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const newUserId = req.user!.id;
  const newOwnerName = req.user!.name || 'New Owner';
  const { token } = req.params;

  const handover = db.get('handovers').find(h => h.token === token);
  if (!handover) {
    res.status(404).json({ error: 'Handover token not found.' });
    return;
  }

  if (handover.status !== 'pending') {
    res.status(400).json({ error: `Handover has already been ${handover.status}.` });
    return;
  }

  const dog = db.get('dogs').find(d => d.id === handover.dogId);
  if (!dog) {
    res.status(404).json({ error: 'Dog profile not found.' });
    return;
  }

  const now = new Date().toISOString();

  // Create immutable ownership history entry
  const historyEntry = {
    fromOwnerId: handover.fromUserId,
    fromOwnerName: handover.fromOwnerName,
    toOwnerId: newUserId,
    toOwnerName: newOwnerName,
    date: now,
    transferType: handover.handoverType,
  };

  const updatedHistory = Array.isArray(dog.ownershipHistory)
    ? [...dog.ownershipHistory, historyEntry]
    : [historyEntry];

  // Reassign owner
  db.update(
    'dogs',
    d => d.id === dog.id,
    d => ({
      ...d,
      ownerId: newUserId,
      ownershipHistory: updatedHistory,
      updatedAt: now,
    })
  );

  // Invalidate handover token
  db.update(
    'handovers',
    h => h.token === token,
    h => ({
      ...h,
      status: 'claimed',
      claimedByUserId: newUserId,
      claimedAt: now,
    })
  );

  db.logAudit(
    newUserId,
    'HANDOVER_CLAIMED',
    `Claimed custody of ${dog.name} from ${handover.fromOwnerName} (${handover.handoverType})`,
    dog.id
  );

  res.json({
    success: true,
    message: `Custody of ${dog.name} successfully transferred to your PawLedger account!`,
    dogId: dog.id,
  });
});
