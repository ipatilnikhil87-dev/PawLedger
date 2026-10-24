import React from 'react';
import { Home, Dog, FileText, HeartPulse, Settings } from 'lucide-react';
import { useI18n } from '../i18n/context';

export type NavTab = 'home' | 'dogs' | 'records' | 'care' | 'more';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  urgentCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange, urgentCount = 0 }) => {
  const { t } = useI18n();

  const handleNavigate = (tab: NavTab, e: React.MouseEvent) => {
    e.preventDefault();
    onTabChange(tab);
  };

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
      <a
        href="#/home"
        className={`nav-item ${currentTab === 'home' ? 'active' : ''}`}
        onClick={(e) => handleNavigate('home', e)}
        id="nav-tab-home"
        style={{ position: 'relative', textDecoration: 'none' }}
        aria-current={currentTab === 'home' ? 'page' : undefined}
      >
        <Home size={22} />
        <span>{t('nav.home')}</span>
        {urgentCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '12px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-crimson)',
            }}
          />
        )}
      </a>

      <a
        href="#/dogs"
        className={`nav-item ${currentTab === 'dogs' ? 'active' : ''}`}
        onClick={(e) => handleNavigate('dogs', e)}
        id="nav-tab-dogs"
        style={{ textDecoration: 'none' }}
        aria-current={currentTab === 'dogs' ? 'page' : undefined}
      >
        <Dog size={22} />
        <span>{t('nav.dogs')}</span>
      </a>

      <a
        href="#/records"
        className={`nav-item ${currentTab === 'records' ? 'active' : ''}`}
        onClick={(e) => handleNavigate('records', e)}
        id="nav-tab-records"
        style={{ textDecoration: 'none' }}
        aria-current={currentTab === 'records' ? 'page' : undefined}
      >
        <FileText size={22} />
        <span>{t('nav.records')}</span>
      </a>

      <a
        href="#/care"
        className={`nav-item ${currentTab === 'care' ? 'active' : ''}`}
        onClick={(e) => handleNavigate('care', e)}
        id="nav-tab-care"
        style={{ textDecoration: 'none' }}
        aria-current={currentTab === 'care' ? 'page' : undefined}
      >
        <HeartPulse size={22} />
        <span>{t('nav.care')}</span>
      </a>

      <a
        href="#/more"
        className={`nav-item ${currentTab === 'more' ? 'active' : ''}`}
        onClick={(e) => handleNavigate('more', e)}
        id="nav-tab-more"
        style={{ textDecoration: 'none' }}
        aria-current={currentTab === 'more' ? 'page' : undefined}
      >
        <Settings size={22} />
        <span>{t('nav.more')}</span>
      </a>
    </nav>
  );
};
