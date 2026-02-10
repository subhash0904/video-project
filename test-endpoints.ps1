# Test script for video platform endpoints
Write-Host "🧪 Starting API Tests..." -ForegroundColor Cyan
Write-Host ""

$tests = @()
$passed = 0
$failed = 0

# Test 1: Health Check
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -ErrorAction Stop
    $data = $response | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ Health Check" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ Health Check" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "❌ Health Check (Connection failed)" -ForegroundColor Red
    $failed++
}

# Test 2: Get Video Feed
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/videos/feed?page=1&limit=5" -Method GET -ErrorAction Stop
    $data = $response | ConvertFrom-Json
    if ($data.success -and $data.data.length -gt 0) {
        Write-Host "✅ Video Feed ($($data.data.length) videos)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ Video Feed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "❌ Video Feed (Connection failed)" -ForegroundColor Red
    $failed++
}

# Test 3: Login
try {
    $loginData = @{
        email = "alice@example.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:4000/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $loginData `
        -ErrorAction Stop
    
    $data = $response | ConvertFrom-Json
    if ($data.success -and $data.data.accessToken) {
        Write-Host "✅ Login (Token received)" -ForegroundColor Green
        $passed++
        $token = $data.data.accessToken
    } else {
        Write-Host "❌ Login (No token)" -ForegroundColor Red
        $failed++
        $token = $null
    }
} catch {
    Write-Host "❌ Login" -ForegroundColor Red
    $failed++
}

# Test 4: Get User Subscriptions (requires auth)
if ($token) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/users/profile/subscriptions" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            } `
            -ErrorAction Stop
        
        $data = $response | ConvertFrom-Json
        if ($data.success) {
            Write-Host "✅ User Subscriptions ($($data.data.length) channels)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "❌ User Subscriptions" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "❌ User Subscriptions" -ForegroundColor Red
        $failed++
    }
}

# Test 5: Search Videos
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/videos/search?q=TypeScript&page=1&limit=5" `
        -Method GET `
        -ErrorAction Stop
    
    $data = $response | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ Video Search ($($data.data.length) results)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ Video Search" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "❌ Video Search" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "─" * 40 -ForegroundColor Gray
Write-Host "Tests Passed: $passed" -ForegroundColor Green
Write-Host "Tests Failed: $failed" -ForegroundColor Red
Write-Host "─" * 40 -ForegroundColor Gray
