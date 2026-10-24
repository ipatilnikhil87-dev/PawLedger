import rulesData from '../data/vaccineRules.json';
import { Dog, VaccineRecord, ScheduleItem, RecordStatus, DewormingRecord, TickFleaRecord } from '../types';

export interface MissedDoseGuidance {
  explanation: string;
  recommendedQuestionsForVet: string[];
  urgency: 'low' | 'moderate' | 'high';
}

/**
 * Pure date utility helpers
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const res = new Date(date.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const res = new Date(date.getTime());
  res.setMonth(res.getMonth() + months);
  return res;
}

export function diffInDays(targetDate: Date, fromDate: Date): number {
  const diffMs = targetDate.getTime() - fromDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function diffInWeeks(targetDate: Date, fromDate: Date): number {
  return Math.floor(diffInDays(targetDate, fromDate) / 7);
}

/**
 * Calculates current dog age in weeks and months
 */
export function getDogAge(dobStr: string, referenceDateStr?: string) {
  const dob = parseDate(dobStr);
  const refDate = referenceDateStr ? parseDate(referenceDateStr) : new Date();
  
  const totalDays = diffInDays(refDate, dob);
  const totalWeeks = Math.max(0, Math.floor(totalDays / 7));
  const months = Math.max(0, Math.floor(totalDays / 30.4375));
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  return {
    totalDays,
    totalWeeks,
    totalMonths: months,
    years,
    remMonths,
    formatted: years > 0 ? `${years}y ${remMonths}m` : `${months} months (${totalWeeks} weeks)`
  };
}

/**
 * Smart Schedule Engine:
 * Generates dynamic vaccine plan incorporating late dose shifts
 */
export function generateVaccineSchedule(
  dog: Dog,
  records: VaccineRecord[],
  currentDateStr: string = formatDate(new Date())
): ScheduleItem[] {
  const dob = parseDate(dog.dateOfBirth);
  const currentDate = parseDate(currentDateStr);
  const schedule: ScheduleItem[] = [];

  const dogRecords = records.filter(r => r.dogId === dog.id);

  for (const vaccineRule of rulesData.vaccines) {
    const existingDoses = dogRecords
      .filter(r => r.vaccineKey === vaccineRule.key)
      .sort((a, b) => a.doseNumber - b.doseNumber);

    const totalSeriesDoses = vaccineRule.doses.length;
    let lastAdministeredDate: Date | null = null;
    let lastAdministeredDoseNumber = 0;

    // Process puppy series doses
    for (let i = 0; i < vaccineRule.doses.length; i++) {
      const doseRule = vaccineRule.doses[i];
      const matchingRecord = existingDoses.find(r => r.doseNumber === doseRule.doseNumber);

      if (matchingRecord) {
        lastAdministeredDate = parseDate(matchingRecord.dateAdministered);
        lastAdministeredDoseNumber = doseRule.doseNumber;
        continue; // Already administered
      }

      // If dose is not yet administered, compute the due date:
      let calculatedDueDate: Date;

      if (i === 0 || !lastAdministeredDate) {
        // First dose or previous wasn't given yet: based on age
        calculatedDueDate = addWeeks(dob, doseRule.idealAgeWeeks);
      } else {
        // Late dose recovery calculation:
        // Dose must maintain minimum safety interval from the ACTUAL administered date of previous dose
        const minIntervalWeeks = doseRule.minIntervalWeeksFromPrevious || 3;
        const intervalBasedDate = addWeeks(lastAdministeredDate, minIntervalWeeks);
        const ageBasedDate = addWeeks(dob, doseRule.idealAgeWeeks);

        // Take whichever is later to ensure safe spacing
        calculatedDueDate = intervalBasedDate > ageBasedDate ? intervalBasedDate : ageBasedDate;
      }

      const daysUntilDue = diffInDays(calculatedDueDate, currentDate);
      let status: RecordStatus = 'valid';
      if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= 14) {
        status = 'due_soon';
      }

      schedule.push({
        vaccineKey: vaccineRule.key,
        vaccineName: vaccineRule.name,
        doseNumber: doseRule.doseNumber,
        totalDoses: totalSeriesDoses,
        dueDate: formatDate(calculatedDueDate),
        status,
        description: doseRule.label + ' — ' + doseRule.description,
        isCore: vaccineRule.category === 'core'
      });

      // Break after first pending series dose to keep schedule sequential
      break;
    }

    // If all puppy doses are completed, schedule next annual booster
    if (lastAdministeredDoseNumber >= totalSeriesDoses && lastAdministeredDate) {
      const nextBoosterDate = addMonths(lastAdministeredDate, vaccineRule.boosterIntervalMonths);
      const daysUntilDue = diffInDays(nextBoosterDate, currentDate);

      let status: RecordStatus = 'valid';
      if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= 30) {
        status = 'due_soon';
      }

      schedule.push({
        vaccineKey: vaccineRule.key,
        vaccineName: `${vaccineRule.name} (Annual Booster)`,
        doseNumber: lastAdministeredDoseNumber + 1,
        totalDoses: totalSeriesDoses + 1,
        dueDate: formatDate(nextBoosterDate),
        status,
        description: `Annual immunity booster (${vaccineRule.boosterIntervalMonths} months post last dose).`,
        isCore: vaccineRule.category === 'core'
      });
    }
  }

  // Sort schedule by dueDate ascending
  return schedule.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Calculates next deworming schedule
 */
export function getNextDewormingDate(
  dog: Dog,
  records: DewormingRecord[],
  currentDateStr: string = formatDate(new Date())
): { nextDueDate: string; status: RecordStatus; recommendation: string } {
  const currentDate = parseDate(currentDateStr);
  const dob = parseDate(dog.dateOfBirth);
  const ageWeeks = diffInWeeks(currentDate, dob);

  const dogRecords = records
    .filter(r => r.dogId === dog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const lastRecord = dogRecords[0];

  let nextDate: Date;
  let recommendation = '';

  if (lastRecord) {
    const lastDate = parseDate(lastRecord.dateAdministered);
    if (ageWeeks <= 12) {
      nextDate = addWeeks(lastDate, rulesData.dewormingSchedule.puppyIntervalWeeks);
      recommendation = 'Puppy protocol: deworm every 2 weeks.';
    } else if (ageWeeks <= 24) {
      nextDate = addWeeks(lastDate, rulesData.dewormingSchedule.youngIntervalWeeks);
      recommendation = 'Juvenile protocol: deworm every 4 weeks.';
    } else {
      nextDate = addMonths(lastDate, rulesData.dewormingSchedule.adultIntervalMonths);
      recommendation = 'Adult protocol: deworm every 3 months (or 2 months in peak monsoon).';
    }
  } else {
    // No record yet
    if (ageWeeks <= 12) {
      nextDate = currentDate;
      recommendation = 'Puppy protocol: start deworming course as soon as possible.';
    } else {
      nextDate = currentDate;
      recommendation = 'No deworming record found. Deworming recommended.';
    }
  }

  const daysUntilDue = diffInDays(nextDate, currentDate);
  let status: RecordStatus = 'valid';
  if (daysUntilDue < 0) {
    status = 'overdue';
  } else if (daysUntilDue <= 7) {
    status = 'due_soon';
  }

  return {
    nextDueDate: formatDate(nextDate),
    status,
    recommendation
  };
}

/**
 * Calculates next tick and flea treatment
 */
export function getNextTickFleaDate(
  dog: Dog,
  records: TickFleaRecord[],
  currentDateStr: string = formatDate(new Date())
): { nextDueDate: string; status: RecordStatus; recommendation: string } {
  const currentDate = parseDate(currentDateStr);
  const dogRecords = records
    .filter(r => r.dogId === dog.id)
    .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered));

  const lastRecord = dogRecords[0];
  let nextDate: Date;

  if (lastRecord) {
    const lastDate = parseDate(lastRecord.dateAdministered);
    const intervalDays = lastRecord.brandName.toLowerCase().includes('bravecto') ? 90 : 30;
    nextDate = addDays(lastDate, intervalDays);
  } else {
    nextDate = currentDate;
  }

  const daysUntilDue = diffInDays(nextDate, currentDate);
  let status: RecordStatus = 'valid';
  if (daysUntilDue < 0) {
    status = 'overdue';
  } else if (daysUntilDue <= 7) {
    status = 'due_soon';
  }

  return {
    nextDueDate: formatDate(nextDate),
    status,
    recommendation: 'Bengaluru has heavy tick/flea pressure year-round. Consistent protection prevents tick fever (Ehrlichia).'
  };
}

/**
 * Missed-Dose Recovery (Feature 6):
 * Plain-language explanation and questions to ask the vet without diagnosing or prescribing
 */
export function getMissedDoseGuidance(
  vaccineName: string,
  daysOverdue: number,
  isPuppySeries: boolean
): MissedDoseGuidance {
  if (isPuppySeries) {
    return {
      urgency: daysOverdue > 21 ? 'high' : 'moderate',
      explanation: `This dose of ${vaccineName} is ${daysOverdue} days overdue. In young puppies, maternal antibodies fade rapidly, leaving a window of vulnerability against Parvovirus and Distemper. When puppy series doses are delayed significantly, your vet might recommend repeating a dose to ensure protective antibody titers.`,
      recommendedQuestionsForVet: [
        `"Because ${vaccineName} was delayed by ${daysOverdue} days, can we continue the remaining series or do we need to restart the primary protocol?"`,
        `"Should we adjust the date of the next booster or Rabies shot to maintain a safe spacing?"`,
        `"Should I restrict visits to public dog parks (like Cubbon Park) until 2 weeks after this booster?"`
      ]
    };
  }

  return {
    urgency: daysOverdue > 60 ? 'high' : 'moderate',
    explanation: `This annual booster for ${vaccineName} is ${daysOverdue} days overdue. Adult dogs often maintain some residual immunity, but antibody levels decline over time, especially in high-density urban areas.`,
    recommendedQuestionsForVet: [
      `"Can we administer the overdue ${vaccineName} booster immediately?"`,
      `"Does my dog need an antibody titer test prior to vaccination?"`,
      `"Are there any other combination vaccines or deworming we should combine during this visit?"`
    ]
  };
}
