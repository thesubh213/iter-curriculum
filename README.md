# ITER Curriculum Viewer

A modern, responsive web application for viewing ITER curriculum images organized by year and stream.

## Folder Structure

The application now supports a year-based folder structure for better organization:

```
images/
├── 2024/
│   ├── ce/
│   │   ├── ce-sem1.webp
│   │   ├── ce-sem2-1.webp
│   │   ├── ce-sem2-2.webp
│   │   └── others/
│   │       ├── IKS.webp
│   │       ├── ELECTIVE.webp
│   │       └── LAB.webp
│   ├── me/
│   │   ├── me-sem1.webp
│   │   └── others/
│   │       └── IKS.webp
│   ├── ee/
│   ├── eee/
│   ├── ece/
│   ├── cse/
│   ├── cs-it/
│   ├── cse-aiml/
│   ├── cse-cs/
│   ├── cse-ds/
│   └── cse-iot/
├── 2023/
│   ├── ce/
│   │   └── ce-sem1.webp
│   └── others/
├── 2022/
├── 2021/
└── 2020/
```

## Features

- **Year-based Organization**: Images are organized by admission batch (year)
- **Stream-based Subfolders**: Each year contains subfolders for different engineering streams
- **Additional Files**: Each stream folder can contain an `others/` subfolder for supplementary materials
- **Automatic Discovery**: The application automatically discovers available images based on the selected year, stream, and semester
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Progressive Web App**: Can be installed as a PWA for offline access
- **Aggressive Image and Asset Caching**: Optimized for instant loading and immutable caching

## Best Practices

- **Use .webp for all images for best performance**: This format is optimized for web use and provides better compression than .png
- **Keep images under 1MB for instant loading**: Larger images may take longer to load, especially on slower devices
- **Use immutable caching for all static assets**: This ensures that your site is always fast and responsive
- **Test PWA install and offline mode after deployment**: Ensure that your application works well in both online and offline modes

## Supported File Formats

- **Curriculum Images**: `.webp` format for semester curriculum images
- **Additional Files**: `.webp` and `.png` formats for supplementary materials

## Naming Conventions

### Curriculum Images
- Format: `{stream}-sem{semester}[-{part}].webp`
- Examples:
  - `ce-sem1.webp` (CE Semester 1)
  - `cse-sem2-1.webp` (CSE Semester 2, Part 1)
  - `me-sem3-2.webp` (ME Semester 3, Part 2)

### Additional Files
- Place in `others/` subfolder within each stream directory
- Supported names: `IKS`, `ELECTIVE`, `LAB`, `THEORY`, `PRACTICAL`, `SYLLABUS`, `SCHEDULE`
- Examples:
  - `images/2024/ce/others/IKS.webp`
  - `images/2024/cse/others/ELECTIVE.png`

## Supported Streams

- **CE**: Civil Engineering
- **ME**: Mechanical Engineering
- **EE**: Electrical Engineering
- **EEE**: Electrical & Electronics Engineering
- **ECE**: Electronics & Communication Engineering
- **CSE**: Computer Science & Engineering
- **CS-IT**: Computer Science and Information Technology
- **CSE-AIML**: CSE - Artificial Intelligence and Machine Learning
- **CSE-CS**: CSE - Cyber Security
- **CSE-DS**: CSE - Data Science
- **CSE-IOT**: CSE - Internet of Things

## Usage

1. Select the admission batch (year)
2. Choose your engineering stream
3. Select the semester
4. Navigate through curriculum images using the toolbar
5. Access additional files via the "Additional Files" button

## Technical Details

- Built with vanilla JavaScript (ES6+)
- CSS Grid and Flexbox for responsive layouts
- Service Worker for offline functionality
- Local Storage for session persistence
- Touch and gesture support for mobile devices
- Image preloading for smooth navigation 