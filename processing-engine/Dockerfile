From python:3.11-slim
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN sed '/win10toast/d' requirements.txt > requirements-linux.txt && \
    pip install --no-cache-dir -r requirements-linux.txt
COPY . .
EXPOSE 12040
CMD ["python", "api.py"]