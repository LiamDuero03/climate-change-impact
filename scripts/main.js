// 🌟 FIX 1: Import AI analysis functions from the module file
import { buildClimatePrompt, fetchAiAnalysis } from './text_gen.js'; 

let map; 
let tempChart, seaChart, co2Chart, customChart;
let climateData = []; 


function initializeDashboard() {
    console.log("Dashboard initialized. Loading map and charts...");

    // Initialize Leaflet Map
    map = L.map('impact-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Initialize Chart.js instances
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

    // Load CSV data
    Papa.parse('./temperature-data.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            climateData = results.data;
            console.log("CSV data loaded:", climateData.length, "rows");

            // Show global metrics by default
            updateGlobalCharts();
        }
    });
}

// Normalize country names for matching
function normalizeCountry(name) {
    return name.replace(/\s*\(.*\)/, '').trim().toLowerCase();
}

// Get country data
function getCountryData(searchName) {
    const normSearch = normalizeCountry(searchName);
    const filtered = climateData.filter(d => normalizeCountry(d.name) === normSearch);
    filtered.sort((a, b) => new Date(a.year) - new Date(b.year));
    const labels = filtered.map(d => new Date(d.year).getFullYear());
    const values = filtered.map(d => d.value);
    return { labels, values };
}

// Get global averages per year
function getGlobalData() {
    const byYear = {};
    climateData.forEach(d => {
        const year = new Date(d.year).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(d.value);
    });

    const labels = Object.keys(byYear).sort((a,b)=>a-b);
    const values = labels.map(y => {
        const vals = byYear[y];
        return (vals.reduce((sum,v)=>sum+v,0)/vals.length).toFixed(2);
    });

    return { labels, values };
}

// Update charts with global data
function updateGlobalCharts() {
    const { labels, values } = getGlobalData();

    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = values;
    tempChart.data.datasets[0].label = `Global Avg Temperature (°C)`;
    tempChart.update();

    customChart.data.labels = labels;
    customChart.data.datasets[0].data = values;
    customChart.data.datasets[0].label = `Global Regional Metric`;
    customChart.update();
}

// Update charts with country-specific data
function updateCountryCharts(countryName) {
    const { labels, values } = getCountryData(countryName);
    if(labels.length === 0) {
        console.warn(`No CSV data for "${countryName}"`);
        updateGlobalCharts();
        return;
    }

    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = values;
    tempChart.data.datasets[0].label = `${countryName} Temperature (°C)`;
    tempChart.update();

    customChart.data.labels = labels;
    customChart.data.datasets[0].data = values;
    customChart.data.datasets[0].label = `${countryName} Regional Metric`;
    customChart.update();
}

// Geocoding function
async function geocodeLocation(location) { 
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    try {
        const response = await fetch(url);
        if(!response.ok) throw new Error('Geocoding failed');
        const data = await response.json();
        if(data && data.length>0) {
            const result = data[0];
            const nameParts = result.display_name.split(',').map(s=>s.trim());
            const displayLocation = nameParts.length>1 ? nameParts[0]+', '+nameParts.slice(-1)[0] : nameParts[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                locationName: displayLocation,
                bbox: result.boundingbox.map(Number)
            };
        }
        return null;
    } catch(err) {
        console.error("Geocoding error:", err);
        return null;
    }
}

// Handle search
async function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();
    const searchButton = document.getElementById('search-button');

    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    if(!location) {
        updateGlobalCharts();
        searchButton.textContent = 'Search Impact';
        searchButton.disabled = false;
        return;
    }

    const coords = await geocodeLocation(location);

    searchButton.textContent = 'Search Impact';
    searchButton.disabled = false;

    if(coords) {
        map.eachLayer(layer => { if(layer instanceof L.Marker) map.removeLayer(layer); });
        L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`Impact Data for <b>${coords.locationName}</b>`).openPopup();
        if(coords.bbox) map.fitBounds([[coords.bbox[0], coords.bbox[2]],[coords.bbox[1], coords.bbox[3]]], {padding:[50,50], maxZoom:10});
        else map.setView([coords.lat, coords.lon], 10);

        // Update charts
        updateCountryCharts(coords.locationName);

        // AI analysis (optional)
        const mockClimateData = {
            currentAvgTemp: (Math.random()*5+10).toFixed(2),
            tempAnomaly: (Math.random()*0.5+0.8).toFixed(2),
            seaLevelRise: (Math.random()*1+3).toFixed(1)
        };
        const metaPrompt = buildClimatePrompt(coords.locationName, coords.lat.toFixed(4), coords.lon.toFixed(4), mockClimateData);
        fetchAiAnalysis(metaPrompt);

    } else {
        alert(`Could not find "${location}".`);
        updateGlobalCharts();
    }
}

// Event listeners
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); handleSearch(); } });

window.onload = initializeDashboard;
