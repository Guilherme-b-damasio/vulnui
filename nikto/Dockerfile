# ./nikto/Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    perl \
    libnet-ssleay-perl \
    openssl \
    libauthen-pam-perl \
    libio-pty-perl \
    apt-utils \
    unzip \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Download and install Nikto
RUN wget https://github.com/sullo/nikto/archive/master.zip \
    && unzip master.zip \
    && mv nikto-master nikto \
    && rm master.zip \
    && chmod +x /app/nikto/program/nikto.pl

# Create symbolic link for easy access
RUN ln -s /app/nikto/program/nikto.pl /usr/local/bin/nikto

# Install Flask for API
RUN pip install flask flask-cors requests

# Create reports directory
RUN mkdir -p /app/relatorios

# Copy Python API server
COPY nikto_server.py /app/
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install -r requirements.txt

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the Flask server
CMD ["python", "nikto_server.py"]