# ITER Curriculum Viewer

A fully offline curriculum viewer website for ITER students. This application works entirely from local files with no server, cloud, or database dependencies.

## Features

### 🎯 Smart Wizard Interface
- Fullscreen animated form wizard
- Progressive question flow (Stream → Year → Semester)
- Smooth scroll transitions with progress indicator
- Glassmorphism design with beige and teal color scheme

### 🖼️ Advanced Image Viewer
- Zoom in/out functionality with mouse/touch support
- Pan support for zoomed images
- Download curriculum images
- Multi-part curriculum support (automatic detection)
- Loading spinners for smooth transitions

### 🔁 Intelligent Session Management
- **localStorage** for session persistence
- Automatic restoration of last viewed curriculum
- Background path caching for improved performance
- Selective image preloading

### 📱 Responsive Design
- Mobile-first approach
- Touch-friendly controls
- Adaptive layout for all screen sizes
- Glassmorphism effects throughout

### ⚠️ Comprehensive Error Handling
- Animated popup notifications
- Offline support with Service Worker
- "Coming Soon" messages for missing curricula
- Graceful fallbacks for all error scenarios

## File Structure

```
iter-curriculum/
├── index.html          # Main application file
├── styles.css          # Glassmorphism styling
├── script.js           # Core application logic
├── sw.js              # Service Worker for offline support
├── README.md          # This file
└── images/            # Curriculum images
    └── {year}/        # e.g., 2024/
        ├── {stream}-sem{n}.webp        # Main curriculum
        ├── {stream}-sem{n}-1.webp      # Multi-part (if exists)
        ├── {stream}-sem{n}-2.webp      # Additional parts
        ├── {stream}-1.webp             # Additional resources
        └── {stream}-2.webp             # More resources
```

## Image Naming Convention

### Semester Curricula
- `{stream}-sem{semester}.webp` - Main curriculum
- `{stream}-sem{semester}-{part}.webp` - Multi-part curricula

### Additional Resources
- `{stream}-{number}.webp` - Additional study materials

### Examples
- `ce-sem1.webp` - Computer Engineering Semester 1
- `ce-sem2-1.webp` - CE Semester 2, Part 1
- `ce-sem2-2.webp` - CE Semester 2, Part 2
- `ce-1.webp` - CE Additional Resource 1

## Supported Streams

- **CE** - Computer Engineering
- **IT** - Information Technology  
- **CSE** - Computer Science Engineering
- **ECE** - Electronics & Communication Engineering
- **EEE** - Electrical & Electronics Engineering
- **ME** - Mechanical Engineering

## Quick Start

### Option 1: Local Development
1. Clone/download this repository
2. Add curriculum images to the `images/{year}/` folders
3. Open `index.html` in any modern web browser
4. No server required!

### Option 2: Static Hosting
1. Upload all files to any static hosting service
2. Access via the hosted URL
3. Works offline after first visit

### Option 3: Offline Distribution
1. Zip the entire folder
2. Distribute via USB/email
3. Users extract and open `index.html`
4. Full functionality without internet

## Browser Support

- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## Technical Details

### Storage
- **localStorage**: Session persistence
- **IndexedDB**: Future expansion capability
- **Service Worker**: Offline functionality
- **Memory Cache**: Runtime image preloading

### Performance
- Lazy loading for additional resources
- Progressive image caching
- Minimal DOM manipulation
- Optimized for low-end devices

### Security
- No external dependencies
- No data transmission
- Local-only operation
- Privacy-focused design

## Keyboard Shortcuts

When viewing curriculum:
- `←/→` - Navigate between image parts
- `+/-` - Zoom in/out
- `0` - Reset zoom
- `ESC` - Close additional panel

## Adding New Curricula

1. Create year folder: `images/2025/`
2. Add curriculum images following naming convention
3. Application automatically detects new images
4. No code changes required

## Customization

### Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-beige: #f7f3e9;
    --primary-teal: #4a9b9e;
    /* ... more variables */
}
```

### Streams
Add new streams in `script.js` and `index.html`:
```javascript
const streams = ['ce', 'it', 'cse', 'ece', 'eee', 'me', 'new-stream'];
```

## Troubleshooting

### Images not loading
1. Check file paths match naming convention
2. Ensure images are in correct year folder
3. Verify file extensions are `.webp`

### Session not saving
1. Enable localStorage in browser
2. Check for private/incognito mode
3. Clear browser cache if corrupted

### Offline issues
1. Visit site online first (for Service Worker)
2. Check browser Service Worker support
3. Manually cache important images

## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the repository
2. Add new features or curricula
3. Test thoroughly offline
4. Submit pull request

---

**Built for ITER students, by students** 🎓

*Fully offline • No dependencies • Privacy-focused*
