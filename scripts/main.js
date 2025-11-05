let map; // Global variable to hold the Leaflet map instance
// Global variables for Chart.js instances
let tempChart, seaChart, co2Chart, customChart;

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

    // 2. Initialize Chart.js instances (Simple placeholder charts)
    // NOTE: Setting maintainAspectRatio: false is crucial since we defined h-64 in HTML
    
    // Temperature Anomaly Chart
    tempChart = new Chart(document.getElementById('chart-temp'), {
        type: 'line',
        data: { 
            labels: ['2000', '2010', '2020'], 
            datasets: [{ 
                label: 'Global Temp Anomaly (°C)', 
                data: [0.2, 0.5, 0.8], 
                borderColor: '#FF5733', // Reddish-orange for heat
                backgroundColor: 'rgba(255, 87, 51, 0.1)'
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: false, grid: { color: '#333' } },
                x: { grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    // Sea Level Change Chart
    seaChart = new Chart(document.getElementById('chart-sea'), {
        type: 'bar',
        data: { 
            labels: ['1993', '2005', '2018'], 
            datasets: [{ 
                label: 'Sea Level Rise (mm)', 
                data: [0, 40, 90],
                backgroundColor: '#33A0FF', // Blue for water
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, grid: { color: '#333' } },
                x: { grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    // CO2 Concentration Chart (Placeholder, usually global data)
    co2Chart = new Chart(document.getElementById('chart-co2'), {
        type: 'line',
        data: { 
            labels: ['2000', '2010', '2020'], 
            datasets: [{ 
                label: 'CO₂ (ppm)', 
                data: [369, 390, 412], 
                borderColor: '#8A2BE2', // Purple for atmospheric data
                backgroundColor: 'rgba(138, 43, 226, 0.1)',
                fill: true
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: false, grid: { color: '#333' } },
                x: { grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    // Regional Metric Chart (Starts empty)
    customChart = new Chart(document.getElementById('chart-custom'), {
        type: 'bar',
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Regional Data', 
                data: [],
                backgroundColor: '#4CAF50', // Primary green color
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, grid: { color: '#333' } },
                x: { grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

} // End of initializeDashboard function

// Function to perform geocoding using the Nominatim API (No changes needed here)
async function geocodeLocation(location) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                bbox: result.boundingbox.map(coord => parseFloat(coord))
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding Error:", error);
        return null;
    }
}

// Function to handle the search action and update the map (No changes needed here)
async function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();
    const searchButton = document.getElementById('search-button');

    if (!location) {
        alert('Please enter a location to search.');
        return;
    }

    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    const coords = await geocodeLocation(location);

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
            map.fitBounds([
                [coords.bbox[0], coords.bbox[2]], 
                [coords.bbox[1], coords.bbox[3]]  
            ], { padding: [50, 50], maxZoom: 10 }); 
        } else {
            map.setView([coords.lat, coords.lon], 10); 
        }

        // 5. TODO: Fetch detailed climate data and update the charts below!
        // You will create this function next.
        // updateCharts(coords.lat, coords.lon); 

    } else {
        alert(`Could not find a location for "${location}". Please try another search term.`);
    }
}

// Attach event listeners
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
    }
});

// Run the initialization when the page is fully loaded
window.onload = initializeDashboard;