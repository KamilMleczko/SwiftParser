# Swift Codes Project Setup Guide

## Prerequisites
Ensure you have the following installed on your system:
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

### 1. Clone the Repository
```sh
git clone <your-repo-url>
cd <your-project-folder>
```

### 2. Start the Application with Docker
Build and run the containers using Docker Compose:
```sh
docker-compose up --build
```
This will build the necessary images and start the services defined in `docker-compose.yml`.

It will also immidietly start the server on port 8080

### 3. Running Tests
Once the container is up and running, execute the following command to run tests inside the `app` container:
```sh
docker-compose exec app npx jest
```
This runs the test suite using Jest.

## Stopping the Application
To stop and remove the running containers, use:
```sh
docker-compose down
```

## Notes
- Modify `docker-compose.yml` if you need to customize ports, volumes, or other settings.

---

