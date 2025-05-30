"""
Robust wake word detection with phonetic and fuzzy matching
"""

import logging
import re
from typing import List, Dict, Optional, Set, Any
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class WakeWordDetector:
    """
    Advanced wake word detection supporting:
    - Exact matching
    - Phonetic matching (Soundex)
    - Fuzzy string matching
    - Custom variations/aliases
    - Configurable similarity thresholds
    """

    def __init__(
        self,
        wake_word: str,
        similarity_threshold: float = 0.6,
        phonetic_matching: bool = True,
        custom_variations: Optional[List[str]] = None,
    ):
        """
        Initialize wake word detector

        Args:
            wake_word: Primary wake word (e.g., "apartment")
            similarity_threshold: Minimum similarity score (0.0-1.0)
            phonetic_matching: Enable phonetic (Soundex) matching
            custom_variations: Additional variations/aliases for the wake word
        """
        self.wake_word = wake_word.lower().strip()
        self.similarity_threshold = similarity_threshold
        self.phonetic_matching = phonetic_matching

        # Build comprehensive word variations
        self.variations = self._build_variations(custom_variations or [])

        # Precompute Soundex codes for phonetic matching
        if self.phonetic_matching:
            self.soundex_codes = self._build_soundex_codes()

        logger.info(
            "Wake word detector initialized for '%s' with %d variations, "
            "threshold=%.2f, phonetic=%s",
            self.wake_word,
            len(self.variations),
            self.similarity_threshold,
            self.phonetic_matching,
        )

    def _build_variations(self, custom_variations: List[str]) -> Set[str]:
        """Build comprehensive set of wake word variations"""
        variations = {self.wake_word}

        # Add custom variations
        for variation in custom_variations:
            variations.add(variation.lower().strip())

        # Generate common transcription variations for "apartment"
        if self.wake_word == "apartment":
            variations.update(
                [
                    "apartment",
                    "apartement",  # Common misspelling
                    "apartament",  # Another misspelling
                    "appartment",  # Extra 'p'
                    "apartmant",  # 'e' -> 'a'
                    "apartement",  # French influence
                    "apartmint",  # 'e' -> 'i'
                    "apartent",  # Missing 'm'
                    "apertment",  # Missing 'a'
                    "apratment",  # Transposed 'a'
                    "a part mint",  # Split words
                    "a part ment",  # Split words
                    "apart mint",  # Split words
                    "apart ment",  # Split words
                ]
            )

        # Generate phonetic variations based on common transcription errors
        variations.update(self._generate_phonetic_variations(self.wake_word))

        return variations

    def _generate_phonetic_variations(self, word: str) -> Set[str]:
        """Generate phonetic variations based on common speech-to-text errors"""
        variations = set()

        # Common substitutions in speech recognition
        substitutions = {
            "a": ["ah", "uh", "e"],
            "e": ["a", "i", "uh"],
            "i": ["e", "ee", "ih"],
            "o": ["oh", "uh", "aw"],
            "u": ["uh", "oo", "ah"],
            "ment": ["mint", "mant", "munt", "ment"],
            "part": ["part", "port", "pert"],
            "apart": ["a part", "apart", "aport"],
        }

        # Apply substitutions
        for original, replacements in substitutions.items():
            if original in word:
                for replacement in replacements:
                    variations.add(word.replace(original, replacement))

        return variations

    def _build_soundex_codes(self) -> Set[str]:
        """Build Soundex codes for all variations"""
        codes = set()
        for variation in self.variations:
            # Clean variation (remove spaces, punctuation)
            clean_var = re.sub(r"[^a-z]", "", variation)
            if clean_var:
                codes.add(self._soundex(clean_var))
        return codes

    def _soundex(self, word: str) -> str:
        """
        Generate Soundex code for phonetic matching

        Soundex algorithm:
        1. Keep first letter
        2. Replace consonants with digits
        3. Remove vowels and duplicate digits
        4. Pad or truncate to 4 characters
        """
        if not word:
            return "0000"

        word = word.lower()
        soundex_map = {
            "b": "1",
            "f": "1",
            "p": "1",
            "v": "1",
            "c": "2",
            "g": "2",
            "j": "2",
            "k": "2",
            "q": "2",
            "s": "2",
            "x": "2",
            "z": "2",
            "d": "3",
            "t": "3",
            "l": "4",
            "m": "5",
            "n": "5",
            "r": "6",
        }

        # Keep first letter
        result = word[0].upper()

        # Convert remaining letters
        for char in word[1:]:
            if char in soundex_map:
                code = soundex_map[char]
                # Avoid duplicate consecutive codes
                if not result.endswith(code):
                    result += code

        # Pad with zeros or truncate to 4 characters
        result = (result + "000")[:4]
        return result

    def detect_wake_word(self, transcribed_text: str) -> Dict[str, Any]:
        """
        Detect wake word in transcribed text

        Args:
            transcribed_text: Text from speech recognition

        Returns:
            Dict with detection results:
            {
                'detected': bool,
                'method': str,  # 'exact', 'fuzzy', 'phonetic', 'variation'
                'matched_word': str,
                'confidence': float,
                'similarity_score': float
            }
        """
        if not transcribed_text:
            return self._no_detection()

        text = transcribed_text.lower().strip()
        words = re.findall(r"\b\w+\b", text)  # Extract words

        # 1. Exact matching (highest priority)
        for word in words:
            if word in self.variations:
                return {
                    "detected": True,
                    "method": "exact",
                    "matched_word": word,
                    "confidence": 1.0,
                    "similarity_score": 1.0,
                }

        # 2. Fuzzy string matching
        best_fuzzy = self._fuzzy_match(words)
        if best_fuzzy["detected"]:
            return best_fuzzy

        # 3. Phonetic matching (if enabled)
        if self.phonetic_matching:
            best_phonetic = self._phonetic_match(words)
            if best_phonetic["detected"]:
                return best_phonetic

        # 4. Multi-word matching (for split wake words)
        multiword_result = self._multiword_match(text)
        if multiword_result["detected"]:
            return multiword_result

        return self._no_detection()

    def _fuzzy_match(self, words: List[str]) -> Dict[str, Any]:
        """Perform fuzzy string matching"""
        # Common words that should be excluded from fuzzy matching to avoid false positives
        common_words_blacklist = {
            "important",
            "department",
            "compartment",
            "treatment",
            "argument",
            "document",
            "movement",
            "moment",
            "parent",
            "apparent",
            "statement",
            "element",
            "agreement",
            "improvement",
            "development",
            "government",
        }

        best_score = 0.0
        best_word = None

        for word in words:
            # Skip blacklisted words that commonly cause false positives
            if word.lower() in common_words_blacklist:
                continue

            for variation in self.variations:
                # Skip very short words to avoid false positives
                if len(word) < 4 or len(variation) < 4:
                    continue

                # Only consider fuzzy matches if words start with same letter (more restrictive)
                if word[0] != variation[0]:
                    continue

                score = SequenceMatcher(None, word, variation).ratio()

                # For fuzzy matching, require higher similarity for longer words
                min_score = self.similarity_threshold
                if len(word) > 6:
                    min_score = max(0.75, self.similarity_threshold)

                if score > best_score and score >= min_score:
                    best_score = score
                    best_word = word

        if best_score >= self.similarity_threshold:
            return {
                "detected": True,
                "method": "fuzzy",
                "matched_word": best_word,
                "confidence": best_score,
                "similarity_score": best_score,
            }

        return self._no_detection()

    def _phonetic_match(self, words: List[str]) -> Dict[str, Any]:
        """Perform phonetic (Soundex) matching"""
        for word in words:
            if len(word) < 3:  # Skip very short words
                continue

            word_soundex = self._soundex(word)
            if word_soundex in self.soundex_codes:
                # Calculate similarity based on Soundex match
                confidence = 0.8  # Soundex matches get high but not perfect confidence
                return {
                    "detected": True,
                    "method": "phonetic",
                    "matched_word": word,
                    "confidence": confidence,
                    "similarity_score": confidence,
                }

        return self._no_detection()

    def _multiword_match(self, text: str) -> Dict[str, Any]:
        """Match wake words that might be split across multiple words"""
        # Remove punctuation and extra spaces
        clean_text = re.sub(r"[^\w\s]", " ", text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()

        # Check for variations that might be split
        for variation in self.variations:
            if " " in variation:
                # Use fuzzy matching for multi-word variations
                score = SequenceMatcher(None, clean_text, variation).ratio()
                if score >= self.similarity_threshold:
                    return {
                        "detected": True,
                        "method": "multiword",
                        "matched_word": variation,
                        "confidence": score,
                        "similarity_score": score,
                    }

        return self._no_detection()

    def _no_detection(self) -> Dict[str, Any]:
        """Return no detection result"""
        return {
            "detected": False,
            "method": None,
            "matched_word": None,
            "confidence": 0.0,
            "similarity_score": 0.0,
        }

    def add_variation(self, variation: str) -> None:
        """Add a new variation to the wake word detector"""
        clean_var = variation.lower().strip()
        if clean_var and clean_var not in self.variations:
            self.variations.add(clean_var)
            if self.phonetic_matching:
                clean_word = re.sub(r"[^a-z]", "", clean_var)
                if clean_word:
                    self.soundex_codes.add(self._soundex(clean_word))
            logger.info("Added wake word variation: '%s'", clean_var)

    def get_status(self) -> Dict[str, Any]:
        """Get detector status and configuration"""
        return {
            "wake_word": self.wake_word,
            "similarity_threshold": self.similarity_threshold,
            "phonetic_matching": self.phonetic_matching,
            "variations_count": len(self.variations),
            "variations": sorted(list(self.variations)),
            "soundex_codes": sorted(list(self.soundex_codes))
            if self.phonetic_matching
            else [],
        }
