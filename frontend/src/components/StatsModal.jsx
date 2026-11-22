import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import Modal from './ui/Modal';
import api, { ApiError } from '../api';
import './stats.css';

const formatCategory = (category) =>
  String(category ?? 'Unknown')
    .replace('_Gender_Neutral', '')
    .replace('_Female', ' (Female)')
    .replace(/_/g, ' ');

const asPercent = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

function Distribution({ title, entries, total, formatLabel = (key) => key }) {
  const rows = entries;
  return (
    <section className="stats-section" aria-labelledby={`stats-${title.replace(/\s+/g, '-')}`}>
      <h3 className="stats-section__title" id={`stats-${title.replace(/\s+/g, '-')}`}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="stats-empty">No searches recorded yet.</p>
      ) : (
        <ul className="stats-bars">
          {rows.map(([key, count]) => (
            <li className="stats-bar" key={key}>
              <div className="stats-bar__head">
                <span className="stats-bar__label">{formatLabel(key)}</span>
                <span className="stats-bar__value tabular">
                  {count}
                  <span className="stats-bar__pct"> / {asPercent(count, total)}%</span>
                </span>
              </div>
              <div className="stats-bar__track">
                <span
                  className="stats-bar__fill"
                  style={{ width: `${Math.max(asPercent(count, total), 1)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlacementList({ title, rows, secondary }) {
  const max = rows.reduce((high, row) => Math.max(high, Number(row.avg_ctc) || 0), 0);
  return (
    <section className="stats-section" aria-labelledby={`stats-${title.replace(/\s+/g, '-')}`}>
      <h3 className="stats-section__title" id={`stats-${title.replace(/\s+/g, '-')}`}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="stats-empty">No placement data indexed.</p>
      ) : (
        <ul className="stats-bars stats-bars--ranked">
          {rows.map((row, index) => {
            const ctc = Number(row.avg_ctc) || 0;
            return (
              <li className="stats-bar" key={`${row.college_name}-${row.branch_name ?? index}`}>
                <div className="stats-bar__head">
                  <span className="stats-bar__label">
                    <span className="stats-bar__rank tabular">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {row.branch_name ? (
                      <>
                        {row.branch_name}
                        <span className="stats-bar__sub">{row.college_name}</span>
                      </>
                    ) : (
                      <>
                        {row.college_name}
                        <span className="stats-bar__sub">{secondary(row)}</span>
                      </>
                    )}
                  </span>
                  <span className="stats-bar__value tabular">{ctc ? `${ctc} LPA` : '—'}</span>
                </div>
                <div className="stats-bar__track">
                  <span
                    className="stats-bar__fill"
                    style={{ width: max > 0 ? `${(ctc / max) * 100}%` : '0%' }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatsBody({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.statistics(token);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load statistics. Try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (loading) {
    return (
      <div className="stats-skeleton" role="status">
        <span className="sr-only">Loading search statistics.</span>
        {[38, 62, 48, 74, 54, 66, 42].map((width, index) => (
          <span
            key={index}
            className="skeleton stats-skeleton__line"
            style={{ width: `${width}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-error">
        <p>{error}</p>
        <button type="button" className="btn btn--sm" onClick={() => setAttempt((n) => n + 1)}>
          <RotateCw size={14} strokeWidth={1.5} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const total = Number(stats.total_searches) || 0;
  const categories = Object.entries(stats.category_distribution ?? {});
  const exams = Object.entries(stats.exam_distribution ?? {});
  const states = Object.entries(stats.state_distribution ?? {}).slice(0, 5);
  const colleges = (stats.college_placement_stats ?? []).slice(0, 5);
  const branches = (stats.branch_placement_stats ?? []).slice(0, 5);

  const kpis = [
    { label: 'Total searches', value: stats.total_searches },
    { label: 'Unique users', value: stats.unique_users },
    { label: 'Signed in', value: stats.logged_in_searches },
    { label: 'Guest', value: stats.guest_searches },
  ];

  return (
    <>
      <dl className="stats-kpis">
        {kpis.map((kpi) => (
          <div className="stats-kpi" key={kpi.label}>
            <dt className="mono-label">{kpi.label}</dt>
            <dd className="stats-kpi__value tabular">
              {kpi.value === null || kpi.value === undefined ? '—' : kpi.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="stats-grid">
        <Distribution title="Category" entries={categories} total={total} formatLabel={formatCategory} />
        <Distribution
          title="Exam type"
          entries={exams}
          total={total}
          formatLabel={(exam) => (exam === 'Unknown' ? exam : `JEE ${exam}`)}
        />
      </div>

      <Distribution title="Top home states" entries={states} total={total} />

      <div className="stats-grid">
        <PlacementList
          title="Colleges by average CTC"
          rows={colleges}
          secondary={(row) => (row.nirf_rank ? `NIRF ${row.nirf_rank}` : 'NIRF —')}
        />
        <PlacementList title="Branches by CTC" rows={branches} secondary={() => ''} />
      </div>
    </>
  );
}

export default function StatsModal({ isOpen, onClose, token }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search statistics" wide className="stats-modal">
      <StatsBody token={token} />
    </Modal>
  );
}
