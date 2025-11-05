let map; // Global variable to hold the Leaflet map instance
// You can also store chart instances globally if needed
// let tempChart, seaChart, co2Chart, customChart;

// Function to initialize the map and placeholders
function initializeDashboard() {
    console.log("Dashboard initialized. Loading map and charts...");

    // 1. Initialize Leaflet Map
    // Set view to center (20, 0) and zoom level 2 (world view)
    map = L.map('impact-map').setView([20, 0], 2);

    // Add OpenStreetMap tiles (the visual layer of the map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 2. TODO: Initialize your Chart.js instances here 
    // Example: 
    /*
    tempChart = new Chart(document.getElementById('chart-temp'), {
        type: 'line',
        data: { 
            labels: ['2000', '2010', '2020'], 
            datasets: [{ label: 'Temp Anomaly', data: [0.2, 0.5, 0.8] }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false } }
        }
    });
    */
}

// Function to perform geocoding using the Nominatim API
async function geocodeLocation(location) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Return the latitude, longitude, and bounding box (for map zoom)
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                // Parse the bounding box for a more accurate zoom
                bbox: result.boundingbox.map(coord => parseFloat(coord))
            };
        }
        return null; // No results found
    } catch (error) {
        console.error("Geocoding Error:", error);
        return null;
    }
}

// Function to handle the search action and update the map
async function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();
    const searchButton = document.getElementById('search-button');

    if (!location) {
        alert('Please enter a location to search.');
        return;
    }

    // Disable button and show loading state
    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    // 1. Geocode the location
    const coords = await geocodeLocation(location);

    // Re-enable button
    searchButton.textContent = 'Search Impact';
    searchButton.disabled = false;

    if (coords) {
        console.log(`Location found: Lat ${coords.lat}, Lon ${coords.lon}`);

        // 2. Clear any existing markers (Map functionality)
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // 3. Add a marker to the new location
        L.marker([coords.lat, coords.lon])
            .addTo(map)
            .bindPopup(`Impact Data for <b>${location}</b>`).openPopup();
        
        // 4. Update the map view
        if (coords.bbox) {
            // Fit the map view to the bounds provided by the geocoder
            map.fitBounds([
                [coords.bbox[0], coords.bbox[2]], // South, West
                [coords.bbox[1], coords.bbox[3]]  // North, East
            ], { padding: [50, 50], maxZoom: 10 }); 
        } else {
            // Fallback: simply pan and zoom
            map.setView([coords.lat, coords.lon], 10); 
        }

        // 5. TODO: Fetch detailed climate data and update the charts below!
        // This is where your API calls will go.
        // updateCharts(coords.lat, coords.lon);

    } else {
        alert(`Could not find a location for "${location}". Please try another search term.`);
    }
}

// Attach event listeners
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission if in a form
        handleSearch();
    }
});

// Run the initialization when the page is fully loaded
window.onload = initializeDashboard;