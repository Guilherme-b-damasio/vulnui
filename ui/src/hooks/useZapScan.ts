import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { config } from '../config/environment';

interface ScanProgress {
    spiderProgress: number;
    activeProgress: number;
}

interface Vulnerability {
    id: string;
    title: string;
    risk: string;
    confidence: string;
    riskScore: number;
    priority: string;
    url: string;
    description: string;
    solution: string;
    evidence: string;
    cweid: string;
    wascid: string;
}

interface ScanResult {
    summary: {
        total: number;
        filtered: number;
        returned: number;
        byRisk: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        priority: string;
        maxResults: number;
    };
    alerts: Vulnerability[];
    timestamp: string;
    message: string;
}

interface UseZapScanReturn {
    url: string;
    setUrl: (url: string) => void;
    loading: boolean;
    progress: ScanProgress;
    result: ScanResult | null;
    error: string | null;
    priority: string;
    setPriority: (priority: string) => void;
    runScan: () => Promise<void>;
    resetScan: () => void;
    scanStartTime: Date | null;
    estimatedTimeRemaining: string | null;
}

export const useZapScan = (): UseZapScanReturn => {
    const [url, setUrl] = useState("http://testphp.vulnweb.com/");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<ScanProgress>({ spiderProgress: 0, activeProgress: 0 });
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [priority, setPriority] = useState<string>('high');
    const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);

    // Refs for scan management
    const spiderScanIdRef = useRef<string | null>(null);
    const activeScanIdRef = useRef<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCheckingStatusRef = useRef<boolean>(false);
    const lastProgressUpdateRef = useRef<Date>(new Date());

    // Memoized API URL to prevent unnecessary re-renders
    const alertsApiUrl = useMemo(() => {
        return `/api/scanner/zap/alerts?url=${encodeURIComponent(url)}&priority=${priority}&maxResults=50`;
    }, [url, priority]);

    // Calculate estimated time remaining
    const calculateEstimatedTime = useCallback((currentProgress: number, startTime: Date) => {
        if (currentProgress === 0) return null;

        const elapsed = Date.now() - startTime.getTime();
        const estimatedTotal = (elapsed / currentProgress) * 100;
        const remaining = estimatedTotal - elapsed;

        if (remaining <= 0) return null;

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }, []);

    // Fetch alerts from ZAP with priority filtering
    const fetchAlerts = useCallback(async (targetUrl: string): Promise<ScanResult> => {
        try {
            const res = await fetch(alertsApiUrl);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('Error fetching alerts:', err);
            throw err;
        }
    }, [alertsApiUrl]);

    // Memoized scan API call
    const startScan = useCallback(async (): Promise<{ spiderScanId: string; activeScanId: string }> => {
        const res = await fetch(`/api/scanner/zap/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url.trim() }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to start scan');
        }

        return await res.json();
    }, [url]);

    // Memoized status check with request cancellation and timeout handling
    const checkScanStatus = useCallback(async (spiderScanId: string, activeScanId: string): Promise<{ spiderStatus: number; activeStatus: number }> => {
        // Prevent overlapping status checks
        if (isCheckingStatusRef.current) {
            throw new Error('Status check already in progress');
        }

        isCheckingStatusRef.current = true;

        try {
            // Create new AbortController for this request
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            // Add timeout for status check
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, config.scan.statusCheckTimeout);

            try {
                const statusRes = await fetch(
                    `/api/scanner/zap/status?spiderScanId=${spiderScanId}&activeScanId=${activeScanId}`,
                    { signal: abortController.signal }
                );

                clearTimeout(timeoutId);

                if (!statusRes.ok) {
                    throw new Error('Failed to fetch scan status');
                }

                const statusData = await statusRes.json();
                return {
                    spiderStatus: Number(statusData.spiderStatus),
                    activeStatus: Number(statusData.activeStatus)
                };
            } catch (err: any) {
                clearTimeout(timeoutId);
                throw err;
            }
        } finally {
            isCheckingStatusRef.current = false;
            abortControllerRef.current = null;
        }
    }, []);

    // Start ZAP scan
    const runScan = useCallback(async () => {
        if (!url.trim()) {
            setError("Please enter a URL");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);
            setProgress({ spiderProgress: 0, activeProgress: 0 });
            setScanStartTime(new Date());
            setEstimatedTimeRemaining(null);
            lastProgressUpdateRef.current = new Date();

            // Cancel any ongoing status checks
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Start the scan
            const { spiderScanId, activeScanId } = await startScan();
            spiderScanIdRef.current = spiderScanId;
            activeScanIdRef.current = activeScanId;

            // Start progress monitoring with proper interval management
            const startMonitoring = () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }

                intervalRef.current = setInterval(async () => {
                    if (!spiderScanIdRef.current || !activeScanIdRef.current) return;

                    try {
                        const { spiderStatus, activeStatus } = await checkScanStatus(
                            spiderScanIdRef.current,
                            activeScanIdRef.current
                        );

                        const now = new Date();
                        const timeSinceLastUpdate = now.getTime() - lastProgressUpdateRef.current.getTime();

                        // Only update if there's actual progress or significant time has passed
                        if (spiderStatus !== progress.spiderProgress ||
                            activeStatus !== progress.activeProgress ||
                            timeSinceLastUpdate > 5000) { // 5 seconds

                            setProgress({
                                spiderProgress: spiderStatus,
                                activeProgress: activeStatus
                            });

                            lastProgressUpdateRef.current = now;

                            // Calculate estimated time remaining
                            if (scanStartTime) {
                                const avgProgress = (spiderStatus + activeStatus) / 2;
                                const estimated = calculateEstimatedTime(avgProgress, scanStartTime);
                                setEstimatedTimeRemaining(estimated);
                            }
                        }

                        // Check if both scans are complete
                        if (spiderStatus === 100 && activeStatus === 100) {
                            // Clean up monitoring
                            if (intervalRef.current) {
                                clearInterval(intervalRef.current);
                                intervalRef.current = null;
                            }

                            spiderScanIdRef.current = null;
                            activeScanIdRef.current = null;
                            setLoading(false);
                            setEstimatedTimeRemaining(null);

                            // Fetch and display results with priority filtering
                            const scanResult = await fetchAlerts(url);
                            setResult(scanResult);
                        }
                    } catch (err: any) {
                        // Handle abort errors gracefully
                        if (err.name === 'AbortError') {
                            console.log('Status check was cancelled');
                            return;
                        }

                        console.error('Error monitoring scan progress:', err);

                        // Clean up on error
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }

                        spiderScanIdRef.current = null;
                        activeScanIdRef.current = null;
                        setLoading(false);
                        setError(`Error monitoring scan progress: ${err.message}`);
                        setEstimatedTimeRemaining(null);
                    }
                }, config.scan.progressUpdateInterval);

                // Add timeout for entire scan
                const scanTimeout = setTimeout(() => {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    setLoading(false);
                    setError('Scan timed out. Large scans may take longer than expected. Please try with a smaller target or increase timeout settings.');
                    setEstimatedTimeRemaining(null);
                }, config.scan.maxScanDuration);

                // Cleanup timeout when scan completes
                if (spiderScanIdRef.current && activeScanIdRef.current) {
                    const cleanup = () => {
                        clearTimeout(scanTimeout);
                    };
                    // This will be called when scan completes or errors
                    return cleanup;
                }
            };

            startMonitoring();

        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'Unknown error occurred');
            setEstimatedTimeRemaining(null);
            console.error('Scan error:', err);
        }
    }, [url, startScan, checkScanStatus, fetchAlerts, progress, scanStartTime, calculateEstimatedTime]);

    // Reset scan state
    const resetScan = useCallback(() => {
        // Cancel any ongoing requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Reset refs
        spiderScanIdRef.current = null;
        activeScanIdRef.current = null;
        abortControllerRef.current = null;
        isCheckingStatusRef.current = false;

        // Reset state
        setLoading(false);
        setProgress({ spiderProgress: 0, activeProgress: 0 });
        setResult(null);
        setError(null);
        setScanStartTime(null);
        setEstimatedTimeRemaining(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        url,
        setUrl,
        loading,
        progress,
        result,
        error,
        priority,
        setPriority,
        runScan,
        resetScan,
        scanStartTime,
        estimatedTimeRemaining,
    };
}; 