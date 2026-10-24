import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:4000';

test('Cloud Sync Auth: Establish Firebase Session with valid Google identity', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/firebase-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: 'test_firebase_uid_' + Date.now(),
      email: 'pawparent.test@example.com',
      displayName: 'Paw Parent Tester',
      photoURL: 'https://example.com/avatar.png',
      phone: '+919988776655',
      deviceName: 'Automated Test Runner',
    }),
  });

  assert.equal(res.status, 200, 'Expected 200 OK');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.accessToken, 'Must return JWT accessToken');
  assert.ok(body.refreshToken, 'Must return refreshToken');
  assert.ok(body.sessionId, 'Must return sessionId');
  assert.equal(body.user.email, 'pawparent.test@example.com');
  assert.equal(body.user.name, 'Paw Parent Tester');

  // Test guest data merge with this user token
  const mergeRes = await fetch(`${BASE_URL}/api/auth/merge-guest-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.accessToken}`,
    },
    body: JSON.stringify({
      localDogs: [
        {
          id: 'dog_test_' + Date.now(),
          name: 'Buddy',
          breed: 'Golden Retriever',
          dateOfBirth: '2023-01-01',
          gender: 'male',
          weightKg: 28,
        },
      ],
      localVaccines: [],
      localDeworming: [],
      localMeds: [],
      localExpenses: [],
    }),
  });

  assert.equal(mergeRes.status, 200, 'Expected 200 OK on merge');
  const mergeBody = await mergeRes.json();
  assert.equal(mergeBody.success, true);
  assert.equal(mergeBody.mergedDogsCount, 1);

  // Test user data retrieval
  const dataRes = await fetch(`${BASE_URL}/api/auth/user-data`, {
    headers: { Authorization: `Bearer ${body.accessToken}` },
  });
  assert.equal(dataRes.status, 200);
  const dataBody = await dataRes.json();
  assert.ok(dataBody.dogs.length > 0);
  assert.equal(dataBody.dogs[0].name, 'Buddy');
});

test('Cloud Sync Auth: Missing identity returns 400 error cleanly', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/firebase-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error, 'Should contain error description');
  assert.match(body.error, /Valid Firebase user identity/);
});
