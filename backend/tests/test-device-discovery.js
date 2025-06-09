// Simple device discovery test
const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testDeviceDiscovery() {
  console.log("🔍 Testing Simple Device Discovery");

  const service = new DirectRadioSonosService();

  try {
    console.log("⏳ Waiting 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("📋 Getting devices...");
    const devices = await service.getAvailableDevices();
    console.log(`Found ${devices.length} devices:`, devices);

    console.log("⏳ Waiting 10 more seconds...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("📋 Getting devices again...");
    const devices2 = await service.getAvailableDevices();
    console.log(`Found ${devices2.length} devices:`, devices2);
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("✅ Test complete");
  process.exit(0);
}

testDeviceDiscovery().catch(console.error);
