#!/usr/bin/env node

/**
 * Compare explicit vs auto mode API calls
 */

const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const BACKEND_URL = "http://localhost:3000";

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

async function compareExplicitVsAuto() {
  console.log("🔍 Comparing Explicit vs Auto Mode");
  console.log("=".repeat(50));

  const testCases = [
    {
      name: "Explicit Swedish",
      request: {
        text: "Jag älskar att höra på musik på svenska.",
        language: "swedish",
      },
    },
    {
      name: "Auto Swedish (same text)",
      request: {
        text: "Jag älskar att höra på musik på svenska.",
        language: "auto",
      },
    },
    {
      name: "Explicit English",
      request: {
        text: "I love listening to music in English.",
        language: "english",
      },
    },
    {
      name: "Auto English (same text)",
      request: {
        text: "I love listening to music in English.",
        language: "auto",
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Text: "${testCase.request.text}"`);
    console.log(`   Language: ${testCase.request.language}`);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/tts/generate`,
        testCase.request,
        {
          timeout: 30000,
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ SUCCESS`);
        console.log(`   📁 File: ${response.data.data.filename}`);
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
      if (error.response && error.response.data) {
        console.log(
          `   Details: ${
            error.response.data.details || error.response.data.error
          }`
        );
      }
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

compareExplicitVsAuto().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
