// Test using playTuneinRadio method
const { Sonos } = require("sonos");

async function testTuneInRadio() {
  console.log("🎵 Testing TuneIn Radio integration on Sonos");

  try {
    // Connect directly to the Sonos speaker
    const sonos = new Sonos("192.168.1.180");

    // Get the actual room name
    const zoneAttrs = await sonos.getZoneAttrs();
    console.log("✅ Connected to:", zoneAttrs.CurrentZoneName);

    // Try using TuneIn Radio with a station ID
    // BBC Radio 1 on TuneIn has ID 's25111'
    const stationId = "s25111"; // BBC Radio 1

    console.log("🔄 Attempting to play TuneIn Radio station:", stationId);

    // Try using playTuneinRadio method
    const result = await sonos.playTuneinRadio(stationId, "BBC Radio 1");
    console.log("✅ TuneIn Radio result:", result);

    console.log("▶️ Should be playing now!");

    // Wait 10 seconds
    console.log("⏱️ Playing for 10 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Stop playback
    await sonos.stop();
    console.log("⏹️ Playback stopped");

    console.log("🎉 SUCCESS! TuneIn Radio streaming works!");
  } catch (error) {
    console.log("❌ Error:", error.message);

    // If it's a UPnP error, let's see the details
    if (error.message && error.message.includes("upnp")) {
      console.log("🔍 UPnP Error Details:", error.message);
    }
  }
}

testTuneInRadio().catch(console.error);
