const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "ayden-data.json");
fs.mkdirSync(dataDir, { recursive: true });

let db = { users: [], chats: [] };
try { if (fs.existsSync(dbFile)) db = JSON.parse(fs.readFileSync(dbFile, "utf8")); } catch {}
function save(){ fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function id(){ return crypto.randomBytes(16).toString("hex"); }
function hash(password, salt){ return crypto.scryptSync(password, salt, 64).toString("hex"); }
const salt = process.env.SESSION_SECRET || "development-change-me";

app.use(express.json({limit:"1mb"}));
app.use(session({
  secret: salt,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000*60*60*24*30 }
}));
app.use(express.static(path.join(__dirname, "public")));

function auth(req,res,next){
  if(!req.session.userId) return res.status(401).json({error:"Not logged in"});
  next();
}
function currentUser(req){ return db.users.find(u=>u.id===req.session.userId); }

app.post("/api/signup",(req,res)=>{
  const {firstName,lastName,email,password,birthday=""}=req.body||{};
  if(!firstName||!lastName||!email||!password) return res.status(400).json({error:"Please fill in all required fields."});
  if(password.length < 8) return res.status(400).json({error:"Password must be at least 8 characters."});
  const normalized=email.trim().toLowerCase();
  if(db.users.some(u=>u.email===normalized)) return res.status(409).json({error:"An account with that email already exists."});
  const u={id:id(),firstName:firstName.trim(),lastName:lastName.trim(),email:normalized,birthday: birthday||"",passwordSalt:id(),passwordHash:""};
  u.passwordHash=hash(password,u.passwordSalt);
  db.users.push(u); save(); req.session.userId=u.id;
  res.json({user:{firstName:u.firstName,lastName:u.lastName,email:u.email,birthday:u.birthday}});
});
app.post("/api/login",(req,res)=>{
  const {email,password}=req.body||{}; const u=db.users.find(x=>x.email===String(email||"").trim().toLowerCase());
  if(!u) return res.status(401).json({error:"Invalid email or password."});
  if(!u.passwordSalt) return res.status(500).json({error:"Account format error. Please recreate the account."});
  if(hash(password||"",u.passwordSalt)!==u.passwordHash) return res.status(401).json({error:"Invalid email or password."});
  req.session.userId=u.id; res.json({user:{firstName:u.firstName,lastName:u.lastName,email:u.email,birthday:u.birthday}});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",auth,(req,res)=>{const u=currentUser(req);res.json({user:{firstName:u.firstName,lastName:u.lastName,email:u.email,birthday:u.birthday}});});

app.get("/api/chats",auth,(req,res)=>{
  res.json({chats:db.chats.filter(c=>c.userId===req.session.userId).sort((a,b)=>b.updatedAt-a.updatedAt).map(c=>({id:c.id,title:c.title,summary:c.summary,updatedAt:c.updatedAt}))});
});
app.post("/api/chats",auth,(req,res)=>{
  const c={id:id(),userId:req.session.userId,title:"New chat",summary:"",messages:[],updatedAt:Date.now()};
  db.chats.push(c);save();res.json({chat:c});
});
app.get("/api/chats/:id",auth,(req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id&&x.userId===req.session.userId);
  if(!c)return res.status(404).json({error:"Chat not found"});res.json({chat:c});
});

async function ai(messages, system){
  if(!process.env.AI_API_KEY) throw new Error("AI_API_KEY is not configured.");
  const r=await fetch(process.env.AI_API_URL,{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.AI_API_KEY}`},
    body:JSON.stringify({model:process.env.AI_MODEL||"llama-3.1-8b-instant",messages:[{role:"system",content:system},...messages],temperature:Number(process.env.AI_TEMPERATURE||.8),max_tokens:Number(process.env.AI_MAX_TOKENS||800)})
  });
  const text=await r.text(); if(!r.ok) throw new Error(text);
  const j=JSON.parse(text); return j.choices?.[0]?.message?.content||"";
}
app.post("/api/chats/:id/message",auth,async(req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id&&x.userId===req.session.userId);
  if(!c)return res.status(404).json({error:"Chat not found"});
  const content=String(req.body?.content||"").trim(); if(!content)return res.status(400).json({error:"Message is empty."});
  c.messages.push({role:"user",content,at:Date.now()});
  try{
    const reply=await ai(c.messages.map(m=>({role:m.role,content:m.content})),process.env.AI_PERSONALITY_PROMPT||"You are Ayden, a helpful AI assistant.");
    c.messages.push({role:"assistant",content:reply,at:Date.now()});
    if(c.messages.filter(m=>m.role==="user").length===2){
      const meta=await ai(c.messages.map(m=>({role:m.role,content:m.content})),
        "Create a short title (2-6 words) and a one-sentence summary of the user's progress. Return JSON only: {\"title\":\"...\",\"summary\":\"...\"}");
      try{const x=JSON.parse(meta.replace(/```json|```/g,"").trim());c.title=x.title||"New chat";c.summary=x.summary||"";}catch{}
    }
    c.updatedAt=Date.now();save();res.json({reply,title:c.title,summary:c.summary});
  }catch(e){c.messages.pop();save();res.status(500).json({error:"AI request failed. Check your API settings."});}
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Ayden running on http://localhost:${PORT}`));
