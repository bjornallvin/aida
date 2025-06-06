#!/usr/bin/env node

/**
 * Test specific voice configurations to debug 401 errors
 */

const axios = require("axios");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

async function testVoiceDirectly() {
  console.log("🔧 Direct ElevenLabs API Test");
  console.log("=".repeat(50));

  const testConfigs = [
    {
      name: "Adam (English monolingual)",
      voiceId: "pNInz6obpgDQGcFmaJgB",
      modelId: "eleven_monolingual_v1",
      text: "Hello, this is a test of the English voice.",
    },
    {
      name: "Sanna (Swedish multilingual)",
      voiceId: "aSLKtNoVBZlxQEMsnGL2",
      modelId: "eleven_multilingual_v2",
      text: "Hej, det här är ett test av den svenska rösten.",
    },
    {
      name: "Sanna (English multilingual)",
      voiceId: "aSLKtNoVBZlxQEMsnGL2",
      modelId: "eleven_multilingual_v2",
      text: "Hello, this is a test of Sanna speaking English.",
    },
  ];

  for (const config of testConfigs) {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log(`   Voice ID: ${config.voiceId}`);
    console.log(`   Model ID: ${config.modelId}`);
    console.log(`   Text: "${config.text}"`);

    try {
      const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${config.voiceId}`,
        {
          text: config.text,
          model_id: config.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          responseType: "stream",
          timeout: 30000,
        }
      );

      console.log(`   ✅ SUCCESS: API returned ${response.status}`);
      console.log(`   📊 Content-Type: ${response.headers["content-type"]}`);
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Status Text: ${error.response.statusText}`);
        if (error.response.data) {
          // For stream responses, we might not be able to read the data easily
          console.log(`   Error type: ${typeof error.response.data}`);
        }
      }
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Run the test
testVoiceDirectly().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
