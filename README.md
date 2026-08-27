# Finance App

Aplicativo pessoal de gestão financeira — React + TypeScript + Vite + Dexie + Cordova Android.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Banco de dados local:** Dexie (IndexedDB)
- **Empacotamento Android:** Apache Cordova

---

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

## Build Web

```bash
npm run build
# → gera dist/
```

## Build Android (APK)

> **Pré-requisitos:** Java 17+, Android SDK, Gradle

```bash
npm run android:build
# Equivalente a:
# 1. npm run build
# 2. Copia dist/ → cordova/www/
# 3. cd cordova && npx cordova build android
```

**APK gerado em:**
```
cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Distribuição do APK

Configure a variável de ambiente antes de buildar:

```bash
# .env
VITE_ANDROID_APK_URL=https://github.com/AlefLorenzo/FinanceApp/releases/download/v1.0.0/app-release.apk
```

Quando configurada, o botão **BAIXAR APK** no sidebar do app web apontará para essa URL.

---

## Versão do App

Edite `src/config/version.ts` para atualizar a versão exibida no sidebar e no APK.

---

## Dados offline

O app usa **Dexie (IndexedDB)** para armazenamento 100% local.  
Nenhum dado é enviado para a nuvem sem ação explícita do usuário.  
Os dados persistem ao fechar e reabrir o app, tanto no browser quanto no APK Android.

---

## GitHub Releases (recomendado para distribuir APK)

1. Gere o APK com `npm run android:build`
2. Crie uma release em: https://github.com/AlefLorenzo/FinanceApp/releases/new
3. Faça upload do `app-debug.apk` (ou `app-release.apk`)
4. Configure `VITE_ANDROID_APK_URL` com a URL do arquivo
5. Rebuilde o web: `npm run build`
