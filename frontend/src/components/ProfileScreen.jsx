import { useEffect, useState } from 'react';
import api from '../api';
import Field from './ui/Field';
import RankRail from './ui/RankRail';
import './profile.css';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const CATEGORIES = ['General', 'OBC-NCL', 'SC', 'ST', 'EWS'];

const RANK_HINT = 'Use your JoSAA CRL.';

const countRecords = (result) =>
  result.status === 'fulfilled' && Array.isArray(result.value) ? result.value.length : null;

const describedBy = (id, error, hint) =>
  [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') ||
  undefined;

export default function ProfileScreen({ initialValues = null, onSubmit, loading = false }) {
  const seed = initialValues || {};

  const [rank, setRank] = useState(() => (seed.rank ? String(seed.rank) : ''));
  const [category, setCategory] = useState(() => seed.category || 'General');
  const [gender, setGender] = useState(() => seed.gender || 'Male');
  const [homeState, setHomeState] = useState(() => seed.homeState || '');
  const [qualifiedAdv, setQualifiedAdv] = useState(
    () => Boolean(seed.advRank) || seed.examType === 'Advanced'
  );
  const [advRank, setAdvRank] = useState(() => (seed.advRank ? String(seed.advRank) : ''));
  const [preferences, setPreferences] = useState(() => seed.preferences || '');
  const [errors, setErrors] = useState({});
  const [counts, setCounts] = useState({ colleges: null, branches: null });

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.colleges(), api.branches()]).then(
      ([collegesResult, branchesResult]) => {
        if (!active) return;
        setCounts({
          colleges: countRecords(collegesResult),
          branches: countRecords(branchesResult),
        });
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validate = () => {
    const next = {};
    const rankText = rank.trim();
    if (!rankText) next.rank = 'Enter your All India Rank.';
    else if (!/^\d+$/.test(rankText) || Number(rankText) < 1) {
      next.rank = 'Use a positive whole number.';
    }

    if (!homeState) next.homeState = 'Select your home state.';

    if (qualifiedAdv) {
      const advText = advRank.trim();
      if (!advText) next.advRank = 'Enter your JEE Advanced rank.';
      else if (!/^\d+$/.test(advText) || Number(advText) < 1) {
        next.advRank = 'Use a positive whole number.';
      }
    }

    return next;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    const firstInvalid = [
      ['rank', 'rank'],
      ['homeState', 'home-state'],
      ['advRank', 'adv-rank'],
    ].find(([key]) => nextErrors[key]);

    if (firstInvalid) {
      document.getElementById(firstInvalid[1])?.focus();
      return;
    }

    onSubmit({
      rank: Number(rank.trim()),
      advRank: qualifiedAdv ? Number(advRank.trim()) : null,
      category,
      gender,
      homeState,
      preferences,
      examType: qualifiedAdv ? 'Advanced' : 'Mains',
    });
  };

  const toggleAdvanced = (checked) => {
    setQualifiedAdv(checked);
    if (!checked) {
      setAdvRank('');
      clearError('advRank');
    }
  };

  return (
    <section className="screen profile grid-ground" aria-labelledby="profile-title">
      <div className="profile__grid">
        <div className="profile__form">
          <div className="profile__head">
            <h1 className="display profile__title" id="profile-title">
              Find where your rank lands.
            </h1>
          </div>

          <form className="profile__fields" onSubmit={handleSubmit} noValidate>
            <Field id="rank" label="All India Rank (CRL)" hint={RANK_HINT} error={errors.rank}>
              <div className="profile__rank-row">
                <input
                  id="rank"
                  className="input input--rank profile__rank"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="5000"
                  value={rank}
                  onChange={(event) => {
                    setRank(event.target.value);
                    clearError('rank');
                  }}
                  aria-invalid={errors.rank ? 'true' : undefined}
                  aria-describedby={describedBy('rank', errors.rank, RANK_HINT)}
                />
                <span className="profile__rank-side">of 300,000</span>
              </div>
            </Field>

            <div className="profile__row">
              <Field id="category" label="Category">
                <select
                  id="category"
                  className="select"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="field">
                <span className="field__label" id="gender-label">
                  Gender
                </span>
                <div className="segmented" role="group" aria-labelledby="gender-label">
                  {['Male', 'Female'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="segmented__option"
                      aria-pressed={gender === option}
                      onClick={() => setGender(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <Field
                id="home-state"
                label="Home state"
                error={errors.homeState}
                className="field--state"
              >
                <select
                  id="home-state"
                  className="select"
                  value={homeState}
                  onChange={(event) => {
                    setHomeState(event.target.value);
                    clearError('homeState');
                  }}
                  aria-invalid={errors.homeState ? 'true' : undefined}
                  aria-describedby={describedBy('home-state', errors.homeState)}
                >
                  <option value="">Select your state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="profile__check" htmlFor="qualified-adv">
              <input
                id="qualified-adv"
                type="checkbox"
                checked={qualifiedAdv}
                onChange={(event) => toggleAdvanced(event.target.checked)}
              />
              <span>I also have a JEE Advanced rank</span>
            </label>

            {qualifiedAdv ? (
              <Field id="adv-rank" label="JEE Advanced rank (CRL)" error={errors.advRank}>
                <input
                  id="adv-rank"
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="1200"
                  value={advRank}
                  onChange={(event) => {
                    setAdvRank(event.target.value);
                    clearError('advRank');
                  }}
                  aria-invalid={errors.advRank ? 'true' : undefined}
                  aria-describedby={describedBy('adv-rank', errors.advRank)}
                />
              </Field>
            ) : null}

            <Field id="preferences" label="Preferences">
              <textarea
                id="preferences"
                className="textarea"
                rows={3}
                placeholder="Software development, coding culture, strong placements, close to home..."
                value={preferences}
                onChange={(event) => setPreferences(event.target.value)}
              />
            </Field>

            <div className="profile__actions">
              <button
                type="submit"
                className={`btn btn--primary profile__submit${loading ? ' is-loading' : ''}`}
                disabled={loading}
                aria-busy={loading ? 'true' : undefined}
              >
                <span className="btn__label">
                  {loading ? 'Building your index...' : 'Build my index'}
                </span>
                {loading ? null : (
                  <span aria-hidden="true" className="profile__submit-arrow">
                    →
                  </span>
                )}
              </button>
              <span className="profile__actions-note">No account required.</span>
            </div>
          </form>
        </div>

        <aside className="profile__aside">
          <figure className="panel--figure specimen">
            <div className="specimen__head">
              <span className="mono-label">Rank specimen</span>
            </div>

            <div className="specimen__rail">
              <RankRail
                mode="specimen"
                rank={rank}
                advRank={qualifiedAdv ? advRank : null}
              />
            </div>

            <figcaption className="specimen__caption">
              FIG. 01 / Rank position on a logarithmic scale.
            </figcaption>

            <ul className="specimen__legend">
              <li>
                <span className="specimen__swatch" data-zone="rank" aria-hidden="true" />
                CRL marker
              </li>
              {qualifiedAdv ? (
                <li>
                  <span className="specimen__swatch" data-zone="adv" aria-hidden="true" />
                  Advanced rank marker
                </li>
              ) : null}
            </ul>

            <div className="specimen__counts">
              <span className="chip">
                <span className="mono-label">Institutes</span>
                <span className="tabular">{counts.colleges ?? '—'}</span>
              </span>
              <span className="chip">
                <span className="mono-label">Branches</span>
                <span className="tabular">{counts.branches ?? '—'}</span>
              </span>
            </div>
          </figure>
        </aside>
      </div>
    </section>
  );
}
