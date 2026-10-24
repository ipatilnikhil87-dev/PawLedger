import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { authRouter } from './routes/auth.js';
import { householdRouter } from './routes/household.js';
import { vetVerificationRouter } from './routes/vetVerification.js';
import { handoverRouter } from './routes/handover.js';
import { societyRouter } from './routes/society.js';
import { adminRouter } from './routes/admin.js';
import { transcribeRouter } from './routes/transcribe.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '25mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PawLedger Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/household', householdRouter);
app.use('/api/vet-verification', vetVerificationRouter);
app.use('/api/handover', handoverRouter);
app.use('/api/society', societyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/transcribe', transcribeRouter);

app.listen(PORT, () => {
  console.log(`\n🐾 PawLedger Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 SMS/WhatsApp Gateway Mode: ${process.env.SMS_GATEWAY_ADAPTER || 'mock'}`);
  console.log(`🔒 DPDP Privacy Safeguards Active\n`);
});
