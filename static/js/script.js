/**
 * Movie Recommendation System - Frontend JavaScript
 * Handles autocomplete functionality and form interactions
 */

// DOM Elements
const movieForm = document.getElementById('movie-form');
const movieInput = document.getElementById('movie-input');
const autocompleteResults = document.getElementById('autocomplete-results');

// Configuration
const DEBOUNCE_DELAY = 300; // Milliseconds to wait before making API call
const MIN_CHARS_SEARCH = 2; // Minimum characters before triggering search

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Fetch movie suggestions from the server
 * @param {string} query - Search query
 */
async function fetchMovieSuggestions(query) {
    try {
        const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
}

/**
 * Display autocomplete results
 * @param {Array} results - Movie suggestions
 */
function displayAutocomplete(results) {
    // Clear previous results
    autocompleteResults.innerHTML = '';
    
    if (!results.length) {
        autocompleteResults.style.display = 'none';
        return;
    }

    // Create and append result elements
    const resultsList = document.createElement('ul');
    resultsList.className = 'autocomplete-list';

    results.forEach(movie => {
        const li = document.createElement('li');
        li.textContent = movie;
        li.addEventListener('click', () => {
            movieInput.value = movie;
            autocompleteResults.style.display = 'none';
        });
        resultsList.appendChild(li);
    });

    autocompleteResults.appendChild(resultsList);
    autocompleteResults.style.display = 'block';
}

// Event Handlers
const handleInput = debounce(async (event) => {
    const query = event.target.value.trim();
    
    if (query.length < MIN_CHARS_SEARCH) {
        autocompleteResults.style.display = 'none';
        return;
    }

    const suggestions = await fetchMovieSuggestions(query);
    displayAutocomplete(suggestions);
}, DEBOUNCE_DELAY);

// Event Listeners
movieInput.addEventListener('input', handleInput);

// Close autocomplete when clicking outside
document.addEventListener('click', (event) => {
    if (!movieForm.contains(event.target)) {
        autocompleteResults.style.display = 'none';
    }
});

// Form submission handler
movieForm.addEventListener('submit', (event) => {
    if (!movieInput.value.trim()) {
        event.preventDefault();
    }
});

// Add keyboard navigation for accessibility
movieInput.addEventListener('keydown', (event) => {
    const list = autocompleteResults.querySelector('.autocomplete-list');
    if (!list) return;

    const items = list.getElementsByTagName('li');
    let currentFocus = -1;

    switch (event.key) {
        case 'ArrowDown':
            currentFocus = Math.min(currentFocus + 1, items.length - 1);
            highlightItem(items, currentFocus);
            event.preventDefault();
            break;
        case 'ArrowUp':
            currentFocus = Math.max(currentFocus - 1, 0);
            highlightItem(items, currentFocus);
            event.preventDefault();
            break;
        case 'Enter':
            if (currentFocus > -1) {
                items[currentFocus].click();
                event.preventDefault();
            }
            break;
        case 'Escape':
            autocompleteResults.style.display = 'none';
            break;
    }
});

/**
 * Highlight selected item in autocomplete list
 * @param {HTMLCollection} items - List items
 * @param {number} index - Index of item to highlight
 */
function highlightItem(items, index) {
    Array.from(items).forEach((item, idx) => {
        item.classList.toggle('highlighted', idx === index);
    });
}
