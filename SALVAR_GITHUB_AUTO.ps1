$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git -and (Test-Path 'C:\Program Files\Git\cmd\git.exe')) {
  $git = 'C:\Program Files\Git\cmd\git.exe'
}
if (-not $git) {
  throw 'Git não está instalado ou não foi encontrado no PATH.'
}

function Invoke-Git {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  & $git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git falhou: git $($Arguments -join ' ')"
  }
}

function Save-Project {
  $status = & $git status --porcelain
  if (-not $status) {
    return
  }

  Invoke-Git @('add', '--all')
  $staged = @(& $git diff --cached --name-only)
  if ($staged | Where-Object { $_ -match '(^|[\\/])\.env($|\.)' }) {
    & $git reset -- .env '.env.*' 2>$null
    throw 'O commit foi interrompido porque um arquivo .env foi detectado no stage.'
  }
  if (-not $staged) {
    return
  }

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Invoke-Git @('commit', '-m', "Auto-save: $timestamp")
  & $git show-ref --verify --quiet 'refs/remotes/origin/main'
  if ($LASTEXITCODE -eq 0) {
    Invoke-Git @('pull', '--rebase', 'origin', 'main')
  }
  Invoke-Git @('push', 'origin', 'main')
  Write-Host "Projeto salvo no GitHub: $timestamp"
}

Write-Host 'Salvamento automático ativo. Pressione Ctrl+C para parar.'
Save-Project

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PSScriptRoot
$watcher.Filter = '*'
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName'
$watcher.EnableRaisingEvents = $true

$lastChange = [DateTime]::MinValue
$action = {
  $script:lastChange = Get-Date
}

Register-ObjectEvent $watcher Changed -Action $action | Out-Null
Register-ObjectEvent $watcher Created -Action $action | Out-Null
Register-ObjectEvent $watcher Deleted -Action $action | Out-Null
Register-ObjectEvent $watcher Renamed -Action $action | Out-Null

try {
  while ($true) {
    Start-Sleep -Seconds 3
    if ($lastChange -ne [DateTime]::MinValue -and ((Get-Date) - $lastChange).TotalSeconds -ge 10) {
      $lastChange = [DateTime]::MinValue
      try {
        Save-Project
      } catch {
        Write-Error $_
      }
    }
  }
} finally {
  $watcher.Dispose()
  Get-EventSubscriber | Unregister-Event
}