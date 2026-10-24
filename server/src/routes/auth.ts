import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { getSmsAdapter } from '../adapters/sms.js';
import { generateTokens, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();
const smsAdapter = getSmsAdapter();

// Standardize phone number (e.g. +91 9876543210 -> +919876543210)
function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s-]/g, '');
  if (clean.startsWith('+91')) return clean;
  if (clean.length === 10) return `+91${clean}`;
  return clean;
}

// 1. Request OTP (with rate limiting & brute-force lockout)
authRouter.post('/request-otp', async (req, res: Response): Promise<void> => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Valid phone number is required.' });
    return;
  }

  const cleanPhone = normalizePhone(phone);
  const now = Date.now();

  const existing = db.get('otpRequests').find(r => r.phone === cleanPhone);

  if (existing) {
    // Check brute-force lockout
    if (existing.lockedUntil && existing.lockedUntil > now) {
      const waitMinutes = Math.ceil((existing.lockedUntil - now) / 60000);
      res.status(429).json({
        error: `Too many failed attempts. Account temporarily locked for security. Please try again in ${waitMinutes} minute(s).`,
      });
      return;
    }

    // Rate limit: max 4 requests per 10 minutes
    if (existing.requestTimestamps) {
      const recent = existing.requestTimestamps.filter((t: number) => now - t < 10 * 60 * 1000);
      if (recent.length >= 4) {
        res.status(429).json({ error: 'OTP request rate limit exceeded. Please wait 10 minutes before requesting again.' });
        return;
      }
      existing.requestTimestamps = [...recent, now];
    } else {
      existing.requestTimestamps = [now];
    }
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  if (existing) {
    db.update(
      'otpRequests',
      r => r.phone === cleanPhone,
      r => ({
        ...r,
        otp,
        expiresAt,
        wrongAttempts: 0,
        lastRequestedAt: new Date().toISOString(),
      })
    );
  } else {
    db.insert('otpRequests', {
      phone: cleanPhone,
      otp,
      expiresAt,
      wrongAttempts: 0,
      requestTimestamps: [now],
      lastRequestedAt: new Date().toISOString(),
    });
  }

  await smsAdapter.sendOtp(cleanPhone, otp);

  res.json({
    success: true,
    message: `OTP sent successfully to ${cleanPhone}.`,
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  });
});

// 2. Verify OTP
authRouter.post('/verify-otp', (req, res: Response): void => {
  const { phone, otp, clientName, deviceName } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP are required.' });
    return;
  }

  const cleanPhone = normalizePhone(phone);
  const now = Date.now();

  const reqRecord = db.get('otpRequests').find(r => r.phone === cleanPhone);

  if (!reqRecord) {
    res.status(400).json({ error: 'No OTP request found for this phone. Request a new OTP.' });
    return;
  }

  if (reqRecord.expiresAt < now) {
    res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    return;
  }

  if (reqRecord.otp !== otp.trim()) {
    const wrong = (reqRecord.wrongAttempts || 0) + 1;
    let lockedUntil: number | undefined = undefined;

    if (wrong >= 5) {
      lockedUntil = now + 15 * 60 * 1000; // 15 mins lockout
    }

    db.update(
      'otpRequests',
      r => r.phone === cleanPhone,
      r => ({ ...r, wrongAttempts: wrong, lockedUntil })
    );

    res.status(400).json({
      error: wrong >= 5
        ? 'Account temporarily locked due to 5 consecutive invalid OTP attempts.'
        : `Invalid OTP. ${5 - wrong} attempts remaining before temporary lockout.`,
    });
    return;
  }

  // Clear OTP request
  db.remove('otpRequests', r => r.phone === cleanPhone);

  // Find or create user
  let user = db.get('users').find(u => u.phone === cleanPhone);
  if (!user) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: cleanPhone,
      name: clientName || 'Pet Parent',
      role: 'owner',
      city: 'Bengaluru',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert('users', user);
  }

  // Create active session
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { accessToken, refreshToken } = generateTokens(user, sessionId);

  db.insert('sessions', {
    id: sessionId,
    userId: user.id,
    deviceName: deviceName || 'Web Browser',
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isValid: true,
  });

  db.logAudit(user.id, 'USER_LOGIN', `Logged in from ${deviceName || 'browser'}`);

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      city: user.city,
    },
    accessToken,
    refreshToken,
    sessionId,
  });
});

// 2b. Firebase Authenticated Session Creation (Google Sign-In / Firebase Auth)
authRouter.post('/firebase-session', (req, res: Response): void => {
  try {
    const { uid, email, displayName, photoURL, phone, clientName, deviceName } = req.body;
    
    if (!uid && !email && !phone) {
      res.status(400).json({ error: 'Valid Firebase user identity (UID, email, or phone) is required.' });
      return;
    }

    console.log(`[Auth] Establishing Firebase cloud session for: ${email || uid}`);

    // Find or create separate user by their distinct Firebase UID or email
    let user = db.get('users').find(u => 
      (uid && (u.firebaseUid === uid || u.id === `usr_fb_${uid}`)) || 
      (email && u.email && u.email.toLowerCase() === email.toLowerCase())
    );

    const cleanPhone = phone ? normalizePhone(phone) : '';

    if (!user) {
      const userId = uid ? `usr_fb_${uid}` : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      user = {
        id: userId,
        firebaseUid: uid || '',
        email: email || '',
        phone: cleanPhone,
        name: displayName || clientName || (email ? email.split('@')[0] : 'Pet Parent'),
        photoUrl: photoURL || '',
        role: 'owner',
        city: 'Bengaluru',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.insert('users', user);
    } else {
      // Update profile info if newly available from Google
      let updated = false;
      if (displayName && user.name !== displayName) { user.name = displayName; updated = true; }
      if (photoURL && user.photoUrl !== photoURL) { user.photoUrl = photoURL; updated = true; }
      if (email && user.email !== email) { user.email = email; updated = true; }
      if (uid && user.firebaseUid !== uid) { user.firebaseUid = uid; updated = true; }
      if (cleanPhone && user.phone !== cleanPhone) { user.phone = cleanPhone; updated = true; }
      if (updated) {
        db.update('users', u => u.id === user.id, () => ({ ...user, updatedAt: new Date().toISOString() }));
      }
    }

    // Create active session
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { accessToken, refreshToken } = generateTokens(user, sessionId);

    db.insert('sessions', {
      id: sessionId,
      userId: user.id,
      deviceName: deviceName || 'Web Browser (Google Sign-In)',
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isValid: true,
    });

    db.logAudit(user.id, 'USER_LOGIN', `Logged in via Google Auth (${user.email || user.name})`);

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        phone: user.phone,
        name: user.name,
        photoUrl: user.photoUrl,
        role: user.role,
        city: user.city,
      },
      accessToken,
      refreshToken,
      sessionId,
    });
  } catch (err: any) {
    console.error('[Auth] Error establishing Firebase session:', err?.message || err);
    res.status(500).json({
      error: 'Backend error while initializing cloud session. Please try again.',
      details: err?.message,
    });
  }
});

// 2c. Fetch User Cloud Data (Scoped strictly to this authenticated user ID)
authRouter.get('/user-data', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const userDogs = db.get('dogs').filter(d => d.ownerId === userId);
  const dogIds = userDogs.map(d => d.id);
  const userVaccines = db.get('vaccineRecords').filter(r => dogIds.includes(r.dogId));
  const userDeworming = db.get('dewormingRecords').filter(r => dogIds.includes(r.dogId));
  const userMeds = db.get('medications').filter(m => dogIds.includes(m.dogId));
  const userExpenses = db.get('expenses').filter(e => dogIds.includes(e.dogId));

  res.json({
    user: req.user,
    dogs: userDogs,
    vaccineRecords: userVaccines,
    dewormingRecords: userDeworming,
    medications: userMeds,
    expenses: userExpenses,
  });
});

// 3. Guest-to-Account Merge (Local data merged into backend account seamlessly without loss)
authRouter.post('/merge-guest-data', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { localDogs, localVaccines, localDeworming, localMeds, localExpenses } = req.body;

    let mergedDogsCount = 0;
    let mergedRecordsCount = 0;

    // Merge dogs
    for (const dog of localDogs || []) {
      const existing = db.get('dogs').find(d => d.id === dog.id);
      if (!existing) {
        db.insert('dogs', { ...dog, ownerId: userId, updatedAt: new Date().toISOString() });
        mergedDogsCount++;
      }
    }

    // Merge vaccines
    for (const v of localVaccines || []) {
      const existing = db.get('vaccineRecords').find(r => r.id === v.id);
      if (!existing) {
        db.insert('vaccineRecords', v);
        mergedRecordsCount++;
      }
    }

    // Merge deworming
    for (const d of localDeworming || []) {
      const existing = db.get('dewormingRecords').find(r => r.id === d.id);
      if (!existing) {
        db.insert('dewormingRecords', d);
        mergedRecordsCount++;
      }
    }

    // Merge meds
    for (const m of localMeds || []) {
      const existing = db.get('medications').find(r => r.id === m.id);
      if (!existing) {
        db.insert('medications', m);
        mergedRecordsCount++;
      }
    }

    // Merge expenses
    for (const e of localExpenses || []) {
      const existing = db.get('expenses').find(r => r.id === e.id);
      if (!existing) {
        db.insert('expenses', e);
        mergedRecordsCount++;
      }
    }

    db.logAudit(userId, 'DATA_MERGE', `Merged ${mergedDogsCount} dogs and ${mergedRecordsCount} records from guest mode.`);

    res.json({
      success: true,
      message: `Successfully merged local data: ${mergedDogsCount} dogs and ${mergedRecordsCount} health records.`,
      mergedDogsCount,
      mergedRecordsCount,
    });
  } catch (err: any) {
    console.error('[Auth] Error merging guest data:', err?.message || err);
    res.status(500).json({
      error: 'Backend error while merging guest data into cloud account.',
      details: err?.message,
    });
  }
});

// 4. List Active Sessions
authRouter.get('/sessions', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const sessions = db.get('sessions').filter(s => s.userId === userId && s.isValid);

  res.json({
    sessions: sessions.map(s => ({
      id: s.id,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      isCurrent: s.id === req.sessionId,
    })),
  });
});

// 5. Logout current session
authRouter.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const sessionId = req.sessionId;
  db.update('sessions', s => s.id === sessionId, s => ({ ...s, isValid: false }));
  db.logAudit(req.user!.id, 'USER_LOGOUT', 'Logged out of current session');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 6. Logout all devices
authRouter.post('/logout-all', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const sessions = db.get('sessions');
  for (const s of sessions) {
    if (s.userId === userId) {
      s.isValid = false;
    }
  }
  db.save();
  db.logAudit(userId, 'USER_LOGOUT_ALL', 'Revoked all active device sessions');
  res.json({ success: true, message: 'Logged out from all devices.' });
});

// 7. Delete Account (DPDP Act - Right to Erasure)
authRouter.post('/delete-account', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  // 1. Find all dogs owned by this user
  const userDogs = db.get('dogs').filter(d => d.ownerId === userId);
  const dogIds = userDogs.map(d => d.id);

  // 2. Cascade delete records
  db.remove('vaccineRecords', r => dogIds.includes(r.dogId));
  db.remove('dewormingRecords', r => dogIds.includes(r.dogId));
  db.remove('tickFleaRecords', r => dogIds.includes(r.dogId));
  db.remove('medications', r => dogIds.includes(r.dogId));
  db.remove('expenses', r => dogIds.includes(r.dogId));
  db.remove('householdMembers', m => m.ownerId === userId);
  db.remove('societyConsents', c => c.userId === userId);
  db.remove('vetVerifications', v => v.ownerId === userId);
  db.remove('dogs', d => d.ownerId === userId);
  db.remove('sessions', s => s.userId === userId);
  db.remove('users', u => u.id === userId);

  db.logAudit('SYSTEM', 'ACCOUNT_ERASURE', `Account ${userId} and all related health data permanently erased per DPDP request.`);

  res.json({
    success: true,
    message: 'Your account, dogs, and all medical records have been permanently deleted from PawLedger.',
  });
});
