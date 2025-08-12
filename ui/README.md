# VulnUI - Vulnerability Scanner Dashboard

A modern, comprehensive vulnerability scanning platform built with Next.js 15 and Tailwind CSS 4.

## Features

### 🏠 Dashboard
- Overview of all scanning activities
- Quick access to scanners
- Real-time statistics and metrics
- Recent activity monitoring

### 🔍 Scanners
- **OWASP ZAP Scanner**: Comprehensive web application vulnerability scanner
  - Spider crawling for site discovery
  - Active scanning for vulnerability detection
  - Real-time progress tracking
  - Detailed results display

- **Nikto Scanner**: Web server vulnerability scanner
  - Server fingerprinting
  - Known vulnerability detection
  - Configuration issue identification
  - Fast scanning capabilities

### 📊 Reports
- Comprehensive scan result management
- Historical scan data
- Vulnerability statistics
- Export functionality
- Risk level categorization

## Project Structure

```
ui/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── page.tsx           # Dashboard (Home)
│   │   ├── scanners/          # Scanner pages
│   │   │   ├── page.tsx       # Scanners overview
│   │   │   ├── zap/           # ZAP scanner
│   │   │   │   └── page.tsx   # ZAP scanner interface
│   │   │   └── nikto/         # Nikto scanner
│   │   │       └── page.tsx   # Nikto scanner interface
│   │   └── reports/           # Reports section
│   │       └── page.tsx       # Reports and statistics
│   ├── components/             # Reusable components
│   │   └── Navigation.tsx     # Shared navigation header
│   └── api/                   # API routes (existing)
│       └── scanner/           # Scanner API endpoints
├── public/                     # Static assets
└── package.json               # Dependencies
```

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Icons**: Heroicons (SVG)
- **State Management**: React Hooks

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Integration

The frontend integrates with existing backend APIs:

- **ZAP Scanner**: `/api/scanner/zap/*`
- **Nikto Scanner**: `/api/scanner/nikto`
- **Scan Status**: Real-time progress tracking
- **Results**: Vulnerability data and alerts

## Design Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, professional interface
- **Navigation**: Consistent header across all pages
- **Progress Tracking**: Real-time scan progress indicators
- **Data Visualization**: Statistics and metrics display

## Future Enhancements

- [ ] Additional scanner integrations
- [ ] Advanced reporting and analytics
- [ ] User authentication and management
- [ ] Scan scheduling and automation
- [ ] Custom scan configurations
- [ ] Integration with CI/CD pipelines

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the VulnUI vulnerability scanning platform.
