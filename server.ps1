$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on port $port..."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = "c:\Users\Shashin\Desktop\ai bas wab sied" + $request.Url.LocalPath.Replace("/", "\")
    if ($localPath -eq "c:\Users\Shashin\Desktop\ai bas wab sied\") {
        $localPath = "c:\Users\Shashin\Desktop\ai bas wab sied\index.html"
    }

    try {
        if (Test-Path $localPath) {
            $content = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
        }
    } catch {
        $response.StatusCode = 500
    }
    
    $response.Close()
}
