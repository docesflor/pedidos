/* ═══════════════════════════════════════════
   PEDIDOS — PREÇOS, CARRINHO DE ITENS E COMBO MISTO
   Depende de: shared/sabores-precos.js (window.CATALOGO_DOCES_FLOR,
   window.CATEGORIA_SABOR, precoUnitarioPorFaixa), shared/utils.js
═══════════════════════════════════════════ */

// Aliases locais — mantidos para não precisar reescrever todo o resto do
// código que já usa TABELA_PRECOS / CATEGORIA_SABOR sem prefixo "window."
const TABELA_PRECOS = window.CATALOGO_DOCES_FLOR.precos;
const CATEGORIA_SABOR = window.CATEGORIA_SABOR;

function precoUnitario(sabor, qtd) {
    const cat = CATEGORIA_SABOR[sabor] || 'trad';
    return precoUnitarioPorFaixa(cat, qtd);
}

// ── Combo Misto (Tradicional + Gourmet) ──
function calcularDescontoCombo(qtdTrad, qtdGourmet, qtdFrutas, precoTradAuto, precoGourmetAuto) {
    if (itens.some(i => i.precoManual !== undefined)) return 0;
    if (qtdFrutas > 0) return 0;

    const TABELA_COMBO = {
        '25-25': 70,   // Caixa Mista 50 un
        '50-50': 125,  // Cento Misto 100 un
        '75-25': 120,  // Cento Misto — maioria Trad
        '25-75': 130   // Cento Misto — maioria Gourmet
    };
    const chave = qtdTrad + '-' + qtdGourmet;
    if (TABELA_COMBO[chave] === undefined) return 0;

    const soma = (precoTradAuto * qtdTrad) + (precoGourmetAuto * qtdGourmet);
    return Math.max(0, soma - TABELA_COMBO[chave]);
}

function faixaMaisProxima(pctGour) {
    const faixas = [0, 25, 50, 75, 100];
    return faixas.reduce((prev, curr) => Math.abs(curr - pctGour) < Math.abs(prev - pctGour) ? curr : prev);
}

function calcularValorNormal(qtdTrad, qtdGourmet) {
    function calcCat(qtd, tabela) {
        let valor = 0;
        let restante = qtd;
        const centos = Math.floor(restante / 100);
        valor += centos * tabela[100];
        restante -= centos * 100;
        const caixas50 = Math.floor(restante / 50);
        valor += caixas50 * tabela[50];
        restante -= caixas50 * 50;
        const caixas25 = Math.floor(restante / 25);
        valor += caixas25 * tabela[25];
        restante -= caixas25 * 25;
        valor += restante * tabela.avulso;
        return valor;
    }
    return calcCat(qtdTrad, TABELA_PRECOS.trad) + calcCat(qtdGourmet, TABELA_PRECOS.gourmet);
}

// ====================== ITENS ======================
let itens = [];

function toggleQuantidadeCustomizada(sel) {
    const custom = document.getElementById('quantidadeCustomizada');
    if (sel.value === 'outro') { custom.style.display = 'block'; custom.focus(); }
    else { custom.style.display = 'none'; custom.value = ''; }
}

function adicionarItem() {
    const sabor     = document.getElementById('sabor').value;
    const formato   = document.getElementById('formato').value;
    const tipoForma = document.getElementById('tipoForma').value;
    let   cor       = document.getElementById('cor').value;
    if (cor === 'Outra') cor = document.getElementById('corCustomizada').value;
    const selQtd = document.getElementById('quantidade');
    const quantidade = selQtd.value === 'outro'
        ? parseInt(document.getElementById('quantidadeCustomizada').value)
        : parseInt(selQtd.value);

    if (!sabor)    { toast('❌ Selecione um sabor.', 'erro');    return; }
    if (!formato)  { toast('❌ Selecione o formato.', 'erro');   return; }
    if (!tipoForma){ toast('❌ Selecione a forminha.', 'erro');  return; }
    if (!cor)      { toast('❌ Selecione uma cor.', 'erro');     return; }
    if (!quantidade || quantidade <= 0) { toast('❌ Informe a quantidade.', 'erro'); return; }

    itens.push({ id: String(Date.now()) + String(Math.floor(Math.random()*1000)), sabor, formato, tipoForma, cor, quantidade });
    renderizarItens();
    atualizarValorBrigadeiros();
    document.getElementById('sabor').value = '';
    document.getElementById('formato').value = '';
    document.getElementById('tipoForma').value = '';
    document.getElementById('cor').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('quantidadeCustomizada').style.display = 'none';
    document.getElementById('quantidadeCustomizada').value = '';
    document.getElementById('corCustomizada').style.display = 'none';
    const btn = document.getElementById('btnAdicionarItem');
    btn.textContent = '✓ Item adicionado!';
    btn.style.background = 'var(--green)';
    setTimeout(() => { btn.textContent = '+ Adicionar Item'; btn.style.background = ''; }, 1800);
}

function renderizarItens() {
    const list = document.getElementById('itensList');
    list.innerHTML = '';
    const qtdTrad    = itens.filter(i => CATEGORIA_SABOR[i.sabor] === 'trad').reduce((s,i) => s+i.quantidade, 0);
    const qtdFrutas  = itens.filter(i => CATEGORIA_SABOR[i.sabor] === 'frutas').reduce((s,i) => s+i.quantidade, 0);
    const qtdGourmet = itens.filter(i => CATEGORIA_SABOR[i.sabor] === 'gourmet').reduce((s,i) => s+i.quantidade, 0);
    const precoTradAuto    = precoUnitarioPorFaixa('trad', qtdTrad);
    const precoFrutasAuto  = precoUnitarioPorFaixa('frutas', qtdFrutas);
    const precoGourmetAuto = precoUnitarioPorFaixa('gourmet', qtdGourmet);
    function gerarFaixas(cat) {
        const tabela = TABELA_PRECOS[cat];
        const niveis = [['avulso','Avulso'], [25,'Caixa 25'], [50,'Caixa 50'], [75,'Caixa 75'], [100,'Cento 100']];
        return niveis.map(([chave, nome]) => {
            const valorExato = chave === 'avulso' ? tabela.avulso : tabela[chave] / chave;
            return { label: `${nome} — R$ ${valorExato.toFixed(2).replace('.', ',')}/un`, valor: valorExato };
        });
    }
    const faixasTrad    = gerarFaixas('trad');
    const faixasFrutas  = gerarFaixas('frutas');
    const faixasGourmet = gerarFaixas('gourmet');
    const grupos = [
        { cat:'trad',    label:'🍫 Tradicionais', cor:'#92400E', bg:'#FEF3C7', precoAuto:precoTradAuto,    faixas:faixasTrad    },
        { cat:'frutas',  label:'🍓 Frutas',        cor:'#065F46', bg:'#D1FAE5', precoAuto:precoFrutasAuto,  faixas:faixasFrutas  },
        { cat:'gourmet', label:'✨ Gourmet',        cor:'#5B21B6', bg:'#EDE9FE', precoAuto:precoGourmetAuto, faixas:faixasGourmet }
    ];
    grupos.forEach(grupo => {
        const itensCat = [...itens].filter(i => (CATEGORIA_SABOR[i.sabor]||'trad') === grupo.cat).sort((a,b) => a.sabor.localeCompare(b.sabor));
        if (itensCat.length === 0) return;
        const header = document.createElement('div');
        header.style.cssText = `display:flex;justify-content:space-between;align-items:center;background:${grupo.bg};border-radius:10px;padding:6px 14px;margin:10px 0 6px;`;
        header.innerHTML = `<span style="font-size:0.82em;font-weight:700;color:${grupo.cor};">${grupo.label}</span><span style="font-size:0.78em;font-weight:600;color:${grupo.cor};">${itensCat.reduce((s,i)=>s+i.quantidade,0)} un.</span>`;
        list.appendChild(header);
        itensCat.forEach(item => {
            const precoAuto    = grupo.precoAuto;
            const precoEfetivo = item.precoManual !== undefined ? item.precoManual : precoAuto;
            const subtotal     = (precoEfetivo * item.quantidade).toFixed(2).replace('.', ',');
            const nomeSabor    = item.sabor.replace('Chocolate Gourmet', 'Choc. Gourmet');
            const temDesconto  = item.precoManual !== undefined && item.precoManual < precoAuto;
            const opcoesHTML   = grupo.faixas.map(f => {
                const partes = f.label.split(' — ');
                const nome = partes[0];
                const preco = (partes[1]||'').replace('/un','').trim();
                return `<button type="button" onclick="aplicarPrecoManual('${item.id}',${f.valor},${grupo.precoAuto})" style="flex:1 1 calc(33% - 4px);min-width:60px;max-width:80px;padding:6px 4px;border:2px solid ${precoEfetivo===f.valor?'var(--amber)':'var(--cream-dark)'};border-radius:10px;background:${precoEfetivo===f.valor?'var(--amber)':'var(--white)'};color:${precoEfetivo===f.valor?'var(--white)':'var(--brown-dark)'};font-family:'DM Sans',sans-serif;cursor:pointer;line-height:1.3;text-align:center;transition:all 0.2s;"><span style="display:block;font-size:0.72em;font-weight:600;">${nome}</span><span style="display:block;font-size:0.78em;font-weight:700;">${preco}/un</span></button>`;
            }).join('');
            const div = document.createElement('div');
            div.className = 'item';
            div.style.flexDirection = 'column';
            div.innerHTML = `
                <div style="display:flex;align-items:flex-start;gap:10px;width:100%;">
                    <div class="item-info" style="flex:1;">
                        <p><strong>${nomeSabor}</strong>${temDesconto ? '<span style="font-size:0.75em;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:50px;margin-left:6px;">💚 desconto</span>' : ''}</p>
                        <p style="color:var(--brown-warm);font-size:0.85em;">Qtd: ${item.quantidade} | B: ${item.formato} | F: ${item.tipoForma}/${item.cor}</p>
                    </div>
                    <button class="btn-editar-item" onclick="editarItemCarrinho('${item.id}')" style="background:var(--amber);color:white;border:none;padding:6px 12px;border-radius:50px;cursor:pointer;font-size:0.8em;font-weight:600;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='var(--laranja-escuro)'" onmouseout="this.style.background='var(--amber)'">✏️ Editar</button>
                    <button class="btn-remove" onclick="removerItem('${item.id}')">Remover</button>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;width:100%;margin:10px 0 6px;">
                    ${opcoesHTML}
                </div>
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding-top:6px;border-top:1px dashed var(--cream-dark);">
                    ${temDesconto ? `<button style="font-size:0.76em;padding:4px 10px;border:none;border-radius:50px;background:#FEF3C7;color:#92400E;font-weight:600;cursor:pointer;" onclick="resetarPreco('${item.id}')">↩ Automático</button>` : ''}
                    <span style="font-size:0.88em;color:var(--brown-warm);">Subtotal:</span>
                    <strong style="font-size:1em;color:var(--brown-dark);">R$ ${subtotal}</strong>
                </div>`;
            list.appendChild(div);
        });
    });
}

function aplicarPrecoManual(id, novoPreco, precoAuto) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    item.precoManual = novoPreco;
    renderizarItens(); recalcularDescontoManual(); atualizarValorBrigadeiros();
}

function resetarPreco(id) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    delete item.precoManual;
    renderizarItens(); recalcularDescontoManual(); atualizarValorBrigadeiros();
}

function recalcularDescontoManual() {
    delete document.getElementById('valorDesconto').dataset.comboAuto;
    const qtdTrad    = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='trad').reduce((s,i)=>s+i.quantidade,0);
    const qtdFrutas  = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='frutas').reduce((s,i)=>s+i.quantidade,0);
    const qtdGourmet = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='gourmet').reduce((s,i)=>s+i.quantidade,0);
    const precoTradAuto    = precoUnitarioPorFaixa('trad', qtdTrad);
    const precoFrutasAuto  = precoUnitarioPorFaixa('frutas', qtdFrutas);
    const precoGourmetAuto = precoUnitarioPorFaixa('gourmet', qtdGourmet);
    let totalDesconto = 0;
    itens.forEach(item => {
        if (item.precoManual === undefined) return;
        const cat = CATEGORIA_SABOR[item.sabor] || 'trad';
        const precoAuto = cat === 'trad' ? precoTradAuto : cat === 'frutas' ? precoFrutasAuto : precoGourmetAuto;
        const diff = (precoAuto - item.precoManual) * item.quantidade;
        if (diff > 0) totalDesconto += diff;
    });
    const campoDesconto = document.getElementById('valorDesconto');
    if (totalDesconto > 0) {
        campoDesconto.value = 'R$ ' + totalDesconto.toFixed(2).replace('.', ',');
        campoDesconto.readOnly = true;
        campoDesconto.style.color = 'var(--green)';
        campoDesconto.style.fontWeight = '700';
    } else {
        campoDesconto.value = ''; campoDesconto.readOnly = false;
        campoDesconto.style.color = ''; campoDesconto.style.fontWeight = '';
    }
    atualizarTotal();
}

function editarItemCarrinho(id) {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    document.getElementById('sabor').value = item.sabor || '';
    document.getElementById('formato').value = item.formato || '';
    document.getElementById('tipoForma').value = item.tipoForma || '';
    const selCor = document.getElementById('cor');
    if (['Branca','Preta','Vermelha','Rosa','Azul','Verde','Amarela','Roxa','Laranja','Marrom','Cinza','Dourada','Prateada'].includes(item.cor)) {
        selCor.value = item.cor;
        document.getElementById('corCustomizada').style.display = 'none';
    } else {
        selCor.value = 'Outra';
        document.getElementById('corCustomizada').style.display = 'block';
        document.getElementById('corCustomizada').value = item.cor || '';
    }
    const opcoes25 = [25,33,34,50,75,100,125,150,200];
    const selQtd = document.getElementById('quantidade');
    if (opcoes25.includes(item.quantidade)) {
        selQtd.value = String(item.quantidade);
        document.getElementById('quantidadeCustomizada').style.display = 'none';
    } else {
        selQtd.value = 'outro';
        document.getElementById('quantidadeCustomizada').style.display = 'block';
        document.getElementById('quantidadeCustomizada').value = item.quantidade;
    }
    itens = itens.filter(i => i.id !== id);
    renderizarItens();
    atualizarValorBrigadeiros();
    document.getElementById('sabor').scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('✏️ Edite os campos e clique em "+ Adicionar Item"', 'aviso');
}

function removerItem(id) {
    itens = itens.filter(i => String(i.id) !== String(id));
    renderizarItens(); atualizarValorBrigadeiros();
}

function atualizarValorBrigadeiros() {
    const qtdTrad    = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='trad').reduce((s,i)=>s+i.quantidade,0);
    const qtdGourmet = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='gourmet').reduce((s,i)=>s+i.quantidade,0);
    const qtdFrutas  = itens.filter(i => CATEGORIA_SABOR[i.sabor]==='frutas').reduce((s,i)=>s+i.quantidade,0);
    const precoTradAuto    = precoUnitarioPorFaixa('trad', qtdTrad);
    const precoFrutasAuto  = precoUnitarioPorFaixa('frutas', qtdFrutas);
    const precoGourmetAuto = precoUnitarioPorFaixa('gourmet', qtdGourmet);
    let valorTrad = 0, valorFrutas = 0, valorGourmet = 0;
    itens.forEach(item => {
        const cat = CATEGORIA_SABOR[item.sabor] || 'trad';
        const precoAuto = cat === 'trad' ? precoTradAuto : cat === 'frutas' ? precoFrutasAuto : precoGourmetAuto;
        const preco = item.precoManual !== undefined ? item.precoManual : precoAuto;
        if (cat === 'trad') valorTrad += preco * item.quantidade;
        else if (cat === 'frutas') valorFrutas += preco * item.quantidade;
        else valorGourmet += preco * item.quantidade;
    });
    const total = valorTrad + valorFrutas + valorGourmet;
    document.getElementById('valor').value = total > 0 ? 'R$ ' + total.toFixed(2).replace('.', ',') : '';
    const contador = document.getElementById('contadorCategorias');
    if (qtdTrad > 0 || qtdFrutas > 0 || qtdGourmet > 0) {
        contador.style.display = 'flex';
        document.getElementById('infoTrad').innerHTML    = qtdTrad + ' un. × R$ ' + precoTradAuto.toFixed(2).replace('.',',') + '<br><strong>R$ ' + (precoTradAuto * qtdTrad).toFixed(2).replace('.',',') + '</strong>';
        document.getElementById('infoFrutas').innerHTML  = qtdFrutas + ' un. × R$ ' + precoFrutasAuto.toFixed(2).replace('.',',') + '<br><strong>R$ ' + (precoFrutasAuto * qtdFrutas).toFixed(2).replace('.',',') + '</strong>';
        document.getElementById('infoGourmet').innerHTML = qtdGourmet + ' un. × R$ ' + precoGourmetAuto.toFixed(2).replace('.',',') + '<br><strong>R$ ' + (precoGourmetAuto * qtdGourmet).toFixed(2).replace('.',',') + '</strong>';
} else { contador.style.display = 'none'; }

    // ── Aplica desconto automático se for Combo Misto ──
    const campoDescontoCombo = document.getElementById('valorDesconto');
    const descontoCombo = calcularDescontoCombo(qtdTrad, qtdGourmet, qtdFrutas, precoTradAuto, precoGourmetAuto);
    if (descontoCombo > 0) {
        campoDescontoCombo.value = 'R$ ' + descontoCombo.toFixed(2).replace('.', ',');
        campoDescontoCombo.readOnly = true;
        campoDescontoCombo.style.color = 'var(--green)';
        campoDescontoCombo.style.fontWeight = '700';
        campoDescontoCombo.dataset.comboAuto = '1';
    } else if (campoDescontoCombo.dataset.comboAuto === '1') {
        campoDescontoCombo.value = '';
        campoDescontoCombo.readOnly = false;
        campoDescontoCombo.style.color = '';
        campoDescontoCombo.style.fontWeight = '';
        delete campoDescontoCombo.dataset.comboAuto;
    }

    atualizarTotal();
}

function atualizarTotal() {
    const vBrig  = parseFloat((document.getElementById('valor').value || 'R$ 0,00').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0;
    const vFrete = parseFloat((document.getElementById('valorFrete').value || 'R$ 0,00').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0;
    const vDesc  = parseFloat((document.getElementById('valorDesconto').value || 'R$ 0,00').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0;
    const total  = Math.max(0, vBrig + vFrete - vDesc);
    document.getElementById('valorTotal').value = 'R$ ' + total.toFixed(2).replace('.',',');
    calcularCustoPedido();
}
