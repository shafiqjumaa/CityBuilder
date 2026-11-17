const ALLOWED = new Set(["openai", "gemini", "anthropic"]);
const CATEGORIES = ["توليد الصور","تعديل الصور","التصميم الجرافيكي","الشعارات والهويات","الفيديو والمونتاج","التصوير والإضاءة","البرمجة وتطوير المواقع","الكتابة وصناعة المحتوى","التحليل والتفكير","أخرى"];

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
function extractJson(text) {
  const cleaned = String(text || "").replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  const start=cleaned.indexOf("{"), end=cleaned.lastIndexOf("}");
  if(start<0||end<start) throw new Error("لم يرجع النموذج JSON صالحاً");
  return JSON.parse(cleaned.slice(start,end+1));
}
const instructions = (prompts) => `أنت أمين مكتبة برومبتات وخبير في أدوات الذكاء الاصطناعي والتصميم. حلل كل نص برومبت بشكل مستقل. لا تعِد كتابة البرومبت ولا تختصره؛ مهمتك فقط وصفه وتصنيفه. أعد JSON فقط بهذا الشكل: {"items":[{"sourceIndex":0,"title":"اسم قصير واضح","category":"واحد من التصنيفات المحددة","description":"شرح عربي واضح لما يفعله البرومبت ومتى يستخدم","tags":["كلمة","كلمة"],"tool":"الأداة أو النماذج المناسبة، أو غير محدد"}]}. التصنيفات المسموحة: ${CATEGORIES.join("، ")}. حافظ على ترتيب العناصر، واستخدم sourceIndex يبدأ من صفر. لا تضف حقولاً أخرى.\n\nالبرومبتات:\n${prompts.map((p,i)=>`[${i}]\n${p}`).join("\n\n---\n\n")}`;

async function callOpenAI(key, model, prompt) {
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:prompt,text:{format:{type:"json_object"}}})});
  const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||"OpenAI API request failed");
  const text=(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  return extractJson(text);
}
async function callGemini(key, model, prompt) {
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.2}})});
  const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||"Gemini API request failed");
  return extractJson(d.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("\n"));
}
async function callAnthropic(key, model, prompt) {
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model,max_tokens:4000,temperature:0.2,messages:[{role:"user",content:prompt}]})});
  const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||"Claude API request failed");
  return extractJson(d.content?.filter(x=>x.type==="text").map(x=>x.text).join("\n"));
}

export async function onRequestPost({request}) {
  try {
    const body=await request.json();
    const {provider,model,apiKey,prompts}=body||{};
    if(!ALLOWED.has(provider)) return json({error:"مزود غير مدعوم"},400);
    if(typeof apiKey!=="string"||!apiKey.trim()) return json({error:"مفتاح API مطلوب"},400);
    if(typeof model!=="string"||!model.trim()) return json({error:"اسم النموذج مطلوب"},400);
    if(!Array.isArray(prompts)||prompts.length<1||prompts.length>30||prompts.some(p=>typeof p!=="string"||!p.trim()||p.length>30000)) return json({error:"أرسل من 1 إلى 30 برومبت، بحد أقصى 30 ألف حرف لكل برومبت"},400);
    const prompt=instructions(prompts);
    const result=provider==="openai"?await callOpenAI(apiKey,model,prompt):provider==="gemini"?await callGemini(apiKey,model,prompt):await callAnthropic(apiKey,model,prompt);
    if(!Array.isArray(result.items)) throw new Error("استجابة النموذج لا تحتوي على قائمة items");
    const items=result.items.map(x=>({...x,sourceIndex:Number.isInteger(x.sourceIndex)?x.sourceIndex:-1,category:CATEGORIES.includes(x.category)?x.category:"أخرى"})).filter(x=>x.sourceIndex>=0&&x.sourceIndex<prompts.length);
    return json({items});
  } catch(e) {
    return json({error:e.message||"حدث خطأ غير متوقع أثناء التحليل"},500);
  }
}