"use client";
import { useState } from "react";
import Link from 'next/link';
import Navigation from '../../../components/Navigation';

export default function NiktoScannerPage() {
    const [url, setUrl] = useState("http://testphp.vulnweb.com/");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);

    const runScan = async () => {
        if (!url) return alert("Please enter a URL");
        setLoading(true);
        setResult("");

        try {
            const res = await fetch(`/api/scanner/nikto`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (err) {
            if (err instanceof Error) setResult(`Error: ${err.message}`);
            else setResult("Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation currentPage="scanners" />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="px-4 py-6 sm:px-0">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                                Nikto Scanner
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Web server vulnerability scanner for comprehensive security testing
                            </p>
                        </div>
                        <div className="mt-4 flex md:ml-4 md:mt-0">
                            <Link
                                href="/scanners"
                                className="ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                                Back to Scanners
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Scanner Interface */}
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="space-y-6">
                                {/* URL Input */}
                                <div>
                                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                                        Target URL
                                    </label>
                                    <input
                                        type="text"
                                        id="url"
                                        placeholder="Enter target URL (e.g., http://testphp.vulnweb.com)"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                    />
                                </div>

                                {/* Scan Button */}
                                <div>
                                    <button
                                        onClick={runScan}
                                        disabled={loading}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Scanning...' : 'Start Nikto Scan'}
                                    </button>
                                </div>

                                {/* Loading State */}
                                {loading && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center justify-center py-8">
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                                                <span className="text-gray-600">Running Nikto scan...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Results */}
                                {result && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Results</h3>
                                        <div className="bg-gray-900 rounded-lg p-4">
                                            <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                                                {result}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Section */}
                <div className="px-4 py-6 sm:px-0 mt-8">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">About Nikto</h3>
                            <div className="prose prose-sm text-gray-600">
                                <p className="mb-3">
                                    Nikto is an Open Source web server scanner which performs comprehensive tests against web servers for multiple items including:
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Dangerous files and CGIs</li>
                                    <li>Outdated server software</li>
                                    <li>Server configuration problems</li>
                                    <li>Default files and installations</li>
                                    <li>Information disclosure vulnerabilities</li>
                                </ul>
                                <p className="mt-3 text-sm text-gray-500">
                                    Nikto is not designed as an intrusive scanner, but rather a comprehensive web server scanner that checks for known problems.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
} 