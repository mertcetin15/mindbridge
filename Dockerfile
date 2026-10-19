FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home --uid 10001 mindbridge
COPY backend ./backend
COPY migrations ./migrations
COPY frontend ./frontend
COPY alembic.ini build_frontend.py run.py serve.py ./
RUN python build_frontend.py && mkdir -p data && chown -R mindbridge:mindbridge /app
USER mindbridge
EXPOSE 8000
CMD ["python", "serve.py"]
