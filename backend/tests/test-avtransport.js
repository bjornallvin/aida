// Test using setAVTransportURI method
const { Sonos } = require("sonos");

async function testAVTransport() {
  console.log("🎵 Testing AVTransport URI method on Sonos");

  try {
    // Connect directly to the Sonos speaker
    const sonos = new Sonos("192.168.1.180");

    // Get the actual room name
    const zoneAttrs = await sonos.getZoneAttrs();
    console.log("✅ Connected to:", zoneAttrs.CurrentZoneName);

    // Test a simple HTTP radio stream
    const radioUrl = "http://ice1.somafm.com/groovesalad-128-mp3"; // SomaFM - known working stream

    console.log("🔄 Attempting to set AVTransport URI:", radioUrl);

    // Try using setAVTransportURI instead of queue
    await sonos.setAVTransportURI(radioUrl);
    console.log("✅ AVTransport URI set successfully");

    // Start playback
    await sonos.play();
    console.log("▶️ Playback started!");

    // Wait 10 seconds
    console.log("⏱️ Playing for 10 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Stop playback
    await sonos.stop();
    console.log("⏹️ Playback stopped");

    console.log("🎉 SUCCESS! Radio streaming works!");
  } catch (error) {
    console.log("❌ Error:", error.message);

    // If it's a UPnP error, let's see the details
    if (error.message && error.message.includes("upnp")) {
      console.log("🔍 UPnP Error Details:", error.message);
    }
  }
}

testAVTransport().catch(console.error);
