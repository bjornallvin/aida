// Test with Sonos-compatible URLs and formats
const { Sonos } = require("sonos");

async function testSonosCompatibleStreams() {
  console.log("🎵 Testing Sonos-Compatible Stream URLs");

  try {
    // Connect directly to the Sonos speaker
    const sonos = new Sonos("192.168.1.180");

    // Get the actual room name
    const zoneAttrs = await sonos.getZoneAttrs();
    console.log("✅ Connected to:", zoneAttrs.CurrentZoneName);

    // Test URLs that are more likely to work with Sonos
    const testUrls = [
      // NPR streams - these typically work well with Sonos
      "https://npr-ice.streamguys1.com/live.mp3",
      // BBC streams with proper MP3 format
      "http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1_mf_p",
      // Swedish Radio with direct MP3
      "https://http-live.sr.se/p3-mp3-192",
      // Simple Icecast stream
      "http://ice1.somafm.com/groovesalad-256-mp3",
    ];

    for (const url of testUrls) {
      try {
        console.log(`\n🔄 Testing: ${url}`);

        // Clear any existing queue first
        try {
          await sonos.flush();
        } catch (e) {
          // Ignore flush errors
        }

        // Try with a timeout
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout after 5 seconds")), 5000)
        );

        const playPromise = sonos
          .setAVTransportURI(url)
          .then(() => sonos.play());

        await Promise.race([playPromise, timeout]);

        console.log("✅ SUCCESS! Playing:", url);

        // Let it play for 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Stop and try next
        await sonos.stop();
        console.log("⏹️ Stopped");

        break; // If we get here, this URL worked!
      } catch (error) {
        console.log("❌ Failed:", error.message.substring(0, 100) + "...");
      }
    }
  } catch (error) {
    console.log("❌ General Error:", error.message);
  }
}

testSonosCompatibleStreams().catch(console.error);
