@echo off
REM Quick Deploy Script - YouTube-Like Video Platform (Windows)
REM Usage: deploy.cmd [dev|docker|production]

setlocal enabledelayedexpansion
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

echo.
echo ================================================================================
echo  ^! Video Platform Deployment
echo  Environment: %ENVIRONMENT%
echo ================================================================================
echo.

if "%ENVIRONMENT%"=="dev" (
    echo [^+] Starting Development Environment...
    echo.
    echo Backend ^(Terminal 1^):
    echo   cd backend ^&^& cmd /c pnpm build ^&^& pnpm dev
    echo.
    echo Frontend ^(Terminal 2^):
    echo   cd frontend ^&^& pnpm dev
    echo.
    echo Features:
    echo   Backend: http://localhost:4000
    echo   Frontend: http://localhost:5173
    echo   API Health: http://localhost:4000/health
    echo   Postman: Import docs/postman-collection.json
    
) else if "%ENVIRONMENT%"=="docker" (
    echo [^+] Starting Docker Compose...
    cd infra
    
    REM Copy .env.example if no .env exists
    if not exist .env (
        echo [!] No .env found, copying .env.example...
        copy .env.example .env
    )
    
    echo [1/4] Building and pulling images...
    docker-compose build
    docker-compose pull postgres redis
    
    echo [2/4] Starting services...
    docker-compose up -d
    
    echo [3/4] Waiting for services to be ready...
    timeout /t 15 /nobreak
    
    echo [4/4] Running migrations and seed...
    docker-compose exec -T backend npx prisma migrate deploy
    docker-compose exec -T backend npx prisma db seed
    
    echo.
    echo Services Started:
    echo  - PostgreSQL: localhost:5432
    echo  - Redis: localhost:6379
    echo  - Backend API: http://localhost:4000
    echo  - Frontend: http://localhost ^(port 80^)
    echo  - Transcoder: Running in background
    echo.
    echo View logs: docker-compose logs -f [backend ^| frontend ^| postgres ^| redis]
    echo Stop services: docker-compose down
    
) else if "%ENVIRONMENT%"=="production" (
    echo [^+] Preparing Production Deployment...
    echo.
    echo PRODUCTION CHECKLIST:
    echo  [ ] Updated .env with production credentials
    echo  [ ] Rotated JWT_SECRET (min 32 chars^)
    echo  [ ] Configured SSL certificates
    echo  [ ] Setup database backups
    echo  [ ] Configured monitoring/alerts
    echo  [ ] Reviewed security settings
    echo.
    
    echo Building production images...
    docker build -t video-backend:prod ./backend
    docker build -t video-frontend:prod ./frontend
    docker build -t video-transcoder:prod ./streaming
    
    echo.
    echo Images built:
    echo  - video-backend:prod
    echo  - video-frontend:prod
    echo  - video-transcoder:prod
    echo.
    echo Next steps:
    echo  1. Push images to registry
    echo  2. Deploy via docker-compose or Kubernetes
    echo  3. Configure Nginx/ingress
    echo  4. Run health checks
    
) else (
    echo ERROR: Invalid environment.
    echo Usage: deploy.cmd [dev ^| docker ^| production]
    exit /b 1
)

echo.
echo ================================================================================
echo  Documentation:
echo   - Deployment Guide: DEPLOYMENT_GUIDE.md
echo   - Verification Report: FINAL_VERIFICATION_REPORT.md
echo   - Architecture: docs/ARCHITECTURE.md
echo ================================================================================
echo.
