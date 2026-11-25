import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  id,
  label,
  options = [], // array of { value, label, sublabel?, count? }
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search colleges...',
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesLabel = (opt.label || '').toLowerCase().includes(query);
    const matchesSub = (opt.sublabel || '').toLowerCase().includes(query);
    return matchesLabel || matchesSub;
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`searchable-select-wrapper ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="searchable-select-label">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        className={`searchable-select-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="searchable-select-trigger__text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`searchable-select-trigger__chevron ${isOpen ? 'is-rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="searchable-select-popover" role="listbox">
          <div className="searchable-select-search-bar">
            <Search size={13} className="searchable-select-search-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="searchable-select-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="searchable-select-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="searchable-select-options-list">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-empty">
                No matching results found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`searchable-select-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="searchable-select-option__content">
                      <span className="searchable-select-option__label">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="searchable-select-option__sub">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="searchable-select-check" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
