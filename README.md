# ITER Curriculum Viewer

A web application to view semester-wise curriculum images for different engineering streams at ITER.

## Features

- Year selection (2020-2024)
- Multiple engineering stream support with short codes
- Semester navigation (1-8)
- Image viewer with zoom functionality
- Additional resources viewer
- Fast image loading with caching
- Progressive loading bar
- Back navigation for easy correction of selections
- Change selection dropdown for quick navigation
- Responsive design

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

- Only semester images are cached for quick access
- When a new semester image is loaded, the previous cached image is removed
- The user's last selection is saved and automatically loaded on revisit
