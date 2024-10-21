// Get the elements from the HTML
const movieInput = document.getElementById('movie-input');
const autocompleteResults = document.getElementById('autocomplete-results');
const movieForm = document.getElementById('movie-form');

// Function to handle the input event
movieInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        try {
            const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            displayAutocomplete(data);
        } catch (error) {
            console.error('Error searching for movies:', error);
        }
    } else {
        autocompleteResults.innerHTML = '';
    }
}, 300));

// Function to debounce the search
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

// Function to display the autocomplete results
function displayAutocomplete(results) {
    autocompleteResults.innerHTML = '';
    results.forEach(movie => {
        const div = document.createElement('div');
        div.textContent = movie;
        div.addEventListener('click', () => {
            movieInput.value = movie;
            autocompleteResults.innerHTML = '';
        });
        autocompleteResults.appendChild(div);
    });
}

// Function to hide the autocomplete results when clicking outside of the input
document.addEventListener('click', (e) => {
    if (e.target !== movieInput && !autocompleteResults.contains(e.target)) {
        autocompleteResults.innerHTML = '';
    }
});

// Function to submit the form
movieForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (movieInput.value.trim()) {
        movieForm.submit();
    }
});

