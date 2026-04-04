$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on port $port... (Chat Logging Enabled)"

# Ensure chat logic directories exist
$baseDir = "c:\Users\Shashin\Desktop\ai bas wab sied"
$chatDir = Join-Path $baseDir "Chat"
$dbDir = Join-Path $baseDir "Database"
if (-not (Test-Path $chatDir)) { New-Item -ItemType Directory -Path $chatDir }
if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir }

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
            
            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("DB Saved")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $urlPath = $request.Url.LocalPath.Replace("/", "\")
            if ($urlPath -eq "\") { $urlPath = "\index.html" }
            $localPath = $baseDir + $urlPath

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
            }
        }
    } catch {
        Write-Host "Error: $_"
        $response.StatusCode = 500
    }
    
    if ($response) { $response.Close() }
}
