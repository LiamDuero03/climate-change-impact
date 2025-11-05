
import CONFIG from './config.js';
/**
 * text_gen.js
 * Contains logic for generating the AI-powered climate analysis text using OpenRouter.ai.
 */

// ⚠️ WARNING: REPLACE THIS LINE with your actual OpenRouter API Key.
// For security, never commit this key to a public repository!
const OPENROUTER_API_KEY = CONFIG.OPENROUTER_API_KEY;
const AI_MODEL = "moonshotai/kimi-k2:free";
const API_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";


// Function to build the meta-prompt using real or simulated climate data
export function buildClimatePrompt(location, lat, lon, data = {}) {
    // Use the values from the 'data' object passed from main.js, 
    // or fall back to the placeholder values if the API fetch failed.
    const currentAvgTemp = data.currentAvgTemp || 15.5; 
    const tempAnomaly = data.tempAnomaly || 0.9;     
    const seaLevelRise = data.seaLevelRise || 3.5;    

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

// Function to make the actual LLM API call to OpenRouter and display the result
export async function fetchAiAnalysis(prompt) {
    const aiTextContent = document.getElementById('ai-text-content');
    aiTextContent.innerHTML = '<span class="text-primary animate-pulse">🤖 Generating AI Analysis via Kimi-K2...</span>';
    aiTextContent.classList.add('italic');
    
    // Check if the API key is set
    if (OPENROUTER_API_KEY === "YOUR_OPENROUTER_API_KEY_HERE") {
        aiTextContent.innerHTML = '<span class="text-red-500">❌ Error: Please replace "YOUR_OPENROUTER_API_KEY_HERE" in text_gen.js with your actual OpenRouter key.</span>';
        aiTextContent.classList.remove('italic');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                // ⚠️ IMPORTANT: Authorization header must contain the Bearer token
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                // Optional headers for OpenRouter tracking/leaderboard
                
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
                // Set temperature low for factual consistency
                temperature: 0.5, 
                max_tokens: 500
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Request Failed: ${response.status} - ${errorData.error.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Extract the generated text from the OpenAI-compatible response format
        const generatedText = data.choices[0].message.content.trim();

        // Format the response for HTML display (simulating Markdown conversion)
        const formattedResponse = generatedText
            // Replace double newlines with paragraph tags
            .replace(/\n\s*\n/g, '</p><p>')
            // Replace single newlines with spaces
            .replace(/\n/g, ' ')
            // Simple attempt to convert bolding to a header/bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
        // Apply the response
        aiTextContent.innerHTML = `<p>${formattedResponse}</p>`;
        aiTextContent.classList.remove('italic');

    } catch (error) {
        console.error("OpenRouter API Error:", error);
        aiTextContent.innerHTML = `
            <span class="text-red-500">
                ❌ LLM API Error: Could not generate analysis. Please check your API key, rate limits, or network connection. 
                <br>Details: ${error.message}
            </span>
        `;
        aiTextContent.classList.remove('italic');
    }
}