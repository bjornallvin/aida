#!/usr/bin/env node

/**
 * Script to get available ElevenLabs voices and find Swedish-compatible ones
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error("❌ ELEVENLABS_API_KEY not found in .env file");
  process.exit(1);
}

async function getElevenLabsVoices() {
  try {
    console.log("🔍 Fetching available ElevenLabs voices...");

    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      timeout: 10000,
    });

    const voices = response.data.voices;
    console.log(`\n📊 Found ${voices.length} available voices:`);
    console.log("=" * 80);

    // Look for multilingual voices that support Swedish
    const multilingualVoices = [];
    const swedishCompatibleVoices = [];

    for (const voice of voices) {
      const { voice_id, name, category, description, labels = {} } = voice;
      const isMultilingual =
        category === "professional" ||
        name.toLowerCase().includes("multilingual") ||
        description?.toLowerCase().includes("multilingual") ||
        labels?.language?.includes("multilingual") ||
        labels?.use_case?.includes("multilingual");

      const supportsSwedish =
        description?.toLowerCase().includes("swedish") ||
        labels?.language?.includes("swedish") ||
        labels?.language?.includes("sv");

      console.log(`\n🎙️  Voice: ${name}`);
      console.log(`   ID: ${voice_id}`);
      console.log(`   Category: ${category}`);
      console.log(`   Description: ${description || "N/A"}`);
      console.log(`   Labels: ${JSON.stringify(labels)}`);

      if (isMultilingual) {
        multilingualVoices.push(voice);
        console.log(`   ✅ MULTILINGUAL DETECTED`);
      }

      if (supportsSwedish) {
        swedishCompatibleVoices.push(voice);
        console.log(`   🇸🇪 SWEDISH COMPATIBLE`);
      }
    }

    console.log("\n" + "=" * 80);
    console.log("🌍 MULTILINGUAL VOICES:");
    console.log("=" * 80);

    if (multilingualVoices.length > 0) {
      multilingualVoices.forEach((voice) => {
        console.log(`\n🎙️  ${voice.name}`);
        console.log(`   ID: ${voice.voice_id}`);
        console.log(`   Category: ${voice.category}`);
        console.log(`   Description: ${voice.description || "N/A"}`);
      });
    } else {
      console.log("❌ No explicitly multilingual voices found");
    }

    console.log("\n" + "=" * 80);
    console.log("🇸🇪 SWEDISH COMPATIBLE VOICES:");
    console.log("=" * 80);

    if (swedishCompatibleVoices.length > 0) {
      swedishCompatibleVoices.forEach((voice) => {
        console.log(`\n🎙️  ${voice.name}`);
        console.log(`   ID: ${voice.voice_id}`);
        console.log(`   Category: ${voice.category}`);
        console.log(`   Description: ${voice.description || "N/A"}`);
      });
    } else {
      console.log("❌ No explicitly Swedish-compatible voices found");
    }

    console.log("\n" + "=" * 80);
    console.log("💡 RECOMMENDATIONS:");
    console.log("=" * 80);

    // Look for voices that might work with multilingual models
    const professionalVoices = voices.filter(
      (v) => v.category === "professional"
    );

    if (professionalVoices.length > 0) {
      console.log(
        "\n🎯 Professional voices (likely to work with multilingual models):"
      );
      professionalVoices.slice(0, 5).forEach((voice) => {
        console.log(`   • ${voice.name} (${voice.voice_id})`);
      });
    }

    // Current default voice info
    const currentVoice = voices.find(
      (v) => v.voice_id === "pNInz6obpgDQGcFmaJgB"
    );
    if (currentVoice) {
      console.log(
        `\n🔄 Current default voice: ${currentVoice.name} (${currentVoice.voice_id})`
      );
      console.log(`   Category: ${currentVoice.category}`);
      console.log(`   Description: ${currentVoice.description || "N/A"}`);
    }

    console.log("\n📝 NEXT STEPS:");
    console.log(
      "1. Use a professional voice with eleven_multilingual_v2 model"
    );
    console.log("2. Test the voice with both English and Swedish text");
    console.log("3. Update the voice configuration in the backend");

    // Save results to file for reference
    const results = {
      timestamp: new Date().toISOString(),
      totalVoices: voices.length,
      multilingualVoices,
      swedishCompatibleVoices,
      professionalVoices,
      currentDefaultVoice: currentVoice,
      recommendations: {
        useMultilingualModel: "eleven_multilingual_v2",
        suggestedVoices: professionalVoices.slice(0, 3).map((v) => ({
          name: v.name,
          id: v.voice_id,
          category: v.category,
        })),
      },
    };

    fs.writeFileSync(
      "elevenlabs-voice-analysis.json",
      JSON.stringify(results, null, 2)
    );
    console.log("\n💾 Analysis saved to elevenlabs-voice-analysis.json");
  } catch (error) {
    console.error("❌ Error fetching voices:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

getElevenLabsVoices();
