/* ═══════════════════════════════════════════
   PEDIDOS — AUTENTICAÇÃO, PERMISSÕES E FILA OFFLINE
   Depende de: shared/firebase-config.js, shared/sabores-precos.js, shared/utils.js
   Precisa carregar ANTES de: pedidos-precos.js (usa TABELA_PRECOS/CATEGORIA_SABOR
   que são declarados lá, mas aplicarDadosDinamicos() só roda no DOMContentLoaded,
   então a ordem de carregamento dos <script> continua tranquila)
═══════════════════════════════════════════ */

firebase.initializeApp(window.FIREBASE_CONFIG);
const database = firebase.database();
const auth = firebase.auth();
const VALIDAR_DATA_PASSADA = true;
let PAPEL_USUARIO = 'admin';
const FILA_OFFLINE_KEY = 'docesflor_fila_pedidos_offline';

// ====================== FILA OFFLINE ======================
function salvarNaFilaOffline(item) {
    let fila = [];
    try { fila = JSON.parse(localStorage.getItem(FILA_OFFLINE_KEY)) || []; } catch(e) { fila = []; }
    fila.push(item);
    localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(fila));
}

async function processarFilaOffline() {
    let fila = [];
    try { fila = JSON.parse(localStorage.getItem(FILA_OFFLINE_KEY)) || []; } catch(e) { fila = []; }
    if (fila.length === 0) return;
    toast('📶 Conexão restabelecida. Sincronizando ' + fila.length + ' pedido(s) pendente(s)...', 'aviso');
    for (const item of fila) {
        try {
            await database.ref(item.refPath).set(item.pedido);
            if (item.ehNovoPedido) {
                await ajustarEstoquePorPedido(item.pedido.itens, 'abater');
            } else {
                if (item.itensAntigos) await ajustarEstoquePorPedido(item.itensAntigos, 'devolver');
                await ajustarEstoquePorPedido(item.pedido.itens, 'abater');
            }
        } catch (err) {
            console.error('Erro ao sincronizar pedido da fila offline:', err);
        }
    }
    localStorage.removeItem(FILA_OFFLINE_KEY);
    toast('✅ Todos os pedidos pendentes foram sincronizados!');
    carregarAndamento();
}

window.addEventListener('online', processarFilaOffline);

// ====================== DADOS DINÂMICOS ======================
let DADOS_PEDIDOS = null;

async function carregarDadosPedidos() {
    DADOS_PEDIDOS = {
        "sabores": window.CATALOGO_DOCES_FLOR.sabores,
        "precos": window.CATALOGO_DOCES_FLOR.precos,
        "gastos": {
            "Ingredientes": ["Leite condensado","Chocolate em pó","Manteiga","Creme de leite","Leite Ninho","Nutella","Pasta de amendoim","Coco ralado","Morango","Frutas variadas"],
            "Embalagens":   ["Forminhas","Caixas 25 un","Caixas 50 un","Caixas 100 un","Fitas e laços","Papel celofane","Etiquetas"],
            "Gás/Energia":  ["Gás de cozinha","Energia elétrica"],
            "Entrega":      ["Combustível","Taxa de entrega app","Embalagem transporte"],
            "Outros":       ["Luvas descartáveis","Papel toalha","Detergente / limpeza"]
        }
    };
    if (DADOS_PEDIDOS.gastos) {
        Object.keys(DADOS_PEDIDOS.gastos).forEach(cat => {
            DADOS_PEDIDOS.gastos[cat] = DADOS_PEDIDOS.gastos[cat].sort((a,b) => a.localeCompare(b,'pt-BR'));
        });
    }
}

// ====================== POPULAR SABORES (dinâmico) ======================
function popularSelectSabores() {
    if (!DADOS_PEDIDOS || !DADOS_PEDIDOS.sabores) return;
    const sel = document.getElementById('sabor');
    sel.innerHTML = '<option value="">Selecione o sabor</option>';
    const grupos = [
        { key:'trads',    label:'Tradicionais' },
        { key:'gourmets', label:'Gourmet'       },
        { key:'frutas',   label:'Frutas'         }
    ];
    grupos.forEach(g => {
        const group = document.createElement('optgroup');
        group.label = g.label;
        (DADOS_PEDIDOS.sabores[g.key] || []).forEach(nome => {
            const opt = document.createElement('option');
            opt.value = nome; opt.textContent = nome;
            group.appendChild(opt);
        });
        sel.appendChild(group);
    });
}

// Mantido por compatibilidade com o restante do código (chamado no init).
// TABELA_PRECOS e CATEGORIA_SABOR já nascem completos via shared/sabores-precos.js,
// então aqui só precisamos popular o <select> de sabores.
function aplicarDadosDinamicos() {
    if (!DADOS_PEDIDOS) return;
    popularSelectSabores();
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

function fazerLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;
    const erro  = document.getElementById('loginErro');
    const btn   = document.getElementById('btnLogin');
    if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha.'; return; }
    btn.textContent = 'Entrando...';
    btn.disabled = true;
    erro.textContent = '';
    auth.signInWithEmailAndPassword(email, senha)
        .then(() => { btn.textContent = 'Entrar'; btn.disabled = false; })
        .catch(e => {
            btn.textContent = 'Entrar';
            btn.disabled = false;
            const msgs = {
                'auth/user-not-found':    'E-mail não cadastrado.',
                'auth/wrong-password':    'Senha incorreta.',
                'auth/invalid-email':     'E-mail inválido.',
                'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
                'auth/invalid-credential':'E-mail ou senha incorretos.'
            };
            erro.textContent = msgs[e.code] || 'Erro ao entrar. Tente novamente.';
        });
}

function recuperarSenha() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) { document.getElementById('loginErro').textContent = 'Digite seu e-mail acima primeiro.'; return; }
    auth.sendPasswordResetEmail(email)
        .then(() => toast('📧 E-mail de redefinição enviado!'))
        .catch(() => document.getElementById('loginErro').textContent = 'Não foi possível enviar o e-mail.');
}

function fazerLogout() {
    if (confirm('Deseja sair?')) auth.signOut();
}

function aplicarPermissoesPapel() {
    if (PAPEL_USUARIO === 'producao') {
        const abasEsconder = ['criar', 'andamento', 'finalizados', 'dashboard', 'gastos'];
        abasEsconder.forEach(secao => {
            const btnTopo = [...document.querySelectorAll('.menu-btn')].find(b => b.getAttribute('onclick')?.includes(`'${secao}'`));
            if (btnTopo) {
                const wrapper = btnTopo.closest('.menu-btn-wrapper');
                if (wrapper) wrapper.style.display = 'none'; else btnTopo.style.display = 'none';
            }
            const btnGaveta = document.getElementById('gbtn' + secao.charAt(0).toUpperCase() + secao.slice(1));
            if (btnGaveta) btnGaveta.style.display = 'none';
        });
        document.querySelectorAll('.pedido-info').forEach(el => {
            if (el.textContent.includes('Total:')) el.style.display = 'none';
        });
    }
}
