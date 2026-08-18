const KEY="ayden_settings_v1";
const SYSTEM=`talk like a normal person texting, not like an ai assistant. keep replies short unless more detail is needed. use lowercase letters. be casual, direct, chill, and natural. dont sound like customer support. dont use emojis. dont repeat the users question.`;

const $=s=>document.querySelector(s);
const sidebar=$("#sidebar"),overlay=$("#overlay"),input=$("#input"),messages=$("#messages"),welcome=$("#welcome");
const settings=$("#settings"),key=$("#api-key"),url=$("#api-url"),model=$("#api-model"),send=$("#send");
let history=[];

function cfg(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function setCfg(v){localStorage.setItem(KEY,JSON.stringify(v))}
function updateConnection(){
  const c=cfg(), ok=!!(c.key&&c.url&&c.model);
  $("#connection-text").textContent=ok?"ready":"offline";
  $("#connection-dot").classList.toggle("ready",ok);
  $("#connection-label").textContent=ok?"connected":"not connected";
}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"}
function add(role,text){
  welcome.style.display="none";
  const el=document.createElement("article");el.className=`message ${role}`;
  const icon=document.createElement("div");icon.className="message-icon";icon.textContent=role==="user"?"YOU":"A";
  const p=document.createElement("p");p.textContent=text;el.append(icon,p);messages.append(el);
  el.scrollIntoView({behavior:"smooth",block:"end"});
}
async function ask(text){
  const c=cfg();
  if(!c.key||!c.url||!c.model) throw new Error("open settings and add your api key first");
  const body={model:c.model,messages:[{role:"system",content:SYSTEM},...history,{role:"user",content:text}],temperature:.8,max_tokens:700};
  const r=await fetch(c.url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+c.key},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error?.message||"the api request failed");
  return data.choices?.[0]?.message?.content?.trim()||"no reply came back";
}

$("#composer").addEventListener("submit",async e=>{
  e.preventDefault();const text=input.value.trim();if(!text||send.disabled)return;
  add("user",text);input.value="";resize();send.disabled=true;send.textContent="…";
  try{const reply=await ask(text);history.push({role:"user",content:text},{role:"assistant",content:reply});history=history.slice(-20);add("assistant",reply)}
  catch(err){add("assistant","yeah, something went wrong: "+err.message)}
  finally{send.disabled=false;send.textContent="↑";input.focus()}
});
input.addEventListener("input",resize);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}});
document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;resize();input.focus()});

function openSettings(){
 const c=cfg();key.value=c.key||"";url.value=c.url||"https://api.groq.com/openai/v1/chat/completions";model.value=c.model||"llama-3.1-8b-instant";settings.showModal()
}
$("#settings-open").onclick=openSettings;
$("#settings-close").onclick=()=>settings.close();
$("#save-settings").onclick=()=>{setCfg({key:key.value.trim(),url:url.value.trim(),model:model.value.trim()});updateConnection();settings.close()};
$("#groq-defaults").onclick=()=>{url.value="https://api.groq.com/openai/v1/chat/completions";model.value="llama-3.1-8b-instant"};
$("#clear-key").onclick=()=>{key.value="";const c=cfg();setCfg({...c,key:""});updateConnection()};

function newChat(){history=[];messages.innerHTML="";welcome.style.display="block";input.value="";resize();input.focus()}
$("#new-chat").onclick=newChat;
$("#open-sidebar").onclick=()=>{sidebar.classList.add("open");overlay.classList.add("open")};
$("#close-sidebar").onclick=()=>{sidebar.classList.remove("open");overlay.classList.remove("open")};
overlay.onclick=()=>{$("#close-sidebar").click()};
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat()}if(e.key==="Escape"&&settings.open)settings.close()});
updateConnection();resize();input.focus();
