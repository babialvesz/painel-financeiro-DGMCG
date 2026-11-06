"""
Gera public/dados-local.json a partir de um CSV da BASE_CONSOLIDADA
(Arquivo > Fazer download > CSV, com a aba BASE_CONSOLIDADA aberta).

Serve para desenvolver/testar o painel no computador sem login.
O arquivo gerado NÃO vai pro GitHub (está no .gitignore).

Uso:
  python scripts/gerar_dados_local.py caminho/BASE_CONSOLIDADA.csv [AAAA-MM limite] [--descontos caminho/DESCONTOS.csv]

O CSV de descontos é a aba DESCONTOS_DEVOLUÇÃO_COMPENSAÇÃO baixada como CSV. Ele entra "cru"
(como na planilha); o próprio painel interpreta, igual faz ao ler do Google Sheets.

Mesmas regras do Apps Script (PainelDados.gs):
  - só bloco DRE, valores diferentes de zero
  - ignora competências depois do mês atual (ou do limite informado)
  - itens identificados pelo código (ex.: "6.1.1.1")
  - totais: REC (receitas operacionais), DESP (despesas antes das provisões), RES (resultado antes das provisões)
"""
import csv, json, re, sys, unicodedata, datetime, pathlib, collections

TOTAIS = {
    'TOTAL DE RECEITAS OPERACIONAIS': 'REC',
    'TOTAL DE REPASSES': 'REP',
    'TOTAL DE OUTRAS RECEITAS': 'OREC',
    'TOTAL DE DESPESAS OPERACIONAIS ANTES DAS PROVISOES': 'DESP',
    'RESULTADO (DEFICIT/SUPERAVIT) ANTES DAS PROVISOES': 'RES',
}
COD = re.compile(r'^(\d+(?:\.\d+)*)\.?\s+(.*)$')


def norm(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s).upper().strip()


def numero(s):
    s = str(s).strip()
    if not s:
        return 0.0
    if ',' in s:
        s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0.0


def competencia(s):
    s = str(s).strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        return f'{m[3]}-{int(m[2]):02d}'
    m = re.match(r'^(\d{4})-(\d{1,2})', s)
    if m:
        return f'{m[1]}-{int(m[2]):02d}'
    return None


def main():
    args = sys.argv[1:]
    descontos_csv = None
    if '--descontos' in args:
        k = args.index('--descontos'); descontos_csv = args[k + 1]; del args[k:k + 2]
    origem = args[0]
    limite = args[1] if len(args) > 1 else datetime.date.today().strftime('%Y-%m')
    linhas = [l for l in csv.reader(open(origem, encoding='utf-8')) if l]
    cab = [norm(c) for c in linhas[0]]
    i = {c: cab.index(c) for c in ['ABA', 'UNIDADE', 'OSS', 'GRUPO', 'PORTE', 'BLOCO', 'RUBRICA', 'COMPETENCIA', 'VALOR']}
    i_atual = cab.index('ATUALIZADO_EM') if 'ATUALIZADO_EM' in cab else None

    unidades, itens = {}, {}
    valores = collections.defaultdict(float)
    atualizado, futuros = '', collections.Counter()

    for l in linhas[1:]:
        if len(l) < len(cab):
            continue
        aba = l[i['ABA']].strip()
        comp = competencia(l[i['COMPETENCIA']])
        if not aba or not comp:
            continue
        if i_atual is not None and l[i_atual].strip():
            atualizado = l[i_atual].strip()
        unidades.setdefault(aba, {
            'aba': aba, 'nome': l[i['UNIDADE']].strip() or aba, 'oss': l[i['OSS']].strip(),
            'grupo': l[i['GRUPO']].strip(), 'porte': l[i['PORTE']].strip(),
        })
        if norm(l[i['BLOCO']]) != 'DRE':
            continue
        v = numero(l[i['VALOR']])
        if v == 0:
            continue
        if comp > limite:
            futuros[(aba, comp)] += 1
            continue
        rub = re.sub(r'\s+', ' ', l[i['RUBRICA']]).strip()
        chave = TOTAIS.get(norm(rub))
        if not chave:
            m = COD.match(rub)
            if not m:
                continue
            chave = m[1]
            itens.setdefault(chave, m[2].strip())
        valores[(aba, comp, chave)] += v

    ordem = lambda c: [int(p) for p in c.split('.')]
    saida = {
        'atualizado': atualizado,
        'unidades': sorted(unidades.values(), key=lambda u: u['nome']),
        'itens': [{'c': c, 'n': itens[c]} for c in sorted(itens, key=ordem)],
        'valores': [[a, comp, ch, round(v, 2)] for (a, comp, ch), v in sorted(valores.items())],
        'descontosLinhas': [l for l in csv.reader(open(descontos_csv, encoding='utf-8'))] if descontos_csv else [],
    }
    destino = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'dados-local.json'
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(saida, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    print(f'Unidades: {len(unidades)} | Itens: {len(itens)} | Valores: {len(saida["valores"])}')
    print(f'Competências até {limite}; futuras ignoradas: {len(futuros)} combinações unidade/mês')
    print(f'Gerado: {destino} ({destino.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
