/**
 * text_gen.js
 * Contains logic for generating the AI-powered climate analysis text.
 */

// Function to build the meta-prompt using real or simulated climate data
export function buildClimatePrompt(location, lat, lon, data = {}) {
    // 🌟 CORRECTION: Use the values from the 'data' object passed from main.js, 
    // or fall back to the placeholder values if the API fetch failed.
    const currentAvgTemp = data.currentAvgTemp || 15.5; // Example: Current average annual temp (°C)
    const tempAnomaly = data.tempAnomaly || 0.9;     // Example: Deviation from 20th-century average (°C)
    const seaLevelRise = data.seaLevelRise || 3.5;    // Example: Local sea level rise (mm/year)

    const metaPrompt = `
        You are a climate change communication expert. Your task is to provide a concise, engaging, 
        and impactful summary of the climate change situation for the location "${location}" (Latitude: ${lat}, Longitude: ${lon}). 
        
        Use the following data points to inform your summary:
        - Current Average Annual Temperature: ${currentAvgTemp}°C
        - Temperature Anomaly (rise since pre-industrial): +${tempAnomaly}°C
        - Local Sea Level Rise Rate: ${seaLevelRise} mm per year
        
        Write a 3-paragraph summary that includes:
        1. A strong, current assessment of the primary climate risks (e.g., heatwaves, coastal flooding).
        2. A brief comparison of the current situation to global averages.
        3. A concluding positive statement about adaptation or mitigation efforts.
        Format the response using Markdown paragraphs.
    `;
    return metaPrompt;
}

// Function to simulate the LLM API call and display the result (No changes needed here)
export async function fetchAiAnalysis(prompt) {
    const aiTextContent = document.getElementById('ai-text-content');
    aiTextContent.innerHTML = '<span class="text-primary animate-pulse">Generating AI Analysis...</span>';
    aiTextContent.classList.add('italic');

    // Simulate API latency (3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000)); 

    // Simulated LLM Response (Uses regex to pull values from the prompt for realism)
    const locationName = prompt.split('"')[1];
    // The regex for temp anomaly needs to handle both positive and negative anomalies
    const tempMatch = prompt.match(/Temperature Anomaly \(rise since pre-industrial\): ([+-]\d\.\d+)°C/);
    const tempAnomalyValue = tempMatch ? tempMatch[1] : '0.9'; // Fallback added
    const seaLevelRiseMatch = prompt.match(/Local Sea Level Rise Rate: (\d\.\d+) mm per year/);
    const seaLevelRiseValue = seaLevelRiseMatch ? seaLevelRiseMatch[1] : '3.5'; // Fallback added

    const simulatedResponse = `
        <h3>The Climate Trajectory for ${locationName}</h3>
        
        <p>The region around ${locationName} faces increasing thermal stress, with the current temperature anomaly of ${tempAnomalyValue}°C signaling a heightened risk of prolonged heatwaves and drought conditions. Coastal areas must prepare for accelerated infrastructural strain due to a local sea level rise of ${seaLevelRiseValue} mm/year, threatening vital ecosystems and low-lying urban zones.</p>
        
        <p>This anomaly places ${locationName} in a high-risk category compared to many global averages. Addressing this requires immediate, localized policy changes focusing on water management, urban resilience, and protecting natural coastal buffers.</p>
        
        <p>However, positive shifts are underway! Local communities and city planners are increasingly focusing on nature-based solutions and renewable energy integration. With continued commitment, this region can become a model for resilient climate adaptation in the coming decade.</p>
    `;

    // Apply the response
    aiTextContent.innerHTML = simulatedResponse.trim();
    aiTextContent.classList.remove('italic');
}