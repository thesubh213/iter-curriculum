const CONFIG = {
    years: [2020, 2021, 2022, 2023, 2024],
    
    streams: [
        {
            name: "Civil Engineering",
            shortCode: "ce",
            displayName: "Civil Engineering (CE)"
        },
        {
            name: "Computer Science and Engineering",
            shortCode: "cse",
            displayName: "Computer Science & Engineering (CSE)"
        },
        {
            name: "Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
            shortCode: "cse-aiml",
            displayName: "CSE (AI & ML)"
        },
        {
            name: "Computer Science and Engineering (Data Science)",
            shortCode: "cse-ds",
            displayName: "CSE (Data Science)"
        },
        {
            name: "Computer Science and Engineering (IoT)",
            shortCode: "cse-iot",
            displayName: "CSE (Internet of Things)"
        },
        {
            name: "Computer Science and Engineering (Cyber Security)",
            shortCode: "cse-cs",
            displayName: "CSE (Cyber Security)"
        },
        {
            name: "Computer Science and Information Technology",
            shortCode: "cs-it",
            displayName: "CS & IT"
        },
        {
            name: "Electronics and Communication Engineering",
            shortCode: "ece",
            displayName: "Electronics & Communication (ECE)"
        },
        {
            name: "Electrical Engineering",
            shortCode: "ee",
            displayName: "Electrical Engineering (EE)"
        },
        {
            name: "Electrical and Electronics Engineering",
            shortCode: "eee",
            displayName: "Electrical & Electronics (EEE)"
        },
        {
            name: "Mechanical Engineering",
            shortCode: "me",
            displayName: "Mechanical Engineering (ME)"
        }
    ],
    
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    
    getImagePath: function(year, streamCode, semester, part = null) {
        if (part) {
            return `images/${year}/${streamCode}/${streamCode}-sem${semester}-${part}.webp`;
        }
        return `images/${year}/${streamCode}/${streamCode}-sem${semester}.webp`;
    },
    
    getAdditionalResourcesPath: function(year, streamCode) {
        return `images/${year}/${streamCode}/others/`;
    }
};
