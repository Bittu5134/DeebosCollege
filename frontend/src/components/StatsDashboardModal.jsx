import { useState, useEffect, useCallback } from 'react';
import { X, BarChart3, TrendingUp, Users, Award, Search, Compass, BookOpen } from 'lucide-react';

export default function StatsDashboardModal({ isOpen, onClose, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/statistics', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load system statistics. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      // The modal fetches fresh aggregate stats whenever it opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchStats();
    }
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  
  const getPercentage = (count, total) => {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  };

  
  const formatCategory = (cat) => {
    return cat.replace('_Gender_Neutral', '').replace('_Female', ' (Female)').replace('_', ' ');
  };

  return (
    <div className="stats-modal-overlay">
      <div className="stats-modal-content">
        {}
        <div className="stats-modal-header">
          <div className="stats-header-title">
            <BarChart3 className="stats-title-icon" />
            <div>
              <h2>Ecosystem Analytics & Stats</h2>
              <p className="stats-header-subtitle">Real-time usage patterns & placement statistics</p>
            </div>
          </div>
          <button className="stats-close-btn" onClick={onClose} aria-label="Close statistics">
            <X size={20} />
          </button>
        </div>

        {}
        <div className="stats-modal-body">
          {loading ? (
            <div className="stats-loading">
              <div className="spinner"></div>
              <span>Analyzing database metrics...</span>
            </div>
          ) : error ? (
            <div className="stats-error">
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchStats}>Retry</button>
            </div>
          ) : (
            <>
              {}
              <div className="stats-kpi-grid">
                {}
                <div className="stats-kpi-card">
                  <div className="kpi-icon-wrapper blue">
                    <Search size={18} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{stats.total_searches}</span>
                    <span className="kpi-label">Total Predictions</span>
                  </div>
                </div>

                {}
                <div className="stats-kpi-card">
                  <div className="kpi-icon-wrapper green">
                    <Users size={18} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{stats.unique_users}</span>
                    <span className="kpi-label">Logged In Users</span>
                  </div>
                </div>

                {}
                <div className="stats-kpi-card">
                  <div className="kpi-icon-wrapper purple">
                    <TrendingUp size={18} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">
                      {getPercentage(stats.logged_in_searches, stats.total_searches)}%
                    </span>
                    <span className="kpi-label">Authenticated Searches</span>
                  </div>
                </div>

                {}
                <div className="stats-kpi-card">
                  <div className="kpi-icon-wrapper yellow">
                    <Compass size={18} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{stats.guest_searches}</span>
                    <span className="kpi-label">Guest Queries</span>
                  </div>
                </div>
              </div>

              {}
              <div className="stats-details-grid">
                {}
                <div className="stats-section-column">
                  {}
                  <div className="stats-card">
                    <h3 className="section-card-title">Category Distribution</h3>
                    <div className="distribution-list">
                      {Object.keys(stats.category_distribution).length === 0 ? (
                        <p className="no-data-text">No search activity recorded yet.</p>
                      ) : (
                        Object.entries(stats.category_distribution).map(([category, count]) => {
                          const pct = getPercentage(count, stats.total_searches);
                          return (
                            <div key={category} className="distribution-item">
                              <div className="distribution-info">
                                <span className="item-name">{formatCategory(category)}</span>
                                <span className="item-val">{count} ({pct}%)</span>
                              </div>
                              <div className="progress-bar-bg">
                                <div className="progress-bar-fill green" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {}
                  <div className="stats-row-grid">
                    {}
                    <div className="stats-card">
                      <h3 className="section-card-title">Exam Type</h3>
                      <div className="distribution-list">
                        {Object.keys(stats.exam_distribution).length === 0 ? (
                          <p className="no-data-text">No activity yet.</p>
                        ) : (
                          Object.entries(stats.exam_distribution).map(([exam, count]) => {
                            const pct = getPercentage(count, stats.total_searches);
                            return (
                              <div key={exam} className="distribution-item">
                                <div className="distribution-info">
                                  <span className="item-name">JEE {exam}</span>
                                  <span className="item-val">{count} ({pct}%)</span>
                                </div>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill blue" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {}
                    <div className="stats-card">
                      <h3 className="section-card-title">Top Home States</h3>
                      <div className="distribution-list">
                        {Object.keys(stats.state_distribution).length === 0 ? (
                          <p className="no-data-text">No state statistics.</p>
                        ) : (
                          Object.entries(stats.state_distribution).map(([state, count]) => {
                            const pct = getPercentage(count, stats.total_searches);
                            return (
                              <div key={state} className="distribution-item">
                                <div className="distribution-info">
                                  <span className="item-name">{state}</span>
                                  <span className="item-val">{count}</span>
                                </div>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill yellow" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {}
                <div className="stats-section-column">
                  {}
                  <div className="stats-card">
                    <h3 className="section-card-title">
                      <Award size={16} className="inline-icon" /> Top 5 Colleges by Average CTC
                    </h3>
                    <div className="placement-list">
                      {stats.college_placement_stats.length === 0 ? (
                        <p className="no-data-text">No college placement metrics available.</p>
                      ) : (
                        stats.college_placement_stats.map((col, idx) => (
                          <div key={col.college_name} className="placement-item">
                            <div className="placement-rank-badge">#{idx + 1}</div>
                            <div className="placement-info">
                              <span className="college-title">{col.college_name}</span>
                              <span className="college-sub">NIRF Rank: {col.nirf_rank || 'N/A'} • Placements: {col.placement_pct ? `${col.placement_pct}%` : 'N/A'}</span>
                            </div>
                            <div className="placement-metric">
                              <span className="metric-value">{col.avg_ctc} LPA</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {}
                  <div className="stats-card">
                    <h3 className="section-card-title">
                      <BookOpen size={16} className="inline-icon" /> Top 5 Branches by Placement CTC
                    </h3>
                    <div className="placement-list">
                      {stats.branch_placement_stats.length === 0 ? (
                        <p className="no-data-text">No branch placement metrics available.</p>
                      ) : (
                        stats.branch_placement_stats.map((br, idx) => (
                          <div key={`${br.college_name}-${br.branch_name}`} className="placement-item">
                            <div className="placement-rank-badge font-mono">#{idx + 1}</div>
                            <div className="placement-info">
                              <span className="college-title">{br.branch_name}</span>
                              <span className="college-sub">{br.college_name} • Placements: {br.placement_pct ? `${br.placement_pct}%` : 'N/A'}</span>
                            </div>
                            <div className="placement-metric">
                              <span className="metric-value green-text">{br.avg_ctc} LPA</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
