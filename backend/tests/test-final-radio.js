// Test with proper device discovery waiting
const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testWithDeviceWait() {
  console.log("🎵 Testing TuneIn Radio with Device Discovery Wait");

  const service = new DirectRadioSonosService();

  try {
    // Wait for device discovery to complete
    console.log("⏳ Waiting for Sonos device discovery...");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds

    // Get devices
    const devices = await service.getAvailableDevices();
    console.log(`✅ Found ${devices.length} Sonos devices`);

    if (devices.length === 0) {
      console.log("❌ No devices found after waiting. Exiting.");
      return;
    }

    const device = devices[0];
    console.log(`🎯 Using device: ${device.roomName} (${device.host})`);

    // Test BBC Radio 1 via TuneIn
    console.log("\n🔄 Playing BBC Radio 1 via TuneIn Radio service...");
    const result = await service.playRadio({
      roomName: device.roomName,
      stationName: "BBC Radio 1",
      action: "play",
    });

    console.log("📊 Result:", {
      success: result.success,
      action: result.action,
      message: result.message,
    });

    if (result.success) {
      console.log("🎉 SUCCESS! BBC Radio 1 is playing via TuneIn!");

      // Let it play for 10 seconds
      console.log("⏱️ Playing for 10 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Stop playback
      await service.stopRadio(device.roomName);
      console.log("⏹️ Stopped playback");

      console.log(
        "\n🎊 COMPLETE SUCCESS! Radio streaming to Sonos is now working!"
      );
    } else {
      console.log("❌ Playback failed");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

testWithDeviceWait().catch(console.error);
