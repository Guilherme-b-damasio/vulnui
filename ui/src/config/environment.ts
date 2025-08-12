// Environment configuration for VulnUI
export const config = {
    // ZAP Configuration
    zap: {
        baseUrl: process.env.ZAP_BASE_URL || 'http://host.docker.internal:8080',
        timeout: 120000, // 2 minutes - increased for ZAP operations
        retryAttempts: 3,
        longOperationTimeout: 300000, // 5 minutes for long operations
    },

    // Application Configuration
    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'VulnUI',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    },

    // API Configuration
    api: {
        timeout: 60000, // 1 minute for API calls
        maxRetries: 3,
        longOperationTimeout: 300000, // 5 minutes for long operations
    },

    // Scan Configuration
    scan: {
        defaultTimeout: 600000, // 10 minutes - increased for complete scans
        maxConcurrentScans: 3,
        progressUpdateInterval: 2000, // 2 seconds - reduced frequency
        statusCheckTimeout: 30000, // 30 seconds for status checks
        maxScanDuration: 1800000, // 30 minutes max scan duration
    }
};

// Helper function to get ZAP URL based on environment
export const getZapBaseUrl = (): string => {
    if (process.env.NODE_ENV === 'production') {
        return process.env.ZAP_BASE_URL || 'http://localhost:8080';
    }

    // Development/Docker environment
    return process.env.ZAP_BASE_URL || 'http://host.docker.internal:8080';
};

// Validate configuration
export const validateConfig = (): void => {
    const requiredEnvVars: string[] = [];

    if (requiredEnvVars.some(envVar => !process.env[envVar])) {
        console.warn('Some environment variables are not set. Using defaults.');
    }
}; 