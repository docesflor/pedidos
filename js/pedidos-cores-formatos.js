/* ═══════════════════════════════════════════
   PEDIDOS — CORES DA FORMINHA E FORMATOS (com Firebase)
   Substitui os antigos <select> de Cor/Formato por uma tabela de
   cores + autocomplete de formato. As opções salvas ficam em
   configuracoes/coresPadrao e configuracoes/formatosPadrao,
   crescendo sozinhas conforme o uso (igual o campo de gastos).
   Mantém compatibilidade com pedidos antigos: itens salvos antes
   dessa mudança continuam sendo exibidos normalmente, já que os
   cards (criarCard) só imprimem o texto de item.cor/item.formato.
═══════════════════════════════════════════ */

// Dicionário PT-BR -> hex, usado só pra resolver a prévia de cor customizada
const DICIONARIO_CORES_PT = {
    'coral': '#FF7F50', 'lilás': '#C8A2C8', 'lilas': '#C8A2C8', 'vinho': '#722F37',
    'salmão': '#FA8072', 'salmao': '#FA8072', 'turquesa': '#40E0D0', 'bege': '#F5F5DC',
    'creme': '#FFFDD0', 'grafite': '#3A3A3A', 'chumbo': '#4A4A4A', 'pérola': '#F1E9D2',
    'perola': '#F1E9D2', 'champanhe': '#F7E7CE', 'menta': '#AAF0D1', 'lavanda': '#E6E6FA',
    'pêssego': '#FFDAB9', 'pessego': '#FFDAB9', 'terracota': '#E2725B', 'oliva': '#808000',
    'marsala': '#955251', 'mostarda': '#FFDB58', 'petróleo': '#003366', 'petroleo': '#003366',
    'fúcsia': '#FF00FF', 'fucsia': '#FF00FF', 'magenta': '#FF00FF', 'ciano': '#00FFFF',
    'nude': '#E3BC9A', 'tiffany': '#0ABAB5', 'jade': '#00A86B', 'esmeralda': '#50C878',
    'safira': '#0F52BA', 'rubi': '#E0115F', 'ametista': '#9966CC', 'cobre': '#B87333',
    'bronze': '#CD7F32', 'caramelo': '#C68E17', 'chocolate': '#7B3F00', 'tijolo': '#B22222',
    'vermelho': '#E53935', 'preto': '#1A1A1A', 'branco': '#FFFFFF', 'azul': '#1E88E5',
    'verde': '#43A047', 'amarelo': '#FDD835', 'roxo': '#8E24AA', 'laranja': '#FB8C00',
    'marrom': '#6D4C41', 'cinza': '#9E9E9E', 'dourado': '#C9A227', 'prateado': '#B0B0B0',
    'rosa': '#F06292', 'rosa bebê': '#F8BBD0', 'rosa bebe': '#F8BBD0', 'azul bebê': '#BBDEFB',
    'azul bebe': '#BBDEFB', 'azul marinho': '#1A237E', 'verde água': '#00CED1', 'verde agua': '#00CED1',
    'verde militar': '#4B5320', 'amarelo canário': '#FFEF00', 'amarelo canario': '#FFEF00'
};

function resolverCorParaPreview(nome) {
    if (!nome) return null;
    const chave = nome.trim().toLowerCase();
    if (DICIONARIO_CORES_PT[chave]) return DICIONARIO_CORES_PT[chave];
    if (CSS.supports('background-color', nome.trim())) return nome.trim();
    return null;
}

// Só usadas pra semear o Firebase na primeira vez (mesmos nomes do <select> antigo,
// pra manter compatibilidade com o que já está salvo nos pedidos)
const CORES_PADRAO_INICIAIS = [
    ['Branca','#FFFFFF'], ['Preta','#1A1A1A'], ['Vermelha','#E53935'],
    ['Rosa','#F06292'], ['Azul','#1E88E5'], ['Verde','#43A047'],
    ['Amarela','#FDD835'], ['Roxa','#8E24AA'], ['Laranja','#FB8C00'],
    ['Marrom','#6D4C41'], ['Cinza','#9E9E9E'], ['Dourada','#C9A227'],
    ['Prateada','#B0B0B0']
];
const FORMATOS_PADRAO_INICIAIS = ['Redondo', 'Flor', 'Coração'];
const FORMINHAS_PADRAO_INICIAIS = ['Redonda', 'Quadrada'];

let corSelecionadaHex = '';
let _formatosCache = [];
let _forminhasCache = [];

// ====================== CARREGAR / SEMEAR FIREBASE ======================
async function carregarCoresEFormatos() {
    const snapCores = await database.ref('configuracoes/coresPadrao').once('value');
    if (!snapCores.exists()) {
        const seed = {};
        CORES_PADRAO_INICIAIS.forEach(([nome, hex]) => {
            const key = database.ref('configuracoes/coresPadrao').push().key;
            seed[key] = { nome, hex };
        });
        await database.ref('configuracoes/coresPadrao').set(seed);
    }
    const snapFormatos = await database.ref('configuracoes/formatosPadrao').once('value');
    if (!snapFormatos.exists()) {
        const seed = {};
        FORMATOS_PADRAO_INICIAIS.forEach(nome => {
            const key = database.ref('configuracoes/formatosPadrao').push().key;
            seed[key] = nome;
        });
        await database.ref('configuracoes/formatosPadrao').set(seed);
    }
    const snapForminhas = await database.ref('configuracoes/forminhasPadrao').once('value');
    if (!snapForminhas.exists()) {
        const seed = {};
        FORMINHAS_PADRAO_INICIAIS.forEach(nome => {
            const key = database.ref('configuracoes/forminhasPadrao').push().key;
            seed[key] = nome;
        });
        await database.ref('configuracoes/forminhasPadrao').set(seed);
    }
    renderizarGradeCores();
    carregarListaFormatosCache();
    carregarListaForminhasCache();
}

// ====================== COR DA FORMINHA ======================
function renderizarGradeCores() {
    database.ref('configuracoes/coresPadrao').once('value', snapshot => {
        const grid = document.getElementById('corGrade');
        if (!grid) return;
        grid.innerHTML = '';
        snapshot.forEach(child => {
            const { nome, hex } = child.val();
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cor-swatch';
            btn.style.background = hex;
            btn.title = nome;
            btn.dataset.nome = nome;
            btn.addEventListener('click', () => selecionarCorForminha(nome, hex));
            grid.appendChild(btn);
        });
    });
}

function toggleGradeCores() {
    const grid = document.getElementById('corGrade');
    if (!grid) return;
    grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
    fecharPainelCorCustom();
}

function selecionarCorForminha(nome, hex) {
    document.getElementById('cor').value = nome;
    corSelecionadaHex = hex;
    atualizarDotCor(hex);
    document.getElementById('corGrade').style.display = 'none';
    document.querySelectorAll('#corGrade .cor-swatch').forEach(el => el.classList.toggle('selected', el.dataset.nome === nome));
    fecharPainelCorCustom();
}

function atualizarDotCor(hex) {
    const dot = document.getElementById('corForminhaDot');
    if (dot) dot.style.background = hex || '#eee';
}

function abrirPainelCorCustom(evento) {
    if (evento) evento.stopPropagation();
    const painel = document.getElementById('corCustomPainel');
    painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
    document.getElementById('corGrade').style.display = 'none';
    if (painel.style.display === 'block') document.getElementById('corCustomInput').focus();
}

function fecharPainelCorCustom() {
    const painel = document.getElementById('corCustomPainel');
    if (!painel) return;
    painel.style.display = 'none';
    document.getElementById('corCustomInput').value = '';
    document.getElementById('corCustomPreview').style.background = '#fff';
    document.getElementById('corCustomOk').disabled = true;
}

document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'corCustomInput') {
        const hex = resolverCorParaPreview(e.target.value);
        document.getElementById('corCustomPreview').style.background = hex || '#fff';
        document.getElementById('corCustomOk').disabled = !hex;
    }
});

async function confirmarCorCustom() {
    const nome = document.getElementById('corCustomInput').value.trim();
    const hex = resolverCorParaPreview(nome);
    if (!nome || !hex) return;
    document.getElementById('cor').value = nome;
    corSelecionadaHex = hex;
    atualizarDotCor(hex);
    document.querySelectorAll('#corGrade .cor-swatch').forEach(el => el.classList.remove('selected'));
    fecharPainelCorCustom();
    const snapshot = await database.ref('configuracoes/coresPadrao').once('value');
    const jaExiste = Object.values(snapshot.val() || {}).some(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (!jaExiste) {
        await database.ref('configuracoes/coresPadrao').push({ nome, hex });
        renderizarGradeCores();
    }
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.cor-forminha-wrapper')) {
        const grid = document.getElementById('corGrade');
        if (grid) grid.style.display = 'none';
        fecharPainelCorCustom();
    }
});

// ====================== FORMATO (autocomplete, mesmo padrão do campo Nome) ======================
function carregarListaFormatosCache() {
    database.ref('configuracoes/formatosPadrao').once('value', snapshot => {
        _formatosCache = Object.values(snapshot.val() || {});
    });
}

function mostrarSugestoesFormato(filtro) {
    const lista = document.getElementById('formatoLista');
    if (!lista) return;
    const termo = (filtro || '').trim().toLowerCase();
    const filtrados = termo ? _formatosCache.filter(f => f.toLowerCase().includes(termo)) : _formatosCache;
    lista.innerHTML = '';
    filtrados.forEach(f => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = f;
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            document.getElementById('formato').value = f;
            lista.style.display = 'none';
        });
        lista.appendChild(item);
    });
    lista.style.display = filtrados.length > 0 ? 'block' : 'none';
}

async function salvarFormatoNovoSeNecessario() {
    const valor = document.getElementById('formato').value.trim();
    if (!valor) return;
    const jaExiste = _formatosCache.some(f => f.toLowerCase() === valor.toLowerCase());
    if (!jaExiste) {
        await database.ref('configuracoes/formatosPadrao').push(valor);
        _formatosCache.push(valor);
    }
}

// ====================== FORMINHA (mesmo padrão do Formato) ======================
function carregarListaForminhasCache() {
    database.ref('configuracoes/forminhasPadrao').once('value', snapshot => {
        _forminhasCache = Object.values(snapshot.val() || {});
    });
}

function mostrarSugestoesForminha(filtro) {
    const lista = document.getElementById('tipoFormaLista');
    if (!lista) return;
    const termo = (filtro || '').trim().toLowerCase();
    const filtrados = termo ? _forminhasCache.filter(f => f.toLowerCase().includes(termo)) : _forminhasCache;
    lista.innerHTML = '';
    filtrados.forEach(f => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = f;
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            document.getElementById('tipoForma').value = f;
            lista.style.display = 'none';
        });
        lista.appendChild(item);
    });
    lista.style.display = filtrados.length > 0 ? 'block' : 'none';
}

async function salvarForminhaNovaSeNecessario() {
    const valor = document.getElementById('tipoForma').value.trim();
    if (!valor) return;
    const jaExiste = _forminhasCache.some(f => f.toLowerCase() === valor.toLowerCase());
    if (!jaExiste) {
        await database.ref('configuracoes/forminhasPadrao').push(valor);
        _forminhasCache.push(valor);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    carregarCoresEFormatos();
    const campoFormato = document.getElementById('formato');
    if (campoFormato) {
        campoFormato.addEventListener('focus', () => mostrarSugestoesFormato(campoFormato.value));
        campoFormato.addEventListener('input', () => mostrarSugestoesFormato(campoFormato.value));
        campoFormato.addEventListener('blur', () => {
            setTimeout(() => { const l = document.getElementById('formatoLista'); if (l) l.style.display = 'none'; }, 100);
            salvarFormatoNovoSeNecessario();
        });
    }
    const campoForminha = document.getElementById('tipoForma');
    if (campoForminha) {
        campoForminha.addEventListener('focus', () => mostrarSugestoesForminha(campoForminha.value));
        campoForminha.addEventListener('input', () => mostrarSugestoesForminha(campoForminha.value));
        campoForminha.addEventListener('blur', () => {
            setTimeout(() => { const l = document.getElementById('tipoFormaLista'); if (l) l.style.display = 'none'; }, 100);
            salvarForminhaNovaSeNecessario();
        });
    }
});
