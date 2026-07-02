const w=document.getElementById('world');
const b=document.getElementById('enterButton');
const t=document.getElementById('bookText');
b.onclick=()=>{w.classList.add('zoomed');b.style.display='none';t.classList.add('visible');};