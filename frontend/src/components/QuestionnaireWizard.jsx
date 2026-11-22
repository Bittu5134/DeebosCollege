import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';

export default function QuestionnaireWizard({
  questions,
  initialProfile,
  onSubmit,
  onCancel,
  onSkipAll
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profile, setProfile] = useState({ ...initialProfile });

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length;
  const progressPercent = questions.length > 0 
    ? Math.round((currentIndex / questions.length) * 100) 
    : 100;

  const handleAnswer = (value) => {
    if (!currentQuestion) return;
    
    
    setProfile(prev => ({
      ...prev,
      [currentQuestion.field]: value
    }));
    
    
    setCurrentIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleAnswer(false); 
  };

  const handleFinish = () => {
    onSubmit(profile);
  };

  
  const getFieldLabel = (field) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="predictor-main">
      <div className="predictor-card questionnaire-card">
        <div className="wizard-header">
          <div className="logo-sparkles">
            <Sparkles size={16} className="text-green animate-pulse" />
            <span>AI Preference Tuner</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!isLastQuestion && (
              <button 
                type="button" 
                className="skip-all-header-btn"
                onClick={onSkipAll}
              >
                Skip All
              </button>
            )}
            <span className="step-counter">
              {!isLastQuestion ? `Question ${currentIndex + 1} of ${questions.length}` : 'Profile Ready'}
            </span>
          </div>
        </div>

        {}
        <div className="progress-bar-wrapper">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {!isLastQuestion ? (
          <div className="wizard-body">
            {}
            <div className="question-field-badge">
              {getFieldLabel(currentQuestion.field)} Preference
            </div>
            
            <h3 className="wizard-question-text">
              {currentQuestion.question}
            </h3>

            {}
            <div className="options-grid">
              <button 
                type="button" 
                className="option-card yes-option"
                onClick={() => handleAnswer(true)}
              >
                <div className="option-glow"></div>
                <div className="option-indicator"></div>
                <span className="option-title">{currentQuestion.yes_title || "Yes, absolutely"}</span>
                <span className="option-desc">{currentQuestion.yes_desc || "This is important for my college experience"}</span>
              </button>

              <button 
                type="button" 
                className="option-card no-option"
                onClick={() => handleAnswer(false)}
              >
                <div className="option-glow"></div>
                <div className="option-indicator"></div>
                <span className="option-title">{currentQuestion.no_title || "No, not critical"}</span>
                <span className="option-desc">{currentQuestion.no_desc || "I am okay with this being optional or absent"}</span>
              </button>
            </div>

            {}
            <div className="wizard-nav">
              <button 
                type="button" 
                className="nav-btn-secondary" 
                onClick={currentIndex === 0 ? onCancel : handleBack}
              >
                <ArrowLeft size={16} />
                {currentIndex === 0 ? 'Back to Form' : 'Previous'}
              </button>

              <button 
                type="button" 
                className="nav-btn-secondary skip-all-bottom-btn"
                onClick={onSkipAll}
                style={{ color: '#ff8a8a', borderColor: 'rgba(255, 138, 138, 0.2)' }}
              >
                Skip All Questions
              </button>

              <button 
                type="button" 
                className="nav-btn-secondary"
                onClick={handleSkip}
              >
                Skip Question
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="wizard-body finish-step">
            <div className="check-success-wrapper">
              <div className="check-success-circle">
                <Check size={36} className="text-green" />
              </div>
            </div>
            
            <h3 className="wizard-question-text" style={{ textAlign: 'center', marginBottom: '12px' }}>
              Your profile is fully tuned!
            </h3>
            
            <p className="wizard-description">
              Our Neural Engine has successfully compiled and aligned your customized academic preferences.
            </p>

            {}
            <div className="profile-summary-box">
              <span className="summary-title">Summary of Tuned Options</span>
              <div className="summary-grid">
                {questions.map((q, idx) => (
                  <div className="summary-item" key={idx}>
                    <span className="summary-field">{getFieldLabel(q.field)}:</span>
                    <span className={`summary-value ${profile[q.field] ? 'val-yes' : 'val-no'}`}>
                      {profile[q.field] ? 'Yes, Important' : 'No / Skipped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {}
            <button 
              type="button" 
              className="action-btn animate-pulse" 
              onClick={handleFinish}
              style={{ marginTop: '24px' }}
            >
              <Sparkles size={18} fill="currentColor" />
              Generate College Predictions
            </button>

            <button 
              type="button" 
              className="nav-btn-secondary" 
              onClick={handleBack}
              style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
            >
              <ArrowLeft size={16} />
              Tweak Answers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
