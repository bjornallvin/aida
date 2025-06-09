// Test the new TuneIn API integration
const {
  DirectRadioSonosService,
} = require("../dist/services/direct-radio-sonos");

async function testTuneInAPI() {
  console.log("🎵 Testing Dynamic TuneIn API Integration");

  const service = new DirectRadioSonosService();

  try {
    // Test 1: Search for BBC stations
    console.log("\n📻 Test 1: Searching for BBC stations...");
    const bbcStations = await service.searchTuneInStations("BBC", 5);
    console.log(`✅ Found ${bbcStations.length} BBC stations:`);
    bbcStations.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.station.name} (${result.station.tuneInId})`
      );
      console.log(`      ${result.station.description}`);
    });

    // Test 2: Search for jazz stations
    console.log("\n🎶 Test 2: Searching for jazz stations...");
    const jazzStations = await service.searchTuneInStations("jazz", 5);
    console.log(`✅ Found ${jazzStations.length} jazz stations:`);
    jazzStations.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.station.name} (${result.station.tuneInId})`
      );
      console.log(`      ${result.station.description}`);
    });

    // Test 3: Get popular stations
    console.log("\n🔥 Test 3: Getting popular stations...");
    const popularStations = await service.getPopularTuneInStations(
      undefined,
      5
    );
    console.log(`✅ Found ${popularStations.length} popular stations:`);
    popularStations.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.station.name} (${result.station.tuneInId})`
      );
      console.log(`      ${result.station.description}`);
    });

    // Test 4: Enhanced search that includes dynamic results
    console.log("\n🔍 Test 4: Enhanced search (curated + dynamic)...");
    const searchResults = await service.searchStations("classical", true);
    console.log(
      `✅ Found ${searchResults.length} stations (curated + dynamic):`
    );
    searchResults.forEach((result, index) => {
      const type = result.station.type || "unknown";
      console.log(`   ${index + 1}. ${result.station.name} (${type})`);
      console.log(`      ${result.station.description}`);
    });

    console.log("\n🎉 SUCCESS! TuneIn API integration is working!");
    console.log("\n📖 Available endpoints:");
    console.log("   GET  /radio/stations - Get curated stations");
    console.log("   POST /radio/search - Search curated + dynamic stations");
    console.log("   POST /radio/search/tunein - Search TuneIn API directly");
    console.log("   GET  /radio/popular - Get popular TuneIn stations");
    console.log(
      "   POST /radio/play - Play any station (curated or discovered)"
    );
  } catch (error) {
    console.log("❌ Error:", error.message);
    console.log("🔍 Details:", error);
  }
}

testTuneInAPI().catch(console.error);
