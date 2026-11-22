import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import api, { getBackendCategory } from '../api';
import Field from './ui/Field';
import RankRail from './ui/RankRail';
import './results.css';

const EMPTY_EXPLANATIONS = {};
const EMPTY_BRANCHES = { CS: false, ECE: false, Mech: false, Civil: false };
const PROBABILITIES = ['All', 'Safe', 'Target', 'Reach'];

const BRANCH_GROUPS = [
  {
    key: 'CS',
    label: 'CS',
    terms: ['computer', 'cse', 'computing', 'data science', 'artificial', 'software'],
  },
  {
    key: 'ECE',
    label: 'ECE',
    terms: ['electrical', 'electronics', 'ece', 'ic', 'vlsi', 'instrumentation'],
  },
  {
    key: 'Mech',
    label: 'Mech',
    terms: ['mechanical', 'mech', 'aerospace', 'mechatronics', 'robotics'],
  },
  {
    key: 'Civil',
    label: 'Civil+',
    terms: [
      'civil',
      'chemical',
      'mining',
      'metallurgical',
      'textile',
      'architecture',
      'ceramic',
      'materials',
      'biotech',
    ],
  },
];

const rowKey = (item) => `${item?.college_name || ''} | ${item?.branch_name || ''}`;

const isMissing = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (typeof value === 'string' && value.trim().toUpperCase() === 'N/A');

const formatRank = (value) => {
  if (isMissing(value)) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : String(value);
};

const formatText = (value, suffix = '') => (isMissing(value) ? '—' : `${value}${suffix}`);

const formatCtc = (value) => (isMissing(value) ? '—' : `${value} LPA`);

const formatMatch = (value) => {
  if (isMissing(value)) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number <= 1 ? number.toFixed(2) : number.toFixed(1);
};

const formatNirf = (value) => (isMissing(value) ? '—' : `#${value}`);

const formatList = (value) => {
  if (Array.isArray(value)) {
    const unique = [...new Set(value.filter(Boolean))];
    return unique.length ? unique.join(', ') : '—';
  }
  if (isMissing(value)) return '—';
  return String(value);
};

const categoryLabel = (category) => {
  if (!category) return '—';
  if (category === 'General') return 'OPEN';
  return category
    .replace('_Gender_Neutral', '')
    .replace('_Female', ' (Female)')
    .replace(/_/g, ' ');
};

const isIiit = (name) => {
  const text = (name || '').toLowerCase();
  return text.includes('iiit') || text.includes('information technology');
};

const collegeType = (name) => {
  const text = (name || '').toLowerCase();
  if (isIiit(text)) return 'IIIT';
  if (text.includes('iit') || text.includes('indian institute of technology')) return 'IIT';
  if (text.includes('nit') || text.includes('national institute of technology')) return 'NIT';
  return 'Other';
};

const studentRankFor = (item, inputs) =>
  collegeType(item.college_name) === 'IIT' ? inputs.advRank || inputs.rank : inputs.rank;

const classifyProbability = (closingRank, studentRank) => {
  const closing = Number(closingRank);
  const rank = Number(studentRank);
  if (!Number.isFinite(closing) || closing <= 0) return 'Target';
  if (!Number.isFinite(rank) || rank <= 0) return 'Target';
  const ratio = rank / closing;
  if (ratio <= 0.85) return 'Safe';
  if (ratio <= 1.05) return 'Target';
  return 'Reach';
};

const sortableRank = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Infinity;
};

const sortableNirf = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Infinity;
};

const sortableScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : -Infinity;
};

const compareRows = (a, b, sortBy) => {
  if (sortBy === 'nirf') {
    const nirfA = sortableNirf(a.nirf_rank);
    const nirfB = sortableNirf(b.nirf_rank);
    if (nirfA !== nirfB) return nirfA - nirfB;
    return sortableRank(a.closing_rank) - sortableRank(b.closing_rank);
  }
  if (sortBy === 'match') {
    return sortableScore(b.similarity_score) - sortableScore(a.similarity_score);
  }
  return sortableRank(a.closing_rank) - sortableRank(b.closing_rank);
};

const initialCollegeType = (preferences) => {
  const text = (preferences || '').toLowerCase();
  if (text.includes('iiit')) return 'IIIT';
  if (text.includes('nit')) return 'NIT';
  if (text.includes('iit')) return 'IIT';
  return 'All';
};

export default function ResultsScreen({
  results,
  userInputs,
  token,
  onEdit,
  onRefinePreferences,
}) {
  const inputs = useMemo(() => userInputs || {}, [userInputs]);
  const recommendations = useMemo(
    () => (Array.isArray(results?.recommendations) ? results.recommendations : []),
    [results]
  );
  const explanations = results?.ai_explanations || EMPTY_EXPLANATIONS;

  const [search, setSearch] = useState('');
  const [probability, setProbability] = useState('All');
  const [typeFilter, setTypeFilter] = useState(() => initialCollegeType(inputs.preferences));
  const [branchGroups, setBranchGroups] = useState(EMPTY_BRANCHES);
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('cutoff');
  const [visibleCount, setVisibleCount] = useState(40);
  const [expandedKey, setExpandedKey] = useState(null);
  const [amendOpen, setAmendOpen] = useState(false);
  const [prefText, setPrefText] = useState(inputs.preferences || '');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const rowRefs = useRef({});
  const scrollTimer = useRef(null);

  useEffect(
    () => () => {
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    },
    []
  );

  const uniqueColleges = useMemo(
    () =>
      [...new Set(recommendations.map((item) => item.college_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [recommendations]
  );

  const view = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedGroups = BRANCH_GROUPS.filter((group) => branchGroups[group.key]);

    const rows = recommendations.filter((item) => {
      const college = item.college_name || '';
      const branch = item.branch_name || '';

      if (
        query &&
        !college.toLowerCase().includes(query) &&
        !branch.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (typeFilter !== 'All' && collegeType(college) !== typeFilter) return false;
      if (collegeFilter !== 'All' && college !== collegeFilter) return false;

      if (selectedGroups.length) {
        const branchName = branch.toLowerCase();
        const matchesGroup = selectedGroups.some((group) =>
          group.terms.some((term) => branchName.includes(term))
        );
        if (!matchesGroup) return false;
      }

      return true;
    });

    const counts = { All: rows.length, Safe: 0, Target: 0, Reach: 0 };
    const withState = rows.map((item) => {
      const state = classifyProbability(
        item.closing_rank,
        studentRankFor(item, inputs)
      );
      counts[state] += 1;
      return { item, state };
    });

    const filtered = withState.filter(
      (row) => probability === 'All' || row.state === probability
    );

    filtered.sort((a, b) => compareRows(a.item, b.item, sortBy));

    return { counts, rows: filtered };
  }, [
    recommendations,
    search,
    typeFilter,
    branchGroups,
    collegeFilter,
    probability,
    sortBy,
    inputs,
  ]);

  const notes = useMemo(() => {
    const items = [];
    for (let index = 0; index < recommendations.length && items.length < 3; index += 1) {
      const item = recommendations[index];
      const key = rowKey(item);
      const text = explanations[key];
      if (text) items.push({ key, text, item, index });
    }
    if (!items.length) {
      Object.entries(explanations)
        .slice(0, 3)
        .forEach(([key, text], index) => {
          items.push({ key, text, item: null, index });
        });
    }
    return items;
  }, [recommendations, explanations]);

  const summaryParts = [];
  if (!isMissing(inputs.rank)) summaryParts.push(`Rank ${formatRank(inputs.rank)}`);
  if (!isMissing(inputs.category)) summaryParts.push(categoryLabel(inputs.category));
  if (!isMissing(inputs.homeState)) summaryParts.push(inputs.homeState);
  const examLabel = inputs.examType || (inputs.advRank ? 'Advanced' : 'Mains');
  summaryParts.push(examLabel);

  const profileTags = (results?.profile?.vector_query || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  const filteredRows = view.rows;
  const visibleRows = filteredRows.slice(0, visibleCount);
  const showMatch = useMemo(
    () =>
      Boolean(results?.profile?.vector_query?.trim()) ||
      recommendations.some((item) => Number(item.similarity_score) > 0),
    [results, recommendations]
  );

  const resetVisible = () => setVisibleCount(40);

  const changeSearch = (value) => {
    setSearch(value);
    resetVisible();
  };

  const changeProbability = (value) => {
    setProbability(value);
    resetVisible();
  };

  const changeType = (value) => {
    setTypeFilter(value);
    resetVisible();
  };

  const changeCollege = (value) => {
    setCollegeFilter(value);
    resetVisible();
  };

  const changeSort = (value) => {
    setSortBy(value);
    resetVisible();
  };

  const toggleBranch = (key) => {
    setBranchGroups((previous) => ({ ...previous, [key]: !previous[key] }));
    resetVisible();
  };

  const clearFilters = () => {
    setSearch('');
    setProbability('All');
    setTypeFilter('All');
    setBranchGroups(EMPTY_BRANCHES);
    setCollegeFilter('All');
    resetVisible();
  };

  const openAmend = () => {
    setPrefText(inputs.preferences || '');
    setAmendOpen((open) => !open);
  };

  const applyPreferences = () => {
    setAmendOpen(false);
    onRefinePreferences?.(prefText);
  };

  const toggleRow = (key) => {
    setExpandedKey((current) => (current === key ? null : key));
  };

  const focusNote = (note) => {
    const key = note.item ? rowKey(note.item) : note.key;
    const index = recommendations.findIndex((item) => rowKey(item) === key);
    const inView = filteredRows.some((row) => rowKey(row.item) === key);

    if (!inView) {
      setSearch('');
      setTypeFilter('All');
      setBranchGroups(EMPTY_BRANCHES);
      setCollegeFilter('All');
      setProbability('All');
    }

    setVisibleCount((count) => Math.max(40, count, index + 1));
    setExpandedKey(key);

    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const row = rowRefs.current[key];
      if (!row) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }, 80);
  };

  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      const payload = {
        rank: inputs.rank ?? null,
        adv_rank: inputs.advRank || null,
        query: inputs.preferences || '',
        category: getBackendCategory(inputs.category, inputs.gender),
        homestate: inputs.homeState || '',
        exam_type: inputs.examType || 'Mains',
        profile: results?.profile || null,
      };
      const blob = await api.exportChoices(payload, token);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'josaa_choice_list.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export the choice list.');
    } finally {
      setExporting(false);
    }
  };

  const folioFor = (note) => {
    const index = filteredRows.findIndex((row) => rowKey(row.item) === note.key);
    const position = index >= 0 ? index + 1 : note.index + 1;
    return String(position).padStart(2, '0');
  };

  return (
    <section className="screen results-screen" aria-labelledby="results-title">
      <h1 id="results-title" className="sr-only">
        Ranked index
      </h1>

      <header className="results-profile">
        <div className="results-profile__main">
          <p className="results-profile__summary">{summaryParts.join(' · ')}</p>
          {profileTags.length ? (
            <div className="results-profile__tags">
              {profileTags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="results-profile__actions">
          <button
            type="button"
            className="btn btn--text btn--sm"
            onClick={openAmend}
            aria-expanded={amendOpen}
          >
            Amend
          </button>
          <button type="button" className="btn btn--text btn--sm" onClick={onEdit}>
            Back to profile
          </button>
        </div>

        {amendOpen ? (
          <div className="results-amend">
            <label className="field__label" htmlFor="results-preferences">
              Preferences
            </label>
            <textarea
              id="results-preferences"
              className="textarea"
              rows={3}
              value={prefText}
              onChange={(event) => setPrefText(event.target.value)}
              placeholder="What should the index weigh more: placements, research, campus life?"
            />
            <div className="results-amend__actions">
              <button type="button" className="btn btn--primary" onClick={applyPreferences}>
                Apply and re-rank
              </button>
              <button
                type="button"
                className="btn btn--text btn--sm"
                onClick={() => setAmendOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {notes.length ? (
        <section className="results-notes" aria-label="Why these fit">
          {notes.map((note) => (
            <button
              type="button"
              className="results-note"
              key={note.key}
              onClick={() => focusNote(note)}
            >
              <span className="results-note__folio">
                {folioFor(note)} / {note.item ? note.item.college_name : note.key}
                {note.item ? ` · ${note.item.branch_name}` : ''}
              </span>
              <span className="results-note__text">{note.text}</span>
            </button>
          ))}
        </section>
      ) : null}

      <div className="results-toolbar">
        <div className="results-toolbar__grid">
          <Field
            id="results-search"
            label="Search"
            className="results-toolbar__field results-toolbar__field--search"
          >
            <input
              id="results-search"
              className="input"
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="College or branch"
            />
          </Field>

          <div className="results-toolbar__field results-toolbar__field--probability">
            <span className="field__label" id="results-probability-label">
              Probability
            </span>
            <div className="segmented" role="group" aria-labelledby="results-probability-label">
              {PROBABILITIES.map((option) => (
                <button
                  type="button"
                  className="segmented__option"
                  key={option}
                  aria-pressed={probability === option}
                  onClick={() => changeProbability(option)}
                >
                  {option}
                  <span className="results-seg__count tabular">
                    {view.counts[option] ?? view.counts[option.toLowerCase()] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field id="results-type" label="College type" className="results-toolbar__field">
            <select
              id="results-type"
              className="select"
              value={typeFilter}
              onChange={(event) => changeType(event.target.value)}
            >
              <option value="All">All</option>
              <option value="IIT">IIT</option>
              <option value="NIT">NIT</option>
              <option value="IIIT">IIIT</option>
            </select>
          </Field>

          <fieldset className="results-branches results-toolbar__field">
            <legend className="field__label">Branch group</legend>
            <div className="results-branches__options">
              {BRANCH_GROUPS.map((group) => (
                <label className="results-check" key={group.key}>
                  <input
                    type="checkbox"
                    checked={branchGroups[group.key]}
                    onChange={() => toggleBranch(group.key)}
                  />
                  <span>{group.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            id="results-college"
            label="College"
            className="results-toolbar__field results-toolbar__field--college"
          >
            <select
              id="results-college"
              className="select"
              value={collegeFilter}
              onChange={(event) => changeCollege(event.target.value)}
            >
              <option value="All">All</option>
              {uniqueColleges.map((college) => (
                <option value={college} key={college}>
                  {college}
                </option>
              ))}
            </select>
          </Field>

          <Field id="results-sort" label="Sort" className="results-toolbar__field">
            <select
              id="results-sort"
              className="select"
              value={sortBy}
              onChange={(event) => changeSort(event.target.value)}
            >
              <option value="cutoff">Cutoff</option>
              <option value="nirf">NIRF</option>
              {showMatch ? <option value="match">Match</option> : null}
            </select>
          </Field>

          <div className="results-toolbar__export">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download aria-hidden="true" strokeWidth={1.5} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            {exportError ? (
              <p className="field__error" role="status">
                {exportError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="results-toolbar__meta">
          <span className="count tabular">
            {filteredRows.length} of {recommendations.length} entries
          </span>
          <button type="button" className="btn btn--text btn--sm" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="results-empty">
          <p>Nothing in the index matches these filters.</p>
          <button type="button" className="btn" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="results-table-wrap">
            <table className="results-table">
              <caption className="sr-only">Ranked college and branch entries</caption>
              <thead>
                <tr>
                  <th scope="col" className="results-col--folio">
                    Folio
                  </th>
                  <th scope="col">Institute and branch</th>
                  <th scope="col" className="results-col--number">
                    Closing
                  </th>
                  <th scope="col" className="results-col--rail">
                    Your rank
                  </th>
                  <th scope="col" className="results-col--number">
                    Placement
                  </th>
                  <th scope="col" className="results-col--number">
                    Avg CTC
                  </th>
                  <th scope="col" className="results-col--number">
                    NIRF
                  </th>
                  {showMatch ? (
                    <th scope="col" className="results-col--number">
                      Match
                    </th>
                  ) : null}
                  <th scope="col" className="results-col--action">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const key = rowKey(row.item);
                  const open = expandedKey === key;
                  const studentRank = studentRankFor(row.item, inputs);
                  const explanation = explanations[key];
                  const rowExam =
                    collegeType(row.item.college_name) === 'IIT'
                      ? 'Advanced'
                      : inputs.examType || 'Mains';

                  return (
                    <FragmentRow
                      key={`${key}-${index}`}
                      row={row}
                      folio={index + 1}
                      open={open}
                      rowKeyValue={key}
                      studentRank={studentRank}
                      explanation={explanation}
                      rowExam={rowExam}
                      inputs={inputs}
                      showMatch={showMatch}
                      onToggle={toggleRow}
                      setRowRef={(node) => {
                        rowRefs.current[key] = node;
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length > visibleCount ? (
            <div className="results-more">
              <button
                type="button"
                className="btn"
                onClick={() => setVisibleCount((count) => count + 40)}
              >
                Load 40 more
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function FragmentRow({
  row,
  folio,
  open,
  rowKeyValue,
  studentRank,
  explanation,
  rowExam,
  inputs,
  showMatch,
  onToggle,
  setRowRef,
}) {
  const item = row.item;
  const state = row.state;

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(rowKeyValue);
    }
  };

  return (
    <>
      <tr
        className={`results-row${open ? ' is-open' : ''}`}
        ref={setRowRef}
        tabIndex={0}
        onClick={() => onToggle(rowKeyValue)}
        onKeyDown={handleKeyDown}
      >
        <td className="results-cell results-cell--folio" data-label="Folio">
          <span className="tabular">{String(folio).padStart(2, '0')}</span>
        </td>
        <td className="results-cell results-cell--institute">
          <span className="results-institute">{item.college_name || '—'}</span>
          <span className="results-branch">{item.branch_name || '—'}</span>
        </td>
        <td className="results-cell results-cell--closing">
          <span className="results-cell__label mono-label">Closing</span>
          <span className="tabular">{formatRank(item.closing_rank)}</span>
        </td>
        <td className="results-cell results-cell--rail">
          <RankRail
            mode="row"
            rank={studentRank}
            advRank={inputs.advRank}
            closingRank={item.closing_rank}
            probability={state}
          />
        </td>
        <td className="results-cell results-cell--secondary results-cell--placement">
          <span className="tabular">{formatText(item.placement_percentage, '%')}</span>
        </td>
        <td className="results-cell results-cell--secondary results-cell--ctc">
          <span className="tabular">{formatCtc(item.avg_ctc)}</span>
        </td>
        <td className="results-cell results-cell--secondary results-cell--nirf">
          <span className="tabular">{formatNirf(item.nirf_rank)}</span>
        </td>
        {showMatch ? (
          <td className="results-cell results-cell--secondary results-cell--match">
            <span className="tabular">{formatMatch(item.similarity_score)}</span>
          </td>
        ) : null}
        <td className="results-cell results-cell--details">
          <button
            type="button"
            className="btn btn--text btn--sm"
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(rowKeyValue);
            }}
          >
            {open ? 'Close' : 'Details'}
          </button>
        </td>
      </tr>

      {open ? (
        <tr className="results-detail-row">
          <td colSpan={showMatch ? 9 : 8}>
            <div className="results-detail">
              <dl className="results-detail__list">
                <div className="results-detail__item">
                  <dt>2024 closing rank</dt>
                  <dd className="tabular">{formatRank(item.closing_rank_2024)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>2025 closing rank</dt>
                  <dd className="tabular">{formatRank(item.closing_rank_2025)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Median CTC</dt>
                  <dd className="tabular">{formatCtc(item.median_ctc)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Category</dt>
                  <dd>{categoryLabel(item.category || inputs.category)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Exam</dt>
                  <dd>{rowExam}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Student clubs</dt>
                  <dd>{formatList(item.student_clubs)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Sports</dt>
                  <dd>{formatList(item.sports_infrastructure)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Incubation centre</dt>
                  <dd>{formatList(item.incubation_center_name)}</dd>
                </div>
                <div className="results-detail__item">
                  <dt>Notable startups</dt>
                  <dd>{formatList(item.notable_startups)}</dd>
                </div>
                {showMatch ? (
                  <div className="results-detail__item">
                    <dt>Similarity score</dt>
                    <dd className="tabular">{formatMatch(item.similarity_score)}</dd>
                  </div>
                ) : null}
              </dl>

              {explanation ? (
                <div className="results-detail__note">
                  <span className="mono-label">Index note</span>
                  <p>{explanation}</p>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
