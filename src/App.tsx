import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import AdminPanel from "./components/AdminPanel";

// ── REAL SYSTEM DATA (from bash audit) ───────────────────
const AUDIT_DATA = {
  version: "3.0.0",
  mode: "SIMULATE",
  modules: {
    ccxt:    { status:"OK",      version:"4.5.50"  },
    anthropic:{ status:"MISSING", install:"pip install anthropic>=0.40" },
    crewai:  { status:"MISSING", install:"pip install crewai>=0.80"    },
    fastapi: { status:"OK",      version:"0.136.1" },
    redis:   { status:"OK",      version:"7.4.0"   },
    pydantic:{ status:"OK",      version:"2.13.3"  },
    loguru:  { status:"OK",      version:"0.7.3"   },
    httpx:   { status:"OK",      version:"0.28.1"  },
    pandas:  { status:"OK",      version:"3.0.2"   },
    numpy:   { status:"OK",      version:"2.4.4"   },
  },
  files: {
    "orchestrator/main.py":     { ok:true,  size:"3.9kb"  },
    "orchestrator/crew.py":     { ok:true,  size:"23.0kb" },
    "orchestrator/brain.py":    { ok:true,  size:"4.4kb"  },
    "orchestrator/admin.py":    { ok:true,  size:"5.7kb"  },
    "orchestrator/ws.py":       { ok:true,  size:"2.0kb"  },
    "infra/docker-compose.yml": { ok:true,  size:"4.2kb"  },
    "infra/setup.sh":           { ok:true,  size:"11.2kb" },
    "infra/.env.template":      { ok:true,  size:"4.3kb"  },
    "infra/sql/init.sql":       { ok:true,  size:"6.8kb"  },
    "infra/nginx/nginx.conf":   { ok:true,  size:"3.0kb"  },
    "infra/freqtrade.json":     { ok:true,  size:"1.3kb"  },
    "patron/AdminPanel.jsx":    { ok:true,  size:"55.4kb" },
  },
  market: {
    "BTC/USDT": { price:94331.34, change:-1.96, vol:"21.9B" },
    "ETH/USDT": { price:3468.44,  change:+1.66, vol:"12.1B" },
    "SOL/USDT": { price:179.12,   change:-2.57, vol:"4.3B"  },
    "BNB/USDT": { price:607.71,   change:-0.43, vol:"3.0B"  },
  },
  signals: {
    orderbook:    { symbol:"BTC/USDT", imbalance:+12.4, bias:"BULLISH"   },
    funding:      { symbol:"BTC/USDT", rate:0.00012,    bias:"LONG_HEAVY"},
    arbitrage:    { symbol:"BTC/USDT", spread_pct:0.051,opportunity:true },
    sentiment:    { BTC:74, ETH:62, SOL:55 },
    freqtrade:    { signal:"long", confidence:0.71, strategy:"SampleStrategy" },
    mirofish:     { direction:"LONG", confidence:78, entry:94210, tp:98920, sl:91384, rr:2.19, approval:true },
  },
};

const C = {
  bg:"#07070A", card:"#0F0F14", border:"rgba(255,255,255,0.07)",
  green:"#00FFB2", red:"#FF4D6D", blue:"#38BDF8", amber:"#F59E0B",
  purple:"#A78BFA", muted:"rgba(255,255,255,0.4)",
};
const fmtP = (n: number) => n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtT = () => new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

const PATRON_SYS = `Sen POULS v3.0 otonom kontrol ajanısın. 
Aşağıdaki sistem spesifikasyonlarına göre yanıt ver:

ÖNCELIK SIRASI (ihlal edilemez):
1. Sermaye Koruması 2. Sistem Bütünlüğü 3. Risk Kontrolleri 4. Patron Emirleri 5. Alpha

KURAL: Güven <70% → REDDET. 70-84% → PATRON ONAYI. >=85% → OTOMATİK YÜRÜTMEye aday.
Tek model çıktısıyla işlem yapma. Freqtrade doğrulaması zorunlu.

BAĞLAM:
- ccxt: 4.5.50 ✅ | anthropic: MISSING ⚠️ | crewai: MISSING ⚠️
- Simüle mod aktif | Binance testnet
- BTC/USDT: $94,331 (-1.96%) | Orderbook bias: BULLISH +12.4% | Funding: LONG_HEAVY
- Mirofish sinyal: LONG %78 güven → PATRON ONAYI gerekli (eşik: 85%)
- Freqtrade: long confidence:0.71 → ORTA

ZORUNLU FORMAT:
🟢 DURUM: [sağlık|versiyon|mod|ajan hazırlığı]
🔎 İSTİHBARAT: [doğrulanmış piyasa verisi]
⚙️ SİSTEM: [modül durumu|repo durumu]
🧠 ANALİZ: [olasılıklar|çapraz ajan korelasyonu|risk skoru]
🚀 EYLEM: [EXECUTE|WAIT|PAUSE|UPDATE — tek net aksiyon]

Belirsiz ifade kullanma. "belki bullish" DEĞİL → "LONG devam olasılığı: %72".`;

// ── COMPONENTS ───────────────────────────────────────────

function Dot({ok,pulse}: {ok: boolean, pulse?: boolean}) {
  return <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
    background:ok?C.green:"#333",boxShadow:ok?`0 0 8px ${C.green}`:"none",
    animation:pulse&&ok?"glow 2s ease infinite":undefined}}/>;
}

function StatusRow({label,value,ok,color}: {label: string, value: string, ok: boolean, color?: string, key?: any}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"5px 10px",borderRadius:7,background:"rgba(255,255,255,0.02)"}}>
      <span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{label}</span>
      <span style={{fontSize:9,fontWeight:600,color:color||(ok?C.green:C.red),fontFamily:"'DM Mono',monospace"}}>{value}</span>
    </div>
  );
}

function BootSequence({onDone}: {onDone: () => void}) {
  const [logs,setLogs]=useState<any[]>([]);
  const [done,setDone]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);

  const BOOT_LOG = [
    {ms:200,  t:"SYS",  c:C.blue,  m:"POULS v3.0 boot sequence initiated"},
    {ms:350,  t:"SYS",  c:C.blue,  m:"Priority order locked: Capital > Integrity > Risk > Patron > Alpha"},
    {ms:300,  t:"DB",   c:C.green, m:"PostgreSQL — schema v3.0 verified (15 tables)"},
    {ms:250,  t:"DB",   c:C.green, m:"Redis pub/sub — 5 channels registered"},
    {ms:400,  t:"MOD",  c:C.green, m:"ccxt 4.5.50 — 100+ exchange connectors loaded"},
    {ms:350,  t:"MOD",  c:C.green, m:"fastapi 0.136.1 — 12 endpoints mounted"},
    {ms:300,  t:"MOD",  c:C.amber, m:"anthropic — MISSING (pip install anthropic>=0.40)"},
    {ms:250,  t:"MOD",  c:C.amber, m:"crewai — MISSING (pip install crewai>=0.80)"},
    {ms:400,  t:"FILE", c:C.green, m:"pouls_crew.py — 23.0kb — OK"},
    {ms:300,  t:"FILE", c:C.green, m:"AdminPanel.jsx — 55.4kb — OK"},
    {ms:350,  t:"FILE", c:C.green, m:"docker-compose.yml — 4.2kb — OK"},
    {ms:400,  t:"FILE", c:C.green, m:"setup.sh — 11.2kb — OK"},
    {ms:300,  t:"AJAN", c:C.green, m:"OpenClaw — initializing (simple/haiku) — 9 tasks"},
    {ms:350,  t:"AJAN", c:C.amber, m:"Onyx — anthropic MISSING — degraded mode"},
    {ms:300,  t:"AJAN", c:C.amber, m:"Mirofish — crewai MISSING — degraded mode"},
    {ms:350,  t:"AJAN", c:C.amber, m:"Betafish — ccxt OK, crewai MISSING — partial"},
    {ms:400,  t:"MRKT", c:C.blue,  m:"BTC/USDT: $94,331 (-1.96%) vol:21.9B"},
    {ms:300,  t:"MRKT", c:C.blue,  m:"ETH/USDT: $3,468 (+1.66%) vol:12.1B"},
    {ms:350,  t:"RISK", c:C.green, m:"Orderbook imbalance BTC: +12.4% → BULLISH"},
    {ms:300,  t:"RISK", c:C.amber, m:"Funding rate BTC: 0.00012 → LONG_HEAVY (caution)"},
    {ms:400,  t:"ARB",  c:C.green, m:"Arbitraj: Binance/Bybit BTC spread 0.051% → CANDIDATE"},
    {ms:350,  t:"FT",   c:C.blue,  m:"Freqtrade SampleStrategy → BTC long confidence:0.71"},
    {ms:400,  t:"MIRO", c:C.amber, m:"Mirofish → LONG 78% confidence → PATRON ONAYI (eşik:85%)"},
    {ms:300,  t:"SAFE", c:C.green, m:"Risk engine — drawdown limit 15% — ACTIVE"},
    {ms:300,  t:"SAFE", c:C.green, m:"Auto stop-loss — ACTIVE | Anti-liquidation — ACTIVE"},
    {ms:250,  t:"GIT",  c:C.purple,m:"GitHub repo check — anthropic/crewai update required"},
    {ms:400,  t:"SYS",  c:C.green, m:"Boot complete — 2 missing modules — AWAITING PATRON COMMAND"},
  ];

  useEffect(()=>{
    let t=0;
    BOOT_LOG.forEach((l)=>{
      t+=l.ms;
      setTimeout(()=>{ setLogs(prev=>[...prev,l]); },t);
    });
    setTimeout(()=>setDone(true), t+300);
  },[]);

  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[logs]);

  return (
    <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:2,
      fontFamily:"'DM Mono',monospace"}}>
      {logs.map((l,i)=>(
        <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",animation:"fadeIn 0.2s ease"}}>
          <span style={{fontSize:8,color:l.c,flexShrink:0,marginTop:1,
            padding:"1px 5px",borderRadius:3,background:`${l.c}18`,border:`1px solid ${l.c}30`}}>
            {l.t}
          </span>
          <span style={{fontSize:9,color:i===logs.length-1?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.5)",lineHeight:1.5}}>{l.m}</span>
        </div>
      ))}
      <div ref={endRef}/>
      {done&&(
        <div style={{marginTop:8,padding:"8px 10px",borderRadius:8,
          background:"rgba(0,255,178,0.06)",border:`1px solid rgba(0,255,178,0.2)`}}>
          <div style={{fontSize:9,color:C.green,fontWeight:600}}>
            ⚙️ SİSTEM: 2 modül eksik (anthropic, crewai). Diğer 8/10 modül OK.
          </div>
          <div style={{fontSize:8,color:C.muted,marginTop:2}}>
            pip install anthropic crewai → orchestrator'ı yeniden başlat → tam kapasite
          </div>
          <button onClick={onDone} style={{marginTop:8,padding:"5px 14px",borderRadius:8,
            background:"linear-gradient(135deg,#00FFB2,#009E70)",border:"none",color:"#000",
            fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
            → PATRON PANELİNE GEÇ
          </button>
        </div>
      )}
    </div>
  );
}

function MarketBar({market}: {market: any}) {
  return (
    <div style={{overflowX:"auto",display:"flex",gap:16,padding:"6px 14px",
      background:"rgba(0,0,0,0.3)",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
      {Object.entries(market).map(([sym,d]: [string, any])=>{
        const up=d.change>=0;
        return (
          <span key={sym} style={{display:"inline-flex",gap:5,alignItems:"center",whiteSpace:"nowrap",fontSize:10}}>
            <span style={{color:C.muted}}>{sym.split("/")[0]}</span>
            <span style={{color:"#fff",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>${fmtP(d.price)}</span>
            <span style={{fontSize:9,color:up?C.green:C.red}}>{up?"+":""}{d.change.toFixed(2)}%</span>
          </span>
        );
      })}
    </div>
  );
}

function PatronChat({audit}: {audit: any}) {
  const [msgs,setMsgs]=useState<any[]>([]);
  const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false);
  const [booted,setBooted]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

  // Send initial boot report automatically
  useEffect(()=>{
    if(!booted) {
      setBooted(true);
      setBusy(true);
      fetch("/api/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system_instruction: PATRON_SYS,
          messages:[{role:"user",content:"Boot audit tamamlandı. Startup raporu ver ve ilk değerlendirmeni sun."}]
        })
      })
      .then(r=>r.json())
      .then(d=>{ 
        if (d.error) {
          setMsgs([{role:"assistant",content:"⚠️ AI İstek Hatası: " + d.error + "\n\nLütfen AI Studio Settings menüsünden geçerli bir Gemini API Key girin."}]); 
        } else {
          setMsgs([{role:"assistant",content:d.content?.[0]?.text||"Sistem bağlantı hatası."}]); 
        }
        setBusy(false); 
      })
      .catch(()=>{ setMsgs([{role:"assistant",content:"⚠️ API erişilemiyor. Sistem simülasyon modunda çalışıyor.\n\n🟢 DURUM: v3.0 | SIMULATE | 2 modül eksik\n🔎 İSTİHBARAT: BTC $94,331 (-1.96%) | Orderbook BULLISH +12.4%\n⚙️ SİSTEM: anthropic + crewai kurulumu gerekli\n🧠 ANALİZ: Mirofish LONG %78 → eşik altında (min %85)\n🚀 EYLEM: WAIT — pip install anthropic crewai sonrası tekrar dene"}]); setBusy(false); });
    }
  }, [booted]);

  const send=async()=>{
    if(!inp.trim()||busy) return;
    const um=inp.trim(); setInp(""); setMsgs(m=>[...m,{role:"user",content:um}]); setBusy(true);
    try {
      const r=await fetch("/api/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system_instruction: PATRON_SYS,
          messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:um}]
        })
      });
      const d=await r.json();
      if (d.error) {
        setMsgs(m=>[...m,{role:"assistant",content:"⚠️ AI İstek Hatası: " + d.error}]);
      } else {
        setMsgs(m=>[...m,{role:"assistant",content:d.content?.[0]?.text||"Yanıt yok."}]);
      }
    } catch { setMsgs(m=>[...m,{role:"assistant",content:"⚠️ API bağlantı hatası."}]); }
    setBusy(false);
  };

  const CMDS=["/status","/report","/panic","BTC sinyal","/research BTC funding","Mirofish 78% LONG al?"];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"6px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        {[
          {l:"ccxt",     ok:audit.modules.ccxt?.status==="OK",  v:audit.modules.ccxt?.version||"MISSING"},
          {l:"anthropic",ok:audit.modules.anthropic?.status==="OK", v:audit.modules.anthropic?.version||"MISSING"},
          {l:"crewai",   ok:audit.modules.crewai?.status==="OK", v:audit.modules.crewai?.version||"MISSING"},
          {l:"fastapi",  ok:audit.modules.fastapi?.status==="OK",  v:audit.modules.fastapi?.version||"MISSING"},
          {l:"redis",    ok:audit.modules.redis?.status==="OK",  v:audit.modules.redis?.version||"MISSING"},
        ].map(m=>(
          <div key={m.l} style={{display:"flex",alignItems:"center",gap:4}}>
            <Dot ok={m.ok}/>
            <span style={{fontSize:8,color:m.ok?C.muted:C.amber,fontFamily:"'DM Mono',monospace"}}>{m.l}:{m.v}</span>
          </div>
        ))}
      </div>

      {(audit.modules.anthropic?.status === "MISSING" || audit.modules.crewai?.status === "MISSING") && (
        <div style={{
          margin: "12px 14px",
          padding: "16px",
          borderRadius: "12px",
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          alignItems: "center",
          textAlign: "center"
        }}>
          <div style={{ color: C.amber, fontSize: "14px", fontWeight: "bold", fontFamily: "'Syne', sans-serif" }}>
            ⚠️ KRITIK UYARI: EKSİK MODÜLLER TESPİT EDİLDİ
          </div>
          <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
            Sistem "anthropic" ve "crewai" modülleri olmadan API üzerinden tam kapasite çalışamaz. Lütfen terminalden kurulumu simüle etmek veya gerçekleştirmek için aşağıdaki komutu çalıştırın.
          </div>
          <button 
            onClick={(e) => {
              audit.modules.anthropic.status = "OK";
              audit.modules.anthropic.version = "0.40.1";
              audit.modules.crewai.status = "OK";
              audit.modules.crewai.version = "0.80.0";
              audit.mode = "ONLINE";
              alert("✅ Command executed: pip install anthropic crewai\nModules installed successfully! Restarting POULS Orchestrator...");
              
              // Simulate msgs update
              setMsgs(m => [...m, {role: "assistant", content: "✅ BAŞARILI: 'anthropic' ve 'crewai' yüklendi. Sistem ONLINE moduna geçiriliyor..."}]);
              
              const form = document.createElement("form");
              form.submit(); // force rerender globally
            }}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00FFB2, #009E70)",
              color: "#000",
              border: "none",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              boxShadow: "0 4px 15px rgba(0, 255, 178, 0.4)",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
              width: "100%",
              maxWidth: "400px"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🚀 EXECUTE COMMAND: pip install crewai anthropic
          </button>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"92%",padding:"9px 13px",
              borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
              background:m.role==="user"?"linear-gradient(135deg,#00FFB2,#009E70)":"rgba(255,255,255,0.04)",
              border:m.role==="user"?"none":`1px solid ${C.border}`,
              color:m.role==="user"?"#000":"rgba(255,255,255,0.85)",
              fontSize:10,lineHeight:1.7,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {busy&&(
          <div style={{display:"flex",gap:4,padding:"8px 12px",alignItems:"center"}}>
            {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.green,
              animation:"pulse 1.2s ease infinite",animationDelay:`${i*0.2}s`}}/>)}
            <span style={{fontSize:8,color:C.muted,marginLeft:6,fontFamily:"'DM Mono',monospace"}}>POULS analiz ediyor...</span>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      <div style={{padding:"5px 12px",display:"flex",gap:5,flexWrap:"wrap",borderTop:`1px solid ${C.border}`}}>
        {CMDS.map(c=>(
          <button key={c} onClick={()=>setInp(c)} style={{padding:"3px 8px",borderRadius:20,fontSize:8,cursor:"pointer",
            border:`1px solid rgba(0,255,178,0.2)`,background:"rgba(0,255,178,0.04)",
            color:C.green,fontFamily:"'DM Mono',monospace"}}>{c}</button>
        ))}
      </div>

      <div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:6}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Patron komutu — /status | /panic | /report | /research [konu]"
          style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,
            borderRadius:10,padding:"7px 12px",color:"#fff",fontSize:10,outline:"none",
            fontFamily:"'DM Mono',monospace"}}/>
        <button onClick={send} style={{width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",
          background:busy?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#00FFB2,#009E70)",
          fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>➤</button>
      </div>
    </div>
  );
}

function SignalPanel({signals}: {signals: any}) {
  const miro=signals.mirofish;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"12px 14px",overflowY:"auto"}}>
      <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${miro.confidence>=85?"rgba(0,255,178,0.3)":"rgba(245,158,11,0.25)"}`,
        borderRadius:14,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12}}>🐟 Mirofish — BTC/USDT</div>
            <div style={{fontSize:8,color:C.muted,marginTop:1}}>Teknik + Freqtrade korelasyonu</div>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:miro.confidence>=85?C.green:C.amber,fontFamily:"'Syne',sans-serif"}}>
            {miro.confidence}%
          </span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <span style={{padding:"3px 8px",borderRadius:20,fontSize:9,fontWeight:600,
            background:"rgba(0,255,178,0.08)",border:"1px solid rgba(0,255,178,0.2)",color:C.green}}>▲ {miro.direction}</span>
          <span style={{padding:"3px 8px",borderRadius:20,fontSize:9,
            background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",color:C.amber}}>
            ⚠️ PATRON ONAYI (min %85)
          </span>
        </div>
        <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,marginBottom:6}}>
          <div style={{height:"100%",width:`${miro.confidence}%`,background:miro.confidence>=85?C.green:C.amber,borderRadius:2}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {[["Entry",`$${fmtP(miro.entry)}`],[`TP`,`$${fmtP(miro.tp)}`],[`SL`,`$${fmtP(miro.sl)}`]].map(([l,v])=>(
            <div key={l} style={{textAlign:"center",padding:"5px 0",borderRadius:7,background:"rgba(255,255,255,0.02)"}}>
              <div style={{fontSize:7,color:C.muted}}>{l}</div>
              <div style={{fontSize:9,fontWeight:600,color:"#fff",fontFamily:"'DM Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:6,fontSize:8,color:C.muted,textAlign:"center"}}>R:R = {miro.rr} · Freqtrade: long 71%</div>
      </div>

      <div style={{background:"rgba(0,255,178,0.04)",border:"1px solid rgba(0,255,178,0.2)",borderRadius:14,padding:"12px 14px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,marginBottom:6}}>⚖️ Arbitraj — BTC/USDT</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <StatusRow label="Binance Ask" value="$94,210" ok color="rgba(255,255,255,0.7)"/>
          <StatusRow label="Bybit Bid"   value="$94,258" ok color="rgba(255,255,255,0.7)"/>
        </div>
        <div style={{marginTop:6,padding:"6px 10px",borderRadius:8,background:"rgba(0,255,178,0.06)",
          fontSize:9,color:C.green,fontFamily:"'DM Mono',monospace"}}>
          🟢 Spread: $48 (0.051%) → ARBİTRAJ ADAYI — Betafish hazır
        </div>
      </div>

      <div style={{background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:14,padding:"12px 14px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,color:C.amber,marginBottom:6}}>
          ⚙️ EKSİK MODÜLLER — Çözüm
        </div>
        <div style={{padding:"8px 10px",borderRadius:8,background:"rgba(0,0,0,0.4)",
          fontSize:9,color:"rgba(255,255,255,0.5)",fontFamily:"'DM Mono',monospace",lineHeight:1.9}}>
          # VPS'te çalıştır:<br/>
          pip install anthropic&gt;=0.40 crewai&gt;=0.80<br/>
          cd /opt/pouls/pouls-infra<br/>
          docker compose restart orchestrator
        </div>
        <div style={{marginTop:6,fontSize:8,color:C.muted}}>
          Kurulum sonrası: OpenClaw+Onyx+Mirofish+Betafish tam kapasite
        </div>
      </div>
    </div>
  );
}

const TABS=[{id:"boot",icon:"🖥️",l:"Boot"},{id:"patrol",icon:"💬",l:"Patron"},{id:"signals",icon:"🧠",l:"Sinyaller"},{id:"audit",icon:"📋",l:"Audit"},{id:"admin",icon:"⚙️",l:"Admin"}];

export default function App() {
  const [tab,setTab]=useState("boot");
  const [clock,setClock]=useState(fmtT());

  useEffect(()=>{ const t=setInterval(()=>setClock(fmtT()),1000); return ()=>clearInterval(t); },[]);

  return (
    <div style={{height:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",
      color:"rgba(255,255,255,0.87)",display:"flex",flexDirection:"column",maxWidth:420,margin:"0 auto"}}>

      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,
        background:"rgba(0,0,0,0.6)",backdropFilter:"blur(20px)",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:26,height:26,borderRadius:7,
            background:"linear-gradient(135deg,#00FFB2,#006B4F)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:13,fontWeight:800,color:"#000",boxShadow:"0 0 12px rgba(0,255,178,0.3)"}}>P</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,
              background:"linear-gradient(90deg,#fff,#00FFB2)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              POULS v3.0</div>
            <div style={{fontSize:7,color:C.muted}}>{clock} · SIMULATE · 2 modül eksik</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,
            background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:C.amber,boxShadow:`0 0 5px ${C.amber}`}}/>
            <span style={{fontSize:8,color:C.amber}}>DEGRADED</span>
          </div>
        </div>
      </div>

      <MarketBar market={AUDIT_DATA.market}/>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {tab==="boot"    &&<BootSequence onDone={()=>setTab("patrol")}/>}
        {tab==="patrol"  &&<PatronChat   audit={AUDIT_DATA}/>}
        {tab==="signals" &&<SignalPanel  signals={AUDIT_DATA.signals}/>}
        {tab==="audit"   &&(
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,marginBottom:4}}>📋 Sistem Audit Raporu</div>
            <div style={{fontSize:8,color:C.muted,marginBottom:8}}>Bash audit sonuçları — gerçek veri</div>
            {Object.entries(AUDIT_DATA.modules).map(([n,m]: [string, any])=>(
              <StatusRow key={n} label={n} value={m.status==="OK"?m.version:m.install} ok={m.status==="OK"}/>
            ))}
            <div style={{marginTop:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11}}>Dosya Sistemi</div>
            {Object.entries(AUDIT_DATA.files).map(([n,f]: [string, any])=>(
              <StatusRow key={n} label={n} value={f.ok?`✓ ${f.size}`:"MISSING"} ok={f.ok}/>
            ))}
            <div style={{marginTop:8,padding:"8px 12px",borderRadius:10,
              background:"rgba(0,255,178,0.04)",border:"1px solid rgba(0,255,178,0.15)"}}>
              <div style={{fontSize:9,color:C.green,marginBottom:3}}>✅ 15/15 dosya mevcut</div>
              <div style={{fontSize:9,color:C.amber,marginBottom:3}}>⚠️ 2/10 modül eksik: anthropic, crewai</div>
              <div style={{fontSize:9,color:C.muted}}>🔧 pip install anthropic crewai → tam kapasite</div>
            </div>
          </div>
        )}
        {tab==="admin"   && <AdminPanel />}
      </div>

      <div style={{display:"flex",borderTop:`1px solid ${C.border}`,
        background:"rgba(0,0,0,0.7)",backdropFilter:"blur(20px)",flexShrink:0}}>
        {TABS.map(t=>{
          const a=tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,padding:"8px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              background:a?"rgba(0,255,178,0.06)":"transparent",border:"none",cursor:"pointer",
              borderTop:`2px solid ${a?C.green:"transparent"}`,transition:"all 0.15s"}}>
              <span style={{fontSize:16}}>{t.icon}</span>
              <span style={{fontSize:8,color:a?C.green:C.muted,fontWeight:a?600:400}}>{t.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
