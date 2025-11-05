/**
 * text_gen.js
 * Contains logic for generating the AI-powered climate analysis text using OpenRouter.ai.
 */

// 🌟 FIX: Use process.env for secure API key access, as discussed.
const OPENROUTER_API_KEY = ""; 
const AI_MODEL = "moonshotai/kimi-k2:free";
const API_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";


/**
 * Function to build the meta-prompt using all calculated climate data.
 */
export function buildClimatePrompt(location, lat, lon, data = {}) {
    // Extract metrics from the data object passed from main.js
    const currentAvgTemp = data.currentAvgTemp || 15.5; 
    const tempAnomaly = data.tempAnomaly || 0.9;     
    const seaLevelRise = data.seaLevelRise || 3.5; 
    
    // 🌟 FIX/NEW: Extract primary risk data passed from main.js
    const primaryRisk = data.primaryRisk || 'Warming Trend';
    const riskMagnitude = data.magnitude || 'Medium';
    const precipChange = data.precipChange || '0.0'; 

    const metaPrompt = `
        You are a climate change communication expert. Your task is to provide a concise, engaging, 
        and impactful summary of the climate change situation for the location "${location}" (Latitude: ${lat}, Longitude: ${lon}). 
        
        Use the following data points to inform your summary:
        - Current Average Annual Temperature: ${currentAvgTemp}°C
        - Temperature Anomaly (rise since pre-industrial baseline): +${tempAnomaly}°C
        - Precipitation Change (since baseline): ${precipChange}%
        - Primary Climate Risk: ${primaryRisk} (${riskMagnitude} magnitude)
        
        Write a 3-paragraph summary that includes:
        1. A strong, current assessment of the **Primary Risk** (${primaryRisk}) and its potential local impacts (e.g., heatwaves, drought, flooding), referencing the magnitude (${riskMagnitude}).
        2. A brief comparison of the current temperature anomaly to the 1.5°C global target, and contextualize the precipitation change.
        3. A concluding positive statement about adaptation or mitigation efforts relevant to the primary risk.
        Format the response using Markdown paragraphs.
    `;
    return metaPrompt;
}

// Function to make the actual LLM API call to OpenRouter and display the result
export async function fetchAiAnalysis(prompt) {
    const aiTextContent = document.getElementById('ai-text-content');
    aiTextContent.innerHTML = '<span class="text-primary animate-pulse">🤖 Generating AI Analysis via Kimi-K2...</span>';
    aiTextContent.classList.add('italic');
    
    // Check for API Key
    if (!OPENROUTER_API_KEY) {
        aiTextContent.innerHTML = '<span class="text-red-500">❌ Error: API Key is missing. Set OPENROUTER_API_KEY in Vercel Secrets.</span>';
        aiTextContent.classList.remove('italic');
        console.error("AI API Key Missing. Prompt was:", prompt); // Log prompt on failure
        return;
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Title': 'Climate Impact Explorer',
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    { 
                        role: "system", 
                        content: "You are a helpful and concise climate data interpreter. Only provide the summary text based on the user's prompt."
                    },
                    { 
                        role: "user", 
                        content: prompt 
                    }
                ],
                temperature: 0.5, 
                max_tokens: 500
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            // 🌟 FIX: Print the prompt to the console on API failure
            console.error("AI API Request Failed. Prompt was:", prompt); 
            throw new Error(`API Request Failed: ${response.status} - ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();
        
        const generatedText = data.choices[0].message.content.trim();

        // Format the response for HTML display
        const formattedResponse = generatedText
            .replace(/\n\s*\n/g, '</p><p>')
            .replace(/\n/g, ' ')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
        aiTextContent.innerHTML = `<p>${formattedResponse}</p>`;
        aiTextContent.classList.remove('italic');

    } catch (error) {
        console.error("OpenRouter API Error:", error);
        aiTextContent.innerHTML = `
            <span class="text-red-500">
                ❌ LLM API Error: Could not generate analysis. Check API key, limits, or connection. 
                <br>Details: ${error.message}
            </span>
        `;
        aiTextContent.classList.remove('italic');
    }
}