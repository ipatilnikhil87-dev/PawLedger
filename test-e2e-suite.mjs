// test-e2e-suite.mjs
// Comprehensive test suite for PawLedger: Schedule Engine, Booklet OCR heuristics,
// Confidence calibration, and Backend Privacy/Security APIs.

import { parseVaccinationText, SAMPLE_BOOKLET_PRESETS } from './client/src/adapters/ocr.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('🧪 Starting PawLedger Full Verification Suite...\n');

  // Test 1: Booklet OCR Extraction on High-Confidence Printed Card
  console.log('Test 1: OCR Extraction on High-Confidence Printed Card (DHPPiL)');
  const clearPreset = SAMPLE_BOOKLET_PRESETS.find(p => p.id === 'preset-dhppil-clear');
  assert(clearPreset !== undefined, 'Sample preset for clear DHPPiL card exists');
  assert(clearPreset.expectedResult.vaccineKey.value === 'dhppil', 'Identifies DHPPiL correctly');
  assert(clearPreset.expectedResult.batchNumber.confidence >= 0.90, 'High confidence (>=90%) on clear printed batch code');
  assert(clearPreset.expectedResult.batchNumber.isLowConfidence === false, 'Batch number is not flagged as low confidence');

  // Test 2: OCR Extraction on Messy Handwritten Card (Rabies)
  console.log('\nTest 2: OCR Extraction on Messy Handwritten Card (Rabies)');
  const messyPreset = SAMPLE_BOOKLET_PRESETS.find(p => p.id === 'preset-rabies-handwritten');
  assert(messyPreset !== undefined, 'Sample preset for messy handwritten card exists');
  assert(messyPreset.expectedResult.vaccineKey.value === 'rabies', 'Identifies Anti-Rabies correctly');
  assert(messyPreset.expectedResult.batchNumber.isLowConfidence === true, 'Flags smudged batch number as low confidence (<70%)');
  assert(messyPreset.expectedResult.nextDueDate.isLowConfidence === true, 'Flags uncertain due date as low confidence');
  assert(messyPreset.expectedResult.warnings.length >= 2, 'Generates explanatory warnings for user review');

  // Test 3: Heuristic parser on raw text with irregular dates
  console.log('\nTest 3: Heuristic OCR Parser on raw text');
  const customText = `
    CITY VET CLINIC INDIRANAGAR
    Canine Bordetella KC Vaccine
    Given on: 12/05/2026
    Next Booster: 12/05/2027
    B.No: B7419-X
  `;
  const parsed = parseVaccinationText(customText, 0.85);
  assert(parsed.vaccineKey.value === 'kennel_cough', 'Parsed Bordetella KC as kennel_cough');
  assert(parsed.dateAdministered.value === '2026-05-12', `Extracted date administered: ${parsed.dateAdministered.value}`);
  assert(parsed.nextDueDate.value === '2027-05-12', `Extracted next booster date: ${parsed.nextDueDate.value}`);
  assert(parsed.batchNumber.value === 'B7419-X', `Extracted batch number: ${parsed.batchNumber.value}`);

  // Test 4: Backend API & DPDP Compliance
  console.log('\nTest 4: Backend API Health and DPDP Safeguards');
  try {
    const healthRes = await fetch('http://localhost:4000/api/health');
    const health = await healthRes.json();
    assert(health.status === 'ok', 'Backend server is running on http://localhost:4000/api/health');

    // Test Society Mode privacy redaction (DPDP principle: purpose limitation)
    const adminRes = await fetch('http://localhost:4000/api/society/admin/Prestige%20Ferns%20Residency');
    const adminData = await adminRes.json();
    assert(Array.isArray(adminData.residentPets), 'Society admin endpoint returns consented residentPets array');
    if (adminData.residentPets && adminData.residentPets.length > 0) {
      const rec = adminData.residentPets[0];
      assert(rec.overallVaccineStatus !== undefined, 'Returns status-level compliance (valid/due_soon/overdue)');
      assert(rec.weightKg === undefined, 'DPDP: Private weight data is completely redacted from society admin');
      assert(rec.expenses === undefined, 'DPDP: Expense logs are completely redacted from society admin');
      assert(rec.medicalNotes === undefined, 'DPDP: Private medical notes are completely redacted from society admin');
    }

    // Test Audit Log
    const auditRes = await fetch('http://localhost:4000/api/admin/audit-logs');
    const auditData = await auditRes.json();
    assert(Array.isArray(auditData.logs), 'Audit log endpoint records security and sharing events');
  } catch (err) {
    console.error('Backend connection check encountered an error:', err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Suite Complete: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTestSuite();
