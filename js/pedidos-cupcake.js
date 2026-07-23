/* ═══════════════════════════════════════════
   PEDIDOS CUPCAKE — isolado do brigadeiro
   Usa o nó Firebase "pedidosCupcake" (nunca "pedidos")
   Depende de: pedidos-auth.js (database, toast, showConfirmModal)
═══════════════════════════════════════════ */

// ====================== ESTADO DO FORMULÁRIO ======================
window.itensCupcake = [];
window.pedidoCupcakeEmEdicao = null;
let mesAtualCupcake = new Date().getMonth();
let anoAtualCupcake = new Date().getFullYear();
let mesAtualFinCupcake = new Date().getMonth();
let anoAtualFinCupcake = new Date().getFullYear();
let graficoFaturamentoCupcake = null;

function toggleEnderecoCupcake() {
    const tipo = document.getElementById('tipoEntregaCupcake').value;
    document.getElementById('enderecoFieldsCupcake').style.display = tipo === 'entrega' ? 'block' : 'none';
}

function buscarClientesHistoricoCupcake(termo) {
    if (!termo || termo.length < 2) {
        document.getElementById('autocompleteListaCupcake').style.display = 'none';
        return;
    }
    database.ref('pedidosCupcake').orderByChild('nome').once('value', snapshot => {
        const clientes = {};
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.nome) return;
            if (p.nome.toLowerCase().includes(termo.toLowerCase())) {
                if (!clientes[p.nome] || (p.criadoEm || 0) > (clientes[p.nome].criadoEm || 0)) clientes[p.nome] = p;
            }
        });
        const lista = document.getElementById('autocompleteListaCupcake');
        const resultados = Object.values(clientes).slice(0, 5);
        if (resultados.length === 0) { lista.style.display = 'none'; return; }
        lista.innerHTML = '';
        resultados.forEach(c => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<strong>${escaparHTML(c.nome)}</strong><span style="color:var(--brown-warm);margin-left:8px;font-size:0.85em;">${escaparHTML(c.telefone || '')}</span>`;
            item.addEventListener('click', function () { preencherClienteCupcake(c); });
            lista.appendChild(item);
        });
        lista.style.display = 'block';
    });
}

function preencherClienteCupcake(cliente) {
    document.getElementById('nomeCupcake').value = cliente.nome || '';
    document.getElementById('telefoneCupcake').value = cliente.telefone || '';
    if (cliente.tipoEntrega === 'entrega' && cliente.endereco) {
        document.getElementById('tipoEntregaCupcake').value = 'entrega';
        toggleEnderecoCupcake();
        document.getElementById('cepCupcake').value = cliente.endereco.cep || '';
        document.getElementById('enderecoCupcake').value = cliente.endereco.logradouro || '';
        document.getElementById('numeroCupcake').value = cliente.endereco.numero || '';
        document.getElementById('bairroCupcake').value = cliente.endereco.bairro || '';
        document.getElementById('cidadeCupcake').value = cliente.endereco.cidade || '';
        document.getElementById('pontoReferenciaCupcake').value = cliente.endereco.complemento || '';
    }
    document.getElementById('autocompleteListaCupcake').style.display = 'none';
    toast('👤 Dados preenchidos!');
}

function adicionarItemCupcake() {
    const descricao = document.getElementById('descricaoItemCupcake').value.trim();
    const quantidade = parseInt(document.getElementById('quantidadeItemCupcake').value, 10);
    const valorUnidade = parseFloat((document.getElementById('valorUnidadeItemCupcake').value || 'R$ 0,00').replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
    if (!descricao) { toast('Informe o sabor/descrição do item.', 'erro'); return; }
    if (!quantidade || quantidade < 1) { toast('Informe uma quantidade válida.', 'erro'); return; }
    if (!valorUnidade || valorUnidade <= 0) { toast('Informe o valor unitário do item.', 'erro'); return; }
    window.itensCupcake.push({ descricao, quantidade, valorUnidade });
    document.getElementById('descricaoItemCupcake').value = '';
    document.getElementById('quantidadeItemCupcake').value = '';
    document.getElementById('valorUnidadeItemCupcake').value = '';
    renderizarItensCupcake();
    recalcularTotalCupcake();
}

function removerItemCupcake(index) {
    window.itensCupcake.splice(index, 1);
    renderizarItensCupcake();
    recalcularTotalCupcake();
}

function recalcularTotalCupcake() {
    const total = window.itensCupcake.reduce((s, item) => s + (item.quantidade * (item.valorUnidade || 0)), 0);
    document.getElementById('valorTotalCupcake').value = total > 0 ? 'R$ ' + total.toFixed(2).replace('.', ',') : '';
}

function renderizarItensCupcake() {
    const lista = document.getElementById('itensListCupcake');
    if (window.itensCupcake.length === 0) { lista.innerHTML = ''; return; }
    let linhas = '';
    window.itensCupcake.forEach((item, i) => {
        const valorUn = item.valorUnidade || 0;
        const subtotal = valorUn * item.quantidade;
        linhas += `<tr>
            <td>${escaparHTML(item.descricao)}</td>
            <td style="text-align:center;">${item.quantidade}</td>
            <td style="text-align:right;">R$ ${valorUn.toFixed(2).replace('.', ',')}</td>
            <td style="text-align:right;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
            <td style="text-align:center;"><button type="button" onclick="removerItemCupcake(${i})" style="background:none;border:none;color:var(--red);font-weight:700;cursor:pointer;font-size:1.1em;">✕</button></td>
        </tr>`;
    });
    lista.innerHTML = `<table class="pedido-itens-tabela" style="margin-top:12px;">
        <thead><tr>
            <th>Sabor</th><th style="text-align:center;">Qtd</th>
            <th style="text-align:right;">Vlr Un.</th><th style="text-align:right;">Subtotal</th><th></th>
        </tr></thead>
        <tbody>${linhas}</tbody>
    </table>`;
}

function limparFormularioCupcake() {
    document.getElementById('nomeCupcake').value = '';
    document.getElementById('telefoneCupcake').value = '';
    document.getElementById('dataEntregaCupcake').value = '';
    document.getElementById('horarioEntregaCupcake').value = '';
    document.getElementById('tipoEntregaCupcake').value = 'retirada';
    document.getElementById('cepCupcake').value = '';
    document.getElementById('enderecoCupcake').value = '';
    document.getElementById('numeroCupcake').value = '';
    document.getElementById('pontoReferenciaCupcake').value = '';
    document.getElementById('bairroCupcake').value = '';
    document.getElementById('cidadeCupcake').value = '';
    document.getElementById('descricaoItemCupcake').value = '';
    document.getElementById('quantidadeItemCupcake').value = '';
    document.getElementById('valorUnidadeItemCupcake').value = '';
    document.getElementById('valorTotalCupcake').value = '';
    document.getElementById('observacoesCupcake').value = '';
    document.getElementById('statusPagamentoCupcake').value = 'A pagar';
    document.getElementById('autocompleteListaCupcake').style.display = 'none';
    toggleEnderecoCupcake();
    window.itensCupcake = [];
    window.pedidoCupcakeEmEdicao = null;
    renderizarItensCupcake();
}

async function salvarPedidoCupcake() {
    const nome = document.getElementById('nomeCupcake').value.trim();
    const dataEntrega = document.getElementById('dataEntregaCupcake').value;
    const valorTexto = document.getElementById('valorTotalCupcake').value;
    const valorTotal = parseFloat((valorTexto || 'R$ 0,00').replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

    if (!nome) { toast('Informe o nome do cliente.', 'erro'); return; }
    if (!dataEntrega) { toast('Informe a data de entrega/retirada.', 'erro'); return; }
    if (window.itensCupcake.length === 0) { toast('Adicione ao menos um item.', 'erro'); return; }
    if (!valorTotal || valorTotal <= 0) { toast('Informe o valor total do pedido.', 'erro'); return; }

    const tipoEntrega = document.getElementById('tipoEntregaCupcake').value;
    const pedido = {
        nome,
        telefone: document.getElementById('telefoneCupcake').value.trim(),
        dataEntrega,
        hora: document.getElementById('horarioEntregaCupcake').value,
        tipoEntrega,
        itens: window.itensCupcake,
        valorTotal,
        observacoes: document.getElementById('observacoesCupcake').value.trim(),
        statusPagamento: document.getElementById('statusPagamentoCupcake').value
    };
    if (!window.pedidoCupcakeEmEdicao) pedido.criadoEm = Date.now();
    if (tipoEntrega === 'entrega') {
        pedido.endereco = {
            cep: document.getElementById('cepCupcake').value.trim(),
            logradouro: document.getElementById('enderecoCupcake').value.trim(),
            numero: document.getElementById('numeroCupcake').value.trim(),
            complemento: document.getElementById('pontoReferenciaCupcake').value.trim(),
            bairro: document.getElementById('bairroCupcake').value.trim(),
            cidade: document.getElementById('cidadeCupcake').value.trim()
        };
    }

    const btn = document.getElementById('btnEnviarCupcake');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const refPath = window.pedidoCupcakeEmEdicao
        ? 'pedidosCupcake/' + window.pedidoCupcakeEmEdicao
        : 'pedidosCupcake/' + database.ref('pedidosCupcake').push().key;
    try {
        await database.ref(refPath).update(pedido);
        toast('🧁 Pedido de cupcake salvo!');
        limparFormularioCupcake();
    } catch (err) {
        if (navigator.onLine === false) {
            toast('📶 Sem conexão. Pedido será enviado ao reconectar.', 'aviso');
        } else {
            toast('Erro ao salvar: ' + err.message, 'erro');
        }
    } finally {
        btn.disabled = false; btn.textContent = '💾 Salvar Pedido';
    }
}

function irParaCupcake(sub, btn) {
    document.querySelectorAll('.sub-secao-cupcake').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#secao-cupcake .menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('secao-' + sub).classList.add('active');
    if (btn) btn.classList.add('active');

    if (sub === 'cupcakeAndamento')   carregarAndamentoCupcake();
    if (sub === 'cupcakeFinalizados') carregarFinalizadosCupcake();
    if (sub === 'cupcakeDashboard')   carregarDashboardCupcake();
}

// Stubs — implementados na Etapa D/E/F
// ====================== ANDAMENTO ======================
function carregarAndamentoCupcake() {
    const lista = document.getElementById('lista-andamento-cupcake');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
            p.key = child.key; pedidos.push(p);
        });
        document.getElementById('tituloAndamentoContagemCupcake').textContent = `(${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''})`;
        if (pedidos.length === 0) { lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum pedido de cupcake em andamento.</p>'; return; }
        pedidos.sort((a, b) => {
            const toDate = d => { if (!d) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00'); const p = d.split('/'); return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : null; };
            const da = toDate(a.dataEntrega), db = toDate(b.dataEntrega);
            if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
            if (da - db !== 0) return da - db;
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '99:99';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '99:99';
            return ha.localeCompare(hb);
        });
        lista.innerHTML = '';
        pedidos.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, false)));
    });
}

function criarCardCupcake(pedido, key, finalizado) {
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';
    const card = document.createElement('div');
    card.className = 'pedido-card';
    card.dataset.key = key;
    card.style.cssText = 'margin-bottom:0;position:relative;z-index:1;';

    let dataP = null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1] - 1, pts[0]); }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(pedido.dataEntrega)) { const pts = pedido.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1] - 1, pts[2]); }
    let badgeTempo = '';
    if (!finalizado && dataP) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        dataP.setHours(0, 0, 0, 0);
        const diff = Math.round((dataP - hoje) / 86400000);
        if (diff < 0) { wrapper.classList.add('urgente-atrasado'); badgeTempo = `<span style="background:var(--red);color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">⚠️ Atrasado</span>`; }
        else if (diff === 0) { wrapper.classList.add('urgente-hoje'); badgeTempo = `<span style="background:var(--red);color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">🔴 HOJE</span>`; }
        else if (diff === 1) { wrapper.classList.add('urgente-amanha'); badgeTempo = `<span style="background:#F59E0B;color:white;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:8px;">⏰ AMANHÃ</span>`; }
        else badgeTempo = `<span style="background:var(--cream-dark);color:var(--brown-warm);border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:600;margin-left:8px;">em ${diff} dias</span>`;
    }

    const statusClass = finalizado ? 'status-entregue' : 'status-andamento';
    const statusTexto = finalizado ? 'Entregue ✅' : (pedido.statusPagamento || 'A pagar');
    const valorFormatado = typeof pedido.valorTotal === 'number' ? 'R$ ' + pedido.valorTotal.toFixed(2).replace('.', ',') : 'R$ 0,00';
    const totalItens = (pedido.itens || []).reduce((s, i) => s + (parseInt(i.quantidade) || 0), 0);

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
    const infoData = document.createElement('div');
    infoData.className = 'pedido-info';
    const semHorario = !pedido.hora || !pedido.hora.trim();
    const dataTexto = (formatarDataComDia(pedido.dataEntrega) || 'N/A') + (semHorario ? '' : ' às ' + pedido.hora.trim() + 'h');
    infoData.innerHTML = '<strong>Data:</strong> ' + escaparHTML(dataTexto);
    const infoValor = document.createElement('div');
    infoValor.className = 'pedido-info';
    infoValor.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;">
        <span><strong>Total:</strong> ${escaparHTML(valorFormatado)}</span>
        <div style="display:flex;align-items:center;gap:4px;">
            <span style="background:var(--cream-dark);color:var(--brown-warm);border-radius:50px;padding:2px 8px;font-size:0.73em;font-weight:600;">🧁 ${totalItens} un.</span>
            ${badgeTempo}
        </div>
    </div>`;
    resumo.appendChild(infoTel);
    resumo.appendChild(infoData);
    resumo.appendChild(infoValor);

    const detalhes = document.createElement('div');
    detalhes.className = 'pedido-detalhes';
    detalhes.id = 'detalhes-cupcake-' + key;
    detalhes.style.display = 'none';
    const tipoEntrega = pedido.tipoEntrega || 'retirada';
    const tipoDiv = document.createElement('div');
    tipoDiv.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:' + (tipoEntrega === 'entrega' ? '#DBEAFE' : '#D1FAE5') + ';border-radius:50px;padding:4px 12px;font-size:0.8em;font-weight:700;color:' + (tipoEntrega === 'entrega' ? '#1E40AF' : '#065F46') + ';margin-bottom:10px;';
    tipoDiv.textContent = tipoEntrega === 'entrega' ? '🚚 Entrega' : '🏠 Retirada';
    detalhes.appendChild(tipoDiv);
    if (tipoEntrega === 'entrega' && pedido.endereco) {
        const endEl = document.createElement('div');
        endEl.className = 'pedido-info';
        endEl.innerHTML = '<strong>Endereço:</strong> ' + escaparHTML((pedido.endereco.logradouro || '') + ', ' + (pedido.endereco.numero || '') + ' — ' + (pedido.endereco.bairro || '') + ', ' + (pedido.endereco.cidade || ''));
        detalhes.appendChild(endEl);
    }
    const itensBox = document.createElement('div');
    itensBox.className = 'pedido-itens-lista';
    itensBox.style.marginTop = '10px';
    const itensPedido = pedido.itens || [];
    if (itensPedido.length > 0) {
        const linhasItens = itensPedido.map(i => {
            const vUn = typeof i.valorUnidade === 'number' ? i.valorUnidade : null;
            const subtotal = vUn !== null ? vUn * (parseInt(i.quantidade) || 0) : null;
            return `<tr>
                <td>${escaparHTML(i.descricao || 'Item')}</td>
                <td style="text-align:center;">${i.quantidade}</td>
                <td style="text-align:right;">${vUn !== null ? 'R$ ' + vUn.toFixed(2).replace('.', ',') : '—'}</td>
                <td style="text-align:right;">${subtotal !== null ? 'R$ ' + subtotal.toFixed(2).replace('.', ',') : '—'}</td>
            </tr>`;
        }).join('');
        itensBox.innerHTML = `<table class="pedido-itens-tabela">
            <thead><tr>
                <th>Sabor</th><th style="text-align:center;">Qtd</th>
                <th style="text-align:right;">Vlr Un.</th><th style="text-align:right;">Subtotal</th>
            </tr></thead>
            <tbody>${linhasItens}</tbody>
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
    header.addEventListener('click', function () {
        const aberto = detalhes.style.display !== 'none';
        detalhes.style.display = aberto ? 'none' : 'block';
        nomeEl.textContent = (pedido.nome || 'N/A') + (aberto ? ' 🔽' : ' 🔼');
        wrapper.classList.toggle('card-expandido', !aberto);
    });

    const botoesDiv = document.createElement('div');
    botoesDiv.className = 'pedido-botoes';
    botoesDiv.innerHTML = finalizado
        ? `<button class="btn btn-cinza" onclick="imprimirComprovanteCupcake('${key}')">🧾 Comprovante</button>
           <button class="btn btn-vermelho" onclick="excluirPedidoCupcake('${key}')">🗑️ Excluir</button>`
        : `<button class="btn btn-finalizar-card" onclick="finalizarPedidoCupcake('${key}')">✓ Finalizar</button>
           <button class="btn btn-cinza" onclick="imprimirComprovanteCupcake('${key}')">🧾 Comprovante</button>
           <button class="btn btn-cinza" onclick="editarPedidoCupcake('${key}')">✏️ Editar</button>
           <button class="btn btn-vermelho" onclick="excluirPedidoCupcake('${key}')">🗑️ Excluir</button>`;

    card.appendChild(header);
    card.appendChild(resumo);
    card.appendChild(detalhes);
    card.appendChild(botoesDiv);
    wrapper.appendChild(card);
    return wrapper;
}

function finalizarPedidoCupcake(key) {
    showConfirmModal('Finalizar este pedido de cupcake?', function () {
        database.ref('pedidosCupcake/' + key).update({ statusPagamento: 'entregue' }).then(() => {
            toast('🧁 Pedido finalizado!');
            carregarAndamentoCupcake();
        }).catch(err => toast('Erro: ' + err.message, 'erro'));
    });
}

function excluirPedidoCupcake(key) {
    showConfirmModal('Excluir este pedido de cupcake? Essa ação não pode ser desfeita.', function () {
        database.ref('pedidosCupcake/' + key).remove().then(() => {
            toast('Pedido excluído.');
            carregarAndamentoCupcake();
        }).catch(err => toast('Erro: ' + err.message, 'erro'));
    });
}

function editarPedidoCupcake(key) {
    database.ref('pedidosCupcake/' + key).once('value', snapshot => {
        const p = snapshot.val(); if (!p) return;
        window.pedidoCupcakeEmEdicao = key;
        document.getElementById('nomeCupcake').value = p.nome || '';
        document.getElementById('telefoneCupcake').value = p.telefone || '';
        document.getElementById('dataEntregaCupcake').value = p.dataEntrega || '';
        document.getElementById('horarioEntregaCupcake').value = p.hora || '';
        document.getElementById('tipoEntregaCupcake').value = p.tipoEntrega || 'retirada';
        if (p.endereco) {
            document.getElementById('cepCupcake').value = p.endereco.cep || '';
            document.getElementById('enderecoCupcake').value = p.endereco.logradouro || '';
            document.getElementById('numeroCupcake').value = p.endereco.numero || '';
            document.getElementById('pontoReferenciaCupcake').value = p.endereco.complemento || '';
            document.getElementById('bairroCupcake').value = p.endereco.bairro || '';
            document.getElementById('cidadeCupcake').value = p.endereco.cidade || '';
        }
        toggleEnderecoCupcake();
        document.getElementById('valorTotalCupcake').value = typeof p.valorTotal === 'number' ? 'R$ ' + p.valorTotal.toFixed(2).replace('.', ',') : '';
        document.getElementById('observacoesCupcake').value = p.observacoes || '';
        document.getElementById('statusPagamentoCupcake').value = p.statusPagamento || 'A pagar';
        window.itensCupcake = p.itens ? [...p.itens] : [];
        renderizarItensCupcake();
        irParaCupcake('cupcakeCriar', document.querySelector('#secao-cupcake .menu-btn'));
        toast('Editando pedido de ' + (p.nome || 'cliente') + '.', 'aviso');
    });
}

// ====================== PRODUÇÃO SEMANAL ======================
function toggleResumoProdCupcake() {
    const div = document.getElementById('resumoProducaoCupcake');
    const btn = event.target;
    if (div.style.display === 'none' || div.style.display === '') { div.style.display = 'block'; btn.textContent = '🧁 Fechar Resumo'; carregarResumoProdCupcake(); }
    else { div.style.display = 'none'; btn.textContent = '🧁 Produção Semanal'; }
}

function carregarResumoProdCupcake() {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const diffSeg = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(agora); segunda.setDate(agora.getDate() + diffSeg); segunda.setHours(0, 0, 0, 0);
    const domingo = new Date(segunda); domingo.setDate(segunda.getDate() + 6); domingo.setHours(23, 59, 59, 999);
    const diasNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const mesesNome = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    database.ref('pedidosCupcake').orderByKey().once('value', snapshot => {
        const porDia = {};
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento === 'entregue') return;
            let dataPedido = p.dataEntrega || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPedido)) return;
            const dataObj = new Date(dataPedido + 'T00:00:00');
            if (dataObj < segunda || dataObj > domingo) return;
            if (!porDia[dataPedido]) porDia[dataPedido] = { itens: {}, timeline: [] };
            (p.itens || []).forEach(item => {
                const nome = item.descricao || 'Item';
                porDia[dataPedido].itens[nome] = (porDia[dataPedido].itens[nome] || 0) + (parseInt(item.quantidade) || 0);
            });
            const totalItens = (p.itens || []).reduce((s, i) => s + (parseInt(i.quantidade) || 0), 0);
            porDia[dataPedido].timeline.push({ horario: p.hora || '--:--', nome: p.nome || 'Cliente', itens: totalItens, tipo: p.tipoEntrega === 'entrega' ? `Entrega - ${p.endereco?.bairro || 'N/I'}` : 'Retirada', status: p.statusPagamento || '' });
        });
        const diasOrdenados = Object.keys(porDia).sort();
        let html = '';
        if (diasOrdenados.length === 0) {
            html = '<p style="color:var(--brown-warm);font-size:0.85em;">Nenhum pedido de cupcake para esta semana.</p>';
        } else {
            diasOrdenados.forEach(iso => {
                const partes = iso.split('-');
                const dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                const nomeDia = diasNome[dataObj.getDay()];
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const diffDias = Math.round((dataObj - hoje) / 86400000);
                const labelRelativo = diffDias === 0 ? '🔴 HOJE' : diffDias === 1 ? '⏰ AMANHÃ' : diffDias < 0 ? `⚠️ ${Math.abs(diffDias)}d atrás` : `em ${diffDias} dias`;
                const labelDia = `${nomeDia}, ${String(dataObj.getDate()).padStart(2, '0')}/${mesesNome[dataObj.getMonth()]}/${partes[0]}`;
                const { itens, timeline } = porDia[iso];
                const entries = Object.entries(itens).sort((a, b) => b[1] - a[1]);
                const totalDia = entries.reduce((s, e) => s + e[1], 0);
                const maxItem = entries[0]?.[1] || 1;
                html += `<div style="margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--brown-dark);border-radius:10px;padding:7px 14px;margin-bottom:10px;">
                        <span style="font-family:'Cormorant Garamond',serif;font-size:1em;font-weight:700;color:var(--amber-light);">📅 ${labelDia}</span>
                        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:0.75em;background:rgba(255,255,255,0.15);border-radius:50px;padding:2px 8px;color:var(--amber-light);">${labelRelativo}</span><span style="font-size:0.8em;font-weight:700;color:var(--amber-light);">${totalDia} un</span></div>
                    </div>`;
                entries.forEach(([nome, qtd]) => {
                    const pct = Math.round((qtd / maxItem) * 100);
                    html += `<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:0.84em;margin-bottom:3px;"><span>${escaparHTML(nome)}</span><strong>${qtd} un</strong></div><div style="background:var(--cream-dark);border-radius:6px;height:6px;overflow:hidden;"><div style="background:var(--amber);width:${pct}%;height:100%;border-radius:6px;"></div></div></div>`;
                });
                if (timeline.length > 0) {
                    timeline.sort((a, b) => a.horario.localeCompare(b.horario));
                    html += `<div style="margin-top:10px;position:relative;padding-left:22px;"><div style="position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:var(--cream-dark);"></div>`;
                    timeline.forEach((item, idx) => {
                        const cor = item.status === 'Pago' ? '#4A7C59' : item.status === 'Pago Parcialmente' ? '#F59E0B' : 'var(--amber)';
                        html += `<div style="position:relative;padding-left:16px;padding-bottom:${idx < timeline.length - 1 ? '8px' : '0'};"><div style="position:absolute;left:-13px;top:4px;width:12px;height:12px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 0 0 2px ${cor};"></div><div style="font-size:0.83em;background:var(--cream);border-radius:10px;padding:7px 12px;"><span style="font-weight:700;color:var(--brown-dark);">${item.horario}</span><span style="color:var(--brown-dark);"> — ${escaparHTML(item.nome)}</span><span style="color:var(--brown-warm);font-size:0.9em;"> (${item.itens} un) • ${item.tipo}</span></div></div>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
                if (iso !== diasOrdenados[diasOrdenados.length - 1]) html += `<hr style="border:none;border-top:1px dashed var(--cream-dark);margin:4px 0 18px;">`;
            });
        }
        document.getElementById('resumoProducaoConteudoCupcake').innerHTML = html;
    });
}

// ====================== CALENDÁRIO ======================
function toggleCalendarioCupcake() {
    const w = document.getElementById('calendario-wrapper-cupcake');
    const btn = event.target.closest('button') || event.target;
    if (w.style.display === 'none' || w.style.display === '') {
        w.style.display = 'block'; btn.textContent = '📅 Fechar Calendário';
        renderizarCalendarioCupcake(); filtrarAndamentoPorMesCupcake();
    } else { w.style.display = 'none'; btn.textContent = '📅 Calendário'; carregarAndamentoCupcake(); }
}

function renderizarCalendarioCupcake() {
    const container = document.getElementById('calendario-container-cupcake');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = `<div class="calendario-header"><button class="btn-mes" onclick="mudarMesCupcake(-1)">← Anterior</button><h3>${meses[mesAtualCupcake]} de ${anoAtualCupcake}</h3><button class="btn-mes" onclick="mudarMesCupcake(1)">Próximo →</button></div><div class="calendario-grid">`;
    dias.forEach(d => html += `<div class="dia-semana">${d}</div>`);
    const primeiro = new Date(anoAtualCupcake, mesAtualCupcake, 1);
    const diasAntes = primeiro.getDay();
    const ultimoDia = new Date(anoAtualCupcake, mesAtualCupcake + 1, 0).getDate();
    for (let i = 0; i < diasAntes; i++) html += `<div class="dia outro-mes"></div>`;
    const hoje = new Date();
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const dataStr = `${anoAtualCupcake}-${String(mesAtualCupcake + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const isHoje = dia === hoje.getDate() && mesAtualCupcake === hoje.getMonth() && anoAtualCupcake === hoje.getFullYear();
        html += `<div class="dia sem-pedidos${isHoje ? ' dia-hoje' : ''}" id="dia-cupcake-${dia}" onclick="filtrarPorDiaCupcake('${dataStr}')"><div class="dia-numero">${dia}</div></div>`;
    }
    const diasDepois = 42 - (diasAntes + ultimoDia);
    for (let i = 0; i < diasDepois; i++) html += `<div class="dia outro-mes"></div>`;
    html += `</div>`;
    container.innerHTML = html;
    setTimeout(() => {
        database.ref('pedidosCupcake').once('value', snapshot => {
            snapshot.forEach(child => {
                const p = child.val(); const dataRef = p.dataEntrega;
                if (p.statusPagamento === 'entregue' || !dataRef) return;
                let partes;
                if (dataRef.includes('/')) partes = dataRef.split('/');
                else if (dataRef.includes('-')) { const pts = dataRef.split('-'); partes = [pts[2], pts[1], pts[0]]; }
                else return;
                const dia = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, ano = parseInt(partes[2]);
                if (ano === anoAtualCupcake && mes === mesAtualCupcake) {
                    const el = document.getElementById('dia-cupcake-' + dia);
                    if (el) { el.classList.remove('sem-pedidos'); let cnt = el.querySelector('.dia-contador'); if (!cnt) { cnt = document.createElement('div'); cnt.className = 'dia-contador'; cnt.textContent = '1'; el.appendChild(cnt); } else { cnt.textContent = parseInt(cnt.textContent) + 1; } }
                }
            });
        });
    }, 100);
}

function mudarMesCupcake(dir) {
    mesAtualCupcake += dir;
    if (mesAtualCupcake < 0) { mesAtualCupcake = 11; anoAtualCupcake--; }
    if (mesAtualCupcake > 11) { mesAtualCupcake = 0; anoAtualCupcake++; }
    renderizarCalendarioCupcake(); filtrarAndamentoPorMesCupcake();
}

function filtrarAndamentoPorMesCupcake() {
    const lista = document.getElementById('lista-andamento-cupcake');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1] - 1, pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1] - 1, pts[2]); }
            else return;
            if (dataP.getMonth() !== mesAtualCupcake || dataP.getFullYear() !== anoAtualCupcake) return;
            p.key = child.key; pedidos.push(p);
        });
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        if (pedidos.length === 0) { lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido para ${meses[mesAtualCupcake]} de ${anoAtualCupcake}.</p>`; return; }
        pedidos.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'));
        lista.innerHTML = '';
        pedidos.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, false)));
    });
}

function filtrarPorDiaCupcake(dataISO) {
    const lista = document.getElementById('lista-andamento-cupcake');
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidosDia = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento === 'entregue') return;
            let dataPedido = p.dataEntrega || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            if (dataPedido === dataISO) { p.key = child.key; pedidosDia.push(p); }
        });
        lista.innerHTML = '';
        if (pedidosDia.length === 0) {
            const [ano, mes, dia] = dataISO.split('-');
            lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido para ${dia}/${mes}/${ano}.</p>`;
            return;
        }
        pedidosDia.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
        pedidosDia.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, false)));
    });
}

// ====================== FINALIZADOS ======================
function carregarFinalizadosCupcake() {
    const lista = document.getElementById('lista-finalizados-cupcake');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (p.statusPagamento !== 'entregue') return;
            p.key = child.key; pedidos.push(p);
        });
        document.getElementById('tituloFinalizadosContagemCupcake').textContent = `(${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''})`;
        if (pedidos.length === 0) { lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum pedido de cupcake finalizado.</p>'; return; }
        pedidos.sort((a, b) => {
            const toDate = d => { if (!d) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00'); const p = d.split('/'); return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : null; };
            const da = toDate(a.dataEntrega), db = toDate(b.dataEntrega);
            if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
            if (db - da !== 0) return db - da;
            const ha = (a.hora && a.hora.trim()) ? a.hora.trim() : '00:00';
            const hb = (b.hora && b.hora.trim()) ? b.hora.trim() : '00:00';
            return hb.localeCompare(ha);
        });
        lista.innerHTML = '';
        pedidos.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, true)));
    });
}

function toggleCalendarioFinalizadosCupcake() {
    const w = document.getElementById('calendario-wrapper-finalizados-cupcake');
    const btn = event.target.closest('button') || event.target;
    if (w.style.display === 'none' || w.style.display === '') {
        w.style.display = 'block'; btn.textContent = '📅 Fechar Calendário';
        renderizarCalendarioFinalizadosCupcake(); filtrarFinalizadosPorMesCupcake();
    } else { w.style.display = 'none'; btn.textContent = '📅 Calendário'; carregarFinalizadosCupcake(); }
}

function renderizarCalendarioFinalizadosCupcake() {
    const container = document.getElementById('calendario-container-finalizados-cupcake');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = `<div class="calendario-header"><button class="btn-mes" onclick="mudarMesFinalizadosCupcake(-1)">← Anterior</button><h3>${meses[mesAtualFinCupcake]} de ${anoAtualFinCupcake}</h3><button class="btn-mes" onclick="mudarMesFinalizadosCupcake(1)">Próximo →</button></div><div class="calendario-grid">`;
    dias.forEach(d => html += `<div class="dia-semana">${d}</div>`);
    const primeiro = new Date(anoAtualFinCupcake, mesAtualFinCupcake, 1);
    const diasAntes = primeiro.getDay();
    const ultimoDia = new Date(anoAtualFinCupcake, mesAtualFinCupcake + 1, 0).getDate();
    for (let i = 0; i < diasAntes; i++) html += `<div class="dia outro-mes"></div>`;
    const hoje = new Date();
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const dataStr = `${anoAtualFinCupcake}-${String(mesAtualFinCupcake + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const isHoje = dia === hoje.getDate() && mesAtualFinCupcake === hoje.getMonth() && anoAtualFinCupcake === hoje.getFullYear();
        html += `<div class="dia sem-pedidos${isHoje ? ' dia-hoje' : ''}" id="dia-fin-cupcake-${dia}" onclick="filtrarPorDiaFinalizadosCupcake('${dataStr}')"><div class="dia-numero">${dia}</div></div>`;
    }
    const diasDepois = 42 - (diasAntes + ultimoDia);
    for (let i = 0; i < diasDepois; i++) html += `<div class="dia outro-mes"></div>`;
    html += `</div>`;
    container.innerHTML = html;
    setTimeout(() => {
        database.ref('pedidosCupcake').once('value', snapshot => {
            snapshot.forEach(child => {
                const p = child.val(); const dataRef = p.dataEntrega;
                if (p.statusPagamento !== 'entregue' || !dataRef) return;
                let partes;
                if (dataRef.includes('/')) partes = dataRef.split('/');
                else if (dataRef.includes('-')) { const pts = dataRef.split('-'); partes = [pts[2], pts[1], pts[0]]; }
                else return;
                const dia = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, ano = parseInt(partes[2]);
                if (ano === anoAtualFinCupcake && mes === mesAtualFinCupcake) {
                    const el = document.getElementById('dia-fin-cupcake-' + dia);
                    if (el) { el.classList.remove('sem-pedidos'); let cnt = el.querySelector('.dia-contador-verde'); if (!cnt) { cnt = document.createElement('div'); cnt.className = 'dia-contador-verde'; cnt.textContent = '1'; el.appendChild(cnt); } else { cnt.textContent = parseInt(cnt.textContent) + 1; } }
                }
            });
        });
    }, 100);
}

function mudarMesFinalizadosCupcake(dir) {
    mesAtualFinCupcake += dir;
    if (mesAtualFinCupcake < 0) { mesAtualFinCupcake = 11; anoAtualFinCupcake--; }
    if (mesAtualFinCupcake > 11) { mesAtualFinCupcake = 0; anoAtualFinCupcake++; }
    renderizarCalendarioFinalizadosCupcake(); filtrarFinalizadosPorMesCupcake();
}

function filtrarFinalizadosPorMesCupcake() {
    const lista = document.getElementById('lista-finalizados-cupcake');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidos = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento !== 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1] - 1, pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1] - 1, pts[2]); }
            else return;
            if (dataP.getMonth() !== mesAtualFinCupcake || dataP.getFullYear() !== anoAtualFinCupcake) return;
            p.key = child.key; pedidos.push(p);
        });
        if (pedidos.length === 0) { lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido de cupcake finalizado em ${meses[mesAtualFinCupcake]} de ${anoAtualFinCupcake}.</p>`; return; }
        pedidos.sort((a, b) => (b.hora || '00:00').localeCompare(a.hora || '00:00'));
        const pFin = document.createElement('p');
        pFin.style.cssText = 'color:var(--brown-warm);font-size:0.85em;margin-bottom:12px;';
        pFin.innerHTML = '📅 ' + meses[mesAtualFinCupcake] + ' de ' + anoAtualFinCupcake + ' — <a href="#" onclick="carregarFinalizadosCupcake();return false;" style="color:var(--amber);">ver todos</a>';
        lista.appendChild(pFin);
        pedidos.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, true)));
    });
}

function filtrarPorDiaFinalizadosCupcake(dataISO) {
    const lista = document.getElementById('lista-finalizados-cupcake');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('pedidosCupcake').once('value', snapshot => {
        const pedidosDia = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento !== 'entregue') return;
            let dataPedido = p.dataEntrega || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            if (dataPedido === dataISO) { p.key = child.key; pedidosDia.push(p); }
        });
        lista.innerHTML = '';
        if (pedidosDia.length === 0) {
            const [ano, mes, dia] = dataISO.split('-');
            lista.innerHTML = `<p style="color:var(--brown-warm);">Nenhum pedido de cupcake finalizado em ${dia}/${mes}/${ano}.</p>`;
            return;
        }
        pedidosDia.sort((a, b) => (b.hora || '00:00').localeCompare(a.hora || '00:00'));
        pedidosDia.forEach(p => lista.appendChild(criarCardCupcake(p, p.key, true)));
    });
}
// ====================== DASHBOARD ======================
function popularSeletorAnoCupcake() {
    const sel = document.getElementById('dashAnoCupcake');
    if (!sel || sel.options.length > 0) return;
    const anoAtual = new Date().getFullYear();
    for (let a = anoAtual + 1; a >= anoAtual - 3; a--) {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a;
        if (a === anoAtual) opt.selected = true;
        sel.appendChild(opt);
    }
}

function limparValorCupcakeDash(v) {
    if (v===null||v===undefined||v==='') return 0;
    if (typeof v==='number') return isNaN(v)?0:v;
    const str = String(v).replace(/R\$\s*/g,'').trim().replace(/\./g,'').replace(',','.');
    const num = parseFloat(str); return isNaN(num)?0:num;
}

function parseDataCupcake(str) {
    if (!str) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) { const p = str.split('/'); return new Date(p[2], p[1]-1, p[0]); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { const p = str.split('-'); return new Date(p[0], p[1]-1, p[2]); }
    return null;
}

function carregarDashboardCupcake() {
    popularSeletorAnoCupcake();
    const mesVal = document.getElementById('dashMesCupcake').value;
    const mes = mesVal === 'geral' ? null : parseInt(mesVal);
    const ano = parseInt(document.getElementById('dashAnoCupcake').value);
    const mesesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    database.ref('pedidosCupcake').once('value', snapshot => {
        let faturamento = 0, faturamentoMesAnterior = 0, entregues = 0, andamento = 0, pedidosFaturados = 0, totalCupcakes = 0;
        let totalPendente = 0, qtdPendente = 0;
        const pendentesOrdenados = [];
        let mesAnterior = mes !== null ? mes - 1 : null, anoMesAnterior = ano;
        if (mesAnterior === -1) { mesAnterior = 11; anoMesAnterior = ano - 1; }

        snapshot.forEach(child => {
            const p = child.val();
            if (!p.dataEntrega) return;
            const dataP = parseDataCupcake(p.dataEntrega);
            if (!dataP) return;
            if (dataP.getFullYear() !== ano && dataP.getFullYear() !== anoMesAnterior) return;

            const finalizado = p.statusPagamento === 'entregue';

            // faturamento do mês anterior (só pra comparativo)
            if (mes !== null && dataP.getFullYear() === anoMesAnterior && dataP.getMonth() === mesAnterior && finalizado) {
                faturamentoMesAnterior += limparValorCupcakeDash(p.valorTotal);
            }

            if (dataP.getFullYear() !== ano) return;
            if (mes !== null && dataP.getMonth() !== mes) return;

            if (finalizado) {
                entregues++;
                faturamento += limparValorCupcakeDash(p.valorTotal);
                pedidosFaturados++;
                (p.itens || []).forEach(item => totalCupcakes += parseInt(item.quantidade) || 0);
            } else {
                andamento++;
                const status = p.statusPagamento || '';
                if (status === 'A pagar' || status === 'Pago Parcialmente') {
                    const vPend = limparValorCupcakeDash(p.valorTotal);
                    if (vPend > 0) {
                        totalPendente += vPend; qtdPendente++;
                        pendentesOrdenados.push({ p, dataP, vPend, status });
                    }
                }
            }
        });

        const ticket = pedidosFaturados > 0 ? faturamento / pedidosFaturados : 0;
        document.getElementById('dashFaturamentoCupcake').textContent = 'R$ ' + faturamento.toFixed(2).replace('.', ',');
        document.getElementById('dashTicketCupcake').textContent = 'R$ ' + ticket.toFixed(2).replace('.', ',');
        document.getElementById('dashEntreguesCupcake').textContent = entregues;
        document.getElementById('dashAndamentoCupcake').textContent = andamento;
        document.getElementById('dashTotalCupcakes').textContent = totalCupcakes;
        document.getElementById('dashMediaCupcakes').textContent = (entregues + andamento) > 0 ? Math.round(totalCupcakes / (entregues + andamento)) : 0;

        // comparativo vs mês anterior
        const elComp = document.getElementById('dashFaturamentoComparativoCupcake');
        if (mes !== null && faturamentoMesAnterior > 0) {
            const diff = ((faturamento - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
            const seta = diff >= 0 ? '↑' : '↓';
            elComp.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
            elComp.textContent = `${seta} ${Math.abs(diff).toFixed(0)}% vs ${mesesNome[mesAnterior]}`;
        } else if (mes !== null) {
            elComp.style.color = 'var(--brown-warm)';
            elComp.textContent = '— sem dados anteriores';
        } else {
            elComp.textContent = '';
        }

        // projeção do mês (pedidos em andamento dentro do período)
        let projecao = 0;
        pendentesOrdenados.forEach(({ vPend }) => projecao += vPend);
        let elProjecao = document.getElementById('dashProjecaoCupcake');
        if (!elProjecao) {
            elProjecao = document.createElement('p');
            elProjecao.id = 'dashProjecaoCupcake';
            elProjecao.style.cssText = 'font-size:0.82em;margin-top:6px;font-weight:600;padding:6px 10px;background:rgba(232,148,58,0.12);border-radius:8px;';
            document.getElementById('dashFaturamentoCupcake').parentElement.appendChild(elProjecao);
        }
        if (mes !== null && projecao > 0) {
            const totalComProjecao = faturamento + projecao;
            elProjecao.style.display = 'block';
            elProjecao.style.color = 'var(--brown-warm)';
            elProjecao.innerHTML = '📈 Projeção: <strong style="color:var(--brown-dark);">R$ ' + totalComProjecao.toFixed(2).replace('.', ',') + '</strong>'
                + '<br><span style="font-size:0.85em;opacity:0.8;">(+R$ ' + projecao.toFixed(2).replace('.', ',') + ' em aberto)</span>';
        } else {
            elProjecao.style.display = 'none';
        }

        // card de pendências
        pendentesOrdenados.sort((a, b) => a.dataP - b.dataP);
        let htmlPendentes = '';
        pendentesOrdenados.forEach(({ p, vPend, status }) => {
            const dataFormatada = formatarDataComDia(p.dataEntrega);
            const statusLabel = status === 'Pago Parcialmente'
                ? `<span style="color:var(--amber);font-size:0.75em;font-weight:700;">Parcial</span>`
                : `<span style="color:var(--red);font-size:0.75em;font-weight:700;">A pagar</span>`;
            htmlPendentes += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.85em;"><div><strong>${escaparHTML(p.nome||'N/A')}</strong><br><span style="color:var(--brown-warm);font-size:0.82em;">📅 ${dataFormatada}</span><br>${statusLabel}</div><strong style="color:var(--amber);white-space:nowrap;margin-left:8px;">R$ ${vPend.toFixed(2).replace('.',',')}</strong></div>`;
        });
        const containerKpisCupcake = document.getElementById('dashKpisCupcake');
        if (qtdPendente > 0) {
            document.getElementById('cardPendenciasCupcake').style.display = 'block';
            document.getElementById('dashPendenciasValorCupcake').textContent = 'R$ ' + totalPendente.toFixed(2).replace('.', ',');
            document.getElementById('dashPendenciasDetalheCupcake').textContent = `${qtdPendente} pedido${qtdPendente > 1 ? 's' : ''} com pagamento pendente`;
            document.getElementById('dashPendenciasListaCupcake').innerHTML = htmlPendentes;
            if (containerKpisCupcake) containerKpisCupcake.classList.add('kpis-cupcake--pendente');
        } else {
            document.getElementById('cardPendenciasCupcake').style.display = 'none';
            if (containerKpisCupcake) containerKpisCupcake.classList.remove('kpis-cupcake--pendente');
        }

        // gráfico de faturamento por período (ano inteiro, destacando o mês selecionado)
        const mesesNomeG = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const fatMensal = {}; for (let i = 0; i < 12; i++) fatMensal[i] = 0;
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.dataEntrega || p.statusPagamento !== 'entregue') return;
            const dataP = parseDataCupcake(p.dataEntrega);
            if (!dataP || dataP.getFullYear() !== ano) return;
            fatMensal[dataP.getMonth()] += limparValorCupcakeDash(p.valorTotal);
        });
        if (graficoFaturamentoCupcake) { graficoFaturamentoCupcake.destroy(); graficoFaturamentoCupcake = null; }
        const coresBarra = Object.values(fatMensal).map((_, i) => (mes === null || i === mes) ? 'rgba(232,148,58,1)' : 'rgba(232,148,58,0.2)');
        const canvasEl = document.getElementById('graficoFaturamentoCupcake');
        if (canvasEl) {
            const ctx = canvasEl.getContext('2d');
            graficoFaturamentoCupcake = new Chart(ctx, {
                type: 'bar',
                data: { labels: mesesNomeG, datasets: [{ label: 'Faturamento', data: Object.values(fatMensal), backgroundColor: coresBarra, borderColor: 'rgba(232,148,58,1)', borderWidth: 1, borderRadius: 8 }] },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' R$ ' + ctx.parsed.y.toFixed(2).replace('.', ',') } } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v } } }
                }
            });
        }
    });
}

// ====================== MÁSCARAS E BUSCA DE CEP ======================
document.addEventListener('DOMContentLoaded', function() {
    const telefoneEl = document.getElementById('telefoneCupcake');
    if (telefoneEl) telefoneEl.addEventListener('input', function(e) { e.target.value = maskTelefone(e.target.value); });

    const cepEl = document.getElementById('cepCupcake');
    if (cepEl) {
        cepEl.addEventListener('input', function(e) { e.target.value = maskCEP(e.target.value); });
        cepEl.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json()).then(d => {
                    if (!d.erro) {
                        document.getElementById('enderecoCupcake').value = d.logradouro;
                        document.getElementById('bairroCupcake').value = d.bairro;
                        document.getElementById('cidadeCupcake').value = d.localidade;
                    }
                });
            }
        });
    }

    const valorEl = document.getElementById('valorTotalCupcake');
    if (valorEl) valorEl.addEventListener('input', function(e) { e.target.value = maskMoeda(e.target.value); });

    const valorUnEl = document.getElementById('valorUnidadeItemCupcake');
    if (valorUnEl) valorUnEl.addEventListener('input', function(e) { e.target.value = maskMoeda(e.target.value); });

    let _debounceCupcake = null;
    const nomeEl = document.getElementById('nomeCupcake');
    if (nomeEl) {
        nomeEl.addEventListener('input', function() {
            const val = this.value;
            clearTimeout(_debounceCupcake);
            _debounceCupcake = setTimeout(() => buscarClientesHistoricoCupcake(val), 300);
        });
    }
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('#secao-cupcakeCriar .autocomplete-wrapper')) {
        const lista = document.getElementById('autocompleteListaCupcake');
        if (lista) lista.style.display = 'none';
    }
});

// ====================== COMPROVANTE ======================
function imprimirComprovanteCupcake(key) {
    database.ref('pedidosCupcake/' + key).once('value', snapshot => {
        const p = snapshot.val();
        if (!p) { toast('Pedido não encontrado.', 'erro'); return; }
        const dataBr = formatarDataComDia(p.dataEntrega || '');
        const horario = p.hora || '';
        const enderecoRetirada = `
            <div style="margin:10px 0 8px 0;padding:12px;background:#FDF8F0;border-radius:8px;border:1px solid #E8943A;font-size:13px;">
                <strong>🏠 Retirada em:</strong><br>
                Residencial Gran Valle<br>
                Rua Martim Kochella, 350, AP D508 - Ilha da Figueira,<br>
                Jaraguá do Sul - SC, 89258-680
            </div>`;
        let enderecoHTML = '';
        if (p.tipoEntrega === 'entrega' && p.endereco) {
            enderecoHTML = `<div style="margin:10px 0 8px 0;padding:12px;background:#FDF8F0;border-radius:8px;border:1px solid #E8943A;font-size:13px;"><strong>🚚 Entrega em:</strong><br>${escaparHTML(p.endereco.logradouro)}, ${escaparHTML(p.endereco.numero)}<br>${escaparHTML(p.endereco.bairro)}, ${escaparHTML(p.endereco.cidade)}</div>`;
        } else {
            enderecoHTML = enderecoRetirada;
        }
        let itensHTML = '';
        (p.itens || []).forEach(item => {
            const vUn = typeof item.valorUnidade === 'number' ? item.valorUnidade : 0;
            const subtotal = (vUn * (parseInt(item.quantidade) || 0)).toFixed(2).replace('.', ',');
            itensHTML += `<tr><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;font-size:12.5px;">${escaparHTML(item.descricao || 'Item')}</td><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;text-align:center;font-size:12.5px;">${item.quantidade}</td><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;text-align:right;font-size:12.5px;font-weight:600;">R$ ${subtotal}</td></tr>`;
        });
        const valorTotal = typeof p.valorTotal === 'number' ? 'R$ ' + p.valorTotal.toFixed(2).replace('.', ',') : (p.valorTotal || 'R$ 0,00');
        const emojiStatus = p.statusPagamento === 'Pago' ? '✅' : p.statusPagamento === 'Pago Parcialmente' ? '⚠️' : '🔴';

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:-9999px;left:0;z-index:-1;background:white;';
        container.innerHTML = `
            <div id="comprovante-conteudo-cupcake" style="width:480px;background:#ffffff;padding:20px 22px;font-family:'DM Sans',Arial,sans-serif;line-height:1.35;">
                <div style="text-align:center;margin-bottom:10px;"><img src="https://docesflor.github.io/shared/icone.png" style="width:220px;height:220px;border-radius:50%;border:3px solid #E8943A;" alt="Doces Flor"></div>
                <div style="text-align:center;margin-bottom:16px;">
                    <p style="margin:0;font-size:13px;color:#5C2A0E;">🧁 Pedido de Cupcake</p>
                </div>
                <div style="background:#FDF8F0;border:1px solid #E8943A;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;">
                    <div><strong>Cliente:</strong> ${escaparHTML(p.nome || '---')}</div>
                    <div><strong>Telefone:</strong> ${escaparHTML(p.telefone || '---')}</div>
                    <div><strong>Data:</strong> ${escaparHTML(dataBr)}${horario && horario.trim() ? ' às ' + escaparHTML(horario.trim()) + 'h' : ''}</div>
                </div>
                ${enderecoHTML}
                <table style="width:100%;border-collapse:collapse;margin:16px 0 14px 0;">
                    <thead>
                        <tr style="background:#2B1206;">
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:left;">Sabor</th>
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:center;">Qtd</th>
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>${itensHTML}</tbody>
                </table>
                <div style="background:#FDF8F0;border:1px solid #E8943A;border-radius:10px;padding:14px 16px;">
                    <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:700;color:#2B1206;">
                        <span>TOTAL A PAGAR</span>
                        <span>${valorTotal}</span>
                    </div>
                </div>
                <div style="text-align:center;margin:16px 0 12px;padding:10px;background:#F0E6D3;border-radius:10px;font-size:14px;font-weight:600;">
                    ${emojiStatus} ${escaparHTML(p.statusPagamento || 'A pagar')}
                </div>
                ${p.observacoes ? `<div style="font-size:12.5px;padding:10px 12px;background:#FDF8F0;border-left:4px solid #E8943A;border-radius:8px;"><strong>Obs:</strong> ${escaparHTML(p.observacoes)}</div>` : ''}
                <div style="text-align:center;margin-top:18px;font-size:11.5px;color:#8B4513;">
                    Doces Flor • (47) 9 9274-5896<br>
                    Obrigado pela preferência! 💛
                </div>
            </div>`;

        document.body.appendChild(container);
        container.style.display = 'none';

        const overlayPreview = document.createElement('div');
        overlayPreview.className = 'modal-overlay';
        overlayPreview.id = 'modalPreviewComprovanteCupcake';
        overlayPreview.style.cssText = 'align-items:flex-start;overflow-x:hidden;overflow-y:auto;padding:24px 12px;';
        const boxPreview = document.createElement('div');
        boxPreview.className = 'modal-box';
        boxPreview.style.cssText = 'max-width:520px;width:94vw;padding:16px;box-sizing:border-box;';
        boxPreview.innerHTML = `<p style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:var(--brown-dark);margin-bottom:10px;text-align:center;">🧾 Confira antes de enviar</p>`;
        const conteudoPreview = document.getElementById('comprovante-conteudo-cupcake');
        conteudoPreview.style.cssText += 'margin:0 auto;';
        const wrapperPreview = document.createElement('div');
        wrapperPreview.style.cssText = 'width:100%;overflow:hidden;display:flex;justify-content:center;';
        wrapperPreview.appendChild(conteudoPreview);
        boxPreview.appendChild(wrapperPreview);
        const botoesPreview = document.createElement('div');
        botoesPreview.className = 'modal-botoes';
        botoesPreview.style.marginTop = '14px';
        botoesPreview.innerHTML = `
            <button class="btn btn-cinza" onclick="document.getElementById('modalPreviewComprovanteCupcake').remove()">✏️ Fechar</button>
            <button class="btn btn-verde" id="btnConfirmarComprovanteCupcake">🖨️ Confirmar e Enviar</button>`;
        boxPreview.appendChild(botoesPreview);
        overlayPreview.appendChild(boxPreview);
        document.body.appendChild(overlayPreview);

        requestAnimationFrame(() => {
            const larguraDisponivel = wrapperPreview.clientWidth;
            const larguraReal = 480;
            if (larguraDisponivel > 0 && larguraDisponivel < larguraReal) {
                const escala = larguraDisponivel / larguraReal;
                conteudoPreview.style.transform = `scale(${escala})`;
                conteudoPreview.style.transformOrigin = 'top center';
                wrapperPreview.style.height = (conteudoPreview.offsetHeight * escala) + 'px';
            }
        });

        document.getElementById('btnConfirmarComprovanteCupcake').addEventListener('click', function () {
            this.disabled = true;
            this.textContent = '⏳ Gerando...';
            conteudoPreview.style.transform = '';
            container.appendChild(conteudoPreview);
            overlayPreview.remove();
            container.style.cssText = 'position:fixed;top:-9999px;left:0;z-index:-1;background:white;';
            document.body.appendChild(container);
            gerarEEnviarComprovanteCupcake(p, key, dataBr, horario, container);
        });
    });
}

function gerarEEnviarComprovanteCupcake(p, key, dataBr, horario, container) {
    const el = document.getElementById('comprovante-conteudo-cupcake');
    toast('⏳ Gerando comprovante...', 'aviso');

    setTimeout(() => {
        html2canvas(el, { scale: 2.0, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'comprovante-cupcake-' + key.substr(-6) + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            canvas.toBlob(async (blob) => {
                try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); } catch (e) {}
            }, 'image/png');

            const telefone = (p.telefone || '').replace(/\D/g, '');
            const foneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;
            const vTotalWpp = typeof p.valorTotal === 'number' ? p.valorTotal : 0;

            let mensagem =
`🌸 *Doces Flor — Comprovante* 🧁

👤 *Cliente:* ${p.nome || '---'}
📅 *Data:* ${dataBr}${horario ? ' às ' + horario : ''}

💰 *Total:* R$ ${vTotalWpp.toFixed(2).replace('.', ',')}
💳 *Pagamento:* ${p.statusPagamento || 'A pagar'}`;

            if (p.observacoes && p.observacoes.trim()) {
                mensagem += `\n\n📝 *Obs:* ${p.observacoes.trim()}`;
            }

            const urlWpp = `https://wa.me/${foneFormatado}?text=${encodeURIComponent(mensagem)}`;
            container.remove();
            toast('✅ Comprovante baixado! Abrindo WhatsApp...', 'sucesso');

            setTimeout(() => {
                window.location.href = urlWpp;
                setTimeout(() => {
                    if (document.visibilityState === 'visible') window.open(urlWpp, '_self');
                }, 600);
            }, 700);
        }).catch(() => {
            container.remove();
            toast('Erro ao gerar imagem.', 'erro');
        });
    }, 600);
}