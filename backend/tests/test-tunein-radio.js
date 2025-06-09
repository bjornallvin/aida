const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testTuneInRadio() {
  console.log("🎵 Testing TuneIn Radio URLs on Sonos");

  const service = new DirectRadioSonosService();

  // TuneIn Radio URLs that are known to work with Sonos
  const tuneInUrls = [
    // These are TuneIn direct stream URLs that should work
    "http://opml.radiotime.com/Tune.ashx?id=s25111&formats=mp3,wma,aac,wmv,hls&partnerId=RadioTime&username=radiotime&c=ebrowse", // BBC Radio 1
    "http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio1_mf_p", // BBC Radio 1 Direct
    "http://ice1.somafm.com/groovesalad-128-mp3", // SomaFM (known working stream)
  ];

  for (const url of tuneInUrls) {
    try {
      console.log(`\n🔄 Testing: ${url}`);
      const result = await service.playRadio({
        roomName: "The Roam", // Updated to use actual room name
        streamUrl: url,
        action: "play",
      });
      console.log("✅ SUCCESS!", result.message);

      // If one works, we found a working format
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Let it play for 5 seconds
      await service.stopRadio("The Roam");
      console.log("🛑 Stopped playback");
      break;
    } catch (error) {
      console.log("❌ Failed:", error.message);
    }
  }
}

testTuneInRadio().catch(console.error);
