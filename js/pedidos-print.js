const KA1445_SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const KA1445_WRITE_CHAR_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';

let dispositivoImpressora = null;
let caracteristicaEscrita = null;

async function conectarImpressora() {
    try {
        const dispositivo = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'KA-1445' }],
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
    const TAMANHO_PACOTE = 20;
    for (let i = 0; i < bytes.length; i += TAMANHO_PACOTE) {
        const pedaco = bytes.slice(i, i + TAMANHO_PACOTE);
        await caracteristicaEscrita.writeValue(pedaco);
        await new Promise(r => setTimeout(r, 40)); // pequena pausa entre pacotes
    }
}

// Monta os comandos ESC/POS a partir do pedido
function montarComandoESCPOS(p, dataBr, horario) {
    const enc = new TextEncoder();
    const partes = [];

    partes.push(new Uint8Array([0x1B, 0x40])); // reset
    partes.push(new Uint8Array([0x1B, 0x4D, 0x01])); // fonte B (condensada) — vale pro recibo inteiro
    partes.push(new Uint8Array([0x1B, 0x61, 0x01])); // centralizar
    partes.push(new Uint8Array([0x1B, 0x21, 0x30])); // fonte grande (título)
    partes.push(enc.encode('DOCES FLOR\n'));
    partes.push(new Uint8Array([0x1B, 0x21, 0x00])); // fonte normal
    partes.push(enc.encode('--------------------------------\n'));
    partes.push(new Uint8Array([0x1B, 0x61, 0x00])); // esquerda

    partes.push(enc.encode(`Cliente: ${p.nome || '---'}\n`));
    partes.push(enc.encode(`${dataBr}${horario ? ' as ' + horario + 'h' : ''}\n`));
    if (p.tipoEntrega === 'entrega' && p.endereco) {
        partes.push(enc.encode(`${p.endereco.logradouro}, ${p.endereco.numero}\n${p.endereco.bairro}\n`));
    } else {
        partes.push(enc.encode('Retirada no local\n'));
    }
    partes.push(enc.encode('--------------------------------\n'));

    (p.itens || []).forEach(item => {
        partes.push(enc.encode(`${item.quantidade}x ${removerAcentos(item.sabor || item.nome)}\n`));
    });

    partes.push(enc.encode('--------------------------------\n'));
    const total = typeof p.valorTotal === 'number' ? p.valorTotal.toFixed(2).replace('.', ',') : '0,00';
    partes.push(new Uint8Array([0x1B, 0x21, 0x10])); // fonte média/negrito
    partes.push(enc.encode(`TOTAL: R$ ${total}\n`));
    partes.push(new Uint8Array([0x1B, 0x21, 0x00]));
    partes.push(enc.encode(`Pagamento: ${p.statusPagamento || ''}\n`));
    if (p.observacoes) partes.push(enc.encode(`Obs: ${p.observacoes}\n`));
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
            toast('Erro: ' + (err.message || err), 'erro');
        }
    });
}
