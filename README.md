# Gravimetria Cooperativa

Plataforma web instalável (PWA) para cooperativas de reciclagem calcularem e
acompanharem a **gravimetria** dos materiais recicláveis — o percentual de
cada tipo de material (papel, plástico, vidro, metal, rejeito etc.) em uma
amostra pesada.

Funciona no navegador, pode ser **instalada** no computador ou celular como
um app, e continua funcionando **offline** no galpão de triagem (os dados
sincronizam automaticamente quando a internet voltar).

## Como o projeto foi construído

É um site estático (HTML + CSS + JavaScript puro, sem React/Vue e sem etapa
de build/`npm install`). Isso significa que você pode:

- Abrir `index.html` direto no navegador para testar localmente (veja abaixo).
- Hospedar em qualquer serviço de arquivos estáticos — o guia abaixo usa o
  **Firebase Hosting**, que já integra com o mesmo projeto do banco de dados.

O banco de dados é o **Firebase** (Firestore + Authentication), no plano
**Blaze** (pré-pago, só cobra o que passar da cota gratuita generosa que o
Firebase já oferece — veja "Custos" no fim deste documento).

## Passo a passo — criando o projeto Firebase

1. Acesse **console.firebase.google.com** e clique em **"Adicionar projeto"**.
   Dê um nome (ex.: `gravimetria-cooperativa`) e conclua a criação.
2. No menu lateral, vá em **Compilação (Build) → Authentication** → aba
   **Sign-in method** → habilite o provedor **E-mail/senha**.
3. No menu lateral, vá em **Compilação (Build) → Firestore Database** →
   **Criar banco de dados** → escolha uma região próxima (ex.: `southamerica-east1`
   para São Paulo) → inicie em **modo de produção** (as regras de segurança
   já vêm prontas neste projeto, em `firestore.rules`).
4. Faça upgrade para o **plano Blaze**: no canto inferior esquerdo do
   Console, clique no nome do plano atual ("Spark") → **Fazer upgrade** →
   **Blaze (pagamento conforme uso)** → associe uma conta de faturamento do
   Google Cloud (cartão de crédito). Você pode (e deve) configurar um
   **orçamento e alertas** em *Faturamento → Orçamentos e alertas* para ser
   avisado caso o uso ultrapasse a cota gratuita.
5. Ainda no Console, vá em **Configurações do projeto** (ícone de engrenagem
   no topo do menu lateral) → aba **Geral** → role até "Seus apps" → clique
   no ícone **"</>"** (Web) → dê um apelido ao app (ex.: "Gravimetria Web")
   → **não** marque Firebase Hosting nessa tela (faremos isso pelo terminal)
   → **Registrar app**.
6. O Console mostra um bloco `firebaseConfig = { apiKey: ..., ... }`. Copie
   esses valores.

## Configurando o projeto localmente

1. Copie `js/firebase-config.sample.js` para `js/firebase-config.js`.
2. Cole os valores copiados no passo anterior nesse novo arquivo.
3. (Opcional, só se for publicar pelo terminal) Copie `.firebaserc.sample`
   para `.firebaserc` e troque `SEU-PROJECT-ID-AQUI` pelo ID do seu projeto
   (aparece em Configurações do projeto → Geral → "ID do projeto").

> `firebase-config.js` **não é um segredo** — é normal e seguro que ele fique
> visível no código do site publicado; quem protege os dados são as
> **regras de segurança do Firestore** (`firestore.rules`), que garantem que
> cada cooperativa só acessa os próprios dados.

## Testando localmente

Como o app usa módulos JavaScript (`import`/`export`), o navegador exige que
os arquivos sejam servidos por `http://`, não abertos direto como `file://`.
Qualquer servidor estático simples resolve. Com Python instalado:

```bash
cd gravimetria-pwa
python3 -m http.server 8080
```

Depois abra `http://localhost:8080` no navegador.

Ou, se preferir usar o próprio Firebase (recomendado, porque simula o
ambiente real de produção — instale o Node.js antes):

```bash
npm install -g firebase-tools
firebase login
firebase emulators:start --only hosting
```

## Publicando (deploy)

Com o [Node.js](https://nodejs.org) instalado:

```bash
npm install -g firebase-tools
firebase login
cd gravimetria-pwa
firebase deploy
```

Isso publica o site (Hosting) **e** as regras de segurança do Firestore
(`firestore.rules`) de uma vez, usando as configurações em `firebase.json`.
Ao final, o terminal mostra a URL pública (algo como
`https://seu-projeto.web.app`) — é esse link que você compartilha com a
cooperativa. Pelo navegador (celular ou computador), o Chrome/Edge oferece
"Instalar app" na barra de endereço, ou a faixa verde que aparece dentro do
próprio app.

Sempre que editar as regras (`firestore.rules`), rode
`firebase deploy --only firestore:rules` para atualizá-las sem republicar o
site inteiro.

## Como o app está organizado

- **Cooperativas**: cada cooperativa tem seus próprios dados, isolados das
  demais. Quem cria a cooperativa vira o(a) primeiro(a) administrador(a).
- **Código de convite**: gerado automaticamente na criação da cooperativa
  (visível em *Configurações*, para administradores). Compartilhe esse
  código com a equipe — cada funcionário(a) cria a própria conta em
  "Entrar na cooperativa" usando o código, e entra como *operador*. O
  administrador pode gerar um novo código a qualquer momento (invalidando o
  anterior) em caso de vazamento.
- **Papéis**: *administrador* (gerencia categorias, equipe, dados da
  cooperativa e pode editar/excluir registros) e *operador* (usa a
  calculadora, histórico e painel, mas não altera configurações).
- **Categorias de materiais**: vêm com 8 categorias padrão (Papel, Papelão,
  Plástico, Vidro, Metal, Alumínio, Longa Vida, Rejeito), totalmente
  editáveis em *Configurações* — dá para renomear, reordenar, desativar ou
  criar novas. As 8 primeiras categorias ativas recebem cores próprias nos
  gráficos; a partir da 9ª, ficam agrupadas visualmente (mas continuam
  detalhadas nas tabelas, histórico e exportações).
- **Calculadora**: registra data, peso total da amostra e peso de cada
  categoria, calcula os percentuais automaticamente e avisa se a soma das
  categorias destoa muito do peso total informado (possível erro de
  pesagem).
- **Histórico**: lista os registros por período, com detalhe por amostra;
  administradores podem excluir registros incorretos.
- **Painel**: estatísticas e gráficos (composição média do período,
  evolução mensal por categoria) com exportação para **PDF** e **Excel**.
- **Offline**: a calculadora funciona sem internet (os dados ficam
  guardados no aparelho e sincronizam quando a conexão voltar); o app em si
  também abre offline depois da primeira visita, graças ao Service Worker.

## Limitações conhecidas / próximos passos

- O código de convite funciona como uma senha curta (6 caracteres): quem o
  conhece consegue criar uma conta de operador na cooperativa. É prático
  para uso interno da equipe, mas gere um novo código se desconfiar que
  vazou. Uma evolução futura (com Cloud Functions, já que o plano Blaze
  permite) seria trocar por convites por e-mail com expiração automática.
- Não há tela de "esqueci minha senha" nem de troca de foto/avatar — dá para
  adicionar depois usando `sendPasswordResetEmail` do próprio SDK do
  Firebase Auth.
- O tema escuro é parcial (aplica-se à interface, mas os gráficos mantêm
  fundo claro para preservar a legibilidade dos rótulos).

## Custos (plano Blaze)

O plano Blaze só cobra o que **exceder** a cota gratuita mensal do Firebase
(que é a mesma cota do plano Spark, só que sem o bloqueio de uso). Para uma
cooperativa (ou algumas dezenas delas) registrando gravimetrias diariamente,
o uso tende a ficar dentro da cota gratuita — Firestore oferece 50 mil
leituras, 20 mil escritas e 1 GiB de armazenamento gratuitos **por dia**.
Configure alertas de orçamento (passo 4 acima) para ter previsibilidade.
