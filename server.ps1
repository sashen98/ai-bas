$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host " Nexus AI Local Server Powered By Antigravity" -ForegroundColor White -BackgroundColor Blue
Write-Host " Listening on port $port..." -ForegroundColor Cyan
Write-Host " All chats and backups will be saved here." -ForegroundColor Gray
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# Ensure chat logic directories exist
$baseDir = $PSScriptRoot
$chatDir = Join-Path $baseDir "Chat"
$dbDir = Join-Path $baseDir "Database"
if (-not (Test-Path $chatDir)) { New-Item -ItemType Directory -Path $chatDir | Out-Null }
if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir | Out-Null }

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add CORS headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($request.Url.LocalPath -eq "/log" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $data = $body | ConvertFrom-Json
            
            $sessionFile = Join-Path $chatDir "$($data.sessionId).txt"
            $logLine = "[$($data.timestamp)] $($data.role.ToUpper()): $($data.content)`r`n"
            $logLine += "-----------------------------------`r`n"
            
            [System.IO.File]::AppendAllText($sessionFile, $logLine, [System.Text.Encoding]::UTF8)
            Write-Host " [LOG] Received message from Session: $($data.sessionId) ($($data.role))" -ForegroundColor Yellow
            
            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("Logged")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } elseif ($request.Url.LocalPath -eq "/database" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $data = $body | ConvertFrom-Json
            
            $dbFile = Join-Path $dbDir "$($data.sessionId).json"
            [System.IO.File]::WriteAllText($dbFile, $body, [System.Text.Encoding]::UTF8)
            Write-Host " [DB]  Backup saved for Session: $($data.sessionId)" -ForegroundColor Green
            
            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("DB Saved")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $urlPath = $request.Url.LocalPath.Replace("/", "\")
            if ($urlPath -eq "\") { $urlPath = "\index.html" }
            $localPath = Join-Path $baseDir $urlPath

            if (Test-Path $localPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($localPath)
                $contentType = switch ($ext) {
                    ".html" { "text/html" }
                    ".css"  { "text/css" }
                    ".js"   { "application/javascript" }
                    ".png"  { "image/png" }
                    default { "application/octet-stream" }
                }
                $response.ContentType = $contentType
                $content = [System.IO.File]::ReadAllBytes($localPath)
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
                $response.StatusCode = 200
            } else {
                $response.StatusCode = 404
                Write-Host " [404] Not Found: $($request.Url.LocalPath)" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host " [ERR] Error processing request: $_" -ForegroundColor DarkRed
        $response.StatusCode = 500
    }
    
    if ($response) { $response.Close() }
}
