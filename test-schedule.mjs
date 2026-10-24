import assert from 'node:assert';
import { test } from 'node:test';

// Import rules
import fs from 'node:fs';
const rulesData = JSON.parse(fs.readFileSync('./client/src/data/vaccineRules.json', 'utf8'));

// Pure logic reimplementation/testing mirroring scheduleEngine.ts
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const res = new Date(date.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function addMonths(date, months) {
  const res = new Date(date.getTime());
  res.setMonth(res.getMonth() + months);
  return res;
}

function diffInDays(targetDate, fromDate) {
  const diffMs = targetDate.getTime() - fromDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

test('Schedule Engine: On-time puppy DHPPiL series calculation', () => {
  const dob = parseDate('2026-01-01');
  const rule = rulesData.vaccines.find(v => v.key === 'dhppil');
  assert.ok(rule, 'DHPPiL rule must exist');
  
  // Ideal age for Dose 1 is 7 weeks
  const dose1Due = addWeeks(dob, rule.doses[0].idealAgeWeeks);
  assert.strictEqual(formatDate(dose1Due), '2026-02-19');
});

test('Schedule Engine: Late dose shift recalculation', () => {
  const dob = parseDate('2026-01-01');
  // Suppose Dose 1 was delayed and given at week 12 (2026-03-26) instead of week 7
  const lateDose1Administered = parseDate('2026-03-26');
  
  const minIntervalWeeks = 3;
  const recalculatedDose2 = addWeeks(lateDose1Administered, minIntervalWeeks);
  
  // Dose 2 MUST not be before 2026-04-16 to maintain minimum 3-week spacing
  assert.strictEqual(formatDate(recalculatedDose2), '2026-04-16');
  assert.ok(diffInDays(recalculatedDose2, lateDose1Administered) >= 21, 'Must maintain at least 21 days between doses');
});

test('Schedule Engine: Annual booster scheduled 12 months after completed puppy series', () => {
  const lastPuppyDoseDate = parseDate('2026-05-01');
  const boosterDate = addMonths(lastPuppyDoseDate, 12);
  assert.strictEqual(formatDate(boosterDate), '2027-05-01');
});

test('Schedule Engine: Tick & Flea intervals (Simparica 30d vs Bravecto 90d)', () => {
  const dateAdministered = parseDate('2026-06-01');
  const simparicaNext = addDays(dateAdministered, 30);
  const bravectoNext = addDays(dateAdministered, 90);

  assert.strictEqual(formatDate(simparicaNext), '2026-07-01');
  assert.strictEqual(formatDate(bravectoNext), '2026-08-30');
});
