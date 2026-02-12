# Tech Stack Overview

## Frontend
- **Framework:** React (with TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Linting:** ESLint
- **Web Server:** Nginx (for static file serving in production)

## Backend
- **Runtime:** Node.js (with TypeScript)
- **Framework:** Express.js
- **ORM:** Prisma
- **Authentication:** Google OAuth, JWT
- **Notification System:** Event-driven (Kafka)
- **API Documentation:** OpenAPI (YAML files in docs/)

## Database & Storage
- **Primary Database:** PostgreSQL (with read replicas for scaling)
- **ORM Migration:** Prisma Migrate
- **Caching:** Redis (with Sentinel for high availability)
- **Object Storage:** Local file system (uploads/), can be extended to cloud storage

## Streaming & Media
- **Video Processing:** FFmpeg (for HLS, thumbnails, etc.)
- **Streaming Protocol:** HLS (HTTP Live Streaming)
- **CDN/Proxy:** Nginx (for adaptive streaming and caching)

## Messaging & Realtime
- **Event Streaming:** Kafka (for notifications, analytics, etc.)
- **Realtime Service:** Custom Node.js service (realtime-service/)

## DevOps & Infrastructure
- **Containerization:** Docker (multi-service setup)
- **Orchestration:** Docker Compose (with production and development configs)
- **Cloud Platform:** Google Cloud Platform (GCP) VM deployment
- **CI/CD:** (User-defined, can be GitHub Actions as per GITHUB_ACTIONS_SETUP.md)
- **Monitoring & Logging:** (User-defined, not explicitly shown in repo)

## Miscellaneous
- **Scripts:** Shell, PowerShell, and Node.js scripts for deployment, seeding, and verification
- **Documentation:** Markdown files (removed for production), OpenAPI specs
