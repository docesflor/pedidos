/* ═══════════════════════════════════════════
   PEDIDOS — NAVEGAÇÃO, MODAIS, TOAST, NOTIFICAÇÕES E INIT
   Depende de TODOS os outros módulos (carrega por último).
   O bloco de inicialização (DOMContentLoaded) mora aqui.
═══════════════════════════════════════════ */

let modalCallback = null;
let _notificacaoSomDisparada = false;
let _audioContextDesbloqueado = false;
let _audioCtx = null;
let _ultimoAvisoEstoqueBaixo = '';

// ====================== ESTILOS DE EFEITOS (confete, pulse, skeleton) ======================
(function injetarEstilosEfeitos() {
    const css = `
    @keyframes toastEntrar {
        0%   { opacity:0; transform:translateX(-50%) translateY(30px) scale(0.9); }
        60%  { opacity:1; transform:translateX(-50%) translateY(-6px) scale(1.03); }
        100% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes toastSai {
        0%   { opacity:1; transform:translateX(-50%) translateY(0); }
        100% { opacity:0; transform:translateX(-50%) translateY(20px); }
    }
    @keyframes confeteSobe {
        0%   { transform: translate(0,0) rotate(0deg); opacity:0.95; }
        100% { transform: translate(var(--deriva,0px), -160px) rotate(360deg); opacity:0; }
    }
    @keyframes pulseSucesso {
        0%   { transform:scale(1); }
        40%  { transform:scale(1.08); }
        100% { transform:scale(1); }
    }
    .btn-pulse-sucesso { background:#25d366 !important; animation: pulseSucesso 0.5s ease; }
    .skeleton-card { background:var(--white,#fff); border-radius:16px; padding:16px; margin-bottom:12px; border:1px solid var(--cream-dark,#eee); }
    .skeleton-linha { height:14px; border-radius:6px; margin-bottom:8px; background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%); background-size:400% 100%; animation: skeletonShimmer 1.4s ease infinite; }
    @keyframes skeletonShimmer { 0%{background-position:100% 0;} 100%{background-position:0 0;} }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();

// ====================== CONFETE ======================
function dispararConfete(origemEl) {
    const cores = ['#E8943A','#4A7C59','#C0392B','#F5B563','#8B4513'];
    const origem = origemEl ? origemEl.getBoundingClientRect() : null;
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;';
    document.body.appendChild(container);
    const qtd = 26;
    for (let i = 0; i < qtd; i++) {
        const p = document.createElement('div');
        const cor = cores[Math.floor(Math.random() * cores.length)];
        const tam = 6 + Math.random() * 6;
        const esquerda = origem ? origem.left + Math.random() * origem.width : Math.random() * window.innerWidth;
        const topo = origem ? origem.top : window.innerHeight * 0.65;
        const atraso = Math.random() * 0.15;
        const duracao = 0.9 + Math.random() * 0.6;
        const deriva = (Math.random() - 0.5) * 140;
        p.style.cssText = `position:absolute;left:${esquerda}px;top:${topo}px;width:${tam}px;height:${tam}px;background:${cor};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};opacity:0.95;animation:confeteSobe ${duracao}s ease-out ${atraso}s forwards;`;
        p.style.setProperty('--deriva', deriva + 'px');
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), 1800);
}

// ====================== PULSE NO BOTÃO ======================
function pulseBotaoSucesso(btn, textoTemp) {
    if (!btn) return;
    const textoOriginal = btn.innerHTML;
    btn.classList.add('btn-pulse-sucesso');
    btn.innerHTML = textoTemp || '✓';
    setTimeout(() => {
        btn.classList.remove('btn-pulse-sucesso');
        btn.innerHTML = textoOriginal;
    }, 1100);
}

// ====================== SKELETON LOADING ======================
function gerarSkeleton(qtd = 3) {
    let html = '';
    for (let i = 0; i < qtd; i++) {
        html += `<div class="skeleton-card">
            <div class="skeleton-linha" style="width:40%;"></div>
            <div class="skeleton-linha" style="width:70%;"></div>
            <div class="skeleton-linha" style="width:55%;height:20px;margin-top:12px;"></div>
        </div>`;
    }
    return html;
}

// ====================== TOAST (com saída suave e emoji) ======================
function toast(msg, tipo) {
    tipo = tipo || 'sucesso';
    const cores = { sucesso: '#25d366', erro: '#dc3545', aviso: '#FFA500' };
    const emojis = { sucesso: '🎉', erro: '⚠️', aviso: '📢' };
    const duracao = tipo === 'sucesso' ? 3600 : 3200;
    const t = document.createElement('div');
    t.innerHTML = `<span style="font-size:1.25em;line-height:1;">${emojis[tipo]}</span><span>${msg}</span>`;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
        + 'background:' + cores[tipo] + ';color:white;padding:12px 22px;display:flex;align-items:center;gap:10px;'
        + 'border-radius:24px;font-family:Lato,Arial,sans-serif;font-weight:700;'
        + 'font-size:0.88em;z-index:99999;pointer-events:none;white-space:nowrap;'
        + 'animation:toastEntrar 0.45s cubic-bezier(.34,1.56,.64,1);box-shadow:0 6px 20px rgba(0,0,0,0.22);';
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastSai 0.4s ease forwards';
        setTimeout(() => t.remove(), 400);
    }, duracao);
}

// ====================== AUTENTICAÇÃO ======================
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('tela-login').style.display = 'none';
        database.ref('usuarios/' + user.uid).once('value', snap => {
            const dados = snap.val();
            PAPEL_USUARIO = dados ? dados.papel : 'admin';
            aplicarPermissoesPapel();
            if (PAPEL_USUARIO === 'producao') {
                document.querySelectorAll('.secao').forEach(s => s.classList.remove('active'));
                document.getElementById('secao-eventos').classList.add('active');
                carregarEventos();
            }
        });
        verificarNotificacoes();
        verificarEstoqueBaixo();
    } else {
        document.getElementById('tela-login').style.display = 'flex';
    }
});


function irPara(secao, btn) {
    if (window.pedidoEmEdicao && secao !== 'criar') {
        showConfirmModal('⚠️ Pedido em edição não salvo. Deseja sair?', function() {
            limparFormulario(); _navegarPara(secao, btn);
        });
        return;
    }
    _navegarPara(secao, btn);
}


function _navegarPara(secao, btn) {
    if (PAPEL_USUARIO === 'producao' && secao !== 'eventos') {
        toast('🔒 Acesso restrito à aba Eventos.', 'aviso');
        secao = 'eventos';
        btn = null;
    }
    document.querySelectorAll('.secao').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('secao-' + secao).classList.add('active');
    if (btn) btn.classList.add('active');
    _syncGavetaBtns(secao);
    window.scrollTo(0, 0);
    if (secao === 'andamento')   carregarAndamento();
    if (secao === 'finalizados') carregarFinalizados();
    if (secao === 'eventos')     carregarEventos();
    if (secao === 'gastos')      mostrarAbaGastos('insumos', document.getElementById('custosTabInsumos'));
    if (secao === 'dashboard') {
        const agora = new Date();
        document.getElementById('dashMes').value = agora.getMonth();
        document.getElementById('dashAno').value = agora.getFullYear();
    }
    setTimeout(aplicarPermissoesPapel, 300);
}


function _syncGavetaBtns(secao) {
    ['criar','andamento','finalizados','dashboard','gastos','eventos'].forEach(s => {
        const b = document.getElementById('gbtn' + s.charAt(0).toUpperCase() + s.slice(1));
        if (b) b.classList.toggle('active', s === secao);
    });
}

// ====================== SALVAR PEDIDO ======================

function showConfirmModal(mensagem, callback) { document.getElementById('modalMensagem').textContent = mensagem; document.getElementById('modalConfirmacao').style.display = 'flex'; modalCallback = callback; }

function fecharModal(confirmou) { document.getElementById('modalConfirmacao').style.display = 'none'; if (confirmou && modalCallback) modalCallback(); modalCallback = null; }

// ====================== GAVETA ======================

function toggleGaveta() {
    const gaveta = document.getElementById('gaveta');
    const overlay = document.getElementById('gavetaOverlay');
    const btn = document.getElementById('btnHamburger');
    if (gaveta.classList.contains('aberta')) { fecharGaveta(); }
    else { gaveta.classList.add('aberta'); overlay.classList.add('visivel'); btn.classList.add('aberto'); document.body.style.overflow = 'hidden'; }
}

function fecharGaveta() {
    document.getElementById('gaveta').classList.remove('aberta');
    document.getElementById('gavetaOverlay').classList.remove('visivel');
    document.getElementById('btnHamburger').classList.remove('aberto');
    document.body.style.overflow = '';
}

function irParaGaveta(secao) {
    if (window.pedidoEmEdicao && secao !== 'criar') {
        fecharGaveta();
        showConfirmModal('⚠️ Pedido em edição não salvo. Deseja sair?', function() { limparFormulario(); _navegarPara(secao, null); });
        return;
    }
    fecharGaveta(); _navegarPara(secao, null);
}

// ====================== NOTIFICAÇÕES ======================

function verificarNotificacoes() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate()+1);
    database.ref('pedidos').once('value', snapshot => {
        let totalHoje = 0, totalAmanha = 0, totalAtrasados = 0;
        const urgentes = [];
        snapshot.forEach(child => {
            const p = child.val(); if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            dataP.setHours(0,0,0,0);
            let categoria = null;
            if (dataP.getTime() === hoje.getTime()) { totalHoje++; categoria = 'hoje'; }
            else if (dataP.getTime() === amanha.getTime()) { totalAmanha++; categoria = 'amanha'; }
            else if (dataP < hoje) { totalAtrasados++; categoria = 'atrasado'; }
            if (categoria) {
                urgentes.push({
                    key: child.key, nome: p.nome || 'Cliente', telefone: p.telefone || '',
                    hora: p.hora || '', dataEntrega: p.dataEntrega, tipoEntrega: p.tipoEntrega || 'retirada',
                    categoria, ultimoLembrete: p.ultimoLembrete || null
                });
            }
        });
        window._pedidosUrgentes = urgentes;
        const totalProximos = totalHoje + totalAmanha + totalAtrasados;
        const badge = document.getElementById('gavetaBadge');
        const aviso = document.getElementById('avisoProximos');
        let texto = '';
        if (totalAtrasados > 0 && totalHoje > 0) texto = `⚠️ ${totalAtrasados} atrasado${totalAtrasados>1?'s':''} • 🚨 ${totalHoje} para HOJE`;
        else if (totalAtrasados > 0) texto = `⚠️ ${totalAtrasados} pedido${totalAtrasados>1?'s':''} ATRASADO${totalAtrasados>1?'S':''}`;
        else if (totalHoje > 0 && totalAmanha > 0) texto = `🚨 ${totalHoje} pedido${totalHoje>1?'s':''} para HOJE • ${totalAmanha} para AMANHÃ`;
        else if (totalHoje > 0) texto = `🚨 ${totalHoje} pedido${totalHoje>1?'s':''} para HOJE`;
        else if (totalAmanha > 0) texto = `⏰ ${totalAmanha} pedido${totalAmanha>1?'s':''} para AMANHÃ`;
        aviso.innerHTML = texto ? texto + ' <span style="text-decoration:underline;">— toque para ver</span>' : '';
        aviso.style.display = texto ? 'block' : 'none';
        if (totalHoje > 0 && !_notificacaoSomDisparada) {
            _notificacaoSomDisparada = true;
            // Se o usuário já interagiu, toca agora; caso contrário, aguarda o primeiro toque
            if (_audioContextDesbloqueado) {
                dispararNotificacaoSensorial();
            } else {
                document.addEventListener('touchstart', function _dispararAposTouch() {
                    document.removeEventListener('touchstart', _dispararAposTouch);
                    setTimeout(dispararNotificacaoSensorial, 300);
                }, { passive: true });
            }
        }
        if (totalProximos > 0) { badge.textContent = totalProximos; badge.style.display = 'flex'; } else { badge.style.display = 'none'; }
        const btnAndamento = document.getElementById('btnAndamento');
        if (btnAndamento) {
            const badgeAnt = btnAndamento.parentElement.querySelector('.badge'); if (badgeAnt) badgeAnt.remove();
            if (totalProximos > 0) { const badgeDesk = document.createElement('span'); badgeDesk.className = 'badge'; badgeDesk.textContent = totalProximos; btnAndamento.parentElement.style.position = 'relative'; btnAndamento.parentElement.appendChild(badgeDesk); }
        }
    });
}
setInterval(verificarNotificacoes, 10 * 60 * 1000);

// ====================== PAINEL DE PEDIDOS URGENTES ======================
function abrirPainelUrgentes() {
    const urgentes = window._pedidosUrgentes || [];
    if (urgentes.length === 0) return;

    const ordem = { atrasado: 0, hoje: 1, amanha: 2 };
    const grupos = { atrasado: [], hoje: [], amanha: [] };
    urgentes.forEach(u => grupos[u.categoria].push(u));

    const labels = { atrasado: '⚠️ Atrasados', hoje: '🔴 Hoje', amanha: '⏰ Amanhã' };
    const cores  = { atrasado: 'var(--red)', hoje: 'var(--red)', amanha: '#F59E0B' };

    let html = '';
    ['atrasado', 'hoje', 'amanha'].forEach(cat => {
        if (grupos[cat].length === 0) return;
        html += `<div class="modal-urgentes-grupo-titulo" style="color:${cores[cat]};">${labels[cat]}</div>`;
        grupos[cat].forEach(u => {
            const horaTexto = u.hora ? ` às ${u.hora}h` : '';
            const jaLembrado = u.ultimoLembrete && (Date.now() - u.ultimoLembrete) < 24 * 60 * 60 * 1000;
            html += `<div class="modal-urgentes-item">
                <div class="modal-urgentes-info">
                    <div class="modal-urgentes-nome">${escaparHTML(u.nome)}</div>
                    <div class="modal-urgentes-detalhe">${u.tipoEntrega === 'entrega' ? '🚚' : '🏠'} ${formatarDataComDia(u.dataEntrega) || u.dataEntrega}${horaTexto}</div>
                </div>
                <button class="btn-lembrar ${jaLembrado ? 'enviado' : ''}" onclick="enviarLembreteWhatsApp('${u.key}', this)">
                    ${jaLembrado ? '✓ Lembrado' : '🔔 Lembrar'}
                </button>
            </div>`;
        });
    });

    let modal = document.getElementById('modalUrgentes');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalUrgentes';
        modal.className = 'modal-templates';
        modal.style.display = 'none';
        modal.innerHTML = `<div class="modal-templates-box">
            <div class="modal-templates-titulo">
                🔔 Pedidos Urgentes
                <button class="gaveta-fechar" onclick="fecharPainelUrgentes()">✕</button>
            </div>
            <div id="modalUrgentesConteudo"></div>
        </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('modalUrgentesConteudo').innerHTML = html;
    modal.style.display = 'flex';
}

function fecharPainelUrgentes() {
    const modal = document.getElementById('modalUrgentes');
    if (modal) modal.style.display = 'none';
}

function enviarLembreteWhatsApp(key, btn) {
    const pedido = (window._pedidosUrgentes || []).find(u => u.key === key);
    if (!pedido || !pedido.telefone) { toast('❌ Telefone não encontrado para este pedido.', 'erro'); return; }

    const numero = pedido.telefone.replace(/\D/g, '');
    const numeroCompleto = numero.length <= 11 ? '55' + numero : numero;
    const primeiroNome = pedido.nome.trim().split(' ')[0];
    const quando = pedido.categoria === 'hoje' ? 'hoje' : pedido.categoria === 'amanha' ? 'amanhã' : `no dia ${formatarDataComDia(pedido.dataEntrega) || pedido.dataEntrega}`;
    const horaTexto = pedido.hora ? ` às ${pedido.hora}h` : '';
    const msg = `Oi ${primeiroNome}! Passando pra lembrar que seu pedido está previsto pra ${quando}${horaTexto} 🌸 Qualquer coisa é só chamar!`;

    window.open(`https://wa.me/${numeroCompleto}?text=${encodeURIComponent(msg)}`, '_blank');

    database.ref('pedidos/' + key).update({ ultimoLembrete: Date.now() }).then(() => {
        pedido.ultimoLembrete = Date.now();
        if (btn) { btn.classList.add('enviado'); btn.textContent = '✓ Lembrado'; }
    });
}

// ====================== VERIFICAÇÃO DE ATUALIZAÇÕES (só avisa, não recarrega sozinho) ======================
function mostrarBannerAtualizacao(tipo) {
    if (document.getElementById('bannerAtualizacao')) return; // já tem aviso na tela
    const banner = document.createElement('div');
    banner.id = 'bannerAtualizacao';
    banner.style.cssText = 'position:fixed;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:var(--brown-dark,#5C2A0E);color:#fff;padding:10px 10px 10px 16px;border-radius:30px;box-shadow:0 4px 16px rgba(0,0,0,0.25);z-index:9999;display:flex;align-items:center;gap:10px;font-size:0.85em;white-space:nowrap;max-width:92vw;';
    banner.innerHTML = '<span style="white-space:nowrap;">🔄 Novidades</span><button style="background:#fff;color:var(--brown-dark,#5C2A0E);border:none;border-radius:20px;padding:6px 14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">Atualizar</button>';
    banner.querySelector('button').onclick = () => {
        banner.remove();
        if (tipo === 'andamento') carregarAndamento();
        if (tipo === 'eventos') carregarEventos();
    };
    document.body.appendChild(banner);
}

setInterval(function() {
    if (document.hidden) return;               // aba em segundo plano, não verifica
    if (window.pedidoEmEdicao) return;          // não verifica durante edição de pedido
    if (document.getElementById('bannerAtualizacao')) return; // já existe aviso pendente

    const secaoAndamentoAtiva = document.getElementById('secao-andamento')?.classList.contains('active');
    const secaoEventosAtiva   = document.getElementById('secao-eventos')?.classList.contains('active');
    const calendarioAberto    = document.getElementById('calendario-wrapper')?.style.display === 'block';
    const buscaVazia = !document.getElementById('buscaAndamento')?.value.trim();

    if (secaoAndamentoAtiva && buscaVazia && !calendarioAberto) {
        database.ref('pedidos').once('value', snapshot => {
            const hashAtual = JSON.stringify(snapshot.val());
            if (window._hashAndamento && hashAtual !== window._hashAndamento) {
                mostrarBannerAtualizacao('andamento');
            }
        });
    }
    if (secaoEventosAtiva) {
        database.ref('eventos').once('value', snapshot => {
            const hashAtual = JSON.stringify(snapshot.val());
            if (window._hashEventos && hashAtual !== window._hashEventos) {
                mostrarBannerAtualizacao('eventos');
            }
        });
    }
}, 15 * 1000);

function verificarEstoqueBaixo() {
    database.ref('insumos').once('value', snapshot => {
        let qtdBaixo = 0;
        const nomesBaixo = [];
        snapshot.forEach(child => {
            const i = child.val();
            if (i.estoqueMinimo > 0 && (i.estoqueAtual || 0) <= i.estoqueMinimo) {
                qtdBaixo++;
                nomesBaixo.push(i.nome);
            }
        });
        // Badge na gaveta (mobile)
        const gbtn = document.getElementById('gbtnGastos');
        if (gbtn) {
            let badge = gbtn.querySelector('.gaveta-badge');
            if (qtdBaixo > 0) {
                if (!badge) { badge = document.createElement('span'); badge.className='gaveta-badge'; gbtn.appendChild(badge); }
                badge.style.display = 'flex'; badge.textContent = qtdBaixo;
            } else if (badge) { badge.style.display = 'none'; }
        }
        // Badge no menu de topo (desktop) — botão "💸 Gastos"
        const btnTopoGastos = [...document.querySelectorAll('.menu-btn')].find(b => b.getAttribute('onclick')?.includes("'gastos'"));
        if (btnTopoGastos) {
            const wrapper = btnTopoGastos.closest('.menu-btn-wrapper') || btnTopoGastos.parentElement;
            wrapper.style.position = 'relative';
            let badgeTopo = wrapper.querySelector('.badge-estoque');
            if (qtdBaixo > 0) {
                if (!badgeTopo) {
                    badgeTopo = document.createElement('span');
                    badgeTopo.className = 'badge badge-estoque';
                    wrapper.appendChild(badgeTopo);
                }
                badgeTopo.textContent = qtdBaixo;
                badgeTopo.style.display = 'flex';
            } else if (badgeTopo) { badgeTopo.style.display = 'none'; }
        }
        // Aviso fixo no topo — só dispara de novo se a lista de insumos baixos mudou
        const assinaturaAtual = nomesBaixo.slice().sort().join('|');
        if (qtdBaixo > 0 && assinaturaAtual !== _ultimoAvisoEstoqueBaixo) {
            toast('⚠️ ' + qtdBaixo + ' insumo(s) com estoque baixo: ' + nomesBaixo.slice(0,3).join(', ') + (nomesBaixo.length > 3 ? '...' : ''), 'aviso');
            _ultimoAvisoEstoqueBaixo = assinaturaAtual;
        } else if (qtdBaixo === 0) {
            _ultimoAvisoEstoqueBaixo = '';
        }
    });
}
setInterval(verificarEstoqueBaixo, 10 * 60 * 1000);



function desbloquearAudio() {
    if (_audioContextDesbloqueado) return;
    try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        _audioContextDesbloqueado = true;
    } catch(e) {}
}
document.addEventListener('touchstart', desbloquearAudio, { passive: true });
document.addEventListener('click', desbloquearAudio, { passive: true });


function dispararNotificacaoSensorial() {
    // Vibração
    if (navigator.vibrate) {
        try { navigator.vibrate([400, 150, 400, 150, 600]); } catch(e) {}
    }
    // Som — só toca se o usuário já tocou na tela
    if (!_audioContextDesbloqueado || !_audioCtx) return;
    try {
        const ctx = _audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const tocar = (freq, inicio, duracao) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + inicio + 0.03);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + inicio + duracao);
            osc.start(ctx.currentTime + inicio);
            osc.stop(ctx.currentTime + inicio + duracao + 0.05);
        };
        tocar(880,  0,    0.2);
        tocar(880,  0.25, 0.2);
        tocar(1100, 0.5,  0.3);
    } catch(e) {}
}

// ====================== RESUMO PRODUÇÃO ======================

function toggleResumoProd() {
    const div = document.getElementById('resumoProducao');
    const btn = event.target;
    if (div.style.display === 'none' || div.style.display === '') { div.style.display = 'block'; btn.textContent = '🍫 Fechar Resumo'; carregarResumoProd(); }
    else { div.style.display = 'none'; btn.textContent = '🍫 Produção Semanal'; }
}


function carregarResumoProd() {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const diffSeg = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(agora);
    segunda.setDate(agora.getDate() + diffSeg);
    segunda.setHours(0,0,0,0);
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    domingo.setHours(23,59,59,999);
    const diasNome = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const mesesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    database.ref('pedidos').orderByKey().once('value', snapshot => {
        const porDia = {};
        snapshot.forEach(child => {
            if (!child.exists()) return;
            const p = child.val();
            if (p.statusPagamento === 'entregue') return;
            let dataPedido = p.dataEntrega || p.data || '';
            if (dataPedido.includes('/')) { const pts = dataPedido.split('/'); dataPedido = `${pts[2]}-${pts[1]}-${pts[0]}`; }
            const dataObj = new Date(dataPedido + 'T00:00:00');
            if (dataObj < segunda || dataObj > domingo) return;
            const iso = dataPedido;
            if (!porDia[iso]) porDia[iso] = { sabores: {}, timeline: [] };
            (p.itens||[]).forEach(item => {
                const nome = item.sabor || item.nome || 'Desconhecido';
                porDia[iso].sabores[nome] = (porDia[iso].sabores[nome]||0) + (parseInt(item.quantidade)||0);
            });
            const totalItens = (p.itens||[]).reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
            porDia[iso].timeline.push({ horario: p.hora||'--:--', nome: p.nome||'Cliente', itens: totalItens, tipo: p.tipoEntrega==='entrega' ? `Entrega - ${p.endereco?.bairro||'N/I'}` : 'Retirada', status: p.statusPagamento||'', dataISO: iso });
        });
        const diasOrdenados = Object.keys(porDia).sort();
        let html = '';
        if (diasOrdenados.length === 0) {
            html = '<p style="color:var(--brown-warm);font-size:0.85em;">Nenhum pedido para esta semana.</p>';
        } else {
            diasOrdenados.forEach(iso => {
                const partes = iso.split('-');
                const dataObj = new Date(parseInt(partes[0]), parseInt(partes[1])-1, parseInt(partes[2]));
                const nomeDia = diasNome[dataObj.getDay()];
                const hoje20 = new Date(); hoje20.setHours(0,0,0,0);
                const diffDias = Math.round((dataObj - hoje20) / 86400000);
                const labelRelativo = diffDias === 0 ? '🔴 HOJE' : diffDias === 1 ? '⏰ AMANHÃ' : diffDias < 0 ? `⚠️ ${Math.abs(diffDias)}d atrás` : `em ${diffDias} dias`;
                const labelDia = `${nomeDia}, ${String(dataObj.getDate()).padStart(2,'0')}/${mesesNome[dataObj.getMonth()]}/${anoAtual}`;
                const { sabores, timeline } = porDia[iso];
                const entries = Object.entries(sabores).sort((a,b) => b[1]-a[1]);
                const totalDia = entries.reduce((s,e) => s+e[1], 0);
                const maxSabor = entries[0]?.[1] || 1;
                html += `<div style="margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--brown-dark);border-radius:10px;padding:7px 14px;margin-bottom:10px;">
                        <span style="font-family:'Cormorant Garamond',serif;font-size:1em;font-weight:700;color:var(--amber-light);">📅 ${labelDia}</span>
                        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:0.75em;background:rgba(255,255,255,0.15);border-radius:50px;padding:2px 8px;color:var(--amber-light);">${labelRelativo}</span><span style="font-size:0.8em;font-weight:700;color:var(--amber-light);">${totalDia} un</span></div>
                    </div>`;
                entries.forEach(([sabor, qtd]) => {
                    const pct = Math.round((qtd/maxSabor)*100);
                    html += `<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:0.84em;margin-bottom:3px;"><span>${sabor}</span><strong>${qtd} un</strong></div><div style="background:var(--cream-dark);border-radius:6px;height:6px;overflow:hidden;"><div style="background:var(--amber);width:${pct}%;height:100%;border-radius:6px;"></div></div></div>`;
                });
                if (timeline.length > 0) {
                    timeline.sort((a,b) => a.horario.localeCompare(b.horario));
                    html += `<div style="margin-top:10px;position:relative;padding-left:22px;"><div style="position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:var(--cream-dark);"></div>`;
                    const agoraProd = new Date(); agoraProd.setHours(0,0,0,0);
                    timeline.forEach((item, idx) => {
                        const cor = item.status==='Pago'?'#4A7C59':item.status==='Pago Parcialmente'?'#F59E0B':'var(--amber)';
                        let dataItemObj = null;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(item.dataISO||'')) { const pts=(item.dataISO||'').split('-'); dataItemObj=new Date(pts[0],pts[1]-1,pts[2]); dataItemObj.setHours(0,0,0,0); }
                        const atrasado = dataItemObj && dataItemObj < agoraProd;
                        const bgCard = atrasado ? '#FEE2E2' : 'var(--cream)';
                        const badgeAtrasado = atrasado ? '<span style="background:var(--red);color:white;border-radius:50px;padding:1px 8px;font-size:0.75em;font-weight:700;margin-left:6px;">⚠️ atrasado</span>' : '';
                        html += `<div style="position:relative;padding-left:16px;padding-bottom:${idx<timeline.length-1?'8px':'0'};"><div style="position:absolute;left:-13px;top:4px;width:12px;height:12px;border-radius:50%;background:${atrasado?'var(--red)':cor};border:2px solid white;box-shadow:0 0 0 2px ${atrasado?'var(--red)':cor};"></div><div style="font-size:0.83em;background:${bgCard};border-radius:10px;padding:7px 12px;"><span style="font-weight:700;color:var(--brown-dark);">${item.horario}</span><span style="color:var(--brown-dark);"> — ${item.nome}</span>${badgeAtrasado}<span style="color:var(--brown-warm);font-size:0.9em;"> (${item.itens} un) • ${item.tipo}</span></div></div>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
                if (iso !== diasOrdenados[diasOrdenados.length-1]) html += `<hr style="border:none;border-top:1px dashed var(--cream-dark);margin:4px 0 18px;">`;
            });
        }
        document.getElementById('resumoProducaoConteudo').innerHTML = html;
    });
}

// ====================== DASHBOARD ======================

function buscarClientesHistorico(termo) {
    if (!termo || termo.length < 2) {
        document.getElementById('autocompleteLista').style.display = 'none';
        return;
    }
    database.ref('pedidos').orderByChild('nome').once('value', snapshot => {
        const clientes = {};
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.nome) return;
            if (p.nome.toLowerCase().includes(termo.toLowerCase())) {
                if (!clientes[p.nome] || p.timestamp > clientes[p.nome].timestamp)
                    clientes[p.nome] = p;
            }
        });
        const lista = document.getElementById('autocompleteLista');
        const resultados = Object.values(clientes).slice(0, 5);
        if (resultados.length === 0) { lista.style.display = 'none'; return; }
        lista.innerHTML = '';
        resultados.forEach(c => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<strong>${c.nome}</strong><span style="color:var(--brown-warm);margin-left:8px;font-size:0.85em;">${c.telefone || ''}</span>`;
            item.addEventListener('click', function() { preencherCliente(c); });
            lista.appendChild(item);
        });
        lista.style.display = 'block';
    });
}


function preencherCliente(cliente) {
    setVal('nome',cliente.nome); setVal('telefone',cliente.telefone);
    if(cliente.tipoEntrega==='entrega'&&cliente.endereco){
        document.getElementById('tipoEntrega').value='entrega';
        document.getElementById('enderecoFields').style.display='block';
        ['cep','endereco','bairro','cidade','numero','pontoReferencia'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});
        setVal('cep',cliente.endereco.cep); setVal('endereco',cliente.endereco.logradouro);
        setVal('numero',cliente.endereco.numero); setVal('bairro',cliente.endereco.bairro);
        setVal('cidade',cliente.endereco.cidade); setVal('pontoReferencia',cliente.endereco.complemento);
    }
    document.getElementById('autocompleteLista').style.display='none';
    toast('👤 Dados preenchidos!');
}

document.addEventListener('click',function(e){
    if(!e.target.closest('.autocomplete-wrapper')){
        const lista=document.getElementById('autocompleteLista');
        if(lista)lista.style.display='none';
    }
});

// ====================== COMPROVANTE ======================
document.addEventListener('DOMContentLoaded', async function() {
    window.scrollTo(0, 0);
    verificarNotificacoes();
    const dataEntregaEl = document.getElementById('dataEntrega');
    if (VALIDAR_DATA_PASSADA && dataEntregaEl) {
        const hoje = new Date();
        dataEntregaEl.min = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');
    }
    ['loginEmail','loginSenha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', function(e) { if(e.key==='Enter') fazerLogin(); });
    });
    await carregarDadosPedidos();
    aplicarDadosDinamicos();
    document.getElementById('enderecoFields').style.display = 'none';
    ['cep','endereco','bairro','cidade','numero','pontoReferencia'].forEach(id => {
        const el=document.getElementById(id); if(el) el.disabled=true;
    });
    document.getElementById('telefone').addEventListener('input', function(e) { e.target.value = maskTelefone(e.target.value); });
    let _debounce=null;
    document.getElementById('nome').addEventListener('input', function() {
        const val=this.value; clearTimeout(_debounce); _debounce=setTimeout(()=>buscarClientesHistorico(val),300);
    });
    document.getElementById('cep').addEventListener('input', function(e) { e.target.value = maskCEP(e.target.value); });
    document.getElementById('cep').addEventListener('blur', function() {
        const cep=this.value.replace(/\D/g,'');
        if(cep.length===8){ fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r=>r.json()).then(d=>{ if(!d.erro){ document.getElementById('endereco').value=d.logradouro; document.getElementById('bairro').value=d.bairro; document.getElementById('cidade').value=d.localidade; } }); }
    });
    document.getElementById('valorFrete').addEventListener('input', function(e) { e.target.value=maskMoeda(e.target.value); atualizarTotal(); });
    document.getElementById('valorDesconto').addEventListener('input', function(e) { e.target.value=maskMoeda(e.target.value); atualizarTotal(); });
    document.getElementById('valorPago').addEventListener('input', function(e) { e.target.value=maskMoeda(e.target.value); });
    document.getElementById('dataEntrega').addEventListener('change', verificarDataBloqueada);
    document.getElementById('tipoEntrega').addEventListener('change', function() {
        const isEntrega=this.value==='entrega';
        document.getElementById('enderecoFields').style.display=isEntrega?'block':'none';
        ['cep','endereco','bairro','cidade','numero','pontoReferencia'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=!isEntrega;if(!isEntrega)el.value='';}});
    });
    document.getElementById('statusPagamento').addEventListener('change', function() {
        document.getElementById('valorPagoContainer').style.display=this.value==='Pago Parcialmente'?'block':'none';
    });
    document.getElementById('cor').addEventListener('change', function() {
        document.getElementById('corCustomizada').style.display=this.value==='Outra'?'block':'none';
    });
    const campoInsumoQtd = document.getElementById('insumoQtd');
    const campoInsumoNomeEmb = document.getElementById('insumoNomeEmbalagem');
    if (campoInsumoQtd)    campoInsumoQtd.addEventListener('input', atualizarDicaEstoqueEmbalagem);
    if (campoInsumoNomeEmb) campoInsumoNomeEmb.addEventListener('input', atualizarDicaEstoqueEmbalagem);
    let _debounceFinalizados = null;
    document.getElementById('buscaFinalizados').addEventListener('input', function() {
        clearTimeout(_debounceFinalizados);
        _debounceFinalizados = setTimeout(() => filtrarFinalizadosPorNome(), 200);
    });
    window.addEventListener('beforeunload', function(e) { if(window.pedidoEmEdicao){e.preventDefault();e.returnValue='';} });
});

window.addEventListener('online',  () => { document.getElementById('avisoOffline').style.display='none'; });
window.addEventListener('offline', () => { document.getElementById('avisoOffline').style.display='block'; });

// ====================== MENU "MAIS OPÇÕES" (genérico — usado em pedidos e insumos) ======================
function toggleMenuMais(menuId, evento) {
    if (evento) evento.stopPropagation();
    const menu = document.getElementById(menuId);
    const btn  = evento ? evento.currentTarget : null;
    if (!menu || !btn) return;

    const jaAberto = menu.style.display === 'block';
    document.querySelectorAll('.menu-mais').forEach(m => m.style.display = 'none');
    if (jaAberto) return; // estava aberto -> só fecha, não reabre

    // Move o menu pro <body> pra escapar do overflow:hidden do card
    document.body.appendChild(menu);
    menu.style.display  = 'block';
    menu.style.position = 'fixed';

    let overlay = document.getElementById('overlayMenuMais');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlayMenuMais';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:9998;';
        overlay.addEventListener('click', () => {
            document.querySelectorAll('.menu-mais').forEach(m => m.style.display = 'none');
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    const rectBtn = btn.getBoundingClientRect();
    const alturaMenu = menu.offsetHeight;
    const larguraMenu = menu.offsetWidth;

    let top = rectBtn.top - alturaMenu - 12;
    if (top < 8) top = rectBtn.bottom + 12; // não coube em cima -> abre embaixo
    if (top + alturaMenu > window.innerHeight - 8) top = window.innerHeight - alturaMenu - 8; // não deixa vazar embaixo da tela

    let left = rectBtn.right - larguraMenu;
    if (left < 8) left = 8;

    menu.style.top    = top + 'px';
    menu.style.left   = left + 'px';
    menu.style.right  = 'auto';
    menu.style.bottom = 'auto';
}

function fecharMenuMais(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) menu.style.display = 'none';
    const overlay = document.getElementById('overlayMenuMais');
    if (overlay) overlay.remove();
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-mais') && !e.target.closest('.btn-mais')) {
        document.querySelectorAll('.menu-mais').forEach(m => m.style.display = 'none');
        const overlay = document.getElementById('overlayMenuMais');
        if (overlay) overlay.remove();
    }
});
