import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider, useI18n } from './i18n/context';
import { TopBar } from './components/TopBar';
import { Navigation, NavTab } from './components/Navigation';
import { HomeScreen } from './screens/HomeScreen';
import { DogsScreen } from './screens/DogsScreen';
import { RecordsScreen } from './screens/RecordsScreen';
import { CareScreen } from './screens/CareScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { TimeSimulatorModal } from './components/TimeSimulatorModal';
import { AddRecordModal } from './components/AddRecordModal';
import { PetPassportModal } from './components/PetPassportModal';
import { VetVisitSummaryModal } from './components/VetVisitSummaryModal';
import { EmergencyDirectoryModal } from './components/EmergencyDirectoryModal';
import { LostDogModal } from './components/LostDogModal';
import { AuthModal } from './components/AuthModal';
import { HouseholdManagerModal } from './components/HouseholdManagerModal';
import { VetVerificationModal } from './components/VetVerificationModal';
import { VetReviewView } from './components/VetReviewView';
import { HandoverModal } from './components/HandoverModal';
import { HandoverClaimView } from './components/HandoverClaimView';
import { SocietyPortalModal } from './components/SocietyPortalModal';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { VoiceRecordModal } from './components/VoiceRecordModal';
import { LegalModal } from './components/LegalModal';
import { LoginSyncScreen } from './screens/LoginSyncScreen';
import { SplashScreen } from './components/SplashScreen';
import { CareHandoverPDFModal } from './components/CareHandoverPDFModal';

function parseAppHash(hash: string): {
  type: 'tab' | 'vet-verify' | 'handover';
  tab: NavTab;
  token?: string;
} {
  const clean = hash.replace(/^#\/?/, '').trim();
  if (clean.startsWith('vet-verify/')) {
    return { type: 'vet-verify', tab: 'home', token: clean.replace('vet-verify/', '') };
  }
  if (clean.startsWith('handover/')) {
    return { type: 'handover', tab: 'home', token: clean.replace('handover/', '') };
  }
  const tabPart = clean.split('/')[0].toLowerCase();
  if (tabPart === 'dogs') return { type: 'tab', tab: 'dogs' };
  if (tabPart === 'records') return { type: 'tab', tab: 'records' };
  if (tabPart === 'care') return { type: 'tab', tab: 'care' };
  if (tabPart === 'more' || tabPart === 'settings') return { type: 'tab', tab: 'more' };
  return { type: 'tab', tab: 'home' };
}

function MainApp() {
  const {
    settings,
    isLoading,
    isOnboardingOpen,
    setIsOnboardingOpen,
    urgentOverdueItems,
  } = useApp();
  const { language, setLanguage } = useI18n();

  // Client-side Hash Router: maps directly to URLs like #/home, #/dogs, #/records, #/care, #/more
  const [route, setRoute] = useState(() => parseAppHash(window.location.hash));
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseAppHash(window.location.hash);
      setRoute(parsed);
      window.scrollTo(0, 0);
      const mainEl = document.querySelector('.main-content');
      if (mainEl) mainEl.scrollTop = 0;
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Normalize empty or root hash to #/home without breaking browser history
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.history.replaceState(null, '', '#/home');
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const handleTabChange = (tab: NavTab) => {
    window.location.hash = `#/${tab}`;
    window.scrollTo(0, 0);
    const mainEl = document.querySelector('.main-content');
    if (mainEl) mainEl.scrollTop = 0;
  };

  const [isTimeSimulatorOpen, setIsTimeSimulatorOpen] = useState(false);
  const [isAddDogModalOpen, setIsAddDogModalOpen] = useState(false);

  // Phase 2 feature modals
  const [isPetPassportOpen, setIsPetPassportOpen] = useState(false);
  const [isVisitSummaryOpen, setIsVisitSummaryOpen] = useState(false);
  const [isEmergencyDirectoryOpen, setIsEmergencyDirectoryOpen] = useState(false);
  const [isLostDogOpen, setIsLostDogOpen] = useState(false);

  // Phase 3 feature modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [isVetVerificationOpen, setIsVetVerificationOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isSocietyOpen, setIsSocietyOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Voice entry & Phase 4 feature modals
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isCareHandoverPDFOpen, setIsCareHandoverPDFOpen] = useState(false);
  const [legalModalState, setLegalModalState] = useState<{
    isOpen: boolean;
    tab: 'privacy' | 'terms' | 'dpdp';
  }>({
    isOpen: false,
    tab: 'privacy',
  });

  // Add record modal state
  const [addRecordState, setAddRecordState] = useState<{
    isOpen: boolean;
    initialType?: 'vaccine' | 'deworming' | 'tick_flea';
    presetVaccineKey?: string;
    presetDoseNumber?: number;
  }>({
    isOpen: false,
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  // Keep i18n in sync with settings
  useEffect(() => {
    if (settings.language && settings.language !== language) {
      setLanguage(settings.language);
    }
  }, [settings.language]);

  if (isLoading) {
    return (
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--accent-amber)',
          fontSize: '1.2rem',
          fontWeight: 700,
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '2rem', animation: 'spin 1.5s infinite linear' }}>🐾</div>
        <span>PawLedger Loading...</span>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} durationMs={3000} />;
  }

  // Check for external route: Vet Review
  if (route.type === 'vet-verify' && route.token) {
    return (
      <div className="app-container">
        <VetReviewView token={route.token} onExit={() => (window.location.hash = '#/home')} />
      </div>
    );
  }

  // Check for external route: Handover Claim
  if (route.type === 'handover' && route.token) {
    return (
      <div className="app-container">
        <HandoverClaimView token={route.token} onExit={() => (window.location.hash = '#/home')} />
      </div>
    );
  }

  // Initial Entry Screen: Login / Sync is the very first page shown whenever app is opened or refreshed
  if (!hasEnteredApp && route.type === 'tab') {
    return (
      <div className="app-container">
        <LoginSyncScreen
          onEnterHome={() => {
            setHasEnteredApp(true);
            window.location.hash = '#/home';
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <TopBar
        onOpenTimeSimulator={() => setIsTimeSimulatorOpen(true)}
        onOpenAddDog={() => setIsAddDogModalOpen(true)}
      />

      {/* Main Screen Body: Each page renders completely separately */}
      <main className="main-content" id="main-content-scroll">
        {route.tab === 'home' && (
          <HomeScreen
            onOpenAddRecord={(type, vKey, dose) =>
              setAddRecordState({
                isOpen: true,
                initialType: type,
                presetVaccineKey: vKey,
                presetDoseNumber: dose,
              })
            }
            onNavigateTab={handleTabChange}
            onOpenPetPassport={() => setIsPetPassportOpen(true)}
            onOpenVisitSummary={() => setIsVisitSummaryOpen(true)}
            onOpenEmergencyDirectory={() => setIsEmergencyDirectoryOpen(true)}
            onOpenLostDog={() => setIsLostDogOpen(true)}
            onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
            onOpenCareHandoverPDF={() => setIsCareHandoverPDFOpen(true)}
          />
        )}

        {route.tab === 'dogs' && (
          <DogsScreen onOpenAddDog={() => setIsAddDogModalOpen(true)} />
        )}

        {route.tab === 'records' && (
          <RecordsScreen
            onOpenAddRecord={(type, vKey, dose) =>
              setAddRecordState({
                isOpen: true,
                initialType: type,
                presetVaccineKey: vKey,
                presetDoseNumber: dose,
              })
            }
            onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
            onOpenCareHandoverPDF={() => setIsCareHandoverPDFOpen(true)}
          />
        )}

        {route.tab === 'care' && <CareScreen />}

        {route.tab === 'more' && (
          <SettingsScreen
            onOpenTimeSimulator={() => setIsTimeSimulatorOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenHousehold={() => setIsHouseholdOpen(true)}
            onOpenVetVerification={() => setIsVetVerificationOpen(true)}
            onOpenHandover={() => setIsHandoverOpen(true)}
            onOpenCareHandoverPDF={() => setIsCareHandoverPDFOpen(true)}
            onOpenSociety={() => setIsSocietyOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenLegal={(tab) => setLegalModalState({ isOpen: true, tab: tab || 'privacy' })}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <Navigation
        currentTab={route.tab}
        onTabChange={handleTabChange}
        urgentCount={urgentOverdueItems.length}
      />

      {/* Core Modals */}
      <OnboardingModal
        isOpen={isOnboardingOpen || isAddDogModalOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          setIsAddDogModalOpen(false);
        }}
      />

      <TimeSimulatorModal
        isOpen={isTimeSimulatorOpen}
        onClose={() => setIsTimeSimulatorOpen(false)}
      />

      <AddRecordModal
        isOpen={addRecordState.isOpen}
        onClose={() => setAddRecordState({ isOpen: false })}
        initialType={addRecordState.initialType}
        presetVaccineKey={addRecordState.presetVaccineKey}
        presetDoseNumber={addRecordState.presetDoseNumber}
      />

      {/* Phase 2 Modals */}
      <PetPassportModal
        isOpen={isPetPassportOpen}
        onClose={() => setIsPetPassportOpen(false)}
      />

      <VetVisitSummaryModal
        isOpen={isVisitSummaryOpen}
        onClose={() => setIsVisitSummaryOpen(false)}
      />

      <EmergencyDirectoryModal
        isOpen={isEmergencyDirectoryOpen}
        onClose={() => setIsEmergencyDirectoryOpen(false)}
      />

      <LostDogModal
        isOpen={isLostDogOpen}
        onClose={() => setIsLostDogOpen(false)}
      />

      {/* Phase 3 Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <HouseholdManagerModal
        isOpen={isHouseholdOpen}
        onClose={() => setIsHouseholdOpen(false)}
      />

      <VetVerificationModal
        isOpen={isVetVerificationOpen}
        onClose={() => setIsVetVerificationOpen(false)}
      />

      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
      />

      <SocietyPortalModal
        isOpen={isSocietyOpen}
        onClose={() => setIsSocietyOpen(false)}
      />

      <AdminConsoleModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Voice Entry Modal */}
      <VoiceRecordModal
        isOpen={isVoiceEntryOpen}
        onClose={() => setIsVoiceEntryOpen(false)}
      />

      {/* Care Handover PDF Modal */}
      <CareHandoverPDFModal
        isOpen={isCareHandoverPDFOpen}
        onClose={() => setIsCareHandoverPDFOpen(false)}
      />

      <LegalModal
        isOpen={legalModalState.isOpen}
        onClose={() => setLegalModalState(prev => ({ ...prev, isOpen: false }))}
        initialTab={legalModalState.tab}
      />
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'hi' | 'kn' | 'ta'>('en');

  return (
    <AppProvider>
      <I18nProvider language={lang} setLanguage={setLang}>
        <MainApp />
      </I18nProvider>
    </AppProvider>
  );
}
