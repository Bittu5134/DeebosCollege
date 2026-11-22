import { useState, useEffect } from 'react';
import PredictorForm from './components/PredictorForm';
import RecommendationsList from './components/RecommendationsList';
import QuestionnaireWizard from './components/QuestionnaireWizard';
import StatsDashboardModal from './components/StatsDashboardModal';
import AuthModal from './components/AuthModal';
import LegalPage from './components/LegalPage';
import { BarChart3 } from 'lucide-react';
import alphajeeLogo from './assets/logo.png';


const getSessionJSON = (key) => {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

export default function App() {
  const [view, setView] = useState(() => sessionStorage.getItem('bw_view') || 'form');
  const [previousView, setPreviousView] = useState(() => sessionStorage.getItem('bw_prev_view') || 'form');
  const [loading, setLoading] = useState(false);
  const [userInputs, setUserInputs] = useState(() => getSessionJSON('bw_userInputs'));
  const [results, setResults] = useState(() => getSessionJSON('bw_results'));
  const [questions, setQuestions] = useState([]);
  const [initialProfile, setInitialProfile] = useState(null);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('alpha_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('alpha_token') || null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);


  useEffect(() => {
    sessionStorage.setItem('bw_view', view);
  }, [view]);
  useEffect(() => {
    sessionStorage.setItem('bw_prev_view', previousView);
  }, [previousView]);
  useEffect(() => {
    if (userInputs) sessionStorage.setItem('bw_userInputs', JSON.stringify(userInputs));
  }, [userInputs]);
  useEffect(() => {
    if (results) sessionStorage.setItem('bw_results', JSON.stringify(results));
  }, [results]);

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (data) => {
    setToken(data.access_token);
    setUser(data.user);
  };

  const handleSignOut = () => {
    localStorage.removeItem('alpha_token');
    localStorage.removeItem('alpha_user');
    setToken(null);
    setUser(null);
  };


  const getBackendCategory = (category, gender) => {
    let catPrefix;
    if (category === "General") catPrefix = "OPEN";
    else if (category === "OBC-NCL") catPrefix = "OBC_NCL";
    else if (category === "SC") catPrefix = "SC";
    else if (category === "ST") catPrefix = "ST";
    else if (category === "EWS") catPrefix = "EWS";
    else catPrefix = category;

    const isFemale = gender === "Female";
    return catPrefix + (isFemale ? "_Female" : "_Gender_Neutral");
  };

  const handlePredict = async (inputs) => {
    setLoading(true);
    setUserInputs(inputs);


    try {
      const followupPayload = {
        query: inputs.preferences,
        homestate: inputs.homeState
      };

      const response = await fetch(`/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(followupPayload)
      });

      if (response.status === 401) {
        handleSignOut();
        alert("Your session has expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setInitialProfile(data.profile);
        setView('questionnaire');
      } else {

        await handleFetchRecommendations(inputs, data.profile);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("Could not reach the recommendation service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRecommendations = async (inputs, profileObj) => {
    setLoading(true);
    const backendCategory = getBackendCategory(inputs.category, inputs.gender);

    const payload = {
      rank: inputs.rank,
      adv_rank: inputs.advRank || null,
      query: inputs.preferences,
      category: backendCategory,
      homestate: inputs.homeState,
      exam_type: inputs.examType || "Mains",
      profile: profileObj
    };

    try {
      const response = await fetch(`/api/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleSignOut();
        alert("Your session has expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setView('results');
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      alert("Could not reach the recommendation service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionnaireSubmit = async (completedProfile) => {
    await handleFetchRecommendations(userInputs, completedProfile);
  };

  const handleRefinePreferences = async (newPreferences) => {
    const updatedInputs = { ...userInputs, preferences: newPreferences };
    setUserInputs(updatedInputs);
    await handleFetchRecommendations(updatedInputs, null);
  };


  const isDev = Boolean(user);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo" onClick={() => setView('form')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={alphajeeLogo} alt="BranchWise" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
          <span>Branch<span className="logo-highlight">Wise</span> <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '4px' }}>College Predictor</span></span>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          {user ? (
            <div className="user-profile-menu" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isDev && (
                <button className="stats-dashboard-trigger-btn" onClick={() => setShowStatsModal(true)}>
                  <BarChart3 size={16} /> <span className="hide-mobile">Dashboard</span>
                </button>
              )}
              <div className="avatar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={user.profile?.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                  alt={user.profile?.display_name || user.username}
                  className="user-avatar"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--primary-green)' }}
                />
                <span className="user-name-display" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {user.profile?.display_name || user.username}
                </span>
                <button className="sign-out-btn-small" onClick={handleSignOut}>Sign Out</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

              <button className="sign-in-btn" onClick={handleSignIn}>
                Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="predictor-main">
          <div className="loader-wrapper">
            <div className="spinner"></div>
            <span className="loader-text">Analyzing preferences with our RAG Engine...</span>
          </div>
        </div>
      ) : view === 'form' ? (
        <PredictorForm
          onSubmit={handlePredict}
          loading={loading}
        />
      ) : view === 'questionnaire' ? (
        <QuestionnaireWizard
          questions={questions}
          initialProfile={initialProfile}
          onSubmit={handleQuestionnaireSubmit}
          onCancel={() => setView('form')}
          onSkipAll={() => handleQuestionnaireSubmit(initialProfile)}
        />
      ) : view === 'privacy' || view === 'terms' ? (
        <LegalPage
          type={view}
          onBack={() => setView(previousView)}
        />
      ) : (
        <RecommendationsList
          results={results}
          userInputs={userInputs}
          token={token}
          onEdit={() => setView('form')}
          onRefinePreferences={handleRefinePreferences}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
      <StatsDashboardModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        token={token}
      />

      {/* Footer */}
      <footer className="footer">
        <span>© 2026 BranchWise. MERITVERSE PRIVATE LIMITED.</span>
        <span className="footer-devs" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Devs: Yash Akarsh and Samarth Ravishankar</span>
        <div className="footer-links">
          <a href="#privacy" onClick={(e) => {
            e.preventDefault();
            if (view !== 'privacy' && view !== 'terms') setPreviousView(view);
            setView('privacy');
          }}>Privacy Policy</a>
          <a href="#terms" onClick={(e) => {
            e.preventDefault();
            if (view !== 'privacy' && view !== 'terms') setPreviousView(view);
            setView('terms');
          }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
