# Deploy script for GitHub Pages - No admin rights required

# Set Git config at local or global level (doesn't require admin)
git config --global core.longpaths true

# Build the project
Write-Host "Building project..." -ForegroundColor Cyan
npm run build

# Create temp folder with short path
$tempDir = "C:\temp\gh-deploy"
Write-Host "Creating temporary directory at $tempDir..." -ForegroundColor Cyan

# Remove temp dir if it exists
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy build files to temp directory
Write-Host "Copying build files to temp directory..." -ForegroundColor Cyan
Copy-Item -Path ".\dist\*" -Destination $tempDir -Recurse

# Copy CNAME file
if (Test-Path ".\public\CNAME") {
    Write-Host "Copying CNAME file..." -ForegroundColor Cyan
    Copy-Item -Path ".\public\CNAME" -Destination "$tempDir\CNAME"
}

# Move to temp directory
Push-Location $tempDir

# Initialize git repo
Write-Host "Initializing git repository..." -ForegroundColor Cyan
git init
git add .

# Configure git user
git config user.name "GitHub Actions"
git config user.email "actions@github.com"

# Commit files
Write-Host "Committing files..." -ForegroundColor Cyan
git commit -m "Deploy to GitHub Pages"

# Push to GitHub Pages
Write-Host "Pushing to GitHub Pages..." -ForegroundColor Green
git push --force https://github.com/CodeCraftman2/CodeCraftman2.github.io.git HEAD:gh-pages

# Return to original directory
Pop-Location

# Clean up
Write-Host "Cleaning up..." -ForegroundColor Cyan
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Deployment complete!" -ForegroundColor Green
