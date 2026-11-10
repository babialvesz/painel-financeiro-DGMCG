# Painel de Acompanhamento Financeiro das Unidades

Aplicação web que mostra a situação de **déficit e superávit** das unidades de saúde geridas por OSS, com ranking das situações mais preocupantes, visão mês a mês e ficha detalhada por unidade.

- **Front:** React 18 + Vite + Chart.js (tema escuro/claro)
- **Dados:** lidos direto da planilha Google (abas `PAINEL_RESULTADO` e `PAINEL_ITENS`), com login Google
- **Acesso:** só quem tem permissão de leitura na planilha vê os dados reais. Nenhum dado fica no repositório.

## Telas

Princípio: **cada unidade tem orçamento próprio, então o painel nunca soma valores de unidades diferentes.** A visão geral usa contagens ("25 de 46 no vermelho") e comparações de peso no orçamento de cada unidade.

| Tela | O que mostra |
|---|---|
| **Visão geral** | Quantas unidades estão no vermelho/azul/alerta, evolução mês a mês dessas contagens, unidades que mais precisam de atenção (valores de cada uma), situação mais grave, no que as unidades mais gastam (peso médio) |
| **Unidades** | Cartões por unidade (recebeu, gastou, sobrou/faltou, mês a mês) ou tabela com pontos por mês; filtros, busca e ordenação |
| **Unidade** | Recebeu, gastou, sobrou/faltou, meses no vermelho, gráficos mensais, destaques, para onde foi o dinheiro, maiores gastos, gastos que mais oscilaram, todos os gastos (árvore ou ranking), tabela mês a mês |
| **Detalhe do gasto** | Painel lateral: mês a mês, composição, comparação com unidades parecidas |
| **Gastos por item** | Cada tipo de gasto: em quantas unidades aparece, peso médio e onde pesa mais; matriz unidade × grupo |
| **Gasto (item)** | Ranking das unidades por peso ou valor, composição e tabela detalhada |
| **Descontos** | Descontos, devoluções e compensações: total, por unidade, por objeto contratual, por mês e todos os lançamentos (com nº SEI e justificativa). Também aparece na página de cada unidade |

Filtros globais (ano, período, tipo, porte). Toda tabela tem **Exportar** (CSV para Excel). Tema escuro (padrão) e claro. Cada tela tem endereço próprio.

## Como funciona

```
BASE_CONSOLIDADA (planilha)
      │  Apps Script: painel_gerarDados()  (rodar no fim do consolidarBase)
      ▼
PAINEL_UNIDADES + PAINEL_ITENS + PAINEL_VALORES (abas leves)
      │  Google Sheets API + login Google do usuário
      ▼
App React (GitHub Pages hoje / servidor da SES depois)
```

**Regras dos dados:** só bloco DRE · resultado = "Resultado (Déficit/Superávit) Antes das Provisões" · gasto = "Total de Despesas Operacionais Antes das Provisões" (= soma dos grupos 1 a 12) · recebido = "Total de Receitas Operacionais" · competências futuras ignoradas · itens identificados pelo código.

**Regras das análises:**
- Rankings de itens usam **itens finais** (o pai não entra junto com os filhos).
- Variação = maior mês − menor mês; variação % = (máx − mín) ÷ mín.
- Unidades parecidas = mesmo tipo e porte (exceto "Não classificado").
- Na visão da rede, meses com menos de 70% das unidades prestando contas aparecem como incompletos (barra clara) e ficam fora das variações.

## Configuração

### 1. Planilha (Apps Script)
1. Na planilha da `BASE_CONSOLIDADA`: **Extensões → Apps Script**. Apague `PainelWebApp`/`PainelAbas` e o `index` se existirem.
2. Crie o arquivo `PainelDados` e cole `scripts/apps-script/PainelDados.gs`.
3. Rode `painel_gerarDados` com `DRY_RUN: true` e confira os totais no log.
4. Mude para `DRY_RUN: false` e rode de novo. São criadas as abas `PAINEL_UNIDADES`, `PAINEL_ITENS` e `PAINEL_VALORES`.
5. No fim da função `consolidarBase()`, adicione `painel_gerarDados();` para atualizar junto com o trigger diário.

### 2. Google Cloud (login)
1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto.
2. **APIs e serviços → Biblioteca**: ative a **Google Sheets API**.
3. **Tela de consentimento OAuth**: tipo *Externo*, preencha nome/e-mail, adicione o escopo `.../auth/spreadsheets.readonly` e, em **Usuários de teste**, adicione os e-mails de quem vai usar (até 100).
4. **Credenciais → Criar credenciais → ID do cliente OAuth** → *Aplicativo da Web*.
   Em **Origens JavaScript autorizadas**, adicione:
   - `https://SEU-USUARIO.github.io`
   - `http://localhost:5173` (para testar no PC)
5. Copie o **ID do cliente**.

> Enquanto o app estiver em modo "teste", o Google mostra o aviso "app não verificado" no primeiro login. É só clicar em **Continuar**.

### 3. GitHub
1. Suba este projeto num repositório.
2. **Settings → Secrets and variables → Actions → aba Variables**, crie:
   - `VITE_GOOGLE_CLIENT_ID` = ID do cliente OAuth
   - `VITE_PLANILHA_ID` = ID da planilha (trecho da URL entre `/d/` e `/edit`)
3. **Settings → Pages → Source: GitHub Actions**.
4. Cada push na `main` publica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
   Para publicar de novo sem alterar código: **Actions → Publicar no GitHub Pages → Run workflow**.

## Rodar no computador

```bash
npm install

# Opção A: com a planilha (login Google)
cp .env.example .env        # preencha os dois IDs
npm run dev                 # http://localhost:5173

# Opção B: sem login, com um CSV da BASE_CONSOLIDADA
python scripts/gerar_dados_local.py BASE_CONSOLIDADA.csv
npm run dev:local

# Gerar um HTML único com os dados embutidos (para validar/apresentar offline)
npm run build:arquivo       # → dist-arquivo/painel-financeiro.html
```

> `public/dados-local.json` e `dist-arquivo/` contêm dados reais e estão no `.gitignore`. Não publique.

## Aba de descontos

O painel lê a aba **DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO** direto da planilha (sem Apps Script), do jeito que a equipe preenche:

- Linha 1 = título, linha 2 = cabeçalho `UNIDADE | COMPETÊNCIA | VALOR | OBJETO CONTRATUAL | SEI | CLASSIFICAÇÃO | JUSTIFICATIVA` (colunas achadas pelo nome).
- **Com deduções** (cartões e página da unidade) = Resultado − soma dos lançamentos da unidade no período.
- A linha **TOTAL** e linhas vazias são ignoradas. Competência aceita `fev./26`, `02/2026` ou data.
- A unidade é ligada à página dela no painel pelo nome. Quando o nome não bate, configure em `src/config.js` → `vinculoDescontos` (código da unidade → aba do painel).
- Se essa aba não puder ser lida, o resto do painel continua funcionando e a tela de descontos mostra o aviso.

Para testar localmente: `python scripts/gerar_dados_local.py BASE.csv --descontos DESCONTOS.csv`.

## Áreas e perfis

O painel tem uma área por gerência, cada uma lendo a sua planilha:

| Área | Gerência | Planilha (config.json) |
|---|---|---|
| Financeiro (`#/`) | GGCCG | `planilhaId` |
| Produção (`#/producao`) | GMCG | `planilhaProducaoId` (aba `Dados_Tratados`) |

**Perfis:** em `planilhaPerfisId` vai o ID da planilha "controle de acesso aos paineis" (primeira aba), com as colunas `nome | email | acessos permitidos`:

| nome | email | acessos permitidos |
|---|---|---|
| Fulana | fulana@exemplo.com | GGCCG |
| Beltrano | beltrano@exemplo.com | GMCG |
| Ciclana | ciclana@exemplo.com | GMCG, GGCCG |

`GGCCG` vê o Financeiro, `GMCG` vê a Produção; vários separados por vírgula (`ADMIN` = tudo). Quem não está na lista não entra. A planilha precisa estar compartilhada (leitura) com todos os e-mails da lista. Outras colunas são ignoradas — **não guarde senhas nela**: o login é feito pela conta Google.

O perfil organiza o que cada pessoa vê; quem protege os **dados** continua sendo o compartilhamento de cada planilha no Google.

## Produção (GMCG)

**Início:** resumo (OSS, hospitais, UPAs, UPAEs, carretas, % de metas cumpridas), busca de unidade e duas formas de navegar: **mapa interativo** de Pernambuco (Leaflet + OpenStreetMap; cor do ponto por metas cumpridas ou por tipo) e **cartões por OSS**. As coordenadas, cidade, endereço e CNES vêm da aba `Unidades` (e `OSS (legenda)`) da planilha "BD Unidades OSS - Consolidado" (`planilhaCadastroId`). Coordenadas sem a vírgula decimal (ex.: `-807265`) são corrigidas; fora de Pernambuco são ignoradas. O fundo do mapa vem da CARTO (dados OpenStreetMap); o navegador precisa acessar `basemaps.cartocdn.com`.


Lê a aba `Dados_Tratados` (`Ano | Tipo | MACRO | GERES | OSS | Unidade | C.G. | Indicador | Mês | Meta | Produção | % | Status_Meta`). Meta cumprida = produção ≥ meta do mês (recalculado; a coluna Status_Meta não é usada). Telas: visão geral, unidades, unidade (indicadores e mês a mês) e indicadores (ranking das unidades). Cada unidade é avaliada pelas próprias metas; nada é somado entre unidades.

## Aba de entregas (DATAS DE ENTREGA)

A tela **Entregas** lê direto a aba `DATAS DE ENTREGA` (cronograma de entrega das PCFs), sem Apps Script. Colunas achadas pelo cabeçalho: `TIPO | OSS | ANO | UNIDADE | Janeiro … dezembro`; cada célula é a data em que a unidade entregou a competência (`N/H` = não se aplica; vazio = não entregou).

- **Prazo:** dia 25 do mês seguinte; se cair em fim de semana ou feriado, vale o próximo dia útil (`CONFIG.entregas`).
- **Situações:** no prazo · no prazo (dia útil seguinte) · com atraso · não entregou (prazo vencido) · aguardando (dentro do prazo) · data a conferir (entrega registrada antes do fim do mês da competência) · não se aplica.
- Visão geral (pontualidade, ranking de atrasos, calendário de todas as unidades) e página por unidade; a página financeira de cada unidade mostra a linha do tempo das entregas.
- Ligação com as unidades do painel pela sigla/nome; exceções em `CONFIG.vinculoEntregas`.

## Identidade e nomes

- **Logos:** `public/logo-ses.png` (Secretaria da Saúde / Governo de PE) e `public/logo-dgmcg.png` (DGMCG). Título e créditos do rodapé em `src/config.js` → `instituicao`.
- **Nomes de unidades:** padronizações em `src/config.js` → `nomesPadrao` (chave = nome da aba). Ex.: HNSA.
- **Tema:** abre no claro; o botão no menu alterna para o escuro (lembrado no navegador).

## Outras regras

- **Alerta:** unidade com 3 meses ou mais no vermelho no ano (ajustável em `src/config.js`).
- **Situação mais grave:** mais meses no vermelho; empate → maior déficit.
- Orçamentos são independentes: o painel soma recebido e gasto da rede, mas **não** mostra saldo da rede.

## Configuração no servidor (sem gerar o site de novo)

O arquivo `config.json`, ao lado do `index.html`, define o ID do cliente OAuth do Google e o ID da planilha. Basta editá-lo no servidor; o painel lê esse arquivo toda vez que abre. Se ele não existir, valem os valores do `.env` usados no build.

```json
{ "googleClientId": "xxxx.apps.googleusercontent.com", "planilhaId": "1yVDPy..." }
```

O build **nunca** inclui `dados-local.json` (dados de teste).

## Migrar para o servidor

O `dist/` gerado por `npm run build` é estático: roda em Apache, Nginx ou IIS. Para trocar a fonte de dados (ex.: API ou banco da SES), basta criar um serviço com `carregar()` devolvendo o mesmo formato de `src/services/sheets.js` (unidades, itens, valores) e usá-lo em `src/hooks/useCarregamento.js`.

## Para a TI: publicar no servidor da SES

O painel é um site estático. Não usa banco de dados, servidor de aplicação nem guarda nenhum dado: cada pessoa entra com a própria conta Google e o navegador lê a planilha direto do Google.

1. Gerar os arquivos: `npm ci` e depois `npm run build` (Node 20). O resultado fica na pasta `dist/`. (Atalho: a cada atualização, o GitHub já gera essa pasta; ela fica em Actions > última execução > Artifacts > "site".)
2. Copiar o conteúdo de `dist/` para uma pasta do servidor web (Apache, Nginx ou IIS).
3. **O endereço precisa ser HTTPS.** O login do Google não funciona em `http://` (só em `localhost`).
4. O navegador do usuário precisa acessar `accounts.google.com` e `sheets.googleapis.com`.
5. Não deixar o `config.json` em cache (ex.: `Cache-Control: no-cache`), para que mudanças nele valham na hora.
6. Informar à DGMCG o endereço final (ex.: `https://painel.saude.pe.gov.br`). A DGMCG precisa cadastrar esse endereço em "Origens JavaScript autorizadas" no Google Cloud, senão o login dá erro.

Para atualizar o site depois de uma mudança no código: `git pull`, `npm run build` e copiar o `dist/` de novo. Os **dados** não exigem nada da TI: atualizam sozinhos pela planilha.
