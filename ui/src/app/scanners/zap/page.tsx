"use client";
import Link from 'next/link';
import Navigation from '../../../components/Navigation';
import { useZapScan } from '../../../hooks/useZapScan';

export default function ZAPScannerPage() {
    const {
        url, setUrl, loading, progress, result, error,
        priority, setPriority,
        runScan, resetScan, scanStartTime, estimatedTimeRemaining
    } = useZapScan();

    // Helper functions for styling based on priority/risk
    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk.toLowerCase()) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Calculate elapsed time
    const getElapsedTime = () => {
        if (!scanStartTime) return null;
        const elapsed = Date.now() - scanStartTime.getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation currentPage="scanners" />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">ZAP Scanner</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Advanced web application security scanner powered by OWASP ZAP
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={resetScan}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Reset
                            </button>
                            <Link
                                href="/scanners"
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Back to Scanners
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="space-y-6">
                                {/* URL Input */}
                                <div>
                                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                                        Target URL
                                    </label>
                                    <input
                                        type="url"
                                        id="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        disabled={loading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                {/* Priority Selection */}
                                <div>
                                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                                        Scan Priority
                                    </label>
                                    <select
                                        id="priority"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        disabled={loading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="critical">Critical - Only High Risk + High Confidence</option>
                                        <option value="high">High - High & Medium Risk (exclude Low Confidence)</option>
                                        <option value="medium">Medium - All Risk Levels (exclude Low Confidence)</option>
                                        <option value="all">All - Show All Non-Informational</option>
                                    </select>
                                </div>

                                {/* Scan Button */}
                                <div>
                                    <button
                                        onClick={runScan}
                                        disabled={loading || !url.trim()}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Scanning...' : 'Start Scan'}
                                    </button>
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                                <div className="mt-2 text-sm text-red-700">{error}</div>
                                                {error.includes('timeout') && (
                                                    <div className="mt-2 text-xs text-red-600">
                                                        💡 <strong>Tip:</strong> Large scans may take longer than expected. Try with a smaller target or contact your administrator to increase timeout settings.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Progress Indicators */}
                                {loading && (
                                    <div className="space-y-4">
                                        {/* Timing Information */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-blue-800 font-medium">Scan Progress</span>
                                                <div className="flex space-x-4 text-blue-700">
                                                    {scanStartTime && (
                                                        <span>Elapsed: {getElapsedTime()}</span>
                                                    )}
                                                    {estimatedTimeRemaining && (
                                                        <span>Estimated: {estimatedTimeRemaining}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Spider Progress */}
                                        <div>
                                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                <span>Spider Progress (Crawling)</span>
                                                <span>{progress.spiderProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress.spiderProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Active Scan Progress */}
                                        <div>
                                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                <span>Active Scan Progress (Testing)</span>
                                                <span>{progress.activeProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress.activeProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Progress Tips */}
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-800">
                                                        <strong>Scan in Progress:</strong> Large websites may take several minutes to scan completely. The progress bars will update as the scan progresses.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Results Display */}
                                {result && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-gray-900">Scan Results</h3>
                                            <div className="text-sm text-gray-500">Priority: {result.summary.priority}</div>
                                        </div>

                                        {/* Summary Statistics */}
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-gray-900">{result.summary.total}</div>
                                                    <div className="text-sm text-gray-500">Total Alerts</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{result.summary.filtered}</div>
                                                    <div className="text-sm text-gray-500">Filtered</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">{result.summary.returned}</div>
                                                    <div className="text-sm text-gray-500">Returned</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-indigo-600">{result.summary.maxResults}</div>
                                                    <div className="text-sm text-gray-500">Max Results</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Risk Distribution */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Distribution</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {Object.entries(result.summary.byRisk).map(([risk, count]) => (
                                                    <div key={risk} className="text-center p-2 bg-gray-50 rounded">
                                                        <div className="text-lg font-semibold text-gray-900">{count}</div>
                                                        <div className="text-xs text-gray-500 capitalize">{risk}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Vulnerability List */}
                                        <div className="space-y-3">
                                            {result.alerts.map((vuln) => (
                                                <div key={vuln.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(vuln.priority)}`}>
                                                                    {vuln.priority}
                                                                </span>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(vuln.risk)}`}>
                                                                    {vuln.risk}
                                                                </span>
                                                                <span className="text-xs text-gray-500">Score: {vuln.riskScore}</span>
                                                            </div>
                                                            <h4 className="text-sm font-medium text-gray-900 mb-1">{vuln.title}</h4>
                                                            <p className="text-sm text-gray-600 mb-2">{vuln.description}</p>
                                                            {vuln.solution && (
                                                                <div className="mb-2">
                                                                    <span className="text-xs font-medium text-gray-700">Solution:</span>
                                                                    <p className="text-xs text-gray-600">{vuln.solution}</p>
                                                                </div>
                                                            )}
                                                            {vuln.evidence && (
                                                                <div className="mb-2">
                                                                    <span className="text-xs font-medium text-gray-700">Evidence:</span>
                                                                    <p className="text-xs text-gray-600 font-mono bg-gray-100 p-1 rounded">{vuln.evidence}</p>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                {vuln.cweid && <span>CWE: {vuln.cweid}</span>}
                                                                {vuln.wascid && <span>WASC: {vuln.wascid}</span>}
                                                                <span>URL: {vuln.url}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 text-xs text-gray-500 text-center">
                                            Scan completed at: {new Date(result.timestamp).toLocaleString()}
                                            {scanStartTime && (
                                                <span className="block mt-1">
                                                    Total scan time: {getElapsedTime()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
} 