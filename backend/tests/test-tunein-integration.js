// Test the updated DirectRadioSonosService with TuneIn Radio integration
const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testTuneInIntegration() {
  console.log(
    "🎵 Testing Updated DirectRadioSonosService with TuneIn Integration"
  );

  const service = new DirectRadioSonosService();

  try {
    // Test 1: Get all available stations
    console.log("\n1. Getting all available stations...");
    const allStations = service.getAllStations();
    console.log("✅ TuneIn stations:", Object.keys(allStations.tunein).length);
    console.log("✅ HTTP stations:", Object.keys(allStations.http).length);

    // List some TuneIn stations
    console.log("\n📻 Available TuneIn stations:");
    Object.entries(allStations.tunein).forEach(([key, station]) => {
      console.log(`   - ${key}: ${station.name} (ID: ${station.tuneInId})`);
    });

    // Test 2: Search for BBC stations
    console.log('\n2. Searching for "BBC" stations...');
    const bbcMatches = service.searchStations("BBC");
    console.log(`✅ Found ${bbcMatches.length} BBC stations`);
    bbcMatches.forEach((match) => {
      console.log(`   - ${match.key}: ${match.station.name}`);
    });

    // Test 3: Get devices first
    console.log("\n3. Getting available Sonos devices...");
    const devices = await service.getAvailableDevices();
    console.log(`✅ Found ${devices.length} Sonos devices`);
    devices.forEach((device) => {
      console.log(`   - ${device.roomName} (${device.host})`);
    });

    if (devices.length === 0) {
      console.log(
        "❌ No Sonos devices found. Make sure your Sonos speaker is on the network."
      );
      return;
    }

    const roomName = devices[0].roomName; // Use the first device
    console.log(`\n🎯 Using device: ${roomName}`);

    // Test 4: Play BBC Radio 1 via TuneIn
    console.log("\n4. Playing BBC Radio 1 via TuneIn...");
    const result = await service.playRadio({
      roomName,
      stationName: "BBC Radio 1",
      action: "play",
    });

    console.log("✅ TuneIn Radio Result:", {
      success: result.success,
      action: result.action,
      message: result.message,
      stationInfo: result.stationInfo,
    });

    if (result.success) {
      console.log("🎉 SUCCESS! TuneIn Radio is playing!");

      // Let it play for 10 seconds
      console.log("⏱️ Playing for 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Stop the radio
      console.log("\n5. Stopping radio playback...");
      await service.stopRadio(roomName);
      console.log("⏹️ Radio stopped");

      console.log(
        "\n🎉 FULL SUCCESS! TuneIn Radio integration is working perfectly!"
      );
    } else {
      console.log("❌ TuneIn Radio failed to start");
    }
  } catch (error) {
    console.log("❌ Test failed:", error.message);
    console.log("🔍 Error details:", error);
  }
}

testTuneInIntegration().catch(console.error);
