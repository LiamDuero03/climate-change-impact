// 🌟 FIX 1: Import AI analysis functions from the module file
import { buildClimatePrompt, fetchAiAnalysis } from './text_gen.js'; 

let map; 
let tempChart, precipChart, co2Chart, customChart; 
let tempData = [];
let precipData = [];

// ----------------------------
// Initialize dashboard & charts
// ----------------------------
function initializeDashboard() {
    console.log("Dashboard initialized. Loading map and charts...");

    // 1. Initialize Leaflet Map
    map = L.map('impact-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 2. Chart Initialization (Chart IDs must match HTML)

    // Temperature chart
    const tempCtx = document.getElementById('chart-temp');
    if (tempCtx) { 
        tempChart = new Chart(tempCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Temperature (°C)', data: [], borderColor: '#FF5733', backgroundColor: 'rgba(255,87,51,0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: false, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
                plugins: { legend: { labels: { color: '#e0e0e0' } } }
            }
        });
    }

    // Precipitation chart (Assumed HTML ID is 'chart-precip', not 'chart-sea')
    const precipCtx = document.getElementById('chart-precip'); 
    if (precipCtx) { 
        precipChart = new Chart(precipCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Precipitation (mm)', data: [], borderColor: '#33A0FF', backgroundColor: 'rgba(51,160,255,0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: false, grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
                plugins: { legend: { labels: { color: '#e0e0e0' } } }
            }
        });
    }
    
    // NOTE: You need to add co2Chart and customChart initializations here or ensure your HTML has placeholders for them
    // Otherwise, subsequent code trying to update them will throw errors.

    // 3. Load CSV data (Papa Parse)
    // Load temperature CSV
    Papa.parse('./data/tidy-temperature.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            tempData = results.data.filter(row => row.name && row.value !== null);
            console.log("Temperature CSV loaded:", tempData.length, "rows");
            updateGlobalCharts();
        }
    });

    // Load precipitation CSV
    Papa.parse('./data/tidy-percipitation.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            precipData = results.data.filter(row => row.name && row.value !== null);
            console.log("Precipitation CSV loaded:", precipData.length, "rows");
            updateGlobalCharts();
        }
    });
}

// ----------------------------
// Helpers for country & global data
// ----------------------------
function normalizeCountry(name) {
    if (!name || typeof name !== 'string') {
        console.warn("Invalid country name received:", name);
        return ""; 
    }
    return name.replace(/\s*\(.*\)/, '').trim().toLowerCase();
}

function getCountryData(dataset, searchName) {
    const normSearch = normalizeCountry(searchName); 
    
    if (normSearch === "") {
        return { labels: [], values: [] };
    }
    
    const filtered = dataset.filter(d => 
        d.name && d.value !== null && normalizeCountry(d.name) === normSearch
    );
    
    filtered.sort((a,b) => new Date(a.year) - new Date(b.year));
    return {
        labels: filtered.map(d => new Date(d.year).getFullYear()),
        values: filtered.map(d => d.value)
    };
}

function getGlobalData(dataset) {
    const validDataset = dataset.filter(d => d.year && d.value !== null && d.value !== undefined);

    const byYear = {};
    validDataset.forEach(d => {
        const year = new Date(d.year).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(d.value);
    });
    const labels = Object.keys(byYear).sort((a,b)=>a-b);
    const values = labels.map(y => (byYear[y].reduce((sum,v)=>sum+v,0)/byYear[y].length).toFixed(2));
    return { labels, values };
}

// ----------------------------
// Update charts
// ----------------------------
function updateGlobalCharts() {
    if (!tempChart || !precipChart) return; 

    // Temperature
    const tempGlobal = getGlobalData(tempData);
    tempChart.data.labels = tempGlobal.labels;
    tempChart.data.datasets[0].data = tempGlobal.values;
    tempChart.data.datasets[0].label = "Global Avg Temperature (°C)";
    tempChart.update();

    // Precipitation
    const precipGlobal = getGlobalData(precipData);
    precipChart.data.labels = precipGlobal.labels;
    precipChart.data.datasets[0].data = precipGlobal.values;
    precipChart.data.datasets[0].label = "Global Avg Precipitation (mm)";
    precipChart.update();
}

function updateCountryCharts(countryName) {
    if (!tempChart || !precipChart) return; 
    
    const tempCountry = getCountryData(tempData, countryName);
    const precipCountry = getCountryData(precipData, countryName);

    if(tempCountry.labels.length>0) {
        tempChart.data.labels = tempCountry.labels;
        tempChart.data.datasets[0].data = tempCountry.values;
        tempChart.data.datasets[0].label = `${countryName} Temperature (°C)`;
        tempChart.update();
    } else {
        console.warn(`No temperature data found for ${countryName}.`);
        // If no country data found, revert to global data view for temperature
        updateGlobalCharts();
    }

    if(precipCountry.labels.length>0) {
        precipChart.data.labels = precipCountry.labels;
        precipChart.data.datasets[0].data = precipCountry.values;
        precipChart.data.datasets[0].label = `${countryName} Precipitation (mm)`;
        precipChart.update();
    } else {
        console.warn(`No precipitation data found for ${countryName}.`);
        // If no country data found, revert to global data view for precipitation
        updateGlobalCharts();
    }
}

// ----------------------------
// Geocoding & search
// ----------------------------
async function geocodeLocation(location) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    try {
        const response = await fetch(url);
        if(!response.ok) throw new Error("Geocoding failed");
        const data = await response.json();
        if(data.length > 0){
            const r = data[0];
            
            // 🌟 FIX: Extract Country Name from display_name (usually the last element)
            const nameParts = r.display_name.split(',').map(s=>s.trim());
            // This attempts to find the country name by taking the last part of the address string.
            // e.g., "London, England, United Kingdom" -> "United Kingdom"
            const country = nameParts.slice(-1)[0]; 

            // Use the full name for the map marker popup
            const displayLocation = nameParts.length > 1 ? nameParts[0] + ', ' + nameParts.slice(-1)[0] : nameParts[0]; 

            return { 
                lat: parseFloat(r.lat), 
                lon: parseFloat(r.lon), 
                locationName: displayLocation, // City name for display
                countryName: country,         // 🌟 NEW: Country name for chart lookup
                bbox: r.boundingbox.map(Number) 
            };
        }
        return null;
    } catch(err){ console.error(err); return null; }
}

async function handleSearch() {
    const searchInput = document.getElementById('location-search');
    const location = searchInput.value.trim();
    const searchButton = document.getElementById('search-button');

    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    if(!location){
        updateGlobalCharts();
        searchButton.textContent = 'Search Impact';
        searchButton.disabled = false;
        return;
    }

    const coords = await geocodeLocation(location);

    searchButton.textContent = 'Search Impact';
    searchButton.disabled = false;

    if(coords){
        // Map updates
        map.eachLayer(layer => { if(layer instanceof L.Marker) map.removeLayer(layer); });
        L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`Impact Data for <b>${coords.locationName}</b>`).openPopup();
        if(coords.bbox) map.fitBounds([[coords.bbox[0], coords.bbox[2]],[coords.bbox[1], coords.bbox[3]]], {padding:[50,50], maxZoom:10});
        else map.setView([coords.lat, coords.lon], 10);

        // 🌟 FIX: Use the extracted countryName for chart lookup
        const chartLookupName = coords.countryName;
        updateCountryCharts(chartLookupName);

        // AI analysis (optional)
        const mockClimateData = {
            currentAvgTemp: (Math.random()*5+10).toFixed(2),
            tempAnomaly: (Math.random()*0.5+0.8).toFixed(2),
            seaLevelRise: (Math.random()*1+3).toFixed(1)
        };
        // Use the country name for the AI prompt
        fetchAiAnalysis(buildClimatePrompt(chartLookupName, coords.lat.toFixed(4), coords.lon.toFixed(4), mockClimateData));

    } else {
        alert(`Could not find "${location}".`);
        updateGlobalCharts();
    }
}

// ----------------------------
// Event listeners & initialization
// ----------------------------
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); handleSearch(); } });

// Ensure all scripts (Leaflet, Chart.js, Papa Parse) are loaded before running JS logic.
window.onload = initializeDashboard;