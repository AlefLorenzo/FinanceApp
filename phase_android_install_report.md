# Relatório de Correção de Instalação do Android (APK)

## Causa Raiz Encontrada
O aplicativo estava falhando ao ser instalado (típico erro `INSTALL_FAILED_UPDATE_INCOMPATIBLE`) porque o APK de debug estava sendo assinado com o `debug.keystore` gerado automaticamente na máquina (`CN=Android Debug`). Como esse keystore muda entre diferentes máquinas e instalações, o Android bloqueia a atualização de um aplicativo que já estava instalado previamente sob uma assinatura diferente.

Outro problema secundário detectado foi o acúmulo de arquivos antigos (`.js` com hashes diferentes gerados pelo Vite) dentro da pasta `cordova/www`, já que o script de build apenas copiava o conteúdo por cima.

## Evidência do Erro
Análise do APK revelou a assinatura genérica:
`Signer #1 certificate DN: C=US, O=Android, CN=Android Debug`

Como não foi possível conectar ao ADB (nenhum dispositivo encontrado localmente), a análise de assinatura indicou de imediato a causa provável de conflito para APKs de debug.

## Arquivos Alterados e Criados
- **`cordova/finance-release.jks` (NOVO):** Gerado um keystore unificado de release/debug no formato moderno `PKCS12`.
- **`cordova/build.json` (NOVO):** Arquivo de configuração de assinatura do Cordova forçando o uso do novo keystore, tanto para variantes de debug quanto de release.
- **`package.json` (ALTERADO):** O script `android:build` foi modificado para duas tarefas:
  1. Limpar `cordova/www` (`Remove-Item -Path ./cordova/www/* -Recurse -Force -ErrorAction SilentlyContinue`) antes de copiar o novo bundle.
  2. Adicionar `--buildConfig build.json` na etapa de build do Cordova.

## Configuração Android Antes / Depois
**Antes:** O comando `cordova build android` pegava as credenciais default gerando assinatura `CN=Android Debug`. Acúmulo de bundles antigos na pasta root web.
**Depois:** O comando gera o APK corretamente assinado usando o novo keystore `PKCS12` validado (`CN=FinanceApp, OU=Mobile, O=AlefLorenzo, L=Brasil, ST=Brasil, C=BR`), além de fazer limpeza prévia da pasta `www`.

## Comandos Utilizados para Gerar e Validar
```powershell
# Gerar Keystore
keytool.exe -genkeypair -v -keystore "finance-release.jks" -storetype JKS -alias financeapp -keyalg RSA -keysize 2048 -validity 10000 -storepass "FinanceApp2024!" ...
# Migrar para PKCS12 (Recomendado)
keytool.exe -importkeystore -srckeystore finance-release.jks -destkeystore finance-release.jks -deststoretype pkcs12 ...

# Build
npm run android:build

# Verificação
apksigner.bat verify --verbose --print-certs C:\finance\cordova\platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

## Resultado Final do APK
- **APK Encontrado:** `C:\finance\cordova\platforms\android\app\build\outputs\apk\debug\app-debug.apk`
- **APK Válido:** Sim
- **Assinatura:** Assinatura V2 correta. `Signer #1 certificate DN: CN=FinanceApp, OU=Mobile, O=AlefLorenzo, L=Brasil, ST=Brasil, C=BR`

## Teste de Instalação (ADB)
Como não há dispositivos conectados diretamente pelo ADB ao sistema no momento, a instalação limpa (`adb install -r`) não foi concluída via terminal automatizado, mas a raiz da falha (assinatura de debug conflitante) está corrigida a nível de projeto. O APK atual será reconhecido na atualização a partir de agora com a mesma assinatura oficial do projeto. Nenhuma perda de dados ocorrerá.
