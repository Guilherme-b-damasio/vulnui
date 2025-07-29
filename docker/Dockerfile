FROM python:3.11-slim

# Instala dependências básicas para Nikto e seu código Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    wget curl git perl \
    libnet-ssleay-perl libio-socket-ssl-perl \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instala Nikto
RUN git clone https://github.com/sullo/nikto.git /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto && chmod +x /opt/nikto/program/nikto.pl

RUN mkdir -p /app/relatorios && chmod 777 /app/relatorios

EXPOSE 5000
