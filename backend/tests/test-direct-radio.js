#!/usr/bin/env node
/**
 * Simple test script for Direct Radio-Sonos integration
 * This bypasses any local server and streams directly from public radio URLs
 */

const BASE_URL = "http://localhost:3000";

async function testDirectRadio() {
  console.log(
    "🎵 Testing Direct Radio-Sonos Integration (No Local Server Required)\n"
  );

  try {
    // Test 1: Get available stations
    console.log("1. Getting available radio stations...");
    const stationsResponse = await fetch(`${BASE_URL}/radio/stations`);
    const stationsData = await stationsResponse.json();

    if (stationsData.success) {
      console.log("✅ Stations retrieved successfully");
      console.log(`📻 Available stations: ${stationsData.data.stationCount}`);
      console.log(`🔊 Sonos devices: ${stationsData.data.sonosDevices.length}`);

      if (stationsData.data.sonosDevices.length > 0) {
        console.log(
          "   Devices:",
          stationsData.data.sonosDevices.map((d) => d.roomName).join(", ")
        );
      }

      console.log("   Stations:");
      Object.entries(stationsData.data.stations).forEach(([key, station]) => {
        console.log(`   - ${key}: ${station.name}`);
      });
    } else {
      console.log("❌ Failed to get stations:", stationsData.error);
      return;
    }

    // Test 2: Search for a station
    console.log("\n2. Searching for P3...");
    const searchResponse = await fetch(`${BASE_URL}/radio/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "p3",
      }),
    });

    const searchData = await searchResponse.json();

    if (searchData.success) {
      console.log("✅ Search successful");
      console.log(`🔍 Found ${searchData.data.count} matches for "p3"`);
      searchData.data.matches.forEach((match) => {
        console.log(`   - ${match.key}: ${match.station.name}`);
      });
    } else {
      console.log("❌ Search failed:", searchData.error);
    }

    // Test 3: Play P3 if we have devices
    if (stationsData.data.sonosDevices.length > 0) {
      const roomName = stationsData.data.sonosDevices[0].roomName;
      console.log(`\n3. Playing P3 on "${roomName}"...`);

      const playResponse = await fetch(`${BASE_URL}/radio/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: roomName,
          stationName: "p3",
        }),
      });

      const playData = await playResponse.json();

      if (playData.success) {
        console.log("✅ Radio playback started successfully!");
        console.log(`🎶 Station: ${playData.data.stationInfo.name}`);
        console.log(`📡 Stream URL: ${playData.data.streamUrl}`);
        console.log(`📝 Description: ${playData.data.stationInfo.description}`);

        console.log(
          "\n🎉 Success! P3 should now be playing on your Sonos speaker."
        );
        console.log("\n💡 You can stop it by running:");
        console.log(
          `curl -X POST ${BASE_URL}/radio/stop -H "Content-Type: application/json" -d '{"roomName": "${roomName}"}'`
        );
      } else {
        console.log("❌ Radio playback failed:", playData.error);
        console.log("💡 Details:", playData.details);
      }
    }

    console.log("\n📖 Available endpoints:");
    console.log("   GET  /radio/stations - Get all available stations");
    console.log("   POST /radio/search - Search for stations");
    console.log("   POST /radio/play - Play a station on Sonos");
    console.log("   POST /radio/pause - Pause radio playback");
    console.log("   POST /radio/stop - Stop radio playback");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Make sure your backend server is running on port 3000");
    console.log("   2. Make sure your Sonos speakers are on the same network");
    console.log("   3. No local radio server needed - this streams directly!");
  }
}

// Example API calls
function showExampleCalls() {
  console.log("\n📝 Example API calls:");
  console.log("\n1. Get available stations:");
  console.log("curl http://localhost:3000/radio/stations");

  console.log("\n2. Search for stations:");
  console.log(`curl -X POST http://localhost:3000/radio/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "p3"}'`);

  console.log("\n3. Play P3 on Sonos:");
  console.log(`curl -X POST http://localhost:3000/radio/play \\
  -H "Content-Type: application/json" \\
  -d '{"roomName": "Sonos-180", "stationName": "p3"}'`);

  console.log("\n4. Play custom stream:");
  console.log(`curl -X POST http://localhost:3000/radio/play \\
  -H "Content-Type: application/json" \\
  -d '{"roomName": "Sonos-180", "streamUrl": "https://http-live.sr.se/p3-mp3-192"}'`);

  console.log("\n5. Stop playback:");
  console.log(`curl -X POST http://localhost:3000/radio/stop \\
  -H "Content-Type: application/json" \\
  -d '{"roomName": "Sonos-180"}'`);
}

// Run the test
if (process.argv.includes("--examples")) {
  showExampleCalls();
} else {
  testDirectRadio();
}
