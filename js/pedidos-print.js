const KA1445_SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const KA1445_WRITE_CHAR_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';

let dispositivoImpressora = null;
let caracteristicaEscrita = null;

async function conectarImpressora() {
    try {
        const dispositivo = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                KA1445_SERVICE_UUID,
                '0000fee7-0000-1000-8000-00805f9b34fb',
                '0000ff00-0000-1000-8000-00805f9b34fb',
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
                '000018f0-0000-1000-8000-00805f9b34fb'
            ]
        });
        const server = await dispositivo.gatt.connect();
        const service = await server.getPrimaryService(KA1445_SERVICE_UUID);
        caracteristicaEscrita = await service.getCharacteristic(KA1445_WRITE_CHAR_UUID);
        dispositivoImpressora = dispositivo;

        dispositivo.addEventListener('gattserverdisconnected', () => {
            caracteristicaEscrita = null;
            toast('🖨️ Impressora desconectada.', 'aviso');
        });

        toast('🖨️ Impressora conectada!', 'sucesso');
        return true;
    } catch (err) {
        console.error('Erro ao conectar impressora:', err);
        toast('Não foi possível conectar à impressora.', 'erro');
        return false;
    }
}

// Envia bytes em pedaços pequenos (BLE tem limite de pacote — ~180 bytes é seguro)
async function enviarParaImpressora(bytes) {
    const TAMANHO_PACOTE = 180;
    for (let i = 0; i < bytes.length; i += TAMANHO_PACOTE) {
        const pedaco = bytes.slice(i, i + TAMANHO_PACOTE);
        await caracteristicaEscrita.writeValueWithoutResponse(pedaco);
        await new Promise(r => setTimeout(r, 30)); // pequena pausa entre pacotes
    }
}

// ═══════════════════════════════════════════
// IMPRESSÃO EM IMAGEM (fonte do site via html2canvas)
// ═══════════════════════════════════════════
const LARGURA_IMPRESSORA_PX = 384; // 58mm a 203dpi
const LOGO_URL = 'https://cdn.jsdelivr.net/gh/docesflor/shared@main/icone_termica.png';

async function gerarCanvasComanda(p, dataBr, horario) {
    const container = document.createElement('div');
    const OFFSET_ESQUERDA_PX = 30; // ajuste este valor até centralizar (teste com +6 em +6) — quanto maior, mais o conteúdo vai pra ESQUERDA
container.style.cssText = `position:fixed;top:-9999px;left:0;width:${LARGURA_IMPRESSORA_PX}px;background:#fff;font-family:'DM Sans',Arial,sans-serif;color:#000;padding:10px 10px 10px calc(10px - ${OFFSET_ESQUERDA_PX}px);box-sizing:border-box;`;

    const itensP = p.itens || [];
    const primeiroItem = itensP[0] || {};
    const todosIguaisImp = itensP.length > 1 && itensP.every(i =>
        i.formato === primeiroItem.formato && i.tipoForma === primeiroItem.tipoForma && i.cor === primeiroItem.cor
    );

    let itensHTML = '';
    if (itensP.length === 1) {
        const i = primeiroItem;
        itensHTML = `<div style="font-size:32px;font-weight:700;">${i.quantidade}x ${i.sabor || i.nome}</div>
            <div style="font-size:22px;color:#333;">B: ${i.formato||''} | F: ${i.tipoForma||''}/${i.cor||''}</div>`;
    } else if (todosIguaisImp) {
        itensP.forEach(i => { itensHTML += `<div style="font-size:32px;font-weight:700;">${i.quantidade}x ${i.sabor || i.nome}</div>`; });
        itensHTML += `<div style="margin-top:10px;font-size:22px;color:#333;">Brigadeiro: ${primeiroItem.formato||''}<br>Forma: ${primeiroItem.tipoForma||''}/${primeiroItem.cor||''}</div>`;
    } else {
        itensP.forEach(i => {
            itensHTML += `<div style="font-size:32px;font-weight:700;">${i.quantidade}x ${i.sabor || i.nome}</div>
                <div style="font-size:22px;color:#333;">B: ${i.formato||''} | F: ${i.tipoForma||''}/${i.cor||''}</div>`;
        });
    }

    const enderecoHTML = (p.tipoEntrega === 'entrega' && p.endereco)
        ? `${p.endereco.logradouro}, ${p.endereco.numero}<br>${p.endereco.bairro}`
        : 'Retirada no local';

    const total = typeof p.valorTotal === 'number' ? p.valorTotal.toFixed(2).replace('.', ',') : '0,00';

    container.innerHTML = `
        <div style="text-align:center;margin-bottom:10px;"><img src="${LOGO_URL}" crossorigin="anonymous" style="width:230px;height:auto;display:inline-block;"></div>
        <div style="border-top:2px dashed #000;margin:10px 0;"></div>
        <div style="font-size:24px;">Cliente: ${p.nome || '---'}</div>
        <div style="font-size:24px;">${dataBr}${horario ? ' às ' + horario + 'h' : ''}</div>
        <div style="font-size:24px;">${enderecoHTML}</div>
        <div style="border-top:2px dashed #000;margin:10px 0;"></div>
        ${itensHTML}
        <div style="border-top:2px dashed #000;margin:10px 0;"></div>
        <div style="font-size:32px;font-weight:700;">TOTAL: R$ ${total}</div>
        <div style="font-size:24px;">Pagamento: ${p.statusPagamento || ''}</div>
        ${p.observacoes ? `<div style="font-size:22px;margin-top:8px;">Obs: ${p.observacoes}</div>` : ''}
    `;

    document.body.appendChild(container);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgLogo = container.querySelector('img');
    if (imgLogo && !imgLogo.complete) {
        await new Promise(resolve => { imgLogo.onload = resolve; imgLogo.onerror = resolve; });
    }
    const canvas = await html2canvas(container, { scale: 1, backgroundColor: '#ffffff', width: LARGURA_IMPRESSORA_PX, useCORS: true });
    container.remove();
    return canvas;
}

function canvasParaESCPOSRaster(canvas) {
    const ctx = canvas.getContext('2d');
    const largura = canvas.width;
    const altura = canvas.height;
    const imgData = ctx.getImageData(0, 0, largura, altura).data;

    // buffer de cinza em float pra permitir dithering (evita cortar seco os detalhes finos da logo)
    const cinzas = new Float32Array(largura * altura);
    for (let y = 0; y < altura; y++) {
        for (let x = 0; x < largura; x++) {
            const idx = (y * largura + x) * 4;
            const alfa = imgData[idx+3];
            const cinza = imgData[idx] * 0.299 + imgData[idx+1] * 0.587 + imgData[idx+2] * 0.114;
            cinzas[y * largura + x] = alfa > 128 ? cinza : 255; // transparente conta como branco
        }
    }

    const bytesPorLinha = Math.ceil(largura / 8);
    const bitmap = new Uint8Array(bytesPorLinha * altura);

    // dithering Floyd–Steinberg: difunde o erro de arredondamento pros vizinhos
    for (let y = 0; y < altura; y++) {
        for (let x = 0; x < largura; x++) {
            const i = y * largura + x;
            const antigo = cinzas[i];
            const preto = antigo < 128;
            const erro = antigo - (preto ? 0 : 255);

            if (preto) {
                const byteIdx = y * bytesPorLinha + (x >> 3);
                bitmap[byteIdx] |= (0x80 >> (x % 8));
            }

            if (x + 1 < largura) cinzas[i + 1] += erro * 7 / 16;
            if (y + 1 < altura) {
                if (x > 0) cinzas[i + largura - 1] += erro * 3 / 16;
                cinzas[i + largura] += erro * 5 / 16;
                if (x + 1 < largura) cinzas[i + largura + 1] += erro * 1 / 16;
            }
        }
    }

    const xL = bytesPorLinha & 0xFF, xH = (bytesPorLinha >> 8) & 0xFF;
    const yL = altura & 0xFF, yH = (altura >> 8) & 0xFF;
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]); // GS v 0

    const resultado = new Uint8Array(header.length + bitmap.length);
    resultado.set(header, 0);
    resultado.set(bitmap, header.length);
    return resultado;
}

async function imprimirComandaImagem(key) {
    if (!caracteristicaEscrita) {
        const ok = await conectarImpressora();
        if (!ok) return;
    }
    database.ref('pedidos/' + key).once('value', async snapshot => {
        const p = snapshot.val();
        if (!p) { toast('Pedido não encontrado.', 'erro'); return; }
        const dataBr = formatarDataComDia(p.dataEntrega || p.data || '');
        const horario = (p.hora || '').trim();
        toast('⏳ Gerando comanda...', 'aviso');
        try {
            const canvas = await gerarCanvasComanda(p, dataBr, horario);
            const bytes = canvasParaESCPOSRaster(canvas);
            await enviarParaImpressora(new Uint8Array([0x1B, 0x40])); // reset
            await enviarParaImpressora(bytes);
            await enviarParaImpressora(new TextEncoder().encode('\n\n\n'));
            toast('🖨️ Comanda impressa!', 'sucesso');
        } catch (err) {
            console.error(err);
            toast('Erro ao imprimir.', 'erro');
        }
    });
}
// ═══════════════════════════════════════════
// FIM — IMPRESSÃO EM IMAGEM
// ═══════════════════════════════════════════

// Quebra um texto em várias linhas sem cortar palavras no meio
function quebrarLinha(texto, largura = 32) {
    const palavras = texto.split(' ');
    const linhas = [];
    let linhaAtual = '';

    palavras.forEach(palavra => {
        // se a palavra sozinha for maior que a largura, força corte nela mesma
        if (palavra.length > largura) {
            if (linhaAtual) { linhas.push(linhaAtual); linhaAtual = ''; }
            for (let i = 0; i < palavra.length; i += largura) {
                linhas.push(palavra.slice(i, i + largura));
            }
            return;
        }
        const tentativa = linhaAtual ? linhaAtual + ' ' + palavra : palavra;
        if (tentativa.length > largura) {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = tentativa;
        }
    });
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas.join('\n') + '\n';
}

// Monta os comandos ESC/POS a partir do pedido
function montarComandoESCPOS(p, dataBr, horario) {
    const enc = new TextEncoder();
    const partes = [];

    partes.push(new Uint8Array([0x1B, 0x40])); // reset
    partes.push(new Uint8Array([0x1B, 0x61, 0x01])); // centralizar
    partes.push(new Uint8Array([0x1B, 0x21, 0x30])); // fonte grandes
    partes.push(enc.encode('DOCES FLOR\n'));
    partes.push(new Uint8Array([0x1B, 0x21, 0x00])); // fonte normal
    partes.push(enc.encode('--------------------------------\n'));
    partes.push(new Uint8Array([0x1B, 0x61, 0x00])); // esquerda

    partes.push(enc.encode(quebrarLinha(`Cliente: ${p.nome || '---'}`)));
    partes.push(enc.encode(`${dataBr}${horario ? ' às ' + horario + 'h' : ''}\n`));
    if (p.tipoEntrega === 'entrega' && p.endereco) {
        partes.push(enc.encode(quebrarLinha(`${p.endereco.logradouro}, ${p.endereco.numero}`)));
        partes.push(enc.encode(quebrarLinha(p.endereco.bairro)));
    } else {
        partes.push(enc.encode('Retirada no local\n'));
    }
    partes.push(enc.encode('--------------------------------\n'));

    const itensP = p.itens || [];
    const primeiroItem = itensP[0] || {};
    const todosIguaisImp = itensP.length > 1 && itensP.every(i =>
        i.formato === primeiroItem.formato &&
        i.tipoForma === primeiroItem.tipoForma &&
        i.cor === primeiroItem.cor
    );

    if (itensP.length === 1) {
        const i = primeiroItem;
        partes.push(enc.encode(quebrarLinha(`${i.quantidade}x ${removerAcentos(i.sabor || i.nome)}`)));
        partes.push(enc.encode(quebrarLinha(`B: ${removerAcentos(i.formato || '')} | F: ${removerAcentos((i.tipoForma||'') + '/' + (i.cor||''))}`)));
    } else if (todosIguaisImp) {
        itensP.forEach(i => {
            partes.push(enc.encode(quebrarLinha(`${i.quantidade}x ${removerAcentos(i.sabor || i.nome)}`)));
        });
        partes.push(enc.encode('\n'));
        partes.push(enc.encode(quebrarLinha(`Brigadeiro: ${removerAcentos(primeiroItem.formato || '')}`)));
        partes.push(enc.encode(quebrarLinha(`Forma: ${removerAcentos((primeiroItem.tipoForma||'') + '/' + (primeiroItem.cor||''))}`)));
    } else {
        itensP.forEach(i => {
            partes.push(enc.encode(quebrarLinha(`${i.quantidade}x ${removerAcentos(i.sabor || i.nome)}`)));
            partes.push(enc.encode(quebrarLinha(`B: ${removerAcentos(i.formato || '')} | F: ${removerAcentos((i.tipoForma||'') + '/' + (i.cor||''))}`)));
        });
    }

    partes.push(enc.encode('--------------------------------\n'));
    const total = typeof p.valorTotal === 'number' ? p.valorTotal.toFixed(2).replace('.', ',') : '0,00';
    partes.push(new Uint8Array([0x1B, 0x21, 0x10])); // fonte média/negrito
    partes.push(enc.encode(`TOTAL: R$ ${total}\n`));
    partes.push(new Uint8Array([0x1B, 0x21, 0x00]));
    partes.push(enc.encode(`Pagamento: ${p.statusPagamento || ''}\n`));
    if (p.observacoes) partes.push(enc.encode(quebrarLinha(`Obs: ${p.observacoes}`)));
    partes.push(enc.encode('\n\n\n'));

    // concatena tudo em um único Uint8Array
    const tamanhoTotal = partes.reduce((s, p) => s + p.length, 0);
    const resultado = new Uint8Array(tamanhoTotal);
    let offset = 0;
    partes.forEach(p => { resultado.set(p, offset); offset += p.length; });
    return resultado;
}

// Função principal — chamar pelo botão no card do pedido
async function imprimirComanda(key) {
    if (!caracteristicaEscrita) {
        const ok = await conectarImpressora();
        if (!ok) return;
    }
    database.ref('pedidos/' + key).once('value', async snapshot => {
        const p = snapshot.val();
        if (!p) { toast('Pedido não encontrado.', 'erro'); return; }
        const dataBr = formatarDataComDia(p.dataEntrega || p.data || '');
        const horario = (p.hora || '').trim();
        const bytes = montarComandoESCPOS(p, dataBr, horario);
        try {
            await enviarParaImpressora(bytes);
            toast('🖨️ Comanda impressa!', 'sucesso');
        } catch (err) {
            console.error(err);
            toast('Erro ao imprimir.', 'erro');
        }
    });
}
