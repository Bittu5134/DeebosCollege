import { useState } from 'react';
import { Zap } from 'lucide-react';

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export default function PredictorForm({ onSubmit, loading }) {
  const [rank, setRank] = useState('');
  const [category, setCategory] = useState('General');
  const [homeState, setHomeState] = useState('');
  const [gender, setGender] = useState('Male');
  const [qualifiedAdv, setQualifiedAdv] = useState(false);
  const [advRank, setAdvRank] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rank || !homeState) {
      alert("Please fill in both Rank and Home State.");
      return;
    }
    if (qualifiedAdv && !advRank) {
      alert("Please enter your JEE Advanced Rank.");
      return;
    }
    onSubmit({
      rank: parseInt(rank, 10),
      advRank: qualifiedAdv ? parseInt(advRank, 10) : null,
      category,
      gender,
      homeState,
      preferences
    });
  };

  return (
    <div className="predictor-main" style={{ position: 'relative' }}>
      <form className="predictor-card" onSubmit={handleSubmit}>
        <h2 className="card-title">College Predictor</h2>

        <div className="form-grid">
          {}
          <div className="form-group">
            <label htmlFor="rank">JEE Mains Rank</label>
            <input
              id="rank"
              type="number"
              min="1"
              placeholder="Enter your rank"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              required
            />
          </div>

          {}
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General">General</option>
              <option value="OBC-NCL">OBC-NCL</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>

          {}
          <div className="form-group">
            <label htmlFor="homestate">Home State</label>
            <select
              id="homestate"
              value={homeState}
              onChange={(e) => setHomeState(e.target.value)}
              required
            >
              <option value="" disabled>Select your state</option>
              {INDIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {}
          <div className="form-group">
            <label>Gender</label>
            <div className="gender-selector">
              <button
                type="button"
                className={`gender-btn ${gender === 'Male' ? 'active' : ''}`}
                onClick={() => setGender('Male')}
              >
                Male
              </button>
              <button
                type="button"
                className={`gender-btn ${gender === 'Female' ? 'active' : ''}`}
                onClick={() => setGender('Female')}
              >
                Female
              </button>
            </div>
          </div>

          {}
          <div className="form-group full-width">
            <label htmlFor="preferences">Detailed Preferences (AI Search)</label>
            <textarea
              id="preferences"
              rows={3}
              placeholder="Describe your preferences (e.g. software development, coding culture, placements, startups, sports facilities...)"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>

          {}
          <div className="form-group full-width exam-type-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', padding: '6px 0' }}>
              <input 
                type="checkbox" 
                checked={qualifiedAdv} 
                onChange={(e) => setQualifiedAdv(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-green)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)' }}>Qualified for JEE Advanced?</span>
            </label>
          </div>

          {qualifiedAdv && (
            <div className="form-group full-width" style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              <label htmlFor="advRank">JEE Advanced Rank</label>
              <input
                id="advRank"
                type="number"
                min="1"
                placeholder="Enter your Advanced rank"
                value={advRank}
                onChange={(e) => setAdvRank(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {}
        <button type="submit" className="action-btn" disabled={loading}>
          <Zap size={18} fill={loading ? "none" : "currentColor"} className={loading ? "spinner" : ""} />
          {loading ? "Analyzing Profile..." : "Predict Colleges"}
        </button>

        <p className="card-footer-note">The predictions are based on 2025 and 2024 data</p>
      </form>
    </div>
  );
}
