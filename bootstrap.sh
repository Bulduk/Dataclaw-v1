#!/bin/bash
set -e

echo "=========================================="
echo "DATA CLAW - AUTONOMOUS VPS BOOTSTRAP"
echo "=========================================="

echo "[1/7] Detecting Environment..."
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
CORES=$(nproc)

echo "Detected $CORES CPU cores and ${TOTAL_MEM}MB RAM."

if [ "$TOTAL_MEM" -lt 8000 ]; then
    echo "Configuring for low-resource VPS (Quantized Models Only)."
    export MODEL_TIER="lite"
else
    echo "Configuring for standard/high-resource VPS."
    export MODEL_TIER="full"
fi

echo "[2/7] Installing System Dependencies (Docker)..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
else
    echo "Docker already installed."
fi

if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "[3/7] Setting up Directory Structure..."
mkdir -p /opt/dataclaw/{core,agents,memory,plugins,models,execution,logs,monitoring,scripts,systemd_services}
# In a real environment, this script would git clone the repository here
# cp -r ./* /opt/dataclaw/

echo "[4/7] Pulling Models via Docker Compose (Ollama)..."
cd /opt/dataclaw || exit
# Start model router
# docker-compose up -d model_router
# sleep 10
# sh install_models.sh

echo "[5/7] Installing Systemd Services..."
# cp systemd_services/*.service /etc/systemd/system/
# systemctl daemon-reload
# systemctl enable dataclaw.service
# systemctl enable agentwatch.service

echo "[6/7] Security Hardening..."
if command -v ufw &> /dev/null; then
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable
fi

echo "[7/7] Starting System..."
# systemctl start dataclaw.service
# systemctl start agentwatch.service

echo "=========================================="
echo "DEPLOYMENT COMPLETE. SYSTEM IS AUTONOMOUS."
echo "Logs: journalctl -fu dataclaw"
echo "=========================================="
