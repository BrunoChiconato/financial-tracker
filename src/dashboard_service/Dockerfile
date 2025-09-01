FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/

RUN pip install --upgrade pip \
 && pip install uv \
 && uv pip install --system --no-cache ".[dashboard]"

COPY src/ /app/src/

CMD ["streamlit", "run", "src/dashboard_service/streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
