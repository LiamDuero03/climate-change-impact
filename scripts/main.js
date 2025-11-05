// Function to handle the search action
function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();

    if (location) {
        console.log(`Searching for climate impact data for: ${location}`);
        
        // **TODO: Implement API call here**
        // 1. Fetch data for the specified location.
        // 2. Update the interactive map (e.g., center view, add marker/overlay).
        // 3. Populate the graph boxes with new data.

        // Example: Simple placeholder update
        alert(`Data for "${location}" would be loaded now!`);
    } else {
        alert('Please enter a location to search.');
    }
}

// Event listener for the search button
document.getElementById('search-button').addEventListener('click', handleSearch);

// Event listener for pressing 'Enter' in the search bar
document.getElementById('location-search').addEventListener('keypress', function(event) {
    // Check if the key pressed is 'Enter' (key code 13)
    if (event.key === 'Enter') {
        handleSearch();
    }
});

// Initial function to set up the map and charts (placeholders)
function initializeDashboard() {
    console.log("Dashboard initialized. Map and Chart libraries should be loaded here.");
    
    // **TODO: Implement Map Initialization**
    // e.g., Leaflet: const map = L.map('impact-map').setView([0, 0], 2);
    
    // **TODO: Implement Chart Initialization**
    // e.g., Chart.js: new Chart(document.getElementById('chart-temp'), { /* config */ });
}

// Run the initialization when the page is fully loaded
window.onload = initializeDashboard;