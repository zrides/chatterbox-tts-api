#!/usr/bin/env python3
"""
Test script for the Chatterbox TTS FastAPI
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
            print(f"  Response: {response.text}")
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
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Models endpoint failed with error: {e}")
        return False

def test_api_docs():
    """Test that FastAPI documentation is available"""
    print("\nTesting API documentation endpoints...")
    try:
        # Test OpenAPI schema
        response = requests.get(f"{API_BASE_URL}/openapi.json")
        if response.status_code == 200:
            print("✓ OpenAPI schema available")
        else:
            print(f"✗ OpenAPI schema failed with status {response.status_code}")
        
        # Test Swagger UI
        response = requests.get(f"{API_BASE_URL}/docs")
        if response.status_code == 200:
            print("✓ Swagger UI available at /docs")
        else:
            print(f"✗ Swagger UI failed with status {response.status_code}")
            
        # Test ReDoc
        response = requests.get(f"{API_BASE_URL}/redoc")
        if response.status_code == 200:
            print("✓ ReDoc documentation available at /redoc")
            return True
        else:
            print(f"✗ ReDoc failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Documentation endpoints failed with error: {e}")
        return False

def test_text_to_speech(text, output_filename, custom_params=None):
    """Test the text-to-speech endpoint"""
    print(f"\nTesting TTS with text: '{text[:50]}{'...' if len(text) > 50 else ''}'")
    
    payload = {
        "input": text,
        "voice": "alloy",  # This will be ignored
        "response_format": "wav",  # This will be ignored
        "speed": 1.0  # This will be ignored
    }
    
    # Add custom parameters if provided
    if custom_params:
        payload.update(custom_params)
        print(f"  Using custom parameters: {custom_params}")
    
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
        if response.status_code == 422:  # FastAPI uses 422 for validation errors
            print("✓ Missing input field error handled correctly")
        else:
            print(f"✗ Expected 422 for missing input, got {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error testing missing input: {e}")
    
    # Test empty input
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json={"input": ""},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 422:  # FastAPI validation error
            print("✓ Empty input error handled correctly")
        else:
            print(f"✗ Expected 422 for empty input, got {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error testing empty input: {e}")
    
    # Test invalid parameter ranges
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json={"input": "test", "exaggeration": 5.0},  # Out of range
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 422:
            print("✓ Invalid parameter range error handled correctly")
        else:
            print(f"✗ Expected 422 for invalid parameter, got {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error testing invalid parameters: {e}")
    
    # Test very long text
    try:
        long_text = "This is a test. " * 200  # Should exceed max length
        response = requests.post(
            f"{API_BASE_URL}/v1/audio/speech",
            json={"input": long_text},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 400:
            print("✓ Long text error handled correctly")
        else:
            print(f"✗ Expected 400 for long text, got {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error testing long text: {e}")

def test_custom_parameters():
    """Test TTS with various custom parameters"""
    print("\nTesting custom TTS parameters...")
    
    test_cases = [
        {
            "name": "High exaggeration",
            "params": {"exaggeration": 1.0},
            "filename": "test_high_exaggeration.wav"
        },
        {
            "name": "Low CFG weight (faster)",
            "params": {"cfg_weight": 0.2},
            "filename": "test_fast_speech.wav"
        },
        {
            "name": "High temperature (creative)",
            "params": {"temperature": 1.5},
            "filename": "test_creative.wav"
        },
        {
            "name": "Combined parameters",
            "params": {"exaggeration": 0.8, "cfg_weight": 0.3, "temperature": 1.2},
            "filename": "test_combined.wav"
        }
    ]
    
    success_count = 0
    for test_case in test_cases:
        print(f"\n  Testing {test_case['name']}...")
        if test_text_to_speech(
            "This is a test with custom parameters.",
            test_case['filename'],
            test_case['params']
        ):
            success_count += 1
    
    print(f"\nCustom parameter tests: {success_count}/{len(test_cases)} passed")
    return success_count == len(test_cases)

def main():
    """Run all tests"""
    print("=" * 60)
    print("Chatterbox TTS FastAPI Test Suite")
    print("=" * 60)
    
    # Test basic endpoints
    if not test_health_check():
        print("\n✗ Health check failed - API may not be running")
        print("Please ensure the API server is running with: uvicorn api:app")
        return
    
    test_models_endpoint()
    test_api_docs()
    
    # Test TTS with different text lengths
    success_count = 0
    total_tests = len(TEST_TEXTS)
    
    for i, text in enumerate(TEST_TEXTS):
        output_file = f"test_output_{i+1}.wav"
        if test_text_to_speech(text, output_file):
            success_count += 1
    
    # Test custom parameters
    custom_param_success = test_custom_parameters()
    
    # Test error handling
    test_error_handling()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Basic TTS Tests: {success_count}/{total_tests} passed")
    print(f"Custom Parameter Tests: {'✓' if custom_param_success else '✗'}")
    
    if success_count == total_tests and custom_param_success:
        print("🎉 All tests passed!")
        print("\nGenerated audio files:")
        for i in range(total_tests):
            filename = f"test_output_{i+1}.wav"
            if os.path.exists(filename):
                size = os.path.getsize(filename)
                print(f"  - {filename} ({size:,} bytes)")
        
        print("\nCustom parameter test files:")
        custom_files = [
            "test_high_exaggeration.wav",
            "test_fast_speech.wav", 
            "test_creative.wav",
            "test_combined.wav"
        ]
        for filename in custom_files:
            if os.path.exists(filename):
                size = os.path.getsize(filename)
                print(f"  - {filename} ({size:,} bytes)")
        
        print(f"\nAPI Documentation:")
        print(f"  - Swagger UI: {API_BASE_URL}/docs")
        print(f"  - ReDoc: {API_BASE_URL}/redoc")
        print(f"  - OpenAPI Schema: {API_BASE_URL}/openapi.json")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main() 