// Test TuneIn Radio with proper discovery waiting
const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testImprovedRadio() {
  console.log("🎵 Testing TuneIn Radio with Improved Discovery");

  const service = new DirectRadioSonosService();

  try {
    // Wait longer for device discovery to complete (discovery timeout is 10 seconds)
    console.log("⏳ Waiting for Sonos device discovery to complete...");
    await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait 12 seconds (longer than discovery timeout)

    // Get devices
    const devices = await service.getAvailableDevices();
    console.log(`✅ Found ${devices.length} Sonos devices`);

    if (devices.length === 0) {
      console.log("❌ No devices found. Let's try to rediscover...");

      // Try rediscovering devices
      console.log("🔄 Rediscovering devices...");
      await service.getAvailableDevices(); // This should trigger rediscovery
      await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait again

      const newDevices = await service.getAvailableDevices();
      console.log(
        `✅ After rediscovery: Found ${newDevices.length} Sonos devices`
      );

      if (newDevices.length === 0) {
        console.log("❌ Still no devices found. Exiting.");
        return;
      }
    }

    const finalDevices = await service.getAvailableDevices();
    const device = finalDevices[0];
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
    console.log("🔍 Error details:", error);
  }
}

testImprovedRadio().catch(console.error);
