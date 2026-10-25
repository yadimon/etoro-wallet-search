// Synthetic data only. This fixture is fulfilled locally by Playwright; no
// network request reaches eToro, and no real-account files are read by tests.
export const HEADER =
  'Name\tDate\tAmount\tCurrency\tLocal Amount\tLocal Currency\tExchange Rate\tMoney Out\tMoney In';
export const FIXTURE_ROWS = [
  ['Coffee Test', '22/10/2026 18:41:30', -35],
  ['Salary Test', '10/10/2026 10:00:00', 1000],
  ['Transfer Test', '01/01/2025 10:00:00', 500],
  ['Boundary Test', '30/09/2026 22:30:00', -25],
  ['Duplicate Shop', '11/10/2026 10:00:00', -10],
  ['Duplicate Shop', '11/10/2026 10:00:00', -10],
];
export function rowTSV([name, date, amount, currency = 'EUR']) {
  const quote = (value) =>
    /[\t\r\n"]/.test(String(value))
      ? '"' + String(value).replaceAll('"', '""') + '"'
      : String(value);
  return [
    name,
    date,
    amount,
    currency,
    amount,
    currency,
    '1',
    amount < 0 ? amount : '',
    amount > 0 ? amount : '',
  ]
    .map(quote)
    .join('\t');
}
export function exportTSV(rows = FIXTURE_ROWS) {
  return [HEADER, ...rows.map(rowTSV)].join('\n');
}
const native = (id, label, time, amount, type = 1, status = 0) => ({
  transactionId: id,
  label,
  transactionTime: time,
  amount,
  currency: 978,
  customerTransactionType: type,
  transactionAnnotation: status,
});
export const NATIVE_ROWS = [
  native('1', 'Coffee Test', '2026-10-22T18:41:30Z', -35),
  native('2', 'Salary Test', '2026-10-10T10:00:00Z', 1000, 7),
  native('3', 'Transfer Test', '2025-01-01T10:00:00Z', 500, 5),
  native('4', 'Boundary Test', '2026-09-30T22:30:00Z', -25),
  native('5', 'Duplicate Shop', '2026-10-11T10:00:00Z', -10, 2),
  native('6', 'Duplicate Shop', '2026-10-11T10:00:00Z', -10, 2),
  native('7', 'Own transfer', '2026-10-12T10:00:00Z', -500, 6),
  native('8', 'Cancelled card', '2026-10-20T10:00:00Z', -99, 1, 3),
  native('9', 'Pending card', '2026-10-23T10:00:00Z', -150, 1, 1),
  native('10', 'Cash test', '2026-09-15T10:00:00Z', -50, 4),
  native('11', 'Refund test', '2026-09-12T10:00:00Z', 20, 9),
  native('12', 'Fee test', '2026-09-10T10:00:00Z', -2, 10),
  native('13', 'Old pending transfer', '2026-09-20T10:00:00Z', -9, 8, 8),
  native('14', 'Unknown type', '2026-10-05T10:00:00Z', -7, 999, 999),
];
const baseStyle = `body{margin:0;background:#e6eaf1;color:#242b34;font-family:Arial,sans-serif}main{max-width:1060px;margin:24px auto}et-wallet-account{display:block}et-wallet-account-balance{display:block;background:white;border-radius:8px;padding:30px;margin-bottom:12px}main>section{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(0,1fr);gap:12px}et-wallet-account-group-txn-header{display:block;background:white;padding:20px}cdk-virtual-scroll-viewport,[data-native-list]{display:block;background:white}et-wallet-account-txn,[data-native-row]{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:20px}aside{background:white;padding:24px;align-self:start}#fixture-export{position:fixed;inset:10%;background:white;padding:30px;z-index:9999;box-shadow:0 0 0 100vmax #0003}button,a{cursor:pointer}@media(max-width:700px){main>section{grid-template-columns:minmax(0,1fr)}}`;
export function fixtureHTML(url, { accountId = 'fixture-owner' } = {}) {
  const home = url.pathname === '/home';
  const redesign = url.searchParams.get('layout') === 'new';
  const names = FIXTURE_ROWS.slice(0, 4)
    .map(
      (row) =>
        `<${redesign ? 'div data-native-row' : 'et-wallet-account-txn'}><span>${row[0]}</span><span>${row[2] < 0 ? '-' : '+'} €${Math.abs(row[2])}</span></${redesign ? 'div' : 'et-wallet-account-txn'}>`,
    )
    .join('');
  const list = redesign
    ? `<div data-native-list>${names}</div>`
    : `<cdk-virtual-scroll-viewport>${names}</cdk-virtual-scroll-viewport>`;
  const account = `<a href="/people/${encodeURIComponent(accountId)}" aria-label="Synthetic user"></a><et-wallet-account><main><et-wallet-account-balance><h2>EUR-Konto</h2><p>€100.00</p><button data-financial>Gelder hinzufügen</button><button data-financial>Geld senden</button><button data-financial>Karte verwalten</button></et-wallet-account-balance><section><div class="${redesign ? 'redesigned-wallet-list' : 'et-wallet-account__group__txn'}"><et-wallet-account-group-txn-header><strong>Aktivitäten 2026</strong><a>Exportieren</a></et-wallet-account-group-txn-header>${list}</div><aside class="et-wallet-account__group__account_details" data-native-details><h3>Kontodaten</h3><p>Existing synthetic account details DE89370400440532013000</p></aside></section></main></et-wallet-account>`;
  const lang = url.searchParams.get('lang') || '';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>Synthetic Wallet fixture</title><style>${baseStyle}</style></head><body>${home ? '<main><h1>Startseite</h1></main>' : account}<script src="/__wallet_fixture__/app.js"></script></body></html>`;
}
export function fixtureScript() {
  return `(() => {
    const header=${JSON.stringify(HEADER)};
    const rows=${JSON.stringify(FIXTURE_ROWS.map(rowTSV))};
    const params=new URLSearchParams(location.search);
    const fixture=window.__fixture={mode:params.get('mode')||'native',exports:[],financialActions:0,rows,header};
    const snapshot=()=>{const selectors={balance:'et-wallet-account-balance',list:'cdk-virtual-scroll-viewport,[data-native-list]',header:'et-wallet-account-group-txn-header',details:'[data-native-details]'};return Object.fromEntries(Object.entries(selectors).map(([key,selector])=>[key,document.querySelector(selector)?.outerHTML]));};
    fixture.before=snapshot();fixture.snapshot=snapshot;
    document.addEventListener('click',event=>{if(event.target.closest('[data-financial]'))fixture.financialActions++;});
    const download=text=>{
      const blob=new Blob([text],{type:'text/tab-separated-values'});
      const url=fixture.mode==='data'?'data:text/tab-separated-values;charset=utf-8,'+encodeURIComponent(text):(fixture.mode==='cached-blob'||fixture.mode==='dispatched-blob'?fixture.originals.create:URL.createObjectURL).call(URL,blob);
      const a=document.createElement('a');a.href=url;a.download='eToroTransactions_01-01-2007_24-10-2026_fixture.tsv';
      if(fixture.mode==='dispatched-blob')a.dispatchEvent(new MouseEvent('click'));else a.click();
      if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const exportRows=(from,to)=>rows.filter(row=>{const [d,m,y]=row.split('\\t')[1].slice(0,10).split('/');const day=y+'-'+m+'-'+d;return day>=from&&day<=to;});
    const open=()=>{
      if(document.getElementById('fixture-export'))return;
      const dialog=document.createElement(fixture.mode==='foreign-form'?'form':'et-wallet-payments-export-txns-form');dialog.id='fixture-export';
      const input=()=>{const n=document.createElement('input');n.className='mat-datepicker-input';n.placeholder='mm/dd/yyyy';n.max='2026-10-24';return n;};
      const a=input(),b=input(),button=document.createElement('button');button.textContent='Exportieren';button.disabled=true;if(fixture.mode==='foreign-form')button.setAttribute('data-financial','');dialog.append(a,b,button);document.body.append(dialog);
      dialog.addEventListener('input',()=>button.disabled=!a.value||!b.value);
      button.addEventListener('click',async()=>{
        const day=value=>{const [m,d,y]=value.split('/');return y+'-'+m+'-'+d;};const from=day(a.value),to=day(b.value);
        fixture.exports.push({from,to,mode:fixture.mode});
        if(fixture.mode==='stall'){dialog.remove();return;}
        const text=[header,...exportRows(from,to)].join('\\n');
        if(fixture.mode.startsWith('server')){
          // The live Wallet polls a JSON job, then clicks a detached anchor.
          // The file is a browser navigation/download, not a fetch/XHR Blob.
          const a=document.createElement('a');a.href=(fixture.mode==='server-external'?'https://walletsearchfixture.blob.core.windows.net':'')+'/__wallet_fixture__/export.tsv?from='+from+'&to='+to+(fixture.mode==='server-inline'?'':'&attachment=1');a.click();
        }
        else if(fixture.mode==='fetch'){const response=await fetch('/__wallet_fixture__/export?from='+from+'&to='+to);download(await response.text());}
        else if(fixture.mode==='xhr')await new Promise(resolve=>{const xhr=new XMLHttpRequest();xhr.open('GET','/__wallet_fixture__/export?from='+from+'&to='+to);xhr.responseType='blob';xhr.addEventListener('load',async()=>{download(await xhr.response.text());resolve();});xhr.send();});
        else if(fixture.mode==='invalid')download(header+'\\nBad\\t32/10/2026\\tNaN\\tEUR\\tNaN\\tEUR\\t1\\tNaN\\t');
        else download(text);
        dialog.remove();
      });
    };
    document.querySelector('et-wallet-account-group-txn-header a')?.addEventListener('click',open);
    if(fixture.mode.startsWith('server-gm')){
      fixture.gmRequests=[];
      window.GM_xmlhttpRequest=options=>{
        fixture.gmRequests.push({url:options.url,anonymous:options.anonymous,redirect:options.redirect,responseType:options.responseType});
        const url=new URL(options.url),text=[header,...exportRows(url.searchParams.get('from'),url.searchParams.get('to'))].join('\\n');
        const timer=fixture.mode==='server-gm-stall'?null:setTimeout(()=>options.onload({status:200,response:new TextEncoder().encode(text).buffer}),0);
        return {abort(){clearTimeout(timer);options.onabort?.();}};
      };
    }
    fixture.originals={fetch:window.fetch,create:URL.createObjectURL,send:XMLHttpRequest.prototype.send,click:HTMLAnchorElement.prototype.click,dispatch:HTMLAnchorElement.prototype.dispatchEvent,ownClick:Object.hasOwn(HTMLAnchorElement.prototype,'click'),ownDispatch:Object.hasOwn(HTMLAnchorElement.prototype,'dispatchEvent')};
    fixture.hooksRestored=()=>fetch===fixture.originals.fetch&&URL.createObjectURL===fixture.originals.create&&XMLHttpRequest.prototype.send===fixture.originals.send&&HTMLAnchorElement.prototype.click===fixture.originals.click&&HTMLAnchorElement.prototype.dispatchEvent===fixture.originals.dispatch&&Object.hasOwn(HTMLAnchorElement.prototype,'click')===fixture.originals.ownClick&&Object.hasOwn(HTMLAnchorElement.prototype,'dispatchEvent')===fixture.originals.ownDispatch;
    if(params.has('client')){
      fixture.clientRequests=0;
      const http={post:async(url,data,config)=>{
        fixture.clientRequests++;const controller=new AbortController();config.timeout.then(()=>controller.abort());
        const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-fixture-site-client':'1'},body:JSON.stringify(data),signal:controller.signal});
        if(!response.ok)throw {status:response.status};return {status:response.status,data:await response.json()};
      }};
      const angular={element:()=>({injector:()=>({get:name=>name==='$http'?http:null})})};
      if(params.get('client')==='amd'){window.require=name=>name==='angular'?angular:null;window.require.defined=name=>name==='angular';}else window.angular=angular;
    }
    const currency=location.pathname.endsWith('/GBP')?'GBP':'EUR';
    fetch('/api/money/v1/money/fiat/account/fixture-account/currencyBalances/fixture-'+currency+'/transactions/list?itemCount=40&fixtureBootstrap=1',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json()).catch(()=>{});
  })();`;
}
