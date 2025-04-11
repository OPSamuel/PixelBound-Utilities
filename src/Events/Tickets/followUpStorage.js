const fs = require('fs');
const path = require('path');

// Define storage path
const STORAGE_PATH = path.join(__dirname, '..', '..', 'data', 'Backups', 'followup_progress.json');

// Initialize storage system
function initializeStorage() {
    try {
        // Create directory structure if needed
        const dir = path.dirname(STORAGE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            //console.log(`Created directory: ${dir}`);
        }

        // Initialize empty JSON file if needed
        if (!fs.existsSync(STORAGE_PATH)) {
            fs.writeFileSync(STORAGE_PATH, '{}');
            //console.log(`Created storage file: ${STORAGE_PATH}`);
        }

        // Verify file is accessible
        fs.accessSync(STORAGE_PATH, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
        //console.error('Storage initialization failed:', error);
        throw error;
    }
}

// Save user progress
function saveProgress(userId, progressData) {
    try {
        initializeStorage();
        
        const currentData = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
        currentData[userId] = progressData;
        
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(currentData, null, 2));
        //console.log(`Progress saved for user ${userId}`);
        return true;
    } catch (error) {
        //console.error(`Failed to save progress for user ${userId}:`, error);
        return false;
    }
}

// Get user progress
function getProgress(userId) {
    try {
        initializeStorage();
        
        const currentData = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
        //console.log(`Fetching progress for ${userId}. Current keys:`, Object.keys(currentData));
        return currentData[userId] || null;
    } catch (error) {
        console.error(`Failed to get progress for user ${userId}:`, error);
        return null;
    }
}

// Delete user progress
function deleteProgress(userId) {
    try {
        initializeStorage();
        
        const currentData = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
        if (currentData[userId]) {
            delete currentData[userId];
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(currentData, null, 2));
            //console.log(`Progress deleted for user ${userId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Failed to delete progress for user ${userId}:`, error);
        return false;
    }
}

// Get all progress data (for debugging)
function getAllProgress() {
    try {
        initializeStorage();
        return JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
    } catch (error) {
        console.error('Failed to get all progress:', error);
        return {};
    }
}

// Initialize on startup
initializeStorage();

module.exports = {
    saveProgress,
    getProgress,
    deleteProgress,
    getAllProgress,
    STORAGE_PATH // Export for debugging
};