# SaudeConecta — backup e restauração do MySQL
#
# Chamado pelos .bat desta pasta (backup.bat, restaurar.bat,
# agendar-backup.bat), não direto. Ações:
#
#   -Acao backup     cópia do banco em ..\backups (ou backup.pasta)
#   -Acao restaurar  devolve o banco ao estado de um backup (pede o root)
#   -Acao teste      restaura num banco à parte e confere linha por linha
#   -Acao agendar    cria a tarefa diária no Agendador do Windows
#
# Por que mysqldump e não código Java: é a ferramenta que já vem com o
# MySQL, e a regra do projeto é não trazer dependência nova. O backup sai
# com a conta da API (só SELECT basta) e lê a senha do config.properties;
# a restauração precisa do root, porque apaga e recria tabelas.

param(
    [ValidateSet('backup', 'restaurar', 'teste', 'agendar')]
    [string]$Acao = 'backup',
    [string]$Arquivo = ''
)

$ErrorActionPreference = 'Stop'

$BANCO = 'saudeconecta'
$BANCO_TESTE = 'saudeconecta_teste_restauracao'
$RAIZ = Split-Path -Parent $PSScriptRoot
$CONFIG = Join-Path $RAIZ 'backend-api\config.properties'
$SCHEMA = Join-Path $PSScriptRoot 'schema.sql'

# --- config.properties --------------------------------------------------

function Ler-Config {
    $cfg = @{}
    if (-not (Test-Path $CONFIG)) {
        throw "Não achei $CONFIG. Copie o config.properties.example e preencha db.usuario e db.senha."
    }
    foreach ($linha in [IO.File]::ReadAllLines($CONFIG, [Text.Encoding]::UTF8)) {
        $l = $linha.Trim()
        if ($l -eq '' -or $l.StartsWith('#')) { continue }
        $i = $l.IndexOf('=')
        if ($i -lt 1) { continue }
        $cfg[$l.Substring(0, $i).Trim()] = $l.Substring($i + 1).Trim()
    }
    # As variáveis de ambiente valem como na API (Config.java).
    if ($env:DB_USUARIO) { $cfg['db.usuario'] = $env:DB_USUARIO }
    if ($env:DB_SENHA) { $cfg['db.senha'] = $env:DB_SENHA }
    return $cfg
}

$cfg = Ler-Config
$PASTA = if ($cfg['backup.pasta']) { $cfg['backup.pasta'] } else { Join-Path $RAIZ 'backups' }
$COPIA = $cfg['backup.copia']
$MANTER = if ($cfg['backup.manter']) { [int]$cfg['backup.manter'] } else { 14 }

function Achar-Programa([string]$nome) {
    if ($cfg['backup.mysql_bin']) { return Join-Path $cfg['backup.mysql_bin'] $nome }
    $noPath = Get-Command $nome -ErrorAction SilentlyContinue
    if ($noPath) { return $noPath.Source }
    $achado = Get-ChildItem (Join-Path $env:ProgramFiles "MySQL\MySQL Server *\bin\$nome") -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($achado) { return $achado.FullName }
    throw "Não achei o $nome. Informe a pasta em backup.mysql_bin no config.properties."
}

# --- credenciais ----------------------------------------------------------

# A senha vai num arquivo de opções temporário, e não em -p<senha>: na linha
# de comando ela apareceria para qualquer programa que liste processos.
function Novo-ArquivoDeCredenciais([string]$usuario, [string]$senha) {
    $escapada = $senha.Replace('\', '\\').Replace('"', '\"')
    $caminho = Join-Path $env:TEMP ("sc-mysql-" + [Guid]::NewGuid().ToString('N') + ".cnf")
    $texto = "[client]`r`nuser=$usuario`r`npassword=`"$escapada`"`r`nhost=localhost`r`n"
    # Sem BOM: o cliente do MySQL não o reconhece no arquivo de opções.
    [IO.File]::WriteAllText($caminho, $texto, (New-Object Text.UTF8Encoding($false)))
    return $caminho
}

function Credenciais-DaApi {
    if (-not $cfg['db.usuario'] -or -not $cfg['db.senha']) {
        throw 'db.usuario e db.senha estão vazios no config.properties.'
    }
    return Novo-ArquivoDeCredenciais $cfg['db.usuario'] $cfg['db.senha']
}

function Credenciais-DoRoot {
    $usuario = Read-Host 'Usuário administrador do MySQL [root]'
    if (-not $usuario) { $usuario = 'root' }
    $seguro = Read-Host "Senha de $usuario" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    return Novo-ArquivoDeCredenciais $usuario $senha
}

function Rodar-Mysql([string]$credenciais, [string]$roteiro) {
    $mysql = Achar-Programa 'mysql.exe'
    # `source` em vez de redirecionar a entrada: o PowerShell 5 recodifica o
    # que passa pelo pipe, e o acento chegaria corrompido ao banco.
    # Continue: no PowerShell 5, qualquer linha no stderr de um programa
    # externo (um simples aviso) viraria exceção com o Stop.
    $ErrorActionPreference = 'Continue'
    $saida = & $mysql "--defaults-extra-file=$credenciais" --default-character-set=utf8mb4 `
        --batch --skip-column-names -e "source $($roteiro.Replace('\', '/'))" 2>&1
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw "O mysql falhou:`n$($saida -join "`n")" }
    return $saida
}

# --- backup ---------------------------------------------------------------

function Fazer-Backup([string]$prefixo = 'saudeconecta') {
    New-Item -ItemType Directory -Force $PASTA | Out-Null
    $nome = "$prefixo-$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sql"
    $destino = Join-Path $PASTA $nome
    $mysqldump = Achar-Programa 'mysqldump.exe'
    $credenciais = Credenciais-DaApi
    try {
        # --single-transaction: cópia consistente sem travar a API (InnoDB).
        # --no-tablespaces: dispensa o privilégio PROCESS, que a conta da API
        #   não tem e não deve ter.
        # Os procedimentos de migração ficam de fora de propósito: quem os cria
        #   é o schema.sql, que a restauração roda depois do backup.
        # --result-file em vez de ">": o redirecionamento do PowerShell 5
        #   gravaria em UTF-16 e o mysql não leria de volta.
        $ErrorActionPreference = 'Continue'
        $saida = & $mysqldump "--defaults-extra-file=$credenciais" `
            --single-transaction --no-tablespaces --skip-triggers --hex-blob `
            --default-character-set=utf8mb4 --set-gtid-purged=OFF `
            "--result-file=$destino" $BANCO 2>&1
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -ne 0) { throw "O mysqldump falhou:`n$($saida -join "`n")" }
    } finally {
        Remove-Item $credenciais -Force -ErrorAction SilentlyContinue
    }

    # Um dump cortado no meio (disco cheio, banco caiu) termina sem esta
    # linha, e um backup assim só seria descoberto na hora de restaurar.
    $fim = Get-Content $destino -Tail 1
    if ($fim -notmatch 'Dump completed') {
        Remove-Item $destino -Force
        throw 'O arquivo saiu incompleto e foi descartado.'
    }

    $tamanho = '{0:N1} KB' -f ((Get-Item $destino).Length / 1KB)
    Write-Host "Backup gravado: $destino ($tamanho)"

    if ($COPIA) {
        try {
            New-Item -ItemType Directory -Force $COPIA | Out-Null
            Copy-Item $destino $COPIA
            Write-Host "Cópia em: $COPIA"
        } catch {
            # A cópia de fora é o que salva se o disco morrer, mas falhar nela
            # (pendrive fora) não invalida o backup local.
            Write-Warning "Não deu para copiar para $COPIA : $($_.Exception.Message)"
        }
    }

    # Rodízio: só os automáticos entram na conta. A cópia feita antes de uma
    # restauração (prefixo antes-de-restaurar) nunca é apagada por aqui.
    Get-ChildItem $PASTA -Filter 'saudeconecta-*.sql' | Sort-Object Name -Descending |
        Select-Object -Skip $MANTER | Remove-Item -Force
    return $destino
}

function Escolher-Arquivo {
    if ($Arquivo) {
        if (-not (Test-Path $Arquivo)) { throw "Arquivo não encontrado: $Arquivo" }
        return (Resolve-Path $Arquivo).Path
    }
    $ultimo = Get-ChildItem $PASTA -Filter '*.sql' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $ultimo) { throw "Nenhum backup em $PASTA." }
    return $ultimo.FullName
}

# --- restauração ----------------------------------------------------------

function Restaurar {
    $origem = Escolher-Arquivo
    $item = Get-Item $origem
    # Confere ANTES de apagar qualquer coisa: restaurar um arquivo cortado
    # trocaria o banco inteiro por metade dele.
    if ($item.Length -eq 0 -or (Get-Content $origem -Tail 1) -notmatch 'Dump completed') {
        throw "$($item.Name) está vazio ou incompleto. Escolha outro: restaurar.bat caminho\do\backup.sql"
    }
    Write-Host ''
    Write-Host "Backup escolhido: $($item.Name)  ($($item.LastWriteTime), $('{0:N1} KB' -f ($item.Length / 1KB)))"
    Write-Host "Isto APAGA o banco $BANCO atual e o substitui por este backup."
    Write-Host 'Tudo o que foi gravado depois dele se perde.'
    if ((Read-Host 'Digite RESTAURAR para continuar') -cne 'RESTAURAR') {
        Write-Host 'Nada foi feito.'
        return
    }

    # Uma restauração errada também é perda de dados: antes de apagar, guarda
    # o estado de agora. Se o banco já não existe (o caso do desastre), segue.
    try {
        $antes = Fazer-Backup 'antes-de-restaurar'
        Write-Host "Estado atual guardado em $antes"
    } catch {
        Write-Warning "Não deu para copiar o estado atual (o banco pode não existir mais): $($_.Exception.Message)"
    }

    $credenciais = Credenciais-DoRoot
    $roteiro = Join-Path $env:TEMP ("sc-restaurar-" + [Guid]::NewGuid().ToString('N') + ".sql")
    try {
        # DROP + CREATE, e não só carregar por cima: uma tabela criada depois do
        # backup ficaria com linhas apontando para registros que voltaram no
        # tempo. As permissões da conta da API (GRANT em saudeconecta.*) moram
        # no banco mysql e sobrevivem ao DROP. O schema.sql roda no fim para
        # aplicar as migrações que vieram depois do backup.
        $sql = @(
            "DROP DATABASE IF EXISTS $BANCO;",
            "CREATE DATABASE $BANCO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "USE $BANCO;",
            "source $($origem.Replace('\', '/'))",
            "source $($SCHEMA.Replace('\', '/'))"
        ) -join "`n"
        [IO.File]::WriteAllText($roteiro, $sql, (New-Object Text.UTF8Encoding($false)))
        Rodar-Mysql $credenciais $roteiro | Out-Null
    } finally {
        Remove-Item $credenciais, $roteiro -Force -ErrorAction SilentlyContinue
    }
    Write-Host 'Banco restaurado. Reinicie a API (executar-api.bat).'
}

# Backup que nunca foi restaurado é só esperança. O teste faz um backup
# novo, carrega num banco à parte, compara a contagem de cada tabela com a
# do banco de verdade e apaga o banco de teste. O banco real não é tocado.
function Testar-Restauracao {
    $origem = Fazer-Backup
    $tabelas = Select-String -Path $origem -Pattern '^CREATE TABLE `([^`]+)`' |
        ForEach-Object { $_.Matches[0].Groups[1].Value }
    if (-not $tabelas) { throw 'O backup não tem nenhuma tabela.' }

    $comparacao = ($tabelas | ForEach-Object {
        "SELECT '$_', (SELECT COUNT(*) FROM $BANCO.``$_``), (SELECT COUNT(*) FROM $BANCO_TESTE.``$_``)"
    }) -join "`nUNION ALL "

    $credenciais = Credenciais-DoRoot
    $roteiro = Join-Path $env:TEMP ("sc-teste-" + [Guid]::NewGuid().ToString('N') + ".sql")
    try {
        $sql = @(
            "DROP DATABASE IF EXISTS $BANCO_TESTE;",
            "CREATE DATABASE $BANCO_TESTE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "USE $BANCO_TESTE;",
            "source $($origem.Replace('\', '/'))",
            "$comparacao;",
            "DROP DATABASE $BANCO_TESTE;"
        ) -join "`n"
        [IO.File]::WriteAllText($roteiro, $sql, (New-Object Text.UTF8Encoding($false)))
        $linhas = Rodar-Mysql $credenciais $roteiro
    } finally {
        Remove-Item $credenciais, $roteiro -Force -ErrorAction SilentlyContinue
    }

    $diferentes = 0
    Write-Host ''
    Write-Host ('{0,-28} {1,10} {2,12}' -f 'tabela', 'no banco', 'restaurado')
    foreach ($l in $linhas) {
        $c = "$l" -split "`t"
        if ($c.Count -ne 3) { continue }
        $marca = if ($c[1] -eq $c[2]) { '' } else { $diferentes++; '  <- diferente' }
        Write-Host ('{0,-28} {1,10} {2,12}{3}' -f $c[0], $c[1], $c[2], $marca)
    }
    Write-Host ''
    if ($diferentes -eq 0) {
        Write-Host "OK: as $($tabelas.Count) tabelas voltaram com o mesmo número de linhas."
    } else {
        # Com a API no ar, uma gravação entre o backup e a contagem também
        # aparece aqui; rode de novo com a API parada antes de desconfiar.
        Write-Warning "$diferentes tabela(s) diferente(s)."
        exit 1
    }
}

# --- agendamento ----------------------------------------------------------

function Agendar {
    $bat = Join-Path $PSScriptRoot 'backup.bat'
    $acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$bat`" --silencioso"
    $gatilho = New-ScheduledTaskTrigger -Daily -At '12:00'
    # StartWhenAvailable: notebook desligado ao meio-dia faz o backup assim que
    # ligar, em vez de pular o dia.
    $opcoes = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
    Register-ScheduledTask -TaskName 'SaudeConecta - backup diario' -Action $acao -Trigger $gatilho `
        -Settings $opcoes -Description 'Backup diario do banco saudeconecta (database\backup.bat)' -Force | Out-Null
    Write-Host 'Tarefa criada: backup todo dia às 12:00 (ou assim que o computador ligar).'
    Write-Host 'Para remover: Unregister-ScheduledTask -TaskName "SaudeConecta - backup diario"'
}

switch ($Acao) {
    'backup'    { Fazer-Backup | Out-Null }
    'restaurar' { Restaurar }
    'teste'     { Testar-Restauracao }
    'agendar'   { Agendar }
}
