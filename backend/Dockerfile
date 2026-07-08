FROM python:3.13.5-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip3 install -r requirements.txt

COPY app ./app

COPY chroma_db ./chroma_db

EXPOSE 8000
HEALTHCHECK CMD curl --fail http://localhost:8000/api/health || exit 1
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
