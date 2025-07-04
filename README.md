# ITER Curriculum Viewer

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/thesubh213/iter-curriculum)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/thesubh213/iter-curriculum/pulls)

*A modern, responsive web application for viewing semester-wise curriculum documents for engineering streams at ITER*

[🚀 Live Demo](https://iter-curriculum.pages.dev) • [📋 Features](#features) • [🛠️ Installation](#installation) • [📖 Documentation](#documentation)

</div>

## 📋 Overview

ITER Curriculum Viewer is a sophisticated Progressive Web Application (PWA) designed to provide seamless access to curriculum documents across multiple engineering streams. Built with modern web technologies and featuring an elegant glass-morphism design, the application offers an intuitive interface for students and faculty to browse semester-wise academic content.

### ✨ Key Highlights

- **🎯 Multi-Stream Support**: Comprehensive coverage of 11+ engineering disciplines
- **📱 Mobile-First Design**: Optimized for all device sizes with touch-friendly interactions
- **⚡ High Performance**: Smart caching and progressive loading for optimal user experience
- **🎨 Modern UI/UX**: Glass-morphism design with accessibility-first approach
- **🔄 PWA Ready**: Offline support with intelligent caching strategies

## 🚀 Features

### Core Functionality
- **📅 Multi-Year Support**: Academic years 2020-2024 with expandable configuration
- **🏗️ Complete Stream Coverage**: 11 engineering streams with intuitive navigation
- **📚 Comprehensive Semester Navigation**: Semesters 1-8 with part-based document viewing
- **🖼️ Advanced Image Viewer**: High-quality viewer with zoom and external opening capabilities

### User Experience
- **🔄 Smart Session Management**: Automatic restoration of user preferences
- **📱 Responsive Design**: Mobile-first approach with comprehensive breakpoints
- **⚡ Progressive Loading**: Real-time progress indicators and smooth animations
- **🎯 Intuitive Navigation**: Context-aware back navigation and selection management

### Technical Features
- **💾 Intelligent Caching**: Memory-efficient image caching with automatic cleanup
- **🔄 Background Sync**: Service worker for offline functionality
- **♿ Accessibility Compliant**: WCAG guidelines with keyboard navigation
- **🎨 Touch Optimized**: Enhanced touch targets for mobile devices

## 🛠️ Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/thesubh213/iter-curriculum.git
   cd iter-curriculum
   ```

2. **Serve locally**
   ```bash
   # Using Python (recommended)
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Access the application**
   ```
   http://localhost:8000
   ```

### Deployment

The application is deployment-ready for any static hosting service:

- **Cloudflare Pages**: Recommended for optimal performance
- **Netlify**: Simple drag-and-drop deployment
- **Vercel**: Automatic deployments from Git
- **GitHub Pages**: Free hosting for public repositories

## 📁 Project Structure

```
iter-curriculum/
├── 📄 index.html              # Main application entry point
├── 🎨 sundarta.css            # Comprehensive stylesheet with responsive design
├── ⚡ karm.js                 # Core application logic and interactions
├── ⚙️ config.js               # Configuration for streams and constants
├── 🔧 service-worker.js       # PWA service worker for caching
├── 📱 manifest.json           # PWA manifest configuration
├── 🗂️ images/                 # Organized curriculum documents
│   └── 📅 [year]/
│       └── 🏗️ [stream-code]/
│           ├── 📄 [stream]-sem[number].webp
│           ├── 📄 [stream]-sem[number]-[part].webp
│           └── 📁 others/
│               └── 📄 [additional-files].webp
└── 📚 README.md               # Project documentation
```

## 🏗️ Engineering Streams

| Stream Code | Full Name | Semesters |
|-------------|-----------|-----------|
| `ce` | Civil Engineering | 1-8 |
| `cse` | Computer Science & Engineering | 1-8 |
| `cse-aiml` | CSE (Artificial Intelligence & Machine Learning) | 1-8 |
| `cse-ds` | CSE (Data Science) | 1-8 |
| `cse-iot` | CSE (Internet of Things) | 1-8 |
| `cse-cs` | CSE (Cyber Security) | 1-8 |
| `cs-it` | Computer Science & Information Technology | 1-8 |
| `ece` | Electronics & Communication Engineering | 1-8 |
| `ee` | Electrical Engineering | 1-8 |
| `eee` | Electrical & Electronics Engineering | 1-8 |
| `me` | Mechanical Engineering | 1-8 |

## 📖 Documentation

### Image Naming Convention

The application follows a structured naming convention for optimal organization:

- **Single Document**: `[stream-code]-sem[semester].webp`
  - Example: `cse-sem1.webp`
- **Multi-Part Documents**: `[stream-code]-sem[semester]-[part].webp`
  - Example: `cse-sem2-1.webp`, `cse-sem2-2.webp`
- **Additional Resources**: `images/[year]/[stream-code]/others/[filename].webp`
  - Example: `images/2024/cse/others/syllabus.webp`

### Configuration

The `config.js` file contains all configurable options:

```javascript
const CONFIG = {
    years: ['2024', '2023', '2022', '2021', '2020'],
    streams: {
        'cse': 'Computer Science & Engineering',
        'ce': 'Civil Engineering',
    },
    imageFormat: 'webp',
    cachingEnabled: true
};
```

### Caching Strategy

The application implements an intelligent caching system:

- **Smart Caching**: Only active semester images are cached
- **Memory Management**: Automatic cleanup of unused cache entries
- **Session Persistence**: User preferences saved across sessions
- **Offline Support**: Previously viewed content accessible offline
- **Progressive Loading**: Real-time progress indicators during load

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** and ensure they follow the coding standards
4. **Test thoroughly** across different devices and browsers
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Test your changes on multiple browsers and devices
- Update documentation if needed
- Ensure responsive design principles are maintained
- Add comments for complex logic

### Areas for Contribution

- 🐛 Bug fixes and performance improvements
- 📱 Mobile experience enhancements
- ♿ Accessibility improvements
- 🎨 UI/UX design refinements
- 📚 Documentation updates
- 🧪 Test coverage expansion

## 🔧 Technical Specifications

### Frontend Stack
- **Languages**: HTML5, CSS3, JavaScript (ES6+)
- **Design System**: Glass-morphism with sage green color palette
- **Responsive Framework**: Mobile-first CSS Grid and Flexbox
- **Icons**: Custom SVG icon set

### Performance & Optimization
- **Caching**: Service Worker with intelligent cache management
- **Loading**: Progressive image loading with WebP format
- **Optimization**: Minified assets and optimized delivery
- **PWA Features**: Offline support and app-like experience

### Browser Support
- **Modern Browsers**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 70+
- **Requirements**: ES6+ support, Service Worker compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ITER**: For providing the educational content and inspiration
- **Contributors**: Koi nhi hai bhaiii 


## 📞 Support

Need help or have questions?

- 📧 **Email**: [thesubh213@gmail.com](mailto:thesubh213@gmail.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/thesubh213/iter-curriculum/issues)

---

<div align="center">

**Made with ❤️ for the ITER community**

⭐ Star this repository if it helped you!

</div>
