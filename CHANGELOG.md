# Changelog

All notable changes to the Chatterbox TTS API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-06-14

### Added

- Version management system with automatic version reading from `pyproject.toml`
- Frontend and backend version display in the UI
- Comprehensive changelog documentation

#### Status API & Monitoring

- **Real-time TTS Processing Status API** with comprehensive endpoints:
  - `/status` - Main status endpoint with configurable details
  - `/status/progress` - Lightweight progress monitoring
  - `/status/statistics` - Processing metrics and performance stats
  - `/status/history` - Request history with detailed records
  - `/info` - Comprehensive API information endpoint
- **Advanced Status Tracking System**:
  - Thread-safe status manager with request lifecycle tracking
  - Progress percentage calculation with chunk-by-chunk monitoring
  - Processing statistics including success rates and performance metrics
  - Request history with detailed metadata and text previews
  - Memory usage tracking integration
- **Enhanced API Information**:
  - Version management with automatic `pyproject.toml` integration
  - Comprehensive API metadata including author, license, and platform info
  - Real-time server status and configuration details

#### Frontend Enhancements

- **Modern UI Framework Integration**:
  - Full shadcn/ui component library integration
  - Responsive design with mobile-first approach
  - Improved color system with dark/light mode support
  - Enhanced accessibility with proper ARIA labels and focus management
- **Advanced Status Monitoring Dashboard**:
  - Real-time status header with live processing updates
  - Interactive statistics panel with processing metrics
  - Progress overlay with visual chunk progression
  - Request history viewer with detailed request information
- **Enhanced User Experience**:
  - Responsive dialog-drawer modal system for mobile optimization
  - Improved form controls with better validation feedback
  - Advanced settings panel with real-time parameter adjustment
  - Voice library management with upload, rename, and delete capabilities
- **State Management Improvements**:
  - Centralized API state management with React Query
  - Real-time data synchronization across components
  - Optimistic updates for better user experience
  - Comprehensive error handling and retry mechanisms

### Enhanced

#### Backend Improvements

- **Memory Management System**:
  - Advanced memory monitoring with detailed usage tracking
  - Automatic cleanup routines for CUDA and CPU memory
  - Memory optimization for long-running processes
  - Configurable cleanup intervals and monitoring settings
- **API Architecture**:
  - Comprehensive endpoint aliasing system for backward compatibility
  - Enhanced request/response validation with Pydantic models
  - Improved error handling and status reporting
  - Better FastAPI documentation with detailed endpoint descriptions

#### Developer Experience

- **Docker Infrastructure**:
  - Multiple Docker Compose configurations for different deployment scenarios
  - GPU-optimized containers with CUDA support
  - uv-based builds for faster dependency resolution
  - Production-ready container configurations
- **Configuration Management**:
  - Environment variable validation and type checking
  - Comprehensive configuration endpoints for debugging
  - Better default values and configuration documentation
  - Runtime configuration updates for development

### Technical Details

#### API Endpoints Added

- `GET /status` - Main status with optional memory, history, and stats
- `GET /status/progress` - Lightweight progress monitoring
- `GET /status/statistics` - Processing metrics and performance data
- `GET /status/history` - Request history with configurable limits
- `POST /status/history/clear` - Clear request history with confirmation
- `GET /info` - Comprehensive API information and version details

#### Frontend Components Added

- `StatusHeader` - Real-time status display with API version
- `StatusProgressOverlay` - Visual progress tracking during generation
- `StatusStatisticsPanel` - Interactive statistics dashboard
- `useStatusMonitoring` - Custom hook for real-time status updates
- Version management utilities for frontend/backend version tracking

#### Configuration Enhancements

- Version management with `app/core/version.py`
- Enhanced `/config` endpoint with API metadata
- Frontend version utilities with build-time integration
- Comprehensive version display in UI components

### Infrastructure

- **Versioning System**: Automatic version reading from `pyproject.toml` with fallback support
- **Build Optimization**: uv integration for faster builds and better dependency resolution
- **Documentation**: Enhanced API documentation with detailed endpoint descriptions
- **Testing**: Extended test suite for status endpoints and memory management

---

## [1.0.0] - 2025-06-XX

### Added

- Initial release of Chatterbox TTS API
- FastAPI-based REST API with OpenAI compatibility
- Voice cloning capabilities with custom voice samples
- Docker containerization support
- React-based web frontend
- Basic health monitoring and configuration endpoints
- Memory management system
- Text processing with automatic chunking
- Multi-format audio support (MP3, WAV, FLAC, M4A, OGG)

### Core Features

- OpenAI-compatible `/v1/audio/speech` endpoint
- Voice file upload support via `/v1/audio/speech/upload`
- Health check endpoint `/health`
- Models listing endpoint `/v1/models`
- Configuration endpoint `/config`
- Memory management endpoint `/memory`

### Frontend Features

- Text-to-speech interface with parameter controls
- Voice library management
- Audio history and playback
- Advanced settings panel
- Theme support (light/dark mode)
- Responsive design

---

## Version Format

This project uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backwards compatible manner
- **PATCH**: Backwards compatible bug fixes

### Backend vs Frontend Versioning

- **Backend API Version**: Follows the main project version (currently 1.2.0)
- **Frontend Version**: Independent versioning for UI updates (currently 1.1.0)
- **Display**: Backend version shown in status header, frontend version in footer

---

## Links

- [GitHub Repository](https://github.com/travisvn/chatterbox-tts-api)
- [API Documentation](docs/API_README.md)
- [Docker Guide](docs/DOCKER_README.md)
- [Status API Documentation](docs/STATUS_API.md)
