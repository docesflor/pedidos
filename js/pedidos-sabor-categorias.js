/* ═══════════════════════════════════════════
   PEDIDOS — SABOR POR CATEGORIA (botões + chips)
   Substitui o <select> de Sabor por 3 botões de categoria
   (Tradicionais/Gourmet/Frutas) + chips dos sabores da
   categoria selecionada. O valor final continua sendo lido
   de #sabor (agora um <input type="hidden">) — nada muda
   pra quem lê esse campo em outros arquivos (adicionarItem,
   editarItemCarrinho, etc).
═══════════════════════════════════════════ */

const SABORES_POR_CATEGORIA = {
    trad: ['Amendoim','Beijinho','Brigadeiro','Café','Chocotone','Dois Amores','Leite Ninho','Moranguinho (Nesquik)','Morango Ninho','Prestígio','Quebra Queixo','Sensação','Tapioca'],
    gourmet: ['Banoffee','Black Cacau','Canjica','Chocolate Gourmet','Churros','Confete','Doritos','Ferrero Rocher','Floresta Negra','Guacamole','Leite Ninho com Nutella','Menta','Negresco','Nutella','Ovomaltine'],
    frutas: ['Amora','Banana','Cereja','Frutas Vermelhas','Limão','Maracujá','Milho','Uva']
};

let categoriaSaborAtual = null;

function selecionarCategoriaSabor(cat, btn) {
    categoriaSaborAtual = cat;
    document.querySelectorAll('.sabor-cat-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderizarChipsSabor();
}

function renderizarChipsSabor() {
    const container = document.getElementById('saborListaChips');
    if (!container) return;
    if (!categoriaSaborAtual) { container.innerHTML = ''; return; }
    const valorAtual = document.getElementById('sabor').value;
    container.innerHTML = '';
    SABORES_POR_CATEGORIA[categoriaSaborAtual].forEach(nome => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip-filtro';
        chip.textContent = nome;
        if (nome === valorAtual) chip.classList.add('active');
        chip.addEventListener('click', () => selecionarSabor(nome));
        container.appendChild(chip);
    });
}

function selecionarSabor(nome) {
    document.getElementById('sabor').value = nome;
    renderizarChipsSabor();
}

// Usado ao editar um item do carrinho: troca a categoria/aba pra
// bater com o sabor que já estava salvo naquele item
function sincronizarCategoriaSaborPeloValor(saborSalvo) {
    for (const [cat, lista] of Object.entries(SABORES_POR_CATEGORIA)) {
        if (lista.includes(saborSalvo)) {
            categoriaSaborAtual = cat;
            document.querySelectorAll('.sabor-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
            break;
        }
    }
    renderizarChipsSabor();
}

document.addEventListener('DOMContentLoaded', function() {
    renderizarChipsSabor();
});
