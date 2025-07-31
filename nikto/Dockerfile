FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    wget curl git perl \
    libnet-ssleay-perl libio-socket-ssl-perl \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/sullo/nikto.git /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto && chmod +x /opt/nikto/program/nikto.pl

RUN pip install flask flask-cors

RUN mkdir -p /app/relatorios && chmod 777 /app/relatorios

WORKDIR /app

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
