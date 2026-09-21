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
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [switch]$AllowFailure
  )

  & $git @Arguments 2>&1 | ForEach-Object { $_ }
  $exitCode = $LASTEXITCODE
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "Git falhou: git $($Arguments -join ' ')"
  }
  return $exitCode
}

function Save-Project {
  $status = & $git status --porcelain
  if (-not $status) {
    Write-Host 'Nenhuma alteração pendente para sincronizar.'
    return
  }

  & $git add --all
  $staged = @(& $git diff --cached --name-only)
  if ($staged | Where-Object { $_ -match '(^|[\\/])\.env($|\.)' }) {
    & $git reset -- .env '.env.*' 2>$null
    throw 'O commit foi interrompido porque um arquivo .env foi detectado no stage.'
  }

  if (-not $staged) {
    return
  }

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $commitExit = Invoke-Git @('commit', '-m', "Auto-save: $timestamp") -AllowFailure
  if ($commitExit -ne 0) {
    Write-Host 'Nada para commitar ou commit não foi necessário.'
    return
  }

  $hasRemote = $false
  try {
    & $git show-ref --verify --quiet 'refs/remotes/origin/main'
    $hasRemote = ($LASTEXITCODE -eq 0)
  } catch {}

  if ($hasRemote) {
    Invoke-Git @('pull', '--rebase', 'origin', 'main') -AllowFailure | Out-Null
  }

  Invoke-Git @('push', 'origin', 'HEAD:main') -AllowFailure | Out-Null
  Write-Host "Projeto salvo no GitHub: $timestamp"
}

Write-Host 'Salvamento automático ativo. Pressione Ctrl+C para parar.'

while ($true) {
  try {
    Save-Project
    Start-Sleep -Seconds 10
  } catch {
    Write-Warning ("Erro no processo de save: {0}" -f $_.Exception.Message)
    Start-Sleep -Seconds 10
  }
}