#!/usr/bin/env node

/**
 * Debug script for auto-detection logic
 */

// Simple Swedish text detection based on common Swedish characters and words
function detectSwedishText(text) {
  // Check for Swedish-specific characters
  const swedishChars = /[åäöÅÄÖ]/;
  if (swedishChars.test(text)) {
    return true;
  }

  // Check for common Swedish words
  const swedishWords = [
    "och",
    "är",
    "det",
    "att",
    "en",
    "som",
    "på",
    "av",
    "för",
    "till",
    "med",
    "han",
    "hon",
    "den",
    "var",
    "sig",
    "så",
    "har",
    "inte",
    "jag",
    "ett",
    "om",
    "när",
    "nu",
    "skulle",
    "här",
    "bara",
    "kommer",
    "upp",
    "även",
    "mycket",
    "bli",
    "första",
    "andra",
    "nya",
    "gamla",
    "stora",
    "små",
    "bra",
    "svenska",
    "hej",
    "tack",
    "kanske",
    "svenska",
    "röst",
  ];

  // Convert to lowercase and split into words
  const words = text.toLowerCase().split(/\s+/);

  // Count Swedish words
  let swedishWordCount = 0;
  for (const word of words) {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[.,!?;:"']/g, "");
    if (swedishWords.includes(cleanWord)) {
      swedishWordCount++;
    }
  }

  // If more than 20% are Swedish words, consider it Swedish
  const swedishRatio = swedishWordCount / words.length;
  return swedishRatio > 0.2;
}

function getVoiceConfig(text, language) {
  const voices = {
    english: {
      voiceId: "pNInz6obpgDQGcFmaJgB", // Adam
      modelId: "eleven_monolingual_v1",
    },
    swedish: {
      voiceId: "aSLKtNoVBZlxQEMsnGL2", // Sanna can handle both English and Swedish
      modelId: "eleven_multilingual_v2",
    },
    multilingual: {
      voiceId: "aSLKtNoVBZlxQEMsnGL2", // Sanna can handle both English and Swedish
      modelId: "eleven_multilingual_v2",
    },
  };

  // Use specified language configuration
  if (language && language !== "auto" && voices[language]) {
    return voices[language];
  }

  // Auto-detect language based on text content
  const hasSwedishChars = detectSwedishText(text);

  if (hasSwedishChars || language === "swedish") {
    console.log("Detected Swedish text, using Swedish voice configuration");
    return voices.swedish;
  }

  // Default to multilingual voice for mixed or unknown content
  if (language === "auto") {
    console.log("Auto mode: using multilingual voice");
    return voices.multilingual;
  }

  // Default to English voice
  return voices.english;
}

// Test cases
const testCases = [
  {
    name: "Auto-Detection: Swedish with åäö",
    text: "Jag älskar att höra på musik på svenska.",
    language: "auto",
  },
  {
    name: "Auto-Detection: English",
    text: "I love listening to music in English.",
    language: "auto",
  },
  {
    name: "Multilingual Mode",
    text: "This is a mix of English and svenska text in the same sentence.",
    language: "auto",
  },
];

console.log("🔍 Debugging Auto-Detection Logic");
console.log("=".repeat(50));

for (const testCase of testCases) {
  console.log(`\n🧪 ${testCase.name}`);
  console.log(`   Text: "${testCase.text}"`);
  console.log(`   Language: ${testCase.language}`);

  const hasSwedish = detectSwedishText(testCase.text);
  console.log(`   Swedish detected: ${hasSwedish}`);

  const voiceConfig = getVoiceConfig(testCase.text, testCase.language);
  console.log(`   Voice config: ${JSON.stringify(voiceConfig, null, 2)}`);
}
