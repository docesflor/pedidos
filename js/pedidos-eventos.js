/* ═══════════════════════════════════════════
   PEDIDOS — EVENTOS, BLOQUEIOS DE AGENDA E VENDAS
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

let filtroEventosAtual = 'todos';

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
    const produzido = e.produzido || 0;
    const totalCaixas    = vendas.reduce((s,v) => s+(parseInt(v.caixas)||0), 0);
    const totalAvulso    = vendas.reduce((s,v) => s+(parseInt(v.avulso)||0), 0);
    const totalUnidades  = (totalCaixas*4)+totalAvulso;
    const totalArrecadado= vendas.reduce((s,v) => s+(parseFloat(v.valor)||0), 0);
    const caixasProduzidas = Math.floor(produzido/4);
    const sobrandoCaixas   = Math.max(0, caixasProduzidas-totalCaixas);
    const sobrandoUnidades = Math.max(0, produzido-totalUnidades);
    const btnFinalizarMenu = (!finalizado && passado)
        ? `<button onclick="finalizarEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">✓ Finalizar evento</button>` : '';
    const vendasRapidasHTML = finalizado ? '' : `
        <div style="margin-top:2px;">
            <p style="font-size:0.78em;font-weight:700;color:var(--brown-warm);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">➕ Lançar Venda Rápida</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
                <button class="btn btn-laranja" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="lancarVendaRapida('${e.key}',1,this)">+1 caixa<br><span style="font-size:0.85em;opacity:0.85;">R$ 10,00</span></button>
                <button class="btn btn-laranja" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="lancarVendaRapida('${e.key}',2,this)">+2 caixas<br><span style="font-size:0.85em;opacity:0.85;">R$ 20,00</span></button>
                <button class="btn btn-laranja" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="lancarVendaRapida('${e.key}',3,this)">+3 caixas<br><span style="font-size:0.85em;opacity:0.85;">R$ 30,00</span></button>
                <button class="btn btn-laranja" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="lancarVendaRapida('${e.key}',5,this)">+5 caixas<br><span style="font-size:0.85em;opacity:0.85;">R$ 50,00</span></button>
                <button class="btn btn-laranja" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="lancarVendaRapida('${e.key}',10,this)">+10 caixas<br><span style="font-size:0.85em;opacity:0.85;">R$ 100,00</span></button>
                <button class="btn btn-cinza" style="padding:10px 4px;font-size:0.8em;line-height:1.3;" onclick="toggleEspecificar('${e.key}')">✏️ Especificar<br><span style="font-size:0.85em;opacity:0.75;">outra qtd</span></button>
            </div>
            <div id="especificar-${e.key}" style="display:none;background:var(--white);border-radius:12px;padding:12px;border:1px solid var(--cream-dark);margin-top:8px;">
                <label style="font-size:0.76em;">Quantidade de caixinhas</label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="number" id="venda-caixas-${e.key}" placeholder="Ex: 7" min="1" style="margin-bottom:0;flex:1;" oninput="calcularVenda('${e.key}')">
                    <button class="btn btn-verde" style="padding:10px 16px;white-space:nowrap;" onclick="lancarVendaEspecifica('${e.key}')">✅ Confirmar</button>
                </div>
                <div style="font-size:0.8em;color:var(--green);margin-top:6px;font-weight:600;">💰 Total: <span id="preview-venda-${e.key}">R$ 0,00</span></div>
            </div>
        </div>`;
    const editarProduzidoHTML = finalizado ? '' : `
        <div id="editar-produzido-${e.key}" class="evento-editar-produzido" style="display:none;">
            <label style="font-size:0.76em;">Total produzido (unidades)</label>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="number" id="produzido-${e.key}" value="${produzido}" placeholder="Ex: 200" min="0" style="margin-bottom:0;flex:1;">
                <button class="btn btn-marrom" style="padding:10px 16px;white-space:nowrap;" onclick="salvarProduzido('${e.key}')">💾 Salvar</button>
            </div>
            <p style="font-size:0.76em;color:var(--brown-warm);margin-top:4px;">= ${caixasProduzidas} caixinhas de 4 un <span id="info-caixas-${e.key}"></span></p>
        </div>`;
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
                    ${btnFinalizarMenu}
                    <button class="menu-mais-excluir" onclick="excluirEvento('${e.key}');fecharMenuMais('menuEvento-${e.key}')">🗑️ Excluir evento</button>
                </div>
            </div>
        </div>
        <div class="evento-arrecadado-destaque">
            <div class="evento-arrecadado-label">💰 Arrecadado</div>
            <div class="evento-arrecadado-valor">R$ ${totalArrecadado.toFixed(2).replace('.',',')}</div>
        </div>
        <div class="evento-resumo-3grid">
            <div class="evento-resumo-mini${finalizado?'':' editable'}" ${finalizado?'':`onclick="toggleEditarProduzido('${e.key}')"`}>
                <div class="evento-resumo-mini-label">🍫 Produzido${finalizado?'':' ✏️'}</div>
                <div class="evento-resumo-mini-valor">${caixasProduzidas} cxs</div>
            </div>
            <div class="evento-resumo-mini">
                <div class="evento-resumo-mini-label">📦 Vendido</div>
                <div class="evento-resumo-mini-valor">${totalCaixas} cxs</div>
            </div>
            <div class="evento-resumo-mini">
                <div class="evento-resumo-mini-label">📬 Sobrou</div>
                <div class="evento-resumo-mini-valor">${sobrandoCaixas} cxs</div>
            </div>
        </div>
        ${editarProduzidoHTML}
        ${vendasRapidasHTML}
        <button class="btn-toggle-historico" onclick="toggleHistorico('${e.key}')">📋 Histórico de vendas <span id="seta-historico-${e.key}">▾</span></button>
        <div id="historico-wrapper-${e.key}" style="display:none;">
            <div id="historico-${e.key}" style="background:var(--white);border-radius:10px;border:1px solid var(--cream-dark);overflow:hidden;margin-top:8px;">
                ${vendas.length===0?'<p style="color:var(--brown-warm);font-size:0.83em;padding:10px 12px;">Nenhuma venda lançada ainda.</p>':renderizarHistoricoVendas(e)}
            </div>
        </div>`;
    lista.appendChild(card);
    if (!finalizado) {
        const inputProd = document.getElementById('produzido-' + e.key);
        if (inputProd) {
            inputProd.addEventListener('input', function() {
                const un = parseInt(this.value)||0;
                const infoEl = document.getElementById('info-caixas-'+e.key);
                if (infoEl) infoEl.textContent = un>0?` (${Math.floor(un/4)} caixinhas)`:'';
            });
        }
    }
}

function renderizarHistoricoVendas(e) {
    const vendas = e.vendas ? Object.entries(e.vendas) : [];
    const finalizado = eventoEstaFinalizado(e);
    if (vendas.length === 0) return '<p style="color:var(--brown-warm);font-size:0.83em;padding:10px 12px;">Nenhuma venda lançada ainda.</p>';
    return vendas.map(([key,v]) => {
        const hora = v.hora||'--:--';
        const desc = [];
        if (v.caixas>0) desc.push(`${v.caixas} caixa${v.caixas>1?'s':''}`);
        if (v.avulso>0) desc.push(`${v.avulso} avulso`);
        const btnExcluir = finalizado?'':
            `<button class="btn-remove" style="padding:4px 10px;font-size:0.74em;" onclick="excluirVenda('${e.key}','${key}')">✕</button>`;
        return `<div class="venda-item">
            <div><span style="font-weight:600;">${hora}</span><span style="color:var(--brown-warm);margin-left:6px;">${desc.join(' + ')}</span></div>
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


function calcularVenda(key) {
    const caixas = parseInt(document.getElementById('venda-caixas-'+key).value)||0;
    const preview = document.getElementById('preview-venda-'+key);
    if (preview) preview.textContent = 'R$ '+(caixas*10).toFixed(2).replace('.',',');
}


function salvarProduzido(key) {
    database.ref('eventos/'+key).once('value', snapshot => {
        const e = snapshot.val();
        if (eventoEstaFinalizado(e)) { toast('❌ Evento finalizado.','erro'); return; }
        const produzido = parseInt(document.getElementById('produzido-'+key).value)||0;
        database.ref('eventos/'+key).update({ produzido }).then(()=>{ toast('✅ Total produzido salvo!'); carregarEventos(); }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}


function lancarVenda(key) {
    database.ref('eventos/'+key).once('value', snapshot => {
        if (eventoEstaFinalizado(snapshot.val())) { toast('❌ Evento finalizado.','erro'); return; }
        const caixasInput = document.getElementById('venda-caixas-'+key);
        const avulsoInput = document.getElementById('venda-avulso-'+key);
        const caixas = parseInt(caixasInput?.value)||0;
        const avulso = parseInt(avulsoInput?.value)||0;
        if (caixas===0 && avulso===0) { toast('❌ Informe ao menos 1 caixinha ou 1 unidade avulsa.','erro'); return; }
        const valor = (caixas*10)+(avulso*2.50);
        const agora = new Date();
        const hora  = agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
        database.ref('eventos/'+key+'/vendas').push({ caixas, avulso, valor, hora, timestamp:Date.now() }).then(()=>{
            toast('✅ Venda lançada!');
            if (caixasInput) caixasInput.value = '';
            if (avulsoInput) avulsoInput.value = '';
            const preview = document.getElementById('preview-venda-'+key);
            if (preview) preview.textContent = 'R$ 0,00';
            carregarEventos();
            setTimeout(()=>{ toggleHistorico(key, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}


function lancarVendaRapida(key, caixas, btnClicado) {
    database.ref('eventos/'+key).once('value', snapshot => {
        if (eventoEstaFinalizado(snapshot.val())) { toast('Evento finalizado.','erro'); return; }
        const valor = caixas*10;
        const agora = new Date();
        const hora  = agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
        database.ref('eventos/'+key+'/vendas').push({ caixas, avulso:0, valor, hora, timestamp:Date.now() }).then(()=>{
            toast(`+${caixas} caixa${caixas>1?'s':''} — R$ ${valor.toFixed(2).replace('.',',')} lançado!`);
            dispararConfete(btnClicado);
            if (btnClicado) pulseBotaoSucesso(btnClicado, '✓');
            carregarEventos();
            setTimeout(()=>{ toggleHistorico(key, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}


function lancarVendaEspecifica(key) {
    database.ref('eventos/'+key).once('value', snapshot => {
        if (eventoEstaFinalizado(snapshot.val())) { toast('❌ Evento finalizado.','erro'); return; }
        const caixas = parseInt(document.getElementById('venda-caixas-'+key).value)||0;
        if (caixas<=0) { toast('❌ Informe a quantidade.','erro'); return; }
        const valor = caixas*10;
        const agora = new Date();
        const hora  = agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
        database.ref('eventos/'+key+'/vendas').push({ caixas, avulso:0, valor, hora, timestamp:Date.now() }).then(()=>{
            toast(`✅ +${caixas} caixas lançado!`);
            document.getElementById('venda-caixas-'+key).value='';
            document.getElementById('preview-venda-'+key).textContent='R$ 0,00';
            document.getElementById('especificar-'+key).style.display='none';
            carregarEventos();
            setTimeout(()=>{ toggleHistorico(key, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}


function toggleEspecificar(key) {
    const div = document.getElementById('especificar-'+key);
    if (!div) return;
    const aberto = div.style.display==='block';
    div.style.display = aberto?'none':'block';
    if (!aberto) document.getElementById('venda-caixas-'+key).focus();
}


function excluirVenda(eventoKey, vendaKey) {
    showConfirmModal('Excluir esta venda?', function() {
        database.ref('eventos/'+eventoKey+'/vendas/'+vendaKey).remove().then(()=>{
            toast('🗑️ Venda excluída.'); carregarEventos();
            setTimeout(()=>{ toggleHistorico(key, true); },400);
        }).catch(err=>toast('❌ Erro: '+err.message,'erro'));
    });
}

// ====================== CUSTOS: ABA SWITCHER ======================
