require("dotenv").config();
const path=require("path"),crypto=require("crypto"),express=require("express"),cookieParser=require("cookie-parser"),Database=require("better-sqlite3");
const app=express(),db=new Database(process.env.DB_FILE||"ayden.db");
app.use(express.json({limit:"1mb"}));app.use(cookieParser());app.use(express.static(path.join(__dirname,"public")));

db.pragma("journal_mode=WAL");
db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,first_name TEXT NOT NULL,last_name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,birthday TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,summary TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);`);

const port=Number(process.env.PORT||3000),SESSION_DAYS=30;
const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID();
const hash=p=>crypto.scryptSync(p,process.env.PASSWORD_SALT||"change-me",64).toString("hex");
const same=(a,b)=>crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const sessions=new Map();

function user(req){
 const token=req.cookies.ayden_session;if(!token)return null;
 const s=db.prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?").get(token,Date.now());
 return s?db.prepare("SELECT * FROM users WHERE id=?").get(s.user_id):null;
}
function requireUser(req,res,next){const u=user(req);if(!u)return res.status(401).json({error:"not signed in"});req.user=u;next()}
function publicUser(u){return {id:u.id,firstName:u.first_name,lastName:u.last_name,email:u.email,birthday:u.birthday||null}}

async function ai(messages){
 const url=process.env.AI_API_URL,key=process.env.AI_API_KEY,model=process.env.AI_MODEL,personality=process.env.AI_PERSONALITY_PROMPT||"be natural, concise, helpful, and casual.";
 if(!url||!key||!model)throw new Error("AI is not configured on the server");
 const body={model,messages:[{role:"system",content:personality},...messages],temperature:Number(process.env.AI_TEMPERATURE||.8),max_tokens:Number(process.env.AI_MAX_TOKENS||800)};
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||"AI request failed");
 return d.choices?.[0]?.message?.content?.trim()||"";
}
async function makeMeta(messages){
 const prompt=[{role:"system",content:"return ONLY valid JSON with keys title and summary. title: 3-7 words, based primarily on what the user is talking about. summary: one short sentence describing the progress so far."},{role:"user",content:messages.map(m=>`${m.role}: ${m.content}`).join("\n")}];
 try{const raw=await ai(prompt);return JSON.parse(raw.replace(/^```json|```$/g,"").trim())}catch{return {title:"New conversation",summary:"Conversation started."}}
}

app.get("/api/me",requireUser,(req,res)=>res.json({user:publicUser(req.user)}));
app.post("/api/auth/signup",async(req,res)=>{
 const {firstName,lastName,email,password,birthday}=req.body||{};
 if(!firstName||!lastName||!email||!password)return res.status(400).json({error:"fill out the required fields"});
 if(password.length<8)return res.status(400).json({error:"password must be at least 8 characters"});
 const clean=email.trim().toLowerCase();
 if(db.prepare("SELECT id FROM users WHERE email=?").get(clean))return res.status(409).json({error:"an account with that email already exists"});
 const uid=id();db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?)").run(uid,firstName.trim(),lastName.trim(),clean,hash(password),birthday||null,now());
 createSession(uid,res);res.json({ok:true});
});
app.post("/api/auth/login",(req,res)=>{
 const {email,password}=req.body||{},u=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").trim().toLowerCase());
 if(!u||!same(hash(password||""),u.password_hash))return res.status(401).json({error:"incorrect email or password"});
 createSession(u.id,res);res.json({ok:true});
});
function createSession(uid,res){const token=crypto.randomBytes(48).toString("hex");const exp=Date.now()+SESSION_DAYS*864e5;db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(token,uid,exp);res.cookie("ayden_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:SESSION_DAYS*864e5});}
app.post("/api/auth/logout",(req,res)=>{if(req.cookies.ayden_session)db.prepare("DELETE FROM sessions WHERE token=?").run(req.cookies.ayden_session);res.clearCookie("ayden_session");res.json({ok:true})});

function chatFor(req,id){return db.prepare("SELECT * FROM chats WHERE id=? AND user_id=?").get(id,req.user.id)}
app.get("/api/chats",requireUser,(req,res)=>res.json({chats:db.prepare("SELECT id,title,summary,created_at,updated_at FROM chats WHERE user_id=? ORDER BY updated_at DESC").all(req.user.id)}));
app.post("/api/chats",requireUser,(req,res)=>{const cid=id(),t=now();db.prepare("INSERT INTO chats VALUES(?,?,?,?,?,?)").run(cid,req.user.id,"New conversation","",t,t);res.json({chat:{id:cid,title:"New conversation",summary:"",messages:[],created_at:t,updated_at:t}})});
app.get("/api/chats/:id",requireUser,(req,res)=>{const c=chatFor(req,req.params.id);if(!c)return res.status(404).json({error:"chat not found"});c.messages=db.prepare("SELECT role,content,created_at FROM messages WHERE chat_id=? ORDER BY id").all(c.id);res.json({chat:c})});
app.post("/api/chats/:id/messages",requireUser,async(req,res)=>{
 const c=chatFor(req,req.params.id),content=(req.body?.content||"").trim();if(!c)return res.status(404).json({error:"chat not found"});if(!content)return res.status(400).json({error:"empty message"});
 const previous=db.prepare("SELECT role,content FROM messages WHERE chat_id=? ORDER BY id").all(c.id);
 db.prepare("INSERT INTO messages(chat_id,role,content,created_at) VALUES(?,?,?,?)").run(c.id,"user",content,now());
 let reply;try{reply=await ai([...previous,{role:"user",content}])}catch(e){return res.status(502).json({error:e.message})}
 db.prepare("INSERT INTO messages(chat_id,role,content,created_at) VALUES(?,?,?,?)").run(c.id,"assistant",reply,now());
 const all=db.prepare("SELECT role,content FROM messages WHERE chat_id=? ORDER BY id").all(c.id);
 if(all.filter(x=>x.role==="user").length===2){
   const meta=await makeMeta(all);db.prepare("UPDATE chats SET title=?,summary=?,updated_at=? WHERE id=?").run(meta.title||"New conversation",meta.summary||"",now(),c.id);
 } else db.prepare("UPDATE chats SET updated_at=? WHERE id=?").run(now(),c.id);
 const fresh=chatFor(req,c.id);fresh.messages=all;res.json({reply,chat:fresh});
});

app.get("/",(req,res)=>{if(!user(req))return res.sendFile(path.join(__dirname,"public","login.html"));res.sendFile(path.join(__dirname,"public","index.html"))});
app.listen(port,()=>console.log(`Ayden running on http://localhost:${port}`));