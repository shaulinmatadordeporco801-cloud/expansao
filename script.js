(async function() {

    // 1. INTERFACE TIMOTITOS (BARRA LED COMPATÍVEL COM ANDROID/IOS/PC)

    const style = document.createElement('style');

    style.innerHTML = `

        @keyframes led-rgb {

            0% { border-bottom-color: #ff0000; color: #ff0000; }

            33% { border-bottom-color: #00ff00; color: #00ff00; }

            66% { border-bottom-color: #0000ff; color: #0000ff; }

            100% { border-bottom-color: #ff0000; color: #ff0000; }

        }

        .barra-timotitos {

            position: fixed; top: 0; left: 0; width: 100%; height: 35px;

            background: #000; font-family: monospace; font-size: 11px;

            display: flex; align-items: center; justify-content: center;

            z-index: 999999; border-bottom: 3px solid;

            font-weight: bold; letter-spacing: 1px;

            box-shadow: 0 2px 10px rgba(0,0,0,0.9);

            animation: led-rgb 3s linear infinite;

        }

        #t-log { color: #fff; margin-left: 8px; text-transform: uppercase; }

    `;

    document.head.appendChild(style);

    

    const barra = document.createElement('div');

    barra.className = 'barra-timotitos';

    barra.innerHTML = 'TIMOTITOS: <span id="t-log">INICIANDO VARREDURA...</span>';

    document.body.prepend(barra);



    const log = (msg) => { document.getElementById('t-log').innerText = msg; };



    // 2. DICIONÁRIO DE PESOS PARA RESPOSTAS

    const PESOS = {

        'positivos': ['correto', 'sustentável', 'ética', 'desenvolvimento', 'essencial', 'objetivo', 'estratégia', 'análise', 'lógico', 'evolução', 'habilidades', 'conhecimento', 'cidadania', 'protagonismo', 'autonomia', 'eficiente', 'resultado', 'equilibrada', 'proporcional', 'evidência', 'hipótese', 'contexto', 'relevante'],

        'negativos': ['incorreto', 'irrelevante', 'falso', 'superficial', 'desistir', 'ignorar', 'prejudica', 'limitado', 'sem relação', 'tanto faz', 'aleatório', 'individualismo', 'desnecessário', 'negativo', 'erro', 'ineficiente']

    };



    // 3. CAPTURA TODOS OS PENDENTES NA PÁGINA

    const fila = Array.from(document.querySelectorAll('li.activity'))

        .filter(a => a.innerText.toLowerCase().includes('pendente'))

        .map(a => ({

            link: a.querySelector('a.aalink')?.href,

            nome: a.querySelector('.instancename')?.innerText.split('\n')[0] || "Atividade"

        }))

        .filter(item => item.link);



    if (fila.length === 0) {

        log("NENHUMA ATIVIDADE PENDENTE.");

        setTimeout(() => barra.remove(), 3000);

        return;

    }



    log(`FILA: ${fila.length} ITENS ENCONTRADOS`);



    // 4. FUNÇÃO DE PROCESSAMENTO (EXECUTA SEM SAIR DA PÁGINA)

    async function processar(item, index) {

        const url = item.link;

        const cmid = new URL(url).searchParams.get('id');

        const status = `[${index + 1}/${fila.length}]`;



        try {

            if (url.includes('quiz')) {

                log(`${status} ABRINDO QUIZ...`);

                const res = await fetch(url);

                const html = await res.text();

                const sk = html.match(/sesskey":"([^"]+)/)[1];

                const docQuiz = new DOMParser().parseFromString(html, 'text/html');

                

                const form = docQuiz.querySelector('form[action*="startattempt.php"]') || docQuiz.querySelector('form[action*="continue"]');

                if (!form) return;



                log(`${status} INICIANDO...`);

                const start = await fetch(form.action, { method: 'POST', body: new URLSearchParams(new FormData(form)) });

                const qPageUrl = start.url;

                const att = new URL(qPageUrl).searchParams.get('attempt');

                

                const qRes = await fetch(qPageUrl);

                const qHtml = await qRes.text();

                const qDoc = new DOMParser().parseFromString(qHtml, 'text/html');

                

                const fd = new URLSearchParams();

                fd.append('attempt', att);

                fd.append('sesskey', sk);

                fd.append('next', 'Finalizar tentativa ...');

                qDoc.querySelectorAll('input[name*="sequencecheck"]').forEach(s => fd.append(s.name, s.value));



                qDoc.querySelectorAll('.que').forEach((q) => {

                    let melhor = null; let max = -999;

                    q.querySelectorAll('.answer div, .answer label').forEach(opt => {

                        const txt = opt.innerText.toLowerCase();

                        let pts = 0;

                        PESOS.positivos.forEach(p => { if(txt.includes(p)) pts += 20; });

                        PESOS.negativos.forEach(n => { if(txt.includes(n)) pts -= 30; });

                        const rad = opt.querySelector('input[type="radio"]');

                        if (rad && pts > max) { max = pts; melhor = rad; }

                    });

                    if (melhor) fd.append(melhor.name, melhor.value);

                });



                log(`${status} SALVANDO R0/R1...`);

                await fetch(`https://expansao.educacao.sp.gov.br/mod/quiz/processattempt.php?cmid=${cmid}`, {

                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString()

                });



                log(`${status} FINALIZANDO...`);

                const fin = new URLSearchParams({ attempt: att, finishattempt: 1, timeup: 0, slots: '', cmid: cmid, sesskey: sk });

                await fetch('https://expansao.educacao.sp.gov.br/mod/quiz/processattempt.php', {

                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fin.toString()

                });

            } else {

                log(`${status} CONCLUINDO LEITURA...`);

                await fetch(url);

            }

        } catch (e) { console.error(e); }

    }



    // 5. LOOP DE EXECUÇÃO

    for (let i = 0; i < fila.length; i++) {

        await processar(fila[i], i);

    }



    log("VARREDURA COMPLETA! ATUALIZANDO...");

    setTimeout(() => location.reload(), 1500);

})();] 

