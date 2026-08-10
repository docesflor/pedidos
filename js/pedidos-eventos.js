/* ═══════════════════════════════════════════
   PEDIDOS — EVENTOS, BLOQUEIOS DE AGENDA E VENDAS
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

let filtroEventosAtual = 'todos';
let filtroPagamentoAtual = 'todos';

function eventoEstaFinalizado(e) {
    return e.status === 'finalizado';
}


function salvarEvento() {
    const nome   = document.getElementById('eventoNome').value.trim();
    const inicio = document.getElementById('eventoInicio').value;
    const fim    = document.getElementById('eventoFim').value;
    const obs    = document.getElementById('eventoObs').value.trim();
    if (!nome)   { toast('❌ Informe o nome do evento.', 'erro'); return; }
    if (!inicio) { toast('❌ Informe a data de início.', 'erro'); return; }
    if (!fim)    { toast('❌ Informe a data de fim.', 'erro'); return; }
    if (fim < inicio) { toast('❌ Data fim deve ser igual ou depois do início.', 'erro'); return; }
    const evento = { nome, inicio, fim, obs, status: 'aberto', timestamp: Date.now() };
    database.ref('eventos').push(evento).then(() => {
        toast('✅ Evento salvo! Datas bloqueadas.');
        document.getElementById('eventoNome').value  = '';
        document.getElementById('eventoInicio').value = '';
        document.getElementById('eventoFim').value    = '';
        document.getElementById('eventoObs').value    = '';
        carregarEventos();
    }).catch(err => toast('❌ Erro: ' + err.message, 'erro'));
}


function finalizarEvento(key) {
    showConfirmModal('✅ Finalizar este evento? As datas voltarão a ficar disponíveis.', function() {
        database.ref('eventos/' + key).update({ status: 'finalizado', finalizadoEm: Date.now() })
            .then(() => { toast('✅ Evento finalizado!'); carregarEventos(); })
            .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
    });
}

function reabrirEvento(key) {
    showConfirmModal('🔓 Reabrir este evento? Ele voltará para "Em andamento" e as datas ficarão bloqueadas novamente.', function() {
        database.ref('eventos/' + key).update({ status: 'aberto', finalizadoEm: null })
            .then(() => { toast('🔓 Evento reaberto!'); carregarEventos(); })
            .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
    });
}

function excluirEvento(key) {
    showConfirmModal('🔒 Excluir este bloqueio? As datas voltarão a estar disponíveis.', function() {
        database.ref('eventos/' + key).remove()
            .then(() => { toast('🗑️ Evento excluído.'); carregarEventos(); })
            .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
    });
}


function getEventoBloqueado(dataISO) {
    return new Promise(resolve => {
        database.ref('eventos').once('value', snapshot => {
            let encontrado = null;
            snapshot.forEach(child => {
                const e = child.val();
                if (eventoEstaFinalizado(e)) return;
                if (dataISO >= e.inicio && dataISO <= e.fim) encontrado = e;
            });
            resolve(encontrado);
        });
    });
}


async function verificarDataBloqueada() {
    const dataISO = document.getElementById('dataEntrega').value;
    const aviso   = document.getElementById('aviso-data-bloqueada');
    const texto   = document.getElementById('aviso-data-bloqueada-texto');
    if (!dataISO) { aviso.style.display = 'none'; return; }
    const evento = await getEventoBloqueado(dataISO);
    if (evento) {
        const inicioBR = evento.inicio.split('-').reverse().join('/');
        const fimBR    = evento.fim.split('-').reverse().join('/');
        const mesmoDia = evento.inicio === evento.fim;
        texto.textContent = `Data bloqueada — ${evento.nome}` +
            (mesmoDia ? ` (${inicioBR})` : ` (${inicioBR} a ${fimBR})`);
        aviso.style.display = 'block';
    } else {
        aviso.style.display = 'none';
    }
}


function marcarDiasBloqueadosCalendario(mesRef, anoRef, prefixoId) {
    prefixoId = prefixoId || 'dia';
    database.ref('eventos').once('value', snapshot => {
        snapshot.forEach(child => {
            const e = child.val();
            if (eventoEstaFinalizado(e)) return;
            const dtInicio = new Date(e.inicio + 'T00:00:00');
            const dtFim    = new Date(e.fim    + 'T00:00:00');
            const cur      = new Date(dtInicio);
            let idx = 0;
            while (cur <= dtFim) {
                if (cur.getMonth() === mesRef && cur.getFullYear() === anoRef) {
                    const dia = cur.getDate();
                    const el  = document.getElementById(prefixoId + '-' + dia);
                    if (el) {
                        el.classList.add('bloqueado');
                        if (idx === 0) el.classList.add('bloqueado-inicio');
                        const proxDia = new Date(cur); proxDia.setDate(proxDia.getDate()+1);
                        if (proxDia > dtFim) el.classList.add('bloqueado-fim');
                        if (!el.querySelector('.dia-lock')) {
                            const lock = document.createElement('div');
                            lock.className = 'dia-lock';
                            lock.textContent = '🔒';
                            el.appendChild(lock);
                        }
                        el.title = '🔒 ' + e.nome;
                    }
                }
                cur.setDate(cur.getDate() + 1);
                idx++;
            }
        });
    });
}

// ====================== VENDAS DE EVENTO ======================


function filtrarEventos(filtro, btn) {
    filtroEventosAtual = filtro;
    document.querySelectorAll('#filtros-eventos .chip-filtro').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    carregarEventos();
}


function filtrarPagamento(filtro, btn) {
    filtroPagamentoAtual = filtro;
    document.querySelectorAll('#filtros-pagamento .chip-filtro').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    carregarEventos();
}


function carregarEventos() {
    const lista = document.getElementById('lista-eventos');
    lista.innerHTML = gerarSkeleton(2);
    database.ref('eventos').once('value', snapshot => {
        const eventos = [];
        snapshot.forEach(child => {
            const e = child.val();
            e.key = child.key;
            if (!e.status) e.status = 'aberto';
            if (filtroEventosAtual === 'aberto' && eventoEstaFinalizado(e)) return;
            if (filtroEventosAtual === 'finalizado' && !eventoEstaFinalizado(e)) return;
            eventos.push(e);
        });
        window._hashEventos = JSON.stringify(snapshot.val());
        if (eventos.length === 0) {
            const msgs = { todos:'Nenhum evento cadastrado.', aberto:'Nenhum evento em andamento.', finalizado:'Nenhum evento finalizado.' };
            lista.innerHTML = `<p style="color:var(--brown-warm);">${msgs[filtroEventosAtual]||msgs.todos}</p>`;
            return;
        }
        eventos.sort((a,b) => {
            const aFin = eventoEstaFinalizado(a)?1:0, bFin = eventoEstaFinalizado(b)?1:0;
            if (aFin !== bFin) return aFin - bFin;
            return a.inicio.localeCompare(b.inicio);
        });
        lista.innerHTML = '';
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        eventos.forEach(e => renderizarEventoCard(e, lista, hoje));
    });
}


function renderizarEventoCard(e, lista, hoje) {
    const fimDate = new Date(e.fim + 'T00:00:00');
    const passado = fimDate < hoje;
    const finalizado = eventoEstaFinalizado(e);
    const inicioBR = e.inicio.split('-').reverse().join('/');
    const fimBR    = e.fim.split('-').reverse().join('/');
    const mesmoDia = e.inicio === e.fim;
    const statusLabel = finalizado ? 'Finalizado ✅' : (passado ? 'Aguardando fechamento' : 'Em andamento');
    const statusClass = finalizado ? 'finalizado' : 'aberto';
    const iconeNome = finalizado ? '✅' : '🔒';
    const card = document.createElement('div');
    card.className = 'evento-card-completo' + (finalizado ? ' evento-finalizado' : '');
    card.id = 'evento-card-' + e.key;
    const vendas   = e.vendas   ? Object.values(e.vendas)   : [];
    const produtosArr = e.produtos ? Object.entries(e.produtos) : [];
    // Soma por CAIXA/ITEM (não por brigadeiro individual dentro da caixa)
    const produzido = produtosArr.reduce((s,[,p]) => s + (parseInt(p.produzido)||0), 0);
    const totalUnidadesVendidas = produtosArr.reduce((s,[pkey]) => {
        const vendidoDoProduto = vendas.filter(v => v.produtoKey === pkey)
            .reduce((s2,v) => s2 + (parseInt(v.quantidade)||0), 0);
        return s + vendidoDoProduto;
    }, 0);
    const totalBrigadeiros = produtosArr.reduce((s,[,p]) => s + (parseInt(p.produzido)||0)*(parseInt(p.unidades)||0), 0);
    const totalArrecadado = vendas.reduce((s,v) => s+(parseFloat(v.valor)||0), 0);
    const sobrandoUnidades = Math.max(0, produzido-totalUnidadesVendidas);
    const btnFinalizarMenu = (!finalizado && passado)
        ? `<button onclick="finalizarEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">✓ Finalizar evento</button>` : '';
    const btnReabrirMenu = finalizado
        ? `<button onclick="reabrirEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">🔓 Reabrir evento</button>` : '';
    const btnEditarMenu =
        `<button onclick="abrirEdicaoEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">✏️ Editar evento</button>`;
    const detalhamentoHTML = gerarDetalhamentoProdutosHTML(e);
    const vendasRapidasHTML = gerarProdutosVendaHTML(e);
    const editarProduzidoHTML = '';
    card.innerHTML = `
        <div class="evento-card-header">
            <div>
                <div class="evento-header-linha1">
                    <span class="evento-card-nome">${iconeNome} ${escaparHTML(e.nome)}</span>
                    <span class="evento-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="evento-card-datas">📅 ${mesmoDia?inicioBR:inicioBR+' até '+fimBR}${e.obs?' — '+escaparHTML(e.obs):''}</div>
            </div>
            <div style="position:relative;flex-shrink:0;">
                <button class="btn-mais" onclick="toggleMenuMais('menuEvento-${e.key}', event)" aria-label="Mais opções">⋯</button>
                <div class="menu-mais" id="menuEvento-${e.key}" style="display:none;">
                    ${btnEditarMenu}
                    ${btnFinalizarMenu}
                    ${btnReabrirMenu}
                    <button class="menu-mais-excluir" onclick="excluirEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">🗑️ Excluir evento</button>
                </div>
            </div>
        </div>
        <div class="evento-arrecadado-destaque">
            <div class="evento-arrecadado-label">💰 Arrecadado</div>
            <div class="evento-arrecadado-valor">R$ ${totalArrecadado.toFixed(2).replace('.',',')}</div>
        </div>
        <div class="evento-resumo-3grid">
            <div class="evento-resumo-mini">
                <div class="evento-resumo-mini-label">🍫 Produzido</div>
                <div class="evento-resumo-mini-valor">${produzido} cx</div>
            </div>
            <div class="evento-resumo-mini">
                <div class="evento-resumo-mini-label">📦 Vendido</div>
                <div class="evento-resumo-mini-valor">${totalUnidadesVendidas} cx</div>
            </div>
            <div class="evento-resumo-mini">
                <div class="evento-resumo-mini-label">📬 Sobrou</div>
                <div class="evento-resumo-mini-valor">${sobrandoUnidades} cx</div>
            </div>
        </div>
        <p style="text-align:center;font-size:0.78em;color:var(--brown-warm);margin-top:-4px;margin-bottom:10px;">🍫 ${totalBrigadeiros} brigadeiros no total</p>
        ${editarProduzidoHTML}
        ${detalhamentoHTML}
        ${vendasRapidasHTML}
        <button class="btn-toggle-historico" onclick="toggleHistorico('${e.key}')">📋 Histórico de vendas <span id="seta-historico-${e.key}">▾</span></button>
        <div id="historico-wrapper-${e.key}" style="display:none;">
            <div id="historico-${e.key}" style="background:var(--white);border-radius:10px;border:1px solid var(--cream-dark);overflow:hidden;margin-top:8px;">
                ${vendas.length===0?'<p style="color:var(--brown-warm);font-size:0.83em;padding:10px 12px;">Nenhuma venda lançada ainda.</p>':renderizarHistoricoVendas(e)}
            </div>
        </div>`;
    lista.appendChild(card);
}

function renderizarHistoricoVendas(e) {
    const vendas = e.vendas ? Object.entries(e.vendas) : [];
    const finalizado = eventoEstaFinalizado(e);
    const filtradas = filtroPagamentoAtual === 'todos'
        ? vendas
        : vendas.filter(([_,v]) => (v.formaPagamento||'') === filtroPagamentoAtual);
    if (filtradas.length === 0) return '<p style="color:var(--brown-warm);font-size:0.83em;padding:10px 12px;">Nenhuma venda encontrada.</p>';
    const iconesPagamento = { dinheiro:'💵 Dinheiro', pix:'📱 Pix', credito:'💳 Crédito', debito:'💳 Débito' };
    return filtradas.map(([key,v]) => {
        const hora = v.hora||'--:--';
        let desc;
        if (v.produtoNome) {
            desc = `${v.quantidade}x ${escaparHTML(v.produtoNome)}`;
        } else {
            const partes = [];
            if (v.caixas>0) partes.push(`${v.caixas} caixa${v.caixas>1?'s':''}`);
            if (v.avulso>0) partes.push(`${v.avulso} avulso`);
            desc = partes.join(' + ') + ' (legado)';
        }
        const pagLabel = v.formaPagamento ? ' · ' + (iconesPagamento[v.formaPagamento]||v.formaPagamento) : '';
        const gratuitoTag = v.gratuito ? ' <span style="color:var(--amber);font-weight:700;">🎁 grátis</span>' : '';
        const btnExcluir = finalizado?'':
            `<button class="btn-remove" style="padding:4px 10px;font-size:0.74em;" onclick="excluirVenda('${e.key}','${key}')">✕</button>`;
        return `<div class="venda-item">
            <div><span style="font-weight:600;">${hora}</span><span style="color:var(--brown-warm);margin-left:6px;">${desc}${pagLabel}</span>${gratuitoTag}</div>
            <div style="display:flex;align-items:center;gap:8px;"><strong style="color:var(--green);">R$ ${(v.valor||0).toFixed(2).replace('.',',')}</strong>${btnExcluir}</div>
        </div>`;
    }).join('');
}


function toggleEditarProduzido(key) {
    const div = document.getElementById('editar-produzido-'+key);
    if (!div) return;
    const aberto = div.style.display === 'block';
    div.style.display = aberto ? 'none' : 'block';
    if (!aberto) { const inp = document.getElementById('produzido-'+key); if (inp) inp.focus(); }
}

function toggleHistorico(key, forcarAberto) {
    const div = document.getElementById('historico-wrapper-'+key);
    const seta = document.getElementById('seta-historico-'+key);
    if (!div) return;
    const abrir = forcarAberto === true || div.style.display !== 'block';
    div.style.display = abrir ? 'block' : 'none';
    if (seta) seta.textContent = abrir ? '▴' : '▾';
}


function salvarProduzido(key) {
    database.ref('eventos/'+key).once('value', snapshot => {
        const e = snapshot.val();
        if (eventoEstaFinalizado(e)) { toast('❌ Evento finalizado.','erro'); return; }
        const produzido = parseInt(document.getElementById('produzido-'+key).value)||0;
        database.ref('eventos/'+key).update({ produzido }).then(()=>{ toast('✅ Total produzido salvo!'); carregarEventos(); }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}

function gerarDetalhamentoProdutosHTML(e) {
    const produtos = e.produtos ? Object.entries(e.produtos) : [];
    if (produtos.length === 0) return '';
    const vendas = e.vendas ? Object.values(e.vendas) : [];
    const linhas = produtos.map(([pkey, p]) => {
        const produzidoP = parseInt(p.produzido) || 0;
        const unidadesP = parseInt(p.unidades) || 0;
        const vendidoP = vendas.filter(v => v.produtoKey === pkey)
            .reduce((s,v) => s + (parseInt(v.quantidade)||0), 0);
        const sobrouP = Math.max(0, produzidoP - vendidoP);
        return `
        <div style="background:var(--cream);border-radius:12px;padding:12px 14px;margin-bottom:8px;">
            <div style="font-weight:700;color:var(--brown-dark);margin-bottom:6px;">${escaparHTML(p.nome)}</div>
            <div style="font-size:0.78em;color:var(--brown-warm);display:flex;gap:12px;flex-wrap:wrap;">
                <span>📦 Produzido: <strong>${produzidoP}</strong></span>
                <span>🛒 Vendido: <strong>${vendidoP}</strong></span>
                <span>📬 Sobrou: <strong>${sobrouP}</strong></span>
                <span>🍫 <strong>${produzidoP*unidadesP}</strong> brigadeiros</span>
            </div>
        </div>`;
    }).join('');
    return `
    <div style="margin-top:2px;">
        <p style="font-size:0.78em;font-weight:700;color:var(--brown-warm);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">📋 Detalhamento por Item</p>
        ${linhas}
    </div>`;
}

// ====================== PRODUTOS DO EVENTO E VENDA POR PRODUTO ======================

function gerarProdutosVendaHTML(e) {
    if (eventoEstaFinalizado(e)) return '';
    const produtos = e.produtos ? Object.entries(e.produtos) : [];
    const linhasProdutos = produtos.map(([pkey, p]) => {
        const preco = parseFloat(p.preco) || 0;
        const produzidoP = parseInt(p.produzido) || 0;
        const unidadesP = parseInt(p.unidades) || 0;
        const vendidoP = (e.vendas ? Object.values(e.vendas) : [])
            .filter(v => v.produtoKey === pkey)
            .reduce((s,v) => s + (parseInt(v.quantidade)||0), 0);
        const sobrouP = Math.max(0, produzidoP - vendidoP);
        return `
        <div class="produto-venda-linha" id="produtoLinha-${e.key}-${pkey}">
            <div style="display:flex;gap:6px;align-items:stretch;">
                <button type="button" class="btn btn-laranja btn-bloco" style="text-align:left;display:flex;justify-content:space-between;align-items:center;flex:1;margin-bottom:0;" onclick="toggleVendaProduto('${e.key}','${pkey}')">
                    <span>${escaparHTML(p.nome)}</span>
                    <span style="font-weight:700;">R$ ${preco.toFixed(2).replace('.',',')}</span>
                </button>
                <button type="button" class="btn btn-cinza" style="flex:0 0 auto;padding:0 12px;margin-bottom:0;" onclick="toggleEditarProdutoEvento('${e.key}','${pkey}')" aria-label="Editar produto">✏️</button>
                <button type="button" class="btn btn-vermelho" style="flex:0 0 auto;padding:0 12px;margin-bottom:0;" onclick="excluirProdutoEvento('${e.key}','${pkey}')" aria-label="Excluir produto">🗑️</button>
            </div>
            <div style="font-size:0.74em;color:var(--brown-warm);margin:2px 4px 8px;display:flex;gap:10px;flex-wrap:wrap;">
                <span>📦 Produzido: <strong>${produzidoP} un.</strong></span>
                <span>🛒 Vendido: <strong>${vendidoP} un.</strong></span>
                <span>📬 Sobrou: <strong>${sobrouP} un.</strong></span>
                <span>🍫 Total: <strong>${produzidoP*unidadesP} brigadeiros</strong></span>
            </div>
            <div class="produto-edicao-painel" id="produtoEdicao-${e.key}-${pkey}" style="display:none;background:var(--white);border-radius:12px;padding:12px;border:1px solid var(--cream-dark);margin-bottom:10px;">
                <label style="font-size:0.76em;">Nome do produto</label>
                <input type="text" id="editProdutoNome-${e.key}-${pkey}" value="${escaparHTML(p.nome)}" style="margin-bottom:10px;">
                <div class="linha-dupla">
                    <div>
                        <label style="font-size:0.76em;">Unidades por item</label>
                        <input type="number" id="editProdutoUnidades-${e.key}-${pkey}" value="${unidadesP}" min="1">
                    </div>
                    <div>
                        <label style="font-size:0.76em;">Preço (R$)</label>
                        <input type="text" id="editProdutoPreco-${e.key}-${pkey}" value="${preco.toFixed(2).replace('.',',')}" oninput="this.value=maskMoeda(this.value)">
                    </div>
                </div>
                <label style="font-size:0.76em;">Quantidade produzida</label>
                <input type="number" id="editProdutoProduzido-${e.key}-${pkey}" value="${produzidoP}" min="0" style="margin-bottom:10px;">
                <div style="display:flex;gap:8px;">
                    <button type="button" class="btn btn-cinza" style="flex:1;margin-bottom:0;" onclick="toggleEditarProdutoEvento('${e.key}','${pkey}')">Cancelar</button>
                    <button type="button" class="btn btn-verde" style="flex:1;margin-bottom:0;" onclick="salvarEdicaoProdutoEvento('${e.key}','${pkey}')">💾 Salvar</button>
                </div>
            </div>
            <div class="produto-venda-painel" id="produtoPainel-${e.key}-${pkey}" style="display:none;background:var(--white);border-radius:12px;padding:12px;border:1px solid var(--cream-dark);margin-top:6px;margin-bottom:10px;">
                <label style="font-size:0.76em;">Quantidade</label>
                <input type="number" id="qtd-${e.key}-${pkey}" min="1" value="1" style="margin-bottom:10px;" oninput="atualizarPreviewVendaProduto('${e.key}','${pkey}')">
                <label style="font-size:0.76em;">Forma de pagamento</label>
                <select id="pagamento-${e.key}-${pkey}" style="margin-bottom:10px;">
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="pix">📱 Pix</option>
                    <option value="credito">💳 Crédito</option>
                    <option value="debito">💳 Débito</option>
                </select>
                <button type="button" class="btn btn-cinza btn-bloco" id="btnGratuito-${e.key}-${pkey}" data-ativo="0" style="margin-bottom:10px;" onclick="alternarGratuitoVenda('${e.key}','${pkey}')">🎁 Marcar como gratuito</button>
                <div style="font-size:0.85em;color:var(--green);font-weight:600;margin-bottom:10px;">💰 Total: <span id="previewValor-${e.key}-${pkey}">R$ ${preco.toFixed(2).replace('.',',')}</span></div>
                <button type="button" class="btn btn-verde btn-bloco" onclick="confirmarVendaProduto('${e.key}','${pkey}')">✅ Confirmar Venda</button>
            </div>
        </div>`;
    }).join('');

    return `
    <div style="margin-top:2px;">
        <p style="font-size:0.78em;font-weight:700;color:var(--brown-warm);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">➕ Lançar Venda</p>
        ${linhasProdutos || '<p style="color:var(--brown-warm);font-size:0.83em;">Nenhum produto cadastrado neste evento ainda.</p>'}
        <div id="novoProdutoForm-${e.key}" style="display:none;background:var(--white);border-radius:12px;padding:12px;border:1px solid var(--cream-dark);margin-top:8px;margin-bottom:8px;">
            <label style="font-size:0.76em;">Nome do produto</label>
            <input type="text" id="novoProdutoNome-${e.key}" placeholder="Ex: Caixinha 16un" style="margin-bottom:10px;">
            <div class="linha-dupla">
                <div>
                    <label style="font-size:0.76em;">Unidades por item</label>
                    <input type="number" id="novoProdutoUnidades-${e.key}" placeholder="Ex: 16" min="1">
                </div>
                <div>
                    <label style="font-size:0.76em;">Preço (R$)</label>
                    <input type="text" id="novoProdutoPreco-${e.key}" placeholder="R$ 0,00" oninput="this.value=maskMoeda(this.value)">
                </div>
            </div>
            <label style="font-size:0.76em;">Quantidade produzida (caixas/itens)</label>
            <input type="number" id="novoProdutoProduzido-${e.key}" placeholder="Ex: 237" min="0" style="margin-bottom:10px;">
            <button type="button" class="btn btn-verde btn-bloco" onclick="salvarProdutoEvento('${e.key}')">💾 Salvar Produto</button>
        </div>
        <button type="button" class="btn btn-cinza btn-bloco" onclick="toggleNovoProdutoForm('${e.key}')">+ Adicionar Item</button>
    </div>`;
}

function toggleNovoProdutoForm(eventoKey) {
    const div = document.getElementById('novoProdutoForm-'+eventoKey);
    if (!div) return;
    div.style.display = div.style.display === 'block' ? 'none' : 'block';
}

function salvarProdutoEvento(eventoKey) {
    const nome = document.getElementById(`novoProdutoNome-${eventoKey}`).value.trim();
    const unidades = parseInt(document.getElementById(`novoProdutoUnidades-${eventoKey}`).value) || 0;
    const precoStr = document.getElementById(`novoProdutoPreco-${eventoKey}`).value;
    const preco = parseFloat((precoStr||'0').replace(/[^\d,]/g,'').replace(',','.')) || 0;
    const produzido = parseInt(document.getElementById(`novoProdutoProduzido-${eventoKey}`).value) || 0;
    if (!nome)          { toast('❌ Informe o nome do produto.', 'erro'); return; }
    if (unidades <= 0)  { toast('❌ Informe as unidades por item.', 'erro'); return; }
    if (preco <= 0)     { toast('❌ Informe o preço.', 'erro'); return; }
    database.ref('eventos/'+eventoKey+'/produtos').push({ nome, unidades, preco, produzido }).then(() => {
        toast('✅ Produto adicionado!');
        carregarEventos();
    }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
}

function toggleVendaProduto(eventoKey, produtoKey) {
    document.querySelectorAll(`[id^="produtoPainel-${eventoKey}-"]`).forEach(painel => {
        if (painel.id !== `produtoPainel-${eventoKey}-${produtoKey}`) painel.style.display = 'none';
    });
    const painel = document.getElementById(`produtoPainel-${eventoKey}-${produtoKey}`);
    if (!painel) return;
    const aberto = painel.style.display === 'block';
    painel.style.display = aberto ? 'none' : 'block';
    if (!aberto) atualizarPreviewVendaProduto(eventoKey, produtoKey);
}

function atualizarPreviewVendaProduto(eventoKey, produtoKey) {
    database.ref('eventos/'+eventoKey+'/produtos/'+produtoKey).once('value', snap => {
        const p = snap.val();
        if (!p) return;
        const qtdInput = document.getElementById(`qtd-${eventoKey}-${produtoKey}`);
        const qtd = parseInt(qtdInput?.value) || 0;
        const btnGratuito = document.getElementById(`btnGratuito-${eventoKey}-${produtoKey}`);
        const gratuito = btnGratuito && btnGratuito.dataset.ativo === '1';
        const preview = document.getElementById(`previewValor-${eventoKey}-${produtoKey}`);
        const valor = gratuito ? 0 : qtd * (parseFloat(p.preco)||0);
        if (preview) preview.textContent = 'R$ ' + valor.toFixed(2).replace('.',',');
    });
}

function alternarGratuitoVenda(eventoKey, produtoKey) {
    const btn = document.getElementById(`btnGratuito-${eventoKey}-${produtoKey}`);
    if (!btn) return;
    const ativo = btn.dataset.ativo === '1';
    btn.dataset.ativo = ativo ? '0' : '1';
    btn.classList.toggle('btn-verde', !ativo);
    btn.classList.toggle('btn-cinza', ativo);
    btn.textContent = ativo ? '🎁 Marcar como gratuito' : '✅ Gratuito ativado';
    atualizarPreviewVendaProduto(eventoKey, produtoKey);
}

function confirmarVendaProduto(eventoKey, produtoKey) {
    database.ref('eventos/'+eventoKey).once('value', snapshot => {
        const e = snapshot.val();
        if (eventoEstaFinalizado(e)) { toast('❌ Evento finalizado.', 'erro'); return; }
        const p = e.produtos && e.produtos[produtoKey];
        if (!p) { toast('❌ Produto não encontrado.', 'erro'); return; }
        const qtd = parseInt(document.getElementById(`qtd-${eventoKey}-${produtoKey}`).value) || 0;
        if (qtd <= 0) { toast('❌ Informe a quantidade.', 'erro'); return; }
        const formaPagamento = document.getElementById(`pagamento-${eventoKey}-${produtoKey}`).value;
        const btnGratuito = document.getElementById(`btnGratuito-${eventoKey}-${produtoKey}`);
        const gratuito = btnGratuito && btnGratuito.dataset.ativo === '1';
        const unidades = parseInt(p.unidades) || 1;
        const preco = parseFloat(p.preco) || 0;
        const valor = gratuito ? 0 : qtd * preco;
        const agora = new Date();
        const hora  = agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
        database.ref('eventos/'+eventoKey+'/vendas').push({
            produtoKey, produtoNome: p.nome, quantidade: qtd,
            unidadesTotal: qtd*unidades, valor, gratuito, formaPagamento,
            hora, timestamp: Date.now()
        }).then(() => {
            toast(gratuito ? `🎁 ${qtd}x ${p.nome} registrado como gratuito!` : `✅ ${qtd}x ${p.nome} — R$ ${valor.toFixed(2).replace('.',',')} lançado!`);
            carregarEventos();
            setTimeout(()=>{ toggleHistorico(eventoKey, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}

function toggleEditarProdutoEvento(eventoKey, produtoKey) {
    document.querySelectorAll(`[id^="produtoEdicao-${eventoKey}-"]`).forEach(painel => {
        if (painel.id !== `produtoEdicao-${eventoKey}-${produtoKey}`) painel.style.display = 'none';
    });
    const painel = document.getElementById(`produtoEdicao-${eventoKey}-${produtoKey}`);
    if (!painel) return;
    painel.style.display = painel.style.display === 'block' ? 'none' : 'block';
}

function salvarEdicaoProdutoEvento(eventoKey, produtoKey) {
    const nome = document.getElementById(`editProdutoNome-${eventoKey}-${produtoKey}`).value.trim();
    const unidades = parseInt(document.getElementById(`editProdutoUnidades-${eventoKey}-${produtoKey}`).value) || 0;
    const precoStr = document.getElementById(`editProdutoPreco-${eventoKey}-${produtoKey}`).value;
    const preco = parseFloat((precoStr||'0').replace(/[^\d,]/g,'').replace(',','.')) || 0;
    const produzido = parseInt(document.getElementById(`editProdutoProduzido-${eventoKey}-${produtoKey}`).value) || 0;
    if (!nome)          { toast('❌ Informe o nome do produto.', 'erro'); return; }
    if (unidades <= 0)  { toast('❌ Informe as unidades por item.', 'erro'); return; }
    if (preco <= 0)     { toast('❌ Informe o preço.', 'erro'); return; }
    database.ref('eventos/'+eventoKey+'/produtos/'+produtoKey).update({ nome, unidades, preco, produzido }).then(() => {
        toast('✅ Produto atualizado!');
        carregarEventos();
    }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
}

function excluirProdutoEvento(eventoKey, produtoKey) {
    showConfirmModal('🗑️ Excluir este produto? As vendas já lançadas continuam no histórico.', function() {
        database.ref('eventos/'+eventoKey+'/produtos/'+produtoKey).remove().then(() => {
            toast('🗑️ Produto excluído.');
            carregarEventos();
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}

// ====================== EDITAR EVENTO ======================

function abrirEdicaoEvento(key) {
    database.ref('eventos/'+key).once('value', snapshot => {
        const e = snapshot.val();
        if (!e) return;
        document.getElementById('editEventoKey').value = key;
        document.getElementById('editEventoNome').value = e.nome || '';
        document.getElementById('editEventoInicio').value = e.inicio || '';
        document.getElementById('editEventoFim').value = e.fim || '';
        document.getElementById('editEventoObs').value = e.obs || '';
        document.getElementById('modalEditarEvento').style.display = 'flex';
    });
}

function salvarEdicaoEvento() {
    const key = document.getElementById('editEventoKey').value;
    const nome = document.getElementById('editEventoNome').value.trim();
    const inicio = document.getElementById('editEventoInicio').value;
    const fim = document.getElementById('editEventoFim').value;
    const obs = document.getElementById('editEventoObs').value.trim();
    if (!nome)   { toast('❌ Informe o nome do evento.', 'erro'); return; }
    if (!inicio) { toast('❌ Informe a data de início.', 'erro'); return; }
    if (!fim)    { toast('❌ Informe a data de fim.', 'erro'); return; }
    if (fim < inicio) { toast('❌ Data fim deve ser igual ou depois do início.', 'erro'); return; }
    database.ref('eventos/'+key).update({ nome, inicio, fim, obs }).then(() => {
        toast('✅ Evento atualizado!');
        document.getElementById('modalEditarEvento').style.display = 'none';
        carregarEventos();
    }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
}

function excluirVenda(eventoKey, vendaKey) {
    showConfirmModal('Excluir esta venda?', function() {
        database.ref('eventos/'+eventoKey+'/vendas/'+vendaKey).remove().then(()=>{
            toast('🗑️ Venda excluída.'); carregarEventos();
            setTimeout(()=>{ toggleHistorico(eventoKey, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}

// ====================== CUSTOS: ABA SWITCHER ======================
