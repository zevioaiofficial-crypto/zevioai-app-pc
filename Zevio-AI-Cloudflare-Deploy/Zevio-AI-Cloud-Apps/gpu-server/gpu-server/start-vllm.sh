#!/usr/bin/env bash
# Zevio AI - GPU vLLM Inference Startup Script
# Supports: Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-Coder-7B-Instruct, Qwen/Qwen2.5-Math-7B-Instruct

set -e

MODEL_NAME=${1:-"Qwen/Qwen2.5-7B-Instruct"}
PORT=${2:-8000}
GPU_MEM_UTIL=${3:-0.90}
MAX_LEN=${4:-16384}

echo "=========================================================="
echo " Starting Zevio AI Self-Hosted vLLM Inference Engine"
echo " Model:          ${MODEL_NAME}"
echo " Port:           ${PORT}"
echo " Max Context:    ${MAX_LEN}"
echo " GPU Memory:     ${GPU_MEM_UTIL}"
echo "=========================================================="

# Check for NVIDIA GPU
if ! command -v nvidia-smi &> /dev/null; then
    echo "Warning: nvidia-smi not detected. Ensure an NVIDIA GPU and drivers are installed."
else
    echo "Detected GPU Information:"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
fi

# Launch vLLM OpenAI-compatible server
python3 -m vllm.entrypoints.openai.api_server \
    --model "${MODEL_NAME}" \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --trust-remote-code \
    --max-model-len "${MAX_LEN}" \
    --gpu-memory-utilization "${GPU_MEM_UTIL}" \
    --dtype auto \
    --served-model-name "${MODEL_NAME}"

