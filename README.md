# ITER Curriculum Viewer

A modern, responsive web application to view semester-wise curriculum images for different engineering streams at ITER. Built with vanilla JavaScript and featuring a beautiful glass-morphism design with comprehensive mobile optimization.

## Features

- **Multi-Year Support**: Year selection (2020-2024) with expandable configuration
- **Complete Stream Coverage**: Multiple engineering streams with intuitive short codes
- **Comprehensive Navigation**: Semester navigation (1-8) with part-based document viewing
- **Advanced Image Viewer**: High-quality image viewer with zoom and click-to-open functionality
- **Additional Resources**: Dedicated viewer for supplementary materials and resources
- **Smart Caching**: Intelligent image caching with progressive loading and cleanup
- **Interactive UI**: Real-time progress indicators and smooth loading animations
- **Intuitive Navigation**: Back navigation and change selection dropdown for seamless experience
- **Fully Responsive**: Mobile-first design optimized for all device sizes
- **Session Management**: Automatic session restoration with welcome popup for new users
- **PWA Ready**: Progressive Web App with offline support and caching strategies
- **Touch Optimized**: Enhanced touch targets and mobile interactions

## Directory Structure

```
/
├── index.html         # Main HTML file
├── sundarta.css       # Stylesheet
├── karm.js            # Main JavaScript file
├── config.js          # Configuration for streams and constants
├── service-worker.js  # Service worker for caching
├── manifest.json      # PWA manifest
└── images/            # Curriculum images organized by year and stream
    └── [year]/
        └── [stream-code]/
            ├── [stream-code]-sem[number].webp
            ├── [stream-code]-sem[number]-[part].webp
            └── others/
                └── [additional files].webp
```

## Image Naming Convention

- Single-part images: `[stream-code]-sem[semester].webp`
- Multi-part images: `[stream-code]-sem[semester]-[part].webp`
- Additional resources: `images/[year]/[stream-code]/others/[filename].webp`

## Stream Codes

- Civil Engineering: `ce`
- Computer Science & Engineering: `cse`
- CSE (AI & ML): `cse-aiml`
- CSE (Data Science): `cse-ds`
- CSE (Internet of Things): `cse-iot`
- CSE (Cyber Security): `cse-cs`
- CS & IT: `cs-it`
- Electronics & Communication: `ece`
- Electrical Engineering: `ee`
- Electrical & Electronics: `eee`
- Mechanical Engineering: `me`

## Caching Strategy

- **Smart Image Caching**: Only semester images are cached for optimal performance
- **Memory Management**: Previous cached images are automatically removed when new ones are loaded
- **Session Persistence**: User's last selection is saved and automatically restored on revisit
- **Progressive Loading**: Images load with real-time progress indicators
- **Background Cleanup**: Automatic cache maintenance during app idle time
- **Offline Support**: Previously viewed content remains accessible offline

## Technical Specifications

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Design System**: Modern glass-morphism with sage green color palette
- **Responsive Framework**: Mobile-first approach with comprehensive breakpoints
- **Performance**: Service Worker caching, lazy loading, and image optimization
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support
- **Browser Support**: Modern browsers with ES6+ support

## Recent Updates (v2.0.0 - July 2025)

- Complete mobile optimization with touch-friendly interfaces
- Enhanced glass-morphism design with improved visual hierarchy
- Smart session management with automatic restoration
- Comprehensive dropdown styling for consistent user experience
- Improved error handling with context-aware messaging
- Advanced event listener management for reliable functionality
- Progressive enhancement for various screen sizes
