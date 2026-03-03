
$baseUrl = "http://localhost:3001/api"
$storeSlug = "loja-demo"

Write-Host "--- Teste 1: Criar Sessão ---"
$sessionBody = @{ storeSlug = $storeSlug } | ConvertTo-Json
try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/session" -Method Post -ContentType "application/json" -Body $sessionBody
    $sessionId = $sessionResponse.sessionId
    Write-Host "✅ Sessão criada com sucesso. ID: $sessionId"
} catch {
    Write-Host "❌ Erro ao criar sessão: $_"
    exit
}

function Chat-WithAI {
    param (
        [string]$message
    )
    Write-Host "`n🗣️  Cliente: $message"
    $chatBody = @{
        sessionId = $sessionId
        message = $message
    } | ConvertTo-Json -Compress
    
    try {
        # Using UTF8 encoding for the body to handle special characters correctly if needed
        $chatResponse = Invoke-RestMethod -Uri "$baseUrl/ai/chat" -Method Post -ContentType "application/json" -Body $chatBody
        Write-Host "🤖 AI: $($chatResponse.reply)"
    } catch {
        Write-Host "❌ Erro no chat AI: $_"
    }
}

Write-Host "`n--- Teste 2: Chat com AI (Perguntas de Embalagens) ---"

Chat-WithAI -message "Olá, quais caixas vocês têm para delivery?"
Chat-WithAI -message "Vocês vendem filme stretch?"
Chat-WithAI -message "Tem saco de pão?"
Chat-WithAI -message "Quero 100 sacolas 30x40"
