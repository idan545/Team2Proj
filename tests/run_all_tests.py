#!/usr/bin/env python3
"""
Test runner for all User Story unit tests.
Run this script to execute all tests in the test suite.

Usage:
    python tests/run_all_tests.py
    python tests/run_all_tests.py -v  # verbose output
"""

import unittest
import sys
import os

# Add the tests directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run_all_tests(verbosity=2):
    """Discover and run all tests in the tests directory."""
    
    # Get the directory containing this script
    test_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create a test suite from all test files
    loader = unittest.TestLoader()
    suite = loader.discover(test_dir, pattern='test_*.py')
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=verbosity)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    if result.wasSuccessful():
        print("\n✅ ALL TESTS PASSED!")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED!")
        if result.failures:
            print("\nFailed tests:")
            for test, traceback in result.failures:
                print(f"  - {test}")
        if result.errors:
            print("\nTests with errors:")
            for test, traceback in result.errors:
                print(f"  - {test}")
        return 1


if __name__ == '__main__':
    verbosity = 2 if '-v' in sys.argv or '--verbose' in sys.argv else 1
    sys.exit(run_all_tests(verbosity))
