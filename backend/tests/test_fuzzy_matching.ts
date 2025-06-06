#!/usr/bin/env ts-node

/**
 * Test script to validate fuzzy matching functionality for DIRIGERA devices
 */

import {
  findBestDeviceMatch,
  findDeviceMatches,
} from "../src/tools/deviceMatching";

// Mock Device objects for testing
const mockDevices = [
  {
    id: "1",
    type: "light",
    attributes: {
      customName: "Living Room Lamp",
      model: "IKEA Bulb",
    },
  },
  {
    id: "2",
    type: "light",
    attributes: {
      customName: "Kitchen Light",
      model: "IKEA Smart Bulb",
    },
  },
  {
    id: "3",
    type: "light",
    attributes: {
      customName: "Bedroom Ceiling Light",
      model: "IKEA LED",
    },
  },
  {
    id: "4",
    type: "outlet",
    attributes: {
      customName: "Living Room Outlet",
      model: "IKEA Smart Outlet",
    },
  },
] as any[];

async function testFuzzyMatching() {
  console.log("🧪 Testing Fuzzy Device Matching\n");

  const testCases = [
    // Exact matches
    { input: "Living Room Lamp", expected: "Living Room Lamp", type: "exact" },
    { input: "Kitchen Light", expected: "Kitchen Light", type: "exact" },

    // Fuzzy matches
    { input: "living room lamp", expected: "Living Room Lamp", type: "fuzzy" },
    { input: "kitchen lite", expected: "Kitchen Light", type: "fuzzy" },
    {
      input: "bedroom light",
      expected: "Bedroom Ceiling Light",
      type: "fuzzy",
    },

    // Partial matches
    { input: "living room", expected: "Living Room Lamp", type: "partial" },
    { input: "bedroom", expected: "Bedroom Ceiling Light", type: "partial" },

    // Phonetic matches (testing similar sounding words)
    { input: "kitchin light", expected: "Kitchen Light", type: "phonetic" },

    // Type-specific searches
    { input: "living room", expected: "Living Room Outlet", type: "outlet" },
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: "${testCase.input}"`);

    const deviceType = testCase.type === "outlet" ? "outlet" : undefined;
    const match = findBestDeviceMatch(testCase.input, mockDevices, deviceType);

    if (match) {
      const deviceName =
        match.device.attributes.customName || match.device.attributes.model;
      console.log(
        `✅ Found: "${deviceName}" (${
          match.matchMethod
        }, confidence: ${match.confidence.toFixed(2)})`
      );

      if (deviceName === testCase.expected || match.confidence > 0.6) {
        console.log(`✅ Test passed!\n`);
      } else {
        console.log(`❌ Test failed - expected "${testCase.expected}"\n`);
      }
    } else {
      console.log(`❌ No match found\n`);
    }
  }

  // Test multiple matches
  console.log("🔍 Testing multiple matches for 'light':");
  const multipleMatches = findDeviceMatches(
    "light",
    mockDevices,
    undefined,
    {},
    3
  );

  console.log(`Found ${multipleMatches.length} matches:`);
  multipleMatches.forEach((match, index) => {
    const deviceName =
      match.device.attributes.customName || match.device.attributes.model;
    console.log(
      `${index + 1}. "${deviceName}" (${
        match.matchMethod
      }, confidence: ${match.confidence.toFixed(2)})`
    );
  });

  console.log("\n✨ Fuzzy matching test completed!");
}

testFuzzyMatching().catch(console.error);
