from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import time
import os
import re
import uuid
from datetime import datetime
import threading

app = Flask(__name__)
CORS(app)

# Store for managing scan results
scan_results = {}
active_scans = {}

def validate_url(url):
    """Validate and sanitize URL input"""
    if not url:
        raise ValueError("URL é obrigatória")
    
    url = url.strip()
    if not (url.startswith('http://') or url.startswith('https://')):
        raise ValueError("URL deve começar com http:// ou https://")
    
    # Basic URL validation
    if not re.match(r'^https?://[a-zA-Z0-9.-]+.*', url):
        raise ValueError("Formato de URL inválido")
    
    # Security check - prevent internal network scanning
    internal_patterns = [
        r'localhost', r'127\.0\.0\.1', r'192\.168\.',
        r'10\.', r'172\.(1[6-9]|2[0-9]|3[0-1])\.'
    ]
    
    for pattern in internal_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError("Não é permitido escanear URLs internas/privadas")
    
    return url

def classify_severity(description):
    """Classify vulnerability severity based on description"""
    desc = description.lower()
    
    if any(keyword in desc for keyword in ['sql injection', 'remote code execution', 'shell', 'admin access']):
        return 'Critical'
    elif any(keyword in desc for keyword in ['xss', 'csrf', 'directory traversal', 'file inclusion']):
        return 'High'
    elif any(keyword in desc for keyword in ['information disclosure', 'server version', 'banner', 'config']):
        return 'Medium'
    else:
        return 'Low'

def parse_nikto_output(output, url, scan_id):
    """Parse Nikto output into structured format"""
    vulnerabilities = []
    lines = output.split('\n')
    
    vuln_count = 0
    for line in lines:
        # Parse Nikto findings (lines starting with +)
        if line.strip().startswith('+ ') and 'Target IP:' not in line and 'Start Time:' not in line:
            vuln_count += 1
            clean_line = line.strip()[2:]  # Remove '+ '
            
            # Extract URL if present in the finding
            finding_url = url
            if ': ' in clean_line:
                parts = clean_line.split(': ', 1)
                if len(parts) == 2 and parts[0].startswith('/'):
                    finding_url = url.rstrip('/') + parts[0]
                    clean_line = parts[1]
            
            vulnerabilities.append({
                'id': f'NIKTO-{vuln_count:03d}',
                'description': clean_line,
                'severity': classify_severity(clean_line),
                'url': finding_url,
                'evidence': line.strip(),
                'category': 'Web Vulnerability'
            })
    
    return vulnerabilities

def run_nikto_scan(url, scan_id):
    """Run Nikto scan in background thread"""
    try:
        active_scans[scan_id] = {
            'status': 'running',
            'start_time': time.time(),
            'url': url
        }
        
        # Nikto command
        cmd = [
            '/usr/local/bin/nikto',
            '-h', url,
            '-maxtime', '600',  # 10 minutes max
            '-timeout', '10',
            '-useragent', 'Nikto Security Scanner'
        ]
        
        # Run Nikto
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes timeout
        )
        
        # Parse results
        vulnerabilities = parse_nikto_output(process.stdout, url, scan_id)
        
        # Calculate duration
        duration = int((time.time() - active_scans[scan_id]['start_time']) * 1000)
        
        # Store results
        result = {
            'url': url,
            'scanId': scan_id,
            'status': 'completed',
            'vulnerabilities': vulnerabilities,
            'timestamp': datetime.now().isoformat(),
            'message': f'Nikto scan completed. Found {len(vulnerabilities)} potential issues.',
            'scanDuration': duration,
            'totalTests': len(vulnerabilities)
        }
        
        scan_results[scan_id] = result
        
        # Save to file
        report_file = f'/app/relatorios/nikto_scan_{scan_id}.json'
        with open(report_file, 'w') as f:
            json.dump(result, f, indent=2)
            
    except subprocess.TimeoutExpired:
        scan_results[scan_id] = {
            'url': url,
            'scanId': scan_id,
            'status': 'failed',
            'error': 'Scan timeout após 10 minutos',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        scan_results[scan_id] = {
            'url': url,
            'scanId': scan_id,
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
    finally:
        # Remove from active scans
        if scan_id in active_scans:
            del active_scans[scan_id]

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'nikto-scanner',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/scan', methods=['POST'])
def start_scan():
    """Start a new Nikto scan"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400
        
        # Validate URL
        url = validate_url(data.get('url'))
        
        # Generate scan ID
        scan_id = f"nikto_{int(time.time())}_{str(uuid.uuid4())[:8]}"
        
        # Start scan in background
        thread = threading.Thread(target=run_nikto_scan, args=(url, scan_id))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'scanId': scan_id,
            'status': 'started',
            'url': url,
            'message': 'Nikto scan iniciado',
            'timestamp': datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({
            'error': 'Validation error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 400
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/scan/<scan_id>', methods=['GET'])
def get_scan_result(scan_id):
    """Get scan result by ID"""
    try:
        # Check if scan is still running
        if scan_id in active_scans:
            return jsonify({
                'scanId': scan_id,
                'status': 'running',
                'url': active_scans[scan_id]['url'],
                'startTime': active_scans[scan_id]['start_time'],
                'message': 'Scan em andamento...',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check completed results
        if scan_id in scan_results:
            return jsonify(scan_results[scan_id])
        
        return jsonify({
            'error': 'Scan not found',
            'message': f'Scan ID {scan_id} não encontrado',
            'timestamp': datetime.now().isoformat()
        }), 404
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/scans', methods=['GET'])
def list_scans():
    """List all scans"""
    try:
        all_scans = {}
        
        # Add active scans
        for scan_id, scan_info in active_scans.items():
            all_scans[scan_id] = {
                'scanId': scan_id,
                'status': 'running',
                'url': scan_info['url'],
                'startTime': scan_info['start_time']
            }
        
        # Add completed scans
        for scan_id, result in scan_results.items():
            all_scans[scan_id] = {
                'scanId': scan_id,
                'status': result['status'],
                'url': result['url'],
                'timestamp': result['timestamp'],
                'vulnerabilityCount': len(result.get('vulnerabilities', []))
            }
        
        return jsonify({
            'scans': list(all_scans.values()),
            'total': len(all_scans),
            'active': len(active_scans),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/version', methods=['GET'])
def get_version():
    """Get Nikto version info"""
    try:
        result = subprocess.run(['/usr/local/bin/nikto', '-Version'], 
                              capture_output=True, text=True, timeout=10)
        
        return jsonify({
            'nikto_version': result.stdout.strip(),
            'service_version': '1.0.0',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Version check failed',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    # Ensure reports directory exists
    os.makedirs('/app/relatorios', exist_ok=True)
    
    print("Starting Nikto Scanner Service...")
    print("Health check: http://localhost:5000/health")
    print("Scan endpoint: POST http://localhost:5000/scan")
    
    app.run(host='0.0.0.0', port=5000, debug=False)