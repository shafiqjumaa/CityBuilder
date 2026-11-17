import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, Archive, ArrowDownToLine, ArrowUpFromLine, Bookmark, Check,
  ChevronDown, ChevronLeft, CircleHelp, Clipboard, Code2, Copy, Database,
  FileText, Filter, Folder, Image, Layers3, LayoutDashboard, LoaderCircle,
  Menu, MoreHorizontal, PenLine, Plus, Search, Settings2, Sparkles, Star,
  Tag, Trash2, WandSparkles, X, Zap
} from "lucide-react";

const CATEGORIES = [
  "توليد الصور", "تعديل الصور", "التصميم الجرافيكي", "الشعارات والهويات",
  "الفيديو والمونتاج", "التصوير والإضاءة", "البرمجة وتطوير المواقع",
  "الكتابة وصناعة المحتوى", "التحليل والتفكير", "أخرى"
];
const PROVIDERS = {
  openai: { label: "OpenAI", model: "gpt-4.1-mini" },
  gemini: { label: "Google Gemini", model: "gemini-2.5-flash" },
  anthropic: { label: "Anthropic Claude", model: "claude-sonnet-4-5" }
};
const SEED = [
  { id:"sample-1", title:"مشهد سينمائي واقعي", category:"توليد الصور", description:"إنشاء مشهد بصري سينمائي مع تحكم بالإضاءة والعدسة والجو العام.", prompt:"Create a cinematic, photorealistic scene with dramatic directional lighting, atmospheric depth, realistic material textures, carefully composed framing, and a restrained color palette. Keep the main subject clearly readable and avoid unnecessary visual clutter.", tags:["cinematic","photorealistic","lighting"], tool:"Midjourney / Firefly / Gemini", favorite:true, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:"sample-2", title:"تحليل أسلوب شعار", category:"الشعارات والهويات", description:"تفكيك البناء البصري للشعار وفهم منطق التكوين والخطوط قبل ابتكار اتجاه جديد.", prompt:"Analyze the supplied logo as an experienced brand designer and calligrapher. Describe its construction, geometry, visual rhythm, negative space, stroke logic, proportions, and design rationale. Do not identify the brand. Extract a repeatable design method, then propose a distinct direction for the provided word.", tags:["logo","analysis","branding"], tool:"ChatGPT / Claude", favorite:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:"sample-3", title:"الحفاظ على هوية الشخص", category:"تعديل الصور", description:"توجيه نموذج الصور لإجراء تعديلات مع الحفاظ على ملامح الشخص وملابسه ووضعية جسده.", prompt:"Edit the reference image while preserving the person's exact identity, facial features, skin texture, hairstyle, clothing, body proportions, pose, hands, and expression. Change only the environment and lighting as requested. Maintain natural anatomy and photorealistic integration.", tags:["identity preservation","photo edit"], tool:"Nano Banana / Gemini", favorite:true, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
];

function splitPrompts(raw) {
  return raw.split(/\n\s*(?:---+|===+)\s*\n/g).map(x => x.trim()).filter(Boolean);
}
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function download(name, content, type="application/json") {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}
function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export default function App() {
  const [prompts, setPrompts] = useState(() => {
    const saved = safeParse(localStorage.getItem("pv-prompts") || "null");
    return Array.isArray(saved) ? saved : SEED;
  });
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [provider, setProvider] = useState(localStorage.getItem("pv-provider") || "openai");
  const [model, setModel] = useState(localStorage.getItem("pv-model") || PROVIDERS.openai.model);
  const [apiKey, setApiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem("pv-sb-url") || "");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => localStorage.setItem("pv-prompts", JSON.stringify(prompts)), [prompts]);
  useEffect(() => { localStorage.setItem("pv-provider", provider); localStorage.setItem("pv-model", model); }, [provider, model]);
  useEffect(() => { if (notice) { const t=setTimeout(()=>setNotice(""), 3200); return ()=>clearTimeout(t); } }, [notice]);

  const filtered = useMemo(() => {
    return prompts.filter(p => {
      const text = `${p.title} ${p.description} ${p.prompt} ${(p.tags||[]).join(" ")}`.toLowerCase();
      const matches = !query || text.includes(query.toLowerCase());
      const cat = categoryFilter === "الكل" || p.category === categoryFilter;
      const group = active === "all" || (active === "favorites" && p.favorite) || (active === "recent" && Date.now()-new Date(p.createdAt).getTime() < 7*86400000);
      return matches && cat && group;
    }).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  }, [prompts, query, categoryFilter, active]);

  const stats = useMemo(() => ({
    total: prompts.length,
    categories: new Set(prompts.map(p=>p.category)).size,
    favorites: prompts.filter(p=>p.favorite).length
  }), [prompts]);

  function savePrompt(data) {
    const now = new Date().toISOString();
    if (data.id) setPrompts(prev=>prev.map(p=>p.id===data.id?{...p,...data,updatedAt:now}:p));
    else setPrompts(prev=>[{...data,id:uid(),favorite:false,createdAt:now,updatedAt:now},...prev]);
    setShowDetail(null); setEditing(null); setShowAdd(false); setNotice("تم حفظ البرومبت في مكتبتك");
  }
  function removePrompt(id) {
    setPrompts(prev=>prev.filter(p=>p.id!==id)); setSelected(prev=>prev.filter(x=>x!==id));
    setShowDetail(null); setNotice("تم حذف البرومبت");
  }
  function toggleFavorite(id) {
    setPrompts(prev=>prev.map(p=>p.id===id?{...p,favorite:!p.favorite,updatedAt:new Date().toISOString()}:p));
  }
  async function analyzeBulk() {
    const chunks = splitPrompts(bulkText);
    if (!chunks.length) return setNotice("أضف نص برومبت واحداً على الأقل");
    if (!apiKey.trim()) { setShowSettings(true); return setNotice("أضف مفتاح API أولاً من الإعدادات"); }
    setBusy(true);
    try {
      const response = await fetch("/api/analyze", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({provider,model,apiKey:apiKey.trim(),prompts:chunks})
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر تحليل البرومبتات");
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) throw new Error("لم يرجع النموذج نتائج قابلة للحفظ");
      const now = new Date().toISOString();
      const additions = items.map((item,i)=>({
        id:uid(), title:item.title || `برومبت ${i+1}`, category:CATEGORIES.includes(item.category)?item.category:"أخرى",
        description:item.description || "لا يوجد شرح متاح.", prompt:chunks[item.sourceIndex] || chunks[i] || "",
        tags:Array.isArray(item.tags)?item.tags:[], tool:item.tool || "غير محدد",
        favorite:false, createdAt:now, updatedAt:now
      })).filter(x=>x.prompt);
      setPrompts(prev=>[...additions,...prev]); setBulkText(""); setShowAdd(false);
      setNotice(`تم تحليل وحفظ ${additions.length} برومبت بنجاح`);
    } catch(err) { setNotice(err.message || "حدث خطأ أثناء التحليل"); }
    finally { setBusy(false); }
  }
  async function testApi() {
    if (!apiKey.trim()) return setNotice("أدخل مفتاح API لاختباره");
    setBusy(true);
    try {
      const response = await fetch("/api/analyze", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,model,apiKey:apiKey.trim(),prompts:["Write a concise one-line description of a reusable prompt for generating a product photograph."]})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error || "فشل الاتصال");
      setNotice("الاتصال يعمل بنجاح");
    } catch(e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  async function syncSupabase() {
    if (!supabaseUrl || !supabaseKey) return setNotice("أدخل رابط Supabase ومفتاح anon");
    setSyncing(true);
    try {
      const sb=createClient(supabaseUrl,supabaseKey);
      const {data:{user},error:authError}=await sb.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        const {error}=await sb.auth.signInAnonymously();
        if(error) throw new Error("فعّل Anonymous Sign-ins في Supabase Auth أولاً: "+error.message);
      }
      const {data:{user:current}}=await sb.auth.getUser();
      const rows=prompts.map(p=>({id:p.id,user_id:current.id,title:p.title,category:p.category,description:p.description,prompt:p.prompt,tags:p.tags||[],tool:p.tool||"",favorite:!!p.favorite,created_at:p.createdAt,updated_at:p.updatedAt}));
      const {error}=await sb.from("prompts").upsert(rows);
      if(error) throw error;
      localStorage.setItem("pv-sb-url",supabaseUrl); setSyncEnabled(true); setNotice("تمت مزامنة المكتبة مع Supabase");
    } catch(e) { setNotice(e.message || "تعذرت المزامنة"); }
    finally { setSyncing(false); }
  }

  const navItems = [
    {id:"all",label:"كل البرومبتات",icon:LayoutDashboard,count:stats.total},
    {id:"favorites",label:"المفضلة",icon:Star,count:stats.favorites},
    {id:"recent",label:"أضيفت مؤخراً",icon:Activity}
  ];
  const categoriesCount = CATEGORIES.map(c=>({name:c,count:prompts.filter(p=>p.category===c).length})).filter(x=>x.count);

  return <div className="app-shell">
    <aside className={`sidebar ${showMobileNav?"mobile-open":""}`}>
      <div className="brand"><div className="brand-mark"><Layers3 size={21}/></div><div><strong>Prompt Vault</strong><span>مكتبتك الذكية</span></div><button className="icon-btn mobile-close" onClick={()=>setShowMobileNav(false)}><X size={18}/></button></div>
      <button className="new-prompt-btn" onClick={()=>{setShowAdd(true);setShowMobileNav(false)}}><Plus size={18}/> إضافة برومبتات <span>⌘ K</span></button>
      <div className="nav-label">المكتبة</div>
      <nav className="side-nav">
        {navItems.map(n=><button key={n.id} className={active===n.id?"active":""} onClick={()=>{setActive(n.id);setShowMobileNav(false)}}><n.icon size={17}/><span>{n.label}</span>{n.count!==undefined&&<small>{n.count}</small>}</button>)}
      </nav>
      <div className="nav-label category-label">التصنيفات <button onClick={()=>setCategoryFilter("الكل")} title="إظهار الكل"><Plus size={14}/></button></div>
      <nav className="side-nav category-nav">
        {categoriesCount.map(c=><button key={c.name} className={categoryFilter===c.name?"active":""} onClick={()=>{setCategoryFilter(categoryFilter===c.name?"الكل":c.name);setActive("all");setShowMobileNav(false)}}><span className="category-dot"></span><span>{c.name}</span><small>{c.count}</small></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="storage-card"><div className="storage-icon"><Database size={16}/></div><div><b>تخزين محلي</b><span>بياناتك محفوظة على هذا الجهاز</span></div><span className="online-dot"></span></div>
        <button className="settings-link" onClick={()=>setShowSettings(true)}><Settings2 size={17}/> الإعدادات والربط</button>
        <div className="profile"><div className="avatar">P</div><div><b>مساحة العمل</b><span>حساب شخصي</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-right"><button className="icon-btn mobile-menu" onClick={()=>setShowMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">المكتبة <ChevronLeft size={14}/><b>{active==="favorites"?"المفضلة":active==="recent"?"أضيفت مؤخراً":"كل البرومبتات"}</b></div></div>
        <div className="topbar-actions"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في مكتبتك..." /><kbd>⌘ K</kbd></div><button className="icon-btn" onClick={()=>setShowSettings(true)} title="الإعدادات"><Settings2 size={18}/></button><button className="primary-btn small" onClick={()=>setShowAdd(true)}><Plus size={17}/> إضافة جديد</button></div>
      </header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> مساحة الإبداع المنظّمة</div><h1>مكتبة البرومبتات</h1><p>اجمع أفكارك، نظّم برومبتاتك، واستدعِها في اللحظة المناسبة.</p></div><button className="outline-btn" onClick={()=>download("prompt-vault-backup.json",JSON.stringify(prompts,null,2))}><ArrowDownToLine size={16}/> تصدير المكتبة</button></section>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon purple"><FileText size={19}/></div><div><span>إجمالي البرومبتات</span><strong>{stats.total}</strong></div><small>عنصراً محفوظاً</small></div>
          <div className="stat-card"><div className="stat-icon blue"><Folder size={19}/></div><div><span>التصنيفات النشطة</span><strong>{stats.categories}</strong></div><small>تصنيفاً مستخدماً</small></div>
          <div className="stat-card"><div className="stat-icon amber"><Bookmark size={19}/></div><div><span>البرومبتات المفضلة</span><strong>{stats.favorites}</strong></div><small>للوصول السريع</small></div>
        </section>
        <section className="quick-add">
          <div className="quick-icon"><WandSparkles size={22}/></div><div className="quick-copy"><b>حوّل النصوص المبعثرة إلى مكتبة مرتبة</b><span>ألصق مجموعة برومبتات ودع الذكاء الاصطناعي يسمّيها ويشرحها ويصنّفها تلقائياً.</span></div><button className="primary-btn" onClick={()=>setShowAdd(true)}>ابدأ الإضافة <ChevronLeft size={16}/></button>
          <div className="quick-glow"></div>
        </section>
        <section className="list-heading"><div><h2>{active==="favorites"?"المفضلة":active==="recent"?"أضيفت مؤخراً":"جميع البرومبتات"}</h2><span>{filtered.length} نتيجة</span></div><div className="list-tools"><div className="select-wrap"><Filter size={15}/><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>الكل</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></div><button className="icon-btn" title="استيراد JSON" onClick={()=>inputRef.current?.click()}><ArrowUpFromLine size={17}/></button><input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{const arr=JSON.parse(await f.text());if(!Array.isArray(arr))throw Error();setPrompts(p=>[...arr,...p]);setNotice("تم استيراد الملف");}catch{setNotice("ملف JSON غير صالح");}e.target.value="";}}/></div></section>
        {filtered.length ? <div className="table-wrap"><table><thead><tr><th className="check-col"><input type="checkbox" checked={filtered.length>0&&filtered.every(p=>selected.includes(p.id))} onChange={e=>setSelected(e.target.checked?filtered.map(p=>p.id):[])}/></th><th>البرومبت</th><th>التصنيف</th><th>الأداة</th><th>تاريخ الإضافة</th><th></th></tr></thead><tbody>
          {filtered.map(p=><tr key={p.id}><td><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.id]:s.filter(x=>x!==p.id))}/></td><td><button className="prompt-name" onClick={()=>setShowDetail(p)}><span className="prompt-symbol"><WandSparkles size={16}/></span><span><b>{p.title}</b><small>{p.description}</small></span></button></td><td><span className="category-pill">{p.category}</span></td><td><span className="tool-name">{p.tool||"غير محدد"}</span></td><td className="date-cell">{new Date(p.createdAt).toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"})}</td><td><div className="row-actions"><button className={`icon-btn star-btn ${p.favorite?"is-fav":""}`} onClick={()=>toggleFavorite(p.id)} title="المفضلة"><Star size={16} fill={p.favorite?"currentColor":"none"}/></button><button className="icon-btn" onClick={()=>setShowDetail(p)} title="فتح"><ChevronLeft size={17}/></button></div></td></tr>)}
        </tbody></table></div> : <div className="empty-state"><div className="empty-art"><Archive size={28}/></div><h3>لا توجد برومبتات هنا بعد</h3><p>ابدأ بإضافة أول مجموعة من البرومبتات، وسنرتّبها لك.</p><button className="primary-btn" onClick={()=>setShowAdd(true)}><Plus size={17}/> إضافة برومبتات</button></div>}
        {selected.length>0&&<div className="bulk-bar"><span>تم تحديد {selected.length} عناصر</span><button onClick={()=>{download("selected-prompts.json",JSON.stringify(prompts.filter(p=>selected.includes(p.id)),null,2));}}>تصدير المحدد</button><button className="danger-text" onClick={()=>{setPrompts(p=>p.filter(x=>!selected.includes(x.id)));setSelected([]);}}>حذف المحدد</button><button className="icon-btn" onClick={()=>setSelected([])}><X size={16}/></button></div>}
        <footer className="footer"><span>Prompt Vault <span className="footer-dot">·</span> مساحة آمنة لأفكارك</span><span>صُنع لتنظيم الإبداع <Sparkles size={13}/></span></footer>
      </div>
    </main>

    {showAdd&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowAdd(false)}><section className="modal add-modal">
      <div className="modal-head"><div><div className="modal-kicker"><Sparkles size={14}/> إضافة ذكية</div><h2>أضف برومبتات جديدة</h2><p>الصق النصوص وسنحلل كل برومبت بشكل مستقل.</p></div><button className="icon-btn" onClick={()=>setShowAdd(false)}><X size={19}/></button></div>
      <label className="field-label">نصوص البرومبتات</label><textarea className="prompt-textarea" value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder={"الصق البرومبت الأول هنا...\n\n---\n\nالصق البرومبت الثاني هنا...\n\n---\n\nالصق البرومبت الثالث هنا..."} />
      <div className="textarea-hint"><span>افصل بين البرومبتات باستخدام سطر يحتوي على ---</span><span>{splitPrompts(bulkText).length} برومبت</span></div>
      <div className="ai-note"><div className="ai-note-icon"><Zap size={17}/></div><div><b>تحليل تلقائي بالذكاء الاصطناعي</b><span>سيتم إنشاء اسم وشرح وتصنيف وكلمات مفتاحية لكل برومبت، مع الحفاظ على النص الأصلي.</span></div><button className="text-link" onClick={()=>setShowSettings(true)}>إعداد API</button></div>
      <div className="modal-footer"><button className="outline-btn" onClick={()=>setShowAdd(false)}>إلغاء</button><button className="primary-btn" disabled={busy||!bulkText.trim()} onClick={analyzeBulk}>{busy?<><LoaderCircle className="spin" size={17}/> جارٍ التحليل...</>:<><Sparkles size={17}/> حلّل واحفظ البرومبتات</>}</button></div>
    </section></div>}

    {showSettings&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowSettings(false)}><section className="modal settings-modal">
      <div className="modal-head"><div><div className="modal-kicker"><Settings2 size={14}/> تخصيص الاتصال</div><h2>الإعدادات والربط</h2><p>اربط مزود الذكاء الاصطناعي وقاعدة البيانات الخاصة بك.</p></div><button className="icon-btn" onClick={()=>setShowSettings(false)}><X size={19}/></button></div>
      <div className="settings-section"><div className="section-title"><Sparkles size={17}/><div><b>مزود الذكاء الاصطناعي</b><span>اختر النموذج الذي سيحلل البرومبتات.</span></div></div>
        <label className="field-label">المزوّد</label><select className="field-input" value={provider} onChange={e=>{setProvider(e.target.value);setModel(PROVIDERS[e.target.value].model)}}>{Object.entries(PROVIDERS).map(([k,v])=><option value={k} key={k}>{v.label}</option>)}</select>
        <label className="field-label">اسم النموذج</label><input className="field-input" value={model} onChange={e=>setModel(e.target.value)} placeholder={PROVIDERS[provider].model}/>
        <label className="field-label">مفتاح API</label><input className="field-input ltr-input" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="ألصق مفتاح API هنا"/>
        <div className="security-hint"><CircleHelp size={15}/> لا يتم حفظ مفتاح API في المتصفح أو قاعدة البيانات؛ يبقى في ذاكرة الجلسة ويُرسل عند طلب التحليل فقط.</div>
        <button className="outline-btn test-btn" onClick={testApi} disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Activity size={15}/>} اختبار الاتصال</button>
      </div>
      <div className="settings-section"><div className="section-title"><Database size={17}/><div><b>المزامنة السحابية — Supabase</b><span>اختياري. التخزين المحلي يعمل دون إعداد هذه الخطوة.</span></div></div>
        <label className="field-label">Project URL</label><input className="field-input ltr-input" value={supabaseUrl} onChange={e=>setSupabaseUrl(e.target.value)} placeholder="https://your-project.supabase.co"/>
        <label className="field-label">Publishable / anon key</label><input className="field-input ltr-input" type="password" value={supabaseKey} onChange={e=>setSupabaseKey(e.target.value)} placeholder="sb_publishable_..."/>
        <div className="security-hint"><CircleHelp size={15}/> فعّل Anonymous Sign-ins وشغّل ملف supabase/schema.sql قبل المزامنة. استخدم مفتاحاً عاماً فقط، ولا تضع service_role هنا.</div>
        <button className="outline-btn test-btn" onClick={syncSupabase} disabled={syncing}>{syncing?<LoaderCircle className="spin" size={15}/>:<Database size={15}/>} مزامنة المكتبة الآن</button>
      </div>
      <div className="modal-footer"><button className="primary-btn" onClick={()=>{setShowSettings(false);setNotice("تم حفظ إعدادات المزود");}}>حفظ الإعدادات</button></div>
    </section></div>}

    {showDetail&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowDetail(null)}><section className="modal detail-modal">
      <div className="modal-head"><div><div className="modal-kicker"><WandSparkles size={14}/> تفاصيل البرومبت</div><h2>{showDetail.title}</h2><p>{showDetail.description}</p></div><button className="icon-btn" onClick={()=>setShowDetail(null)}><X size={19}/></button></div>
      <div className="detail-meta"><span className="category-pill">{showDetail.category}</span><span>{showDetail.tool}</span>{(showDetail.tags||[]).map(t=><span className="tag-pill" key={t}>#{t}</span>)}</div>
      <label className="field-label">النص الأصلي</label><pre className="prompt-preview" dir="auto">{showDetail.prompt}</pre>
      <div className="modal-footer detail-actions"><button className="outline-btn" onClick={()=>{navigator.clipboard.writeText(showDetail.prompt);setNotice("تم نسخ البرومبت");}}><Copy size={16}/> نسخ البرومبت</button><button className="outline-btn" onClick={()=>{setEditing(showDetail);setShowDetail(null);}}><PenLine size={16}/> تعديل</button><button className="danger-btn" onClick={()=>removePrompt(showDetail.id)}><Trash2 size={16}/> حذف</button></div>
    </section></div>}

    {editing&&<EditModal item={editing} onClose={()=>setEditing(null)} onSave={savePrompt}/>}
    {notice&&<div className="toast"><Check size={16}/>{notice}</div>}
  </div>;
}

function EditModal({item,onClose,onSave}) {
  const [form,setForm]=useState({...item,tagsText:(item.tags||[]).join(", ")});
  const change=(key,value)=>setForm(f=>({...f,[key]:value}));
  return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal edit-modal">
    <div className="modal-head"><div><div className="modal-kicker"><PenLine size={14}/> تحرير يدوي</div><h2>تعديل البرومبت</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>
    <label className="field-label">الاسم</label><input className="field-input" value={form.title} onChange={e=>change("title",e.target.value)}/>
    <label className="field-label">التصنيف</label><select className="field-input" value={form.category} onChange={e=>change("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
    <label className="field-label">الشرح</label><textarea className="field-input edit-description" value={form.description} onChange={e=>change("description",e.target.value)}/>
    <label className="field-label">الأداة المناسبة</label><input className="field-input" value={form.tool||""} onChange={e=>change("tool",e.target.value)}/>
    <label className="field-label">الكلمات المفتاحية — افصل بينها بفاصلة</label><input className="field-input" value={form.tagsText} onChange={e=>change("tagsText",e.target.value)}/>
    <label className="field-label">نص البرومبت الأصلي</label><textarea className="field-input edit-prompt" dir="auto" value={form.prompt} onChange={e=>change("prompt",e.target.value)}/>
    <div className="modal-footer"><button className="outline-btn" onClick={onClose}>إلغاء</button><button className="primary-btn" onClick={()=>onSave({...form,tags:form.tagsText.split(",").map(x=>x.trim()).filter(Boolean)})}><Check size={16}/> حفظ التعديلات</button></div>
  </section></div>;
}