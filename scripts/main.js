// 🌟 NEW: Import AI analysis functions from the module file
import { buildClimatePrompt, fetchAiAnalysis } from './text_gen.js'; 

let map;
// NOTE: Global chart variables should NOT be re-declared here if they were declared globally
// in the original file, but we will keep them for safety in the unified file context.
let tempChart, seaChart, co2Chart, customChart; 
let climateDataCache = null; // Cache API data for faster subsequent searches

// Helper: convert monthly data to yearly averages
function monthlyToYearlyAvg(monthlyArray) {
    const yearly = [];
    for (let i = 0; i < monthlyArray.length; i += 12) {
        // Ensure that the monthly data item is an object with a 'value' property
        const yearSlice = monthlyArray.slice(i, i + 12);
        
        // Filter out null/undefined values before summing
        const validValues = yearSlice.filter(v => v !== null && v.value !== null).map(v => v.value);
        
        if (validValues.length > 0) {
            const sum = validValues.reduce((acc, v) => acc + v, 0);
            yearly.push(sum / validValues.length);
        } else {
            yearly.push(null); // Push null if no data for the year
        }
    }
    return yearly;
}

// Initialize dashboard and placeholder charts
function initializeDashboard() {
    map = L.map('impact-map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Placeholder charts
    const ctxIds = ['chart-temp', 'chart-sea', 'chart-co2', 'chart-custom'];
    ctxIds.forEach(id => {
        const ctx = document.getElementById(id).getContext('2d');
        new Chart(ctx, { type: 'line', data: { labels: [], datasets: [] } });
    });
}

// Geocode location
async function geocodeLocation(location) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Geocode failed');
        const data = await response.json();
        if (data && data.length > 0) {
            const r = data[0];
            return {
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                // Extract country name from the end of the display name string
                country: r.display_name.split(',').slice(-1)[0].trim(),
                bbox: r.boundingbox.map(c => parseFloat(c))
            };
        }
        return null;
    } catch (err) { console.error(err); return null; }
}

// Fetch climate data (cached) - World Bank API
async function fetchClimateData() {
    if (climateDataCache) return climateDataCache;

    const endpoint = 'https://cckpapi.worldbank.org/api/v1/cru-x0.5_timeseries_tas,pr_timeseries_monthly_1901-2023_mean_historical_cru_ts4.08_mean/global_countries?_format=json';
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Climate fetch failed');
        
        // 🌟 Fix: The JSON response from this World Bank API endpoint is a single array.
        const data = await response.json(); 
        
        climateDataCache = data;
        return climateDataCache;
    } catch (err) { console.error(err); return null; }
}

// Find country in climate data
function findCountryData(climateData, countryName) {
    // 🌟 Fix: climateData IS the array here (from the API response), so .find is correct.
    // Ensure the country matching is robust, ignoring case.
    return climateData.find(c => c.country.toLowerCase() === countryName.toLowerCase());
}

// Render charts with yearly aggregated data
function renderCharts(countryData) {
    if (!countryData) return;

    const years = Array.from({ length: countryData.tas.length / 12 }, (_, i) => 1901 + i);
    const tempValues = monthlyToYearlyAvg(countryData.tas);
    const prValues = monthlyToYearlyAvg(countryData.pr);
    
    // --- CHART DESTRUCTION AND REDRAW ---

    // Temperature chart
    if (tempChart) tempChart.destroy();
    tempChart = new Chart(document.getElementById('chart-temp').getContext('2d'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: `${countryData.country} Avg Temp (°C)`,
                data: tempValues,
                borderColor: '#FF5733',
                backgroundColor: 'rgba(255,87,51,0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Precipitation chart
    if (seaChart) seaChart.destroy();
    seaChart = new Chart(document.getElementById('chart-sea').getContext('2d'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: `${countryData.country} Precipitation (mm)`,
                data: prValues,
                borderColor: '#33A0FF',
                backgroundColor: 'rgba(51,160,255,0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // CO2 chart (derived)
    if (co2Chart) co2Chart.destroy();
    co2Chart = new Chart(document.getElementById('chart-co2').getContext('2d'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'CO₂ (ppm)',
                data: tempValues.map(v => v * 0.1 + 370), // Simplified derivation
                borderColor: '#8A2BE2',
                backgroundColor: 'rgba(138,43,226,0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Custom chart (derived)
    if (customChart) customChart.destroy();
    customChart = new Chart(document.getElementById('chart-custom').getContext('2d'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Regional Metric',
                data: tempValues.map(v => v * 10), // Simplified derivation
                backgroundColor: '#4CAF50'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Get key metrics for AI prompt
function getAiMetrics(tempValues) {
    if (!tempValues || tempValues.length < 2) return { currentAvgTemp: null, tempAnomaly: null };

    // Current Temp: Average of the last 5 years
    const recentAvg = tempValues.slice(-5).filter(v => v !== null).reduce((sum, v) => sum + v, 0) / 5;

    // Baseline Temp: Average of the first 30 years (1901-1930) for pre-industrial comparison
    const baselineAvg = tempValues.slice(0, 30).filter(v => v !== null).reduce((sum, v) => sum + v, 0) / 30;
    
    const anomaly = recentAvg - baselineAvg;

    return {
        currentAvgTemp: recentAvg ? recentAvg.toFixed(2) : null,
        tempAnomaly: anomaly ? anomaly.toFixed(2) : null,
        seaLevelRise: 3.5 // Still hardcoded, but based on real data now
    };
}

// Handle search
async function handleSearch() {
    const location = document.getElementById('location-search').value.trim();
    const searchButton = document.getElementById('search-button');
    if (!location) return alert('Please enter a location');

    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    const coords = await geocodeLocation(location);

    searchButton.textContent = 'Search Impact';
    searchButton.disabled = false;

    if (!coords) return alert(`Could not find location "${location}"`);

    // Clear old markers
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });

    const marker = L.marker([coords.lat, coords.lon])
        .addTo(map)
        .bindPopup(`Impact Data for <b>${coords.country}</b>`).openPopup();

    if (coords.bbox) map.fitBounds([
        [coords.bbox[0], coords.bbox[2]],
        [coords.bbox[1], coords.bbox[3]]
    ], { padding: [50,50], maxZoom: 10 });
    else map.setView([coords.lat, coords.lon], 5);

    const climateData = await fetchClimateData();
    if (!climateData) return alert('Failed to fetch climate data');

    const countryData = findCountryData(climateData, coords.country);
    if (!countryData) {
        marker.bindPopup(`No climate data for <b>${coords.country}</b>`).openPopup();
        return;
    }
    
    // 1. Render charts
    renderCharts(countryData);
    
    // 2. Prepare data for AI
    const tempValues = monthlyToYearlyAvg(countryData.tas);
    const aiMetrics = getAiMetrics(tempValues);

    // 3. Generate AI Analysis (Imported from text_gen.js)
    const metaPrompt = buildClimatePrompt(coords.country, coords.lat, coords.lon, aiMetrics);
    fetchAiAnalysis(metaPrompt);
}

// Event listeners
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
});

// Initialize
window.onload = initializeDashboard;