// Simple test to check if we can play a radio stream on Sonos
const { Sonos } = require("sonos");

async function testSimpleRadio() {
  console.log("🎵 Testing Simple Radio Stream on Sonos");

  try {
    // Connect directly to the Sonos speaker
    const sonos = new Sonos("192.168.1.180");

    // Get the actual room name
    const zoneAttrs = await sonos.getZoneAttrs();
    console.log("✅ Connected to:", zoneAttrs.CurrentZoneName);

    // Test a simple HTTP radio stream
    const radioUrl = "http://ice1.somafm.com/groovesalad-128-mp3"; // SomaFM - known working stream

    console.log("🔄 Attempting to play:", radioUrl);

    // Try to play the radio stream
    const result = await sonos.queue(radioUrl);
    console.log("✅ Queue result:", result);

    // Start playback
    await sonos.play();
    console.log("▶️ Playback started!");

    // Wait 10 seconds
    console.log("⏱️ Playing for 10 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Stop playback
    await sonos.stop();
    console.log("⏹️ Playback stopped");
  } catch (error) {
    console.log("❌ Error:", error.message);

    // If it's a UPnP error, let's see the details
    if (error.message && error.message.includes("upnp")) {
      console.log("🔍 UPnP Error Details:", error.message);
    }
  }
}

testSimpleRadio().catch(console.error);
