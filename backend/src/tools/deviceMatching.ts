/**
 * Device name fuzzy matching utilities for smart home control
 * Provides multiple matching strategies to improve voice command UX
 */
import { Device } from "dirigera";

export interface DeviceMatchResult {
  device: Device;
  matchMethod: "exact" | "fuzzy" | "phonetic" | "partial";
  confidence: number;
  matchedName: string;
  originalName: string;
}

export interface FuzzyMatchOptions {
  minSimilarity: number;
  enablePhonetic: boolean;
  enablePartialMatch: boolean;
  strictMode: boolean;
}

const DEFAULT_OPTIONS: FuzzyMatchOptions = {
  minSimilarity: 0.6,
  enablePhonetic: true,
  enablePartialMatch: true,
  strictMode: false,
};

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Generate Soundex code for phonetic matching
 */
function generateSoundex(word: string): string {
  if (!word || word.length === 0) return "0000";

  word = word.toLowerCase();
  const soundexMap: { [key: string]: string } = {
    b: "1",
    f: "1",
    p: "1",
    v: "1",
    c: "2",
    g: "2",
    j: "2",
    k: "2",
    q: "2",
    s: "2",
    x: "2",
    z: "2",
    d: "3",
    t: "3",
    l: "4",
    m: "5",
    n: "5",
    r: "6",
  };

  let result = word.charAt(0).toUpperCase();

  for (let i = 1; i < word.length; i++) {
    const char = word.charAt(i);
    if (char in soundexMap) {
      const code = soundexMap[char];
      if (code && !result.endsWith(code)) {
        result += code;
      }
    }
  }

  return (result + "000").substring(0, 4);
}

/**
 * Normalize device name for matching
 */
function normalizeDeviceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Generate name variations for better matching
 */
function generateNameVariations(name: string): string[] {
  const normalized = normalizeDeviceName(name);
  const variations = new Set([normalized]);

  // Add variations without common words
  const withoutCommon = normalized
    .replace(/\b(light|lamp|bulb|the|my|smart|ikea)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutCommon && withoutCommon !== normalized) {
    variations.add(withoutCommon);
  }

  // Add variations with spaces replaced by underscores and vice versa
  variations.add(normalized.replace(/\s/g, "_"));
  variations.add(normalized.replace(/_/g, " "));

  // Add partial matches (first word, last word)
  const words = normalized.split(" ").filter((w) => w.length > 0);
  if (words.length > 1) {
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    if (firstWord) variations.add(firstWord);
    if (lastWord) variations.add(lastWord);
  }

  // Add abbreviations (first letter of each word)
  if (words.length > 1) {
    const abbreviation = words.map((w) => w.charAt(0)).join("");
    if (abbreviation.length > 1) {
      variations.add(abbreviation);
    }
  }

  return Array.from(variations).filter((v) => v.length > 0);
}

/**
 * Extract device name from Device object
 */
function getDeviceName(device: Device): string {
  return (
    device.attributes.customName ||
    device.attributes.model ||
    `${device.type}_${device.id}`
  );
}

/**
 * Find the best matching device by name using multiple strategies
 */
export function findBestDeviceMatch(
  inputName: string,
  devices: Device[],
  deviceType?: string,
  options: Partial<FuzzyMatchOptions> = {}
): DeviceMatchResult | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedInput = normalizeDeviceName(inputName);
  const inputVariations = generateNameVariations(inputName);
  const inputSoundex = generateSoundex(normalizedInput);

  let bestMatch: DeviceMatchResult | null = null;

  // Filter devices by type if specified
  const candidateDevices = deviceType
    ? devices.filter((d) => d.type === deviceType)
    : devices;

  for (const device of candidateDevices) {
    const deviceName = getDeviceName(device);
    const normalizedDeviceName = normalizeDeviceName(deviceName);
    const deviceVariations = generateNameVariations(deviceName);
    const deviceSoundex = generateSoundex(normalizedDeviceName);

    // Strategy 1: Exact match (highest priority)
    for (const inputVar of inputVariations) {
      for (const deviceVar of deviceVariations) {
        if (inputVar === deviceVar) {
          return {
            device,
            matchMethod: "exact",
            confidence: 1.0,
            matchedName: deviceVar,
            originalName: deviceName,
          };
        }
      }
    }

    // Strategy 2: Fuzzy string matching
    let bestSimilarity = 0;
    let bestVariation = "";

    for (const inputVar of inputVariations) {
      for (const deviceVar of deviceVariations) {
        const similarity = calculateStringSimilarity(inputVar, deviceVar);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestVariation = deviceVar;
        }
      }
    }

    if (bestSimilarity >= opts.minSimilarity) {
      const match: DeviceMatchResult = {
        device,
        matchMethod: "fuzzy",
        confidence: bestSimilarity,
        matchedName: bestVariation,
        originalName: deviceName,
      };

      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    }

    // Strategy 3: Phonetic matching (if enabled)
    if (opts.enablePhonetic && inputSoundex === deviceSoundex) {
      const match: DeviceMatchResult = {
        device,
        matchMethod: "phonetic",
        confidence: 0.85, // High confidence for phonetic match
        matchedName: normalizedDeviceName,
        originalName: deviceName,
      };

      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    }

    // Strategy 4: Partial matching (if enabled)
    if (opts.enablePartialMatch) {
      // Check if input is contained in device name or vice versa
      const inputWords = normalizedInput.split(" ").filter((w) => w.length > 2);
      const deviceWords = normalizedDeviceName
        .split(" ")
        .filter((w) => w.length > 2);

      let partialScore = 0;
      for (const inputWord of inputWords) {
        for (const deviceWord of deviceWords) {
          if (
            inputWord.includes(deviceWord) ||
            deviceWord.includes(inputWord)
          ) {
            partialScore += 0.5;
          }
        }
      }

      const partialConfidence = Math.min(
        0.8,
        partialScore / Math.max(inputWords.length, deviceWords.length)
      );

      if (partialConfidence >= opts.minSimilarity) {
        const match: DeviceMatchResult = {
          device,
          matchMethod: "partial",
          confidence: partialConfidence,
          matchedName: normalizedDeviceName,
          originalName: deviceName,
        };

        if (!bestMatch || match.confidence > bestMatch.confidence) {
          bestMatch = match;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Find multiple potential device matches (useful for disambiguation)
 */
export function findDeviceMatches(
  inputName: string,
  devices: Device[],
  deviceType?: string,
  options: Partial<FuzzyMatchOptions> = {},
  maxResults: number = 5
): DeviceMatchResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const matches: DeviceMatchResult[] = [];

  for (const device of devices) {
    if (deviceType && device.type !== deviceType) continue;

    const match = findBestDeviceMatch(inputName, [device], deviceType, opts);
    if (match && match.confidence >= opts.minSimilarity) {
      matches.push(match);
    }
  }

  // Sort by confidence (descending) and return top results
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}
