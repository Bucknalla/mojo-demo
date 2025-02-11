// Battery chemistry definitions and configurations
const batteryRanges = {
    'lipo': {
        min: 3.2,
        max: 4.6,
        color: '#3b82f6',  // Blue
        levels: {
            usb: 4.6,
            high: 4.0,
            normal: 3.5,
            low: 3.2,
            dead: 0
        }
    },
    'l91': {
        min: 4.5,
        max: 5.0,
        color: '#8b5cf6',  // Purple
        levels: {
            high: 5.0,
            normal: 4.5,
            low: 0
        }
    },
    'alkaline': {
        min: 3.6,
        max: 4.6,
        color: '#10b981',  // Green
        levels: {
            usb: 4.6,
            high: 4.2,
            normal: 3.6,
            low: 0
        }
    },
    'tad': {
        min: 3.2,
        max: 4.6,
        color: '#f59e0b',  // Amber
        levels: {
            usb: 4.6,
            normal: 3.2,
            low: 0
        }
    },
    'lic': {
        min: 3.1,
        max: 4.6,
        color: '#ef4444',  // Red
        levels: {
            usb: 4.6,
            high: 3.8,
            normal: 3.1,
            low: 0
        }
    },
    'default': {
        min: 2.5,
        max: 2.5,
        color: '#6b7280',  // Gray
        levels: {
            normal: 2.5,
            dead: 0
        }
    }
};

// Export the configuration
export { batteryRanges };
