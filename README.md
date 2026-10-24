# PawLedger 🐾
### Dog Health & Vaccination Tracker (Bengaluru & India First)

**PawLedger** is a standalone, offline-first, mobile-first Progressive Web Application (PWA) with a dedicated Node.js/TypeScript backend, specifically engineered for dog owners in India (starting with Bengaluru). It eliminates dependency on proprietary, ad-heavy pet platforms and provides a private, sovereign digital health record for dogs.

---

## 🏗️ Architecture & Technical Decisions

1. **Frontend (`/client`)**:
   - **Framework**: React 19 + TypeScript + Vite.
   - **Styling**: Modern, curated **Vanilla CSS** design system (HSL color tokens, dark/light themes, smooth gradients, subtle micro-animations, touch targets ≥ 48px, WCAG AA compliance). Zero TailwindCSS.
   - **Storage**: IndexedDB (`idb`) local storage engine for 100% offline functionality.
   - **Internationalization (i18n)**: English (`en`), Hindi (`hi` - हिंदी), Kannada (`kn` - ಕನ್ನಡ), and Tamil (`ta` - தமிழ்).
   - **PWA**: Installable web app with Service Worker and offline caching.

2. **Backend (`/server`)**:
   - **Runtime**: Node.js + Express + TypeScript.
   - **Persistence**: High-reliability atomic JSON persistence engine (`pawledger.db.json`) with indexed collections and tamper-evident audit logs.
   - **Security**: Rate-limited phone OTP authentication, brute-force lockout, short-lived JWT access tokens + refresh tokens, multi-device session revocation, strict CORS.
   - **Privacy**: Compliant with India's **Digital Personal Data Protection (DPDP) Act, 2023** (purpose limitation, explicit affirmative consent, right to erasure).

3. **Adapter Pattern (Swappable Third-Party Services)**:
   - **SMS & WhatsApp Gateway**: `ISMSAdapter` interface with `MockSMSAdapter` (logs to in-memory queue inspectable via Admin Console) and pluggable production slots for Gupshup, Twilio, or MSG91.
   - **Booklet Scanning OCR**: `IOCRAdapter` interface supporting both `TesseractOCRAdapter` (in-browser Web Worker OCR) and `MockOCRAdapter` (with realistic Indian vaccination card presets and confidence calibration).

---

## 🌟 All 18 Features Implemented

### 1. Core Differentiators
1. **Booklet Scanning (OCR)**: Snap or upload a photo of a vaccination card/sticker. Extracts vaccine type, dates, batch number, clinic, and vet. Calibrated confidence rating with amber warning borders for low-confidence (<70%) or handwritten fields. Stores photo proof directly in IndexedDB.
2. **Household WhatsApp/SMS Reminders**: Invite family members, dog walkers, or sitters by phone. Caregivers receive automated alerts without installing any app. Configurable quiet hours (default 22:00–07:00), dog filters, and opt-out handling.
3. **Vet-Verified Records**: Generate a 72-hour expiring verification link or QR code for your vet. Veterinarians review and verify records in a clean web portal without creating an account (`#/vet-verify/:token`). Verified entries display a green badge and audit timestamp.
4. **One-Tap Pet Passport**: Comprehensive printable layout and revocable QR web pass featuring photo, breed, microchip number, verified vaccine badges, and emergency owner contacts.
5. **Smart Schedule Engine**: WSAVA-aligned JSON rules tailored for India (DHPPiL 7-in-1/9-in-1 puppy series, annual boosters, Anti-Rabies, Canine Coronavirus, Kennel Cough Bordetella, deworming, tick/flea). Automatic late-dose recalculation ensuring safe minimum intervals.

### 2. Daily-Use Features
6. **Missed-Dose Recovery**: Empathetic, plain-language guidance explaining why timing matters, plus a checklist of specific questions to ask the vet. Zero prescription or diagnostic claims.
7. **Seasonal Alerts by City**: Real-time environmental warnings for Bengaluru (Monsoon tick/flea surge warnings, summer asphalt heatwalk cautions, quarterly deworming cycles) driven by an editable city config.
8. **Trend Flags**: Proactive monitoring for weight, appetite, and symptoms. Flags significant changes (e.g. >10% weight drop in 30 days) formatted with neutral "worth mentioning to your vet" pointers.
9. **Vet Visit Summary**: 1-page printable / PDF summary of the last 3 months (weight trajectory, recent vaccines, active medications, symptoms, and pre-visit questions).
10. **Medication Courses**: Track course completion with progress bars, refill date reminders, and prominent warnings for antibiotics (*"Finish the entire course to prevent antimicrobial resistance"*).
11. **Voice-to-Record Assistant**: Hands-free voice logger calibrated for Indian English and veterinary terminology (anti-rabies, DHPPiL, Drontal Plus, Kiwof Plus, Simparica, Cessna Lifeline, etc.). Automatically extracts vaccine, deworming, medication, or expense entries with confidence indicators and interactive editing before saving.

### 3. Community and Local
11. **Vet & Emergency Directory**: Offline database of 24x7 Bengaluru emergency veterinary hospitals (Cessna Lifeline Domlur/Whitefield, CUPA, Sanjeevani, CARE) with 1-tap `tel:` calling and custom clinic additions.
12. **Lost-Dog Emergency Mode**: 1-tap generation of a high-contrast RED missing poster (photo, microchip, identifying marks, last seen location, owner phone) + ready-to-broadcast WhatsApp alert message.
13. **Society / Community Mode**: Apartment Resident Welfare Association (RWA) portal. Shows status-level compliance only (`Valid`, `Due Soon`, `Overdue`) for opted-in dogs. Private medical notes, weights, and bills are strictly redacted under DPDP Act principles.
14. **Adoption / Foster Handover**: Transfer complete pet profile and immutable medical history to a new owner or foster caregiver via a secure 6-character claim token (`#/handover/:token`).

### 4. Trust and Practicality
15. **Offline-First & Local Storage**: Works 100% offline in IndexedDB. Includes portable JSON backup export and instant restore.
16. **Multi-Language UI**: Externalized dictionary supporting English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), and Tamil (தமிழ்).
17. **Expense & Pet Insurance Tracking**: Log medical bills, food, and grooming expenses, attach bill photos, track pet insurance claims (not claimed, submitted, settled, rejected), and view annual cost breakdowns.
18. **Multi-Dog Households**: Header profile switcher, multi-dog management, and cross-dog "Due This Month" dashboard.

---

## 🚀 Setup & Running Locally

### Prerequisites
- **Node.js**: >= 18.0.0 (Tested on Node v24.22.1)
- **npm**: >= 9.0.0

### Installation
Clone the repository and install dependencies:
```bash
# In the project root
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Running Both Servers Concurrently
Start the Express backend and Vite frontend:
```bash
npm run dev:server   # Starts Express API on http://localhost:4000
npm run dev:client   # Starts Vite PWA on http://localhost:5173
```
- Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Test Suites

PawLedger includes three specialized test suites covering schedule math, backend APIs, and end-to-end OCR heuristics:

```bash
# Run all test suites
npm run test:all

# Or run individual suites:
npm run test:schedule   # Unit tests for pure WSAVA schedule engine & late dose recalculations
npm run test:backend    # Integration tests for OTP auth, household pings, vet verification, society portal
npm run test:e2e        # E2E tests for booklet OCR heuristics, confidence scoring, DPDP safeguards
```

---

## ⏰ Time Simulator (Testing Overdue Schedules)

To test how schedules and overdue banners behave over time without waiting months:
1. Click the **Date Simulator** button in the top navigation bar (`Sim: YYYY-MM-DD`) or in the **More** tab.
2. Fast-forward the date by 1 month, 6 months, or 1 year.
3. Observe automatic updates across the "Due This Month" list, overdue warning cards, and missed-dose recovery guidance.
4. Click **Reset to Today** anytime to restore the real system date.

---

## 📋 What You Need to Configure Yourself (Production Deployment)

When deploying PawLedger to production, replace the local mock adapters with your production credentials:

1. **SMS & WhatsApp Gateway**:
   - Register DLT templates for transactional SMS in India (TRAI mandate).
   - In `.env`, set `SMS_GATEWAY_ADAPTER=gupshup` (or `twilio`) and provide `SMS_API_KEY` and `SMS_SENDER_ID`.
2. **Cloud OCR Service (Optional for High-Volume)**:
   - The default configuration uses client-side on-device Tesseract.js. For cloud-assisted server-side OCR on high-resolution camera images, configure `OCR_ADAPTER=google_cloud_vision` and supply `OCR_API_KEY`.
3. **Domain, SSL & Hosting**:
   - Progressive Web Apps require HTTPS for Service Worker registration and camera capture permissions (`navigator.mediaDevices.getUserMedia`).
   - Recommended hosting: Vercel / Cloudflare Pages for `/client`, Render / Railway / AWS EC2 for `/server`.
4. **JWT Secrets**:
   - Replace `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env` with cryptographically secure 256-bit keys.

---

## ⚖️ Professional & Legal Review Requirements

1. **Veterinary Review**:
   - All vaccination intervals, core vs. non-core classifications, puppy schedules, and deworming frequencies in `client/src/data/vaccineRules.json` are general veterinary recommendations based on WSAVA guidelines and Indian clinical consensus. They must be formally reviewed and signed off by a licensed Veterinary Physician (BVSc & AH / MVSc registered with the Veterinary Council of India) for any state-specific variations.
2. **Legal & DPDP Compliance Review**:
   - The privacy terms, explicit consent prompts, and right to erasure flows are designed in accordance with the **Digital Personal Data Protection Act (DPDP), 2023**. Prior to commercial launch, have your privacy policy and terms of service reviewed by legal counsel specializing in Indian data protection law.
