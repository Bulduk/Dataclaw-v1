import React, { useState } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────
const C = {
  bg:      "#08080A",
  surface: "#0F0F12",
  card:    "#141418",
  border:  "rgba(255,255,255,0.07)",
  green:   "#00FFB2",
  red:     "#FF4D6D",
  blue:    "#38BDF8",
  purple:  "#A78BFA",
  amber:   "#F59E0B",
  muted:   "rgba(255,255,255,0.35)",
  dim:     "rgba(255,255,255,0.12)",
};

const AGENT_META = {
  OpenClaw: { color:"#00FFB2", icon:"🦅", role:"İstihbarat Ajanı", model:"claude-sonnet-4-20250514" },
  Onyx:     { color:"#A78BFA", icon:"🔮", role:"Araştırma Ajanı",   model:"claude-sonnet-4-20250514" },
  Mirofish: { color:"#38BDF8", icon:"🐟", role:"Simülasyon Ajanı",  model:"claude-sonnet-4-20250514" },
  Betafish: { color:"#F59E0B", icon:"⚡", role:"Operasyon Ajanı",   model:"claude-sonnet-4-20250514" },
};

// OpenClaw'ın en iyi görevleri (araştırmaya göre)
const OPENCLAW_TASKS = [
  { id:"sentiment",   label:"Sentiment Analizi",       desc:"Fear&Greed, Twitter/X, Reddit skorları",      tool:"SentimentTool",      enabled:true  },
  { id:"news",        label:"Haber Monitörlüğü",       desc:"CryptoPanic, RSS, breaking news taraması",    tool:"NewsScraperTool",    enabled:true  },
  { id:"ohlcv",       label:"OHLCV Veri Toplama",      desc:"ccxt.fetchOHLCV() — tüm coinler, 1m/5m/1h",  tool:"ccxtMarketTool",     enabled:true  },
  { id:"orderbook",   label:"Order Book Analizi",      desc:"Büyük duvarlar, bid/ask dengesizliği",        tool:"OrderBookTool",      enabled:true  },
  { id:"whale",       label:"Balina Takibi",           desc:"Büyük cüzdan hareketleri, on-chain flows",    tool:"WhaleAlertTool",     enabled:false },
  { id:"arbitrage",   label:"Arbitraj Tespiti",        desc:"Çapraz borsa fiyat farkı taraması",           tool:"ArbitrageScanTool",  enabled:true  },
  { id:"funding",     label:"Funding Rate Takibi",     desc:"Perp funding oranları, long/short bias",      tool:"FundingRateTool",    enabled:true  },
  { id:"trending",    label:"Trending Coin Tespiti",   desc:"Sosyal medya hacim artışı, momentum",         tool:"TrendScanTool",      enabled:false },
];

const EXCHANGES = ["Binance","Bybit","OKX","Kraken","Bitget","KuCoin"];
const SYMBOLS   = ["BTC/USDT","ETH/USDT","SOL/USDT","BNB/USDT","ARB/USDT","AVAX/USDT","XRP/USDT","DOGE/USDT"];

// ─── UI PRIMITIVES ──────────────────────────────────────
const Label = ({children,sub}: {children: React.ReactNode, sub?: boolean}) => (
  <div style={{marginBottom:sub?4:8}}>
    <span style={{fontSize:sub?9:10,color:sub?C.muted:"rgba(255,255,255,0.5)",
      textTransform:"uppercase",letterSpacing:0.9,fontWeight:600}}>{children}</span>
  </div>
);

const SectionTitle = ({icon,children,badge}: {icon: string, children: React.ReactNode, badge?: string}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
    <span style={{fontSize:18}}>{icon}</span>
    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff"}}>{children}</span>
    {badge&&<span style={{fontSize:9,padding:"2px 8px",borderRadius:20,
      background:"rgba(0,255,178,0.1)",border:"1px solid rgba(0,255,178,0.2)",color:C.green}}>{badge}</span>}
  </div>
);

const Card = ({children,style={}}: {children: React.ReactNode, style?: React.CSSProperties, key?: any}) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px",...style}}>
    {children}
  </div>
);

const Toggle = ({value,onChange,label,size="md"}: {value: boolean, onChange: (v: boolean) => void, label?: string, size?: "sm" | "md"}) => {
  const s = size==="sm";
  return (
    <div style={{display:"flex",alignItems:"center",gap:s?6:8,cursor:"pointer"}} onClick={()=>onChange(!value)}>
      <div style={{width:s?32:40,height:s?18:22,borderRadius:12,position:"relative",transition:"all 0.2s",
        background:value?`linear-gradient(135deg,${C.green},#00C8A0)`:"rgba(255,255,255,0.1)",
        border:`1px solid ${value?C.green:C.dim}`}}>
        <div style={{position:"absolute",top:2,left:value?(s?16:20):2,width:s?12:16,height:s?12:16,
          borderRadius:"50%",background:value?"#000":"rgba(255,255,255,0.5)",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
      </div>
      {label&&<span style={{fontSize:s?10:11,color:value?"rgba(255,255,255,0.8)":C.muted}}>{label}</span>}
    </div>
  );
};

const Slider = ({value,onChange,min=1,max=125,step=1,label,color=C.green}: {value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, label: string, color?: string}) => (
  <div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
      <span style={{fontSize:10,color:C.muted}}>{label}</span>
      <span style={{fontSize:11,fontWeight:700,color,fontFamily:"'Syne',sans-serif"}}>{value}x</span>
    </div>
    <div style={{position:"relative",height:20,display:"flex",alignItems:"center"}}>
      <div style={{position:"absolute",left:0,right:0,height:4,background:"rgba(255,255,255,0.06)",borderRadius:2}}>
        <div style={{height:"100%",width:`${((value-min)/(max-min))*100}%`,background:color,borderRadius:2}}/>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{position:"absolute",left:0,right:0,width:"100%",opacity:0,height:20,cursor:"pointer"}}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
      <span style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{min}x</span>
      <span style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{max}x</span>
    </div>
  </div>
);

const Input = ({value,onChange,placeholder,type="text",prefix,suffix}: {value: any, onChange: (v: any) => void, placeholder?: string, type?: string, prefix?: string, suffix?: string}) => (
  <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.04)",
    border:`1px solid ${C.dim}`,borderRadius:10,overflow:"hidden"}}>
    {prefix&&<span style={{padding:"0 10px",fontSize:10,color:C.muted,borderRight:`1px solid ${C.dim}`,
      height:36,display:"flex",alignItems:"center",flexShrink:0,background:"rgba(255,255,255,0.02)"}}>{prefix}</span>}
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{flex:1,background:"transparent",border:"none",padding:"8px 12px",color:"#fff",
        fontSize:11,outline:"none",fontFamily:"'DM Mono',monospace"}}/>
    {suffix&&<span style={{padding:"0 10px",fontSize:10,color:C.muted,flexShrink:0}}>{suffix}</span>}
  </div>
);

const Select = ({value,onChange,options}: {value: string, onChange: (v: string) => void, options: any[]}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:C.card,border:`1px solid ${C.dim}`,borderRadius:10,padding:"8px 12px",
      color:"#fff",fontSize:11,outline:"none",width:"100%",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>
    {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
  </select>
);

const Btn = ({children,onClick,variant="ghost",color=C.green,small,disabled,style={}}: {children: React.ReactNode, onClick?: () => void, variant?: "primary" | "ghost" | "danger" | "success", color?: string, small?: boolean, disabled?: boolean, style?: React.CSSProperties}) => {
  const styles = {
    primary: {background:`linear-gradient(135deg,${color},${color}CC)`,color:color==C.green?"#000":"#fff",border:"none"},
    ghost:   {background:"rgba(255,255,255,0.04)",border:`1px solid ${C.dim}`,color:"rgba(255,255,255,0.7)"},
    danger:  {background:"rgba(255,77,109,0.12)",border:"1px solid rgba(255,77,109,0.3)",color:C.red},
    success: {background:"rgba(0,255,178,0.1)",border:`1px solid rgba(0,255,178,0.25)`,color:C.green},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],borderRadius:10,padding:small?"5px 12px":"8px 16px",
      fontSize:small?10:11,fontFamily:"'DM Mono',monospace",fontWeight:600,cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.5:1,transition:"all 0.15s",whiteSpace:"nowrap", ...style
    }}>{children}</button>
  );
};

const StatusDot = ({on,pulse}: {on: boolean, pulse?: boolean}) => (
  <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
    background:on?C.green:"#444",
    boxShadow:on?`0 0 ${pulse?10:6}px ${C.green}`:"none",
    animation:pulse&&on?"glow 2s ease infinite":undefined}}/>
);

// ─── SECTIONS ───────────────────────────────────────────

function CrewAISection({ agents, setAgents }: { agents: any, setAgents: any }) {
  const [expanded, setExpanded] = useState<string | null>("OpenClaw");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SectionTitle icon="🤖" children="CrewAI Hiyerarşi" badge="Process.hierarchical"/>

      {/* PATRON — Manager */}
      <Card style={{background:"linear-gradient(135deg,rgba(0,255,178,0.06),rgba(0,200,160,0.03))",
        border:"1px solid rgba(0,255,178,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#00FFB2,#006B4F)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
              boxShadow:"0 0 16px rgba(0,255,178,0.3)"}}>P</div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:"#fff"}}>PATRON</div>
              <div style={{fontSize:9,color:C.green}}>Manager Agent · CrewAI Orkestrası</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:C.muted,marginBottom:2}}>manager_llm</div>
            <div style={{fontSize:10,color:"#fff",fontFamily:"'DM Mono',monospace"}}>claude-sonnet-4</div>
          </div>
        </div>
        <div style={{marginTop:12,padding:"8px 12px",borderRadius:10,background:"rgba(0,255,178,0.05)",
          border:"1px solid rgba(0,255,178,0.1)",fontSize:9,color:"rgba(255,255,255,0.5)",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
          Process: <span style={{color:C.green}}>hierarchical</span> · allow_delegation: <span style={{color:C.green}}>True</span> · memory: <span style={{color:C.green}}>True</span> · verbose: <span style={{color:C.amber}}>False</span>
        </div>
        {/* Tree lines */}
        <div style={{display:"flex",justifyContent:"center",marginTop:12}}>
          <div style={{display:"flex",gap:0,position:"relative"}}>
            {["🦅","🔮","🐟","⚡"].map((ic,i,arr)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative",
                paddingLeft:i>0?0:0}}>
                {i<arr.length-1&&<div style={{position:"absolute",top:0,right:"-50%",width:"100%",height:1,
                  background:"rgba(0,255,178,0.2)"}}/>}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"center"}}>
          {Object.entries(agents).map(([n, agent]: [string, any])=> {
            const m = (AGENT_META as any)[n] || { color: C.green, icon: "🔌" };
            return (
            <div key={n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              flex:1,padding:"6px 4px",borderRadius:8,
              background:`rgba(${n==="OpenClaw"?"0,255,178":n==="Onyx"?"167,139,250":n==="Mirofish"?"56,189,248":"245,158,11"},0.05)`,
              border:`1px solid ${m.color}22`}}>
              <span style={{fontSize:14}}>{m.icon}</span>
              <span style={{fontSize:8,color:m.color,fontWeight:600}}>{n}</span>
              <span style={{fontSize:7,color:C.muted}}>worker</span>
            </div>
          )})}
        </div>
      </Card>

      {/* Worker Agents */}
      {Object.entries(agents).map(([name,agent]: [string, any])=>{
        const meta = (AGENT_META as any)[name] || { color: C.green, icon: "🔌", role: "Custom Plugin Agent", model: agent.model || "custom" };
        const isExp = expanded===name;
        return (
          <Card key={name} style={{border:`1px solid ${isExp?meta.color+"44":C.border}`,
            boxShadow:isExp?`0 0 20px ${meta.color}12`:undefined}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:name)}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:18,background:`${meta.color}12`,
                  border:`1px solid ${meta.color}22`}}>{meta.icon}</div>
                <div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"#fff"}}>{name}</div>
                  <div style={{fontSize:9,color:C.muted}}>{meta.role}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <StatusDot on={agent.enabled}/>
                <span style={{fontSize:10,color:agent.enabled?meta.color:C.muted}}>{agent.enabled?"AKTİF":"PASIF"}</span>
                <span style={{fontSize:12,color:C.muted}}>{isExp?"▾":"▸"}</span>
              </div>
            </div>

            {isExp&&(
              <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14,
                display:"flex",flexDirection:"column",gap:12}}>

                {/* Enable/Model Row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <Label sub>Durum</Label>
                    <Toggle value={agent.enabled}
                      onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],enabled:v}}))}
                      label={agent.enabled?"Aktif":"Pasif"}/>
                  </div>
                  <div>
                    <Label sub>Delegasyon</Label>
                    <Toggle value={agent.delegation} size="sm"
                      onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],delegation:v}}))}
                      label="allow_delegation"/>
                  </div>
                </div>

                {/* LLM Model & Key Configuration */}
                <div style={{marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                    <Label sub>LLM Modeli & API Konfigürasyonu</Label>
                    <Btn variant="ghost" small onClick={() => {
                        const newModel = prompt("Yeni Model Adını Girin (örn: groq-llama-3):");
                        if (newModel && newModel.trim() !== "") {
                           setAgents((a: any)=>({...a,[name]:{...a[name],customModels: [...(a[name].customModels || []), newModel.trim()]}}));
                        }
                    }}>+ Yeni Model Ekle</Btn>
                  </div>
                  
                  <div style={{display:"grid",gap:10, marginBottom: 12}}>
                     <Select value={agent.model||meta.model}
                      onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],model:v}}))}
                      options={[
                        "claude-sonnet-4-20250514",
                        "claude-opus-4-6",
                        "claude-haiku-4-5-20251001",
                        "gpt-4o",
                        "gpt-4o-mini",
                        "gemini-1.5-pro",
                        "gemini-1.5-flash",
                        ...(agent.customModels || [])
                     ]}/>
                  </div>

                  <div style={{display:"grid", gridTemplateColumns: "1fr", gap:10}}>
                    <div>
                      <Label sub>Custom API Key (Opsiyonel)</Label>
                      <Input 
                        value={agent.apiKey || ""} 
                        onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],apiKey:v}}))} 
                        placeholder={agent.model?.includes("claude") ? "sk-ant-..." : agent.model?.includes("gpt") ? "sk-..." : agent.model?.includes("gemini") ? "AIza..." : "API Key Girin"} 
                        type="password"
                        prefix="KEY"
                      />
                      <div style={{fontSize: 8, color: C.muted, marginTop: 4}}>
                        * Boş bırakılırsa sistemdeki varsayılan .env anahtarları kullanılır. "Gemini API kaldır" talebiniz üzerine sistem varsayılan olarak API anahtarı istemez, simulasyon üzerinden çalışır. Gerçek bağlantı için buraya ilgili modelin key'ini girebilirsiniz.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Max iterations */}
                <div>
                  <Label sub>Max İterasyon & RPM</Label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <Input value={agent.maxIter||15} onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],maxIter:v}}))} prefix="iter"/>
                    <Input value={agent.maxRpm||10}  onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],maxRpm:v}}))}  prefix="rpm"/>
                  </div>
                </div>

                {/* Goal / Backstory */}
                <div>
                  <Label sub>Ajan Hedefi (goal)</Label>
                  <textarea value={agent.goal||""} onChange={e=>setAgents((a: any)=>({...a,[name]:{...a[name],goal:e.target.value}}))}
                    style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.dim}`,
                      borderRadius:10,padding:"8px 12px",color:"rgba(255,255,255,0.8)",fontSize:10,
                      outline:"none",resize:"vertical",minHeight:60,fontFamily:"'DM Mono',monospace",lineHeight:1.5}}/>
                </div>

                {/* Memory & Verbose */}
                <div style={{display:"flex",gap:16}}>
                  <Toggle value={agent.memory??true} onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],memory:v}}))} label="memory" size="sm"/>
                  <Toggle value={agent.verbose??false} onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],verbose:v}}))} label="verbose" size="sm"/>
                  <Toggle value={agent.cache??true} onChange={v=>setAgents((a: any)=>({...a,[name]:{...a[name],cache:v}}))} label="cache" size="sm"/>
                </div>

                {/* OpenClaw task list */}
                {name==="OpenClaw"&&(
                  <div>
                    <Label sub>Atanan CrewAI Görevleri</Label>
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
                      {(agent.tasks||OPENCLAW_TASKS).map((task: any)=>(
                        <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                          borderRadius:8,background:"rgba(255,255,255,0.03)",border:`1px solid ${C.dim}`,
                          cursor:"pointer"}}
                          onClick={()=>setAgents((a: any)=>{
                            const tasks=(a.OpenClaw.tasks||OPENCLAW_TASKS).map((t: any)=>t.id===task.id?{...t,enabled:!t.enabled}:t);
                            return {...a,OpenClaw:{...a.OpenClaw,tasks}};
                          })}>
                          <div style={{width:14,height:14,borderRadius:4,border:`1px solid ${task.enabled?C.green:C.dim}`,
                            background:task.enabled?"rgba(0,255,178,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {task.enabled&&<span style={{fontSize:8,color:C.green}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:task.enabled?"rgba(255,255,255,0.85)":C.muted,fontWeight:600}}>{task.label}</div>
                            <div style={{fontSize:8,color:"rgba(255,255,255,0.25)"}}>{task.tool} · {task.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:6,marginTop:2}}>
                  <Btn variant="success" small>💾 Kaydet</Btn>
                  <Btn variant="danger" small>🔄 Resetle</Btn>
                  <Btn variant="ghost" small>🧪 Test Et</Btn>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function TradingSection({ tradeCfg, setTradeCfg }: { tradeCfg: any, setTradeCfg: any }) {
  const [selSym, setSelSym] = useState("BTC/USDT");

  const sym = tradeCfg.symbols?.[selSym] || { leverage:10, marginMode:"isolated", posSize:5, sl:2, tp:4 };
  const setSymCfg = (k: string, v: any) => setTradeCfg((c: any)=>({...c,symbols:{...c.symbols,[selSym]:{...sym,[k]:v}}}));

  const riskColor = sym.leverage<=5?C.green:sym.leverage<=20?C.amber:C.red;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SectionTitle icon="⚡" children="ccxt İşlem Kontrolü" badge="Betafish"/>

      {/* Exchange config */}
      <Card>
        <Label>Borsa Seçimi</Label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
          {EXCHANGES.map(ex=>(
            <button key={ex} onClick={()=>setTradeCfg((c: any)=>({...c,exchange:ex}))}
              style={{padding:"7px 0",borderRadius:9,border:`1px solid ${tradeCfg.exchange===ex?C.green:C.dim}`,
                background:tradeCfg.exchange===ex?"rgba(0,255,178,0.1)":"rgba(255,255,255,0.03)",
                color:tradeCfg.exchange===ex?C.green:"rgba(255,255,255,0.5)",fontSize:10,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
              {ex}
            </button>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <Label sub>API Key</Label>
            <Input value={tradeCfg.apiKey||""} onChange={v=>setTradeCfg((c: any)=>({...c,apiKey:v}))} placeholder="Gizlenmiş..." type="password"/>
          </div>
          <div>
            <Label sub>API Secret</Label>
            <Input value={tradeCfg.secret||""} onChange={v=>setTradeCfg((c: any)=>({...c,secret:v}))} placeholder="Gizlenmiş..." type="password"/>
          </div>
        </div>

        <div style={{marginTop:12,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <Toggle value={tradeCfg.testnet??true} onChange={v=>setTradeCfg((c: any)=>({...c,testnet:v}))} label="Testnet Modu"/>
          <Toggle value={tradeCfg.sandbox??false} onChange={v=>setTradeCfg((c: any)=>({...c,sandbox:v}))} label="Sandbox"/>
          <Toggle value={tradeCfg.hedgeMode??false} onChange={v=>setTradeCfg((c: any)=>({...c,hedgeMode:v}))} label="Hedge Modu"/>
        </div>
      </Card>

      {/* Per-symbol config */}
      <Card>
        <Label>Sembol Bazlı Kaldıraç & Marjin</Label>
        {/* Symbol tabs */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16,marginTop:4}}>
          {SYMBOLS.map(s=>(
            <button key={s} onClick={()=>setSelSym(s)}
              style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${selSym===s?C.green:C.dim}`,
                background:selSym===s?"rgba(0,255,178,0.1)":"rgba(255,255,255,0.02)",
                color:selSym===s?C.green:"rgba(255,255,255,0.4)",fontSize:9,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
              {s.split("/")[0]}
            </button>
          ))}
        </div>

        {/* Leverage */}
        <div style={{marginBottom:16}}>
          <Slider value={sym.leverage} onChange={v=>setSymCfg("leverage",v)} min={1} max={125} label="Kaldıraç" color={riskColor}/>
          {sym.leverage>20&&(
            <div style={{marginTop:6,padding:"5px 10px",borderRadius:8,background:"rgba(255,77,109,0.06)",
              border:"1px solid rgba(255,77,109,0.15)",fontSize:9,color:C.red}}>
              ⚠️ Yüksek kaldıraç — likidayson riski artmış
            </div>
          )}
        </div>

        {/* Margin mode */}
        <div style={{marginBottom:16}}>
          <Label sub>Marjin Modu (ccxt.setMarginMode)</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {["isolated","cross"].map(m=>(
              <button key={m} onClick={()=>setSymCfg("marginMode",m)}
                style={{padding:"9px 0",borderRadius:10,border:`1px solid ${sym.marginMode===m?C.blue:C.dim}`,
                  background:sym.marginMode===m?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.02)",
                  color:sym.marginMode===m?C.blue:"rgba(255,255,255,0.4)",
                  fontSize:11,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontWeight:600}}>
                {m==="isolated"?"🔒 Isolated":"🌐 Cross"}
              </button>
            ))}
          </div>
        </div>

        {/* Position size, SL, TP */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <Label sub>Pozisyon Büyüklüğü</Label>
            <Input value={sym.posSize} onChange={v=>setSymCfg("posSize",v)} suffix="%" type="number"/>
          </div>
          <div>
            <Label sub>Stop Loss</Label>
            <Input value={sym.sl} onChange={v=>setSymCfg("sl",v)} suffix="%" type="number"/>
          </div>
          <div>
            <Label sub>Take Profit</Label>
            <Input value={sym.tp} onChange={v=>setSymCfg("tp",v)} suffix="%" type="number"/>
          </div>
        </div>

        {/* Order types */}
        <Label sub>İzin Verilen Emir Tipleri (ccxt.createOrder)</Label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
          {["market","limit","stop_market","stop_limit","take_profit","trailing_stop"].map(ot=>{
            const on=(tradeCfg.orderTypes||["market","limit","stop_market"]).includes(ot);
            return (
              <button key={ot} onClick={()=>setTradeCfg((c: any)=>{
                const cur=c.orderTypes||["market","limit","stop_market"];
                return {...c,orderTypes:on?cur.filter((x: string)=>x!==ot):[...cur,ot]};
              })} style={{padding:"4px 10px",borderRadius:20,fontSize:9,cursor:"pointer",
                border:`1px solid ${on?C.green:C.dim}`,
                background:on?"rgba(0,255,178,0.08)":"rgba(255,255,255,0.02)",
                color:on?C.green:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace"}}>
                {ot}
              </button>
            );
          })}
        </div>

        {/* ccxt method preview */}
        <div style={{marginTop:14,padding:"10px 12px",borderRadius:10,background:"rgba(0,0,0,0.3)",
          border:`1px solid ${C.dim}`,fontSize:9,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
          <span style={{color:C.purple}}>exchange</span>.setLeverage(<span style={{color:C.amber}}>{sym.leverage}</span>, <span style={{color:"#86efac"}}>'{selSym}'</span>)<br/>
          <span style={{color:C.purple}}>exchange</span>.setMarginMode(<span style={{color:"#86efac"}}>'{sym.marginMode}'</span>, <span style={{color:"#86efac"}}>'{selSym}'</span>)<br/>
          <span style={{color:C.purple}}>exchange</span>.createOrder(<span style={{color:"#86efac"}}>'{selSym}'</span>, <span style={{color:"#86efac"}}>'market'</span>, <span style={{color:"#86efac"}}>'buy'</span>, amount, price)
        </div>
      </Card>
    </div>
  );
}

function RiskSection({ risk, setRisk }: { risk: any, setRisk: any }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SectionTitle icon="🛡️" children="Risk Yönetimi"/>

      <Card>
        <Label>Portföy Koruma Limitleri</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
          {[
            {k:"maxDrawdown",   l:"Max Drawdown",      s:"%",  def:15},
            {k:"dailyLossLim",  l:"Günlük Kayıp Limiti",s:"%", def:5},
            {k:"maxPositions",  l:"Max Açık Pozisyon",  s:"",  def:5},
            {k:"maxPerTrade",   l:"Max İşlem Büyüklüğü",s:"%", def:10},
            {k:"cooldownMin",   l:"Kayıp Sonrası Bekleme",s:"dk",def:30},
            {k:"correlLimit",   l:"Korelasyon Limiti",  s:"%",  def:70},
          ].map(({k,l,s,def}: any)=>(
            <div key={k}>
              <Label sub>{l}</Label>
              <Input value={risk[k]??def} onChange={v=>setRisk((r: any)=>({...r,[k]:v}))} suffix={s} type="number"/>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Otomatik Koruma Mekanizmaları</Label>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
          {[
            {k:"autoStopLoss",    l:"Otomatik Stop-Loss",    desc:"Pozisyon açıldığında anında yerleştirir"},
            {k:"trailingStop",    l:"Trailing Stop",          desc:"Kâr arttıkça SL güncellenir"},
            {k:"antiLiquidation", l:"Likidayson Koruması",   desc:"Margin %10 altındaysa pozisyon kapat"},
            {k:"news_pause",      l:"Haber Bazlı Duraklat",  desc:"Büyük haber öncesi Betafish'i beklet"},
            {k:"volFilter",       l:"Volatilite Filtresi",   desc:"ATR eşiği aşarsa işleme girme"},
            {k:"nightMode",       l:"Gece Modu",             desc:"00:00-06:00 arası işlem yapma"},
          ].map(({k,l,desc}: any)=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"8px 12px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:`1px solid ${C.dim}`}}>
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:600}}>{l}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:1}}>{desc}</div>
              </div>
              <Toggle value={risk[k]??false} onChange={v=>setRisk((r: any)=>({...r,[k]:v}))} size="sm"/>
            </div>
          ))}
        </div>
      </Card>

      {/* Kill Switch */}
      <Card style={{border:"1px solid rgba(255,77,109,0.25)",background:"rgba(255,77,109,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:C.red,fontSize:13}}>🚨 Acil Kill Switch</div>
            <div style={{fontSize:9,color:"rgba(255,100,100,0.7)",marginTop:2}}>Tüm pozisyonları piyasa fiyatından kapatır · Tüm botları durdurur</div>
          </div>
          <Btn variant="danger" onClick={()=>alert("/panic komutu gönderildi — tüm pozisyonlar kapatılıyor")}>⛔ PANIC</Btn>
        </div>
      </Card>
    </div>
  );
}

function StrategySection({ strategy, setStrategy }: { strategy: any, setStrategy: any }) {
  const MODES = [
    {id:"arbitrage",  icon:"⚖️",  label:"Arbitraj",        desc:"Çapraz borsa fiyat farkı"},
    {id:"scalping",   icon:"⚡",  label:"Scalping",        desc:"Kısa vadeli momentum"},
    {id:"news",       icon:"📰",  label:"News Trading",    desc:"Haber bazlı giriş"},
    {id:"marketmake", icon:"📊",  label:"Market Making",   desc:"Likidite sağlama"},
    {id:"swing",      icon:"📈",  label:"Swing Trade",     desc:"Orta vadeli trend"},
    {id:"grid",       icon:"🔲",  label:"Grid Bot",        desc:"Fiyat aralığı grid"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SectionTitle icon="🎯" children="Strateji Konfigürasyonu"/>

      {/* Active strategies */}
      <Card>
        <Label>Aktif Stratejiler</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
          {MODES.map(m=>{
            const on=(strategy.modes||["arbitrage","scalping","news"]).includes(m.id);
            return (
              <div key={m.id} onClick={()=>setStrategy((s: any)=>{
                const cur=s.modes||["arbitrage","scalping","news"];
                return {...s,modes:on?cur.filter((x: string)=>x!==m.id):[...cur,m.id]};
              })} style={{padding:"10px 12px",borderRadius:12,cursor:"pointer",transition:"all 0.15s",
                border:`1px solid ${on?C.green:C.dim}`,
                background:on?"rgba(0,255,178,0.06)":"rgba(255,255,255,0.02)"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:on?"#fff":C.muted}}>{m.label}</span>
                </div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mirofish thresholds */}
      <Card>
        <Label>Mirofish Eşik Değerleri</Label>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:10}}>
          {[
            {k:"autoExecThresh",  l:"Otonom İşlem Eşiği",    v:80, color:C.green,  desc:"Bu %'nin üstünde Betafish otomatik çalışır"},
            {k:"alertThresh",     l:"Patron Uyarı Eşiği",    v:60, color:C.amber,  desc:"Bu %'nin üstünde bildirim gönderilir"},
            {k:"ignoreThresh",    l:"Yoksay Eşiği",          v:50, color:C.red,    desc:"Bu %'nin altındaki sinyaller görmezden gelinir"},
          ].map(({k,l,v,color,desc}: any)=>(
            <div key={k}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{l}</span>
                  <div style={{fontSize:8,color:C.muted,marginTop:1}}>{desc}</div>
                </div>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color}}>
                  {strategy[k]??v}%
                </span>
              </div>
              <input type="range" min={40} max={99} value={strategy[k]??v}
                onChange={e=>setStrategy((s: any)=>({...s,[k]:Number(e.target.value)}))}
                style={{width:"100%",accentColor:color,cursor:"pointer"}}/>
            </div>
          ))}
        </div>
      </Card>

      {/* Timing */}
      <Card>
        <Label>Zamanlama & Interval</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
          {[
            {k:"scanInterval",   l:"OpenClaw Tarama",   s:"sn",  def:30},
            {k:"miroInterval",   l:"Mirofish Güncelleme",s:"sn", def:60},
            {k:"arbScanDelay",   l:"Arbitraj Tarama",   s:"ms",  def:500},
            {k:"orderTimeout",   l:"Emir Timeout",      s:"sn",  def:30},
          ].map(({k,l,s,def}: any)=>(
            <div key={k}>
              <Label sub>{l}</Label>
              <Input value={strategy[k]??def} onChange={v=>setStrategy((st: any)=>({...st,[k]:v}))} suffix={s} type="number"/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SystemSection({ system, setSystem }: { system: any, setSystem: any }) {
  const [pingResult, setPingResult] = useState<string | null>(null);
  const testConn = () => { setPingResult("testing"); setTimeout(()=>setPingResult("ok"),1200); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16, paddingBottom: 60}}>
      <SectionTitle icon="🖥️" children="Sistem & VPS Yapılandırması"/>

      {/* Service health */}
      <Card>
        <Label>Servis Sağlık Durumu</Label>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
          {[
            {name:"pouls-orchestrator", port:8000, st:"running"},
            {name:"pouls-openclaw",     port:8001, st:"running"},
            {name:"pouls-onyx",         port:8002, st:"running"},
            {name:"pouls-mirofish",     port:8003, st:"running"},
            {name:"pouls-betafish",     port:8004, st:"running"},
            {name:"PostgreSQL",         port:5432, st:"running"},
            {name:"Redis",              port:6379, st:"running"},
            {name:"Nginx",              port:443,  st:"running"},
          ].map(svc=>(
            <div key={svc.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 12px",borderRadius:9,background:"rgba(255,255,255,0.02)",border:`1px solid ${C.dim}`}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <StatusDot on={svc.st==="running"}/>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.75)",fontFamily:"'DM Mono',monospace"}}>{svc.name}</span>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:9,color:C.muted}}>:{svc.port}</span>
                <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,
                  background:svc.st==="running"?"rgba(0,255,178,0.1)":"rgba(255,77,109,0.1)",
                  color:svc.st==="running"?C.green:C.red}}>{svc.st}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Docker / Deploy */}
      <Card>
        <Label>Deployment Kontrolleri</Label>
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{padding:"10px 12px",borderRadius:10,background:"rgba(0,0,0,0.3)",
            border:`1px solid ${C.dim}`,fontSize:9,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
            <span style={{color:"rgba(255,255,255,0.25)"}}>$ </span><span style={{color:C.green}}>cd /opt/pouls/pouls-infra</span><br/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>$ </span>docker-compose up -d --build<br/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>$ </span>docker-compose ps
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn variant="success" small onClick={()=>alert("Orchestrator'a restart komutu gönderiliyor...")}>🔄 Restart All</Btn>
            <Btn variant="ghost" small onClick={testConn}>
              {pingResult==="testing"?"⏳ Test...":pingResult==="ok"?"✅ Bağlı":"🔌 Bağlantı Test"}
            </Btn>
            <Btn variant="danger" small>⏹ Durdur</Btn>
          </div>
        </div>
      </Card>

      {/* Log settings */}
      <Card>
        <Label>Log & Monitoring</Label>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
          {[
            {k:"dbLog",     l:"Tüm Aksiyonları DB'ye Yaz", def:true},
            {k:"tradeLog",  l:"Trade Audit Log",            def:true},
            {k:"agentLog",  l:"Ajan Debug Logu",            def:false},
            {k:"alertPush", l:"Mobil Push Bildirimi",       def:true},
            {k:"emailAlert",l:"E-posta Uyarıları",          def:false},
          ].map(({k,l,def}: any)=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{l}</span>
              <Toggle value={system[k]??def} onChange={v=>setSystem((s: any)=>({...s,[k]:v}))} size="sm"/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PluginsSection({ onInstall }: { onInstall: (repoUrl: string) => void }) {
  const [repoUrl, setRepoUrl] = useState("https://github.com/Bulduk/crewAI");

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SectionTitle icon="🔌" children="Plugin & Repo Installer" badge="RepoInstaller.v3"/>
      
      <Card>
        <Label>GitHub'dan Ajan Aktarımı</Label>
        <div style={{marginTop:8, display:"flex", flexDirection:"column", gap:12}}>
          <Input value={repoUrl} onChange={setRepoUrl} prefix="URL" />
          <div style={{padding:"12px", borderRadius:12, background:"rgba(0,255,178,0.03)", border:"1px solid rgba(0,255,178,0.15)"}}>
            <div style={{fontSize:11, fontWeight:700, color:C.green, marginBottom:4}}>📦 Repo Installer Detected</div>
            <div style={{fontSize:9, color:"rgba(255,255,255,0.4)", lineHeight:1.5}}>
              Bu repo, otonom ajanları sisteme entegre edecektir. Güvenlik kuralları (PolicyGuard) devrede.
            </div>
          </div>
          <Btn variant="primary" onClick={() => onInstall(repoUrl)}>🚀 Kurulumu Başlat (repo_installer)</Btn>
        </div>
      </Card>

      <Card>
        <Label>Güvenlik Denetimi (PolicyGuard)</Label>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8}}>
          <div>
            <div style={{fontSize:11, color:"#fff"}}>Confidence Threshold</div>
            <div style={{fontSize:9, color:C.muted}}>Minimum %70 zorunludur</div>
          </div>
          <span style={{fontSize:16, fontWeight:800, color:C.green}}>%85</span>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN ADMIN PANEL ───────────────────────────────────
export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("crewai");
  const [saved, setSaved] = useState(false);

  // State
  const [agents, setAgents] = useState(
    Object.fromEntries(Object.entries(AGENT_META).map(([n,m])=>[n,{
      enabled:true, delegation:false, model:m.model,
      maxIter:15, maxRpm:10, memory:true, verbose:false, cache:true,
      goal: n==="OpenClaw"?"Kripto piyasasındaki tüm veri akışlarını sürekli izle, sentiment analizi yap ve kritik fırsatları raporla."
          : n==="Onyx"?"Gelen haberleri ve sinyalleri doğrula, derin araştırma yaparak güvenilirlik skoru üret."
          : n==="Mirofish"?"LSTM ve Monte Carlo modellerini kullanarak fiyat tahminleri üret, güven skoru hesapla."
          :"Patron ve Orchestrator'dan gelen emirleri Binance API üzerinden güvenle yürüt.",
      tasks: OPENCLAW_TASKS.map(t=>({...t}))
    }]))
  );
  const [tradeCfg, setTradeCfg] = useState({
    exchange:"Binance", apiKey:"", secret:"", testnet:true, sandbox:false, hedgeMode:false,
    orderTypes:["market","limit","stop_market"],
    symbols: Object.fromEntries(SYMBOLS.map(s=>[s,{leverage:10,marginMode:"isolated",posSize:5,sl:2,tp:4}]))
  });
  const [risk, setRisk] = useState({
    maxDrawdown:15,dailyLossLim:5,maxPositions:5,maxPerTrade:10,cooldownMin:30,correlLimit:70,
    autoStopLoss:true,trailingStop:false,antiLiquidation:true,news_pause:false,volFilter:true,nightMode:false
  });
  const [strategy, setStrategy] = useState({
    modes:["arbitrage","scalping","news"],
    autoExecThresh:80, alertThresh:60, ignoreThresh:50,
    scanInterval:30, miroInterval:60, arbScanDelay:500, orderTimeout:30
  });
  const [system, setSystem] = useState({
    dbLog:true,tradeLog:true,agentLog:false,alertPush:true,emailAlert:false
  });

  const handleSave = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  const NAV = [
    {id:"crewai",   icon:"🤖", label:"CrewAI"},
    {id:"trading",  icon:"⚡", label:"İşlem"},
    {id:"risk",     icon:"🛡️", label:"Risk"},
    {id:"strategy", icon:"🎯", label:"Strateji"},
    {id:"system",   icon:"🖥️", label:"Sistem"},
    {id:"plugins",  icon:"🔌", label:"Plugin"},
  ];

  const handleInstallRepo = async (repoUrl: string) => {
    const repo = repoUrl;
    const name = repo.split('/').pop() || "CrewAI-AMP";
    
    // Simulate API call to backend
    try {
      const res = await fetch('/api/agents/add/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repo,
          name: name,
          role: 'Orchestrator',
          confidence_threshold: 85 // Safe above 70
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("✅ " + data.message);
        // Refresh or add to list locally
        setAgents((prev: any) => ({
          ...prev,
          [name]: {
            enabled: true, delegation: true, model: 'Bulduk/crewAI-custom',
            maxIter: 25, maxRpm: 15, memory: true, verbose: true, cache: true,
            goal: "CrewAI AMP Suite: Multi-agent orchestration and complex workflow automation.",
            tasks: []
          }
        }));
      } else {
        alert("❌ " + data.reason);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{height:"100%", display:"flex",flexDirection:"column"}}>

      {/* Section Nav */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,
        background:"rgba(0,0,0,0.3)",overflowX:"auto", flexShrink: 0}}>
        {NAV.map(n=>{
          const active=activeSection===n.id;
          return (
            <button key={n.id} onClick={()=>setActiveSection(n.id)} style={{
              flex:1,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              background:active?"rgba(255,255,255,0.04)":"transparent",
              border:"none",cursor:"pointer",
              borderBottom:`2px solid ${active?"#FF4D6D":"transparent"}`,
              transition:"all 0.15s",minWidth:64}}>
              <span style={{fontSize:16}}>{n.icon}</span>
              <span style={{fontSize:8,color:active?"#FF4D6D":C.muted,fontFamily:"'DM Mono',monospace",fontWeight:active?600:400}}>
                {n.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px"}}>
        {activeSection==="crewai"   && <CrewAISection   agents={agents}   setAgents={setAgents}/>}
        {activeSection==="trading"  && <TradingSection  tradeCfg={tradeCfg} setTradeCfg={setTradeCfg}/>}
        {activeSection==="risk"     && <RiskSection     risk={risk}       setRisk={setRisk}/>}
        {activeSection==="strategy" && <StrategySection strategy={strategy} setStrategy={setStrategy}/>}
        {activeSection==="system"   && <SystemSection   system={system}   setSystem={setSystem}/>}
        {activeSection==="plugins"  && <PluginsSection  onInstall={handleInstallRepo}/>}
      </div>

      {/* Bottom save bar */}
      <div style={{padding:"6px 16px",borderTop:`1px solid ${C.border}`,
        background:"rgba(0,0,0,0.6)",backdropFilter:"blur(20px)",
        display:"flex",gap:8,alignItems:"center", flexShrink: 0, height: 48}}>
        <Btn variant="primary" color="#FF4D6D" onClick={handleSave} style={{flex:1, height: 32}}>
          {saved?"✅ Değişiklikler Kaydedildi":"💾 Tüm Değişiklikleri Kaydet"}
        </Btn>
        <Btn variant="ghost" small onClick={()=>{if(confirm("Tüm ayarlar sıfırlansın mı?"))window.location.reload()}} style={{height: 32}}>↺</Btn>
      </div>
    </div>
  );
}
