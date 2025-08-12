import Link from 'next/link';

interface NavigationProps {
    currentPage: 'dashboard' | 'scanners' | 'reports';
}

export default function Navigation({ currentPage }: NavigationProps) {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-3">
                            <h1 className="text-2xl font-bold text-gray-900">VulnUI</h1>
                            <p className="text-sm text-gray-500">Vulnerability Scanner Dashboard</p>
                        </div>
                    </div>
                    <nav className="flex space-x-8">
                        <Link
                            href="/"
                            className={`px-3 py-2 text-sm font-medium ${currentPage === 'dashboard'
                                    ? 'text-gray-900 hover:text-red-600'
                                    : 'text-gray-500 hover:text-red-600'
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/scanners"
                            className={`px-3 py-2 text-sm font-medium ${currentPage === 'scanners'
                                    ? 'text-gray-900 hover:text-red-600'
                                    : 'text-gray-500 hover:text-red-600'
                                }`}
                        >
                            Scanners
                        </Link>
                        <Link
                            href="/reports"
                            className={`px-3 py-2 text-sm font-medium ${currentPage === 'reports'
                                    ? 'text-gray-900 hover:text-red-600'
                                    : 'text-gray-500 hover:text-red-600'
                                }`}
                        >
                            Reports
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
} 