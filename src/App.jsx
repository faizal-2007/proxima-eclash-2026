import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SplitHero } from './components/SplitHero';
import { LandingSections } from './components/LandingSections';
import { Footer } from './components/Footer';
import { Intro3DOverlay } from './components/Intro3DOverlay';
import { RegistrationPage } from './pages/RegistrationPage';
import { SuccessPage } from './pages/SuccessPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { VolunteerLoginPage } from './pages/VolunteerLoginPage';
import { VolunteerScannerDashboard } from './pages/VolunteerScannerDashboard';
import { VolunteerHistoryPage } from './pages/VolunteerHistoryPage';
import { getStoredVolunteerToken, isTokenExpired } from './utils/volunteerAuth';

export function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'register' | 'success' | 'admin' | 'volunteer-login' | 'volunteer-dashboard' | 'volunteer-history'
  const [registrationData, setRegistrationData] = useState(null);
  const [introFinished, setIntroFinished] = useState(false);
  const [introKey, setIntroKey] = useState(0);

  const handleReplayIntro = () => {
    sessionStorage.removeItem('has_seen_proxima_intro');
    setIntroFinished(false);
    setIntroKey((k) => k + 1);
  };

  // Sync with browser hash and pathname on initial load & popstate
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (
        pathname === '/volunteer/login' ||
        hash === '#volunteer/login' ||
        hash === '#volunteer-login'
      ) {
        setCurrentView('volunteer-login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (
        pathname === '/volunteer/history' ||
        hash === '#volunteer/history'
      ) {
        const token = getStoredVolunteerToken();
        if (!token || isTokenExpired(token)) {
          window.location.hash = '#volunteer/login';
          setCurrentView('volunteer-login');
        } else {
          setCurrentView('volunteer-history');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (
        pathname === '/volunteer' ||
        hash === '#volunteer' ||
        hash === '#volunteer/scanner'
      ) {
        const token = getStoredVolunteerToken();
        if (!token || isTokenExpired(token)) {
          window.location.hash = '#volunteer/login';
          setCurrentView('volunteer-login');
        } else {
          setCurrentView('volunteer-dashboard');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#register' || hash === '#register-eclash') {
        setCurrentView('register');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#admin') {
        setCurrentView('admin');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!hash || hash === '#' || hash === '#home') {
        setCurrentView('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // CTA navigation handler from Navbar or Hero
  const handleOpenRegistration = () => {
    window.location.hash = '#register';
    setCurrentView('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (hash) => {
    if (hash === '#register' || hash === '#register-eclash') {
      handleOpenRegistration();
    } else if (hash === '#admin') {
      window.location.hash = '#admin';
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (
      hash === '#volunteer' ||
      hash === '#volunteer/login' ||
      hash === '#volunteer-login' ||
      hash === '#scanner'
    ) {
      const token = getStoredVolunteerToken();
      if (token && !isTokenExpired(token)) {
        window.location.hash = '#volunteer';
        setCurrentView('volunteer-dashboard');
      } else {
        window.location.hash = '#volunteer/login';
        setCurrentView('volunteer-login');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#volunteer/history') {
      const token = getStoredVolunteerToken();
      if (!token || isTokenExpired(token)) {
        window.location.hash = '#volunteer/login';
        setCurrentView('volunteer-login');
      } else {
        window.location.hash = '#volunteer/history';
        setCurrentView('volunteer-history');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      try {
        if (currentView !== 'home') {
          setCurrentView('home');
          window.location.hash = '';
          setTimeout(() => {
            try {
              const el = document.querySelector(hash);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } catch {
              // Ignore invalid selector
            }
          }, 100);
        } else {
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      } catch {
        // Ignore invalid CSS selector
      }
    }
  };

  const handleRegistrationSuccess = (data) => {
    setRegistrationData(data);
    setCurrentView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#05071a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative">
      {/* 3D Cinematic Opening Experience (Only on public event pages; disabled on volunteer staff pages) */}
      {!currentView.startsWith('volunteer') && (
        <Intro3DOverlay key={introKey} onComplete={() => setIntroFinished(true)} />
      )}

      {/* Render Current View */}
      {currentView === 'register' && (
        <RegistrationPage
          onBack={handleBackToHome}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {currentView === 'success' && (
        <SuccessPage
          registrationData={registrationData}
          onBackToHome={handleBackToHome}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onBack={handleBackToHome}
        />
      )}

      {currentView === 'volunteer-login' && (
        <VolunteerLoginPage
          onSuccess={() => {
            window.location.hash = '#volunteer';
            setCurrentView('volunteer-dashboard');
          }}
          onBackToHome={handleBackToHome}
        />
      )}

      {currentView === 'volunteer-dashboard' && (
        <VolunteerScannerDashboard
          onLogout={() => {
            window.location.hash = '#volunteer/login';
            setCurrentView('volunteer-login');
          }}
          onNavigateHistory={() => {
            window.location.hash = '#volunteer/history';
            setCurrentView('volunteer-history');
          }}
        />
      )}

      {currentView === 'volunteer-history' && (
        <VolunteerHistoryPage
          onBackToDashboard={() => {
            window.location.hash = '#volunteer';
            setCurrentView('volunteer-dashboard');
          }}
        />
      )}

      {currentView === 'home' && (
        <>
          {/* Shared Navbar */}
          <Navbar onNavigate={handleNavigate} />

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Esports Championship Hero Arena Section with Parallax & 3D Tilt */}
            <SplitHero onSelectTrack={handleOpenRegistration} isIntroActive={!introFinished} />

            {/* Below-Hero Content Sections: About, Games, Schedule, Prizes, Rules/FAQ, Contact */}
            <LandingSections onSelectTrack={handleOpenRegistration} />
          </main>

          {/* Shared Footer */}
          <Footer onNavigate={handleNavigate} onReplayIntro={handleReplayIntro} />
        </>
      )}
    </div>
  );
}

export default App;
