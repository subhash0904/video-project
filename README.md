# Video Platform Project

## Overview
A scalable, production-ready video platform featuring video upload, streaming, search, notifications, and real-time features. Built with a modern microservices architecture and designed for cloud deployment.

---

## Tech Stack

### Frontend
- **React** (TypeScript)
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **ESLint** (linting)
- **Nginx** (static file serving in production)

### Backend
- **Node.js** (TypeScript)
- **Express.js** (API framework)
- **Prisma** (ORM)
- **Google OAuth, JWT** (authentication)
- **Kafka** (event-driven notifications)
- **OpenAPI** (API documentation)

### Database & Storage
- **PostgreSQL** (with read replicas)
- **Prisma Migrate** (migrations)
- **Redis** (with Sentinel for HA caching)
- **Local file system** (uploads/), extensible to cloud storage

### Streaming & Media
- **FFmpeg** (HLS, thumbnails, video processing)
- **HLS** (HTTP Live Streaming)
- **Nginx** (adaptive streaming, CDN/proxy)

### Messaging & Realtime
- **Kafka** (event streaming)
- **Custom Node.js service** (realtime-service/)

### DevOps & Infrastructure
- **Docker** (containerization)
- **Docker Compose** (multi-service orchestration)
- **GCP VM** (cloud deployment)
- **CI/CD** (user-defined, e.g., GitHub Actions)

### Miscellaneous
- **Shell, PowerShell, Node.js scripts** (deployment, seeding, verification)
- **OpenAPI YAML** (API specs)

---

## Features
- Video upload, processing, and adaptive streaming
- User authentication (Google OAuth, JWT)
- Real-time notifications and chat
- Search (videos, channels)
- Scalable microservices architecture
- Production-ready Docker and Compose setup
- GCP deployment support

---

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/subhash0904/video-project.git
   cd video-project
   ```
2. **Configure environment variables:**
   - Copy and edit `.env.example` files in each service (backend, frontend, etc.)
3. **Build and start services:**
   ```sh
   docker compose -f infra/docker-compose.production.yml up --build
   ```
4. **Seed the database:**
   ```sh
   docker compose exec backend node prisma/seed.ts
   ```
5. **Access the app:**
   - Frontend: http://localhost (or configured domain)
   - Backend API: http://localhost:4000

---

## Documentation
- See `TECH_STACK.md` for a detailed tech stack
- OpenAPI YAML files in `docs/` for API reference

---

## License
This project is for demonstration and educational purposes. Please review and update the license as needed for your use case.
