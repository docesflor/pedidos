/* ═══════════════════════════════════════════
   PEDIDOS — TEMPLATES WHATSAPP, PIX E COMPROVANTE
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function gerarPayloadPix(chave, nomeRecebedor, cidade, valor, txId) {
    function tlv(id, value) {
        const len = String(value.length).padStart(2, '0');
        return id + len + value;
    }
    const valorFormatado = valor.toFixed(2);
    const merchantAccount = tlv('00','BR.GOV.BCB.PIX') + tlv('01', chave);
    const payload =
        tlv('00','01') +
        tlv('26', merchantAccount) +
        tlv('52','0000') +
        tlv('53','986') +
        tlv('54', valorFormatado) +
        tlv('58','BR') +
        tlv('59', nomeRecebedor.substring(0,25)) +
        tlv('60', cidade.substring(0,15)) +
        tlv('62', tlv('05', txId.substring(0,25))) ;
    const semCRC = payload + '6304';
    const crc = crc16(semCRC);
    return semCRC + crc;
}

function crc16(str) {
    let crc = 0xFFFF;
    for (let i=0;i<str.length;i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j=0;j<8;j++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4,'0');
}


function gerarCobrancaPix(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val(); if (!p) return;
        const vTotal = typeof p.valorTotal === 'number' ? p.valorTotal : 0;
        const vPago  = parseFloat((p.valorPago||'').replace('R$','').replace(',','.').trim()) || 0;
        const vRestante = Math.max(0, vTotal - vPago);

        // ⚠️ TROQUE pelos seus dados reais de chave Pix:
        const CHAVE_PIX = '+5547992745896'; // chave tipo telefone PRECISA do +55 na frente
        const NOME_RECEBEDOR = removerAcentos('ALANA NERIS DE OLIVEIRA');
        const CIDADE = removerAcentos('JARAGUA DO SUL');

        const payload = gerarPayloadPix(CHAVE_PIX, NOME_RECEBEDOR, CIDADE, vRestante, 'PED' + key.substr(-8));

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modalPix';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:340px;">
                <p style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--brown-dark);margin-bottom:6px;">💸 Cobrança Pix</p>
                <p style="font-size:0.85em;color:var(--brown-warm);margin-bottom:14px;">${escaparHTML(p.nome)} — R$ ${vRestante.toFixed(2).replace('.',',')}</p>
                <div id="qrcode-pix" style="display:flex;justify-content:center;margin-bottom:14px;"></div>                <textarea readonly style="font-size:0.7em;height:70px;" id="pix-copia-cola">${payload}</textarea>
                <div class="modal-botoes">
                    <button class="btn btn-cinza" onclick="document.getElementById('modalPix').remove()">Fechar</button>
                    <button class="btn btn-verde" onclick="copiarParaClipboard(document.getElementById('pix-copia-cola').value).then(()=>toast('📋 Código Pix copiado!'))">Copiar Código</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        if (typeof QRCode === 'undefined') {
    console.error('Biblioteca QRCode não carregada.');
    toast('⚠️ QR Code indisponível no momento. Use o código copia-e-cola.', 'aviso');
} else {
    const qrDiv = document.getElementById('qrcode-pix');
    if (qrDiv) {
        qrDiv.innerHTML = '';
        new QRCode(qrDiv, {
            text: payload,
            width: 220,
            height: 220,
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}
    });
}


function abrirTemplates(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val(); if (!p) return;
        const nome     = p.nome || 'Cliente';
        const primeiroNome = nome.split(' ')[0];
        const dataBR   = formatarDataComDia(p.dataEntrega || '');
        const horario  = p.hora && p.hora.trim() ? ' às ' + p.hora.trim() + 'h' : '';
        const total    = typeof p.valorTotal === 'number' ? 'R$ ' + p.valorTotal.toFixed(2).replace('.', ',') : (p.valorTotal || '');
        const vPago    = parseFloat((p.valorPago || '').replace('R$','').replace(',','.').trim()) || 0;
        const itensResumo = (p.itens || []).map(i => `${i.quantidade}x ${i.sabor || i.nome}`).join(', ');
        const tipoLocal = p.tipoEntrega === 'entrega' ? 'entregues no endereço combinado' : 'disponíveis para retirada';
        const enderecoRetirada = 'Rua Martim Kochella, 350, AP D508 — Ilha da Figueira, Jaraguá do Sul';

        const templates = [
            {
                emoji: '⏰',
                label: 'Lembrete de entrega',
                preview: `Lembra o cliente do pedido para amanhã`,
                msg: `Olá, ${primeiroNome}! 🌸\n\nPassando para lembrar que seu pedido de brigadeiros está confirmado para *${dataBR}${horario}*.\n\n🍫 *Itens:* ${itensResumo}\n💰 *Total:* ${total}\n\nQualquer dúvida é só chamar! — *Doces Flor* 🌸`
            },
            {
                emoji: '✅',
                label: 'Pagamento confirmado',
                preview: `Confirma o recebimento do pagamento`,
                msg: `Olá, ${primeiroNome}! 🌸\n\nConfirmamos o recebimento do seu pagamento de *${vPago > 0 ? 'R$ ' + vPago.toFixed(2).replace('.', ',') : total}*. 💚\n\nSeu pedido está confirmado na nossa agenda para *${dataBR}${horario}*.\n\nObrigada pela confiança! — *Doces Flor* 🌸`
            },
            {
                emoji: '🍫',
                label: 'Pedido pronto',
                preview: `Avisa que os brigadeiros estão prontos`,
                msg: `Olá, ${primeiroNome}! 🌸\n\nSeus brigadeiros estão prontos e ${tipoLocal}! 🎉\n\n${p.tipoEntrega !== 'entrega' ? `📍 *Endereço para retirada:*\n${enderecoRetirada}\n\n` : ''}🍫 *Itens:* ${itensResumo}\n\nNos vemos em breve! — *Doces Flor* 🌸`
            }
        ];

        const overlay = document.createElement('div');
        overlay.className = 'modal-templates';
        overlay.id = 'modalTemplates';
        overlay.innerHTML = `
            <div class="modal-templates-box">
                <div class="modal-templates-titulo">
                    📋 Templates — ${primeiroNome}
                    <button onclick="fecharTemplates()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--brown-warm);line-height:1;">×</button>
                </div>
                ${templates.map((t, idx) => `
                    <button class="template-btn" onclick="dispararTemplate(${idx}, '${key}')">
                        <span class="template-btn-emoji">${t.emoji}</span>
                        <span class="template-btn-texto">
                            <span class="template-btn-label">${t.label}</span>
                            <span class="template-btn-preview">${t.preview}</span>
                        </span>
                        <span style="font-size:0.75rem;color:var(--amber);font-weight:700;white-space:nowrap;margin-top:2px;">Enviar →</span>
                    </button>
                `).join('')}
            </div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) fecharTemplates(); });
        document.body.appendChild(overlay);
        window._templatesData = { templates, p };
    });
}


function fecharTemplates() {
    const el = document.getElementById('modalTemplates');
    if (el) el.remove();
    window._templatesData = null;
}


function dispararTemplate(idx, key) {
    if (!window._templatesData) return;
    const { templates, p } = window._templatesData;
    const t = templates[idx];
    const telefone = (p.telefone || '').replace(/\D/g, '');
    const fone = telefone.startsWith('55') ? telefone : '55' + telefone;
    copiarParaClipboard(t.msg).then(() => toast('📋 Mensagem copiada!'));
    fecharTemplates();
    setTimeout(() => {
        window.open('https://wa.me/' + fone + '?text=' + encodeURIComponent(t.msg), '_blank');
    }, 400);
}


function enviarAvaliacaoWhatsApp(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val(); 
        if (!p) { toast('Pedido não encontrado.', 'erro'); return; }
        const primeiroNome = (p.nome || 'Cliente').split(' ')[0];
        const msg = `Olá, ${primeiroNome}! 🌸\n\nEsperamos que tenha gostado dos brigadeiros! 💛\n\nVocê poderia avaliar seu pedido? Leva só 30 segundos:\nhttps://docesflor.github.io/pedidos/avaliacao.html?pedido=${key}\n\nMuito obrigada! — *Doces Flor* 🌸`;
        const telefone = (p.telefone || '').replace(/\D/g, '');
        const fone = telefone.startsWith('55') ? telefone : '55' + telefone;
        copiarParaClipboard(msg).then(() => toast('📋 Mensagem copiada!'));
        setTimeout(() => {
            window.open('https://wa.me/' + fone + '?text=' + encodeURIComponent(msg), '_blank');
            // Marca a avaliação como enviada no Firebase
            database.ref('pedidos/' + key).update({ avaliacaoEnviada: true })
                .then(() => carregarFinalizados()); // Recarrega a lista de pedidos finalizados
        }, 400);
    });
}


function reenviarWhatsApp(key) {
    database.ref('pedidos/' + key).once('value', snapshot => {
        const p = snapshot.val(); if (!p) { toast('Pedido não encontrado.', 'erro'); return; }
        function abreviar(s) { return (s||'').replace('Chocolate Gourmet', 'Choc. Gourmet'); }
        let msg = `Pedidos - Doces Flor\n\n${p.nome||''}\n${formatarDataComDia(p.dataEntrega||'')}${p.hora && p.hora.trim() ? ' às ' + p.hora.trim() + 'h' : ''}\n`;
        if (p.tipoEntrega === 'entrega' && p.endereco) {
            const e = p.endereco;
            msg += `${e.logradouro}, ${e.numero}, ${e.bairro}\n`;
        } else {
            msg += `Retirada no local\n`;
        }
        msg += `──────────\n`;
        const itensP = p.itens || [];
        const primeiro = itensP[0] || {};
        const todosIguais = itensP.length > 1 && itensP.every(i => i.formato===primeiro.formato && i.tipoForma===primeiro.tipoForma && i.cor===primeiro.cor);
        if (itensP.length === 1) { msg += `${abreviar(primeiro.sabor)} - Qtd:${primeiro.quantidade}\n\nB: ${primeiro.formato} | F: ${primeiro.tipoForma}/${primeiro.cor}\n`; }
        else if (todosIguais) { itensP.forEach(i => msg += `${abreviar(i.sabor)} - Qtd:${i.quantidade}\n`); msg += `\nBrigadeiro: ${primeiro.formato}\nForma: ${primeiro.tipoForma}/${primeiro.cor}\n`; }
        else { itensP.forEach((i,idx) => { msg += `${abreviar(i.sabor)} - Qtd:${i.quantidade}\nB: ${i.formato} | F: ${i.tipoForma}/${i.cor}\n`; if (idx<itensP.length-1) msg+=`\n`; }); }
        msg += `──────────\n`;
        if (p.valorFrete > 0) { msg += `Brigadeiros: R$ ${(p.valorBrigadeiros||0).toFixed(2).replace('.',',')}\nFrete: R$ ${p.valorFrete.toFixed(2).replace('.',',')}\n`; }
        if (p.desconto > 0) msg += `Desconto: R$ ${p.desconto.toFixed(2).replace('.',',')}\n`;
        msg += `Valor Total: R$ ${(p.valorTotal||0).toFixed(2).replace('.',',')}\n\n`;
        const vTotalR = typeof p.valorTotal === 'number' ? p.valorTotal : 0;
        const vPagoR  = parseFloat((p.valorPago||'').replace('R$','').replace(',','.').trim()) || 0;
        const vFaltaR = Math.max(0, vTotalR - vPagoR);
        if (p.statusPagamento === 'Pago Parcialmente') {
            msg += `⚠️ Pago Parcialmente\n💚 Pago: R$ ${vPagoR.toFixed(2).replace('.', ',')}\n🔴 Falta: R$ ${vFaltaR.toFixed(2).replace('.', ',')}\n`;
        } else {
            msg += `Pagamento: ${p.statusPagamento||''}\n`;
        }
        if (p.observacoes) msg += `\nObs: ${p.observacoes}\n`;
        copiarParaClipboard(msg).then(ok => toast(ok ? '📋 Mensagem copiada!' : 'Erro ao copiar.', ok ? 'sucesso' : 'erro'));
    });
}


function copiarParaClipboard(texto) {
    return new Promise(resolve => {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(texto).then(() => resolve(true)).catch(() => fallbackCopy(texto, resolve)); }
        else { fallbackCopy(texto, resolve); }
    });
}

function fallbackCopy(texto, resolve) {
    const ta = document.createElement('textarea'); ta.value = texto;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { resolve(document.execCommand('copy')); } catch(e) { resolve(false); }
    document.body.removeChild(ta);
}

// ====================== FILTROS ======================

function imprimirComprovante(key) {
    database.ref('pedidos/'+key).once('value',snapshot=>{
        const p = snapshot.val();
        if(!p){toast('Pedido não encontrado.','erro');return;}
        const dataBr = formatarDataComDia(p.dataEntrega || p.data || '');
        const horario = p.hora||'';
        const enderecoRetirada = `
            <div style="margin:10px 0 8px 0;padding:12px;background:#FDF8F0;border-radius:8px;border:1px solid #E8943A;font-size:13px;">
                <strong>🏠 Retirada em:</strong><br>
                Residencial Gran Valle<br>
                Rua Martim Kochella, 350, AP D508 - Ilha da Figueira,<br>
                Jaraguá do Sul - SC, 89258-680
            </div>`;
        let enderecoHTML = '', tipoHTML = '';
        if(p.tipoEntrega === 'entrega' && p.endereco){
            tipoHTML = '';
            enderecoHTML = `<div style="margin:10px 0 8px 0;padding:12px;background:#FDF8F0;border-radius:8px;border:1px solid #E8943A;font-size:13px;"><strong>🚚 Entrega em:</strong><br>${escaparHTML(p.endereco.logradouro)}, ${escaparHTML(p.endereco.numero)}<br>${escaparHTML(p.endereco.bairro)}, ${escaparHTML(p.endereco.cidade)}</div>`;
        } else {
            tipoHTML = '';
            enderecoHTML = enderecoRetirada;
        }
        let itensHTML = '';
        if(p.itens && Array.isArray(p.itens)){
            const qtdTrad    = p.itens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'trad').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
            const qtdFrutas  = p.itens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'frutas').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
            const qtdGourmet = p.itens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === 'gourmet').reduce((s,i) => s+(parseInt(i.quantidade)||0), 0);
            const precoTradAuto    = precoUnitarioPorFaixa('trad', qtdTrad);
            const precoFrutasAuto  = precoUnitarioPorFaixa('frutas', qtdFrutas);
            const precoGourmetAuto = precoUnitarioPorFaixa('gourmet', qtdGourmet);
            const gruposComp = [
                { cat:'trad',    label:'🍫 Tradicionais', precoAuto:precoTradAuto    },
                { cat:'frutas',  label:'🍓 Frutas',        precoAuto:precoFrutasAuto  },
                { cat:'gourmet', label:'✨ Gourmet',        precoAuto:precoGourmetAuto }
            ];
            gruposComp.forEach(grupo => {
                const itensCat = p.itens.filter(i => (CATEGORIA_SABOR[i.sabor||i.nome]||'trad') === grupo.cat);
                if (itensCat.length === 0) return;
                itensHTML += `<tr><td colspan="4" style="padding:7px 6px;background:#FEF3C7;font-weight:700;color:#92400E;font-size:12px;">${grupo.label}</td></tr>`;
                itensCat.forEach(item => {
                    const qtd = parseInt(item.quantidade)||0;
                    const preco = item.precoManual !== undefined ? item.precoManual : grupo.precoAuto;
                    const subtotal = (qtd * preco).toFixed(2).replace('.',',');
                    itensHTML += `<tr><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;font-size:12.5px;">${escaparHTML(item.sabor||item.nome)}</td><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;text-align:center;font-size:12.5px;">${qtd}</td><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;text-align:center;font-size:11.5px;color:#5C2A0E;">${item.formato||''}</td><td style="padding:6px 4px;border-bottom:1px solid #F0E6D3;text-align:right;font-size:12.5px;font-weight:600;">R$ ${subtotal}</td></tr>`;
                });
            });
        }
        const valorTotal = typeof p.valorTotal==='number' ? 'R$ '+p.valorTotal.toFixed(2).replace('.',',') : (p.valorTotal||'R$ 0,00');
        const emojiStatus = p.statusPagamento==='Pago'?'✅':p.statusPagamento==='Pago Parcialmente'?'⚠️':'🔴';
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:-9999px;left:0;z-index:-1;background:white;';
        container.innerHTML = `
            <div id="comprovante-conteudo" style="width:480px;background:#ffffff;padding:20px 22px;font-family:'DM Sans',Arial,sans-serif;line-height:1.35;">
                <div style="text-align:center;margin-bottom:10px;"><img src="https://docesflor.github.io/shared/icone.png" style="width:220px;height:220px;border-radius:50%;border:3px solid #E8943A;" alt="Doces Flor"></div>
                <div style="text-align:center;margin-bottom:16px;">
                    <p style="margin:0;font-size:13px;color:#5C2A0E;">"Feito com amor, entregue com carinho ♥"</p>
                </div>
                <div style="background:#FDF8F0;border:1px solid #E8943A;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;">
                    <div><strong>Cliente:</strong> ${escaparHTML(p.nome||'---')}</div>
                    <div><strong>Telefone:</strong> ${escaparHTML(p.telefone||'---')}</div>
                    <div><strong>Data:</strong> ${escaparHTML(dataBr)}${horario && horario.trim() ? ' às ' + escaparHTML(horario.trim()) + 'h' : ''}</div>
                    ${tipoHTML}
                </div>
                ${enderecoHTML}
                <table style="width:100%;border-collapse:collapse;margin:16px 0 14px 0;">
                    <thead>
                        <tr style="background:#2B1206;">
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:left;">Sabor</th>
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:center;">Qtd</th>
                            <th style="color:#F5B563;padding:8px 6px;font-size:11px;text-align:center;">Formato</th>
                            <th style="color:#F5B563;padding:8px 6px;font-size:11.5px;text-align:right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>${itensHTML}</tbody>
                </table>
                <div style="background:#FDF8F0;border:1px solid #E8943A;border-radius:10px;padding:14px 16px;">
                    <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13.5px;">
                        <span>Brigadeiros</span>
                        <span>${typeof p.valorBrigadeiros==='number'?'R$ '+p.valorBrigadeiros.toFixed(2).replace('.',','):'---'}</span>
                    </div>
                    ${(p.valorFrete||0)>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13.5px;"><span>Frete</span><span>R$ ${p.valorFrete.toFixed(2).replace('.',',')}</span></div>`:''}
                    ${(p.desconto||0)>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13.5px;color:#C9522A;"><span>Desconto</span><span>- R$ ${p.desconto.toFixed(2).replace('.',',')}</span></div>`:''}
                    <div style="border-top:2px solid #E8943A;margin:12px 0 4px 0;padding-top:10px;display:flex;justify-content:space-between;font-size:17px;font-weight:700;color:#2B1206;">
                        <span>TOTAL A PAGAR</span>
                        <span>${valorTotal}</span>
                    </div>
                </div>
                <div style="text-align:center;margin:16px 0 12px;padding:10px;background:#F0E6D3;border-radius:10px;font-size:14px;font-weight:600;">
                    ${emojiStatus} ${escaparHTML(p.statusPagamento||'A pagar')}
                    ${p.statusPagamento==='Pago Parcialmente'?`: ${escaparHTML(p.valorPago||'R$ 0,00')}`:''}
                </div>
                ${p.observacoes?`<div style="font-size:12.5px;padding:10px 12px;background:#FDF8F0;border-left:4px solid #E8943A;border-radius:8px;"><strong>Obs:</strong> ${escaparHTML(p.observacoes)}</div>`:''}
                <div style="text-align:center;margin-top:18px;font-size:11.5px;color:#8B4513;">
                    Doces Flor • (47) 9 9274-5896<br>
                    Obrigado pela preferência! 💛
                </div>
            </div>`;

        document.body.appendChild(container);

        // Modal de PREVIEW — mostra o comprovante na tela antes de gerar/enviar
        container.style.display = 'none';
        const overlayPreview = document.createElement('div');
        overlayPreview.className = 'modal-overlay';
        overlayPreview.id = 'modalPreviewComprovante';
        overlayPreview.style.cssText = 'align-items:flex-start;overflow-x:hidden;overflow-y:auto;padding:24px 12px;';
        const boxPreview = document.createElement('div');
        boxPreview.className = 'modal-box';
        boxPreview.style.cssText = 'max-width:520px;width:94vw;padding:16px;box-sizing:border-box;';
        boxPreview.innerHTML = `<p style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:var(--brown-dark);margin-bottom:10px;text-align:center;">🧾 Confira antes de enviar</p>`;
        const conteudoPreview = document.getElementById('comprovante-conteudo');
        conteudoPreview.style.cssText += 'margin:0 auto;';
        const wrapperPreview = document.createElement('div');
        wrapperPreview.style.cssText = 'width:100%;overflow:hidden;display:flex;justify-content:center;';
        wrapperPreview.appendChild(conteudoPreview);
        boxPreview.appendChild(wrapperPreview);
        const botoesPreview = document.createElement('div');
        botoesPreview.className = 'modal-botoes';
        botoesPreview.style.marginTop = '14px';
        botoesPreview.innerHTML = `
            <button class="btn btn-cinza" onclick="document.getElementById('modalPreviewComprovante').remove()">✏️ Fechar</button>
            <button class="btn btn-verde" id="btnConfirmarComprovante">🖨️ Confirmar e Enviar</button>`;
        boxPreview.appendChild(botoesPreview);
        overlayPreview.appendChild(boxPreview);
        document.body.appendChild(overlayPreview);

        // Encolhe o comprovante (480px fixos) pra caber na largura do celular
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

        document.getElementById('btnConfirmarComprovante').addEventListener('click', function() {
            this.disabled = true;
            this.textContent = '⏳ Gerando...';
            conteudoPreview.style.transform = ''; // remove o scale do preview antes de gerar a imagem real
            container.appendChild(conteudoPreview); // devolve o comprovante pro container antes de remover o modal
            overlayPreview.remove();
            container.style.cssText = 'position:fixed;top:-9999px;left:0;z-index:-1;background:white;'; // restaura posição off-screen (o html2canvas precisa disso)
            document.body.appendChild(container);
            gerarEEnviarComprovante(p, key, dataBr, horario, container);
        });
    });
}

// ====================== GERAR + ENVIAR COMPROVANTE (após confirmação no preview) ======================
function gerarEEnviarComprovante(p, key, dataBr, horario, container) {
    const el = document.getElementById('comprovante-conteudo');
    toast('⏳ Gerando comprovante...', 'aviso');

    setTimeout(() => {
        html2canvas(el, { scale: 2.0, backgroundColor: '#ffffff' }).then(canvas => {

            // 1. Baixar a imagem
            const link = document.createElement('a');
            link.download = 'comprovante-' + key.substr(-6) + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            // 2. Tentar copiar imagem para clipboard (opcional)
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                } catch (e) {}
            }, 'image/png');

            const telefone = (p.telefone || '').replace(/\D/g, '');
            const foneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;

            // Mensagem para WhatsApp
            const vTotalWpp = typeof p.valorTotal === 'number' ? p.valorTotal : 0;
            const vPagoWpp  = parseFloat((p.valorPago || '').replace('R$','').replace(',','.').trim()) || 0;
            const vFaltaWpp = Math.max(0, vTotalWpp - vPagoWpp);

            const blocoPagemento = p.statusPagamento === 'Pago Parcialmente'
                ? `⚠️ *Pago Parcialmente*\n💚 Pago: R$ ${vPagoWpp.toFixed(2).replace('.', ',')}\n🔴 Falta: R$ ${vFaltaWpp.toFixed(2).replace('.', ',')}`
                : `💳 *Pagamento:* ${p.statusPagamento || 'A pagar'}`;

            let mensagem =
`🌸 *Doces Flor — Comprovante*

👤 *Cliente:* ${p.nome || '---'}
📅 *Data:* ${dataBr}${horario ? ' às ' + horario : ''}

💰 *Total:* R$ ${vTotalWpp.toFixed(2).replace('.', ',')}
${blocoPagemento}`;

            if (p.observacoes && p.observacoes.trim()) {
                mensagem += `\n\n📝 *Obs:* ${p.observacoes.trim()}`;
            }

            const urlWpp = `https://wa.me/${foneFormatado}?text=${encodeURIComponent(mensagem)}`;

            container.remove();

            toast('✅ Comprovante baixado! Abrindo WhatsApp...', 'sucesso');

            setTimeout(() => {
                window.location.href = urlWpp;
                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        window.open(urlWpp, '_self');
                    }
                }, 600);
            }, 700);

        }).catch(() => {
            container.remove();
            toast('Erro ao gerar imagem.', 'erro');
        });
    }, 600);
}

// ====================== EVENTOS / BLOQUEIOS ======================
