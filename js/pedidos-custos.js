/* ═══════════════════════════════════════════
   PEDIDOS — GASTOS, INSUMOS, COMPRAS E RECEITAS
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

let _insumoEditandoKey = null;
let ingredientesReceita = [];
let _receitaEditandoKey = null;

function maskQuantidade(valor) {
    let v = valor.replace(/[^\d,]/g, '');
    const partes = v.split(',');
    let inteiro = partes[0].replace(/^0+(?=\d)/, '');
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (partes.length > 1) {
        const decimal = partes.slice(1).join('').slice(0, 3);
        return inteiro + ',' + decimal;
    }
    return inteiro;
}

function parseQuantidade(valorMascarado) {
    if (!valorMascarado) return 0;
    const limpo = String(valorMascarado).replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

function formatarQuantidade(num) {
    if (num === null || num === undefined || isNaN(num) || num === '') return '';
    const partes = String(num).split('.');
    const inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.length > 1 ? inteiro + ',' + partes[1] : inteiro;
}

let _insumosCacheNomes = {};
let _insumoDetectadoKey = null;

function popularDatalistInsumos(insumosList) {
    const dl = document.getElementById('listaInsumosExistentes');
    if (!dl) return;
    dl.innerHTML = '';
    _insumosCacheNomes = {};
    insumosList.forEach(i => {
        _insumosCacheNomes[i.nome.trim().toLowerCase()] = i;
        const opt = document.createElement('option');
        opt.value = i.nome;
        dl.appendChild(opt);
    });
}

function verificarInsumoExistente() {
    const nomeDigitado = document.getElementById('insumoNome').value.trim().toLowerCase();
    const existente = _insumosCacheNomes[nomeDigitado];
    const blocoNovo  = document.getElementById('blocoInsumoNovo');
    const blocoRepos = document.getElementById('blocoInsumoReposicao');
    const aviso  = document.getElementById('avisoInsumoExistente');
    const titulo = document.getElementById('tituloFormInsumo');
    const btn    = document.getElementById('btnSalvarInsumo');

    if (existente) {
        _insumoDetectadoKey = existente.key;
        blocoNovo.style.display  = 'none';
        blocoRepos.style.display = 'block';
        aviso.style.display = 'block';
        aviso.textContent = '✅ Insumo já cadastrado — preencha os dados da nova compra.';
        titulo.textContent = '🔄 Repor estoque';
        btn.textContent = '✅ Registrar Compra';

        const precoUn = existente.qtdEmbalagem > 0 ? (existente.preco / existente.qtdEmbalagem) : 0;
        const labelUn = existente.unidade === 'un' ? 'un' : existente.unidade;
        const estoqueTexto = existente.nomeEmbalagem
            ? (existente.estoqueAtual / existente.qtdEmbalagem).toFixed(1) + ' ' + existente.nomeEmbalagem + '(s)'
            : existente.estoqueAtual + labelUn;
        document.getElementById('infoInsumoReposicao').textContent =
            '📦 Estoque atual: ' + estoqueTexto + ' · Custo médio: R$ ' + precoUn.toFixed(4).replace('.', ',') + '/' + labelUn;
        document.getElementById('labelReposQtd').textContent = existente.nomeEmbalagem
            ? 'Quantidade de ' + existente.nomeEmbalagem + 's compradas'
            : 'Quantidade comprada';
        document.getElementById('labelReposValor').textContent = existente.nomeEmbalagem
            ? 'Valor por ' + existente.nomeEmbalagem + ' (R$)'
            : 'Valor pago (R$)';
        const campoData = document.getElementById('reposData');
        if (campoData && !campoData.value) {
            const hoje = new Date();
            campoData.value = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');
        }
    } else {
        _insumoDetectadoKey = null;
        blocoNovo.style.display  = 'block';
        blocoRepos.style.display = 'none';
        aviso.style.display = 'none';
        titulo.textContent = '➕ Novo Insumo';
        btn.textContent = '💾 Salvar Insumo';
    }
}

function calcularPreviewReposicao() {
    if (!_insumoDetectadoKey) return;
    document.getElementById('compraInsumoSel').value = _insumoDetectadoKey;
    document.getElementById('compraQtd').value   = document.getElementById('reposQtd').value;
    document.getElementById('compraValor').value = document.getElementById('reposValor').value;
    atualizarInfoCompraInsumo();
    document.getElementById('reposPreview').innerHTML = document.getElementById('compraPreview').innerHTML;
}

function salvarOuRepor() {
    if (_insumoDetectadoKey) {
        document.getElementById('compraInsumoSel').value = _insumoDetectadoKey;
        document.getElementById('compraQtd').value      = document.getElementById('reposQtd').value;
        document.getElementById('compraValor').value    = document.getElementById('reposValor').value;
        document.getElementById('compraCategoria').value = document.getElementById('reposCategoria').value;
        document.getElementById('compraData').value      = document.getElementById('reposData').value;
        registrarCompraInsumo().then(() => {
            document.getElementById('insumoNome').value = '';
            document.getElementById('reposQtd').value = '';
            document.getElementById('reposValor').value = '';
            verificarInsumoExistente();
        });
    } else {
        salvarInsumo();
    }
}

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
    database.ref('gastos/' + key).once('value', snapGasto => {
        const g = snapGasto.val();
        if (!g) return;

        if (g.tipoMovimento === 'reposicaoInsumo' && g.insumoKey) {
            showConfirmModal('⚠️ Este gasto é de uma reposição de estoque. Excluir também vai devolver o estoque e o preço médio anteriores do insumo. Continuar?', async () => {
                try {
                    await database.ref('insumos/' + g.insumoKey).transaction(insumo => {
                        if (!insumo) return insumo; // insumo já foi excluído, não mexe
                        insumo.estoqueAtual = (g.estoqueAntigoAtual != null)
                            ? g.estoqueAntigoAtual
                            : Math.max(0, (insumo.estoqueAtual || 0) - (g.quantidade || 0));
                        if (g.precoAntigo != null) insumo.preco = g.precoAntigo;
                        return insumo;
                    });
                    if (g.historicoPrecoKey) {
                        await database.ref('historicoPrecos/' + g.insumoKey + '/' + g.historicoPrecoKey).remove();
                    }
                    await database.ref('gastos/' + key).remove();
                    toast('🗑️ Gasto excluído e estoque revertido.');
                    carregarGastos();
                    if (typeof carregarInsumos === 'function') carregarInsumos();
                } catch (err) {
                    toast('Erro: ' + err.message, 'erro');
                }
            });
        } else {
            showConfirmModal('Excluir este gasto?', () => {
                database.ref('gastos/' + key).remove()
                    .then(() => { toast('🗑️ Gasto excluído.'); carregarGastos(); })
                    .catch(err => toast('Erro: ' + err.message, 'erro'));
            });
        }
    });
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

function formatarPesoAmigavel(qtd) {
    const g = Math.round(qtd);
    if (g < 1000) return `${g}g`;
    const kg = Math.floor(g / 1000);
    const resto = g % 1000;
    return resto === 0 ? `${kg}kg` : `${kg}kg e ${resto}g`;
}

function atualizarDicaEstoqueEmbalagem() {
    const nomeEmb = document.getElementById('insumoNomeEmbalagem').value.trim();
    const unidade = document.getElementById('insumoUnidade').value;
    const qtd     = parseQuantidade(document.getElementById('insumoQtd').value);
    const labelAtual  = document.getElementById('labelEstoqueAtual');
    const labelMinimo = document.getElementById('labelEstoqueMinimo');
    const dica = document.getElementById('dicaEstoqueEmbalagem');
    const campoAtual = document.getElementById('insumoEstoqueAtual');
    const campoMinimo = document.getElementById('insumoEstoqueMinimo');
    const pesoAmigavel = (unidade === 'g' && qtd > 0) ? ` (≈ ${formatarPesoAmigavel(qtd)})` : '';
    if (nomeEmb) {
        labelAtual.textContent  = `Estoque Atual (em ${nomeEmb}s)`;
        labelMinimo.textContent = `Estoque Mínimo (em ${nomeEmb}s)`;
        campoAtual.placeholder  = 'Ex: 27';
        campoMinimo.placeholder = 'Ex: 5';
        if (qtd > 0) {
            dica.style.display = 'block';
            dica.textContent = `💡 Cada ${nomeEmb} tem ${qtd}${unidade}${pesoAmigavel}. Informe aqui a quantidade de ${nomeEmb}s, não o peso.`;
        } else { dica.style.display = 'none'; }
    } else {
        labelAtual.textContent  = 'Estoque Atual';
        labelMinimo.textContent = 'Estoque Mínimo (alerta)';
        campoAtual.placeholder  = 'Ex: 3950';
        campoMinimo.placeholder = 'Ex: 800';
        if (pesoAmigavel) { dica.style.display = 'block'; dica.textContent = `💡 ${qtd}${unidade}${pesoAmigavel}`; }
        else { dica.style.display = 'none'; }
    }
}

function atualizarDicaPesoEdicao() {
    const unidade = document.getElementById('editInsumoUnidade').value;
    const qtd     = parseQuantidade(document.getElementById('editInsumoQtd').value);
    const dica    = document.getElementById('dicaPesoEdicao');
    if (unidade === 'g' && qtd > 0) {
        dica.style.display = 'block';
        dica.textContent = `💡 ≈ ${formatarPesoAmigavel(qtd)}`;
    } else {
        dica.style.display = 'none';
    }
}


function salvarInsumo() {
    const nome     = document.getElementById('insumoNome').value.trim();
    const precoRaw = document.getElementById('insumoPreco').value;
    const preco    = parseFloat(precoRaw.replace('R$','').replace(',','.').trim()) || 0;
    const unidade  = document.getElementById('insumoUnidade').value;
    const qtd      = parseQuantidade(document.getElementById('insumoQtd').value) || 1;
    const nomeEmbalagem = document.getElementById('insumoNomeEmbalagem').value.trim();
    const estoqueAtualInput  = parseQuantidade(document.getElementById('insumoEstoqueAtual').value);
    const estoqueMinimoInput = parseQuantidade(document.getElementById('insumoEstoqueMinimo').value);

    if (!nome)    { toast('❌ Informe o nome do insumo.', 'erro'); return; }
    if (preco<=0) { toast('❌ Informe um preço válido.', 'erro'); return; }
    if (qtd<=0)   { toast('❌ Informe a quantidade por embalagem.', 'erro'); return; }

    // Se tem nome de embalagem, o que foi digitado é em "caixinhas" — converte para a unidade base (g/ml)
    const estoqueAtual  = nomeEmbalagem ? estoqueAtualInput  * qtd : estoqueAtualInput;
    const estoqueMinimo = nomeEmbalagem ? estoqueMinimoInput * qtd : estoqueMinimoInput;

    const insumo = { nome, preco, unidade, qtdEmbalagem: qtd, nomeEmbalagem, estoqueAtual, estoqueReservado: 0, estoqueMinimo, timestamp: Date.now() };
    database.ref('insumos').push(insumo).then(ref => {
        const hoje = new Date();
        const dataISO = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');
        return database.ref('historicoPrecos/' + ref.key).push({
            data: dataISO,
            precoUnitario: preco / qtd,
            precoEmbalagem: preco,
            timestamp: Date.now()
        });
    }).then(() => {
        toast('✅ Insumo salvo!');
        document.getElementById('insumoNome').value  = '';
        document.getElementById('insumoPreco').value = '';
        document.getElementById('insumoQtd').value   = '';
        document.getElementById('insumoNomeEmbalagem').value = '';
        document.getElementById('insumoEstoqueAtual').value = '';
        document.getElementById('insumoEstoqueMinimo').value = '';
        atualizarDicaEstoqueEmbalagem();
        verificarInsumoExistente();
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

async function carregarInsumos() {
    const lista = document.getElementById('lista-insumos');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('insumos').once('value', snapshot => {
        const insumos = [];
        snapshot.forEach(child => { const i = child.val(); i.key = child.key; insumos.push(i); });
        insumos.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        popularSelectCompraInsumo(insumos);
        popularDatalistInsumos(insumos);
        if (insumos.length === 0) {
            lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum insumo cadastrado ainda.</p>';
            return;
        }
        lista.innerHTML = '';
        insumos.forEach(i => {
            const precoPorUnidade = 'R$ ' + (i.preco / i.qtdEmbalagem).toFixed(2).replace('.', ',') + '/' + (i.unidade === 'un' ? 'un' : i.unidade);
            const estoqueAtual     = i.estoqueAtual || 0;
            const estoqueReservado = i.estoqueReservado || 0;
            const disponivel       = estoqueAtual - estoqueReservado;
            const estoqueMinimo    = i.estoqueMinimo || 0;
            const alerta = estoqueMinimo > 0 && disponivel <= estoqueMinimo;
            const temEmbalagem = !!i.nomeEmbalagem;

            let estoqueLinha, estoqueMinimoTexto, placeholderEntrada;
            if (temEmbalagem) {
                const embalagens          = estoqueAtual / i.qtdEmbalagem;
                const embalagensReservado = estoqueReservado / i.qtdEmbalagem;
                const embalagensDisponivel = disponivel / i.qtdEmbalagem;
                const embalagensMin = i.estoqueMinimo ? (i.estoqueMinimo / i.qtdEmbalagem) : 0;
                const fmt = n => Number.isInteger(n) ? n : n.toFixed(1);
                estoqueLinha = `${fmt(embalagens)} ${i.nomeEmbalagem}${embalagens === 1 ? '' : 's'}`;
                if (estoqueReservado > 0) {
                    estoqueLinha += ` <span style="font-weight:500;color:var(--brown-warm);">(${fmt(embalagensReservado)} reservada${embalagensReservado === 1 ? '' : 's'} em pedidos · disponível: ${fmt(embalagensDisponivel)})</span>`;
                }
                estoqueMinimoTexto = embalagensMin > 0 ? ` (mín: ${embalagensMin} ${i.nomeEmbalagem}s)` : '';
                placeholderEntrada = `${i.nomeEmbalagem}s a adicionar`;
            } else {
                const labelUn = i.unidade !== 'un' ? i.unidade : ' un';
                estoqueLinha = `${estoqueAtual}${labelUn}`;
                if (estoqueReservado > 0) {
                    estoqueLinha += ` <span style="font-weight:500;color:var(--brown-warm);">(${estoqueReservado}${labelUn} reservado em pedidos · disponível: ${disponivel}${labelUn})</span>`;
                }
                estoqueMinimoTexto = estoqueMinimo > 0 ? ` (mín: ${estoqueMinimo}${i.unidade})` : '';
                placeholderEntrada = 'Qtd a adicionar';
            }

            let sugestaoHTML = '';
            if (alerta) {
                sugestaoHTML = `<div class="insumo-sugestao">💡 Veja quanto comprar na aba <strong>🔮 Previsão</strong></div>`;
            }

            const div = document.createElement('div');
            div.className = 'insumo-card';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'stretch';
            div.style.position = 'relative';
            if (alerta) div.style.border = '2px solid #DC2626';
            div.innerHTML = `
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
                <div style="display:flex;gap:6px;margin-top:10px;width:100%;">
                    <input type="number" id="entrada-${i.key}" placeholder="${placeholderEntrada}" style="margin-bottom:0;flex:1;min-width:0;font-size:0.85em;padding:8px 12px;">
                    <button class="btn btn-finalizar-card" style="padding:8px 14px;font-size:0.8em;white-space:nowrap;flex-shrink:0;" onclick="darEntradaEstoque('${i.key}')">➕ Entrada</button>
                    <button class="btn-mais" style="flex-shrink:0;" onclick="toggleMenuMais('menuMaisInsumo-${i.key}', event)" aria-label="Mais opções">⋯</button>
                </div>
                <div class="menu-mais" id="menuMaisInsumo-${i.key}" style="display:none;">
                    <button onclick="abrirEdicaoInsumo('${i.key}');fecharMenuMais('menuMaisInsumo-${i.key}')">✏️ Editar</button>
                    <button onclick="verHistoricoPreco('${i.key}','${escaparHTML(i.nome).replace(/'/g,"\\'")}');fecharMenuMais('menuMaisInsumo-${i.key}')">📈 Histórico de preço</button>
                    <hr>
                    <button class="menu-mais-excluir" onclick="excluirInsumo('${i.key}');fecharMenuMais('menuMaisInsumo-${i.key}')">🗑️ Excluir</button>
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
        document.getElementById('editInsumoUnidade').value = (i.unidade === 'kg' ? 'g' : i.unidade) || 'un';
        document.getElementById('editInsumoQtd').value = formatarQuantidade(i.qtdEmbalagem || '');
        document.getElementById('editInsumoNomeEmbalagem').value = nomeEmb;
        document.getElementById('editInsumoEstoqueAtual').value  = formatarQuantidade(nomeEmb ? (i.estoqueAtual  || 0) / qtdEmb : (i.estoqueAtual  || 0));
        document.getElementById('editInsumoEstoqueMinimo').value = formatarQuantidade(nomeEmb ? (i.estoqueMinimo || 0) / qtdEmb : (i.estoqueMinimo || 0));
        toggleNomeEmbalagemEdicao();
        atualizarDicaPesoEdicao();
        document.getElementById('modalEditarInsumo').style.display = 'flex';
    });
}


function toggleNomeEmbalagemEdicao() {
    const unidade = document.getElementById('editInsumoUnidade').value;
    document.getElementById('editWrapperNomeEmbalagem').style.display = unidade === 'un' ? 'none' : 'block';
    if (unidade === 'un') document.getElementById('editInsumoNomeEmbalagem').value = '';
    atualizarDicaPesoEdicao();
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
    const qtd      = parseQuantidade(document.getElementById('editInsumoQtd').value) || 1;
    const nomeEmbalagem = document.getElementById('editInsumoNomeEmbalagem').value.trim();
    const estoqueAtualInput  = parseQuantidade(document.getElementById('editInsumoEstoqueAtual').value);
    const estoqueMinimoInput = parseQuantidade(document.getElementById('editInsumoEstoqueMinimo').value);

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
                    .then(() => database.ref('historicoPrecos/' + key).remove())
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
                <span>${seta} R$ ${r.precoUnitario.toFixed(2).replace('.',',')}</span>
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
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + formatarBRL(ctx.parsed.y) } } },
                    scales: { y: { ticks: { callback: v => formatarBRL(v) } } }
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
        info.textContent = `📦 Estoque atual: ${estoqueG}${labelUn} · Custo atual: R$ ${custoUn.toFixed(2).replace('.',',')}/${labelUn}`;
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
        preview.innerHTML = `📊 Novo estoque: <strong>${estoqueEmbFmt} ${nomeEmb}(s)</strong> · Novo custo médio: <strong>R$ ${custoUnMedio.toFixed(2).replace('.',',')}/${labelUn}</strong> · Total pago: <strong>R$ ${valorPagoTotal.toFixed(2).replace('.',',')}</strong>`;
    } else {
        preview.innerHTML = `📊 Novo estoque: <strong>${estoqueTotal}${labelUn}</strong> · Novo custo médio: <strong>R$ ${custoUnMedio.toFixed(2).replace('.',',')}/${labelUn}</strong>`;
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

        const historicoRef = await database.ref('historicoPrecos/' + key).push({
            data,
            precoUnitario: custoUnNovo,
            precoEmbalagem: novoPreco,
            timestamp: Date.now()
        });

        await database.ref('gastos').push({
            data, categoria,
            descricao: insumo.nome,
            quantidade: qtdComprada_base,
            valor: valorPagoTotal,
            timestamp: Date.now(),
            insumoKey: key,
            tipoMovimento: 'reposicaoInsumo',
            estoqueAntigoAtual: estoqueAntigo,
            precoAntigo: insumo.preco,
            historicoPrecoKey: historicoRef.key
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


function iconePorInsumo(nome) {
    const n = (nome || '').toLowerCase();
    if (n.includes('leite')) return '🥛';
    if (n.includes('chocolate') || n.includes('cacau')) return '🍫';
    if (n.includes('nescau') || n.includes('achocolatado')) return '🥤';
    if (n.includes('manteiga')) return '🧈';
    if (n.includes('açúcar') || n.includes('acucar')) return '🧂';
    if (n.includes('morango') || n.includes('fruta')) return '🍓';
    if (n.includes('coco')) return '🥥';
    if (n.includes('forminha') || n.includes('embalagem') || n.includes('caixinha')) return '📦';
    return '🧴';
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

    // Data mais próxima, dentro da janela escolhida, em que cada insumo é consumido —
    // usada só pra indicar urgência ("risco a partir de..."), não pra calcular quantidade.
    const primeiraDataAfetada = {};
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
            receita.ingredientes.forEach(ing => {
                if (!primeiraDataAfetada[ing.insumoKey] || dataP < primeiraDataAfetada[ing.insumoKey]) {
                    primeiraDataAfetada[ing.insumoKey] = dataP;
                }
            });
        });
    });

    // Quantidade a comprar = déficit já existente pros pedidos agendados (qualquer prazo)
    // + margem de segurança de 3 semanas baseada no consumo médio histórico.
    const SEMANAS_BUFFER = 3;
    const itensComprar = [];

    Object.values(insumosMap).forEach(insumo => {
        const estoqueAtual     = insumo.estoqueAtual || 0;
        const estoqueReservado = insumo.estoqueReservado || 0;
        // Necessário: fato, calculado a partir de pedidos já confirmados no banco.
        const necessario       = Math.max(0, estoqueReservado - estoqueAtual);

        if (necessario <= 0) return;

        const qtdEmbalagem = insumo.qtdEmbalagem || 1;
        const embalagensNecessario = insumo.unidade === 'un' ? Math.ceil(necessario) : Math.ceil(necessario / qtdEmbalagem);

        itensComprar.push({
            key: insumo.key, nome: insumo.nome, unidade: insumo.unidade,
            nomeEmbalagem: insumo.nomeEmbalagem || '', qtdEmbalagem, preco: insumo.preco,
            necessario, embalagensNecessario,
            custoNecessario: (insumo.preco / qtdEmbalagem) * necessario,
            dataRisco: primeiraDataAfetada[insumo.key] || null
        });
    });

    itensComprar.sort((a,b) => {
        if (a.dataRisco && b.dataRisco) return a.dataRisco - b.dataRisco;
        if (a.dataRisco) return -1;
        if (b.dataRisco) return 1;
        return b.necessario - a.necessario;
    });

    if (itensComprar.length === 0) {
        painel.innerHTML = `<div style="text-align:center;padding:36px 16px;background:var(--cream);border-radius:18px;">
            <div style="font-size:2.2em;margin-bottom:8px;">🌸</div>
            <div style="font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.15em;color:var(--brown-dark);">Tudo certo por aqui!</div>
            <div style="font-size:0.85em;color:var(--brown-warm);margin-top:4px;">Estoque cobre os pedidos agendados nos próximos ${dias} dias.</div>
        </div>`;
        return;
    }

    const custoTotalCompra = itensComprar.reduce((s,i) => s + i.custoNecessario, 0);

    const fmt = n => Number.isInteger(n) ? n : n.toFixed(1);
    const labelQtd = (qtdEmb, nomeEmb, unidade) =>
        nomeEmb
            ? `${qtdEmb} ${nomeEmb}${qtdEmb === 1 ? '' : 's'}`
            : unidade === 'un' ? `${qtdEmb} un.` : `${qtdEmb} embalagem${qtdEmb > 1 ? 's' : ''}`;

    const hojeMs = hoje.getTime();
    let html = `<p style="font-size:0.8em;color:var(--brown-warm);margin-bottom:12px;">${itensComprar.length} insumo${itensComprar.length > 1 ? 's precisam' : ' precisa'} de reposição</p>`;

    itensComprar.forEach(i => {
        const label = labelQtd(i.embalagensNecessario, i.nomeEmbalagem, i.unidade);

        let accent = 'var(--brown-warm)', accentBg = 'var(--cream)', riscoTexto = '📅 Sem prazo definido';
        if (i.dataRisco) {
            const diffDias = Math.round((i.dataRisco.getTime() - hojeMs) / 86400000);
            const dia = String(i.dataRisco.getDate()).padStart(2,'0');
            const mes = String(i.dataRisco.getMonth()+1).padStart(2,'0');
            if (diffDias <= 2)      { accent = '#DC2626'; accentBg = '#FEE2E2'; riscoTexto = `🔴 Risco em ${diffDias <= 0 ? 'até hoje' : diffDias + ' dia' + (diffDias > 1 ? 's' : '')} (${dia}/${mes})`; }
            else if (diffDias <= 7) { accent = '#B45309'; accentBg = '#FEF3C7'; riscoTexto = `⏰ Risco a partir de ${dia}/${mes}`; }
            else                    { accent = 'var(--brown-warm)'; accentBg = 'var(--cream)'; riscoTexto = `📅 Risco a partir de ${dia}/${mes}`; }
        }

        html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;background:var(--white);border-left:5px solid ${accent};border-radius:16px;padding:14px 16px;margin-bottom:10px;box-shadow:0 3px 12px var(--shadow);transition:transform 0.18s ease, box-shadow 0.18s ease;"
            onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px var(--shadow)';"
            onmouseleave="this.style.transform='';this.style.boxShadow='0 3px 12px var(--shadow)';">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <div style="width:42px;height:42px;border-radius:12px;background:${accentBg};display:flex;align-items:center;justify-content:center;font-size:1.3em;flex-shrink:0;">${iconePorInsumo(i.nome)}</div>
                <div style="min-width:0;">
                    <div style="font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.12em;color:var(--brown-dark);line-height:1.2;">${escaparHTML(i.nome)}</div>
                    <div style="font-size:0.78em;font-weight:600;color:${accent};margin-top:3px;">${riscoTexto}</div>
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-family:'DM Sans',sans-serif;font-size:1.15em;font-weight:700;color:var(--brown-dark);white-space:nowrap;">${label}</div>
                <div style="font-size:0.74em;color:var(--brown-warm);">≈ R$ ${i.custoNecessario.toFixed(2).replace('.',',')}</div>
            </div>
        </div>`;
    });

    html += `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--cream);border-radius:16px;padding:16px 18px;margin-top:6px;">
        <span style="font-family:'Cormorant Garamond',serif;font-weight:700;color:var(--brown-dark);font-size:1.05em;">Custo total estimado</span>
        <span style="font-family:'DM Sans',sans-serif;font-weight:700;font-size:1.3em;color:var(--amber);">R$ ${custoTotalCompra.toFixed(2).replace('.',',')}</span>
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
        document.getElementById('receitaRendimento').value = '25';
        ingredientesReceita = [];
        _receitaEditandoKey = null;
        const btnSalvar = document.querySelector('#aba-receitas .btn-verde.btn-bloco');
        if (btnSalvar) btnSalvar.textContent = '💾 Salvar Receita';
        document.getElementById('btnCancelarEdicaoReceita').style.display = 'none';
        renderizarIngredientesReceita();
        carregarReceitasLista();
    }).catch(err => toast('❌ Erro: ' + err.message, 'erro'));
}


function carregarReceitasLista() {
    const lista = document.getElementById('lista-receitas');
    lista.innerHTML = '<p style="color:var(--brown-warm);">Carregando...</p>';
    database.ref('receitas').once('value', snapshot => {
        const receitasPorSabor = {};
        snapshot.forEach(child => { const r = child.val(); r.key = child.key; receitasPorSabor[r.sabor] = r; });

        const todosSabores = [
            ...(DADOS_PEDIDOS?.sabores?.trads    || []),
            ...(DADOS_PEDIDOS?.sabores?.gourmets || []),
            ...(DADOS_PEDIDOS?.sabores?.frutas   || [])
        ].sort((a,b) => a.localeCompare(b, 'pt-BR'));

        if (todosSabores.length === 0) {
            lista.innerHTML = '<p style="color:var(--brown-warm);">Nenhum sabor cadastrado no catálogo ainda.</p>';
            return;
        }

        lista.innerHTML = '';

        todosSabores.forEach(nomeSabor => {
            const r = receitasPorSabor[nomeSabor];
            if (!r) {
                const cardVazio = document.createElement('div');
                cardVazio.className = 'receita-card receita-card-vazio';
                cardVazio.innerHTML = `
                    <div class="receita-sabor" style="margin-bottom:14px;">🍫 ${escaparHTML(nomeSabor)}</div>
                    <button class="btn btn-laranja btn-bloco" style="margin-bottom:0;" onclick="irCadastrarReceita('${nomeSabor.replace(/'/g,"\\'")}')">+ Cadastrar receita</button>
                `;
                lista.appendChild(cardVazio);
                return;
            }
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
            card.style.position = 'relative';
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
                        <input type="text" id="simPreco-${r.key}" placeholder="0,00" style="margin-bottom:0;flex:1;min-width:0;font-size:0.85em;padding:7px 10px;" oninput="this.value=maskMoeda(this.value);simularMargemReceita('${r.key}',${custoPorUn})">
                        <span style="font-size:0.8em;color:var(--brown-warm);">/un</span>
                        <button class="btn-mais" style="flex-shrink:0;" onclick="toggleMenuMais('menuMaisReceita-${r.key}', event)" aria-label="Mais opções">⋯</button>
                    </div>
                    <p id="simResultado-${r.key}" style="font-size:0.82em;margin-top:6px;font-weight:600;"></p>
                </div>
                <div class="menu-mais" id="menuMaisReceita-${r.key}" style="display:none;">
                    <button onclick="editarReceita('${r.key}');fecharMenuMais('menuMaisReceita-${r.key}')">✏️ Editar</button>
                    <button onclick="duplicarReceita('${r.key}');fecharMenuMais('menuMaisReceita-${r.key}')">📄 Duplicar</button>
                    <hr>
                    <button class="menu-mais-excluir" onclick="excluirReceita('${r.key}');fecharMenuMais('menuMaisReceita-${r.key}')">🗑️ Excluir receita</button>
                </div>`;
            lista.appendChild(card);
        });
    });
}

function irCadastrarReceita(sabor) {
    document.getElementById('receitaSabor').value = sabor;
    document.getElementById('receitaSabor').scrollIntoView({ behavior:'smooth', block:'center' });
    document.getElementById('receitaSabor').focus();
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
        document.getElementById('btnCancelarEdicaoReceita').style.display = 'block';
        toast('✏️ Edite os campos e clique em "Atualizar Receita".', 'aviso');
        document.getElementById('receitaSabor').scrollIntoView({ behavior:'smooth', block:'center' });
    });
}


function cancelarEdicaoReceita() {
    _receitaEditandoKey = null;
    document.getElementById('receitaSabor').value = '';
    document.getElementById('receitaRendimento').value = '25';
    ingredientesReceita = [];
    renderizarIngredientesReceita();
    const btnSalvar = document.querySelector('#aba-receitas .btn-verde.btn-bloco');
    if (btnSalvar) btnSalvar.textContent = '💾 Salvar Receita';
    document.getElementById('btnCancelarEdicaoReceita').style.display = 'none';
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
