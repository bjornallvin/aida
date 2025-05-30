#!/usr/bin/env python3
"""
Room-client test runner
"""

import sys
import os
from pathlib import Path


def run_test(test_file):
    """Run a single test file"""
    print(f"\n🧪 Running {test_file}")
    print("=" * 50)

    try:
        result = os.system(f"python {test_file}")
        if result == 0:
            print(f"✅ {test_file} PASSED")
            return True
        else:
            print(f"❌ {test_file} FAILED")
            return False
    except Exception as e:
        print(f"❌ {test_file} ERROR: {e}")
        return False


def main():
    """Run room-client tests"""
    print("🚀 Room-Client Test Runner")
    print("=" * 50)

    tests_dir = Path(__file__).parent

    # Core tests to run
    core_tests = [
        "test_imports.py",
        "test_wake_word_simple.py",
        "test_wake_word_final.py",
    ]

    passed = 0
    total = len(core_tests)

    for test in core_tests:
        test_path = tests_dir / test
        if test_path.exists():
            if run_test(str(test_path)):
                passed += 1
        else:
            print(f"⚠️  {test} not found")

    print("\n" + "=" * 50)
    print(f"📊 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All core tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
