# Use the official, lightweight Python image
FROM python:3.10-slim

# Set environment variables for production optimization
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disk
# PYTHONUNBUFFERED: Ensures that Python output is logged directly to the terminal without buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the project files into the container
# Maintaining the existing project structure as requested
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Expose the port that the FastAPI backend runs on
EXPOSE 8000

# Command to run the application using Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]