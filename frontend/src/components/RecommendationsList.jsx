import { useState, useMemo, useEffect } from 'react';
import {
  Search, SlidersHorizontal, Award, Sparkles, MapPin,
  Pencil, TrendingUp, Compass, ShieldCheck, Download, X, Info
} from 'lucide-react';
import iitImage from '../assets/IIT_image.jpg';

export default function RecommendationsList({
  results,
  userInputs,
  token,
  onEdit,
  onRefinePreferences
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatsItem, setSelectedStatsItem] = useState(null);

  const handleInfoClick = (item) => {
    setSelectedStatsItem(item);
  };
  const [selectedProbability, setSelectedProbability] = useState('All'); 
  const [selectedCollegeType, setSelectedCollegeType] = useState('All'); 
  const [selectedDegree, setSelectedDegree] = useState('B.Tech');
  const [selectedBranches, setSelectedBranches] = useState({
    CS: false,
    Electronics: false,
    Mechanical: false,
    Civil: false
  });
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [sortBy, setSortBy] = useState('cutoff');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [prefText, setPrefText] = useState(userInputs?.preferences || '');
  const [expandedExplanations, setExpandedExplanations] = useState({});

  const toggleExplanation = (key) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const recommendations = useMemo(() => results?.recommendations || [], [results]);

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

  const handleDownloadExcel = async () => {
    try {
      const backendCategory = getBackendCategory(userInputs.category, userInputs.gender);
      const response = await fetch(`/api/export-choices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rank: userInputs.rank,
          adv_rank: userInputs.advRank || null,
          query: userInputs.preferences,
          category: backendCategory,
          homestate: userInputs.homeState,
          exam_type: userInputs.examType || "Mains",
          profile: results?.profile || null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to export choices`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `josaa_choice_list.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download choice list. Please check your network connection.");
    }
  };

  
  const uniqueColleges = useMemo(() => {
    const list = recommendations.map(item => item.college_name);
    return ['All', ...[...new Set(list)].sort()];
  }, [recommendations]);

  // Reset the filters whenever a new result set arrives.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const pref = (userInputs?.preferences || '').toLowerCase();
    
    let type = 'All';
    if (pref.includes('iiit')) {
      type = 'IIIT';
    } else if (pref.includes('nit')) {
      type = 'NIT';
    } else if (pref.includes('iit')) {
      type = 'IIT';
    }
    setSelectedCollegeType(type);

    const branchKeys = { CS: false, Electronics: false, Mechanical: false, Civil: false };
    const hasCS = /\b(computer|cse|software|coding|programming|cs|ai|computing)\b/i.test(pref) || pref.includes("data science");
    const hasElec = /\b(electrical|electronics|ece|ee|eee|circuital|instrumentation|vlsi|semiconductor)\b/i.test(pref);
    const hasMech = /\b(mechanical|mech|aerospace|mechatronics|robotics)\b/i.test(pref);
    const hasCivil = /\b(civil|chemical|mining|metallurgical|textile|architecture|ceramic|materials|biotech|biotechnology)\b/i.test(pref);

    if (hasCS) branchKeys.CS = true;
    if (hasElec) branchKeys.Electronics = true;
    if (hasMech) branchKeys.Mechanical = true;
    if (hasCivil) branchKeys.Civil = true;
    setSelectedBranches(branchKeys);

    
    let matchedCollege = 'All';
    const commonAbbreviations = ['iit', 'nit', 'iiit', 'gfti'];
    if (pref.trim()) {
      for (const col of uniqueColleges) {
        if (col === 'All') continue;
        const colLower = col.toLowerCase();
        
        
        const bracketMatch = col.match(/\(([^)]+)\)/);
        if (bracketMatch && !commonAbbreviations.includes(bracketMatch[1].toLowerCase()) && pref.includes(bracketMatch[1].toLowerCase())) {
          matchedCollege = col;
          break;
        }
        
        if (pref.includes(colLower)) {
          matchedCollege = col;
          break;
        }
      }
    }
    setSelectedCollege(matchedCollege);
    
    setSortBy('cutoff');
  }, [recommendations, userInputs, uniqueColleges]);
  /* eslint-enable react-hooks/set-state-in-effect */

  
  const handleBranchToggle = (key) => {
    setSelectedBranches(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  
  
  
  
  const getProbabilityLabel = (closingRank, studentRank) => {
    if (!closingRank) return 'Medium';
    const ratio = studentRank / closingRank;
    if (ratio <= 0.85) return 'High';
    if (ratio <= 1.05) return 'Medium';
    return 'Low';
  };

  
  const filteredRecs = useMemo(() => {
    const filtered = recommendations.filter(item => {
      
      const query = searchTerm.toLowerCase();
      const collegeMatch = item.college_name.toLowerCase().includes(query);
      const branchMatch = item.branch_name.toLowerCase().includes(query);
      const matchesSearch = collegeMatch || branchMatch;

      
      const isIIIT = item.college_name.toLowerCase().includes('iiit') || item.college_name.toLowerCase().includes('information technology');
      const isIIT = (item.college_name.toLowerCase().includes('iit') || item.college_name.toLowerCase().includes('indian institute of technology')) && !isIIIT;
      const isNIT = item.college_name.toLowerCase().includes('nit') || item.college_name.toLowerCase().includes('national institute of technology');
      const matchesType = selectedCollegeType === 'All' ||
        (selectedCollegeType === 'IIT' && isIIT) ||
        (selectedCollegeType === 'NIT' && isNIT) ||
        (selectedCollegeType === 'IIIT' && isIIIT);

      
      const studentRank = isIIT ? (userInputs.advRank || userInputs.rank) : userInputs.rank;
      const prob = getProbabilityLabel(item.closing_rank, studentRank);
      const matchesProb = selectedProbability === 'All' || prob === selectedProbability;

      
      const matchesCollege = selectedCollege === 'All' || item.college_name === selectedCollege;

      
      const branchName = item.branch_name.toLowerCase();
      const isCS = branchName.includes('computer') || branchName.includes('cse') || branchName.includes('computing') || branchName.includes('data science') || branchName.includes('artificial');
      const isElec = branchName.includes('electrical') || branchName.includes('electronics') || branchName.includes('ece') || branchName.includes('ic');
      const isMech = branchName.includes('mechanical') || branchName.includes('aerospace') || branchName.includes('mechatronics');
      const isCivil = branchName.includes('civil') || branchName.includes('chemical') || branchName.includes('mining') || branchName.includes('metallurgical') || branchName.includes('architecture') || branchName.includes('textile');

      let matchesBranch = false;
      if (selectedBranches.CS && isCS) matchesBranch = true;
      if (selectedBranches.Electronics && isElec) matchesBranch = true;
      if (selectedBranches.Mechanical && isMech) matchesBranch = true;
      if (selectedBranches.Civil && isCivil) matchesBranch = true;

      
      const noneSelected = !selectedBranches.CS && !selectedBranches.Electronics && !selectedBranches.Mechanical && !selectedBranches.Civil;
      if (noneSelected) matchesBranch = true; 

      return matchesSearch && matchesProb && matchesType && matchesBranch && matchesCollege;
    });

    
    return [...filtered].sort((a, b) => {
      if (sortBy === 'brand') {
        const rankA = a.nirf_rank === null || a.nirf_rank === undefined ? Infinity : a.nirf_rank;
        const rankB = b.nirf_rank === null || b.nirf_rank === undefined ? Infinity : b.nirf_rank;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return a.closing_rank - b.closing_rank;
      } else if (sortBy === 'cutoff') {
        return a.closing_rank - b.closing_rank;
      } else {
        
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      }
    });
  }, [recommendations, searchTerm, selectedProbability, selectedCollegeType, selectedBranches, selectedCollege, sortBy, userInputs.rank, userInputs.advRank]);

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedProbability('All');
    setSelectedCollegeType('All');
    setSelectedDegree('B.Tech');
    setSelectedCollege('All');
    const isQueryEmpty = !results?.profile?.vector_query?.trim();
    setSortBy(isQueryEmpty ? 'brand' : 'score');
    setSelectedBranches({
      CS: false,
      Electronics: false,
      Mechanical: false,
      Civil: false
    });
  };

  return (
    <div className="results-container">
      {}
      <div className={`sidebar ${isFiltersExpanded ? 'expanded' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Filters</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="clear-all" onClick={handleClearAll}>Clear All</button>
            <button className="sidebar-close-btn" onClick={() => setIsFiltersExpanded(false)} title="Close Filters">✕</button>
          </div>
        </div>

        {}
        <div className="filter-section">
          <span className="filter-label">Probability</span>
          <div className="pill-group">
            {['All', 'High', 'Medium', 'Low'].map(p => (
              <button
                key={p}
                className={`pill-btn ${selectedProbability === p ? 'active' : ''}`}
                onClick={() => setSelectedProbability(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="filter-section">
          <span className="filter-label">College Type</span>
          <div className="pill-group">
            {(userInputs.advRank ? ['All', 'IIT', 'NIT', 'IIIT'] : ['All', 'NIT', 'IIIT']).map(type => (
              <button
                key={type}
                className={`pill-btn ${selectedCollegeType === type ? 'active' : ''}`}
                onClick={() => setSelectedCollegeType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="filter-section">
          <span className="filter-label">College Name</span>
          <select
            className="filter-select"
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
          >
            {uniqueColleges.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Colleges' : c.replace("Indian Institute of Technology", "IIT").replace("National Institute of Technology", "NIT")}
              </option>
            ))}
          </select>
        </div>

        {}
        <div className="filter-section">
          <span className="filter-label">Branch Types</span>
          <div className="checkbox-list">
            <label className="list-checkbox-item">
              <input
                type="checkbox"
                checked={selectedBranches.CS}
                onChange={() => handleBranchToggle('CS')}
              />
              Computer Science & AI
            </label>
            <label className="list-checkbox-item">
              <input
                type="checkbox"
                checked={selectedBranches.Electronics}
                onChange={() => handleBranchToggle('Electronics')}
              />
              Electronics & Electrical
            </label>
            <label className="list-checkbox-item">
              <input
                type="checkbox"
                checked={selectedBranches.Mechanical}
                onChange={() => handleBranchToggle('Mechanical')}
              />
              Mechanical & Aerospace
            </label>
            <label className="list-checkbox-item">
              <input
                type="checkbox"
                checked={selectedBranches.Civil}
                onChange={() => handleBranchToggle('Civil')}
              />
              Civil, Chemical & Other
            </label>
          </div>
        </div>

        {}
        <div className="filter-section">
          <span className="filter-label">Degree</span>
          <div className="pill-group">
            {['B.Tech', 'M.Tech/Dual'].map(deg => (
              <button
                key={deg}
                className={`pill-btn ${selectedDegree === deg ? 'active' : ''}`}
                onClick={() => setSelectedDegree(deg)}
              >
                {deg}
              </button>
            ))}
          </div>
        </div>

        {}
        <button className="sidebar-action-btn" onClick={() => alert("AI Filter parameters applied to query!")}>
          <Sparkles size={14} />
          Apply Intelligence
        </button>
      </div>

      {}
      <div className="results-content">
        {}
        <div className="results-header-row">
          <div className="results-title-group">
            <h1>BranchWise 2026</h1>
            <p className="results-subtitle">Personalized results based on your academic profile and AI query</p>
          </div>

          <div className="badge-row">
            {}
            <div className="badge-card">
              <Award className="badge-icon" size={18} />
              <div className="badge-info">
                <span className="badge-label">{userInputs.advRank ? "Mains Rank" : "Rank"}</span>
                <span className="badge-value">{userInputs.rank}</span>
              </div>
            </div>

            {}
            {userInputs.advRank && (
              <div className="badge-card">
                <Award className="badge-icon" size={18} style={{ color: 'var(--primary-green)' }} />
                <div className="badge-info">
                  <span className="badge-label">Adv Rank</span>
                  <span className="badge-value">{userInputs.advRank}</span>
                </div>
              </div>
            )}

            {}
            <div className="badge-card">
              <Sparkles className="badge-icon" size={18} />
              <div className="badge-info">
                <span className="badge-label">Category</span>
                <span className="badge-value">{userInputs.category}</span>
              </div>
            </div>

            {}
            <div className="badge-card">
              <MapPin className="badge-icon" size={18} />
              <div className="badge-info">
                <span className="badge-label">Domicile</span>
                <span className="badge-value">{userInputs.homeState}</span>
              </div>
            </div>

            {}
            <button className="edit-btn" onClick={onEdit} title="Edit Parameters">
              <Pencil size={16} />
            </button>
          </div>
        </div>
        
        <div className="mobile-ai-panel">
          <div className="filter-section-mobile">
            <span className="filter-label-mobile">AI Search Keywords</span>
            <div className="tag-group-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {(() => {
                const queryStr = results?.profile?.vector_query || '';
                const tags = queryStr.split(/\s+/).filter(Boolean);
                if (tags.length === 0) {
                  return <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No active AI filters</span>;
                }
                return tags.map((tag, i) => (
                  <span key={i} className="ai-tag">
                    #{tag}
                  </span>
                ));
              })()}
            </div>
          </div>

          <div className="refine-section-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <input
              className="refine-input-mobile"
              type="text"
              placeholder="Refine preferences (e.g. startup, placements...)"
              value={prefText}
              onChange={(e) => setPrefText(e.target.value)}
              style={{ flex: 1, background: '#0d0f11', border: '1px solid var(--input-border)', color: 'white', borderRadius: '20px', padding: '10px 16px', fontSize: '12px' }}
            />
            <button 
              className="refine-btn-mobile" 
              onClick={() => onRefinePreferences && onRefinePreferences(prefText)}
              style={{ background: 'var(--primary-green)', color: 'black', border: 'none', borderRadius: '20px', padding: '10px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={12} />
              Refine
            </button>
          </div>
        </div>

        {}

        {}
        <div className="results-action-banner">
          <div className="disclaimer-box">
            <span className="disclaimer-title">Disclaimer</span>
            <p className="disclaimer-text">
              This choice filling list is based on our RAG Based Prediction System and is a guidance tool based on previous JoSAA rounds. Though our system is highly accurate it can still make mistakes, do not rely solely on this list. Please cross-check everything before final submissions.
            </p>
          </div>
          <button className="download-excel-btn" onClick={handleDownloadExcel}>
            <Download size={16} style={{ marginRight: '8px' }} />
            Download Choice List (Excel/CSV)
          </button>
        </div>

        {}
        <div className="search-sort-row">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by college, branch or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="mobile-filter-toggle-btn" onClick={() => setIsFiltersExpanded(true)} title="Toggle Filters">
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>

          <div className="sort-wrapper">
            <span className="sort-label">Sort:</span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="cutoff">Cutoff Rank (Low to High)</option>
              <option value="brand">College Brand & Cutoff</option>
              {results?.profile?.vector_query?.trim() && (
                <option value="score">AI Match Score</option>
              )}
            </select>
          </div>
        </div>

        {}
        <div className="recommendations-card-container">
          {}
          <div className="rec-header-row">
            <span>College & Location</span>
            <span>Branch</span>
            <span>Probability</span>
            <span>2024 CL</span>
            <span>2025 CL</span>
          </div>

          {}
          {filteredRecs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#5f6368' }}>
              No colleges found matching your filter criteria. Try adjusting the filters.
            </div>
          ) : (
            filteredRecs.map((item, idx) => {
              const isIIIT = item.college_name.toLowerCase().includes('iiit') || item.college_name.toLowerCase().includes('information technology');
              const itemIsIIT = (item.college_name.toLowerCase().includes('iit') || item.college_name.toLowerCase().includes('indian institute of technology')) && !isIIIT;
              const studentRank = itemIsIIT ? (userInputs.advRank || userInputs.rank) : userInputs.rank;
              const prob = getProbabilityLabel(item.closing_rank, studentRank);

              return (
                <div className="rec-card" key={idx}>
                  {}
                  <div className="college-cell">
                    <img
                      src={iitImage}
                      alt="College Logo"
                      className="college-logo"
                    />
                    <div className="college-details">
                      <span className="college-name">
                        {item.college_name}
                        {results?.ai_explanations?.[item.college_name + ' | ' + item.branch_name] && (
                          <button
                            className={`info-toggle-btn ${expandedExplanations[item.college_name + ' | ' + item.branch_name] ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExplanation(item.college_name + ' | ' + item.branch_name);
                            }}
                            title="Why is this matching my preferences?"
                          >
                            <Sparkles size={10} style={{ marginRight: '4px' }} />
                            Why this?
                          </button>
                        )}
                      </span>
                      <span className="college-location">
                        <MapPin size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        {item.college_name.includes("Varanasi") ? "Uttar Pradesh" : "India"}
                      </span>
                    </div>
                  </div>

                  {}
                  <div className="branch-cell">
                    <span className="branch-name">{item.branch_name}</span>
                    <span className="branch-duration">B.Tech | 4 Years</span>
                  </div>

                  {}
                  <div className="probability-cell">
                    <span className={`prob-badge ${prob.toLowerCase()}`}>
                      {prob} Probability
                    </span>
                  </div>


                  {}
                  <div className="rank-24-cell">
                    <span className="rank-label">2024 CL:</span> {item.closing_rank_2024 || 'N/A'}
                  </div>

                  {}
                  <div className="rank-25-cell">
                    <span className="rank-label">2025 CL:</span> {item.closing_rank_2025 || 'N/A'}
                    <span className="details-btn-wrapper" style={{ marginLeft: '12px' }}>
                      <a className="details-link" onClick={() => handleInfoClick(item)}>
                        Info
                      </a>
                    </span>
                  </div>

                  {}
                  {results?.ai_explanations?.[item.college_name + ' | ' + item.branch_name] && expandedExplanations[item.college_name + ' | ' + item.branch_name] && (
                    <div className="top-choice-explanation">
                      <Sparkles size={14} className="text-green animate-pulse" style={{ flexShrink: 0, marginTop: '2px', color: '#87FF8B' }} />
                      <p>{results.ai_explanations[item.college_name + ' | ' + item.branch_name]}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {}
        <div className="features-grid">
          {}
          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={20} />
            </div>
            <span className="feature-title">Accurate Data</span>
            <p className="feature-description">
              Closing Ranks are shown based upon JoSAA 2024 Round 5. We ensure the highest data precision for your future strategy.
            </p>
          </div>

          {}
          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <TrendingUp size={20} />
            </div>
            <span className="feature-title">Placement Trends</span>
            <p className="feature-description">
              Package details and placement statistics are sourced from official college data and validated by verified alumni.
            </p>
          </div>

          {}
          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Compass size={20} />
            </div>
            <span className="feature-title">Counseling Guide</span>
            <p className="feature-description">
              Get detailed round-wise insights and seat allotment patterns for the past years to build your counseling choices list.
            </p>
          </div>
        </div>

        <span className="neural-engine-footer">AI-POWERED RECOMMENDATION ENGINE</span>
      </div>

      {}
      <div className="right-panel">
        <div className="filter-section">
          <span className="filter-label">AI Search Keywords</span>
          <div className="tag-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {(() => {
              const queryStr = results?.profile?.vector_query || '';
              const tags = queryStr.split(/\s+/).filter(Boolean);
              if (tags.length === 0) {
                return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No active AI filters</span>;
              }
              return tags.map((tag, i) => (
                <span key={i} className="ai-tag">
                  #{tag}
                </span>
              ));
            })()}
          </div>
        </div>

        <div className="filter-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <span className="filter-label">Refine Preferences</span>
          <textarea
            className="refine-textarea"
            rows={4}
            placeholder="Type new preferences to re-filter (e.g. startup, research, placements, specific states...)"
            value={prefText}
            onChange={(e) => setPrefText(e.target.value)}
            style={{ width: '100%', resize: 'none', background: '#0d0f11', border: '1px solid var(--input-border)', color: 'white', borderRadius: '8px', padding: '12px', fontSize: '13px' }}
          />
          <button 
            className="refine-btn" 
            onClick={() => onRefinePreferences && onRefinePreferences(prefText)}
            style={{ background: 'var(--primary-green)', color: 'black', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Sparkles size={14} />
            Refine RAG Search
          </button>
        </div>
      </div>

      {}
      {selectedStatsItem && (
        <div className="stats-modal-overlay">
          <div className="stats-modal-content branch-detail-modal">
            <div className="stats-modal-header">
              <div className="stats-header-title">
                <Info className="stats-title-icon" style={{ color: 'var(--primary-green)' }} />
                <div>
                  <h2>{selectedStatsItem.branch_name}</h2>
                  <p className="stats-header-subtitle">{selectedStatsItem.college_name}</p>
                </div>
              </div>
              <button className="stats-close-btn" onClick={() => setSelectedStatsItem(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="stats-modal-body">
              {(() => {
                const isIIIT = selectedStatsItem.college_name.toLowerCase().includes('iiit') || selectedStatsItem.college_name.toLowerCase().includes('information technology');
                const isIIT = (selectedStatsItem.college_name.toLowerCase().includes('iit') || selectedStatsItem.college_name.toLowerCase().includes('indian institute of technology')) && !isIIIT;
                const examLabel = isIIT ? 'Advanced' : 'Mains';

                return (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <span className="prob-badge high" style={{ background: 'rgba(135, 255, 139, 0.1)', color: 'var(--primary-green)' }}>
                      Category: {userInputs?.category || 'General'}
                    </span>
                    <span className="prob-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                      Exam: {examLabel}
                    </span>
                  </div>
                );
              })()}

              <div className="stats-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="stats-kpi-card" style={{ padding: '16px' }}>
                  <div className="kpi-content">
                    <span className="kpi-value" style={{ fontSize: '24px' }}>{selectedStatsItem.closing_rank_2025 || 'N/A'}</span>
                    <span className="kpi-label">2025 Closing Rank</span>
                  </div>
                </div>
                <div className="stats-kpi-card" style={{ padding: '16px' }}>
                  <div className="kpi-content">
                    <span className="kpi-value" style={{ fontSize: '24px' }}>{selectedStatsItem.closing_rank_2024 || 'N/A'}</span>
                    <span className="kpi-label">2024 Closing Rank</span>
                  </div>
                </div>
              </div>

              <h3 className="section-card-title" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Placement Statistics</h3>
              <div className="stats-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div className="stats-kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px' }}>
                  <span className="kpi-label" style={{ marginBottom: '4px' }}>Average Package</span>
                  <span className="kpi-value" style={{ color: 'var(--primary-green)', fontSize: '18px' }}>
                    {selectedStatsItem.avg_ctc ? `${selectedStatsItem.avg_ctc} LPA` : 'N/A'}
                  </span>
                </div>
                <div className="stats-kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px' }}>
                  <span className="kpi-label" style={{ marginBottom: '4px' }}>Median Package</span>
                  <span className="kpi-value" style={{ fontSize: '18px' }}>
                    {selectedStatsItem.median_ctc ? `${selectedStatsItem.median_ctc} LPA` : 'N/A'}
                  </span>
                </div>
                <div className="stats-kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px' }}>
                  <span className="kpi-label" style={{ marginBottom: '4px' }}>Placement %</span>
                  <span className="kpi-value" style={{ fontSize: '18px' }}>
                    {selectedStatsItem.placement_percentage ? `${selectedStatsItem.placement_percentage}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* College Environment Details */}
              <h3 className="section-card-title" style={{ marginTop: '24px', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', textAlign: 'left' }}>College Environment</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {selectedStatsItem.nirf_rank && (
                  <div className="stats-kpi-card" style={{ padding: '16px', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="kpi-label">NIRF Rank</span>
                    <span className="kpi-value" style={{ fontSize: '18px', color: 'var(--primary-green)' }}>#{selectedStatsItem.nirf_rank}</span>
                  </div>
                )}
                <div className="stats-kpi-card" style={{ padding: '16px', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="kpi-label">Incubation Center</span>
                  <span className="kpi-value" style={{ fontSize: '13px', fontWeight: '500', marginTop: '4px', textAlign: 'left', color: 'white' }}>
                    {selectedStatsItem.incubation_center_name || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Notable Startups */}
              {selectedStatsItem.notable_startups && selectedStatsItem.notable_startups.length > 0 && (
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notable Startups</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedStatsItem.notable_startups.map((startup, idx) => (
                      <span key={idx} className="prob-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        {startup}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Clubs */}
              {selectedStatsItem.student_clubs && selectedStatsItem.student_clubs.length > 0 && (
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Clubs & Societies</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedStatsItem.student_clubs.map((club, idx) => (
                      <span key={idx} className="prob-badge" style={{ background: 'var(--primary-green-glow)', color: 'var(--primary-green)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(135, 255, 139, 0.1)' }}>
                        {club}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sports Infrastructure */}
              {selectedStatsItem.sports_infrastructure && selectedStatsItem.sports_infrastructure.length > 0 && (
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sports Facilities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedStatsItem.sports_infrastructure.map((sport, idx) => (
                      <span key={idx} className="prob-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="feature-box" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span className="feature-title" style={{ fontSize: '13px', fontWeight: '600' }}>Note on Data</span>
                <p className="feature-description" style={{ fontSize: '12px', marginTop: '4px' }}>
                  NIRF rankings are updated as of the latest official publication. Placement rates and packages are consolidated from official college reports and campus placement cell disclosures.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
