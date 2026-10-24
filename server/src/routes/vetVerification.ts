import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const vetVerificationRouter = Router();

// 1. Owner generates a verification link/QR token
vetVerificationRouter.post('/generate-link', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { recordId, dogId } = req.body;

  if (!recordId || !dogId) {
    res.status(400).json({ error: 'Record ID and Dog ID are required.' });
    return;
  }

  const record = db.get('vaccineRecords').find(r => r.id === recordId);
  const dog = db.get('dogs').find(d => d.id === dogId);

  if (!record || !dog) {
    res.status(404).json({ error: 'Record or dog not found.' });
    return;
  }

  const token = `vet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const verificationEntry = {
    token,
    recordId,
    dogId,
    ownerId: userId,
    status: 'pending',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  db.insert('vetVerifications', verificationEntry);
  db.logAudit(userId, 'VET_LINK_GENERATED', `Generated vet verification link for record ${record.vaccineName}`, dogId);

  const verificationUrl = `http://localhost:5173/#/vet-verify/${token}`;

  res.status(201).json({
    success: true,
    token,
    verificationUrl,
    expiresAt,
  });
});

// 2. Public endpoint: Vet views record without logging in
vetVerificationRouter.get('/review/:token', (req: Request, res: Response): void => {
  const { token } = req.params;

  const verification = db.get('vetVerifications').find(v => v.token === token);
  if (!verification) {
    res.status(404).json({ error: 'Verification link not found or invalid.' });
    return;
  }

  if (new Date(verification.expiresAt).getTime() < Date.now()) {
    res.status(410).json({ error: 'This verification link has expired. Please ask the pet parent to generate a fresh link.' });
    return;
  }

  const record = db.get('vaccineRecords').find(r => r.id === verification.recordId);
  const dog = db.get('dogs').find(d => d.id === verification.dogId);

  res.json({
    success: true,
    verification: {
      status: verification.status,
      expiresAt: verification.expiresAt,
    },
    dog: dog ? {
      id: dog.id,
      name: dog.name,
      breed: dog.breed,
      dateOfBirth: dog.dateOfBirth,
      microchipNumber: dog.microchipNumber,
      photoUrl: dog.photoUrl,
    } : null,
    record: record || null,
  });
});

// 3. Vet submits verification (Approve / Reject)
vetVerificationRouter.post('/submit/:token', (req: Request, res: Response): void => {
  const { token } = req.params;
  const { action, vetName, clinicName, vetRegNumber, notes } = req.body;

  if (!action || !['verified', 'rejected'].includes(action)) {
    res.status(400).json({ error: 'Action must be "verified" or "rejected".' });
    return;
  }

  if (action === 'verified' && (!vetName || !clinicName)) {
    res.status(400).json({ error: 'Doctor name and Clinic name are required to verify an entry.' });
    return;
  }

  const verification = db.get('vetVerifications').find(v => v.token === token);
  if (!verification) {
    res.status(404).json({ error: 'Verification request not found.' });
    return;
  }

  if (new Date(verification.expiresAt).getTime() < Date.now()) {
    res.status(410).json({ error: 'This verification link has expired.' });
    return;
  }

  // Update verification entry
  const now = new Date().toISOString();
  db.update(
    'vetVerifications',
    v => v.token === token,
    v => ({
      ...v,
      status: action,
      verifiedByVetName: vetName,
      clinicName,
      vetRegNumber,
      notes,
      verifiedAt: now,
    })
  );

  // Update vaccine record status and badges
  db.update(
    'vaccineRecords',
    r => r.id === verification.recordId,
    r => ({
      ...r,
      verifiedStatus: action,
      verificationDetails: action === 'verified' ? {
        verifiedByVetName: `${vetName}${vetRegNumber ? ` (Reg: ${vetRegNumber})` : ''}`,
        clinicName,
        verifiedAt: now,
        notes,
      } : undefined,
    })
  );

  db.logAudit(
    'VET_EXTERNAL',
    `VET_RECORD_${action.toUpperCase()}`,
    `${action === 'verified' ? 'Approved' : 'Rejected'} by Dr. ${vetName} (${clinicName})`,
    verification.dogId
  );

  res.json({
    success: true,
    message: action === 'verified'
      ? 'Record verified successfully. Verified badge applied to pet record.'
      : 'Record rejected.',
    verifiedStatus: action,
  });
});
