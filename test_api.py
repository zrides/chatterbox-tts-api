#!/usr/bin/env python3
"""
Test script for the ChatterboxTTS Flask API
"""

import requests
import json
import time
import os

# Configuration
API_BASE_URL = "http://localhost:5123"
TEST_TEXTS = [
    "Hello, this is a simple test of the text to speech system.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for testing.",
    "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.",
]

def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health check passed: {data}")
            return True
        else:
            print(f"✗ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health check failed with error: {e}")
        return False

def test_models_endpoint():
    """Test the models listing endpoint"""
    print("\nTesting models endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/v1/models")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Models endpoint passed: {data}")
            return True
        else:
            print(f"✗ Models endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Models endpoint failed with error: {e}")
        return False

def test_text_to_speech(text, output_filename):
    """Test the text-to-speech endpoint"""
    print(f"\nTesting TTS with text: '{text[:50]}{'...' if len(text) > 50 else ''}'")
    
    payload = {
        "input": text,
        "voice": "alloy",  # This will be ignored
        "response_format": "mp3",  # This will be ignored
        "speed": 1.0  # This will be ignored
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        end_time = time.time()
        
        if response.status_code == 200:
            # Save the audio file
            with open(output_filename, 'wb') as f:
                f.write(response.content)
            
            file_size = len(response.content)
            duration = end_time - start_time
            
            print(f"✓ TTS generation successful!")
            print(f"  - Duration: {duration:.2f} seconds")
            print(f"  - File size: {file_size:,} bytes")
            print(f"  - Output saved to: {output_filename}")
            return True
        else:
            print(f"✗ TTS generation failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data}")
            except:
                print(f"  Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ TTS generation failed with error: {e}")
        return False

def test_error_handling():
    """Test error handling with invalid requests"""
    print("\nTesting error handling...")
    
    # Test missing input field
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json={"voice": "alloy"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 400:
            print("✓ Missing input field error handled correctly")
        else:
            print(f"✗ Expected 400 for missing input, got {response.status_code}")
    except Exception as e:
        print(f"✗ Error testing missing input: {e}")
    
    # Test empty input
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json={"input": ""},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 400:
            print("✓ Empty input error handled correctly")
        else:
            print(f"✗ Expected 400 for empty input, got {response.status_code}")
    except Exception as e:
        print(f"✗ Error testing empty input: {e}")
    
    # Test non-JSON request
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            data="not json",
            headers={"Content-Type": "text/plain"}
        )
        if response.status_code == 400:
            print("✓ Non-JSON request error handled correctly")
        else:
            print(f"✗ Expected 400 for non-JSON, got {response.status_code}")
    except Exception as e:
        print(f"✗ Error testing non-JSON request: {e}")

def main():
    """Run all tests"""
    print("=" * 60)
    print("ChatterboxTTS API Test Suite")
    print("=" * 60)
    
    # Test basic endpoints
    if not test_health_check():
        print("\n✗ Health check failed - API may not be running")
        print("Please ensure the API server is running with: python api.py")
        return
    
    test_models_endpoint()
    
    # Test TTS with different text lengths
    success_count = 0
    total_tests = len(TEST_TEXTS)
    
    for i, text in enumerate(TEST_TEXTS):
        output_file = f"test_output_{i+1}.wav"
        if test_text_to_speech(text, output_file):
            success_count += 1
    
    # Test error handling
    test_error_handling()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"TTS Tests: {success_count}/{total_tests} passed")
    
    if success_count == total_tests:
        print("🎉 All TTS tests passed!")
        print("\nGenerated audio files:")
        for i in range(total_tests):
            filename = f"test_output_{i+1}.wav"
            if os.path.exists(filename):
                size = os.path.getsize(filename)
                print(f"  - {filename} ({size:,} bytes)")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main() 