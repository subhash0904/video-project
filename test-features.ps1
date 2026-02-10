#!/usr/bin/env powershell

Write-Host "
╔════════════════════════════════════════════════════════════╗
║           COMPREHENSIVE ERROR & FEATURE AUDIT             ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "
=== PART 1: TESTING MISSING PAGES ===" -ForegroundColor Yellow

$pages = @(
    "Profile",
    "History", 
    "Liked",
    "Subscriptions"
)

Write-Host "Checking if pages exist..." -ForegroundColor Green
$pageDir = "c:\project\video-project\frontend\src\pages"
foreach ($page in $pages) {
    $file = "$pageDir\$page.tsx"
    if (Test-Path $file) {
        Write-Host "[OK] $page.tsx exists" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $page.tsx NOT FOUND" -ForegroundColor Red
    }
}

Write-Host "
=== PART 2: TESTING API ENDPOINTS ===" -ForegroundColor Yellow

$endpoints = @(
    @{name="Health"; method="GET"; url="http://localhost:4000/health"},
    @{name="Video Feed"; method="GET"; url="http://localhost:4000/api/videos/feed"},
    @{name="Login"; method="POST"; url="http://localhost:4000/api/auth/login"; body='{"email":"alice@example.com","password":"password123"}'},
    @{name="Subscriptions"; method="GET"; url="http://localhost:4000/api/users/subscriptions"}
)

foreach ($ep in $endpoints) {
    try {
        if ($ep.method -eq "POST") {
            $resp = Invoke-WebRequest -Uri $ep.url -Method POST -Body $ep.body -ContentType 'application/json' -UseBasicParsing -ErrorAction Stop
        } else {
            $resp = Invoke-WebRequest -Uri $ep.url -Method GET -UseBasicParsing -ErrorAction Stop
        }
        Write-Host "[OK] $($ep.name): $($resp.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $($ep.name): $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "
=== PART 3: CHECKING FRONTEND PAGES CONTENT ===" -ForegroundColor Yellow

$pageFiles = @("Profile.tsx","History.tsx","Liked.tsx","Subscriptions.tsx")
foreach ($file in $pageFiles) {
    $path = "c:\project\video-project\frontend\src\pages\$file"
    if (Test-Path $path) {
        $content = Get-Content $path -Head 10
        if ($content -match "export default") {
            Write-Host "[OK] $file exports default component" -ForegroundColor Green
        } else {
            Write-Host "[WARN] $file may not export properly" -ForegroundColor Yellow
        }
    }
}

Write-Host "
=== PART 4: CHECKING API LIB ===" -ForegroundColor Yellow

$apiLib = "c:\project\video-project\frontend\src\lib\api.ts"
if (Test-Path $apiLib) {
    $content = Get-Content $apiLib
    $functions = @("getProfile", "getHistory", "getLikedVideos", "getSubscriptions")
    foreach ($func in $functions) {
        if ($content -match $func) {
            Write-Host "[OK] Function '$func' exists in API lib" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] Function '$func' NOT in API lib" -ForegroundColor Red
        }
    }
}

Write-Host "
=== PART 5: TESTING FRONTEND DEV SERVER ===" -ForegroundColor Yellow

try {
    $resp = Invoke-WebRequest "http://localhost:5175" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Frontend server responding" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Frontend may be on different port" -ForegroundColor Yellow
}

Write-Host "
=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Check FULL_AUDIT_REPORT.md for detailed results" -ForegroundColor Green
