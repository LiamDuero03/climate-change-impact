// 🌟 FIX 1: Import AI analysis functions from the module file
import { buildClimatePrompt, fetchAiAnalysis } from './text_gen.js'; 

let map; 
let tempChart, precipChart, co2Chart, customChart; 
let tempData = [];
let precipData = [];

// ----------------------------
// Initialize dashboard & charts (UNCHANGED)
// ----------------------------
function initializeDashboard() {
    console.log("Dashboard initialized. Loading map and charts...");

    // 1. Initialize Leaflet Map
    map = L.map('impact-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 2. Chart Initialization 
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
    
    // 3. Load CSV data (Papa Parse)
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
// Helpers for country & global data (ADDED NEW HELPER)
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

/**
 * 🌟 NEW HELPER: Finds the latest data point for a given metric/country.
 * @param {Array} dataset - The tempData or precipData array.
 * @param {string} countryName - The normalized country name.
 * @returns {object} { year, value }
 */
function getLatestMetric(dataset, countryName) {
    const data = getCountryData(dataset, countryName);
    if (data.labels.length === 0) {
        return { year: 'N/A', value: 'N/A' };
    }
    
    // The data is already sorted by year in getCountryData, so the last element is the latest.
    const latestIndex = data.labels.length - 1;
    return {
        year: data.labels[latestIndex],
        value: parseFloat(data.values[latestIndex]).toFixed(2)
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
// Update charts (UNCHANGED)
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

    // Temperature
    if(tempCountry.labels.length>0) {
        tempChart.data.labels = tempCountry.labels;
        tempChart.data.datasets[0].data = tempCountry.values;
        tempChart.data.datasets[0].label = `${countryName} Temperature (°C)`;
        tempChart.update();
    } else {
        console.warn(`No temperature data found for ${countryName}. Reverting to global view.`);
        updateGlobalCharts();
    }

    // Precipitation
    if(precipCountry.labels.length>0) {
        precipChart.data.labels = precipCountry.labels;
        precipChart.data.datasets[0].data = precipCountry.values;
        precipChart.data.datasets[0].label = `${countryName} Precipitation (mm)`;
        precipChart.update();
    } else {
        console.warn(`No precipitation data found for ${countryName}. Reverting to global view.`);
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
            
            const nameParts = r.display_name.split(',').map(s=>s.trim());
            const country = nameParts.slice(-1)[0]; 

            const displayLocation = nameParts.length > 1 ? nameParts[0] + ', ' + nameParts.slice(-1)[0] : nameParts[0]; 

            return { 
                lat: parseFloat(r.lat), 
                lon: parseFloat(r.lon), 
                locationName: displayLocation, 
                countryName: country,         
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
        const chartLookupName = coords.countryName;
        
        // 🌟 NEW: Get the latest metrics for display
        const latestTemp = getLatestMetric(tempData, chartLookupName);
        const latestPrecip = getLatestMetric(precipData, chartLookupName);

        // 🌟 NEW: Build the popup content with inline metrics
        let popupContent = `
            <b>${coords.locationName}</b>
            <hr style="margin: 4px 0;">
            <p>🌡️ Temp (${latestTemp.year}): <b>${latestTemp.value}°C</b></p>
            <p>💧 Precip (${latestPrecip.year}): <b>${latestPrecip.value} mm</b></p>
        `;

        // Map updates
        map.eachLayer(layer => { if(layer instanceof L.Marker) map.removeLayer(layer); });
        L.marker([coords.lat, coords.lon])
            .addTo(map)
            .bindPopup(popupContent).openPopup(); // Use the rich content here
        
        if(coords.bbox) map.fitBounds([[coords.bbox[0], coords.bbox[2]],[coords.bbox[1], coords.bbox[3]]], {padding:[50,50], maxZoom:10});
        else map.setView([coords.lat, coords.lon], 10);

        // Update charts with country data
        updateCountryCharts(chartLookupName);

        // AI analysis (optional)
        const mockClimateData = {
            currentAvgTemp: (Math.random()*5+10).toFixed(2),
            tempAnomaly: (Math.random()*0.5+0.8).toFixed(2),
            seaLevelRise: (Math.random()*1+3).toFixed(1)
        };
        fetchAiAnalysis(buildClimatePrompt(chartLookupName, coords.lat.toFixed(4), coords.lon.toFixed(4), mockClimateData));

    } else {
        alert(`Could not find "${location}".`);
        updateGlobalCharts();
    }
}

// ----------------------------
// Event listeners & initialization (UNCHANGED)
// ----------------------------
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); handleSearch(); } });

window.onload = initializeDashboard;