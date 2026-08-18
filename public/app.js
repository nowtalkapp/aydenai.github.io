let currentChat=null;
const $=s=>document.querySelector(s);
const sidebar=$("#sidebar"),overlay=$("#overlay"),input=$("#input"),messages=$("#messages"),welcome=$("#welcome"),send=$("#send");
const settings=$("#settings");

async function api(url,opts={}){const r=await fetch(url,{credentials:"same-origin",...opts});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Request failed");return j}

function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"}
function add(role,text){
 welcome.style.display="none";
 const el=document.createElement("article");el.className=`message ${role}`;
 const icon=document.createElement("div");icon.className="message-icon";icon.textContent=role==="user"?"YOU":"A";
 const p=document.createElement("p");p.textContent=text;el.append(icon,p);messages.append(el);
 el.scrollIntoView({behavior:"smooth",block:"end"});
}
function renderChat(c){
 currentChat=c;
 messages.innerHTML="";
 welcome.style.display=c.messages.length?"none":"block";
 c.messages.forEach(m=>add(m.role,m.content));
 if(c.messages.length===0)messages.innerHTML="";
}
async function loadChats(){
 const data=await api("/api/chats");const box=$("#chat-history");box.innerHTML="";
 data.chats.forEach(c=>{const b=document.createElement("button");b.className="history-item"+(currentChat?.id===c.id?" active":"");b.textContent=c.title||"New conversation";b.onclick=()=>openChat(c.id);box.append(b)});
 if(!currentChat&&data.chats[0])openChat(data.chats[0].id);
}
async function openChat(id){const x=await api("/api/chats/"+id);renderChat(x.chat);await loadChats()}
async function newChat(){const x=await api("/api/chats",{method:"POST"});renderChat(x.chat);await loadChats();input.focus()}
async function init(){
 try{const m=await api("/api/me");$("#auth-screen").classList.add("hidden");$("#settings-name").textContent=m.user.firstName+" "+m.user.lastName;$("#settings-email").textContent=m.user.email;$("#connection-text").textContent="ready";$("#connection-dot").classList.add("ready");$("#connection-label").textContent="connected";await loadChats()}catch{document.querySelector(".app").style.display="none";$("#auth-screen").classList.remove("hidden")}
}
$("#login-form")?.addEventListener("submit",async e=>{e.preventDefault();const err=$("#login-error");err.textContent="";try{await api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#login-email").value.trim(),password:$("#login-password").value})});location.href="/"}catch(x){err.textContent=x.message}});
$("#composer").addEventListener("submit",async e=>{e.preventDefault();const text=input.value.trim();if(!text||send.disabled)return;if(!currentChat)await newChat();add("user",text);input.value="";resize();send.disabled=true;send.textContent="…";try{const x=await api("/api/chats/"+currentChat.id+"/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:text})});add("assistant",x.reply);currentChat.title=x.title;await loadChats()}catch(x){add("assistant","yeah, something went wrong: "+x.message)}finally{send.disabled=false;send.textContent="↑";input.focus()}});
input.addEventListener("input",resize);input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}});
document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;resize();input.focus()});
$("#new-chat").onclick=newChat;
function openSettings(){settings.showModal()}
$("#settings-open").onclick=openSettings;$("#settings-close").onclick=()=>settings.close();
$("#settings-logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location="/"};
$("#open-sidebar").onclick=()=>{sidebar.classList.add("open");overlay.classList.add("open")};
$("#close-sidebar").onclick=()=>{sidebar.classList.remove("open");overlay.classList.remove("open")};
overlay.onclick=()=>$("#close-sidebar").click();
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat()}if(e.key==="Escape"&&settings.open)settings.close()});
resize();init();
