import { OpenAITTSClient } from "../src/clients/openai-tts";
import { config } from "../src/config";
import fs from "fs";
import path from "path";

/**
 * Simple test for OpenAI TTS Client
 * Tests the new OpenAI TTS client functionality
 */

async function testOpenAITTSClient() {
  console.log("🚀 Testing OpenAI TTS Client");
  console.log("=" + "=".repeat(49));

  // Check if API key is available
  if (!config.openaiApiKey) {
    console.log("❌ OPENAI_API_KEY not found in environment");
    console.log("   Please set OPENAI_API_KEY in your .env file");
    return;
  }

  const client = new OpenAITTSClient();
  const testAudioDir = path.join(process.cwd(), "test_audio_output");

  // Ensure test directory exists
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
  }

  const testCases = [
    {
      text: "Hello! This is a test of OpenAI's text-to-speech system.",
      language: "english" as const,
      filename: "test_english.mp3",
      description: "English TTS test",
    },
    {
      text: "Hej! Detta är ett test av OpenAI text-till-tal.",
      language: "swedish" as const,
      filename: "test_swedish.mp3",
      description: "Swedish TTS test",
    },
    {
      text: "Auto-detection test with mixed content. Hej från Sverige!",
      language: "auto" as const,
      filename: "test_auto.mp3",
      description: "Auto-detection test",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🔊 ${testCase.description}`);

    try {
      const startTime = Date.now();

      // Generate TTS
      const audioStream = await client.generateTTS(
        testCase.text,
        testCase.language
      );

      const duration = Date.now() - startTime;

      // Save to file
      const filePath = path.join(testAudioDir, testCase.filename);
      const writeStream = fs.createWriteStream(filePath);

      await new Promise<void>((resolve, reject) => {
        audioStream.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const stats = fs.statSync(filePath);

      console.log(`✅ Success!`);
      console.log(`   📁 File: ${testCase.filename}`);
      console.log(`   📦 Size: ${stats.size} bytes`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(
        `   📝 Text: "${testCase.text.substring(0, 50)}${
          testCase.text.length > 50 ? "..." : ""
        }"`
      );
    } catch (error) {
      console.log(
        `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Test voice configurations
  console.log(`\n🎭 Testing voice configurations`);
  try {
    const voices = client.getAvailableVoices();
    console.log(`✅ Available voices:`);
    Object.entries(voices).forEach(([key, config]) => {
      console.log(`   • ${key}: ${config.voice} (${config.description})`);
    });
  } catch (error) {
    console.log(
      `❌ Voice config test failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Test error handling
  console.log(`\n⚠️  Testing error handling`);
  try {
    await client.generateTTS(""); // Empty text should fail
    console.log(`❌ Empty text test should have failed`);
  } catch (error) {
    console.log(
      `✅ Empty text correctly rejected: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 OpenAI TTS Client Test Complete");
  console.log(`📁 Check ${testAudioDir} for generated audio files`);
  console.log(
    "🎉 If all tests passed, your OpenAI TTS integration is working!"
  );
}

// Run the test
if (require.main === module) {
  testOpenAITTSClient().catch(console.error);
}

export { testOpenAITTSClient };
