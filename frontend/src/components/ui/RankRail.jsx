const SCALE_MAX = 300000;
const SPECIMEN_TICKS = [
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 100, label: '100' },
  { value: 1000, label: '1k' },
  { value: 10000, label: '10k' },
  { value: 100000, label: '100k' },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const formatRank = (value) => value.toLocaleString('en-US');

const logPosition = (value) => {
  const clamped = Math.min(Math.max(value, 1), SCALE_MAX);
  return (Math.log10(clamped) / Math.log10(SCALE_MAX)) * 100;
};

const normalizeState = (probability, closingRank, rank) => {
  if (typeof probability === 'string' && probability.trim()) {
    const text = probability.toLowerCase();
    if (text.startsWith('safe')) return 'safe';
    if (text.startsWith('reach')) return 'reach';
    return 'target';
  }
  if (typeof probability === 'number' && Number.isFinite(probability)) {
    if (probability >= 0.7) return 'safe';
    if (probability <= 0.4) return 'reach';
    return 'target';
  }
  if (closingRank === null || rank === null) return 'target';
  const ratio = closingRank / rank;
  if (ratio < 0.9) return 'reach';
  if (ratio > 1.1) return 'safe';
  return 'target';
};

const stateLabel = { safe: 'Safe', target: 'Target', reach: 'Reach' };

export default function RankRail({ rank, advRank, closingRank, mode = 'specimen', probability }) {
  const rankValue = toNumber(rank);
  const advValue = toNumber(advRank);
  const closingValue = toNumber(closingRank);

  if (mode === 'row') {
    const state = normalizeState(probability, closingValue, rankValue);
    const showLabel = probability !== undefined && probability !== null && probability !== '';

    let left = 50;
    if (rankValue !== null && closingValue !== null) {
      const offset = Math.log2(closingValue / rankValue) * 15;
      left = 50 + Math.max(-45, Math.min(45, offset));
    }

    const label = showLabel ? stateLabel[state] : '';
    const ariaLabel =
      rankValue !== null && closingValue !== null
        ? `Your rank ${formatRank(rankValue)}, closing rank ${formatRank(closingValue)}, ${stateLabel[state].toLowerCase()}.`
        : 'Closing rank not available.';

    return (
      <div className="rank-rail rank-rail--row" role="img" aria-label={ariaLabel}>
        <span className="rank-rail__track">
          <span className="rank-rail__line" aria-hidden="true" />
          <span className="rank-rail__tick" style={{ left: '50%' }} aria-hidden="true" />
          {closingValue !== null ? (
            <span
              className="rank-rail__marker"
              data-state={state}
              style={{ left: `${left}%` }}
              aria-hidden="true"
            />
          ) : null}
        </span>
        {label ? (
          <span className="rank-rail__label" aria-hidden="true">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  const hasRank = rankValue !== null;
  const classes = ['rank-rail', 'rank-rail--specimen', hasRank ? '' : 'is-empty']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="img"
      aria-label={
        hasRank
          ? `Rank position on a log scale from 1 to 300,000. Your rank ${formatRank(rankValue)}${
              advValue !== null ? `, JEE Advanced rank ${formatRank(advValue)}` : ''
            }.`
          : 'Rank position on a log scale from 1 to 300,000. No rank entered.'
      }
    >
      <span className="rank-rail__line" aria-hidden="true" />
      {SPECIMEN_TICKS.map((tick) => (
        <span
          key={tick.value}
          className="rank-rail__tick"
          style={{ left: `${logPosition(tick.value)}%` }}
          aria-hidden="true"
        >
          <span className="rank-rail__label">{tick.label}</span>
        </span>
      ))}
      {advValue !== null ? (
        <span
          className="rank-rail__marker"
          data-kind="adv"
          style={{ left: `${logPosition(advValue)}%` }}
          aria-hidden="true"
        />
      ) : null}
      {hasRank ? (
        <span
          className="rank-rail__marker"
          data-kind="rank"
          style={{ left: `${logPosition(rankValue)}%` }}
          aria-hidden="true"
        />
      ) : null}
      {hasRank ? null : <span className="rank-rail__empty">Enter a rank</span>}
    </div>
  );
}
