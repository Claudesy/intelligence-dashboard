# ==============================================================================
# IDE Antigravity — Baseline Performance Measurement Script
# Reusable: jalankan kapan saja untuk membandingkan performa sebelum/sesudah optimasi
# Usage: powershell -ExecutionPolicy Bypass -File scripts/measure-baseline.ps1
# ==============================================================================

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$outputFile = "baseline-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"

Write-Host "`n=== IDE Antigravity Baseline Measurement ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp`n"

# --- 1. System Info ---
$os = (Get-CimInstance Win32_OperatingSystem)
$cpu = (Get-CimInstance Win32_Processor)
$disk = (Get-PhysicalDisk | Select-Object -First 1)
$gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1)
$ramGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)

$sysInfo = @"
## System Info
| Spec | Value |
|------|-------|
| OS | $($os.Caption) Build $($os.BuildNumber) |
| CPU | $($cpu.Name) ($($cpu.NumberOfCores)C/$($cpu.NumberOfLogicalProcessors)T) |
| RAM | ${ramGB} GB |
| Disk | $($disk.FriendlyName) ($($disk.MediaType) / $($disk.BusType)) |
| GPU | $($gpu.Name) |
"@

Write-Host $sysInfo

# --- 2. Process Metrics ---
Write-Host "`n--- Process Metrics ---" -ForegroundColor Yellow

$procs = Get-Process | Where-Object {
    $_.ProcessName -match 'Antigravity|node|codex|opencode'
} | Select-Object ProcessName, Id,
    @{N='WS_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}},
    @{N='PM_MB';E={[math]::Round($_.PrivateMemorySize64/1MB,1)}},
    @{N='CPU_s';E={[math]::Round($_.CPU,2)}} |
    Sort-Object WS_MB -Descending

$totalWS = ($procs | Measure-Object -Property WS_MB -Sum).Sum
$antigravityWS = ($procs | Where-Object { $_.ProcessName -match 'Antigravity' } | Measure-Object -Property WS_MB -Sum).Sum
$nodeWS = ($procs | Where-Object { $_.ProcessName -eq 'node' } | Measure-Object -Property WS_MB -Sum).Sum

$procs | Format-Table -AutoSize
Write-Host "Total IDE footprint: $([math]::Round($totalWS, 1)) MB"
Write-Host "  Antigravity processes: $([math]::Round($antigravityWS, 1)) MB"
Write-Host "  Node processes: $([math]::Round($nodeWS, 1)) MB"

# --- 3. Workspace Metrics ---
Write-Host "`n--- Workspace Metrics ---" -ForegroundColor Yellow

$projectRoot = Split-Path -Parent $PSScriptRoot
$srcFiles = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.next\\|\\\.git\\' }
$srcCount = $srcFiles.Count
$srcSizeMB = [math]::Round(($srcFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 1)

$nmExists = Test-Path "$projectRoot\node_modules"
$nmSizeMB = 0
if ($nmExists) {
    $nmSizeMB = [math]::Round((Get-ChildItem "$projectRoot\node_modules" -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB, 0)
}

Write-Host "Source files (excl node_modules/.next/.git): $srcCount files, $srcSizeMB MB"
Write-Host "node_modules: $nmSizeMB MB"

# --- 4. Available RAM ---
$freeRAM = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$usedRAM = [math]::Round($ramGB - $freeRAM, 1)
Write-Host "`n--- RAM Usage ---" -ForegroundColor Yellow
Write-Host "Total: $ramGB GB | Used: $usedRAM GB | Free: $freeRAM GB"

# --- 5. Write Report ---
$report = @"
# Baseline Performance Report

> Generated: $timestamp

$sysInfo

## Process Metrics

| Process | PID | Working Set (MB) | Private Mem (MB) | CPU (s) |
|---------|-----|-------------------|-------------------|---------|
$($procs | ForEach-Object { "| $($_.ProcessName) | $($_.Id) | $($_.WS_MB) | $($_.PM_MB) | $($_.CPU_s) |" } | Out-String)

| Aggregate | MB |
|-----------|----|
| Total IDE footprint | $([math]::Round($totalWS, 1)) |
| Antigravity processes | $([math]::Round($antigravityWS, 1)) |
| Node processes | $([math]::Round($nodeWS, 1)) |

## Workspace Metrics

| Metric | Value |
|--------|-------|
| Source files | $srcCount files |
| Source size | $srcSizeMB MB |
| node_modules | $nmSizeMB MB |

## RAM Usage

| Metric | Value |
|--------|-------|
| Total | $ramGB GB |
| Used | $usedRAM GB |
| Free | $freeRAM GB |

---
*Compare this report with future runs to track optimization impact.*
"@

$report | Out-File -FilePath "$projectRoot\$outputFile" -Encoding utf8
Write-Host "`n=== Report saved: $outputFile ===" -ForegroundColor Green
"@

Write-Host $report

Write-Host @"

=== Report saved: $outputFile ===
"@ -ForegroundColor Green
