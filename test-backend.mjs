import assert from 'node:assert';
import { test } from 'node:test';

const BASE_URL = 'http://localhost:4000/api';

test('Backend Healthcheck', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
});

test('Auth: Request OTP & Verify with Mock Gateway', async () => {
  const phone = '+919988776655';
  
  // 1. Request OTP
  const reqRes = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  assert.strictEqual(reqRes.status, 200);
  const reqData = await reqRes.json();
  assert.ok(reqData.devOtp, 'Should return devOtp in development');

  // 2. Verify with wrong OTP
  const wrongRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '000000' }),
  });
  assert.strictEqual(wrongRes.status, 400);

  // 3. Verify with valid OTP
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: reqData.devOtp, clientName: 'Test Parent' }),
  });
  assert.strictEqual(verifyRes.status, 200);
  const authData = await verifyRes.json();
  assert.ok(authData.accessToken, 'Must return JWT access token');
  assert.strictEqual(authData.user.phone, phone);
  assert.strictEqual(authData.user.role, 'owner');
});

test('Feature 2: Household Reminders & WhatsApp/SMS Adapter', async () => {
  // Login to get token
  const phone = '+919876543210';
  const reqRes = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const { devOtp } = await reqRes.json();
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: devOtp }),
  });
  const { accessToken } = await verifyRes.json();

  // Add household member
  const memberRes = await fetch(`${BASE_URL}/household`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Rohan (Dog Walker)',
      phone: '+919123456789',
      relationship: 'walker',
      permissions: 'reminders_only',
      dogIds: ['dog_demo_bruno'],
      reminderTypes: ['vaccine', 'deworming'],
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    }),
  });
  assert.strictEqual(memberRes.status, 201);
  const { member } = await memberRes.json();
  assert.strictEqual(member.name, 'Rohan (Dog Walker)');

  // Dispatch reminder
  const dispatchRes = await fetch(`${BASE_URL}/household/send-reminder-now`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      memberId: member.id,
      dogName: 'Bruno',
      reminderTitle: 'Deworming Due',
      reminderDate: '2026-10-25',
    }),
  });
  assert.strictEqual(dispatchRes.status, 200);
  const dispatchData = await dispatchRes.json();
  assert.strictEqual(dispatchData.success, true);
});

test('Feature 3: Vet Verification Flow (No-Account Token Review)', async () => {
  // Login
  const phone = '+919999988888';
  const reqRes = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const { devOtp } = await reqRes.json();
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: devOtp }),
  });
  const { accessToken } = await verifyRes.json();

  // Seed sample dog & vaccine on server
  await fetch(`${BASE_URL}/auth/merge-guest-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localDogs: [{ id: 'dog_vet_test', name: 'Simba', breed: 'Labrador', dateOfBirth: '2025-01-01' }],
      localVaccines: [{ id: 'rec_vet_test', dogId: 'dog_vet_test', vaccineName: 'Rabies Booster', dateAdministered: '2026-10-20', nextDueDate: '2027-10-20', verifiedStatus: 'unverified' }],
    }),
  });

  // 1. Owner generates verification link
  const linkRes = await fetch(`${BASE_URL}/vet-verification/generate-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ recordId: 'rec_vet_test', dogId: 'dog_vet_test' }),
  });
  assert.strictEqual(linkRes.status, 201);
  const { token } = await linkRes.json();

  // 2. Vet inspects without login
  const inspectRes = await fetch(`${BASE_URL}/vet-verification/review/${token}`);
  assert.strictEqual(inspectRes.status, 200);
  const inspectData = await inspectRes.json();
  assert.strictEqual(inspectData.dog.name, 'Simba');
  assert.strictEqual(inspectData.record.vaccineName, 'Rabies Booster');

  // 3. Vet approves
  const approveRes = await fetch(`${BASE_URL}/vet-verification/submit/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'verified',
      vetName: 'Dr. Priya Sharma, MVSc',
      clinicName: 'Cessna Lifeline, Indiranagar',
      vetRegNumber: 'KA-VET-8849',
      notes: 'Subcutaneous injection, batch verified.',
    }),
  });
  assert.strictEqual(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.strictEqual(approveData.verifiedStatus, 'verified');
});

test('Feature 13: Society / Apartment Community Portal with DPDP Consent Safeguards', async () => {
  const phone = '+919777766666';
  const reqRes = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const { devOtp } = await reqRes.json();
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: devOtp }),
  });
  const { accessToken } = await verifyRes.json();

  // Seed dog
  await fetch(`${BASE_URL}/auth/merge-guest-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localDogs: [{ id: 'dog_soc_test', name: 'Kaalu', breed: 'Indie', dateOfBirth: '2024-06-01' }],
      localVaccines: [{ id: 'rec_soc_rabies', dogId: 'dog_soc_test', vaccineKey: 'rabies', vaccineName: 'Anti-Rabies Vaccine', nextDueDate: '2027-10-01' }],
    }),
  });

  // Grant explicit consent to Prestige Shantiniketan
  const consentRes = await fetch(`${BASE_URL}/society/consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      dogId: 'dog_soc_test',
      societyName: 'Prestige Shantiniketan',
      flatNumber: 'Tower 12, Flat 402',
    }),
  });
  assert.strictEqual(consentRes.status, 201);

  // Society admin inspects
  const adminRes = await fetch(`${BASE_URL}/society/admin/Prestige%20Shantiniketan`);
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.ok(adminData.summary.totalConsentedDogs >= 1);
  const resident = adminData.residentPets.find(p => p.dogName === 'Kaalu');
  assert.ok(resident, 'Opted-in dog must appear in society view');
  assert.strictEqual(resident.flatNumber, 'Tower 12, Flat 402');
  assert.strictEqual(resident.overallVaccineStatus, 'valid');
  assert.strictEqual(resident.medicalNotes, undefined, 'Private medical notes must be strictly redacted!');
});
