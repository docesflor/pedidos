/* ═══════════════════════════════════════════
   PEDIDOS — GASTOS, INSUMOS, COMPRAS E RECEITAS
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

let _insumoEditandoKey = null;
let ingredientesReceita = [];
let _receitaEditandoKey = null;

function atualizarDescricaoGasto() {
  const categoria = document.getElementById('gastoCategoria').value;
  const select    = document.getElementById('gastoDescricao');
  const opcoes = (DADOS_PEDIDOS && DADOS_PEDIDOS.gastos && DADOS_PEDIDOS.gastos[categoria])
      || (window.CATALOGO_DOCES_FLOR && window.CATALOGO_DOCES_FLOR.gastos && window.CATALOGO_DOCES_FLOR.gastos[categoria])
      || [];
    select.innerHTML = '<option value="">Selecione uma opção</option>';
    [...opcoes].sort((a,b) => a.localeCompare(b,'pt-BR')).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item; opt.textContent = item;
        select.appendChild(opt);
    });
}


function salvarGasto() {
    const data=document.getElementById('gastoData').value;
    const categoria=document.getElementById('gastoCategoria').value;
    const descricao=document.getElementById('gastoDescricao').value.trim();
    const quantidade=parseInt(document.getElementById('gastoQuantidade').value)||1;
    const valorRaw=document.getElementById('gastoValor').value;
    const valor=parseFloat(valorRaw.replace('R$','').replace(',','.').trim())||0;
    if(!data){toast('Informe a data.','erro');return;}
    if(!categoria){toast('Selecione uma categoria.','erro');return;}
    if(!descricao){toast('Informe a descrição.','erro');return;}
    if(valor<=0){toast('Informe um valor válido.','erro');return;}
    const gasto={data,categoria,descricao,quantidade,valor,timestamp:Date.now()};
    const btn=document.getElementById('btnSalvarGasto'); btn.textContent='Salvando...'; btn.disabled=true;
    database.ref('gastos').push(gasto).then(()=>{
        toast('✅ Gasto salvo!');
        document.getElementById('gastoData').value='';
        document.getElementById('gastoCategoria').value='';
        document.getElementById('gastoDescricao').innerHTML='<option value="">Selecione uma opção</option>';
        document.getElementById('gastoQuantidade').value='';
        document.getElementById('gastoValor').value='';
        btn.textContent='💾 Salvar Gasto'; btn.disabled=false; carregarGastos();
    }).catch(err=>{toast('Erro: '+err.message,'erro');btn.textContent='💾 Salvar Gasto';btn.disabled=false;});
}


function carregarGastos() {
    const lista=document.getElementById('lista-gastos');
    const resumo=document.getElementById('gastoResumo');
    const mesVal=document.getElementById('gastoFiltroMes').value;
    const ano=parseInt(document.getElementById('gastoFiltroAno').value);
    lista.innerHTML='<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('gastos').once('value',snapshot=>{
        const gastos=[];
        snapshot.forEach(child=>{
            const g=child.val(); g.key=child.key;
            if(mesVal!=='todos'){const mes=parseInt(mesVal);let dataG;if(/^\d{4}-\d{2}-\d{2}$/.test(g.data)){const pts=g.data.split('-');dataG=new Date(pts[0],pts[1]-1,pts[2]);}else return;if(dataG.getFullYear()!==ano||dataG.getMonth()!==mes)return;}
            gastos.push(g);
        });
        gastos.sort((a,b)=>new Date(b.data)-new Date(a.data));
        if(gastos.length===0){lista.innerHTML='<p style="color:var(--brown-warm);">Nenhum gasto para este período.</p>';resumo.style.display='none';return;}
        let total=0; lista.innerHTML='';
        gastos.forEach(g=>{total+=g.valor||0;lista.appendChild(criarCardGasto(g));});
        document.getElementById('gastoTotalPeriodo').textContent='R$ '+total.toFixed(2).replace('.',',');
        resumo.style.display='block';
    });
}


function criarCardGasto(g) {
    const div=document.createElement('div'); div.className='gasto-item';
    const dataFormatada=g.data?g.data.split('-').reverse().join('/'):'N/A';
    const valorFormatado='R$ '+(g.valor||0).toFixed(2).replace('.',',');
    const info=document.createElement('div'); info.className='gasto-info';
    const cat=document.createElement('span'); cat.className='gasto-categoria'; cat.textContent=g.categoria||'Outros';
    const desc=document.createElement('p'); const descStrong=document.createElement('strong'); descStrong.textContent=g.descricao||'Sem descrição'; desc.appendChild(descStrong);
    const det=document.createElement('p'); det.textContent=`📅 ${dataFormatada} | Qtd: ${g.quantidade||1} | ${valorFormatado}`;
    info.appendChild(cat); info.appendChild(desc); info.appendChild(det);
    const btnExcluir=document.createElement('button'); btnExcluir.className='btn-remove'; btnExcluir.textContent='Excluir'; btnExcluir.onclick=()=>excluirGasto(g.key);
    div.appendChild(info); div.appendChild(btnExcluir); return div;
}


function excluirGasto(key) {
    showConfirmModal('Excluir este gasto?',()=>database.ref('gastos/'+key).remove().then(()=>{toast('🗑️ Gasto excluído.');carregarGastos();}).catch(err=>toast('Erro: '+err.message,'erro')));
}

// ====================== EXPORTAR CSV ======================


function mostrarAbaGastos(aba, btn) {
    document.querySelectorAll('.custos-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.getElementById('aba-gastos').style.display   = 'none';
    document.getElementById('aba-insumos').style.display  = 'none';
    document.getElementById('aba-compras').style.display  = 'none';
    document.getElementById('aba-receitas').style.display = 'none';

    if (aba === 'gastos') {
        document.getElementById('aba-gastos').style.display = 'block';
    } else if (aba === 'insumos') {
        document.getElementById('aba-insumos').style.display = 'block';
        carregarInsumos();
        carregarAlertasInsumos();
    } else if (aba === 'compras') {
        document.getElementById('aba-compras').style.display = 'block';
        carregarInsumos(); // popula o dropdown de insumos da compra
        calcularPrevisaoCompra(15, document.getElementById('chipPrevisao15'));
        const campoData = document.getElementById('compraData');
        if (campoData && !campoData.value) {
            const hoje = new Date();
            campoData.value = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');
        }
    } else if (aba === 'receitas') {
        document.getElementById('aba-receitas').style.display = 'block';
        carregarReceitasLista();
        popularSelectReceitaSabor();
        popularSelectInsumos();
    }
}

// ====================== INSUMOS ======================

function toggleNomeEmbalagem() {
    const unidade = document.getElementById('insumoUnidade').value;
    const wrapper = document.getElementById('wrapperNomeEmbalagem');
    wrapper.style.display = unidade === 'un' ? 'none' : 'block';
    if (unidade === 'un') document.getElementById('insumoNomeEmbalagem').value = '';
    atualizarDicaEstoqueEmbalagem();
}


function atualizarDicaEstoqueEmbalagem() {
    const nomeEmb = document.getElementById('insumoNomeEmbalagem').value.trim();
    const qtd     = parseFloat(document.getElementById('insumoQtd').value) || 0;
    const labelAtual  = document.getElementById('labelEstoqueAtual');
    const labelMinimo = document.getElementById('labelEstoqueMinimo');
    const dica = document.getElementById('dicaEstoqueEmbalagem');
    const campoAtual = document.getElementById('insumoEstoqueAtual');
    const campoMinimo = document.getElementById('insumoEstoqueMinimo');
    if (nomeEmb) {
        labelAtual.textContent  = `Estoque Atual (em ${nomeEmb}s)`;
        labelMinimo.textContent = `Estoque Mínimo (em ${nomeEmb}s)`;
        campoAtual.placeholder  = 'Ex: 27';
        campoMinimo.placeholder = 'Ex: 5';
        if (qtd > 0) {
            dica.style.display = 'block';
            dica.textContent = `💡 Cada ${nomeEmb} tem ${qtd}${document.getElementById('insumoUnidade').value}. Informe aqui a quantidade de ${nomeEmb}s, não o peso.`;
        } else { dica.style.display = 'none'; }
    } else {
        labelAtual.textContent  = 'Estoque Atual';
        labelMinimo.textContent = 'Estoque Mínimo (alerta)';
        campoAtual.placeholder  = 'Ex: 3950';
        campoMinimo.placeholder = 'Ex: 800';
        dica.style.display = 'none';
    }
}


function salvarInsumo() {
    const nome     = document.getElementById('insumoNome').value.trim();
    const precoRaw = document.getElementById('insumoPreco').value;
    const preco    = parseFloat(precoRaw.replace('R$','').replace(',','.').trim()) || 0;
    const unidade  = document.getElementById('insumoUnidade').value;
    const qtd      = parseFloat(document.getElementById('insumoQtd').value) || 1;
    const nomeEmbalagem = document.getElementById('insumoNomeEmbalagem').value.trim();
    const estoqueAtualInput  = parseFloat(document.getElementById('insumoEstoqueAtual').value) || 0;
    const estoqueMinimoInput = parseFloat(document.getElementById('insumoEstoqueMinimo').value) || 0;

    if (!nome)    { toast('❌ Informe o nome do insumo.', 'erro'); return; }
    if (preco<=0) { toast('❌ Informe um preço válido.', 'erro'); return; }
    if (qtd<=0)   { toast('❌ Informe a quantidade por embalagem.', 'erro'); return; }

    // Se tem nome de embalagem, o que foi digitado é em "caixinhas" — converte para a unidade base (g/ml)
    const estoqueAtual  = nomeEmbalagem ? estoqueAtualInput  * qtd : estoqueAtualInput;
    const estoqueMinimo = nomeEmbalagem ? estoqueMinimoInput * qtd : estoqueMinimoInput;

    const insumo = { nome, preco, unidade, qtdEmbalagem: qtd, nomeEmbalagem, estoqueAtual, estoqueMinimo, timestamp: Date.now() };
    database.ref('insumos').push(insumo).then(() => {
        toast('✅ Insumo salvo!');
        document.getElementById('insumoNome').value  = '';
        document.getElementById('insumoPreco').value = '';
        document.getElementById('insumoQtd').value   = '';
        document.getElementById('insumoNomeEmbalagem').value = '';
        document.getElementById('insumoEstoqueAtual').value = '';
        document.getElementById('insumoEstoqueMinimo').value = '';
        atualizarDicaEstoqueEmbalagem();
        carregarInsumos();
    }).catch(err => toast('❌ Erro: ' + err.message, 'erro'));
}


async function calcularConsumoMedioSemanal(diasHistorico = 60) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const inicio = new Date(hoje); inicio.setDate(inicio.getDate() - diasHistorico);

    const [snapPedidos, snapReceitas] = await Promise.all([
        database.ref('pedidos').once('value'),
        database.ref('receitas').once('value')
    ]);
    const receitasMap = {};
    snapReceitas.forEach(child => { receitasMap[child.val().sabor] = child.val(); });

    const consumoTotal = {};
    snapPedidos.forEach(child => {
        const p = child.val();
        if (!p.dataEntrega) return;
        let dataP;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
        else return;
        if (dataP < inicio || dataP > hoje) return;
        (p.itens || []).forEach(item => {
            const receita = receitasMap[item.sabor || item.nome];
            if (!receita || !receita.ingredientes) return;
            const fator = (parseInt(item.quantidade) || 0) / receita.rendimento;
            receita.ingredientes.forEach(ing => {
                consumoTotal[ing.insumoKey] = (consumoTotal[ing.insumoKey] || 0) + (ing.qtdReceita * fator);
            });
        });
    });

    const semanas = diasHistorico / 7;
    const consumoSemanal = {};
    Object.entries(consumoTotal).forEach(([key, total]) => { consumoSemanal[key] = total / semanas; });
    return consumoSemanal;
}

function irComprarInsumoSugerido(key, qtdSugerida) {
    mostrarAbaGastos('compras', document.getElementById('custosTabCompras'));
    setTimeout(() => {
        const sel = document.getElementById('compraInsumoSel');
        if (sel) { sel.value = key; atualizarInfoCompraInsumo(); }
        const campoQtd = document.getElementById('compraQtd');
        if (campoQtd) campoQtd.value = qtdSugerida;
        calcularPreviewCompra();
    }, 150);
}

async function carregarInsumos() {
    const lista = document.getElementById('lista-insumos');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    const consumoSemanal = await calcularConsumoMedioSemanal();
    database.ref('insumos').once('value', snapshot => {
        const insumos = [];
        snapshot.forEach(child => { const i = child.val(); i.key = child.key; insumos.push(i); });
        insumos.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        popularSelectCompraInsumo(insumos);
        if (insumos.length === 0) {
            lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum insumo cadastrado ainda.</p>';
            return;
        }
        lista.innerHTML = '';
        insumos.forEach(i => {
            const precoPorUnidade = 'R$ ' + (i.preco / i.qtdEmbalagem).toFixed(4).replace('.', ',') + '/' + (i.unidade === 'un' ? 'un' : i.unidade);
            const estoqueAtual  = i.estoqueAtual || 0;
            const estoqueMinimo = i.estoqueMinimo || 0;
            const alerta = estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo;
            const temEmbalagem = !!i.nomeEmbalagem;

            let estoqueLinha, estoqueMinimoTexto, placeholderEntrada;
            if (temEmbalagem) {
                const embalagens = i.estoqueAtual / i.qtdEmbalagem;
                const embalagensMin = i.estoqueMinimo ? (i.estoqueMinimo / i.qtdEmbalagem) : 0;
                const embFormatado = Number.isInteger(embalagens) ? embalagens : embalagens.toFixed(1);
                estoqueLinha = `${embFormatado} ${i.nomeEmbalagem}${embalagens === 1 ? '' : 's'}`;
                estoqueMinimoTexto = embalagensMin > 0 ? ` (mín: ${embalagensMin} ${i.nomeEmbalagem}s)` : '';
                placeholderEntrada = `${i.nomeEmbalagem}s a adicionar`;
            } else {
                estoqueLinha = `${estoqueAtual}${i.unidade !== 'un' ? i.unidade : ' un'}`;
                estoqueMinimoTexto = estoqueMinimo > 0 ? ` (mín: ${estoqueMinimo}${i.unidade})` : '';
                placeholderEntrada = 'Qtd a adicionar';
            }

            let sugestaoHTML = '';
            if (alerta) {
                const consumoUn = consumoSemanal[i.key] || 0;
                if (consumoUn > 0) {
                    const semanasCobertura = 3;
                    const qtdSugeridaBase = Math.max(0, (consumoUn * semanasCobertura) - estoqueAtual);
                    if (qtdSugeridaBase > 0) {
                        const qtdSugeridaEmb = temEmbalagem ? Math.ceil(qtdSugeridaBase / i.qtdEmbalagem) : Math.ceil(qtdSugeridaBase);
                        const labelSugestao = temEmbalagem
                            ? `${qtdSugeridaEmb} ${i.nomeEmbalagem}${qtdSugeridaEmb > 1 ? 's' : ''}`
                            : `${qtdSugeridaEmb}${i.unidade !== 'un' ? i.unidade : ' un'}`;
                        sugestaoHTML = `<div class="insumo-sugestao">
                            💡 Sugestão: comprar <strong>${labelSugestao}</strong>
                            <span style="opacity:0.75;">(consumo médio: ${consumoUn.toFixed(0)}${i.unidade !== 'un' ? i.unidade : ' un'}/semana)</span>
                            <button class="btn-sugestao-comprar" onclick="irComprarInsumoSugerido('${i.key}', ${qtdSugeridaEmb})">🛒 Comprar</button>
                        </div>`;
                    }
                }
            }

            const div = document.createElement('div');
            div.className = 'insumo-card';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'stretch';
            if (alerta) div.style.border = '2px solid #DC2626';
            div.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;">
                    <div class="insumo-info">
                        <div class="insumo-nome">${escaparHTML(i.nome)} ${alerta ? '<span style="background:#FEE2E2;color:#DC2626;border-radius:50px;padding:2px 10px;font-size:0.7em;font-weight:700;margin-left:6px;">⚠️ ACABANDO</span>' : ''}</div>
                        <div class="insumo-detalhe">
                            R$ ${i.preco.toFixed(2).replace('.',',')} 
                            ${i.unidade !== 'un' ? '/ ' + i.qtdEmbalagem + i.unidade : '/un'}
                            &nbsp;·&nbsp; <strong>${precoPorUnidade}</strong>
                        </div>
                        <div class="insumo-detalhe" style="margin-top:4px;font-weight:700;color:${alerta ? '#DC2626' : 'var(--brown-dark)'};">
                            📦 Estoque: ${estoqueLinha}${estoqueMinimoTexto}
                        </div>
                        ${sugestaoHTML}
                    </div>
                    <button class="btn-remove" onclick="excluirInsumo('${i.key}')">Excluir</button>
                </div>
                <div style="display:flex;gap:6px;margin-top:10px;">
                    <input type="number" id="entrada-${i.key}" placeholder="${placeholderEntrada}" style="margin-bottom:0;flex:1;font-size:0.85em;padding:8px 12px;">
                    <button class="btn btn-verde" style="padding:8px 14px;font-size:0.8em;white-space:nowrap;" onclick="darEntradaEstoque('${i.key}')">➕ Entrada</button>
                    <button class="btn btn-amarelo" style="padding:8px 14px;font-size:0.8em;white-space:nowrap;" onclick="abrirEdicaoInsumo('${i.key}')">✏️ Editar</button>
                </div>
                <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="btn btn-cinza btn-bloco" style="padding:7px;font-size:0.78em;" onclick="verHistoricoPreco('${i.key}','${escaparHTML(i.nome).replace(/'/g,"\\'")}')">📈 Histórico de Preço</button>
                </div>`;
            lista.appendChild(div);
        });
        filtrarInsumosPorNome();
    });
}


function filtrarInsumosPorNome() {
    const campoBusca = document.getElementById('buscaInsumos');
    if (!campoBusca) return;
    const termo = campoBusca.value.toLowerCase().trim();
    document.querySelectorAll('#lista-insumos .insumo-card').forEach(card => {
        const nome = card.querySelector('.insumo-nome');
        if (!nome) return;
        card.style.display = (!termo || nome.textContent.toLowerCase().includes(termo)) ? '' : 'none';
    });
}


async function carregarAlertasInsumos() {
    const container = document.getElementById('alertasInsumos');
    if (!container) return;
    container.innerHTML = '';

    // ── Sabores sem receita cadastrada ──
    const [snapReceitas, snapGastos] = await Promise.all([
        database.ref('receitas').once('value'),
        database.ref('gastos').once('value')
    ]);
    const saboresComReceita = new Set();
    snapReceitas.forEach(child => saboresComReceita.add(child.val().sabor));
    const todosSabores = [
        ...(DADOS_PEDIDOS?.sabores?.trads    || []),
        ...(DADOS_PEDIDOS?.sabores?.gourmets || []),
        ...(DADOS_PEDIDOS?.sabores?.frutas   || [])
    ];
    const semReceita = todosSabores.filter(s => !saboresComReceita.has(s));

    if (semReceita.length > 0) {
        const div = document.createElement('div');
        div.className = 'form-card';
        div.style.cssText = 'border:1.5px solid #FCA5A5;background:#FEF2F2;margin-bottom:14px;';
        div.innerHTML = `<p style="font-weight:700;color:#DC2626;font-size:0.9em;margin-bottom:8px;">⚠️ ${semReceita.length} sabor${semReceita.length>1?'es':''} sem receita cadastrada</p>
            <p style="font-size:0.8em;color:var(--brown-warm);line-height:1.6;">${semReceita.join(', ')}</p>
            <p style="font-size:0.76em;color:var(--brown-warm);margin-top:8px;">Sem receita, o custo de produção desses sabores não entra no dashboard.</p>`;
        container.appendChild(div);
    }

    // ── Insumos parados (sem compra há mais de 90 dias, ou nunca comprados) ──
    const gastosPorDescricao = {};
    snapGastos.forEach(child => {
        const g = child.val();
        if (!g.descricao || !g.data) return;
        if (!gastosPorDescricao[g.descricao] || g.data > gastosPorDescricao[g.descricao]) {
            gastosPorDescricao[g.descricao] = g.data;
        }
    });
    const DIAS_LIMITE_PARADO = 90; // ajuste aqui se quiser um período diferente
    const snapInsumos = await database.ref('insumos').once('value');
    const hoje = new Date();
    const parados = [];
    snapInsumos.forEach(child => {
        const i = child.val();
        const ultimaData = gastosPorDescricao[i.nome];
        // Insumos nunca comprados (ex: forminha de cor rara) não entram no alerta —
        // só avisamos quando existe um histórico de uso que parou.
        if (!ultimaData) return;
        const dataCompra = new Date(ultimaData + 'T00:00:00');
        const dias = Math.round((hoje - dataCompra) / 86400000);
        if (dias > DIAS_LIMITE_PARADO) parados.push({ nome: i.nome, dias });
    });

    if (parados.length > 0) {
        const div = document.createElement('div');
        div.className = 'form-card';
        div.style.cssText = 'border:1.5px solid #FDE68A;background:#FFFBEB;margin-bottom:14px;';
        const itensHTML = parados.map(p => `<div style="font-size:0.82em;padding:4px 0;">${escaparHTML(p.nome)} <span style="color:var(--brown-warm);">(${p.dias} dias sem compra)</span></div>`).join('');
        div.innerHTML = `<p style="font-weight:700;color:#92400E;font-size:0.9em;margin-bottom:8px;">🕰️ ${parados.length} insumo${parados.length>1?'s':''} parado${parados.length>1?'s':''}</p>${itensHTML}`;
        container.appendChild(div);
    }

    // ── Insumos usados em receitas mas sem estoque mínimo definido ──
    const insumosUsadosEmReceitas = new Set();
    snapReceitas.forEach(child => {
        const r = child.val();
        (r.ingredientes || []).forEach(ing => insumosUsadosEmReceitas.add(ing.insumoKey));
    });
    const semEstoqueMinimo = [];
    snapInsumos.forEach(child => {
        const i = child.val();
        if (insumosUsadosEmReceitas.has(child.key) && !(i.estoqueMinimo > 0)) {
            semEstoqueMinimo.push(i.nome);
        }
    });
    if (semEstoqueMinimo.length > 0) {
        const div = document.createElement('div');
        div.className = 'form-card';
        div.style.cssText = 'border:1.5px solid #FCA5A5;background:#FEF2F2;margin-bottom:14px;';
        div.innerHTML = `<p style="font-weight:700;color:#DC2626;font-size:0.9em;margin-bottom:8px;">⚠️ ${semEstoqueMinimo.length} insumo${semEstoqueMinimo.length>1?'s':''} usado${semEstoqueMinimo.length>1?'s':''} em receita sem estoque mínimo definido</p>
            <p style="font-size:0.8em;color:var(--brown-warm);line-height:1.6;">${semEstoqueMinimo.map(n=>escaparHTML(n)).join(', ')}</p>
            <p style="font-size:0.76em;color:var(--brown-warm);margin-top:8px;">Sem estoque mínimo, você não recebe alerta de "acabando" para esses insumos. Edite-os na lista de insumos.</p>`;
        container.appendChild(div);
    }
}


function darEntradaEstoque(key) {
    const input = document.getElementById('entrada-' + key);
    const qtdAdicionar = parseFloat(input.value) || 0;
    if (qtdAdicionar <= 0) { toast('❌ Informe uma quantidade válida.', 'erro'); return; }
    database.ref('insumos/' + key).once('value', snap => {
        const i = snap.val();
        // Se o insumo é controlado por embalagem, o número digitado é em "caixinhas" — converte pra unidade base
        const qtdBase = i.nomeEmbalagem ? qtdAdicionar * i.qtdEmbalagem : qtdAdicionar;
        const novoEstoque = (i.estoqueAtual || 0) + qtdBase;
        database.ref('insumos/' + key).update({ estoqueAtual: novoEstoque }).then(() => {
            toast('✅ Estoque atualizado: +' + qtdAdicionar + (i.nomeEmbalagem ? ' ' + i.nomeEmbalagem + '(s)' : ''));
            carregarInsumos();
        });
    });
}



function abrirEdicaoInsumo(key) {
    database.ref('insumos/' + key).once('value', snap => {
        const i = snap.val();
        if (!i) { toast('❌ Insumo não encontrado.', 'erro'); return; }
        _insumoEditandoKey = key;
        const nomeEmb = i.nomeEmbalagem || '';
        const qtdEmb  = i.qtdEmbalagem || 1;
        document.getElementById('editInsumoNome').value = i.nome || '';
        document.getElementById('editInsumoPreco').value = 'R$ ' + (i.preco || 0).toFixed(2).replace('.', ',');
        document.getElementById('editInsumoUnidade').value = i.unidade || 'un';
        document.getElementById('editInsumoQtd').value = i.qtdEmbalagem || '';
        document.getElementById('editInsumoNomeEmbalagem').value = nomeEmb;
        document.getElementById('editInsumoEstoqueAtual').value  = nomeEmb ? (i.estoqueAtual  || 0) / qtdEmb : (i.estoqueAtual  || 0);
        document.getElementById('editInsumoEstoqueMinimo').value = nomeEmb ? (i.estoqueMinimo || 0) / qtdEmb : (i.estoqueMinimo || 0);
        toggleNomeEmbalagemEdicao();
        document.getElementById('modalEditarInsumo').style.display = 'flex';
    });
}


function toggleNomeEmbalagemEdicao() {
    const unidade = document.getElementById('editInsumoUnidade').value;
    document.getElementById('editWrapperNomeEmbalagem').style.display = unidade === 'un' ? 'none' : 'block';
    if (unidade === 'un') document.getElementById('editInsumoNomeEmbalagem').value = '';
}


function fecharEdicaoInsumo() {
    document.getElementById('modalEditarInsumo').style.display = 'none';
    _insumoEditandoKey = null;
}


function salvarEdicaoInsumo() {
    if (!_insumoEditandoKey) return;
    const nome     = document.getElementById('editInsumoNome').value.trim();
    const precoRaw = document.getElementById('editInsumoPreco').value;
    const preco    = parseFloat(precoRaw.replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0;
    const unidade  = document.getElementById('editInsumoUnidade').value;
    const qtd      = parseFloat(document.getElementById('editInsumoQtd').value) || 1;
    const nomeEmbalagem = document.getElementById('editInsumoNomeEmbalagem').value.trim();
    const estoqueAtualInput  = parseFloat(document.getElementById('editInsumoEstoqueAtual').value) || 0;
    const estoqueMinimoInput = parseFloat(document.getElementById('editInsumoEstoqueMinimo').value) || 0;

    if (!nome)    { toast('❌ Informe o nome do insumo.', 'erro'); return; }
    if (preco<=0) { toast('❌ Informe um preço válido.', 'erro'); return; }
    if (qtd<=0)   { toast('❌ Informe a quantidade por embalagem.', 'erro'); return; }

    const estoqueAtual  = nomeEmbalagem ? estoqueAtualInput  * qtd : estoqueAtualInput;
    const estoqueMinimo = nomeEmbalagem ? estoqueMinimoInput * qtd : estoqueMinimoInput;

    database.ref('insumos/' + _insumoEditandoKey).update({
        nome, preco, unidade, qtdEmbalagem: qtd, nomeEmbalagem, estoqueAtual, estoqueMinimo
    }).then(() => {
        toast('✅ Insumo atualizado!');
        fecharEdicaoInsumo();
        carregarInsumos();
        verificarEstoqueBaixo();
    }).catch(err => toast('❌ Erro: ' + err.message, 'erro'));
}


function excluirInsumo(key) {
    database.ref('receitas').once('value', snap => {
        const receitasQueUsam = [];
        snap.forEach(child => {
            const r = child.val();
            if (r.ingredientes && r.ingredientes.some(ing => ing.insumoKey === key)) {
                receitasQueUsam.push(r.sabor);
            }
        });
        if (receitasQueUsam.length > 0) {
            const lista = receitasQueUsam.join(', ');
            showConfirmModal(`⚠️ Este insumo é usado em ${receitasQueUsam.length} receita(s): ${lista}. Excluir mesmo assim? O custo dessas receitas ficará incorreto.`, () => {
                database.ref('insumos/' + key).remove()
                    .then(() => { toast('🗑️ Insumo excluído.'); carregarInsumos(); })
                    .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
            });
        } else {
            showConfirmModal('Excluir este insumo?', () => {
                database.ref('insumos/' + key).remove()
                    .then(() => { toast('🗑️ Insumo excluído.'); carregarInsumos(); })
                    .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
            });
        }
    });
}


function verHistoricoPreco(key, nome) {
    document.getElementById('historicoPrecoInsumoNome').textContent = nome;
    const lista = document.getElementById('historicoPrecoLista');
    const canvas = document.getElementById('graficoHistoricoPreco');
    lista.innerHTML = '<p style="color:var(--brown-warm);font-size:0.85em;">Carregando...</p>';
    canvas.style.display = 'none';
    if (graficoHistoricoPreco) { graficoHistoricoPreco.destroy(); graficoHistoricoPreco = null; }
    document.getElementById('modalHistoricoPreco').style.display = 'flex';
    database.ref('historicoPrecos/' + key).once('value').then(snapshot => {
        const registros = [];
        snapshot.forEach(child => registros.push(child.val()));
        if (registros.length === 0) {
            lista.innerHTML = '<p style="color:var(--brown-warm);font-size:0.85em;">Nenhuma compra registrada ainda para este insumo.</p>';
            return;
        }
        registros.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
        const totalRegistros = registros.length;
        const registrosExibidos = registros.slice(0, 12);
        let html = '';
        if (totalRegistros > 12) {
            html += `<p style="font-size:0.76em;color:var(--brown-warm);margin-bottom:8px;">Mostrando as 12 compras mais recentes de ${totalRegistros}.</p>`;
        }
        registrosExibidos.forEach((r, idx) => {
            const anterior = registrosExibidos[idx+1];
            let seta = '';
            if (anterior) {
                if (r.precoUnitario > anterior.precoUnitario) seta = '<span style="color:var(--red);font-weight:700;">↑</span>';
                else if (r.precoUnitario < anterior.precoUnitario) seta = '<span style="color:var(--green);font-weight:700;">↓</span>';
                else seta = '<span style="color:var(--brown-warm);">→</span>';
            }
            const dataBR = r.data ? r.data.split('-').reverse().join('/') : 'N/A';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.86em;">
                <span>📅 ${dataBR}</span>
                <span>${seta} R$ ${r.precoUnitario.toFixed(4).replace('.',',')}</span>
            </div>`;
        });
        lista.innerHTML = html;

        // Gráfico: precisa de ao menos 2 pontos, em ordem cronológica crescente
        if (registros.length >= 2) {
            const registrosCronologicos = registros.slice().sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
            const labels = registrosCronologicos.map(r => r.data ? r.data.split('-').reverse().join('/') : '');
            const valores = registrosCronologicos.map(r => r.precoUnitario);
            canvas.style.display = 'block';
            const ctx = canvas.getContext('2d');
            graficoHistoricoPreco = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Preço unitário',
                        data: valores,
                        borderColor: '#E8943A',
                        backgroundColor: 'rgba(232,148,58,0.15)',
                        tension: 0.25,
                        fill: true,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' R$ ' + ctx.parsed.y.toFixed(4).replace('.',',') } } },
                    scales: { y: { ticks: { callback: v => 'R$ ' + v.toFixed(3) } } }
                }
            });
        }
    }).catch(err => {
        lista.innerHTML = '<p style="color:var(--red);font-size:0.85em;">Erro ao carregar histórico: ' + err.message + '</p>';
    });
}


function popularSelectCompraInsumo(insumosList) {
    const sel = document.getElementById('compraInsumoSel');
    if (!sel) return;
    const valorAtual = sel.value;
    sel.innerHTML = '<option value="">Selecione o insumo</option>';
    insumosList.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.key;
        opt.textContent = i.nome;
        opt.dataset.unidade = i.unidade;
        opt.dataset.estoque = i.estoqueAtual || 0;
        opt.dataset.custoun = i.qtdEmbalagem > 0 ? (i.preco / i.qtdEmbalagem) : 0;
        opt.dataset.qtdembalagem = i.qtdEmbalagem || 1;
        opt.dataset.nomeembalagem = i.nomeEmbalagem || '';
        sel.appendChild(opt);
    });
    if (valorAtual) sel.value = valorAtual;
}


function atualizarInfoCompraInsumo() {
    const sel  = document.getElementById('compraInsumoSel');
    const opt  = sel.options[sel.selectedIndex];
    const info = document.getElementById('compraInsumoInfo');
    const labelQtd   = document.getElementById('labelCompraQtd');
    const labelValor = document.getElementById('labelCompraValor');
    const campoQtd   = document.getElementById('compraQtd');

    if (!opt || !opt.value) { info.textContent = ''; calcularPreviewCompra(); return; }

    const unidade   = opt.dataset.unidade;
    const nomeEmb   = opt.dataset.nomeembalagem;
    const qtdEmb    = parseFloat(opt.dataset.qtdembalagem) || 1;
    const estoqueG  = parseFloat(opt.dataset.estoque) || 0;
    const custoUn   = parseFloat(opt.dataset.custoun) || 0;
    const labelUn   = unidade === 'un' ? 'un' : unidade;

    if (nomeEmb) {
        const estoqueEmb = estoqueG / qtdEmb;
        const estoqueEmbFmt = Number.isInteger(estoqueEmb) ? estoqueEmb : estoqueEmb.toFixed(1);
        info.textContent = `📦 Estoque atual: ${estoqueEmbFmt} ${nomeEmb}(s) · Cada ${nomeEmb} tem ${qtdEmb}${labelUn}`;
        labelQtd.textContent   = `Quantidade de ${nomeEmb}s compradas`;
        labelValor.textContent = `Valor por ${nomeEmb} (R$)`;
        campoQtd.placeholder = `Ex: 27 ${nomeEmb}s`;
    } else {
        info.textContent = `📦 Estoque atual: ${estoqueG}${labelUn} · Custo atual: R$ ${custoUn.toFixed(4).replace('.',',')}/${labelUn}`;
        labelQtd.textContent   = 'Quantidade comprada';
        labelValor.textContent = 'Valor pago (R$)';
        campoQtd.placeholder = 'Ex: 1000';
    }
    calcularPreviewCompra();
}

// Converte os campos do formulário pra unidade base (g/ml), considerando se é por embalagem ou não

function _lerCompraEmBase(opt) {
    const nomeEmb   = opt.dataset.nomeembalagem;
    const qtdEmb    = parseFloat(opt.dataset.qtdembalagem) || 1;
    const qtdDigitada = parseFloat(document.getElementById('compraQtd').value) || 0;
    const valorDigitado = parseFloat((document.getElementById('compraValor').value||'').replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0;

    if (nomeEmb) {
        // qtdDigitada = nº de embalagens · valorDigitado = preço por embalagem
        return {
            qtdComprada_base: qtdDigitada * qtdEmb,
            valorPagoTotal: valorDigitado * qtdDigitada
        };
    }
    // comportamento antigo: qtdDigitada já é em unidade base, valorDigitado é o total pago
    return { qtdComprada_base: qtdDigitada, valorPagoTotal: valorDigitado };
}


function calcularPreviewCompra() {
    const sel     = document.getElementById('compraInsumoSel');
    const opt     = sel.options[sel.selectedIndex];
    const preview = document.getElementById('compraPreview');
    if (!opt || !opt.value) { preview.textContent = ''; return; }

    const { qtdComprada_base, valorPagoTotal } = _lerCompraEmBase(opt);
    if (qtdComprada_base <= 0 || valorPagoTotal <= 0) { preview.textContent = ''; return; }

    const unidade       = opt.dataset.unidade;
    const nomeEmb       = opt.dataset.nomeembalagem;
    const qtdEmb        = parseFloat(opt.dataset.qtdembalagem) || 1;
    const labelUn       = unidade === 'un' ? 'un' : unidade;
    const estoqueAntigo = parseFloat(opt.dataset.estoque) || 0;
    const custoUnAntigo = parseFloat(opt.dataset.custoun) || 0;
    const custoUnNovo   = valorPagoTotal / qtdComprada_base;
    const estoqueTotal  = estoqueAntigo + qtdComprada_base;
    const custoUnMedio  = estoqueTotal > 0
        ? ((custoUnAntigo * estoqueAntigo) + (custoUnNovo * qtdComprada_base)) / estoqueTotal
        : custoUnNovo;

    if (nomeEmb) {
        const estoqueEmbTotal = estoqueTotal / qtdEmb;
        const estoqueEmbFmt = Number.isInteger(estoqueEmbTotal) ? estoqueEmbTotal : estoqueEmbTotal.toFixed(1);
        preview.innerHTML = `📊 Novo estoque: <strong>${estoqueEmbFmt} ${nomeEmb}(s)</strong> · Novo custo médio: <strong>R$ ${custoUnMedio.toFixed(4).replace('.',',')}/${labelUn}</strong> · Total pago: <strong>R$ ${valorPagoTotal.toFixed(2).replace('.',',')}</strong>`;
    } else {
        preview.innerHTML = `📊 Novo estoque: <strong>${estoqueTotal}${labelUn}</strong> · Novo custo médio: <strong>R$ ${custoUnMedio.toFixed(4).replace('.',',')}/${labelUn}</strong>`;
    }
}


async function registrarCompraInsumo() {
    const key       = document.getElementById('compraInsumoSel').value;
    const sel       = document.getElementById('compraInsumoSel');
    const opt       = sel.options[sel.selectedIndex];
    const categoria = document.getElementById('compraCategoria').value;
    const data      = document.getElementById('compraData').value || new Date().toISOString().split('T')[0];

    if (!key) { toast('❌ Selecione um insumo.', 'erro'); return; }

    const { qtdComprada_base, valorPagoTotal } = _lerCompraEmBase(opt);
    if (qtdComprada_base <= 0) { toast('❌ Informe a quantidade comprada.', 'erro'); return; }
    if (valorPagoTotal <= 0)   { toast('❌ Informe o valor pago.', 'erro'); return; }

    const btn = document.getElementById('btnRegistrarCompra');
    if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

    try {
        const snap   = await database.ref('insumos/' + key).once('value');
        const insumo = snap.val();
        if (!insumo) { toast('❌ Insumo não encontrado.', 'erro'); return; }

        const estoqueAntigo = insumo.estoqueAtual || 0;
        const custoUnAntigo = insumo.qtdEmbalagem > 0 ? (insumo.preco / insumo.qtdEmbalagem) : 0;
        const custoUnNovo   = valorPagoTotal / qtdComprada_base;
        const estoqueTotal  = estoqueAntigo + qtdComprada_base;
        const custoUnMedio  = estoqueTotal > 0
            ? ((custoUnAntigo * estoqueAntigo) + (custoUnNovo * qtdComprada_base)) / estoqueTotal
            : custoUnNovo;
        const novoPreco = custoUnMedio * insumo.qtdEmbalagem;

        await database.ref('insumos/' + key).update({ estoqueAtual: estoqueTotal, preco: novoPreco });
        await database.ref('gastos').push({
            data, categoria,
            descricao: insumo.nome,
            quantidade: qtdComprada_base,
            valor: valorPagoTotal,
            timestamp: Date.now()
        });
        await database.ref('historicoPrecos/' + key).push({
            data,
            precoUnitario: custoUnNovo,
            precoEmbalagem: novoPreco,
            timestamp: Date.now()
        });

        if (custoUnAntigo > 0) {
            const variacaoPct = ((custoUnNovo - custoUnAntigo) / custoUnAntigo) * 100;
            if (variacaoPct >= 10) {
                toast(`⚠️ Preço ${variacaoPct.toFixed(0)}% mais caro que a média anterior de "${insumo.nome}"`, 'aviso');
            } else if (variacaoPct <= -10) {
                toast(`💚 Preço ${Math.abs(variacaoPct).toFixed(0)}% mais barato que a média anterior de "${insumo.nome}"`, 'sucesso');
            }
        }

        toast('✅ Compra registrada! Estoque e custo médio atualizados.');
        document.getElementById('compraInsumoSel').value = '';
        document.getElementById('compraQtd').value = '';
        document.getElementById('compraValor').value = '';
        document.getElementById('compraInsumoInfo').textContent = '';
        document.getElementById('compraPreview').textContent = '';
        carregarInsumos();
        verificarEstoqueBaixo();
    } catch (err) {
        toast('❌ Erro: ' + err.message, 'erro');
    } finally {
        if (btn) { btn.textContent = '✅ Registrar Compra'; btn.disabled = false; }
    }
}


function popularSelectInsumos() {
    database.ref('insumos').once('value', snapshot => {
        const sel = document.getElementById('receitaInsumoSel');
        sel.innerHTML = '<option value="">Selecione</option>';
        const insumos = [];
        snapshot.forEach(child => { const i = child.val(); i.key = child.key; insumos.push(i); });
        insumos.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        insumos.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.key;
            opt.textContent = i.nome + (i.nomeEmbalagem ? ` (${i.nomeEmbalagem} de ${i.qtdEmbalagem}${i.unidade})` : ' (' + (i.unidade === 'un' ? 'un' : i.qtdEmbalagem + i.unidade) + ')');
            opt.dataset.unidade      = i.unidade;
            opt.dataset.preco        = i.preco;
            opt.dataset.qtdEmbalagem = i.qtdEmbalagem;
            opt.dataset.nomeEmbalagem = i.nomeEmbalagem || '';
            opt.dataset.nome         = i.nome;
            sel.appendChild(opt);
        });
    });
}


async function calcularPrevisaoCompra(dias, btn) {
    document.querySelectorAll('#previsao-compra-filtros .chip-filtro').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const painel = document.getElementById('painel-previsao-compra');
    painel.innerHTML = '<p style="color:var(--brown-warm);padding:14px 0;">Calculando...</p>';

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limite = new Date(hoje); limite.setDate(limite.getDate() + dias);

    const [snapPedidos, snapReceitas, snapInsumos] = await Promise.all([
        database.ref('pedidos').once('value'),
        database.ref('receitas').once('value'),
        database.ref('insumos').once('value')
    ]);

    const receitasMap = {};
    snapReceitas.forEach(child => { receitasMap[child.val().sabor] = child.val(); });
    const insumosMap = {};
    snapInsumos.forEach(child => { insumosMap[child.key] = { ...child.val(), key: child.key }; });

    const necessidadeTotal = {};
    const primeiraDataAfetada = {}; // insumoKey -> Date mais próxima que consome esse insumo

    snapPedidos.forEach(child => {
        const p = child.val();
        if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
        let dataP;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
        else return;
        if (dataP < hoje || dataP > limite) return;

        (p.itens || []).forEach(item => {
            const receita = receitasMap[item.sabor];
            if (!receita || !receita.ingredientes) return;
            const fator = item.quantidade / receita.rendimento;
            receita.ingredientes.forEach(ing => {
                necessidadeTotal[ing.insumoKey] = (necessidadeTotal[ing.insumoKey] || 0) + (ing.qtdReceita * fator);
                if (!primeiraDataAfetada[ing.insumoKey] || dataP < primeiraDataAfetada[ing.insumoKey]) {
                    primeiraDataAfetada[ing.insumoKey] = dataP;
                }
            });
        });
    });

    const itensComprar = [];
    Object.entries(necessidadeTotal).forEach(([insumoKey, necessario]) => {
        const insumo = insumosMap[insumoKey];
        if (!insumo) return;
        const estoqueAtual = insumo.estoqueAtual || 0;
        const falta = necessario - estoqueAtual;
        if (falta > 0) {
            const qtdEmbalagem = insumo.qtdEmbalagem || 1;
            const embalagensNecessarias = insumo.unidade === 'un' ? Math.ceil(falta) : Math.ceil(falta / qtdEmbalagem);
            itensComprar.push({
                nome: insumo.nome,
                unidade: insumo.unidade,
                nomeEmbalagem: insumo.nomeEmbalagem || '',
                necessario, estoqueAtual, falta,
                qtdEmbalagem,
                embalagensNecessarias,
                custoEstimado: (insumo.preco / qtdEmbalagem) * falta,
                dataRisco: primeiraDataAfetada[insumoKey] || null
            });
        }
    });

    itensComprar.sort((a,b) => b.falta - a.falta);

    if (itensComprar.length === 0) {
        painel.innerHTML = `<p style="color:var(--green);font-weight:700;text-align:center;padding:20px 0;">✅ Estoque suficiente para os próximos ${dias} dias!</p>`;
        return;
    }

    const custoTotalCompra = itensComprar.reduce((s,i) => s + i.custoEstimado, 0);
    let html = '';
    itensComprar.forEach(i => {
        const labelEmbalagem = i.nomeEmbalagem
            ? `${i.embalagensNecessarias} ${i.nomeEmbalagem}${i.embalagensNecessarias > 1 ? 's' : ''}`
            : i.unidade === 'un'
                ? `${i.embalagensNecessarias} un.`
                : `${i.embalagensNecessarias} embalagem${i.embalagensNecessarias > 1 ? 's' : ''} de ${i.qtdEmbalagem}${i.unidade}`;

        const necessarioTexto = i.nomeEmbalagem
            ? `${i.necessario.toFixed(0)}${i.unidade} (${(i.necessario / i.qtdEmbalagem).toFixed(1)} ${i.nomeEmbalagem}${(i.necessario / i.qtdEmbalagem) === 1 ? '' : 's'})`
            : `${i.necessario.toFixed(1)}${i.unidade}`;
        const estoqueTexto = i.nomeEmbalagem
            ? `${i.estoqueAtual.toFixed(0)}${i.unidade} (${(i.estoqueAtual / i.qtdEmbalagem).toFixed(1)} ${i.nomeEmbalagem}${(i.estoqueAtual / i.qtdEmbalagem) === 1 ? '' : 's'})`
            : `${i.estoqueAtual}${i.unidade}`;
        const faltaEmbalagemTexto = i.nomeEmbalagem
            ? `${(i.falta / i.qtdEmbalagem).toFixed(1)} ${i.nomeEmbalagem}${(i.falta / i.qtdEmbalagem) === 1 ? '' : 's'}`
            : `${i.falta.toFixed(0)}${i.unidade}`;
        const riscoTexto = i.dataRisco
            ? `⚠️ risco a partir de ${String(i.dataRisco.getDate()).padStart(2,'0')}/${String(i.dataRisco.getMonth()+1).padStart(2,'0')}`
            : '';

        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#FEF3C7;border-radius:10px;margin-bottom:8px;">
            <div>
                <strong>${escaparHTML(i.nome)}</strong>
                <div style="font-size:0.78em;color:var(--brown-warm);">Necessário: ${necessarioTexto} | Em estoque: ${estoqueTexto}</div>
                ${riscoTexto ? `<div style="font-size:0.75em;color:#DC2626;font-weight:700;margin-top:2px;">${riscoTexto}</div>` : ''}
            </div>
            <div style="text-align:right;">
                <div style="font-weight:700;color:#92400E;">Comprar: ${labelEmbalagem}</div>
                <div style="font-size:0.72em;color:var(--brown-warm);">(${faltaEmbalagemTexto} faltando)</div>
                <div style="font-size:0.78em;color:var(--brown-warm);">≈ R$ ${i.custoEstimado.toFixed(2).replace('.',',')}</div>
            </div>
        </div>`;
    });
    html += `<div style="border-top:2px solid var(--cream-dark);margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;font-weight:700;">
        <span>Custo total estimado da compra</span><span style="color:var(--amber);">R$ ${custoTotalCompra.toFixed(2).replace('.',',')}</span>
    </div>`;
    painel.innerHTML = html;
}

// ====================== RECEITAS ======================


function popularSelectReceitaSabor() {
    const sel = document.getElementById('receitaSabor');
    sel.innerHTML = '<option value="">Selecione o sabor</option>';
    const todos = [
        ...(DADOS_PEDIDOS?.sabores?.trads    || []),
        ...(DADOS_PEDIDOS?.sabores?.gourmets || []),
        ...(DADOS_PEDIDOS?.sabores?.frutas   || [])
    ].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    todos.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome; opt.textContent = nome;
        sel.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const selInsumo = document.getElementById('receitaInsumoSel');
    if (selInsumo) {
        selInsumo.addEventListener('change', function() {
            const opt = this.options[this.selectedIndex];
            const hint = document.getElementById('receitaInsumoHint');
            const qtdInput = document.getElementById('receitaInsumoQtd');
            if (!opt.value) { hint.textContent = ''; return; }
            const unidade = opt.dataset.unidade;
            const nomeEmb = opt.dataset.nomeEmbalagem;
            if (nomeEmb) {
                hint.textContent = `Quantas ${nomeEmb}s essa receita usa? (Ex: 1)`;
                qtdInput.placeholder = 'Ex: 1';
            } else if (unidade === 'un') {
                hint.textContent = 'Informe quantas unidades usar na receita base.';
                qtdInput.placeholder = 'Ex: 2';
            } else {
                hint.textContent = 'Informe a quantidade em ' + unidade + ' usada na receita base.';
                qtdInput.placeholder = 'Ex: 80';
            }
        });
    }
});


function adicionarIngredienteReceita() {
    const sel    = document.getElementById('receitaInsumoSel');
    const qtdEl  = document.getElementById('receitaInsumoQtd');
    const key    = sel.value;
    const opt    = sel.options[sel.selectedIndex];
    const qtdDigitada = parseFloat(qtdEl.value) || 0;

    if (!key)          { toast('❌ Selecione um insumo.', 'erro'); return; }
    if (qtdDigitada<=0){ toast('❌ Informe a quantidade.', 'erro'); return; }

    if (ingredientesReceita.find(i => i.insumoKey === key)) {
        toast('⚠️ Insumo já adicionado. Remova e adicione novamente para alterar.', 'aviso');
        return;
    }

    const nomeEmb = opt.dataset.nomeEmbalagem;
    const qtdEmbalagem = parseFloat(opt.dataset.qtdEmbalagem);
    // Se o insumo é por embalagem, o valor digitado (ex: 1) é convertido pra unidade base (ex: 395g)
    const qtdReceitaBase = nomeEmb ? qtdDigitada * qtdEmbalagem : qtdDigitada;

    ingredientesReceita.push({
        insumoKey:      key,
        nome:           opt.dataset.nome,
        unidade:        opt.dataset.unidade,
        preco:          parseFloat(opt.dataset.preco),
        qtdEmbalagem:   qtdEmbalagem,
        nomeEmbalagem:  nomeEmb,
        qtdEmbReceita:  nomeEmb ? qtdDigitada : null,  // quantas caixinhas, pra exibição
        qtdReceita:     qtdReceitaBase                 // sempre em unidade base, pra cálculo
    });

    sel.value   = '';
    qtdEl.value = '';
    document.getElementById('receitaInsumoHint').textContent = '';
    renderizarIngredientesReceita();
}


function renderizarIngredientesReceita() {
    const lista = document.getElementById('listaIngredientesReceita');
    if (ingredientesReceita.length === 0) { lista.innerHTML = ''; return; }
    lista.innerHTML = ingredientesReceita.map((ing, idx) => {
        const custo = (ing.preco / ing.qtdEmbalagem) * ing.qtdReceita;
        const qtdExibida = ing.nomeEmbalagem
            ? `${ing.qtdEmbReceita} ${ing.nomeEmbalagem}${ing.qtdEmbReceita === 1 ? '' : 's'}`
            : `${ing.qtdReceita}${ing.unidade}`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--cream);border-radius:10px;margin-bottom:6px;font-size:0.84em;">
            <div>
                <strong>${escaparHTML(ing.nome)}</strong>
                <span style="color:var(--brown-warm);margin-left:6px;">${qtdExibida}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="color:var(--green);font-weight:700;">R$ ${custo.toFixed(2).replace('.',',')}</span>
                <button class="btn-remove" style="padding:4px 10px;font-size:0.76em;" onclick="removerIngredienteReceita(${idx})">✕</button>
            </div>
        </div>`;
    }).join('');
}


function removerIngredienteReceita(idx) {
    ingredientesReceita.splice(idx, 1);
    renderizarIngredientesReceita();
}


function salvarReceita() {
    const sabor      = document.getElementById('receitaSabor').value;
    const rendimento = parseInt(document.getElementById('receitaRendimento').value) || 0;

    if (!sabor)           { toast('❌ Selecione o sabor.', 'erro'); return; }
    if (rendimento <= 0)  { toast('❌ Informe o rendimento.', 'erro'); return; }
    if (ingredientesReceita.length === 0) { toast('❌ Adicione ao menos um ingrediente.', 'erro'); return; }

    const custoTotal = ingredientesReceita.reduce((s, ing) => {
        const c = (ing.preco / ing.qtdEmbalagem) * ing.qtdReceita;
        return s + c;
    }, 0);

    const receita = {
        sabor,
        rendimento,
        ingredientes: ingredientesReceita.map(ing => ({
            insumoKey:    ing.insumoKey,
            nome:         ing.nome,
            unidade:      ing.unidade,
            preco:        ing.preco,
            qtdEmbalagem: ing.qtdEmbalagem,
            qtdReceita:   ing.qtdReceita
        })),
        custoTotal,
        custoPorUnidade: custoTotal / rendimento,
        timestamp: Date.now()
    };

    const operacao = _receitaEditandoKey
        ? database.ref('receitas/' + _receitaEditandoKey).update(receita)
        : database.ref('receitas').push(receita);

    operacao.then(() => {
        toast(_receitaEditandoKey ? '✅ Receita atualizada!' : '✅ Receita salva!');
        document.getElementById('receitaSabor').value      = '';
        document.getElementById('receitaRendimento').value = '';
        ingredientesReceita = [];
        _receitaEditandoKey = null;
        const btnSalvar = document.querySelector('#aba-receitas .btn-verde.btn-bloco');
        if (btnSalvar) btnSalvar.textContent = '💾 Salvar Receita';
        renderizarIngredientesReceita();
        carregarReceitasLista();
    }).catch(err => toast('❌ Erro: ' + err.message, 'erro'));
}


function carregarReceitasLista() {
    const lista = document.getElementById('lista-receitas');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('receitas').once('value', snapshot => {
        const receitas = [];
        snapshot.forEach(child => { const r = child.val(); r.key = child.key; receitas.push(r); });
        receitas.sort((a,b) => a.sabor.localeCompare(b.sabor, 'pt-BR'));
        if (receitas.length === 0) {
            lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhuma receita cadastrada ainda.</p>';
            return;
        }
        lista.innerHTML = '';
        receitas.forEach(r => {
            const custoPorUn = r.custoPorUnidade || (r.custoTotal / r.rendimento);
            const card = document.createElement('div');
            card.className = 'receita-card';
            const ingsHTML = (r.ingredientes || []).map(ing => {
                const custo = (ing.preco / ing.qtdEmbalagem) * ing.qtdReceita;
                const qtdExibida = ing.nomeEmbalagem
                    ? `${ing.qtdEmbReceita} ${ing.nomeEmbalagem}${ing.qtdEmbReceita === 1 ? '' : 's'}`
                    : `${ing.qtdReceita}${ing.unidade}`;
                return `<div class="receita-ingrediente-linha">
                    <span>${escaparHTML(ing.nome)} — ${qtdExibida}</span>
                    <span style="font-weight:600;">R$ ${custo.toFixed(2).replace('.',',')}</span>
                </div>`;
            }).join('');
            card.innerHTML = `
                <div class="receita-header">
                    <div class="receita-sabor">🍫 ${escaparHTML(r.sabor)}</div>
                    <span class="receita-custo-badge">R$ ${custoPorUn.toFixed(3).replace('.',',')} /un</span>
                </div>
                <div style="font-size:0.8em;color:var(--brown-warm);margin-bottom:10px;">Rendimento: ${r.rendimento} unidades · Custo receita base: R$ ${r.custoTotal.toFixed(2).replace('.',',')}</div>
                ${ingsHTML}
                <div style="margin-top:12px;padding:10px 12px;background:var(--cream);border-radius:12px;">
                    <p style="font-size:0.78em;font-weight:700;color:var(--brown-warm);margin-bottom:6px;">💹 Simulador "e se eu vender a..."</p>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <span style="font-size:0.85em;">R$</span>
                        <input type="text" id="simPreco-${r.key}" placeholder="0,00" style="margin-bottom:0;flex:1;font-size:0.85em;padding:7px 10px;" oninput="this.value=maskMoeda(this.value);simularMargemReceita('${r.key}',${custoPorUn})">
                        <span style="font-size:0.8em;color:var(--brown-warm);">/un</span>
                    </div>
                    <p id="simResultado-${r.key}" style="font-size:0.82em;margin-top:6px;font-weight:600;"></p>
                </div>
                <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:8px;">
                    <button class="btn btn-amarelo" style="padding:6px 14px;font-size:0.8em;" onclick="editarReceita('${r.key}')">✏️ Editar</button>
                    <button class="btn btn-cinza" style="padding:6px 14px;font-size:0.8em;" onclick="duplicarReceita('${r.key}')">📄 Duplicar</button>
                    <button class="btn-remove" onclick="excluirReceita('${r.key}')">🗑️ Excluir receita</button>
                </div>`;
            lista.appendChild(card);
        });
    });
}


function excluirReceita(key) {
    showConfirmModal('Excluir esta receita?', () => {
        database.ref('receitas/' + key).remove()
            .then(() => { toast('🗑️ Receita excluída.'); carregarReceitasLista(); })
            .catch(err => toast('❌ Erro: ' + err.message, 'erro'));
    });
}


function duplicarReceita(key) {
    database.ref('receitas/' + key).once('value', snap => {
        const r = snap.val();
        if (!r) { toast('❌ Receita não encontrada.', 'erro'); return; }
        document.getElementById('receitaSabor').value = '';
        document.getElementById('receitaRendimento').value = r.rendimento || '';
        ingredientesReceita = (r.ingredientes || []).map(ing => ({
            insumoKey:     ing.insumoKey,
            nome:          ing.nome,
            unidade:       ing.unidade,
            preco:         ing.preco,
            qtdEmbalagem:  ing.qtdEmbalagem,
            nomeEmbalagem: '',
            qtdEmbReceita: null,
            qtdReceita:    ing.qtdReceita
        }));
        renderizarIngredientesReceita();
        toast('📄 Ingredientes copiados! Escolha o novo sabor e salve.', 'aviso');
        document.getElementById('receitaSabor').scrollIntoView({ behavior:'smooth', block:'center' });
        document.getElementById('receitaSabor').focus();
    });
}


function editarReceita(key) {
    database.ref('receitas/' + key).once('value', snap => {
        const r = snap.val();
        if (!r) { toast('❌ Receita não encontrada.', 'erro'); return; }
        _receitaEditandoKey = key;
        document.getElementById('receitaSabor').value = r.sabor || '';
        document.getElementById('receitaRendimento').value = r.rendimento || '';
        ingredientesReceita = (r.ingredientes || []).map(ing => ({
            insumoKey:     ing.insumoKey,
            nome:          ing.nome,
            unidade:       ing.unidade,
            preco:         ing.preco,
            qtdEmbalagem:  ing.qtdEmbalagem,
            nomeEmbalagem: ing.qtdEmbReceita !== undefined ? '' : '',
            qtdEmbReceita: null,
            qtdReceita:    ing.qtdReceita
        }));
        renderizarIngredientesReceita();
        const btnSalvar = document.querySelector('#aba-receitas .btn-verde.btn-bloco');
        if (btnSalvar) btnSalvar.textContent = '✏️ Atualizar Receita';
        toast('✏️ Edite os campos e clique em "Atualizar Receita".', 'aviso');
        document.getElementById('receitaSabor').scrollIntoView({ behavior:'smooth', block:'center' });
    });
}


function cancelarEdicaoReceita() {
    _receitaEditandoKey = null;
    document.getElementById('receitaSabor').value = '';
    document.getElementById('receitaRendimento').value = '';
    ingredientesReceita = [];
    renderizarIngredientesReceita();
    const btnSalvar = document.querySelector('#aba-receitas .btn-verde.btn-bloco');
    if (btnSalvar) btnSalvar.textContent = '💾 Salvar Receita';
}


function simularMargemReceita(key, custoPorUn) {
    const input = document.getElementById('simPreco-' + key);
    const resultado = document.getElementById('simResultado-' + key);
    const preco = parseFloat((input.value||'').replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0;
    if (preco <= 0) { resultado.textContent = ''; return; }
    const lucro = preco - custoPorUn;
    const margem = (lucro / preco * 100);
    const cor = margem >= 50 ? 'var(--green)' : margem >= 30 ? '#92400E' : 'var(--red)';
    resultado.innerHTML = `Lucro: <span style="color:${cor};">R$ ${lucro.toFixed(3).replace('.',',')}/un</span> · Margem: <span style="color:${cor};">${margem.toFixed(1)}%</span>`;
}

// ====================== CHECKLIST DE PRODUÇÃO POR PERÍODO ======================

function chaveFirebaseSegura(str) {
    return str.replace(/[.#$\[\]\/]/g, '_');
}

function definirPeriodoProducao(diasInicio, diasFim) {
    const hoje = new Date();
    const ini = new Date(hoje); ini.setDate(ini.getDate() + diasInicio);
    const fim = new Date(hoje); fim.setDate(fim.getDate() + diasFim);
    const toISO = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    document.getElementById('producaoDataIni').value = toISO(ini);
    document.getElementById('producaoDataFim').value = toISO(fim);
    gerarChecklistProducao();
}

async function gerarChecklistProducao() {
    const dataIniStr = document.getElementById('producaoDataIni').value;
    const dataFimStr = document.getElementById('producaoDataFim').value;
    if (!dataIniStr || !dataFimStr) { toast('❌ Informe o período (de/até).', 'erro'); return; }

    const dataIni = new Date(dataIniStr + 'T00:00:00');
    const dataFim = new Date(dataFimStr + 'T23:59:59');
    if (dataFim < dataIni) { toast('❌ A data final deve ser depois da inicial.', 'erro'); return; }

    const lista  = document.getElementById('checklistProducaoLista');
    const resumo = document.getElementById('checklistProducaoResumo');
    lista.innerHTML = gerarSkeleton(3);
    resumo.style.display = 'none';

    const snapshot = await database.ref('pedidos').once('value');
    const saboresMap = {};

    snapshot.forEach(child => {
        const p = child.val();
        if (p.statusPagamento === 'entregue' || !p.dataEntrega) return;
        let dataP;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
        else return;
        if (dataP < dataIni || dataP > dataFim) return;
        (p.itens || []).forEach(item => {
            const sabor = item.sabor || item.nome || 'Desconhecido';
            const qtd = parseInt(item.quantidade) || 0;
            if (!saboresMap[sabor]) saboresMap[sabor] = { qtd: 0, pedidos: 0 };
            saboresMap[sabor].qtd += qtd;
            saboresMap[sabor].pedidos += 1;
        });
    });

    const entries = Object.entries(saboresMap).sort((a,b) => b[1].qtd - a[1].qtd);

    if (entries.length === 0) {
        lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum pedido neste período.</p>';
        resumo.style.display = 'none';
        return;
    }

    const chave = chaveFirebaseSegura(dataIniStr + '_' + dataFimStr);
    window._checklistProducaoChave = chave;

    const snapChecklist = await database.ref('producaoChecklist/' + chave).once('value');
    const estadoSalvo = snapChecklist.val() || {};

    let concluidos = 0;
    let html = '';
    entries.forEach(([sabor, dados]) => {
        const saborKey = chaveFirebaseSegura(sabor);
        const feito = !!estadoSalvo[saborKey];
        if (feito) concluidos++;
        html += `<div class="checklist-item ${feito ? 'checklist-item-feito' : ''}" id="checklist-item-${saborKey}">
            <label class="checklist-checkbox-wrapper">
                <input type="checkbox" ${feito ? 'checked' : ''} onchange="toggleChecklistItem('${saborKey}', this)">
                <span class="checklist-texto">
                    <strong>${escaparHTML(sabor)}</strong> — ${dados.qtd} un
                    <span class="checklist-pedidos">(${dados.pedidos} pedido${dados.pedidos>1?'s':''})</span>
                </span>
            </label>
        </div>`;
    });

    lista.innerHTML = html;
    resumo.style.display = 'flex';
    resumo.innerHTML = `
        <span>📅 ${dataIniStr.split('-').reverse().join('/')} a ${dataFimStr.split('-').reverse().join('/')} — ${entries.length} sabor${entries.length>1?'es':''}</span>
        <span class="checklist-progresso" id="checklistProgressoTexto">${concluidos}/${entries.length} concluídos</span>
    `;
}

function toggleChecklistItem(saborKey, checkboxEl) {
    const chave = window._checklistProducaoChave;
    if (!chave) return;
    const marcado = checkboxEl.checked;
    database.ref(`producaoChecklist/${chave}/${saborKey}`).set(marcado);

    const itemEl = document.getElementById('checklist-item-' + saborKey);
    if (itemEl) itemEl.classList.toggle('checklist-item-feito', marcado);

    const total  = document.querySelectorAll('#checklistProducaoLista .checklist-item').length;
    const feitos = document.querySelectorAll('#checklistProducaoLista .checklist-item-feito').length;
    const elProgresso = document.getElementById('checklistProgressoTexto');
    if (elProgresso) elProgresso.textContent = `${feitos}/${total} concluídos`;

    if (feitos === total && total > 0) {
        toast('🎉 Checklist do período concluído!');
        dispararConfete();
    }
}

// ====================== CUSTO ESTIMADO DO PEDIDO ======================

async function calcularCustoPedido() {
    if (itens.length === 0) {
        document.getElementById('custo-pedido-estimado').style.display = 'none';
        return;
    }

    const snapshot = await database.ref('receitas').once('value');
    const receitas = {};
    snapshot.forEach(child => {
        const r = child.val();
        receitas[r.sabor] = r;
    });

    let linhasHTML   = '';
    let custoTotal   = 0;
    let algumCusto   = false;

    itens.forEach(item => {
        const receita = receitas[item.sabor];
        if (!receita) return;
        const custoPorUn   = receita.custoPorUnidade || (receita.custoTotal / receita.rendimento);
        const custoItem    = custoPorUn * item.quantidade;
        custoTotal        += custoItem;
        algumCusto         = true;
        linhasHTML        += `<div class="custo-pedido-linha">
            <span>${escaparHTML(item.sabor)} × ${item.quantidade} un</span>
            <span>R$ ${custoItem.toFixed(2).replace('.',',')}</span>
        </div>`;
    });

    if (!algumCusto) {
        document.getElementById('custo-pedido-estimado').style.display = 'none';
        return;
    }

    const valorTotalPedido = parseFloat(
        (document.getElementById('valorTotal').value || 'R$ 0,00')
            .replace('R$ ','').replace(/\./g,'').replace(',','.')
    ) || 0;

    const margem = valorTotalPedido > 0
        ? ((valorTotalPedido - custoTotal) / valorTotalPedido * 100).toFixed(1)
        : null;

    document.getElementById('custo-pedido-linhas').innerHTML      = linhasHTML;
    document.getElementById('custo-pedido-total-valor').textContent = 'R$ ' + custoTotal.toFixed(2).replace('.',',');
    document.getElementById('custo-pedido-margem').textContent    = margem !== null
        ? `💹 Margem bruta: ${margem}%  |  Lucro estimado: R$ ${(valorTotalPedido - custoTotal).toFixed(2).replace('.',',')}`
        : '⚠️ Adicione o valor total para ver a margem';
    document.getElementById('custo-pedido-estimado').style.display = 'block';
}

// ====================== INIT ======================
