# Zentrix Frontend 📱💸

Aplicativo multiplataforma (**iOS, Android e Web/PWA**) do ecossistema **Zentrix**, construído com **React Native + Expo** e integrado ao backend Serverless na AWS (**AWS Lambda + Amazon DynamoDB + Google Gemini 2.5 Flash**).

---

## ✨ Destaques da Arquitetura Frontend
- **Autenticação Passwordless Segura (SEC03 + SEC05):** Login via **Telegram Login Widget** com troca server-side de `auth_code` temporário por token opaco (`UUIDv4`), armazenado com criptografia nativa no **Keychain/Keystore** (`expo-secure-store`) no celular e fallback seguro para Web/PWA.
- **Lançamento por Linguagem Natural e CSV C6 Bank:** Envio de frases livres processadas pelo **Google Gemini** e upload autenticado de faturas CSV com categorização automática em lote.
- **Consultor Financeiro IA Integrado:** Card dedicado na aba *Relatórios* que aciona o endpoint `GET ?action=summary` para receber recomendações personalizadas sobre os gastos do mês.
- **Motor Financeiro Isolado (`src/utilitarios/calculadores.js`):** Rateio automático de compras parceladas ao longo dos meses, filtros reais por período (*Este mês*, *Últimos 3 meses*, *Este ano*, *Tudo*) e comparativos reais (*vs. Mês Anterior* e *vs. Mesmo Mês do Ano Anterior*).
- **Modo Claro e Escuro + Safe Area iOS:** Suporte nativo a *Dynamic Island* / *Notch* e alternância persistente de tema.

---

## 🚀 Rodando Localmente

```bash
npm install
npm test
npx expo start -c
```

---

## ☁️ Como Rodar no iPhone (iOS) 24/7 de Forma 100% Gratuita (Sem o PC Ligado)

Como o backend já roda 24/7 na nuvem (**AWS Lambda + DynamoDB**), você pode manter o app disponível 100% do tempo no seu iPhone **sem pagar os US$ 99/ano da Apple** de duas maneiras complementares já configuradas neste repositório:

### Opção A — Nativo dentro do Expo Go na Nuvem (`EAS Update`)
Publica o bundle JS/assets diretamente no CDN global gratuito da Expo:
1. Faça login na sua conta Expo uma única vez:
   ```bash
   npx eas-cli login
   npx eas-cli update:configure
   npx eas-cli update --branch production --message "Deploy inicial 24/7"
   ```
2. Abra o **Expo Go** no iPhone logado na mesma conta Expo (`mandrak24`) — o projeto **Zentrix** aparecerá na aba de projetos publicados e abrirá **24/7 mesmo com seu PC desligado**!
3. **Deploy automático:** Adicione o segredo `EXPO_TOKEN` nas *Actions Secrets* do GitHub (`zentrix-frontend`) — o workflow `.github/workflows/eas-update.yml` publicará novas versões automaticamente a cada `git push`.

### Opção B — App Standalone na Tela de Início do iPhone (PWA na Vercel / Cloudflare Pages)
Permite instalar o ícone do Zentrix direto na Tela de Início do iOS em tela cheia, **sem precisar do Expo Go**:
1. Conecte o repositório `EnzoRibeir/zentrix-frontend` gratuitamente na **Vercel** (ou **Cloudflare Pages**). O arquivo `vercel.json` já configura `npm run build:web` e saída `dist/`.
2. No **Safari** do iPhone, acesse a URL HTTPS gerada → toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. O Zentrix abrirá em modo tela cheia (`standalone`), com ícone próprio e sessão persistente 24/7!
