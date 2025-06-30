window.ITER_CURRICULUM_CONFIG = {
    missingFolder: {
        enabled: true,
        showPopup: true,
        popupDuration: 3000,
        defaultMessage: "This curriculum will be added soon! 📚",
        customMessages: {
            missingYear: "Curriculum for batch {year} will be added soon! 📚",
            missingStream: "{stream} curriculum for batch {year} will be added soon! 📚",
            missingSemester: "{stream} Semester {semester} for batch {year} will be added soon! 📚"
        },
        supportedYears: ['2024', '2023', '2022', '2021', '2020'],
        supportedStreams: ['ce', 'me', 'ee', 'eee', 'ece', 'cse', 'cs-it', 'cse-aiml', 'cse-cs', 'cse-ds', 'cse-iot']
    },
    app: {
        maxCacheSize: 50,
        loadingTimeout: 10000,
        retryAttempts: 3
    }
}; 