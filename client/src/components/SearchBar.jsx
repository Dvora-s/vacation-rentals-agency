import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

function SearchBar() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [guests, setGuests] = useState('');
  const [dates, setDates] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (guests) params.set('guests', guests);
    navigate(`/apartments?${params.toString()}`);
  }

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <p className="search-label">חיפוש מהיר</p>
      <div className="search-fields">
        <div className="search-field">
          <span className="field-icon">📅</span>
          <input
            type="text"
            placeholder="תאריכים (מ - עד)"
            value={dates}
            onChange={(e) => setDates(e.target.value)}
          />
        </div>
        <div className="search-divider" />
        <div className="search-field">
          <span className="field-icon">👤</span>
          <input
            type="number"
            min="1"
            placeholder="אורחים"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>
        <div className="search-divider" />
        <div className="search-field">
          <span className="field-icon">📍</span>
          <input
            type="text"
            placeholder="מיקום"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <button type="submit" className="search-btn btn-primary">
          חיפוש
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
