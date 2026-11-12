FROM python:3.12-slim

WORKDIR /app

# CPU-only torch keeps the image far smaller than the default CUDA build.
RUN pip install --no-cache-dir laya --extra-index-url https://download.pytorch.org/whl/cpu

COPY server.py .

# Reachable from the other containers. Checkpoints download into the cached volume on first start.
ENV HOST=0.0.0.0 PORT=8100
EXPOSE 8100
CMD ["python", "server.py"]
