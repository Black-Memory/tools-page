# Auto Deploy Script
# Usage: .\deploy.ps1

param(
    [string]$ServerIP = "43.161.220.248",
    [string]$KeyPath = "$HOME\.ssh\43.161.220.248_key",
    [string]$RemotePath = "/mnt/tools-page",
    [string]$TempPath = "/tmp/tools-page-temp"
)

Write-Host "Starting Vue project deployment to server..." -ForegroundColor Green

# 1. Build project
Write-Host "Building project..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "Project build successful!" -ForegroundColor Green
} catch {
    Write-Host "Build failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Check if dist directory exists
if (!(Test-Path ".\dist")) {
    Write-Host "dist directory not found, build may have failed" -ForegroundColor Red
    exit 1
}

# 3. Package dist folder
Write-Host "Packaging dist folder..." -ForegroundColor Yellow
$packageName = "dist-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
try {
    # Create tar.gz package (using tar command if available, or 7z, or Compress-Archive)
    if (Get-Command tar -ErrorAction SilentlyContinue) {
        tar -czf $packageName -C dist .
    } elseif (Get-Command 7z -ErrorAction SilentlyContinue) {
        7z a -tgzip $packageName .\dist\*
    } else {
        # Fallback to PowerShell Compress-Archive (creates .zip)
        $packageName = "dist-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
        Compress-Archive -Path .\dist\* -DestinationPath $packageName -Force
    }
    Write-Host "Package created: $packageName" -ForegroundColor Green
} catch {
    Write-Host "Package creation failed: $_" -ForegroundColor Red
    exit 1
}

# 4. Upload package to server
Write-Host "Uploading package to server..." -ForegroundColor Yellow
try {
    # Create temp directory
    ssh -i $KeyPath root@$ServerIP "mkdir -p $TempPath"
    
    # Upload package
    scp -i $KeyPath $packageName root@${ServerIP}:${TempPath}/
    if ($LASTEXITCODE -ne 0) {
        throw "Package upload failed"
    }
    Write-Host "Package upload successful!" -ForegroundColor Green
    
    # Clean up local package
    Remove-Item $packageName -Force
    Write-Host "Local package cleaned up" -ForegroundColor Green
} catch {
    Write-Host "Package upload failed: $_" -ForegroundColor Red
    # Clean up local package on error
    if (Test-Path $packageName) {
        Remove-Item $packageName -Force
    }
    exit 1
}

# 5. Execute deployment on server
Write-Host "Executing deployment on server..." -ForegroundColor Yellow
$deployScript = 'echo "Creating backup..." && ' +
'if [ -d "/mnt/tools-page" ]; then cp -r /mnt/tools-page /mnt/tools-page-backup-$(date +%Y%m%d-%H%M%S) && echo "Backup created"; fi && ' +
'echo "Extracting package..." && ' +
'cd /tmp/tools-page-temp && ' +
'ls -la && ' +
'for file in *.tar.gz; do if [ -f "$file" ]; then echo "Extracting tar.gz..." && tar -xzf "$file" && rm -f "$file" && break; fi; done && ' +
'for file in *.zip; do if [ -f "$file" ]; then echo "Extracting zip..." && unzip -q "$file" && rm -f "$file" && break; fi; done && ' +
'echo "Files after extraction:" && ls -la && ' +
'echo "Clearing target directory..." && ' +
'mkdir -p /mnt/tools-page && ' +
'rm -rf /mnt/tools-page/* && ' +
'echo "Copying new files..." && ' +
'cp -r /tmp/tools-page-temp/* /mnt/tools-page/ && ' +
'echo "Setting permissions..." && ' +
'(chown -R www-data:www-data /mnt/tools-page 2>/dev/null || chown -R nginx:nginx /mnt/tools-page 2>/dev/null || echo "Permission setting skipped") && ' +
'echo "Cleaning temp files..." && ' +
'rm -rf /tmp/tools-page-temp && ' +
'echo "Checking final files..." && ' +
'ls -la /mnt/tools-page/ && ' +
'echo "Reloading Nginx..." && ' +
'(nginx -t && nginx -s reload && echo "Nginx reload successful" || echo "Nginx not available") && ' +
'echo "Deployment completed!"'

try {
    ssh -i $KeyPath root@$ServerIP $deployScript
    if ($LASTEXITCODE -ne 0) {
        throw "Server deployment operation failed"
    }
    Write-Host "Server deployment operation successful!" -ForegroundColor Green
} catch {
    Write-Host "Server deployment operation failed: $_" -ForegroundColor Red
    exit 1
}

# 6. Complete
Write-Host "===============================================" -ForegroundColor Green
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Access URL: http://$ServerIP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Green