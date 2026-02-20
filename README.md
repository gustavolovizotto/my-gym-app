<div align="center">
  <img src="public/MyGymAppLogo.svg" alt="MY GYM Logo" width="120" height="120" />
  <h1>🏋️‍♂️ MY GYM</h1>
  <p><strong>Seu treino, sem limites. O app de musculação definitivo com arquitetura Offline-First.</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

  <br/>
  
  ### 🚀 [Acesse o App Online Aqui](https://my-gym-app-seven.vercel.app/auth)
</div>

<br/>

## 📖 Sobre o Projeto

O **MY GYM** nasceu de uma dor real: **o sinal de internet nas academias costuma ser péssimo**. 
Quantas vezes você já tentou abrir seu app de treino no meio da série e ele ficou carregando infinitamente porque você estava no subsolo da academia?

Este projeto é um **Progressive Web App (PWA)** focado em musculação que resolve esse problema utilizando uma arquitetura **Offline-First**. Você pode visualizar seus treinos, registrar suas cargas e iniciar seus cronômetros de descanso mesmo em modo avião. Assim que a conexão retornar, o app sincroniza tudo silenciosamente com a nuvem.

---

## ✨ Funcionalidades e Diferenciais

### 📡 1. Arquitetura Offline-First (O Grande Diferencial)
* **Por que?** Academias frequentemente têm zonas cegas de Wi-Fi e 4G/5G.
* **Como funciona:** Utilizamos **Dexie.js (IndexedDB)** para armazenar toda a estrutura do seu treino localmente no celular e **Serwist (Service Workers)** para fazer o cache da interface. O app carrega instantaneamente, lê os dados locais e, em background, sincroniza com o **Supabase**.

### 📱 2. Experiência Nativa (PWA)
* **Por que?** Ninguém quer baixar mais um app pesado da loja de aplicativos.
* **Como funciona:** O MY GYM pode ser "Instalado" diretamente do navegador (Safari/Chrome) para a tela inicial do celular. Ele roda em tela cheia, sem barra de navegação, parecendo e se comportando exatamente como um app nativo (iOS e Android).

### 🏗️ 3. Estrutura Hierárquica Real de Treino
* **Por que?** Apps comuns limitam a organização. Fisiculturistas e atletas dividem seus treinos em blocos lógicos.
* **Como funciona:** O app suporta 3 níveis de profundidade:
  1. **Divisão** (Ex: *Bulking PPL*, *Cutting ABC*)
  2. **Treino/Split** (Ex: *Push A*, *Pull B*, *Legs*)
  3. **Exercícios** (Ex: *Supino Reto*, *Crucifixo*)

### ⏱️ 4. Cronômetro de Descanso com Push Notifications
* **Por que?** O tempo de descanso é crucial para a hipertrofia. Ficar rolando o feed do Instagram faz você perder o tempo da série.
* **Como funciona:** Ao finalizar uma série, um timer local é iniciado. Quando o tempo acaba, o Service Worker dispara uma **Notificação Push** no seu celular avisando que é hora de voltar para a barra.

### 📈 5. Dashboard de Evolução (Analytics)
* **Por que?** O que não é medido não pode ser melhorado. Ver o progresso é a maior fonte de motivação.
* **Como funciona:** Uma aba dedicada com gráficos interativos (usando **Recharts**) que mostram a evolução do seu **Volume de Treino** (Carga × Repetições) e **Carga Máxima** ao longo do tempo.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com o que há de mais moderno no ecossistema React:

* **[Next.js 16 (App Router)](https://nextjs.org/):** Framework React para renderização e roteamento.
* **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e DX.
* **[Supabase](https://supabase.com/):** Backend as a Service (PostgreSQL + Autenticação).
* **[Dexie.js](https://dexie.org/):** Wrapper minimalista para o IndexedDB (Banco de dados local do navegador).
* **[Serwist](https://serwist.build/):** Gerenciamento de Service Workers e PWA (sucessor do Workbox).
* **[Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/):** Estilização utilitária e componentes de UI bonitos e acessíveis.
* **[Recharts](https://recharts.org/):** Biblioteca de gráficos focada em React.
* **[Lucide React](https://lucide.dev/):** Ícones consistentes e leves.

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
* Node.js (v18+)
* Gerenciador de pacotes (npm, yarn, pnpm ou bun)
* Uma conta no [Supabase](https://supabase.com/) (Gratuita)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/gustavolovizotto/my-gym-app.git
   cd my-gym-app
   ```

2. **Instale as dependências:**
   ```bash
   yarn install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto e adicione suas chaves do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```

4. **Configure o Banco de Dados (Supabase):**
   Rode o script SQL contido no arquivo `supabase_schema.sql` no SQL Editor do seu painel do Supabase para criar as tabelas e políticas de segurança (RLS).

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   yarn dev
   ```
   Acesse `http://localhost:3000` no seu navegador.

> **Modo Offline (recomendado):**
> 1. Rode em produção local com build automático:
>    ```bash
>    yarn start:offline
>    ```
> 2. Abra o app **com internet** na primeira execução para aquecer o cache.
> 3. Depois, você pode testar em *Offline* no DevTools (*Network → Offline*).

---

## 🤝 Como Contribuir

Este é um projeto público e contribuições são muito bem-vindas! Se você tem ideias para novas funcionalidades, encontrou um bug ou quer melhorar o código:

1. Faça um **Fork** do projeto.
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeatureIncrivel`).
3. Faça o commit das suas alterações (`git commit -m 'Add: Minha nova feature'`).
4. Faça o push para a branch (`git push origin feature/MinhaFeatureIncrivel`).
5. Abra um **Pull Request**.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
<div align="center">
  Feito com ☕ e 🏋️‍♂️ por Gustavo Lovizotto
</div>
