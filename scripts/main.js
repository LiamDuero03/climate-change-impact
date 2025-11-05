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

    // 🌟 NEW: Attach click handler to the map
    map.on('click', handleMapClick); 

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
// Helpers for country & global data (UNCHANGED)
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

function getLatestMetric(dataset, countryName) {
    const data = getCountryData(dataset, countryName);
    if (data.labels.length === 0) {
        return { year: 'N/A', value: 'N/A' };
    }
    
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

function determinePrimaryRisk(countryName) {
    const tempHistorical = getCountryData(tempData, countryName).values.map(Number);
    const precipHistorical = getCountryData(precipData, countryName).values.map(Number);

    if (tempHistorical.length < 35 || precipHistorical.length < 35) {
        return { 
            primaryRisk: 'Insufficient Data', 
            magnitude: 'N/A', 
            tempAnomaly: 'N/A', 
            precipChange: 'N/A' 
        };
    }

    const T_baseline = tempHistorical.slice(0, 30).reduce((a, b) => a + b) / 30;
    const P_baseline = precipHistorical.slice(0, 30).reduce((a, b) => a + b) / 30;
    const T_current = tempHistorical.slice(-5).reduce((a, b) => a + b) / 5;
    const P_current = precipHistorical.slice(-5).reduce((a, b) => a + b) / 5;

    const tempAnomaly = T_current - T_baseline; 
    const precipChangePercent = ((P_current - P_baseline) / P_baseline) * 100;

    let tempRiskScore = 0;
    if (tempAnomaly >= 1.5) tempRiskScore = 3; 
    else if (tempAnomaly >= 1.0) tempRiskScore = 2; 
    else if (tempAnomaly > 0) tempRiskScore = 1; 

    let precipRiskScore = 0;
    const absPrecipChange = Math.abs(precipChangePercent);

    if (precipChangePercent < -10) precipRiskScore = 3; 
    else if (absPrecipChange >= 15) precipRiskScore = 2.5; 
    else if (absPrecipChange >= 5) precipRiskScore = 2; 
    else if (absPrecipChange > 0) precipRiskScore = 1; 

    let primaryRisk = 'Monitor Change';
    let riskMagnitude = 'Low';

    if (tempRiskScore > precipRiskScore) {
        primaryRisk = 'Temperature: Heatwave & Warming Trend';
        if (tempRiskScore === 3) riskMagnitude = 'High';
        else if (tempRiskScore === 2) riskMagnitude = 'Medium';
    } else if (precipRiskScore > tempRiskScore) {
        primaryRisk = precipChangePercent < 0 ? 'Precipitation: Drought Risk' : 'Precipitation: Flood/Rainfall Increase';
        if (precipRiskScore >= 2.5) riskMagnitude = 'High';
        else if (precipRiskScore === 2) riskMagnitude = 'Medium';
    } else if (tempRiskScore > 0) {
        primaryRisk = 'Both Metrics Show Significant Change';
        riskMagnitude = tempRiskScore === 3 ? 'High' : 'Medium';
    }

    return {
        primaryRisk: primaryRisk,
        magnitude: riskMagnitude,
        tempAnomaly: tempAnomaly.toFixed(2),
        precipChange: precipChangePercent.toFixed(1)
    };
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
// Geocoding & search (UNCHANGED)
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

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    try {
        const response = await fetch(url);
        if(!response.ok) throw new Error("Reverse Geocoding failed");
        const data = await response.json();
        
        if (data.address && data.address.country) {
            return {
                countryName: data.address.country,
                locationName: data.display_name.split(',').slice(0, 3).join(', ') 
            };
        }
        return null;
    } catch(err){ console.error("Reverse Geocoding Error:", err); return null; }
}

/**
 * 🌟 NEW: Consolidated function to update the map, charts, and AI analysis.
 */
async function updateDashboard(lat, lon, countryName, locationName, bbox = null) {
    const chartLookupName = countryName;
    
    // 1. Get metrics and risk assessment
    const latestTemp = getLatestMetric(tempData, chartLookupName);
    const latestPrecip = getLatestMetric(precipData, chartLookupName);
    const riskAssessment = determinePrimaryRisk(chartLookupName); 

    // 2. Build the popup content
    let popupContent = `
        <b>${locationName}</b>
        <hr style="margin: 4px 0;">
        <p>Data Source: ${countryName}</p>
        <p style="margin-bottom: 8px;">
            🌡️ Temp (${latestTemp.year}): <b>${latestTemp.value}°C</b> | 
            💧 Precip (${latestPrecip.year}): <b>${latestPrecip.value} mm</b>
        </p>
        <hr style="margin: 4px 0;">
        <p style="font-size: 1.1em; font-weight: bold; color: ${riskAssessment.magnitude === 'High' ? '#FF5733' : '#FFC300'};">
            🚨 Primary Risk: ${riskAssessment.primaryRisk} (${riskAssessment.magnitude})
        </p>
        <p style="font-size: 0.9em; margin-top: 4px;">
            Anomaly: +${riskAssessment.tempAnomaly}°C | Change: ${riskAssessment.precipChange}%
        </p>
    `;

    // 3. Map updates
    map.eachLayer(layer => { if(layer instanceof L.Marker) map.removeLayer(layer); });
    const newMarker = L.marker([lat, lon]) // Store marker reference
        .addTo(map)
        .bindPopup(popupContent); 
    
    // Check for Bounding Box (from search)
    if(bbox) {
        map.fitBounds([[bbox[0], bbox[2]],[bbox[1], bbox[3]]], {padding:[50,50], maxZoom:10});
    } else {
        // If no BBOX (i.e., map click), zoom slightly if needed
        map.setView([lat, lon], map.getZoom() > 5 ? map.getZoom() : 5); 
    }

    // 🌟 FIX: Force the map view to the marker location *after* zoom/pan/fitBounds
    // This ensures the popup is centered and visible.
    map.setView(newMarker.getLatLng(), map.getZoom(), {
        animate: true,
        pan: {
            duration: 0.5
        }
    });
    newMarker.openPopup(); // Re-open the popup after map movement

    // 4. Update charts
    updateCountryCharts(chartLookupName);

    // 5. AI analysis 
    // 🌟 FIX: Pass the full risk assessment data structure to the AI function
    const aiClimateData = {
        currentAvgTemp: latestTemp.value,
        tempAnomaly: riskAssessment.tempAnomaly,
        seaLevelRise: (Math.random()*1+3).toFixed(1), // Retain mock sea level data
        // Pass the new risk metrics:
        primaryRisk: riskAssessment.primaryRisk,
        magnitude: riskAssessment.magnitude,
        precipChange: riskAssessment.precipChange
    };
    fetchAiAnalysis(buildClimatePrompt(chartLookupName, lat.toFixed(4), lon.toFixed(4), aiClimateData));
}

// ----------------------------
// Search Handler (MODIFIED TO USE updateDashboard - UNCHANGED)
// ----------------------------
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
        await updateDashboard(
            coords.lat, 
            coords.lon, 
            coords.countryName, 
            coords.locationName, 
            coords.bbox
        );
    } else {
        alert(`Could not find "${location}".`);
        updateGlobalCharts();
    }
}

/**
 * 🌟 NEW: Handles map click event (MODIFIED TO USE updateDashboard - UNCHANGED)
 */
async function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    const result = await reverseGeocode(lat, lon);

    if (result && result.countryName) {
        console.log(`Map Clicked: Country found: ${result.countryName}`);
        
        await updateDashboard(
            lat, 
            lon, 
            result.countryName, 
            result.locationName
        );
    } else {
        alert("Could not retrieve country data for this location. Try searching or clicking closer to land.");
    }
}


// ----------------------------
// Event listeners & initialization (UNCHANGED)
// ----------------------------
document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('location-search').addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); handleSearch(); } });

window.onload = initializeDashboard;