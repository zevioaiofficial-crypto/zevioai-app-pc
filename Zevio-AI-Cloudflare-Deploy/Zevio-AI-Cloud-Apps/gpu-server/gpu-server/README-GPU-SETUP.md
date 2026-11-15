# Zevio AI – Self-Hosted GPU Server Setup Guide (vLLM + Qwen)

This guide explains how to deploy and run self-hosted open-source AI models (Qwen 2.5) on a GPU Cloud server (RunPod, Vast.ai, Lambda Labs, AWS, or your local NVIDIA GPU machine).

---

## 1. Hardware Requirements

| Model | Recommended GPU | Minimum VRAM | Quantization |
| :--- | :--- | :--- | :--- |
| **Qwen/Qwen2.5-7B-Instruct** | RTX 3090 / 4090 / A5000 / A10G | 16 GB | FP16 / BF16 |
| **Qwen/Qwen2.5-Coder-7B-Instruct** | RTX 3090 / 4090 / A5000 | 16 GB | FP16 / BF16 |
| **Qwen/Qwen2.5-Math-7B-Instruct** | RTX 3090 / 4090 / A5000 | 16 GB | FP16 / BF16 |
| **Qwen/Qwen2.5-14B-Instruct** | RTX 4090 (24GB) / A100 (40GB) | 24 GB | AWQ / BF16 |
| **Qwen/Qwen2.5-72B-Instruct** | 2x A100 (80GB) or 4x RTX 4090 | 80 GB+ | AWQ / GPTQ |

---

## 2. Option A: Run via Docker (Recommended)

1. Ensure the NVIDIA Container Toolkit is installed on your Linux machine:
```bash
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

2. Run the Zevio Docker Compose service:
```bash
cd Zevio-AI/gpu-server
docker compose up -d
```

3. Check logs to verify model initialization:
```bash
docker logs -f zevio-vllm-inference
```

When you see `Uvicorn running on http://0.0.0.0:8000`, the inference engine is live.

---

## 3. Option B: Run via Python Virtual Environment

1. Create and activate a Python 3.10+ environment:
```bash
python3 -m venv vllm-env
source vllm-env/bin/activate
```

2. Install vLLM:
```bash
pip install --upgrade pip
pip install vllm
```

3. Start the inference engine:
```bash
chmod +x start-vllm.sh
./start-vllm.sh Qwen/Qwen2.5-7B-Instruct 8000 0.90 16384
```

---

## 4. Connecting Zevio Backend to Your GPU Server

1. Open `Zevio-AI/backend/.env`.
2. Set `VLLM_BASE_URL` to your GPU server address:
```env
# If local:
VLLM_BASE_URL=http://localhost:8000/v1

# If RunPod / Cloud GPU:
VLLM_BASE_URL=https://<your-pod-id>-8000.proxy.runpod.net/v1
```
3. Restart the Zevio AI backend server. The `/api/health` endpoint will report `isOnline: true`.

