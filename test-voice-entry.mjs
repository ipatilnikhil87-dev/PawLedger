import test from 'node:test';
import assert from 'node:assert/strict';

// Test voice parsing logic directly
function parseVoiceTranscript(text, dogs, activeDog, effectiveDate) {
  const clean = text.toLowerCase();

  let targetDog = activeDog || dogs[0];
  for (const d of dogs) {
    if (clean.includes(d.name.toLowerCase())) {
      targetDog = d;
      break;
    }
  }

  let category = 'vaccine';
  if (
    clean.includes('deworm') ||
    clean.includes('worm') ||
    clean.includes('kiwof') ||
    clean.includes('drontal')
  ) {
    category = 'deworming';
  } else if (
    clean.includes('simparica') ||
    clean.includes('bravecto') ||
    clean.includes('nexgard') ||
    clean.includes('tick') ||
    clean.includes('flea')
  ) {
    category = 'tick_flea';
  } else if (
    clean.includes('amoxicillin') ||
    clean.includes('antibiotic') ||
    clean.includes('tablet') ||
    clean.includes('capsule') ||
    clean.includes('syrup') ||
    clean.includes('mg') ||
    clean.includes('twice daily') ||
    clean.includes('once daily')
  ) {
    category = 'medication';
  } else if (
    clean.includes('rupees') ||
    clean.includes('rs') ||
    clean.includes('inr') ||
    clean.includes('spent') ||
    clean.includes('cost') ||
    clean.includes('bill') ||
    clean.includes('fee') ||
    clean.includes('paid')
  ) {
    category = 'expense';
  }

  const result = {
    category,
    dogId: targetDog?.id || '',
    dogName: targetDog?.name || 'Bruno',
    confidence: 90,
    adminDate: effectiveDate,
  };

  const batchMatch = text.match(/(?:batch|lot)\s*(?:code|no|number|#)?\s*[:\-]?\s*([a-zA-Z0-9\-]+)/i);
  if (batchMatch) {
    result.batchNumber = batchMatch[1].trim();
  }

  if (clean.includes('cessna')) {
    result.clinicName = 'Cessna Lifeline Veterinary Hospital';
  }

  const vetMatch = text.match(/(?:dr\.?|doctor)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (vetMatch) {
    result.vetName = `Dr. ${vetMatch[1].trim()}`;
  }

  if (category === 'vaccine') {
    if (clean.includes('rabies') || clean.includes('anti-rabies')) {
      result.vaccineKey = 'rabies';
      result.vaccineName = 'Anti-Rabies';
    }
  } else if (category === 'deworming') {
    result.dewormingMed = clean.includes('kiwof') ? 'Kiwof Plus' : 'Drontal Plus';
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kgs)/i);
    if (weightMatch) result.weightKg = parseFloat(weightMatch[1]);
  } else if (category === 'tick_flea') {
    result.tickBrand = clean.includes('bravecto') ? 'Bravecto Chewable (90-day)' : 'Simparica Chewable (30-day)';
  } else if (category === 'medication') {
    result.medName = clean.includes('amoxicillin') ? 'Amoxicillin' : 'Prescribed Medication';
    result.isAntibiotic = clean.includes('amoxicillin');
    result.frequency = clean.includes('twice') ? 'twice_daily' : 'once_daily';
  } else if (category === 'expense') {
    const amtMatch = text.match(/(?:rs\.?|inr|rupees|₹|\bcost\b|\bspent\b|\bpaid\b)\s*[:\-]?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
      text.match(/(\d+)\s*(?:rupees|rs|inr)/i);
    if (amtMatch) result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    result.expenseCategory = clean.includes('medicine') ? 'medication' : 'consultation';
  }

  return result;
}

const mockDogs = [{ id: 'dog_1', name: 'Bruno', weightKg: 28 }];

test('Voice Entry Parser: Vaccine extraction', () => {
  const parsed = parseVoiceTranscript(
    'Bruno received Anti-Rabies vaccination today, batch code R9012, at Cessna Lifeline Dr. Rao',
    mockDogs,
    mockDogs[0],
    '2026-10-24'
  );
  assert.equal(parsed.category, 'vaccine');
  assert.equal(parsed.dogName, 'Bruno');
  assert.equal(parsed.vaccineKey, 'rabies');
  assert.equal(parsed.batchNumber, 'R9012');
  assert.equal(parsed.clinicName, 'Cessna Lifeline Veterinary Hospital');
  assert.equal(parsed.vetName, 'Dr. Rao');
});

test('Voice Entry Parser: Deworming extraction', () => {
  const parsed = parseVoiceTranscript(
    'Drontal Plus deworming tablet given to Bruno today, weight 28kg',
    mockDogs,
    mockDogs[0],
    '2026-10-24'
  );
  assert.equal(parsed.category, 'deworming');
  assert.equal(parsed.dewormingMed, 'Drontal Plus');
  assert.equal(parsed.weightKg, 28);
});

test('Voice Entry Parser: Tick and Flea extraction', () => {
  const parsed = parseVoiceTranscript(
    'Gave Bruno Simparica chewable for tick and flea today next due in 30 days',
    mockDogs,
    mockDogs[0],
    '2026-10-24'
  );
  assert.equal(parsed.category, 'tick_flea');
  assert.equal(parsed.tickBrand, 'Simparica Chewable (30-day)');
});

test('Voice Entry Parser: Medication antibiotic extraction', () => {
  const parsed = parseVoiceTranscript(
    'Started Amoxicillin 250mg twice daily for 5 days for minor skin infection',
    mockDogs,
    mockDogs[0],
    '2026-10-24'
  );
  assert.equal(parsed.category, 'medication');
  assert.equal(parsed.medName, 'Amoxicillin');
  assert.equal(parsed.isAntibiotic, true);
  assert.equal(parsed.frequency, 'twice_daily');
});

test('Voice Entry Parser: Expense extraction', () => {
  const parsed = parseVoiceTranscript(
    'Paid 1500 rupees consultation and ear cleaning fee at Cessna Lifeline',
    mockDogs,
    mockDogs[0],
    '2026-10-24'
  );
  assert.equal(parsed.category, 'expense');
  assert.equal(parsed.amount, 1500);
  assert.equal(parsed.expenseCategory, 'consultation');
  assert.equal(parsed.clinicName, 'Cessna Lifeline Veterinary Hospital');
});
