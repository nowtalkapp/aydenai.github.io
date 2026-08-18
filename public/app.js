const $=s=>document.querySelector(s);
let currentChat=null, chats=[], busy=false;

async function api(path,options={}) {
  const r=await fetch(path,{credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data=await r.json().catch(()=>({}));
  if(r.status===401){location.href="/login.html";return}
  if(!r.ok)throw new Error(data.error||"request failed");
  return data;
}
function escapeName(n){return (n||"").slice(0,1).toUpperCase()}
function renderProfile(user){
  $("#profile-name").textContent=`${user.firstName} ${user.lastName}`.trim();
  $("#profile-email").textContent=user.email;
  $("#settings-name").textContent=`${user.firstName} ${user.lastName}`.trim();
  $("#settings-email").textContent=user.email;
  $("#avatar").textContent=escapeName(user.firstName);$("#settings-avatar").textContent=escapeName(user.firstName);
}
function renderChats(){
  const box=$("#chat-list");box.innerHTML="";
  chats.forEach(c=>{const b=document.createElement("button");b.className="history-item"+(c.id===currentChat?.id?" active":"");b.textContent=c.title||"New conversation";b.onclick=()=>openChat(c.id);box.append(b)})
}
function addMessage(role,text){
  $("#welcome").style.display="none";
  const e=document.createElement("article");e.className=`message ${role}`;
  const i=document.createElement("div");i.className="message-icon";i.textContent=role==="user"?"YOU":"A";
  const p=document.createElement("p");p.textContent=text;e.append(i,p);$("#messages").append(e);e.scrollIntoView({behavior:"smooth",block:"end"});
}
async function loadChats(){
  const d=await api("/api/chats");chats=d.chats||[];renderChats();
  if(!currentChat && chats[0]) await openChat(chats[0].id);
}
async function openChat(id){
  const d=await api(`/api/chats/${id}`);currentChat=d.chat;renderChats();
  $("#messages").innerHTML="";$("#welcome").style.display=currentChat.messages.length?"none":"block";
  currentChat.messages.forEach(m=>addMessage(m.role,m.content));
}
async function newChat(){
  const d=await api("/api/chats",{method:"POST",body:JSON.stringify({})});
  chats.unshift(d.chat);currentChat=d.chat;renderChats();$("#messages").innerHTML="";$("#welcome").style.display="block";$("#input").focus();
}
async function sendMessage(text){
  if(!currentChat||busy)return;busy=true;$("#send").disabled=true;addMessage("user",text);
  try{
    const d=await api(`/api/chats/${currentChat.id}/messages`,{method:"POST",body:JSON.stringify({content:text})});
    addMessage("assistant",d.reply);
    currentChat=d.chat;
    const idx=chats.findIndex(c=>c.id===currentChat.id);if(idx>=0)chats[idx]=currentChat;renderChats();
  }catch(e){addMessage("assistant","yeah, something broke: "+e.message)}
  finally{busy=false;$("#send").disabled=false;$("#input").focus()}
}
$("#composer").onsubmit=e=>{e.preventDefault();const v=$("#input").value.trim();if(v){$("#input").value="";resize();sendMessage(v)}};
$("#input").oninput=resize;
$("#input").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}};
function resize(){const x=$("#input");x.style.height="auto";x.style.height=Math.min(x.scrollHeight,180)+"px"}
document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{$("#input").value=b.dataset.prompt;resize();$("#input").focus()});
$("#new-chat").onclick=newChat;$("#settings-open").onclick=()=>$("#settings").showModal();$("#settings-close").onclick=()=>$("#settings").close();
$("#logout").onclick=$("#logout-settings").onclick=async()=>{await api("/api/auth/logout",{method:"POST"});location.href="/login.html"};
$("#open-sidebar").onclick=()=>{$("#sidebar").classList.add("open");$("#overlay").classList.add("open")};
$("#close-sidebar").onclick=()=>{$("#sidebar").classList.remove("open");$("#overlay").classList.remove("open")};
$("#overlay").onclick=()=>$("#close-sidebar").click();
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat()}});
(async()=>{try{const d=await api("/api/me");renderProfile(d.user);await loadChats()}catch(e){location.href="/login.html"}})();
