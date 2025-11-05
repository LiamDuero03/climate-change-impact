// 🌟 FIX 1: Import AI analysis functions from the module file
import { buildClimatePrompt, fetchAiAnalysis } from './text_gen.js'; 

let map; // Global variable to hold the Leaflet map instance
let tempChart, seaChart, co2Chart, customChart;
let climateData = []; // Global variable to hold CSV data

// 🌟 NEW: Load PapaParse
import Papa from 'papaparse';

// Function to initialize the map and placeholders
function initializeDashboard() {
    console.log("Dashboard initialized. Loading map and charts...");

    // 1. Initialize Leaflet Map
    map = L.map('impact-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 2. Initialize Chart.js instances
    tempChart = new Chart(document.getElementById('chart-temp'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Temperature (°C)', data: [], borderColor: '#FF5733', backgroundColor: 'rgba(255, 87, 51, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: false, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    seaChart = new Chart(document.getElementById('chart-sea'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Sea Level Rise (mm)', data: [], backgroundColor: '#33A0FF' }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    co2Chart = new Chart(document.getElementById('chart-co2'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'CO₂ (ppm)', data: [], borderColor: '#8A2BE2', backgroundColor: 'rgba(138, 43, 226, 0.1)', fill: true }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: false, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    customChart = new Chart(document.getElementById('chart-custom'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Regional Data', data: [], backgroundColor: '#4CAF50' }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });

    // 🌟 NEW: Load the CSV data
    Papa.parse('./temperature-data.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            climateData = results.data;
            console.log("CSV data loaded:", climateData.length, "rows");
        }
    });
}

// 🌟 NEW: Helper function to get country data
function getCountryData(countryName) {
    const filtered = climateData.filter(d => d.name === countryName);
    filtered.sort((a,b) => new Date(a.year) - new Date(b.year));
    const labels = filtered.map(d => d.year);
    const values = filtered.map(d => d.value);
    return { labels, values };
}

// 🌟 NEW: Update Chart.js with selected country
function updateTemperatureChart(countryName) {
    const { labels, values } = getCountryData(countryName);
    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = values;
    tempChart.data.datasets[0].label = `${countryName} Temperature (°C)`;
    tempChart.update();

    // Example: also update customChart
    customChart.data.labels = labels;
    customChart.data.datasets[0].data = values;
    customChart.data.datasets[0].label = `${countryName} Regional Metric`;
    customChart.update();
}

// Function to perform geocoding using Nominatim (remains unchanged)
async function geocodeLocation(location) { /* ...existing code... */ }

// Function to handle search
async function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();
    const searchButton = document.getElementById('search-button');
    if (!location) { alert('Please enter a location'); return; }

    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    const coords = await geocodeLocation(location);

    searchButton.textContent = 'Search Impact';
    searchButton.disabled = false;

    if (coords) {
        // Map marker & view updates (unchanged)
        map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
        L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`Impact Data for <b>${coords.locationName}</b>`).openPopup();
        if (coords.bbox) map.fitBounds([[coords.bbox[0], coords.bbox[2]],[coords.bbox[1], coords.bbox[3]]], { padding:[50,50], maxZoom:10 });
        else map.setView([coords.lat, coords.lon], 10);

        // 🌟 Update charts with real CSV data
        updateTemperatureChart(coords.locationName);

        // 🌟 AI analysis prompt
        const mockClimateData = {
            currentAvgTemp: (Math.random() * 5 + 10).toFixed(2),
            tempAnomaly: (Math.random() * 0.5 + 0.8).toFixed(2),
            seaLevelRise: (Math.random() * 1 + 3).toFixed(1)
        };
        const metaPrompt = buildClimatePrompt(coords.locationName, coords.lat.toFixed(4), coords.lon.toFixed(4), mockClimateData);
        fetchAiAnalysis(metaPrompt);

    } else {
        alert(`Could not find "${location}".`);
    }
}

// Attach event listeners
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); handleSearch(); } });

// Run initialization
window.onload = initializeDashboard;
