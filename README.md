# Youtube

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
1. Problem Statement

Design and implement a scalable video streaming platform that supports:

Adaptive bitrate streaming

Asynchronous media processing

Real-time notifications

Secure authentication

Search and discovery

Cloud deployment

Horizontal scalability

2. System Architecture

Client
→ Nginx (Reverse Proxy / CDN Layer)
→ Stateless Backend API (Node.js + Express)
→ PostgreSQL (Primary + Read Replicas)
→ Redis (HA via Sentinel)
→ Kafka (Event Backbone)
→ FFmpeg Worker
→ HLS Media Delivery

Key Principles:

Stateless API layer

Event-driven architecture

Explicit lifecycle management

Decoupled realtime service

Controlled processing concurrency

3. Frontend Architecture

Stack:

React (TypeScript)

Vite

Tailwind CSS

ESLint

Nginx (production serving)

Responsibilities:

Adaptive HLS player

Authentication handling

Search UI

Realtime updates

Creator dashboard

Production:

Built assets served via Nginx

Optimized bundle size

Strict linting rules

4. Backend Architecture

Stack:

Node.js (TypeScript)

Express.js

Prisma ORM

OpenAPI documentation

Security:

Google OAuth

JWT-based sessions

Helmet

CORS policy

Rate limiting

Design:

Controllers → Services → Data Layer

Prisma transactions for consistency

Structured logging

Centralized error handling

5. Database Layer

Primary:

PostgreSQL

Scaling:

Read replicas for heavy read endpoints

Indexed query patterns

Connection pooling

Caching:

Redis with Sentinel (HA)

Feed caching

Session caching

Migration:

Prisma Migrate

Versioned schema evolution

6. Media Processing Pipeline

Upload Flow:

Upload video

Store raw asset

Push job to Kafka/Queue

Worker processes via FFmpeg

Generate:

240p

480p

720p

1080p

Create HLS master + variants

Generate thumbnail

Update lifecycle state

Properties:

Fully asynchronous

CPU-isolated processing

Failure-safe state transitions

Adaptive streaming ready

7. Streaming Strategy

Protocol:

HLS (HTTP Live Streaming)

Transcoding:

FFmpeg multi-bitrate pipeline

Delivery:

Nginx proxy

Adaptive bitrate switching

CDN-ready structure

8. Messaging & Realtime

Backbone:

Kafka

Use Cases:

Notifications

Chat

Event propagation

Analytics triggers

Realtime Service:

Dedicated Node.js service

WebSocket-based delivery

Event-driven updates

9. DevOps & Deployment

Containerization:

Docker

Docker Compose

Cloud:

GCP VM deployment

CI/CD:

GitHub Actions

Automated build and test pipeline

Automation:

Shell & Node scripts

OpenAPI validation

Seed and verification tooling

10. Core Features

Video upload & processing

Adaptive HLS playback

Google OAuth authentication

JWT session management

Realtime notifications

Chat system

Video & channel search

Microservice-ready architecture

Production Docker setup

11. Scalability Characteristics

Stateless backend

Read replica scaling

HA Redis caching

Event-driven decoupling

Worker concurrency control

Cloud deployment flexibility

Supports incremental scaling without architectural redesign.

12. Engineering Focus

This project emphasizes:

Distributed systems design

Event-driven communication

Consistency and state control

Performance optimization

Cloud-native thinking

Operational discipline

13. Future Expansion

Autoscaling workers

Multi-region deployment

Advanced recommendation engine

ML-based ranking

Content moderation pipeline

Monetization support

This is a system implementation, not a UI clone.
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
