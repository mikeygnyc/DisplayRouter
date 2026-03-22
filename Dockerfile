FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY router ./router
COPY shared ./shared
COPY display ./display
COPY admin ./admin
COPY rgbmatrix ./rgbmatrix
COPY scripts ./scripts

EXPOSE 8000

CMD ["uvicorn", "router.main:app", "--host", "0.0.0.0", "--port", "8000"]
