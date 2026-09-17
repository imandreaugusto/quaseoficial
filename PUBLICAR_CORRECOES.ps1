$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git não está instalado. Instale o GitHub Desktop ou o Git e execute novamente.'
}

Set-Location $PSScriptRoot

Write-Host 'Projeto:' (Get-Location)
Write-Host 'Repositório remoto:'
git remote -v

$files = @(
  'server.ts',
  'src/components/AuthModal.tsx',
  'src/components/PixPaymentScreen.tsx',
  'supabase/schema.sql',
  'PROMPT_MIGRACAO_PC.md'
)

foreach ($file in $files) {
  if (-not (Test-Path $file)) {
    throw "Arquivo esperado não encontrado: $file"
  }
}

Write-Host 'Arquivos que serão publicados:'
git add -- $files
git diff --cached --name-status

$status = git status --short
if (-not $status) {
  Write-Host 'Não há alterações novas para publicar.'
  exit 0
}

$confirmation = Read-Host 'Digite PUBLICAR para confirmar o commit e o push'
if ($confirmation -ne 'PUBLICAR') {
  Write-Host 'Operação cancelada. Nenhum commit ou push foi feito.'
  git restore --staged -- $files
  exit 0
}

git commit -m 'Corrige pagamentos e webhook'
git push origin main

Write-Host 'Correções publicadas. O Render deverá iniciar um novo deploy automaticamente.'
