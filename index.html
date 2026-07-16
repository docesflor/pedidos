/* ═══════════════════════════════════════════
   PEDIDOS — DASHBOARD, GRÁFICOS E RELATÓRIOS
   Depende de: shared/*, pedidos-auth.js, pedidos-precos.js, pedidos-crud.js
═══════════════════════════════════════════ */

let graficoFaturamento = null;
let graficoGastosCategoria = null;
let graficoHistoricoPreco = null;
let _dadosLucratividadeSabores = [];
const CORES_CATEGORIA_GASTO = { 'Ingredientes':'#E8943A', 'Embalagens':'#5C2A0E', 'Gás/Energia':'#DC2626', 'Entrega':'#5b8def', 'Outros':'#8B4513' };

/* ── CONTADOR ANIMADO DO DASHBOARD ── */
function animarNumeroDash(el, valorFinal, formatarFn) {
    if (!el) return;
    const valorInicial = parseFloat(el.dataset.valorAtual || '0') || 0;
    el.dataset.valorAtual = valorFinal;
    const duracao = 600;
    const inicio = performance.now();
    function passo(agora) {
        const t = Math.min(1, (agora - inicio) / duracao);
        const atual = valorInicial + (valorFinal - valorInicial) * (1 - Math.pow(1 - t, 3));
        el.textContent = formatarFn(atual);
        if (t < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
}

async function carregarDashboard() {
    const mesVal = document.getElementById('dashMes').value;
    const mes    = mesVal === 'geral' ? null : parseInt(mesVal);
    const ano    = parseInt(document.getElementById('dashAno').value);
    function limparValor(v) {
        if (v===null||v===undefined||v==='') return 0;
        if (typeof v==='number') return isNaN(v)?0:v;
        const str = String(v).replace(/R\$\s*/g,'').trim().replace(/\./g,'').replace(',','.');
        const num = parseFloat(str); return isNaN(num)?0:num;
    }
    const snapshotReceitas = await database.ref('receitas').once('value');
    const receitasMap = {};
    snapshotReceitas.forEach(child => {
        const r = child.val();
        receitasMap[r.sabor] = r;
    });
    database.ref('pedidos').once('value', snapshot => {
        let faturamento=0, faturamentoMesAnterior=0, totalPendente=0, qtdPendente=0, entregues=0, andamento=0, pedidosFaturados=0;
        const sabores={}, pagamentos={};
        let totalBrigadeiros=0;
        let mesAnterior = mes!==null?mes-1:null, anoMesAnterior=ano;
        if (mesAnterior===-1) { mesAnterior=11; anoMesAnterior=ano-1; }
        snapshot.forEach(child => {
            const p=child.val(); if (!p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('/');dataP=new Date(pts[2],pts[1]-1,pts[0]);}
            else if(/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('-');dataP=new Date(pts[0],pts[1]-1,pts[2]);}
            else return;
            if(dataP.getFullYear()!==ano&&dataP.getFullYear()!==anoMesAnterior) return;
            const status=p.statusPagamento||'', finalizado=status==='entregue', pago=status==='Pago', parcial=status==='Pago Parcialmente';
            if(mes!==null&&dataP.getFullYear()===anoMesAnterior&&dataP.getMonth()===mesAnterior){
                if(finalizado||pago) faturamentoMesAnterior+=limparValor(p.valorTotal);
                else if(parcial){const vp=limparValor(p.valorPago),vt=limparValor(p.valorTotal);faturamentoMesAnterior+=vp>0?vp:vt;}
            }
            if(dataP.getFullYear()!==ano) return;
            if(mes!==null&&dataP.getMonth()!==mes) return;
            if(finalizado) entregues++; else andamento++;
            if(finalizado||pago) { faturamento+=limparValor(p.valorTotal); pedidosFaturados++; }
            else if(parcial){const vp=limparValor(p.valorPago),vt=limparValor(p.valorTotal);faturamento+=vp>0?vp:vt;}
            pagamentos[status]=(pagamentos[status]||0)+1;
            if(status==='A pagar'){totalPendente+=limparValor(p.valorTotal);qtdPendente++;}
            else if(parcial){const vPago=limparValor(p.valorPago),vTotal=limparValor(p.valorTotal);totalPendente+=Math.max(0,vTotal-vPago);qtdPendente++;}
            (p.itens||[]).forEach(item=>{const nome=item.sabor||item.nome||'Desconhecido';sabores[nome]=(sabores[nome]||0)+(parseInt(item.quantidade)||0);totalBrigadeiros+=parseInt(item.quantidade)||0;});
        });
        const ticket = pedidosFaturados>0?faturamento/pedidosFaturados:0;
        animarNumeroDash(document.getElementById('dashFaturamento'), faturamento, v => 'R$ '+v.toFixed(2).replace('.',','));
        const elComp = document.getElementById('dashFaturamentoComparativo');
        const mesesNome=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        if(mes!==null&&faturamentoMesAnterior>0){const diff=((faturamento-faturamentoMesAnterior)/faturamentoMesAnterior)*100;const seta=diff>=0?'↑':'↓';elComp.style.color=diff>=0?'var(--green)':'var(--red)';elComp.textContent=`${seta} ${Math.abs(diff).toFixed(0)}% vs ${mesesNome[mesAnterior]}`;}
        else if(mes!==null){elComp.style.color='var(--brown-warm)';elComp.textContent='— sem dados anteriores';}
        else elComp.textContent='';
        animarNumeroDash(document.getElementById('dashTicket'), ticket, v => 'R$ '+v.toFixed(2).replace('.',','));
        animarNumeroDash(document.getElementById('dashEntregues'), entregues, v => Math.round(v).toLocaleString('pt-BR'));
        animarNumeroDash(document.getElementById('dashAndamento'), andamento, v => Math.round(v).toLocaleString('pt-BR'));
        const pendentesOrdenados=[];
        snapshot.forEach(child=>{
            const p=child.val(); if(!p.dataEntrega) return;
            let dataP;
            if(/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('/');dataP=new Date(pts[2],pts[1]-1,pts[0]);}
            else if(/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('-');dataP=new Date(pts[0],pts[1]-1,pts[2]);}
            else return;
            if(dataP.getFullYear()!==ano) return;
            if(mes!==null&&dataP.getMonth()!==mes) return;
            const st=p.statusPagamento||'';
            if(st!=='A pagar'&&st!=='Pago Parcialmente') return;
            const vTotal=limparValor(p.valorTotal),vPago=limparValor(p.valorPago);
            const vPend=st==='Pago Parcialmente'?Math.max(0,vTotal-vPago):vTotal;
            if(vPend<=0) return;
            pendentesOrdenados.push({p,dataP,vPend});
        });
        pendentesOrdenados.sort((a,b)=>a.dataP-b.dataP);
        let htmlPendentes='';
        pendentesOrdenados.forEach(({p,vPend})=>{
            const st=p.statusPagamento||'', vPago=limparValor(p.valorPago);
            const dataFormatada = formatarDataComDia(p.dataEntrega);
            const statusLabel=st==='Pago Parcialmente'?`<span style="color:var(--amber);font-size:0.75em;font-weight:700;">Parcial</span>`:`<span style="color:var(--red);font-size:0.75em;font-weight:700;">A pagar</span>`;
            htmlPendentes+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.85em;"><div><strong>${escaparHTML(p.nome||'N/A')}</strong><span style="color:var(--brown-warm);font-size:0.82em;margin-left:6px;">📅 ${dataFormatada}</span><br>${statusLabel}${st==='Pago Parcialmente'&&vPago>0?`<span style="color:var(--brown-warm);font-size:0.75em;">(pago R$ ${vPago.toFixed(2).replace('.',',')})</span>`:''}</div><strong style="color:var(--amber);white-space:nowrap;margin-left:8px;">R$ ${vPend.toFixed(2).replace('.',',')}</strong></div>`;
        });
        if(qtdPendente>0){document.getElementById('cardPendencias').style.display='block';document.getElementById('dashPendenciasValor').textContent='R$ '+totalPendente.toFixed(2).replace('.',',');document.getElementById('dashPendenciasDetalhe').textContent=`${qtdPendente} pedido${qtdPendente>1?'s':''} com pagamento pendente`;document.getElementById('dashPendenciasLista').innerHTML=htmlPendentes;}
        else document.getElementById('cardPendencias').style.display='none';
        const mediaBrig=(entregues+andamento)>0?Math.round(totalBrigadeiros/(entregues+andamento)):0;
        animarNumeroDash(document.getElementById('dashTotalBrig'), totalBrigadeiros, v => Math.round(v).toLocaleString('pt-BR'));
        animarNumeroDash(document.getElementById('dashMediaBrig'), mediaBrig, v => Math.round(v).toLocaleString('pt-BR'));
        // Card "Custo Médio por Brigadeiro" removido: era uma média simples entre receitas
        // (sem pesar pela quantidade vendida), redundante e menos preciso que o card
        // "Custo de Produção Estimado" logo abaixo. Isso só esconde o card se ele ainda
        // existir na tela de uma sessão anterior.
        const cardCustoMedioAntigo = document.getElementById('cardCustoMedioDash');
        if (cardCustoMedioAntigo) cardCustoMedioAntigo.style.display = 'none';
        const saboresOrdenados=Object.entries(sabores).sort((a,b)=>b[1]-a[1]);
        const maxSabor=saboresOrdenados[0]?.[1]||1;
        document.getElementById('dashSabores').innerHTML=saboresOrdenados.length===0?'<p style="color:var(--brown-warm);font-size:0.88em;">Nenhum dado.</p>':saboresOrdenados.map(([nome,qtd])=>`<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:3px;"><span>${nome}</span><strong>${qtd} un.</strong></div><div style="background:var(--cream-dark);border-radius:6px;height:6px;"><div style="background:var(--amber);height:6px;border-radius:6px;width:${Math.round((qtd/maxSabor)*100)}%;"></div></div></div>`).join('');
        calcularLucratividadeSabores(sabores, receitasMap, faturamento, totalBrigadeiros);
        calcularAvaliacoes(ano, mes);
        document.getElementById('dashPagamentos').innerHTML=Object.entries(pagamentos).length===0?'<p style="color:var(--brown-warm);font-size:0.88em;">Nenhum dado.</p>':Object.entries(pagamentos).map(([sk,qtd])=>{const nomes={'entregue':'Entregue','A pagar':'A pagar','Pago Parcialmente':'Pago Parcialmente','Pago':'Pago'};return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.88em;"><span>${nomes[sk]||sk}</span><strong>${qtd} pedido${qtd>1?'s':''}</strong></div>`;}).join('');
        let custoProducaoEstimado = 0;
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2], pts[1]-1, pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0], pts[1]-1, pts[2]); }
            else return;
            if (dataP.getFullYear() !== ano) return;
            if (mes !== null && dataP.getMonth() !== mes) return;
            (p.itens || []).forEach(item => {
                const receita = receitasMap[item.sabor];
                if (!receita) return;
                const custoPorUn = receita.custoPorUnidade || (receita.custoTotal / receita.rendimento);
                custoProducaoEstimado += custoPorUn * (parseInt(item.quantidade) || 0);
            });
        });
        database.ref('gastos').once('value', snapGastos=>{
            let totalGastos=0; const categorias={};
            snapGastos.forEach(child=>{
                const g=child.val(); if(!g.data) return;
                let dataG;
                if(/^\d{4}-\d{2}-\d{2}$/.test(g.data)){const pts=g.data.split('-');dataG=new Date(pts[0],pts[1]-1,pts[2]);}else return;
                if(dataG.getFullYear()!==ano) return;
                if(mes!==null&&dataG.getMonth()!==mes) return;
                totalGastos+=g.valor||0;
                const cat=g.categoria||'Outros';categorias[cat]=(categorias[cat]||0)+(g.valor||0);
            });
            database.ref('eventos').once('value', snapEventos => {
                let totalEventos = 0;
                const eventosLista = [];
                snapEventos.forEach(child => {
                    const e = child.val();
                    if (!e.inicio) return;
                    const anoEvento = parseInt(e.inicio.split('-')[0]);
                    const mesEvento = parseInt(e.inicio.split('-')[1]) - 1;
                    if (anoEvento !== ano) return;
                    if (mes !== null && mesEvento !== mes) return;
                    const vendas = e.vendas ? Object.values(e.vendas) : [];
                    const totalEvento = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
                    if (totalEvento <= 0) return;
                    totalEventos += totalEvento;
                    eventosLista.push({ nome: e.nome, total: totalEvento });
                });
                const faturamentoTotal = faturamento + totalEventos;
                const lucro = faturamentoTotal - totalGastos;
                document.getElementById('dashGastos').textContent = formatarBRL(totalGastos);
                document.getElementById('dashLucro').textContent = formatarBRL(lucro);
                document.getElementById('dashLucro').style.color = lucro >= 0 ? '#065F46' : 'var(--red)';
                document.getElementById('dashFaturamento').textContent = formatarBRL(faturamentoTotal);

                // ── Projeção do mês ──
                let projecao = 0;
                if (mes !== null) {
                    snapshot.forEach(child => {
                        const p = child.val();
                        if (!p.dataEntrega) return;
                        const st = p.statusPagamento || '';
                        if (st === 'entregue' || st === 'Pago') return;
                        let dataP;
                        if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) {
                            const pts = p.dataEntrega.split('/');
                            dataP = new Date(pts[2], pts[1]-1, pts[0]);
                        } else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) {
                            const pts = p.dataEntrega.split('-');
                            dataP = new Date(pts[0], pts[1]-1, pts[2]);
                        } else return;
                        if (dataP.getFullYear() !== ano || dataP.getMonth() !== mes) return;
                        if (st === 'Pago Parcialmente') {
                            const vt = limparValor(p.valorTotal), vp = limparValor(p.valorPago);
                            projecao += Math.max(0, vt - vp); // só o que falta, o que já foi pago já está no faturamento
                        } else {
                            projecao += limparValor(p.valorTotal);
                        }
                    });
                }
                let elProjecao = document.getElementById('dashProjecao');
                if (!elProjecao) {
                    elProjecao = document.createElement('p');
                    elProjecao.id = 'dashProjecao';
                    elProjecao.style.cssText = 'font-size:0.82em;margin-top:6px;font-weight:600;padding:6px 10px;background:rgba(232,148,58,0.12);border-radius:8px;';
                    document.getElementById('dashFaturamento').parentElement.appendChild(elProjecao);
                }
                if (mes !== null && projecao > 0) {
                    const totalComProjecao = faturamentoTotal + projecao;
                    elProjecao.style.color = 'var(--brown-warm)';
                    elProjecao.style.display = 'block';
                    elProjecao.innerHTML = '📈 Projeção: <strong style="color:var(--brown-dark);">' + formatarBRL(totalComProjecao) + '</strong>'
                        + ' <span style="font-size:0.85em;opacity:0.8;">(+' + formatarBRL(projecao) + ' em aberto)</span>';
                } else {
                    elProjecao.style.display = 'none';
                }
                const cardEventos = document.getElementById('cardEventosDash');
                const listaEventos = document.getElementById('dashEventosLista');
                const totalEventosEl = document.getElementById('dashEventosTotal');
                if (eventosLista.length > 0) {
                    cardEventos.style.display = 'block';
                    listaEventos.innerHTML = eventosLista.map(e => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.85em;"><div><span>🔒 ${escaparHTML(e.nome)}</span></div><strong style="color:var(--amber);">R$ ${e.total.toFixed(2).replace('.', ',')}</strong></div>`).join('');
                    totalEventosEl.textContent = 'R$ ' + totalEventos.toFixed(2).replace('.', ',');
                } else { cardEventos.style.display = 'none'; }
                // card custo de produção no dashboard (posição fixa no HTML, só preenche/mostra aqui)
                const cardCustoProd = document.getElementById('cardCustoProdDash');
                if (custoProducaoEstimado > 0 && cardCustoProd) {
                    const margemBruta = faturamentoTotal > 0
                        ? ((faturamentoTotal - custoProducaoEstimado) / faturamentoTotal * 100).toFixed(1)
                        : null;
                    cardCustoProd.style.display = 'block';
                    cardCustoProd.innerHTML = `
                        <p class="form-card-titulo">🧮 Custo de Produção Estimado</p>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                            <div style="flex:1;background:#FEF3C7;border-radius:16px;padding:16px;text-align:center;min-width:120px;">
                                <p style="font-size:0.72em;color:#92400E;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;">Custo Produção</p>
                                <p style="font-family:'DM Sans',sans-serif;font-size:1.5em;font-weight:700;color:#92400E;">${formatarBRL(custoProducaoEstimado)}</p>
                                <p style="font-size:0.72em;color:#92400E;margin-top:2px;">apenas sabores com receita cadastrada</p>
                            </div>
                            ${margemBruta !== null ? `
                            <div style="flex:1;background:#D1FAE5;border-radius:16px;padding:16px;text-align:center;min-width:120px;">
                                <p style="font-size:0.72em;color:#065F46;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;">Margem Bruta</p>
                                <p style="font-family:'DM Sans',sans-serif;font-size:1.5em;font-weight:700;color:#065F46;">${margemBruta}%</p>
                                <p style="font-size:0.72em;color:#065F46;margin-top:2px;">lucro estimado: ${formatarBRL(faturamentoTotal - custoProducaoEstimado)}</p>
                            </div>` : ''}
                        </div>`;
                } else if (cardCustoProd) {
                    cardCustoProd.style.display = 'none';
                }
                const catOrdenadas=Object.entries(categorias).sort((a,b)=>b[1]-a[1]);
                const maxCat=catOrdenadas[0]?.[1]||1;
                document.getElementById('dashGastosCategorias').innerHTML=catOrdenadas.length===0?'<p style="color:var(--brown-warm);font-size:0.88em;">Nenhum gasto no período.</p>':catOrdenadas.map(([cat,val])=>{const cor=CORES_CATEGORIA_GASTO[cat]||'var(--brown-warm)';return `<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:3px;"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cor};margin-right:6px;"></span>${cat}</span><strong>R$ ${val.toFixed(2).replace('.',',')}</strong></div><div style="background:var(--cream-dark);border-radius:6px;height:6px;"><div style="background:${cor};height:6px;border-radius:6px;width:${Math.round((val/maxCat)*100)}%;"></div></div></div>`;}).join('');
                const mesesNomeG=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                const fatMensal={}; for(let i=0;i<12;i++) fatMensal[i]=0;
                snapshot.forEach(child=>{
                    const p=child.val(); if(!p.dataEntrega) return;
                    let dataP;
                    if(/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('/');dataP=new Date(pts[2],pts[1]-1,pts[0]);}
                    else if(/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('-');dataP=new Date(pts[0],pts[1]-1,pts[2]);}
                    else return;
                    if(dataP.getFullYear()!==ano) return;
                    const st=p.statusPagamento||'';
                    if(st==='entregue'||st==='Pago') fatMensal[dataP.getMonth()]+=limparValor(p.valorTotal);
                    else if(st==='Pago Parcialmente'){const vp=limparValor(p.valorPago),vt=limparValor(p.valorTotal);fatMensal[dataP.getMonth()]+=vp>0?vp:vt;}
                });
                if(graficoFaturamento){graficoFaturamento.destroy();graficoFaturamento=null;}
                const coresBarra=Object.values(fatMensal).map((_,i)=>(mes===null||i===mes)?'rgba(232,148,58,1)':'rgba(232,148,58,0.2)');
                const ctx=document.getElementById('graficoFaturamento').getContext('2d');
                graficoFaturamento=new Chart(ctx,{type:'bar',data:{labels:mesesNomeG,datasets:[{label:'Faturamento',data:Object.values(fatMensal),backgroundColor:coresBarra,borderColor:'rgba(232,148,58,1)',borderWidth:1,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+formatarBRL(ctx.parsed.y)}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>formatarBRL(v)}}}}});
                document.getElementById('dashboard-resultado').style.display='block';
                document.getElementById('btnExportarCSV').style.display='block';
                document.getElementById('btnExportarPDF').style.display='block';
                renderizarGraficoGastosCategoria(ano);
                atualizarSaborMaisVendidoPublico();
            });
        });
    });
}


function atualizarSaborMaisVendidoPublico() {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtualDash = agora.getFullYear();
    database.ref('pedidos').once('value', snapshot => {
        const sabores = {};
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            if (dataP.getFullYear() !== anoAtualDash || dataP.getMonth() !== mesAtual) return;
            (p.itens || []).forEach(item => {
                const nome = item.sabor || item.nome;
                if (!nome) return;
                sabores[nome] = (sabores[nome] || 0) + (parseInt(item.quantidade) || 0);
            });
        });
        const ordenado = Object.entries(sabores).sort((a,b) => b[1] - a[1]);
        if (ordenado.length > 0) {
            database.ref('estatisticas-publicas/saborMaisVendido').set(ordenado[0][0]);
        }
    });
}


function renderizarGraficoGastosCategoria(ano) {
    database.ref('gastos').once('value', snapshot => {
        const mesesNomeG = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const categoriasFixas = ['Ingredientes','Embalagens','Gás/Energia','Entrega','Outros'];
        const cores = CORES_CATEGORIA_GASTO;
        const dadosPorCategoria = {};
        categoriasFixas.forEach(cat => { dadosPorCategoria[cat] = new Array(12).fill(0); });
        snapshot.forEach(child => {
            const g = child.val();
            if (!g.data) return;
            const pts = g.data.split('-');
            if (parseInt(pts[0]) !== ano) return;
            const mes = parseInt(pts[1]) - 1;
            const cat = categoriasFixas.includes(g.categoria) ? g.categoria : 'Outros';
            dadosPorCategoria[cat][mes] += (g.valor || 0);
        });
        const datasets = categoriasFixas.map(cat => ({
            label: cat,
            data: dadosPorCategoria[cat],
            borderColor: cores[cat],
            backgroundColor: cores[cat],
            tension: 0.3,
            fill: false
        }));
        if (graficoGastosCategoria) { graficoGastosCategoria.destroy(); graficoGastosCategoria = null; }
        const canvas = document.getElementById('graficoGastosCategoria');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        graficoGastosCategoria = new Chart(ctx, {
            type: 'line',
            data: { labels: mesesNomeG, datasets },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { position:'bottom', labels:{ boxWidth:12, font:{ size:11 } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatarBRL(ctx.parsed.y)}` } } },
                scales: { y: { beginAtZero:true, ticks:{ callback: v => formatarBRL(v) } } }
            }
        });
    });
}


function calcularAvaliacoes(ano, mes) {
    const div = document.getElementById('dashAvaliacoes');
    if (!div) return;
    div.innerHTML = '<p style="color:var(--brown-warm);font-size:0.85em;">Carregando...</p>';

    database.ref('pedidos').once('value', snapshot => {
        const avaliacoes = [];
        snapshot.forEach(child => {
            const p = child.val();
            if (!p.avaliacao || !p.dataEntrega) return;
            let dataP;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('/'); dataP = new Date(pts[2],pts[1]-1,pts[0]); }
            else if (/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)) { const pts = p.dataEntrega.split('-'); dataP = new Date(pts[0],pts[1]-1,pts[2]); }
            else return;
            if (dataP.getFullYear() !== ano) return;
            if (mes !== null && dataP.getMonth() !== mes) return;
            avaliacoes.push({ nome: p.nome || 'Cliente', dataEntrega: p.dataEntrega, key: child.key, ...p.avaliacao });
        });

        if (avaliacoes.length === 0) {
            div.innerHTML = '<p style="color:var(--brown-warm);font-size:0.88em;">Nenhuma avaliação recebida neste período.</p>';
            return;
        }

        const EMOJI_NOTA = { 1: '😞', 2: '😐', 3: '😊' };
        const LABEL_NOTA = { 1: 'Não gostou', 2: 'Bom', 3: 'Adorou' };

        const media = avaliacoes.reduce((s,a) => s + (a.nota||0), 0) / avaliacoes.length;
        const distribuicao = {3:0,2:0,1:0};
        avaliacoes.forEach(a => { if (distribuicao[a.nota] !== undefined) distribuicao[a.nota]++; });

        avaliacoes.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

        const emojiMedia = media >= 2.6 ? '😊' : media >= 1.6 ? '😐' : '😞';
        let html = `<div style="display:flex;align-items:center;gap:16px;padding:14px;background:#FEF3C7;border-radius:14px;margin-bottom:14px;">
            <div style="text-align:center;">
                <div style="font-size:2.2em;line-height:1;">${emojiMedia}</div>
                <div style="font-size:0.7em;color:#92400E;margin-top:4px;font-weight:700;">${media.toFixed(1)}/3</div>
            </div>
            <div style="flex:1;">`;
        [3,2,1].forEach(n => {
            const qtd = distribuicao[n];
            const pct = avaliacoes.length > 0 ? Math.round((qtd/avaliacoes.length)*100) : 0;
            html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                <span style="font-size:0.9em;width:22px;">${EMOJI_NOTA[n]}</span>
                <div style="flex:1;background:rgba(146,64,14,0.15);border-radius:6px;height:6px;"><div style="background:#92400E;height:6px;border-radius:6px;width:${pct}%;"></div></div>
                <span style="font-size:0.7em;color:#92400E;width:18px;text-align:right;">${qtd}</span>
            </div>`;
        });
        html += `</div></div>`;
        html += `<p style="font-size:0.78em;color:var(--brown-warm);margin-bottom:10px;">${avaliacoes.length} avaliação${avaliacoes.length>1?'ões':''} no período</p>`;

        avaliacoes.forEach(a => {
            const emoji = EMOJI_NOTA[a.nota] || '😐';
            const label = LABEL_NOTA[a.nota] || '';
            const dataFormatada = formatarDataComDia(a.dataEntrega).split(' (')[0];
            html += `<div style="padding:10px 12px;background:var(--cream);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:background 0.15s;" onclick="irParaPedidoEspecifico('${a.key}')" onmouseover="this.style.background='#F0E6D3'" onmouseout="this.style.background='var(--cream)'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                    <strong style="font-size:0.86em;color:var(--brown-dark);">${escaparHTML(a.nome)} <span style="font-size:0.85em;color:var(--amber);">↗</span></strong>
                    <span style="font-size:1em;" title="${label}">${emoji}</span>
                </div>
                <div style="font-size:0.72em;color:var(--brown-warm);margin-bottom:${a.comentario ? '4px' : '0'};">📅 ${dataFormatada}</div>
                ${a.comentario ? `<div style="font-size:0.84em;color:var(--brown-dark);font-style:italic;">"${escaparHTML(a.comentario)}"</div>` : ''}
            </div>`;
        });

        div.innerHTML = html;
    });
}



function calcularLucratividadeSabores(saboresQtd, receitasMap, faturamentoTotal, totalBrigTotal) {
    const div = document.getElementById('dashLucratividadeSabores');
    if (!div) return;
    const dados = [];

    Object.entries(saboresQtd).forEach(([sabor, qtd]) => {
        const receita = receitasMap[sabor];
        if (!receita) return;
        const custoPorUn = receita.custoPorUnidade || (receita.custoTotal / receita.rendimento);
        const cat = CATEGORIA_SABOR[sabor] || 'trad';
        const precoVendaUn = precoUnitarioPorFaixa(cat, qtd);
        const lucroUn = precoVendaUn - custoPorUn;
        const lucroTotalSabor = lucroUn * qtd;
        const margemPct = precoVendaUn > 0 ? (lucroUn / precoVendaUn * 100) : 0;
        dados.push({ sabor, qtd, custoPorUn, precoVendaUn, lucroUn, lucroTotalSabor, margemPct });
    });

    dados.sort((a,b) => b.lucroTotalSabor - a.lucroTotalSabor);
    _dadosLucratividadeSabores = dados;
    reaplicarFiltroMargemSabor();
}


function reaplicarFiltroMargemSabor() {
    const div = document.getElementById('dashLucratividadeSabores');
    if (!div) return;
    const dados = _dadosLucratividadeSabores;

    if (dados.length === 0) {
        div.innerHTML = '<p style="color:var(--brown-warm);font-size:0.88em;">Cadastre receitas para ver a lucratividade por sabor.</p>';
        return;
    }

    const campoFiltro = document.getElementById('filtroMargemSabor');
    const limite = campoFiltro && campoFiltro.value !== '' ? parseFloat(campoFiltro.value) : null;
    const dadosFiltrados = limite !== null ? dados.filter(d => d.margemPct < limite) : dados;

    if (dadosFiltrados.length === 0) {
        div.innerHTML = '<p style="color:var(--brown-warm);font-size:0.88em;">Nenhum sabor com margem abaixo de ' + limite + '%.</p>';
        return;
    }

    div.innerHTML = dadosFiltrados.map((d) => {
        const idx = dados.indexOf(d);
        const corMargem = d.margemPct >= 50 ? '#065F46' : d.margemPct >= 30 ? '#92400E' : '#DC2626';
        const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--cream);border-radius:12px;margin-bottom:8px;">
            <div>
                <strong>${medalha} ${escaparHTML(d.sabor)}</strong>
                <div style="font-size:0.76em;color:var(--brown-warm);">
                    Custo: R$ ${d.custoPorUn.toFixed(3).replace('.',',')}/un · Venda: R$ ${d.precoVendaUn.toFixed(2).replace('.',',')}/un · ${d.qtd} un vendidas
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:700;color:${corMargem};">R$ ${d.lucroTotalSabor.toFixed(2).replace('.',',')}</div>
                <div style="font-size:0.76em;color:${corMargem};">${d.margemPct.toFixed(0)}% margem</div>
            </div>
        </div>`;
    }).join('');
}


function exportarDashboardPDF() {
    const mesVal = document.getElementById('dashMes').value;
    const ano = document.getElementById('dashAno').value;
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const periodo = mesVal === 'geral' ? 'Ano ' + ano : meses[parseInt(mesVal)] + ' de ' + ano;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(43, 18, 6);
    doc.text('Doces Flor — Relatório Financeiro', 14, y); y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('Período: ' + periodo, 14, y); y += 12;

    const linhas = [
        ['Faturamento', document.getElementById('dashFaturamento').textContent],
        ['Ticket Médio', document.getElementById('dashTicket').textContent],
        ['Gastos', document.getElementById('dashGastos').textContent],
        ['Lucro Líquido', document.getElementById('dashLucro').textContent],
        ['Pedidos Entregues', document.getElementById('dashEntregues').textContent],
        ['Pedidos em Andamento', document.getElementById('dashAndamento').textContent],
        ['Total Brigadeiros Produzidos', document.getElementById('dashTotalBrig').textContent],
    ];

    doc.setFontSize(12);
    doc.setTextColor(43,18,6);
    linhas.forEach(([label, valor]) => {
        doc.setFont(undefined, 'bold');
        doc.text(label + ':', 14, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(valor), 90, y);
        y += 8;
    });

    y += 6;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Sabores Mais Vendidos', 14, y); y += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    document.querySelectorAll('#dashSabores > div').forEach(div => {
        const texto = div.querySelector('span')?.textContent + ' — ' + div.querySelector('strong')?.textContent;
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text('• ' + texto, 16, y); y += 6;
    });

    doc.save(`relatorio-doces-flor-${periodo.replace(' ','-')}.pdf`);
    toast('📄 PDF exportado!');
}


function exportarDashboardCSV() {
    const mesVal=document.getElementById('dashMes').value;
    const ano=parseInt(document.getElementById('dashAno').value);
    const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const periodo=mesVal==='geral'?'Ano '+ano:meses[parseInt(mesVal)]+' '+ano;
    database.ref('pedidos').once('value',snapshot=>{
        const linhas=[['Nome','Telefone','Data Entrega','Status Pagamento','Valor Total','Valor Pago','Tipo Entrega','Observações']];
        snapshot.forEach(child=>{
            const p=child.val(); if(!p.dataEntrega) return;
            let dataP;
            if(/^\d{2}\/\d{2}\/\d{4}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('/');dataP=new Date(pts[2],pts[1]-1,pts[0]);}
            else if(/^\d{4}-\d{2}-\d{2}$/.test(p.dataEntrega)){const pts=p.dataEntrega.split('-');dataP=new Date(pts[0],pts[1]-1,pts[2]);}
            else return;
            if(dataP.getFullYear()!==ano) return;
            if(mesVal!=='geral'&&dataP.getMonth()!==parseInt(mesVal)) return;
            linhas.push([p.nome||'',p.telefone||'',converterDataParaBR(p.dataEntrega),p.statusPagamento||'',typeof p.valorTotal==='number'?p.valorTotal.toFixed(2).replace('.',','):'',p.valorPago||'',p.tipoEntrega||'',(p.observacoes||'').replace(/\n/g,' ')]);
        });
        function sanitizarCel(cel){const str=String(cel).replace(/"/g,'""');if(/^[=+\-@]/.test(str))return '"\''+str+'"';return '"'+str+'"';}
        const csv=linhas.map(row=>row.map(cel=>sanitizarCel(cel)).join(';')).join('\n');
        const BOM='\uFEFF';
        const blob=new Blob([BOM+csv],{type:'text/csv;charset=utf-8;'});
        const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`doces-flor-${periodo.replace(' ','-')}.csv`; a.click(); URL.revokeObjectURL(url);
        toast('📥 CSV exportado!');
    });
}

// ====================== AUTOCOMPLETE ======================
