#!/usr/bin/env ts-node

/**
 * Edge case test for fuzzy matching functionality
 */

import {
  findBestDeviceMatch,
  findDeviceMatches,
} from "../src/tools/deviceMatching";

// Mock Device objects with more challenging names
const mockDevices = [
  {
    id: "1",
    type: "light",
    attributes: {
      customName: "Philips Hue White Ambiance E27",
      model: "9290012573A",
    },
  },
  {
    id: "2",
    type: "light",
    attributes: {
      customName: "IKEA TRÅDFRI LED bulb E27 1000 lumen",
      model: "LED1836G9",
    },
  },
  {
    id: "3",
    type: "light",
    attributes: {
      customName: "Smart Light Strip RGB+W",
      model: "WS2812B",
    },
  },
  {
    id: "4",
    type: "outlet",
    attributes: {
      customName: "TP-Link Kasa Smart WiFi Plug",
      model: "HS105",
    },
  },
] as any[];

async function testEdgeCases() {
  console.log("🧪 Testing Edge Cases for Fuzzy Device Matching\n");

  const testCases = [
    // Typos and misspellings
    { input: "phillips hue", expected: "Philips Hue White Ambiance E27" },
    { input: "ikea tradfri", expected: "IKEA TRÅDFRI LED bulb E27 1000 lumen" },
    { input: "smart strip", expected: "Smart Light Strip RGB+W" },
    { input: "kasa plug", expected: "TP-Link Kasa Smart WiFi Plug" },

    // Voice transcription errors
    { input: "Philip's hugh", expected: "Philips Hue White Ambiance E27" },
    {
      input: "ikea trade free",
      expected: "IKEA TRÅDFRI LED bulb E27 1000 lumen",
    },
    { input: "wi fi plug", expected: "TP-Link Kasa Smart WiFi Plug" },

    // Partial matches
    { input: "hue", expected: "Philips Hue White Ambiance E27" },
    { input: "led bulb", expected: "IKEA TRÅDFRI LED bulb E27 1000 lumen" },
    { input: "rgb", expected: "Smart Light Strip RGB+W" },

    // Model numbers
    { input: "LED1836G9", expected: "IKEA TRÅDFRI LED bulb E27 1000 lumen" },
    { input: "HS105", expected: "TP-Link Kasa Smart WiFi Plug" },
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: "${testCase.input}"`);

    const match = findBestDeviceMatch(testCase.input, mockDevices);

    if (match) {
      const deviceName =
        match.device.attributes.customName || match.device.attributes.model;
      console.log(`✅ Found: "${deviceName}"`);
      console.log(
        `   Method: ${
          match.matchMethod
        }, Confidence: ${match.confidence.toFixed(2)}`
      );
      console.log(`   Matched on: "${match.matchedName}"\n`);
    } else {
      console.log(`❌ No match found\n`);
    }
  }

  console.log("✨ Edge case testing completed!");
}

testEdgeCases().catch(console.error);
