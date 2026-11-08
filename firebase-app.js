// ตั้งค่า Firebase จาก Project settings > Your apps > Web app
// ข้อมูล config เป็นตัวระบุโปรเจกต์ ไม่ใช่รหัสผ่าน; ความปลอดภัยอยู่ที่ Firestore Rules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs, limit } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig, TEACHER_UID } from './firebase-config.js';
const $=id=>document.getElementById(id);
const status=$('cloudStatus'), msg=$('teacherMsg');
let auth,db,ready=false,teacher=false,studentAuthPromise;
const configured=!!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!TEACHER_UID;
if(!configured){status.textContent='ยังไม่ได้ตั้งค่า Firebase: เกมเล่นได้ แต่ยังส่งคะแนนออนไลน์ไม่ได้';}
else {
 try{
 const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);ready=true;
 studentAuthPromise=signInAnonymously(auth).then(()=>{status.textContent='☁️ พร้อมส่งคะแนนออนไลน์';}).catch(e=>{status.textContent='ไม่สามารถเชื่อมต่อฐานข้อมูล: '+e.code});
 onAuthStateChanged(auth,user=>{teacher=!!user && !user.isAnonymous && user.uid===TEACHER_UID;});
 }catch(e){status.textContent='Firebase เริ่มต้นไม่สำเร็จ: '+e.message;}
}
window.submitQuizScore=async data=>{
 if(!ready){alert('เกมจบแล้ว แต่ยังไม่ได้ตั้งค่าฐานข้อมูล จึงไม่ได้ส่งคะแนน');return;}
 try{
 await studentAuthPromise;
 if(!auth.currentUser || !auth.currentUser.isAnonymous)throw new Error('กรุณาออกจากระบบครูและกลับเข้าเกมใหม่');
 await addDoc(collection(db,'scores'),{...data,createdAt:serverTimestamp(),studentUid:auth.currentUser.uid});
 const p=document.createElement('p');p.textContent='☁️ ส่งคะแนนเข้าระบบครูสำเร็จ';p.style.color='#a4ffb8';$('end').appendChild(p);setTimeout(()=>p.remove(),10000);
 }catch(e){alert('บันทึกคะแนนออนไลน์ไม่สำเร็จ: '+(e.code||e.message));}
};
$('teacherOpen').onclick=()=>{show('teacher');msg.textContent=ready?'กรุณาเข้าสู่ระบบครู':'ต้องตั้งค่า Firebase ก่อนใช้งาน';};
$('teacherBack').onclick=()=>show('login');
$('teacherLogin').onclick=async()=>{
 if(!ready)return;
 try{await signInWithEmailAndPassword(auth,$('teacherEmail').value.trim(),$('teacherPassword').value);if(auth.currentUser.uid!==TEACHER_UID){await signOut(auth);throw new Error('บัญชีนี้ไม่ได้รับสิทธิ์ครู');}teacher=true;$('teacherAuth').classList.add('hidden');$('teacherData').classList.remove('hidden');$('teacherPassword').value='';await loadScores();}
 catch(e){msg.textContent='เข้าสู่ระบบไม่สำเร็จ: '+(e.code||e.message);}
};
$('teacherRefresh').onclick=loadScores;
$('filterClass').oninput=()=>renderScores();
$('teacherLogout').onclick=async()=>{await signOut(auth);teacher=false;$('teacherAuth').classList.remove('hidden');$('teacherData').classList.add('hidden');studentAuthPromise=signInAnonymously(auth);};
let rows=[];
async function loadScores(){
 if(!teacher)return;
 msg.textContent='กำลังโหลดคะแนน...';
 try{const snap=await getDocs(query(collection(db,'scores'),orderBy('createdAt','desc'),limit(1000)));rows=snap.docs.map(d=>d.data());renderScores();msg.textContent='แสดงข้อมูลล่าสุดสูงสุด 1,000 รายการ';}
 catch(e){msg.textContent='โหลดคะแนนไม่สำเร็จ: '+(e.code||e.message);}
}
function renderScores(){
 const filter=$('filterClass').value.trim();const list=rows.filter(x=>!filter||x.studentClass?.includes(filter));const tbody=$('teacherRows');tbody.replaceChildren();
 for(const r of list){const tr=document.createElement('tr');const time=r.createdAt?.toDate?.().toLocaleString('th-TH')||'รอบันทึก';for(const v of [time,r.name||'',r.studentClass||'-',r.category||'',`${r.score||0}/${r.total||100}`]){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}tbody.appendChild(tr)}
 const avg=list.length?(list.reduce((s,r)=>s+(r.score||0),0)/list.length).toFixed(1):'0';$('teacherStats').textContent=`จำนวนการเล่น ${list.length} ครั้ง · คะแนนเฉลี่ย ${avg} คะแนน`;
}
