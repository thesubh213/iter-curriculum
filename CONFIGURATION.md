# ITER Curriculum Configuration

## Quick Configuration

Edit `config.js` to customize the missing folder popup behavior.

## Basic Settings

```javascript
window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        enabled: true,
        showPopup: true,
        popupDuration: 3000,
        defaultMessage: "This curriculum will be added soon! 📚"
    }
};
```

## Custom Messages

```javascript
customMessages: {
    missingYear: "Curriculum for batch {year} will be added soon! 📚",
    missingStream: "{stream} curriculum for batch {year} will be added soon! 📚",
    missingSemester: "{stream} Semester {semester} for batch {year} will be added soon! 📚"
}
```

**Placeholders:**
- `{year}` - Selected batch year
- `{stream}` - Full stream name
- `{semester}` - Selected semester number

## Supported Years and Streams

```javascript
supportedYears: ['2024', '2023', '2022', '2021', '2020'],
supportedStreams: ['ce', 'me', 'ee', 'eee', 'ece', 'cse', 'cs-it', 'cse-aiml', 'cse-cs', 'cse-ds', 'cse-iot']
```

## Examples

### Disable Popup
```javascript
window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        enabled: false
    }
};
```

### Change Duration
```javascript
window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        popupDuration: 5000
    }
};
```

### Custom Messages
```javascript
window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        customMessages: {
            missingYear: "Batch {year} curriculum is under development! 🚧",
            missingStream: "The {stream} program for {year} is coming soon! ⏳",
            missingSemester: "Semester {semester} for {stream} ({year}) is in progress! 📖"
        }
    }
};
```

### Add New Years
```javascript
window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        supportedYears: ['2025', '2024', '2023', '2022', '2021', '2020']
    }
};
```
