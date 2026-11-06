"""
Embute public/dados-local.json no HTML único gerado por `npm run build:arquivo`.
Resultado: dist-arquivo/painel-financeiro.html (abre com duplo clique, sem internet para os dados).
ATENÇÃO: o arquivo final contém os dados reais. Não publique.
"""
import base64, json, pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
dados = (raiz / 'public' / 'dados-local.json').read_text(encoding='utf-8')
json.loads(dados)  # valida
html = (raiz / 'dist-arquivo' / 'index.html').read_text(encoding='utf-8')
html = html.replace('<script src="https://accounts.google.com/gsi/client" async defer></script>', '')
# logos e imagens de public/ viram data URI (o HTML único não tem pasta ao lado)
for img in (raiz / 'public').glob('*.png'):
    uri = 'data:image/png;base64,' + base64.b64encode(img.read_bytes()).decode()
    html = html.replace('./' + img.name, uri)
bloco = '<script>window.__DADOS__=' + dados.replace('</', '<\\/') + ';</script>'
html = html.replace('</head>', bloco + '\n</head>', 1)
saida = raiz / 'dist-arquivo' / 'painel-financeiro.html'
saida.write_text(html, encoding='utf-8')
print(f'OK -> {saida} ({saida.stat().st_size // 1024} KB)')
