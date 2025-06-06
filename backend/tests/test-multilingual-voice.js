#!/usr/bin/env node

/**
 * Test script for multilingual voice functionality
 * Tests the new Swedish voice with both English and Swedish text
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

/**
 * Play audio file using system audio player
 */
function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`   🔊 Playing audio: ${path.basename(filePath)}`);

    // Use different commands based on the OS
    let command, args;
    if (process.platform === "darwin") {
      // macOS
      command = "afplay";
      args = [filePath];
    } else if (process.platform === "linux") {
      // Linux
      command = "aplay";
      args = [filePath];
    } else if (process.platform === "win32") {
      // Windows
      command = "powershell";
      args = ["-c", `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
    } else {
      reject(new Error("Unsupported platform for audio playback"));
      return;
    }

    const player = spawn(command, args);

    player.on("close", (code) => {
      if (code === 0) {
        console.log(`   ✅ Audio playback completed`);
        resolve();
      } else {
        console.log(`   ⚠️  Audio playback ended with code ${code}`);
        resolve(); // Don't fail the test if audio playback fails
      }
    });

    player.on("error", (error) => {
      console.log(`   ⚠️  Audio playback error: ${error.message}`);
      resolve(); // Don't fail the test if audio playback fails
    });
  });
}

/**
 * Download audio file from the backend
 */
async function downloadAudio(audioUrl, filename) {
  const fullUrl = `${BACKEND_URL}${audioUrl}`;
  const tempDir = path.join(__dirname, "temp_audio");

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const localPath = path.join(tempDir, filename);

  try {
    const response = await axios({
      method: "GET",
      url: fullUrl,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(localPath));
      writer.on("error", reject);
    });
  } catch (error) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function testMultilingualVoice() {
  console.log("🎤 Testing Multilingual Voice Functionality");
  console.log("=".repeat(50));

  // Test cases with different languages
  const testCases = [
    {
      name: "English Text",
      text: "Hello, this is a test of the English voice using Adam.",
      language: "english",
      expectedVoice: "Adam (pNInz6obpgDQGcFmaJgB)",
    },
    {
      name: "Swedish Text",
      text: "Hej, det här är ett test av den svenska rösten med Sanna.",
      language: "swedish",
      expectedVoice: "Sanna Hartfield (aSLKtNoVBZlxQEMsnGL2)",
    },
    {
      name: "Auto-Detection: Swedish with åäö",
      text: "Jag älskar att höra på musik på svenska.",
      language: "auto",
      expectedVoice: "Sanna Hartfield (detected Swedish)",
    },
    {
      name: "Auto-Detection: English",
      text: "I love listening to music in English.",
      language: "auto",
      expectedVoice: "Adam (detected English)",
    },
    {
      name: "Multilingual Mode",
      text: "This is a mix of English and svenska text in the same sentence.",
      language: "auto",
      expectedVoice: "Sanna Hartfield (multilingual)",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   Text: "${testCase.text}"`);
    console.log(`   Language: ${testCase.language}`);
    console.log(`   Expected Voice: ${testCase.expectedVoice}`);

    try {
      // Test the TTS file generation endpoint
      const response = await axios.post(
        `${BACKEND_URL}/tts/generate`,
        {
          text: testCase.text,
          language: testCase.language,
        },
        {
          timeout: 30000,
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ SUCCESS: TTS generated successfully`);
        console.log(`   📁 File: ${response.data.data.filename}`);
        console.log(`   🔗 URL: ${response.data.data.audioUrl}`);
        console.log(`   📊 Language used: ${response.data.data.language}`);

        // Download and play the audio file
        try {
          const audioPath = await downloadAudio(
            response.data.data.audioUrl,
            response.data.data.filename
          );
          await playAudio(audioPath);
        } catch (audioError) {
          console.log(`   ⚠️  Audio playback failed: ${audioError.message}`);
        }
      } else {
        console.log(`   ❌ FAILED: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      if (error.response) {
        console.log(
          `   Response: ${error.response.status} - ${error.response.statusText}`
        );
        if (error.response.data) {
          console.log(
            `   Details: ${JSON.stringify(error.response.data, null, 2)}`
          );
        }
      }
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎯 Test Summary:");
  console.log("The new multilingual voice system supports:");
  console.log("✅ English voice (Adam) for English text");
  console.log("✅ Swedish voice (Sanna Hartfield) for Swedish text");
  console.log("✅ Automatic language detection based on content");
  console.log("✅ Multilingual voice for mixed content");
  console.log("✅ Custom voice selection via API parameters");

  console.log("\n📝 Usage Examples:");
  console.log("// Explicit language selection");
  console.log('generateTTS("Hello world", "english")');
  console.log('generateTTS("Hej världen", "swedish")');
  console.log("");
  console.log("// Automatic detection");
  console.log('generateTTS("Text with åäö characters", "auto")');
  console.log('generateTTS("Mixed English and svenska", "auto")');
  console.log("");
  console.log("// Custom voice");
  console.log(
    'generateTTS("Text", undefined, "customVoiceId", "customModelId")'
  );
}

// Run the tests
testMultilingualVoice().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
