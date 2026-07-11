/* ═══════════════════════════════════════════
   PEDIDOS — CRUD DE PEDIDOS, CARDS, CALENDÁRIOS E FILTROS
═══════════════════════════════════════════ */

// ====================== LIMPAR FORMULÁRIO ======================
function limparFormulario() {
    document.getElementById('nome').value = '';
    document.getElementById('telefone').value = '';
    document.getElementById('dataEntrega').value = '';
    document.getElementById('horarioEntrega').value = '';
    document.getElementById('tipoEntrega').value = 'retirada';
    document.getElementById('enderecoFields').style.display = 'none';
    document.getElementById('enderecoFields').querySelectorAll('input').forEach(inp => inp.value = '');
    itens = [];
    document.getElementById('itensList').innerHTML = '';
    document.getElementById('contadorCategorias').style.display = 'none';
    document.getElementById('quantidade').value = '';
    const qtdCustom = document.getElementById('quantidadeCustomizada');
    if (qtdCustom) { qtdCustom.value = ''; qtdCustom.style.display = 'none'; }
    document.getElementById('valor').value = '';
    document.getElementById('valorFrete').value = '';
    const descInput = document.getElementById('valorDesconto');
    if (descInput) { descInput.value = ''; descInput.readOnly = false; descInput.style.color = ''; descInput.style.fontWeight = ''; }
    document.getElementById('valorTotal').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('statusPagamento').value = 'A pagar';
    document.getElementById('valorPago').value = '';
    document.getElementById('valorPagoContainer').style.display = 'none';
    delete window.pedidoEmEdicao;
    document.getElementById('btnEnviar').textContent = '💾 Salvar Pedido';
    ['cep','endereco','bairro','cidade','numero','pontoReferencia'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.disabled = true; }
    });
}

// ====================== SALVAR PEDIDO ======================
async function salvarPedido() {
    const btnSalvar = document.getElementById('btnEnviar');
    if (btnSalvar.disabled) return; // ignora duplo clique/toque
    document.querySelectorAll('.campo-erro').forEach(el => el.classList.remove('campo-erro'));
    document.querySelectorAll('.msg-erro-campo').forEach(el => el.remove());
    function marcarErro(id, msg) {
        const el = document.getElementById(id); if (!el) return;
        el.classList.add('campo-erro');
        const span = document.createElement('span');
        span.className = 'msg-erro-campo'; span.textContent = msg;
        el.parentNode.insertBefore(span, el.nextSibling);
        el.scrollIntoView({ behavior:'smooth', block:'center' });
    }
    let temErro = false;
    if (!getVal('nome').trim())       { marcarErro('nome', '⚠️ Informe o nome'); temErro = true; }
    if (!getVal('dataEntrega'))        { marcarErro('dataEntrega', '⚠️ Informe a data'); temErro = true; }
    if (!itens || itens.length === 0) { toast('❌ Adicione pelo menos um item!', 'erro'); temErro = true; }
    if (temErro) return;
    btnSalvar.disabled = true;
    const dataRawCheck = getVal('dataEntrega');
    if (dataRawCheck) {
        if (VALIDAR_DATA_PASSADA && !window.pedidoEmEdicao) {
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const dataSelecionada = new Date(dataRawCheck + 'T00:00:00');
            if (dataSelecionada < hoje) {
                marcarErro('dataEntrega', '⚠️ Não selecione uma data passada');
                btnSalvar.disabled = false;
                return;
            }
        }
        const eventoBloq = await getEventoBloqueado(dataRawCheck);
        if (eventoBloq) {
            const inicioBR = eventoBloq.inicio.split('-').reverse().join('/');
            const fimBR    = eventoBloq.fim.split('-').reverse().join('/');
            toast(`🔒 Data bloqueada: ${eventoBloq.nome} (${inicioBR} a ${fimBR})`, 'erro');
            btnSalvar.disabled = false;
            return;
        }
    }
    const dataRaw = getVal('dataEntrega');
    const pedido = {
        nome: getVal('nome'), telefone: getVal('telefone'),
        data: converterDataParaBR(dataRaw), dataEntrega: converterDataParaBR(dataRaw),
        hora: getVal('horarioEntrega'), tipoEntrega: getVal('tipoEntrega'),
        endereco: getVal('tipoEntrega') === 'entrega' ? {
            cep: getVal('cep'), logradouro: getVal('endereco'),
            numero: getVal('numero'), bairro: getVal('bairro'),
            cidade: getVal('cidade'), complemento: getVal('pontoReferencia')
        } : null,
        desconto: parseFloat((getVal('valorDesconto')||'R$ 0,00').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0,
        itens: itens,
        valorBrigadeiros: parseFloat(getVal('valor').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0,
        valorFrete:       parseFloat(getVal('valorFrete').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0,
        valorTotal:       parseFloat(getVal('valorTotal').replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0,
        valorPago: getVal('valorPago'), statusPagamento: getVal('statusPagamento'),
        observacoes: getVal('observacoes'), timestamp: Date.now()
    };
const refPath = window.pedidoEmEdicao ? 'pedidos/' + window.pedidoEmEdicao : 'pedidos/' + database.ref('pedidos').push().key;
const ehNovoPedido = !window.pedidoEmEdicao;

async function salvarEAjustarEstoque() {
    let itensAntigos = null;
    if (!ehNovoPedido && navigator.onLine) {
        const snapAntigo = await database.ref(refPath).once('value');
        const pedidoAntigo = snapAntigo.val();
        itensAntigos = pedidoAntigo ? pedidoAntigo.itens : null;
    }

    if (!navigator.onLine) {
        salvarNaFilaOffline({ refPath, pedido, ehNovoPedido, itensAntigos });
        toast('📵 Sem conexão. Pedido salvo localmente e será enviado assim que a internet voltar.', 'aviso');
        limparFormulario();
        return;
    }

    try {
        await database.ref(refPath).set(pedido);
    } catch (err) {
        // conexão caiu bem na hora de gravar — cai pra fila também
        salvarNaFilaOffline({ refPath, pedido, ehNovoPedido, itensAntigos });
        toast('📵 Falha de conexão. Pedido salvo localmente e será enviado em breve.', 'aviso');
        limparFormulario();
        return;
    }
    toast(window.pedidoEmEdicao ? 'Pedido atualizado!' : 'Pedido salvo!');
    dispararConfete(btnSalvar);
    pulseBotaoSucesso(btnSalvar, '✓ Salvo!');
    if (ehNovoPedido) {
        await ajustarEstoquePorPedido(pedido.itens, 'abater');
    } else {
        if (itensAntigos) await ajustarEstoquePorPedido(itensAntigos, 'devolver');
        await ajustarEstoquePorPedido(pedido.itens, 'abater');
    }
    limparFormulario();
}
salvarEAjustarEstoque()
    .catch(err => toast('❌ Erro ao salvar: ' + err.message, 'erro'))
    .finally(() => { btnSalvar.disabled = false; });
}

async function ajustarEstoquePorPedido(itensPedido, operacao) {
    // operacao: 'abater' (consome estoque) ou 'devolver' (repõe estoque)
    if (!itensPedido || itensPedido.length === 0) return;
    const snapshotReceitas = await database.ref('receitas').once('value');
    const receitasMap = {};
    snapshotReceitas.forEach(child => { receitasMap[child.val().sabor] = child.val(); });

    const consumoTotal = {};
    itensPedido.forEach(item => {
        const sabor = item.sabor || item.nome;
        const receita = receitasMap[sabor];
        if (!receita || !receita.ingredientes) return;
        const fator = item.quantidade / receita.rendimento;
        receita.ingredientes.forEach(ing => {
            const consumo = ing.qtdReceita * fator;
            consumoTotal[ing.insumoKey] = (consumoTotal[ing.insumoKey] || 0) + consumo;
        });
    });

    let avisosEstoque = [];

    // Cada insumo é ajustado com transaction() — evita que dois pedidos
    // salvos ao mesmo tempo "pisem" um no ajuste do outro.
    for (const [insumoKey, consumido] of Object.entries(consumoTotal)) {
        const resultado = await database.ref('insumos/' + insumoKey).transaction(insumo => {
            if (!insumo) return insumo; // insumo não existe mais, não mexe
            const atual = insumo.estoqueAtual || 0;
            insumo.estoqueAtual = operacao === 'devolver'
                ? atual + consumido
                : Math.max(0, atual - consumido);
            return insumo;
        });

        if (resultado.committed && resultado.snapshot.exists()) {
            const insumoFinal = resultado.snapshot.val();
            if (operacao === 'abater' && insumoFinal.estoqueMinimo > 0 && insumoFinal.estoqueAtual <= insumoFinal.estoqueMinimo) {
                avisosEstoque.push(insumoFinal.nome);
            }
        }
    }

    if (avisosEstoque.length > 0) {
        toast('⚠️ Estoque baixo: ' + avisosEstoque.join(', '), 'aviso');
    }
    verificarEstoqueBaixo();
}

// ====================== CARREGAR ANDAMENTO ======================
function carregarAndamento() {
    const lista = document.getElementById('lista-andamento');
    lista.innerHTML = gerarSkeleton(3);
    database.ref('pedidos').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
            p.key = child.key; pedidos.push(p);
        });
        window._hashAndamento = JSON.stringify(snapshot.val());
        if (pedidos.length === 0) { lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum pedido em andamento.</p>'; return; }
        pedidos.sort((a,b) => {
            const toDate = d => {
                if (!d) return null;
                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00');
                const p = d.split('/'); return p.length === 3 ? new Date(p[2], p[1]-1, p[0]) : null;
            };
            const da = toDate(a.dataEntrega), db = toDate(b.dataEntrega);
            if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
            if (da - db !== 0) return da - db;
            // Mesmo dia: ordena pelo horário
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '99:99';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '99:99';
            return ha.localeCompare(hb);
        });
        lista.innerHTML = '';
        document.getElementById('totalizador-andamento').style.display = 'block';
        document.getElementById('totalAndamentoContagem').textContent = pedidos.length;
        pedidos.forEach(p => lista.appendChild(criarCard(p, p.key, false)));
    });
}

// ====================== CARREGAR FINALIZADOS ======================
function carregarFinalizados() {
    const lista = document.getElementById('lista-finalizados');
    lista.innerHTML = gerarSkeleton(3);
    database.ref('pedidos').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento !== 'entregue') return;
            p.key = child.key; pedidos.push(p);
        });
        const mesesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const agoraData = new Date();
        let totalMes = 0;
        pedidos.forEach(p => {
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1]-1, pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1]-1, pts[2]); }
            else return;
            if (dataP.getMonth() === agoraData.getMonth() && dataP.getFullYear() === agoraData.getFullYear()) totalMes++;
        });
        document.getElementById('totalizador-finalizados').style.display = 'block';
        document.getElementById('totalFinalizadosContagem').textContent = pedidos.length;
        document.getElementById('totalFinalizadosMes').textContent = `• ${totalMes} em ${mesesNome[agoraData.getMonth()]}/${agoraData.getFullYear()}`;
        if (pedidos.length === 0) { lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum pedido finalizado.</p>'; return; }
        pedidos.sort((a,b) => {
            const toDate = d => {
                if (!d) return null;
                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00');
                const p = d.split('/'); return p.length === 3 ? new Date(p[2], p[1]-1, p[0]) : null;
            };
            const da = toDate(a.dataEntrega), db = toDate(b.dataEntrega);
            if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
            if (db - da !== 0) return db - da;
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '00:00';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '00:00';
            return hb.localeCompare(ha);
        });
        lista.innerHTML = '';
        pedidos.forEach(p => lista.appendChild(criarCard(p, p.key, true)));
    });
}

// ====================== CRIAR CARD ======================
function criarCard(pedido, key, finalizado) {
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';
    const card = document.createElement('div');
    card.className = 'pedido-card';
    card.dataset.key = key;
    card.style.cssText = 'margin-bottom:0;position:relative;z-index:1;';
    if (!finalizado) {
        const hoje  = new Date(); hoje.setHours(0,0,0,0);
        const amanha = new Date(hoje); amanha.setDate(amanha.getDate()+1);
        let dataP = null;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1]-1, pts[0]); }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1]-1, pts[2]); }
        if (dataP) {
            dataP.setHours(0,0,0,0);
            if (dataP < hoje)                              wrapper.classList.add('urgente-atrasado');
            else if (dataP.getTime() === hoje.getTime())   wrapper.classList.add('urgente-hoje');
            else if (dataP.getTime() === amanha.getTime()) wrapper.classList.add('urgente-amanha');
        }
    }
    const statusClass = finalizado ? 'status-entregue' : 'status-andamento';
    const statusTexto = finalizado ? 'Entregue ✅' : (pedido.statusPagamento || 'A pagar');
    const valorFormatado = typeof pedido.valorTotal === 'number'
        ? 'R$ ' + pedido.valorTotal.toFixed(2).replace('.', ',')
        : (pedido.valorTotal || 'R$ 0,00');
    const todosItens = pedido.itens || [];
    const qtdTrad    = todosItens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'trad').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
    const qtdFrutas  = todosItens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'frutas').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
    const qtdGourmet = todosItens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'gourmet').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
    const precoTradAuto    = precoUnitarioPorFaixa('trad', qtdTrad);
    const precoFrutasAuto  = precoUnitarioPorFaixa('frutas', qtdFrutas);
    const precoGourmetAuto = precoUnitarioPorFaixa('gourmet', qtdGourmet);
    const totalBrig = qtdTrad + qtdFrutas + qtdGourmet;
    let badgeTempo = '';
    if (!finalizado) {
        const hoje2 = new Date(); hoje2.setHours(0,0,0,0);
        let dataP2 = null;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('/'); dataP2 = new Date(pts[2], pts[1]-1, pts[0]); }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('-'); dataP2 = new Date(pts[0], pts[1]-1, pts[2]); }
        if (dataP2) {
            dataP2.setHours(0,0,0,0);
            const diff = Math.round((dataP2 - hoje2) / 86400000);
            if (diff < 0)        badgeTempo = `<span style="background:var(--red);color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">⚠️ Atrasado</span>`;
            else if (diff === 0) badgeTempo = `<span style="background:var(--red);color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">🔴 HOJE</span>`;
            else if (diff === 1) badgeTempo = `<span style="background:#F59E0B;color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">⏰ AMANHÃ</span>`;
            else                 badgeTempo = `<span style="background:var(--cream-dark);color:var(--brown-warm);border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:600;margin-left:8px;">em ${diff} dias</span>`;
        }
    }
    const avaliacaoBtnHTML = pedido.avaliacaoRespondida
        ? `<button class="btn btn-avaliacao-enviada" disabled style="cursor:not-allowed;opacity:0.85;">⭐ Avaliação ✓✓</button>`
        : `<button class="btn btn-verde ${pedido.avaliacaoEnviada ? 'btn-avaliacao-enviada' : ''}" onclick="enviarAvaliacaoWhatsApp('${key}')">⭐ Avaliação</button>`;
    const botoesHTML = finalizado
    ? `${avaliacaoBtnHTML}
            <button class="btn btn-cinza"    onclick="imprimirComprovante('${key}')">🧾 Comprov.</button>
            <button class="btn btn-vermelho" onclick="excluirPedido('${key}')">🗑️ Excluir</button>`
         : `<div class="botoes-principais">
                <button class="btn btn-finalizar-card" onclick="finalizarPedido('${key}')">✓ Finalizar</button>
                <button class="btn btn-cinza" onclick="imprimirComprovante('${key}')">🧾 Comprovante</button>
                <button class="btn-mais" onclick="toggleMenuMais('menuMais-${key}', event)" aria-label="Mais opções">⋯</button>
            </div>
            <div class="menu-mais" id="menuMais-${key}" style="display:none;">
                <button onclick="editarPedido('${key}');fecharMenuMais('menuMais-${key}')">✏️ Editar</button>
                <button onclick="gerarCobrancaPix('${key}');fecharMenuMais('menuMais-${key}')">💸 Pix</button>
                <button onclick="abrirTemplates('${key}');fecharMenuMais('menuMais-${key}')">📋 Templates</button>
                <hr>
                <button class="menu-mais-excluir" onclick="excluirPedido('${key}');fecharMenuMais('menuMais-${key}')">🗑️ Excluir</button>
            </div>`;
    const header = document.createElement('div');
    header.className = 'pedido-header';
    header.style.cursor = 'pointer';
    header.title = 'Clique para ver detalhes';
    const nomeEl = document.createElement('div');
    nomeEl.className = 'pedido-nome';
    nomeEl.textContent = (pedido.nome || 'N/A') + ' 🔽';
    const statusEl = document.createElement('div');
    statusEl.className = 'pedido-status ' + statusClass;
    statusEl.textContent = statusTexto;
    header.appendChild(nomeEl);
    header.appendChild(statusEl);
    const resumo = document.createElement('div');
    resumo.className = 'pedido-resumo';
    const infoTel = document.createElement('div');
    infoTel.className = 'pedido-info';
    infoTel.innerHTML = '<strong>Telefone:</strong> ' + escaparHTML(pedido.telefone || 'N/A');
    const semHorario = !pedido.hora || !pedido.hora.trim();
    const dataTexto = (formatarDataComDia(pedido.dataEntrega) || 'N/A') + (semHorario ? '' : ' às ' + pedido.hora.trim() + 'h');
    const badgeSemHorario = (!finalizado && semHorario) ? '<span style="background:#E0E0E0;color:#666;border-radius:50px;padding:2px 8px;font-size:0.7em;font-weight:600;margin-left:6px;">⏰ sem horário</span>' : '';    const infoData = document.createElement('div');
    infoData.className = 'pedido-info';
    infoData.innerHTML = '<strong>Data:</strong> ' + escaparHTML(dataTexto) + badgeSemHorario;
    const infoBrig = document.createElement('div');
    infoBrig.className = 'pedido-info';
    infoBrig.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;gap:4px;">
        <span><strong>Total:</strong> ${escaparHTML(valorFormatado)}</span>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;flex-wrap:nowrap;">
            <span style="background:var(--cream-dark);color:var(--brown-warm);border-radius:50px;padding:2px 8px;font-size:0.73em;font-weight:600;white-space:nowrap;">🍫 ${totalBrig} un.</span>
            ${badgeTempo}
        </div>
    </div>`;
    resumo.appendChild(infoTel);
    resumo.appendChild(infoData);
    resumo.appendChild(infoBrig);
    if (pedido.statusPagamento === 'Pago Parcialmente') {
        const vPago  = parseFloat((pedido.valorPago||'').replace('R$','').replace(',','.').trim()) || 0;
        const vTotal = typeof pedido.valorTotal === 'number' ? pedido.valorTotal : 0;
        const vSaldo = Math.max(0, vTotal - vPago);
        const infoPag = document.createElement('div');
        infoPag.className = 'pedido-info';
        infoPag.style.cssText = 'background:#FEF3C7;border-radius:10px;padding:8px 12px;margin-top:6px;';
        infoPag.innerHTML = `⚠️ <strong>Pago:</strong> <span style="color:var(--green);font-weight:700;">R$ ${vPago.toFixed(2).replace('.',',')}</span>`
            + ` &nbsp;|&nbsp; <strong>Falta:</strong> <span style="color:var(--red);font-weight:700;">R$ ${vSaldo.toFixed(2).replace('.',',')}</span>`;
        resumo.appendChild(infoPag);
    }
    const detalhes = document.createElement('div');
    detalhes.className = 'pedido-detalhes';
    detalhes.id = 'detalhes-' + key;
    detalhes.style.display = 'none';
    const tipoEntrega = pedido.tipoEntrega || 'retirada';
    const tipoDiv = document.createElement('div');
    tipoDiv.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:'
        + (tipoEntrega === 'entrega' ? '#DBEAFE' : '#D1FAE5')
        + ';border-radius:50px;padding:4px 12px;font-size:0.8em;font-weight:700;color:'
        + (tipoEntrega === 'entrega' ? '#1E40AF' : '#065F46')
        + ';margin-bottom:10px;';
    tipoDiv.textContent = tipoEntrega === 'entrega' ? '🚚 Entrega' : '🏠 Retirada';
    detalhes.appendChild(tipoDiv);
    if (tipoEntrega === 'entrega' && pedido.endereco) {
        const endEl = document.createElement('div');
        endEl.className = 'pedido-info';
        endEl.innerHTML = '<strong>Endereço:</strong> '
            + escaparHTML(pedido.endereco.logradouro + ', ' + pedido.endereco.numero
            + ' — ' + pedido.endereco.bairro + ', ' + pedido.endereco.cidade);
        detalhes.appendChild(endEl);
    }
    const itensBox = document.createElement('div');
    itensBox.className = 'pedido-itens-lista';
    itensBox.style.marginTop = '10px';
    const grupos = [
        { cat:'trad',    label:'🍫 Tradicionais', cor:'#92400E', bg:'#FEF3C7', precoAuto:precoTradAuto    },
        { cat:'frutas',  label:'🍓 Frutas',        cor:'#065F46', bg:'#D1FAE5', precoAuto:precoFrutasAuto  },
        { cat:'gourmet', label:'✨ Gourmet',        cor:'#5B21B6', bg:'#EDE9FE', precoAuto:precoGourmetAuto }
    ];
    if (todosItens.length > 0) {
        let tbodyHTML = '';
        grupos.forEach(grupo => {
            const itensCat = todosItens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === grupo.cat);
            if (itensCat.length === 0) return;
            const totalCat = itensCat.reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
            const valorCat = itensCat.reduce((s,i) => {
                const preco = i.precoManual !== undefined ? i.precoManual : grupo.precoAuto;
                return s + (parseInt(i.quantidade)||0) * preco;
            }, 0);
            tbodyHTML += `<tr><td colspan="4" style="padding:6px 8px;background:${grupo.bg};font-weight:700;color:${grupo.cor};font-size:0.78em;">${grupo.label}<span style="float:right;font-weight:600;">${totalCat} un — R$ ${valorCat.toFixed(2).replace('.',',')}</span></td></tr>`;
            itensCat.forEach(item => {
                const qtd   = parseInt(item.quantidade) || 0;
                const preco = item.precoManual !== undefined ? item.precoManual : grupo.precoAuto;
                const sub   = (qtd * preco).toFixed(2).replace('.', ',');
                tbodyHTML += `<tr>
                    <td>${escaparHTML(item.sabor||item.nome||'Item')}</td>
                    <td style="text-align:center;">${qtd}</td>
                    <td style="text-align:center;">${escaparHTML(item.formato||'N/A')} / ${escaparHTML(item.tipoForma||'N/A')} / ${escaparHTML(item.cor||'N/A')}</td>
                    <td style="text-align:right;">R$ ${sub}</td>
                </tr>`;
            });
        });
        itensBox.innerHTML = `<table class="pedido-itens-tabela">
            <thead><tr>
                <th>Sabor</th><th style="text-align:center;">Qtd</th>
                <th style="text-align:center;">Detalhes</th><th style="text-align:right;">R$</th>
            </tr></thead>
            <tbody>${tbodyHTML}</tbody>
        </table>`;
    } else { itensBox.textContent = 'Sem itens'; }
    detalhes.appendChild(itensBox);
    if (pedido.observacoes && pedido.observacoes.trim()) {
        const obsEl = document.createElement('div');
        obsEl.className = 'pedido-info';
        obsEl.style.marginTop = '8px';
        obsEl.innerHTML = '<strong>Obs:</strong> ' + escaparHTML(pedido.observacoes);
        detalhes.appendChild(obsEl);
    }
    if (pedido.avaliacao) {
        const av = pedido.avaliacao;
        const nota = av?.nota ? parseInt(av.nota) : 0;
        const emojiNota = nota === 3 ? '😊' : nota === 2 ? '😐' : nota === 1 ? '😞' : '⚪';
        const avEl = document.createElement('div');
        avEl.className = 'pedido-info';
        avEl.style.cssText = 'background:#FEF3C7;border-radius:10px;padding:8px 12px;margin-top:8px;';
        avEl.innerHTML = `<strong>Avaliação:</strong> ${emojiNota} ${av.comentario ? '<br>"' + escaparHTML(av.comentario) + '"' : ''}`;
        detalhes.appendChild(avEl);
    }
    header.addEventListener('click', function() {
        const aberto = detalhes.style.display !== 'none';
        detalhes.style.display = aberto ? 'none' : 'block';
        nomeEl.textContent = (pedido.nome || 'N/A') + (aberto ? ' 🔽' : ' 🔼');
    });
    const botoesDiv = document.createElement('div');
    botoesDiv.className = 'pedido-botoes';
    botoesDiv.style.position = 'relative';
    botoesDiv.innerHTML = botoesHTML;
    card.appendChild(header);
    card.appendChild(resumo);
    card.appendChild(detalhes);
    card.appendChild(botoesDiv);
    wrapper.appendChild(card);
    return wrapper;
}

function finalizarPedido(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val(); if (!p) return;
        const statusAtual = p.statusPagamento || '';
        const msg = statusAtual === 'Pago' ? 'Finalizar este pedido?' : `⚠️ Pagamento: "${statusAtual}". Finalizar mesmo assim?`;
        showConfirmModal(msg, function() {
            database.ref('pedidos/' + key).update({ statusPagamento: 'entregue' }).then(() => {
                toast('Pedido finalizado!');
                dispararConfete();
                mostrarCheckAnimado();
                carregarAndamento();
                if (mesAtual !== undefined) renderizarCalendario();
            }).catch(err => toast('Erro: ' + err.message, 'erro'));
        });
    });
}

/* ── CHECK ANIMADO ── */
function mostrarCheckAnimado() {
    if (!document.getElementById('estiloCheckAnimado')) {
        const style = document.createElement('style');
        style.id = 'estiloCheckAnimado';
        style.textContent = `
            @keyframes checkCirculo { to { stroke-dashoffset: 0; } }
            @keyframes checkTraco   { to { stroke-dashoffset: 0; } }
        `;
        document.head.appendChild(style);
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;';
    overlay.innerHTML = `
        <svg width="110" height="110" viewBox="0 0 110 110" style="filter:drop-shadow(0 6px 16px rgba(0,0,0,0.35));">
            <circle cx="55" cy="55" r="50" fill="var(--green)" opacity="0.15"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--green)" stroke-width="5"
                stroke-dasharray="289" stroke-dashoffset="289" stroke-linecap="round"
                style="animation:checkCirculo 0.5s ease forwards;"/>
            <path d="M32 56 L48 72 L80 38" fill="none" stroke="var(--green)" stroke-width="6"
                stroke-linecap="round" stroke-linejoin="round"
                stroke-dasharray="70" stroke-dashoffset="70"
                style="animation:checkTraco 0.4s ease 0.4s forwards;"/>
        </svg>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.35s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
    }, 950);
}

function excluirPedido(key) {
    showConfirmModal('⚠️ Excluir este pedido? Ação irreversível.', function() {
        const card = document.querySelector(`[data-key="${key}"]`);
        const wrapper = card ? card.closest('.swipe-wrapper') : null;
        let cancelado = false;

        if (wrapper) {
            wrapper.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
            wrapper.style.maxHeight = wrapper.offsetHeight + 'px';
            wrapper.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                wrapper.style.opacity = '0';
                wrapper.style.maxHeight = '0';
            });
        }

        mostrarToastDesfazer('🗑️ Pedido excluído',
            function desfazer() {
                cancelado = true;
                if (wrapper) {
                    wrapper.style.opacity = '1';
                    wrapper.style.maxHeight = '';
                    wrapper.style.overflow = '';
                }
            },
            async function confirmarExclusao() {
                if (cancelado) return;
                try {
                    const snap = await database.ref('pedidos/' + key).once('value');
                    const pedido = snap.val();
                    await database.ref('pedidos/' + key).remove();
                    if (pedido && pedido.itens) await ajustarEstoquePorPedido(pedido.itens, 'devolver');
                    carregarAndamento(); carregarFinalizados();
                    if (mesAtual !== undefined) renderizarCalendario();
                } catch (err) {
                    toast('Erro: ' + err.message, 'erro');
                }
            }
        );
    });
}

/* ── TOAST COM DESFAZER (genérico) ── */
function mostrarToastDesfazer(mensagem, onDesfazer, onConfirmar) {
    const existente = document.getElementById('toastDesfazer');
    if (existente) existente.remove();

    const toastEl = document.createElement('div');
    toastEl.id = 'toastDesfazer';
    toastEl.style.cssText = `
        position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
        background:var(--brown-dark); color:var(--white); padding:12px 16px 12px 18px;
        border-radius:12px; display:flex; align-items:center; gap:16px;
        font-family:'DM Sans',sans-serif; font-size:0.88rem; font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; max-width:90vw;
    `;
    const texto = document.createElement('span');
    texto.textContent = mensagem;
    const btnDesfazer = document.createElement('button');
    btnDesfazer.textContent = 'Desfazer';
    btnDesfazer.style.cssText = `
        background:none; border:none; color:var(--amber); font-weight:700;
        font-size:0.88rem; cursor:pointer; padding:6px 4px; white-space:nowrap;
    `;
    toastEl.appendChild(texto);
    toastEl.appendChild(btnDesfazer);
    document.body.appendChild(toastEl);

    let concluido = false;
    const timer = setTimeout(() => {
        if (concluido) return;
        concluido = true;
        toastEl.remove();
        onConfirmar();
    }, 5000);

    btnDesfazer.addEventListener('click', () => {
        if (concluido) return;
        concluido = true;
        clearTimeout(timer);
        toastEl.remove();
        onDesfazer();
        if (typeof toast === 'function') toast('↩️ Ação desfeita');
    });
}

function editarPedido(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const data = snapshot.val(); if (!data) { toast('Pedido não encontrado.', 'erro'); return; }
        document.querySelectorAll('.secao').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('secao-criar').classList.add('active');
        document.querySelector('.menu-btn').classList.add('active');
        window.scrollTo(0, 0);
        setVal('nome', data.nome); setVal('telefone', data.telefone);
        setVal('dataEntrega', converterDataParaISO(data.dataEntrega));
        setVal('horarioEntrega', data.hora); setVal('tipoEntrega', data.tipoEntrega || 'retirada');
        setVal('observacoes', data.observacoes); setVal('statusPagamento', data.statusPagamento);
        setVal('valorPago', data.valorPago);
        if (data.tipoEntrega === 'entrega' && data.endereco) {
            document.getElementById('enderecoFields').style.display = 'block';
            ['cep','endereco','bairro','cidade','numero'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
            setVal('cep', data.endereco.cep); setVal('endereco', data.endereco.logradouro);
            setVal('numero', data.endereco.numero); setVal('bairro', data.endereco.bairro);
            setVal('cidade', data.endereco.cidade); setVal('pontoReferencia', data.endereco.complemento);
        }
        document.getElementById('valorPagoContainer').style.display = data.statusPagamento === 'Pago Parcialmente' ? 'block' : 'none';
        itens = []; document.getElementById('itensList').innerHTML = '';
        if (data.itens && Array.isArray(data.itens)) {
            data.itens.forEach(item => {
                itens.push({ id: String(Date.now())+String(Math.floor(Math.random()*1000)), sabor: item.sabor||item.nome, formato: item.formato, tipoForma: item.tipoForma, cor: item.cor, quantidade: item.quantidade });
            });
        }
        setVal('valorFrete', formatarValor(data.valorFrete));
        setVal('valorDesconto', formatarValor(data.desconto));
        setTimeout(() => { renderizarItens(); atualizarValorBrigadeiros(); atualizarTotal(); }, 50);
        document.getElementById('btnEnviar').textContent = '✏️ Atualizar Pedido';
        window.pedidoEmEdicao = key;
    });
}

// ====================== FILTROS ======================
/* ── DESTAQUE DE BUSCA ── */
function destacarBusca(nomeEl, termo) {
    if (!nomeEl.dataset.nomeBase) {
        nomeEl.dataset.nomeBase = nomeEl.textContent.replace(/ (🔽|🔼)$/, '');
    }
    const base = nomeEl.dataset.nomeBase;
    const iconeMatch = nomeEl.textContent.match(/ (🔽|🔼)$/);
    const icone = iconeMatch ? iconeMatch[1] : '🔽';

    const idx = termo ? base.toLowerCase().indexOf(termo) : -1;
    if (idx === -1) {
        nomeEl.textContent = base + ' ' + icone;
        return;
    }
    const antes  = base.slice(0, idx);
    const meio   = base.slice(idx, idx + termo.length);
    const depois = base.slice(idx + termo.length);
    nomeEl.innerHTML = `${escaparHTML(antes)}<mark style="background:var(--amber-light);color:var(--brown-dark);border-radius:3px;padding:0 1px;">${escaparHTML(meio)}</mark>${escaparHTML(depois)} ${icone}`;
}

function filtrarAndamentoPorNome() {
    const lista = document.getElementById('lista-andamento');
    if (lista.innerHTML.includes('Carregando')) return;
    const termo = document.getElementById('buscaAndamento').value.toLowerCase().trim();
    const chipAtivo = document.querySelector('#filtros-status .chip-filtro.active');
    const status = chipAtivo ? chipAtivo.textContent.trim() : 'Todos';
    document.querySelectorAll('#lista-andamento .pedido-card').forEach(card => {
        const nomeEl = card.querySelector('.pedido-nome');
        const statusEl = card.querySelector('.pedido-status');
        if (!nomeEl) return;
        destacarBusca(nomeEl, termo);
        const nomeOk = !termo || nomeEl.dataset.nomeBase.toLowerCase().includes(termo);
        const statusOk = status === 'Todos' || !statusEl || statusEl.textContent.trim() === status;
        card.parentElement.style.display = (nomeOk && statusOk) ? '' : 'none';
    });
}

function filtrarStatus(status, btn) {
    document.querySelectorAll('#filtros-status .chip-filtro').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const termo = document.getElementById('buscaAndamento').value.toLowerCase().trim();
    document.querySelectorAll('#lista-andamento .pedido-card').forEach(card => {
        const nomeEl = card.querySelector('.pedido-nome');
        const statusEl = card.querySelector('.pedido-status');
        if (!nomeEl || !statusEl) return;
        destacarBusca(nomeEl, termo);
        const nomeOk = !termo || nomeEl.dataset.nomeBase.toLowerCase().includes(termo);
        const statusOk = status === 'todos' || statusEl.textContent.trim() === status;
        card.parentElement.style.display = (nomeOk && statusOk) ? '' : 'none';
    });
}

function filtrarFinalizadosPorNome() {
    const termo = document.getElementById('buscaFinalizados').value.toLowerCase().trim();
    document.querySelectorAll('#lista-finalizados .pedido-card').forEach(card => {
        const nomeEl = card.querySelector('.pedido-nome'); if (!nomeEl) return;
        destacarBusca(nomeEl, termo);
        card.parentElement.style.display = (!termo || nomeEl.dataset.nomeBase.toLowerCase().includes(termo)) ? '' : 'none';
    });
}

function filtrarFinalizadosPorPeriodo() {
    const mesVal = document.getElementById('filtroFinalizadosMes').value;
    const ano    = parseInt(document.getElementById('filtroFinalizadosAno').value);
    if (mesVal === '') { carregarFinalizados(); return; }
    const mes = parseInt(mesVal);
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const lista = document.getElementById('lista-finalizados');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidos').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento !== 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            if (dataP.getMonth() !== mes || dataP.getFullYear() !== ano) return;
            p.key = child.key; pedidos.push(p);
        });
        if (pedidos.length === 0) {
            lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido em ${meses[mes]} de ${ano}.</p>`;
            return;
        }
        pedidos.sort((a,b) => {
            const toDate = d => { if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T00:00:00'); const p=d.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):null; };
            const da=toDate(a.dataEntrega),db=toDate(b.dataEntrega);
            if(!da&&!db)return 0;if(!da)return 1;if(!db)return -1;
            if(db-da!==0)return db-da;
            const ha=(a.hora&&a.hora.trim())?a.hora.trim():'00:00';
            const hb=(b.hora&&b.hora.trim())?b.hora.trim():'00:00';
            return hb.localeCompare(ha);
        });
        lista.innerHTML = '';
        const pInfo = document.createElement('p');
        pInfo.style.cssText = 'color:var(--brown-warm);font-size:0.85em;margin-bottom:12px;';
        pInfo.innerHTML = `📅 ${meses[mes]} de ${ano} — ${pedidos.length} pedido${pedidos.length>1?'s':''} — <a href="#" onclick="carregarFinalizados();return false;" style="color:var(--amber);">ver todos</a>`;
        lista.appendChild(pInfo);
        pedidos.forEach(p => lista.appendChild(criarCard(p, p.key, true)));
    });
}

function filtrarAndamentoPorData() {
    const termo = document.getElementById('buscaAndamentoData').value.trim();
    document.querySelectorAll('#lista-andamento .swipe-wrapper').forEach(wrapper => {
        if (!termo || termo.length < 3) { wrapper.style.display = ''; return; }
        const card = wrapper.querySelector('.pedido-card');
        if (!card) return;
        const infoData = card.querySelector('.pedido-info:nth-child(2)');
        wrapper.style.display = (infoData && infoData.textContent.includes(termo)) ? '' : 'none';
    });
}

// ====================== CALENDÁRIO ANDAMENTO ======================
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();

function toggleCalendario() {
    const w = document.getElementById('calendario-wrapper');
    const btn = event.target.closest('button') || event.target;
    if (w.style.display === 'none' || w.style.display === '') {
        w.style.display = 'block'; btn.textContent = '📅 Fechar Calendário';
        renderizarCalendario(); filtrarAndamentoPorMes();
    } else { w.style.display = 'none'; btn.textContent = '📅 Ver Calendário'; carregarAndamento(); }
}

function filtrarAndamentoPorMes() {
    const lista = document.getElementById('lista-andamento');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidos').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            if (dataP.getMonth() !== mesAtual || dataP.getFullYear() !== anoAtual) return;
            p.key = child.key; pedidos.push(p);
        });
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        if (pedidos.length === 0) { lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido para ${meses[mesAtual]} de ${anoAtual}.</p>`; return; }
        pedidos.sort((a,b) => {
            const toDate = d => { if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T00:00:00'); const p=d.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):null; };
            const da=toDate(a.dataEntrega),db=toDate(b.dataEntrega); if(!da&&!db)return 0; if(!da)return 1; if(!db)return -1;
            if (da - db !== 0) return da - db;
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '99:99';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '99:99';
            return ha.localeCompare(hb);
        });
        lista.innerHTML = '';
        pedidos.forEach(p => lista.appendChild(criarCard(p, p.key, false)));
        document.querySelectorAll('#filtros-status .chip-filtro').forEach(b => b.classList.remove('active'));
        const chipTodos = document.querySelector('#filtros-status .chip-filtro'); if (chipTodos) chipTodos.classList.add('active');
    });
}

function renderizarCalendario() {
    const container = document.getElementById('calendario-container');
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    let html = `<div class="calendario-header"><button class="btn-mes" onclick="mudarMes(-1)">← Anterior</button><h3>${meses[mesAtual]} de ${anoAtual}</h3><button class="btn-mes" onclick="mudarMes(1)">Próximo →</button></div><div class="calendario-grid">`;
    dias.forEach(d => html += `<div class="dia-semana">${d}</div>`);
    const primeiro = new Date(anoAtual, mesAtual, 1);
    const diasAntes = primeiro.getDay();
    const ultimoDia = new Date(anoAtual, mesAtual+1, 0).getDate();
    for (let i=0; i<diasAntes; i++) html += `<div class="dia outro-mes"></div>`;
    const hoje = new Date();
    const diaHojeNum = hoje.getDate();
    const mesHojeNum = hoje.getMonth();
    const anoHojeNum = hoje.getFullYear();
    for (let dia=1; dia<=ultimoDia; dia++) {
        const dataStr = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const isHoje = dia === diaHojeNum && mesAtual === mesHojeNum && anoAtual === anoHojeNum;
        html += `<div class="dia sem-pedidos${isHoje ? ' dia-hoje' : ''}" id="dia-${dia}" onclick="filtrarPorDia('${dataStr}')"><div class="dia-numero">${dia}</div></div>`;
    }
    const diasDepois = 42 - (diasAntes + ultimoDia);
    for (let i=0; i<diasDepois; i++) html += `<div class="dia outro-mes"></div>`;
    html += `</div>`;
    container.innerHTML = html;
    setTimeout(() => {
        database.ref('pedidos').once('value', snapshot => {
            snapshot.forEach(child => {
                const p = child.val(); const dataRef = p.dataEntrega || p.data;
                if (p.statusPagamento === 'entregue' || !dataRef) return;
                let partes;
                if (dataRef.includes('/')) partes = dataRef.split('/');
                else if (dataRef.includes('-')) { const pts = dataRef.split('-'); partes = [pts[2],pts[1],pts[0]]; }
                else return;
                if (partes.length !== 3) return;
                const dia = parseInt(partes[0]), mes = parseInt(partes[1])-1, ano = parseInt(partes[2]);
                if (ano === anoAtual && mes === mesAtual) {
                    const el = document.getElementById('dia-' + dia);
                    if (el) { el.classList.remove('sem-pedidos'); let cnt = el.querySelector('.dia-contador'); if (!cnt) { cnt = document.createElement('div'); cnt.className = 'dia-contador'; cnt.textContent = '1'; el.appendChild(cnt); } else { cnt.textContent = parseInt(cnt.textContent)+1; } }
                }
            });
        });
    }, 100);
    setTimeout(() => marcarDiasBloqueadosCalendario(mesAtual, anoAtual, 'dia'), 300);
}

function mudarMes(dir) { mesAtual += dir; if (mesAtual<0){mesAtual=11;anoAtual--;} if (mesAtual>11){mesAtual=0;anoAtual++;} renderizarCalendario(); filtrarAndamentoPorMes(); }

function filtrarPorDia(dataISO) {
    const lista = document.getElementById('lista-andamento');
    database.ref('pedidos').once('value', snapshot => {
        const pedidosDia = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento === 'entregue') return;
            let dataPedido = p.dataEntrega || p.data || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            if (dataPedido === dataISO) { p.key = child.key; pedidosDia.push(p); }
        });
        lista.innerHTML = '';
        if (pedidosDia.length === 0) {
            const [ano,mes,dia] = dataISO.split('-');
            lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido para ${dia}/${mes}/${ano}.</p>`;
            return;
        }
        pedidosDia.sort((a,b) => (a.hora||'00:00').localeCompare(b.hora||'00:00'));
        pedidosDia.forEach(p => lista.appendChild(criarCard(p, p.key, false)));
    });
}

// ====================== CALENDÁRIO FINALIZADOS ======================
let mesAtualFin = new Date().getMonth();
let anoAtualFin = new Date().getFullYear();

function toggleCalendarioFinalizados() {
    const w = document.getElementById('calendario-wrapper-finalizados');
    const btn = event.target.closest('button') || event.target;
    if (w.style.display === 'none' || w.style.display === '') {
        w.style.display = 'block'; btn.textContent = '📅 Fechar Calendário';
        renderizarCalendarioFinalizados(); filtrarFinalizadosPorMes();
    } else { w.style.display = 'none'; btn.textContent = '📅 Ver Calendário'; carregarFinalizados(); }
}

function renderizarCalendarioFinalizados() {
    const container = document.getElementById('calendario-container-finalizados');
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    let html = `<div class="calendario-header"><button class="btn-mes" onclick="mudarMesFinalizados(-1)">← Anterior</button><h3>${meses[mesAtualFin]} de ${anoAtualFin}</h3><button class="btn-mes" onclick="mudarMesFinalizados(1)">Próximo →</button></div><div class="calendario-grid">`;
    dias.forEach(d => html += `<div class="dia-semana">${d}</div>`);
    const primeiro = new Date(anoAtualFin, mesAtualFin, 1);
    const diasAntes = primeiro.getDay();
    const ultimoDia = new Date(anoAtualFin, mesAtualFin+1, 0).getDate();
    for (let i=0; i<diasAntes; i++) html += `<div class="dia outro-mes"></div>`;
    const hojeF = new Date();
    const diaHojeFNum = hojeF.getDate();
    const mesHojeFNum = hojeF.getMonth();
    const anoHojeFNum = hojeF.getFullYear();
    for (let dia=1; dia<=ultimoDia; dia++) {
        const dataStr = `${anoAtualFin}-${String(mesAtualFin+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const isHoje = dia === diaHojeFNum && mesAtualFin === mesHojeFNum && anoAtualFin === anoHojeFNum;
        html += `<div class="dia sem-pedidos${isHoje ? ' dia-hoje' : ''}" id="dia-fin-${dia}" onclick="filtrarPorDiaFinalizados('${dataStr}')"><div class="dia-numero">${dia}</div></div>`;
    }
    const diasDepois = 42 - (diasAntes + ultimoDia);
    for (let i=0; i<diasDepois; i++) html += `<div class="dia outro-mes"></div>`;
    html += `</div>`;
    container.innerHTML = html;
    setTimeout(() => {
        database.ref('pedidos').once('value', snapshot => {
            snapshot.forEach(child => {
                const p = child.val(); const dataRef = p.dataEntrega || p.data;
                if (p.statusPagamento !== 'entregue' || !dataRef) return;
                let partes;
                if (dataRef.includes('/')) partes = dataRef.split('/');
                else if (dataRef.includes('-')) { const pts = dataRef.split('-'); partes = [pts[2],pts[1],pts[0]]; }
                else return;
                if (partes.length !== 3) return;
                const dia = parseInt(partes[0]), mes = parseInt(partes[1])-1, ano = parseInt(partes[2]);
                if (ano === anoAtualFin && mes === mesAtualFin) {
                    const el = document.getElementById('dia-fin-'+dia);
                    if (el) { el.classList.remove('sem-pedidos'); let cnt = el.querySelector('.dia-contador-verde'); if (!cnt) { cnt = document.createElement('div'); cnt.className = 'dia-contador-verde'; cnt.textContent = '1'; el.appendChild(cnt); } else { cnt.textContent = parseInt(cnt.textContent)+1; } }
                }
            });
        });
    }, 100);
    setTimeout(() => marcarDiasBloqueadosCalendario(mesAtualFin, anoAtualFin, 'dia-fin'), 300);
}

function mudarMesFinalizados(dir) { mesAtualFin += dir; if(mesAtualFin<0){mesAtualFin=11;anoAtualFin--;} if(mesAtualFin>11){mesAtualFin=0;anoAtualFin++;} renderizarCalendarioFinalizados(); filtrarFinalizadosPorMes(); }

function filtrarFinalizadosPorMes() {
    const lista = document.getElementById('lista-finalizados');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    database.ref('pedidos').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento !== 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            if (dataP.getMonth() !== mesAtualFin || dataP.getFullYear() !== anoAtualFin) return;
            p.key = child.key; pedidos.push(p);
        });
        if (pedidos.length === 0) { lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido finalizado em ${meses[mesAtualFin]} de ${anoAtualFin}.</p>`; return; }
        pedidos.sort((a,b) => {
            const toDate = d => { if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T00:00:00'); const p=d.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):null; };
            const da=toDate(a.dataEntrega),db=toDate(b.dataEntrega); if(!da&&!db)return 0; if(!da)return 1; if(!db)return -1;
            if(db-da!==0)return db-da;
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '00:00';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '00:00';
            return hb.localeCompare(ha);
        });
        const pFin = document.createElement('p');
        pFin.style.cssText = 'color:var(--brown-warm);font-size:0.85em;margin-bottom:12px;';
        pFin.innerHTML = '📅 ' + meses[mesAtualFin] + ' de ' + anoAtualFin + ' — <a href="#" onclick="carregarFinalizados();return false;" style="color:var(--amber);">ver todos</a>';
        lista.appendChild(pFin);
        pedidos.forEach(p => lista.appendChild(criarCard(p, p.key, true)));
    });
}

function filtrarPorDiaFinalizados(dataISO) {
    const lista = document.getElementById('lista-finalizados');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidos').once('value', snapshot => {
        const pedidosDia = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento !== 'entregue') return;
            let dataPedido = p.dataEntrega || p.data || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            if (dataPedido === dataISO) { p.key = child.key; pedidosDia.push(p); }
        });
        lista.innerHTML = '';
        if (pedidosDia.length === 0) {
            const [ano,mes,dia] = dataISO.split('-');
            lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido finalizado em ${dia}/${mes}/${ano}.</p>`;
            return;
        }
        pedidosDia.sort((a,b) => (b.hora||'00:00').localeCompare(a.hora||'00:00'));
        pedidosDia.forEach(p => lista.appendChild(criarCard(p, p.key, true)));
    });
}

// ====================== NAVEGAÇÃO A PARTIR DO DASHBOARD ======================
function irParaPedidoEspecifico(key) {
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('secao-finalizados').classList.add('active');
    window.scrollTo(0, 0);
    const lista = document.getElementById('lista-finalizados');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val();
        if (!p) { lista.innerHTML = '<p style="color:var(--brown-warm);">Pedido não encontrado.</p>'; return; }
        lista.innerHTML = '';
        const pInfo = document.createElement('p');
        pInfo.style.cssText = 'color:var(--brown-warm);font-size:0.85em;margin-bottom:12px;';
        pInfo.innerHTML = '⭐ Pedido da avaliação — <a href="#" onclick="carregarFinalizados();return false;" style="color:var(--amber);">ver todos</a>';
        lista.appendChild(pInfo);
        const card = criarCard(p, key, true);
        lista.appendChild(card);
        setTimeout(() => {
            const header = card.querySelector('.pedido-header');
            if (header) header.click();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    });
}

function irParaPedidosDash(tipo) {
    const mes=parseInt(document.getElementById('dashMes').value);
    const ano=parseInt(document.getElementById('dashAno').value);
    const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.querySelectorAll('.secao').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(tipo==='finalizados'?'secao-finalizados':'secao-andamento').classList.add('active');
    window.scrollTo(0,0);
    const lista=document.getElementById('lista-'+tipo);
    lista.innerHTML='<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidos').once('value',snapshot=>{
        const pedidos=[];
        snapshot.forEach(child=>{
            const p=child.val();
            if(tipo==='finalizados'&&p.statusPagamento!=='entregue') return;
            if(tipo==='andamento'&&p.statusPagamento==='entregue') return;
            if(!p.dataEntrega) return;
            let dataP;
            if(/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('/');dataP=new Date(pts[2],pts[1]-1,pts[0]);}
            else if(/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('-');dataP=new Date(pts[0],pts[1]-1,pts[2]);}
            else return;
            if(dataP.getMonth()!==mes||dataP.getFullYear()!==ano) return;
            p.key=child.key;pedidos.push(p);
        });
        if(pedidos.length===0){lista.innerHTML=`<p style="color:var(--brown-warm);">Nenhum pedido em ${meses[mes]} de ${ano}.</p>`;return;}
        pedidos.sort((a,b)=>{
    const toDate=d=>{if(!d)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(d))return new Date(d+'T00:00:00');const p=d.split('/');return p.length===3?new Date(p[2],p[1]-1,p[0]):null;};
    const da=toDate(a.dataEntrega),db=toDate(b.dataEntrega);
    if(!da&&!db)return 0;if(!da)return 1;if(!db)return -1;
    if(tipo==='finalizados'){
        if(db-da!==0)return db-da;
        const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '00:00';
        const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '00:00';
        return hb.localeCompare(ha);
    }
    if(da-db!==0)return da-db;
    return (a.hora||'00:00').localeCompare(b.hora||'00:00');
});
        const fnVerTodos = tipo === 'finalizados' ? 'carregarFinalizados' : 'carregarAndamento';
        const pDash = document.createElement('p');
        pDash.style.cssText = 'color:var(--brown-warm);font-size:0.85em;margin-bottom:12px;';
        pDash.innerHTML = '📅 ' + meses[mes] + ' de ' + ano + ' — <a href="#" onclick="' + fnVerTodos + '();return false;" style="color:var(--amber);">ver todos</a>';
        lista.appendChild(pDash);
        pedidos.forEach(p=>lista.appendChild(criarCard(p,p.key,tipo==='finalizados')));
    });
}
