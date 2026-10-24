import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const societyRouter = Router();

// 1. Owner grants explicit consent for their dog to an apartment society
societyRouter.post('/consent', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { dogId, societyName, flatNumber } = req.body;

  if (!dogId || !societyName) {
    res.status(400).json({ error: 'Dog ID and Society Name are required.' });
    return;
  }

  const dog = db.get('dogs').find(d => d.id === dogId && d.ownerId === userId);
  if (!dog) {
    res.status(404).json({ error: 'Dog not found or unauthorized.' });
    return;
  }

  // Remove any previous revoked consent for this dog & society
  db.remove('societyConsents', c => c.dogId === dogId && c.societyName === societyName);

  const consentRecord = {
    id: `soc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    dogId,
    societyName: societyName.trim(),
    flatNumber: flatNumber ? flatNumber.trim() : 'Unspecified',
    consentGrantedAt: new Date().toISOString(),
    isRevoked: false,
  };

  db.insert('societyConsents', consentRecord);
  db.logAudit(userId, 'SOCIETY_CONSENT_GRANTED', `Granted vaccination status disclosure to ${societyName}`, dogId);

  res.status(201).json({
    success: true,
    message: `Consent granted to ${societyName}. Only high-level vaccination status will be visible to society admins.`,
    consent: consentRecord,
  });
});

// 2. Owner revokes consent
societyRouter.post('/revoke-consent', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { consentId } = req.body;

  const consent = db.get('societyConsents').find(c => c.id === consentId && c.userId === userId);
  if (!consent) {
    res.status(404).json({ error: 'Consent record not found.' });
    return;
  }

  const now = new Date().toISOString();
  db.update(
    'societyConsents',
    c => c.id === consentId,
    c => ({ ...c, isRevoked: true, revokedAt: now })
  );

  db.logAudit(userId, 'SOCIETY_CONSENT_REVOKED', `Revoked vaccination status disclosure to ${consent.societyName}`, consent.dogId);

  res.json({
    success: true,
    message: `Consent revoked for ${consent.societyName}. Your pet's records are no longer visible to society admins.`,
  });
});

// 3. Owner views active consents
societyRouter.get('/my-consents', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const consents = db.get('societyConsents').filter(c => c.userId === userId && !c.isRevoked);

  const enriched = consents.map(c => {
    const dog = db.get('dogs').find(d => d.id === c.dogId);
    return {
      ...c,
      dogName: dog ? dog.name : 'Unknown Dog',
      dogBreed: dog ? dog.breed : '',
    };
  });

  res.json({ consents: enriched });
});

// 4. Society Admin Portal (Restricted to opted-in dogs only, high-level status only)
societyRouter.get('/admin/:societyName', (req: Request, res: Response): void => {
  const { societyName } = req.params;

  const activeConsents = db.get('societyConsents').filter(
    c => c.societyName.toLowerCase() === decodeURIComponent(societyName as string).toLowerCase() && !c.isRevoked
  );

  const now = new Date();

  const report = activeConsents.map(consent => {
    const dog = db.get('dogs').find(d => d.id === consent.dogId);
    const owner = db.get('users').find(u => u.id === consent.userId);
    const dogVaccines = db.get('vaccineRecords').filter(r => r.dogId === consent.dogId);

    // Compute status
    let overallStatus: 'valid' | 'due_soon' | 'overdue' = 'valid';
    let hasValidRabies = false;

    for (const v of dogVaccines) {
      if (v.vaccineKey === 'rabies' || v.vaccineName.toLowerCase().includes('rabies')) {
        const due = new Date(v.nextDueDate).getTime();
        if (due > now.getTime()) {
          hasValidRabies = true;
        }
      }

      const dueTime = new Date(v.nextDueDate).getTime();
      const diffDays = Math.round((dueTime - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        overallStatus = 'overdue';
      } else if (diffDays <= 14 && overallStatus !== 'overdue') {
        overallStatus = 'due_soon';
      }
    }

    return {
      dogName: dog ? dog.name : 'Pet',
      breed: dog ? dog.breed : '',
      microchipNumber: dog?.microchipNumber || 'Not provided',
      flatNumber: consent.flatNumber,
      ownerName: owner ? owner.name : 'Resident',
      overallVaccineStatus: overallStatus,
      rabiesImmunization: hasValidRabies ? 'Protected (Active)' : 'Action Required / Unconfirmed',
      consentDate: consent.consentGrantedAt,
    };
  });

  const total = report.length;
  const compliant = report.filter(r => r.overallVaccineStatus === 'valid').length;
  const overdue = report.filter(r => r.overallVaccineStatus === 'overdue').length;

  res.json({
    societyName,
    summary: {
      totalConsentedDogs: total,
      compliantDogs: compliant,
      overdueDogs: overdue,
      compliancePercentage: total > 0 ? Math.round((compliant / total) * 100) : 100,
    },
    residentPets: report,
    privacyNotice: 'Under the DPDP Act 2023, this view only contains dogs whose owners have provided explicit, active consent. Private medical notes, billing, and full health history are strictly redacted.',
  });
});
