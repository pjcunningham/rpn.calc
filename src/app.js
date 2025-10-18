(function(){
  // RPN stack state
  const stack = [];
  const entry = document.getElementById('entry');
  const stackEl = document.getElementById('stack');
  const statusEl = document.getElementById('status');
  const sciBox = document.getElementById('sci');
  const progBox = document.getElementById('prog');
  const modeToggle = document.getElementById('modeToggle');
  const layoutBox = document.getElementById('layout');
  const viewToggle = document.getElementById('viewToggle');
  const skinSelect = document.getElementById('skinSelect');
  const angleToggle = document.getElementById('angleToggle');

  // Formatting helper for display
  function fmt(v){
    if (Number.isNaN(v)) return 'NaN';
    if (!Number.isFinite(v)) return (v>0?'∞':'-∞');
    if (Math.abs(v) < 1e12 && Math.abs(v - Math.trunc(v)) < 1e-12) return String(Math.trunc(v));
    return Number(v).toPrecision(12).replace(/\.0+$/,'').replace(/(\.[0-9]*?)0+$/,'$1');
  }

  // Skin-aware stack rendering helpers
  function getSkin(){
    const b = document.body;
    if (b.classList.contains('skin-nixie')) return 'nixie';
    if (b.classList.contains('skin-sinclair')) return 'sinclair';
    if (b.classList.contains('skin-hp48')) return 'hp48';
    return 'other';
  }
  function makeEl(tag, cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }

  // Angle mode (RAD/DEG/GRAD)
  let angle = 'rad';
  function deg2rad(x){ return x * Math.PI / 180; }
  function rad2deg(x){ return x * 180 / Math.PI; }
  function grad2rad(x){ return x * Math.PI / 200; }
  function rad2grad(x){ return x * 200 / Math.PI; }
  function toRad(x){
    if (angle === 'deg') return deg2rad(x);
    if (angle === 'grad') return grad2rad(x);
    return x; // rad
  }
  function fromRad(x){
    if (angle === 'deg') return rad2deg(x);
    if (angle === 'grad') return rad2grad(x);
    return x; // rad
  }
  function updateAngleButton(){ if (angleToggle) angleToggle.textContent = `Angle: ${angle.toUpperCase()}`; }
  function setAngle(a, {announce=false}={}){
    angle = (a==='deg' || a==='grad') ? a : 'rad';
    try { localStorage.setItem('rpn.angle', angle); } catch {}
    updateAngleButton();
    if (announce) setStatus(`Angle: ${angle.toUpperCase()}`);
  }

  // Seven-segment builders for Sinclair skin (LED look)
  const LCD_MAP = {
    '0':['a','b','c','d','e','f'],
    '1':['b','c'],
    '2':['a','b','g','e','d'],
    '3':['a','b','g','c','d'],
    '4':['f','g','b','c'],
    '5':['a','f','g','c','d'],
    '6':['a','f','g','e','c','d'],
    '7':['a','b','c'],
    '8':['a','b','c','d','e','f','g'],
    '9':['a','b','c','d','f','g'],
    '-':['g'],
  };
  function buildLCDDigit(ch){
    const d = makeEl('div','lcd-digit');
    ['a','b','c','d','e','f','g'].forEach(seg=>{
      const s = makeEl('div',`lcd-seg lcd-${seg}`);
      if ((LCD_MAP[ch]||[]).includes(seg)) s.classList.add('on');
      d.appendChild(s);
    });
    return d;
  }
  function buildLCDNumber(txt){
    const box = makeEl('div','lcd-display');
    let lastDigit = null;
    for (let i=0;i<txt.length;i++){
      const ch = txt[i];
      if (ch === '.') {
        if (lastDigit){
          const dp = makeEl('div','lcd-seg lcd-dp on');
          lastDigit.appendChild(dp);
        }
        continue;
      }
      if (!(/[0-9-]/.test(ch))) continue;
      const el = buildLCDDigit(ch);
      box.appendChild(el);
      lastDigit = el;
    }
    return box;
  }

  // Nixie builders (glowing glyphs inside tube)
  function buildNixieDigit(ch){
    if (ch === '.') { return makeEl('div','nixie-decimal'); }
    if (ch === '-') { return makeEl('div','nixie-minus'); }
    const d = makeEl('div','nixie-digit');
    const g = makeEl('div','glyph');
    g.textContent = ch;
    d.appendChild(g);
    return d;
  }
  function buildNixieNumber(txt){
    const box = makeEl('div','nixie-display');
    for (let i=0;i<txt.length;i++){
      const ch = txt[i];
      if (!(/[0-9\.-]/.test(ch))) continue;
      box.appendChild(buildNixieDigit(ch));
    }
    return box;
  }

  // HP-48SX dot-matrix builders (5x7 per digit)
  const HP_FONT = {
    '0':[
      '01110',
      '10001',
      '10011',
      '10101',
      '11001',
      '10001',
      '01110'],
    '1':[
      '00100',
      '01100',
      '00100',
      '00100',
      '00100',
      '00100',
      '01110'],
    '2':[
      '01110',
      '10001',
      '00001',
      '00010',
      '00100',
      '01000',
      '11111'],
    '3':[
      '11110',
      '00001',
      '00001',
      '01110',
      '00001',
      '00001',
      '11110'],
    '4':[
      '00010',
      '00110',
      '01010',
      '10010',
      '11111',
      '00010',
      '00010'],
    '5':[
      '11111',
      '10000',
      '11110',
      '00001',
      '00001',
      '10001',
      '01110'],
    '6':[
      '00110',
      '01000',
      '10000',
      '11110',
      '10001',
      '10001',
      '01110'],
    '7':[
      '11111',
      '00001',
      '00010',
      '00100',
      '01000',
      '01000',
      '01000'],
    '8':[
      '01110',
      '10001',
      '10001',
      '01110',
      '10001',
      '10001',
      '01110'],
    '9':[
      '01110',
      '10001',
      '10001',
      '01111',
      '00001',
      '00010',
      '01100'],
    '-':[
      '00000',
      '00000',
      '00000',
      '01110',
      '00000',
      '00000',
      '00000']
  };
  function buildHPDigit(ch){
    const pattern = HP_FONT[ch];
    const d = makeEl('div','hp-digit');
    if (!pattern) return d;
    for (let r=0;r<7;r++){
      const row = pattern[r];
      for (let c=0;c<5;c++){
        const px = makeEl('div', 'hp-px'+(row[c]==='1'?' on':''));
        d.appendChild(px);
      }
    }
    return d;
  }
  function buildHPNumber(txt){
    const box = makeEl('div','hp-display');
    for (let i=0;i<txt.length;i++){
      const ch = txt[i];
      if (ch==='.'){
        // decimal point as a dedicated tiny digit: only bottom-right pixel on
        const d = makeEl('div','hp-digit');
        for (let r=0;r<7;r++){
          for (let c=0;c<5;c++){
            const on = (r===6 && c===4);
            const px = makeEl('div','hp-px'+(on?' on':''));
            d.appendChild(px);
          }
        }
        box.appendChild(d);
        continue;
      }
      if (!(/[0-9-]/.test(ch))) continue;
      box.appendChild(buildHPDigit(ch));
    }
    return box;
  }

  function renderStackFancy(builder){
    stackEl.innerHTML = '';
    const lines = stack.map(fmt);
    if (lines.length===0){ stackEl.textContent = '  (stack empty)'; return; }
    for (let i=0;i<lines.length;i++){
      const idx = lines.length - i;
      const line = makeEl('div','stack-line');
      const idxEl = makeEl('span','idx');
      idxEl.textContent = String(idx).padStart(2,' ') + ':';
      const disp = builder(lines[i]);
      line.appendChild(idxEl);
      line.appendChild(disp);
      stackEl.appendChild(line);
    }
  }

  function render(){
    const skin = getSkin();
    if (skin==='sinclair') { renderStackFancy(buildLCDNumber); return; }
    if (skin==='nixie') { renderStackFancy(buildNixieNumber); return; }
    if (skin==='hp48') { renderStackFancy(buildHPNumber); return; }
    const lines = stack.map(fmt);
    const disp = lines.map((v,i)=>`${String(lines.length-i).padStart(2,' ')}: ${lines[i]}`).join('\n');
    stackEl.textContent = disp || '  (stack empty)';
  }

  function setStatus(msg, ms=900){
    statusEl.textContent = msg || '';
    if (!msg) return;
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(()=>statusEl.textContent='', ms);
  }

  function pushEntry(){
    const t = entry.value.trim();
    if (!t) return false;
    const n = Number(t);
    if (Number.isFinite(n)) { stack.push(n); entry.value=''; render(); return true; }
    else { setStatus('Not a number'); return false; }
  }

  // Only push entry to stack if it is a valid numeric literal. This prevents
  // spurious "Not a number" messages when the entry contains a command word
  // (e.g., "tan") and an operation calls requireEntryToStack().
  function requireEntryToStack(){
    const t = entry.value.trim();
    if (!t) return;
    if (isNumericText(t)) pushEntry();
    // If it's not numeric, do nothing; command handlers will clear entry as needed.
  }

  function op2(fn){
    requireEntryToStack();
    if (stack.length < 2) { setStatus('Need 2 numbers'); return; }
    const b = stack.pop();
    const a = stack.pop();
    const r = fn(a,b);
    if (Number.isFinite(r)) { stack.push(r); render(); }
    else { setStatus('Invalid operation'); stack.push(a,b); }
  }

  function op1(fn){
    requireEntryToStack();
    if (stack.length < 1) { setStatus('Need 1 number'); return; }
    const a = stack.pop();
    const r = fn(a);
    if (Number.isFinite(r)) { stack.push(r); render(); }
    else { setStatus('Invalid operation'); stack.push(a); }
  }

  // Programmer integer ops (32-bit)
  function toI32(x){ return x|0; }
  function prog2(fn){
    requireEntryToStack();
    if (stack.length < 2) { setStatus('Need 2 numbers'); return; }
    const b = toI32(stack.pop());
    const a = toI32(stack.pop());
    const r = toI32(fn(a,b));
    stack.push(r);
    render();
  }
  function prog1(fn){
    requireEntryToStack();
    if (stack.length < 1) { setStatus('Need 1 number'); return; }
    const a = toI32(stack.pop());
    const r = toI32(fn(a));
    stack.push(r);
    render();
  }

  function add(ch){ entry.value += ch; entry.focus(); }

  // Push a constant value onto the stack (push pending numeric entry first)
  function pushConst(val){
    requireEntryToStack();
    stack.push(val);
    render();
  }

  function isNumericText(t){
    // Accept decimal numbers with optional sign and exponent
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(t);
  }

  function runCommand(cmd){
    const c = (cmd||'').trim().toLowerCase();

    // Stack ops and control
    if (c==='enter' || c==='push') { pushEntry(); return true; }
    if (c==='swap' || c==='x↔y' || c==='x<->y' || c==='x<=>y' || c==='x<>y') {
      requireEntryToStack();
      if (stack.length < 2) { setStatus('Need 2 numbers'); return true; }
      const b = stack.pop(); const a = stack.pop(); stack.push(b,a); render();
      return true;
    }
    if (c==='drop') {
      const tcur = entry.value.trim();
      if (tcur && isNumericText(tcur)) { entry.value=''; return true; }
      if (stack.length===0) { setStatus('Stack empty'); return true; }
      stack.pop(); render();
      return true;
    }
    if (c==='clear' || c==='cls') { stack.length=0; entry.value=''; render(); return true; }

    // Angle mode commands
    if (c==='deg') { setAngle('deg', {announce:true}); return true; }
    if (c==='rad') { setAngle('rad', {announce:true}); return true; }
    if (c==='grad' || c==='gon' || c==='grads' || c==='gradian' || c==='gradians') { setAngle('grad', {announce:true}); return true; }

    // Scientific constants
    if (c==='pi' || c==='π') { requireEntryToStack(); stack.push(Math.PI); render(); return true; }
    if (c==='e') { requireEntryToStack(); stack.push(Math.E); render(); return true; }

    // Unary scientific/basic commands (angle-aware)
    if (c==='sin') { op1(a=>Math.sin(toRad(a))); return true; }
    if (c==='cos') { op1(a=>Math.cos(toRad(a))); return true; }
    if (c==='tan') { op1(a=>Math.tan(toRad(a))); return true; }
    // Hyperbolic trig commands (unitless arguments)
    if (c==='sinh') { op1(a=> (Math.sinh?Math.sinh(a): (Math.exp(a)-Math.exp(-a))/2)); return true; }
    if (c==='cosh') { op1(a=> (Math.cosh?Math.cosh(a): (Math.exp(a)+Math.exp(-a))/2)); return true; }
    if (c==='tanh') { op1(a=>{ if (Math.tanh) return Math.tanh(a); const ea=Math.exp(a), eai=Math.exp(-a); const den=ea+eai; if (den===0){ setStatus('Invalid operation'); return NaN; } return (ea-eai)/den; }); return true; }

    if (c==='asin') { op1(a=> Math.abs(a)<=1 ? fromRad(Math.asin(a)) : (setStatus('Invalid domain'), NaN)); return true; }
    if (c==='acos') { op1(a=> Math.abs(a)<=1 ? fromRad(Math.acos(a)) : (setStatus('Invalid domain'), NaN)); return true; }
    if (c==='atan') { op1(a=> fromRad(Math.atan(a))); return true; }
    // Inverse hyperbolic
    if (c==='asinh') { op1(a=> (Math.asinh?Math.asinh(a): Math.log(a + Math.sqrt(a*a + 1)))); return true; }
    if (c==='acosh') { op1(a=> (a<1 ? (setStatus('Invalid domain'), NaN) : (Math.acosh?Math.acosh(a): Math.log(a + Math.sqrt((a-1)*(a+1)))))); return true; }
    if (c==='atanh') { op1(a=> (Math.abs(a)>=1 ? (setStatus('Invalid domain'), NaN) : (Math.atanh?Math.atanh(a): 0.5*Math.log((1+a)/(1-a))))); return true; }

    if (c==='ln') { op1(a=> a>0 ? Math.log(a) : (setStatus('Invalid domain'), NaN)); return true; }
    if (c==='log10' || c==='log') { op1(a=> a>0 ? (Math.log10?Math.log10(a):Math.log(a)/Math.LN10) : (setStatus('Invalid domain'), NaN)); return true; }
    if (c==='exp') { op1(a=>Math.exp(a)); return true; }

    if (c==='sqrt' || c==='root') { op1(a=> a<0 ? (setStatus('Invalid domain'), NaN) : Math.sqrt(a)); return true; }
    if (c==='cbrt' || c==='cube root' || c==='cuberoot' || c==='∛') { op1(a=> (Math.cbrt?Math.cbrt(a):(a<0?-Math.pow(-a,1/3):Math.pow(a,1/3)))); return true; }

    if (c==='inverse' || c==='inv' || c==='1/x' || c==='recip' || c==='reciprocal') { op1(a=> a===0 ? (setStatus('Divide by zero'), NaN) : 1/a); return true; }

    if (c==='square' || c==='sq' || c==='x2' || c==='x^2') { op1(a=>a*a); return true; }
    if (c==='cube' || c==='cubed' || c==='x^3' || c==='x³' || c==='^3') { op1(a=>a*a*a); return true; }
    if (c==='factorial' || c==='fact' || c==='n!' || c==='x!' || c==='!') { op1(a=>{ if (!Number.isInteger(a)||a<0){ setStatus('Invalid domain'); return NaN;} if (a>170){ setStatus('Overflow'); return NaN;} let r=1; for(let i=2;i<=a;i++){ r*=i; if(!Number.isFinite(r)) break;} return r; }); return true; }

    // Change sign
    if (c==='neg' || c==='chs' || c==='±' || c==='+/-') { op1(a=> -a); return true; }

    // Binary operations
    // Addition aliases include words users naturally type: plus, add, addition
    if (c==='+' || c==='add' || c==='plus' || c==='addition') { op2((a,b)=>a+b); return true; }
    // Subtraction: minus, sub, subtract, subtraction
    if (c==='-' || c==='sub' || c==='minus' || c==='subtract' || c==='subtraction') { op2((a,b)=>a-b); return true; }
    // Multiplication: *, mul, x, ×, times, multiply, multiplication
    if (c==='*' || c==='mul' || c==='x' || c==='×' || c==='times' || c==='multiply' || c==='multiplication') { op2((a,b)=>a*b); return true; }
    // Division: /, div, ÷, :, divide, division, over
    if (c==='/' || c==='div' || c==='÷' || c===':' || c==='divide' || c==='division' || c==='over') { op2((a,b)=> b===0 ? (setStatus('Divide by zero'), NaN) : a/b); return true; }

    if (c==='pow' || c==='^' || c==='y^x') { op2((a,b)=> Math.pow(a,b)); return true; }
    if (c==='nroot' || c==='nthroot' || c==='rootn' || c==='xrooty' || c==='x√y') {
      op2((a,b)=>{
        if (b===0) { setStatus('Invalid domain'); return NaN; }
        if (a<0){
          if (Number.isInteger(b)){
            if (Math.abs(b)%2===1) return -Math.pow(-a, 1/b);
            setStatus('Invalid domain'); return NaN;
          }
          setStatus('Invalid domain'); return NaN;
        }
        return Math.pow(a, 1/b);
      });
      return true;
    }

    // Programmer ops (32-bit)
    if (c==='and' || c==='&') { prog2((a,b)=> a & b); return true; }
    if (c==='or'  || c==='|') { prog2((a,b)=> a | b); return true; }
    if (c==='xor' || c==='^xor') { prog2((a,b)=> a ^ b); return true; }
    if (c==='not' || c==='~') { prog1((a)=> ~a); return true; }
    if (c==='nor') { prog2((a,b)=> ~(a | b)); return true; }
    if (c==='nand') { prog2((a,b)=> ~(a & b)); return true; }
    if (c==='xnor') { prog2((a,b)=> ~(a ^ b)); return true; }
    if (c==='shl' || c==='<<') { prog2((a,b)=> a << (b & 31)); return true; }
    if (c==='shr' || c==='>>') { prog2((a,b)=> a >> (b & 31)); return true; }

    return false;
  }

  function handleEnter(){
    const t = entry.value.trim();
    if (!t) { return; }
    const n = Number(t);
    if (!Number.isNaN(n) && isNumericText(t)) {
      pushEntry();
    } else {
      // Clear entry before running a command so command text (e.g., "drop")
      // doesn't interfere with handlers that inspect entry contents.
      entry.value = '';
      const ok = runCommand(t);
      if (!ok) setStatus('Unknown command');
    }
    entry.focus();
  }

  // Digit and dot buttons
  [
    ['b0','0'],['b1','1'],['b2','2'],['b3','3'],['b4','4'],
    ['b5','5'],['b6','6'],['b7','7'],['b8','8'],['b9','9'],
    ['bdot','.']
  ].forEach(([id, ch]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => add(ch));
  });

  // Basic ops
  document.getElementById('benter')?.addEventListener('click',()=>{ handleEnter(); });
  document.getElementById('badd')?.addEventListener('click',()=>op2((a,b)=>a+b));
  document.getElementById('bsub')?.addEventListener('click',()=>op2((a,b)=>a-b));
  document.getElementById('bmul')?.addEventListener('click',()=>op2((a,b)=>a*b));
  document.getElementById('bdiv')?.addEventListener('click',()=>op2((a,b)=> b===0 ? (setStatus('Divide by zero'), NaN) : a/b));

  document.getElementById('bswap')?.addEventListener('click',()=>{
    requireEntryToStack();
    if (stack.length < 2) { setStatus('Need 2 numbers'); return; }
    const b = stack.pop(); const a = stack.pop(); stack.push(b,a); render();
  });
  document.getElementById('bdrop')?.addEventListener('click',()=>{
    if (entry.value.trim()) { entry.value=''; return; }
    if (stack.length===0) { setStatus('Stack empty'); return; }
    stack.pop(); render();
  });
  document.getElementById('bclear')?.addEventListener('click',()=>{ stack.length=0; entry.value=''; render(); });

  // Scientific ops (unary)
  document.getElementById('bsin')?.addEventListener('click',()=>op1((a)=>Math.sin(toRad(a))));
  document.getElementById('bcos')?.addEventListener('click',()=>op1((a)=>Math.cos(toRad(a))));
  document.getElementById('btan')?.addEventListener('click',()=>op1((a)=>Math.tan(toRad(a))));
  // Hyperbolic trig (arguments are unitless; we do not apply angle mode here)
  document.getElementById('bsinh')?.addEventListener('click',()=>op1((a)=> (Math.sinh?Math.sinh(a): (Math.exp(a)-Math.exp(-a))/2)));
  document.getElementById('bcosh')?.addEventListener('click',()=>op1((a)=> (Math.cosh?Math.cosh(a): (Math.exp(a)+Math.exp(-a))/2)));
  document.getElementById('btanh')?.addEventListener('click',()=>op1((a)=>{
    if (Math.tanh) return Math.tanh(a);
    const ea = Math.exp(a), eai = Math.exp(-a);
    const den = ea + eai;
    if (den === 0) { setStatus('Invalid operation'); return NaN; }
    return (ea - eai) / den;
  }));
  document.getElementById('bsqrt')?.addEventListener('click',()=>op1((a)=> a<0 ? (setStatus('Invalid domain'), NaN) : Math.sqrt(a)));
  document.getElementById('bcbrt')?.addEventListener('click',()=>op1((a)=> (Math.cbrt?Math.cbrt(a):(a<0?-Math.pow(-a,1/3):Math.pow(a,1/3)))));
  document.getElementById('basin')?.addEventListener('click',()=>op1((a)=> Math.abs(a)<=1 ? fromRad(Math.asin(a)) : (setStatus('Invalid domain'), NaN)));
  document.getElementById('bacos')?.addEventListener('click',()=>op1((a)=> Math.abs(a)<=1 ? fromRad(Math.acos(a)) : (setStatus('Invalid domain'), NaN)));
  document.getElementById('batan')?.addEventListener('click',()=>op1((a)=> fromRad(Math.atan(a))));
  // Inverse hyperbolic
  document.getElementById('basinh')?.addEventListener('click',()=>op1((a)=> (Math.asinh?Math.asinh(a): Math.log(a + Math.sqrt(a*a + 1)))));
  document.getElementById('bacosh')?.addEventListener('click',()=>op1((a)=> (a<1 ? (setStatus('Invalid domain'), NaN) : (Math.acosh?Math.acosh(a): Math.log(a + Math.sqrt((a-1)*(a+1)))))));
  document.getElementById('batanh')?.addEventListener('click',()=>op1((a)=> (Math.abs(a)>=1 ? (setStatus('Invalid domain'), NaN) : (Math.atanh?Math.atanh(a): 0.5*Math.log((1+a)/(1-a))))));
  document.getElementById('bln')?.addEventListener('click',()=>op1((a)=> a>0 ? Math.log(a) : (setStatus('Invalid domain'), NaN)));
  document.getElementById('blog10')?.addEventListener('click',()=>op1((a)=> a>0 ? (Math.log10?Math.log10(a):Math.log(a)/Math.LN10) : (setStatus('Invalid domain'), NaN)));
  document.getElementById('bexp')?.addEventListener('click',()=>op1((a)=>Math.exp(a)));
  document.getElementById('bsq')?.addEventListener('click',()=>op1((a)=>a*a));
  document.getElementById('bcube')?.addEventListener('click',()=>op1((a)=>a*a*a));
  document.getElementById('bfact')?.addEventListener('click',()=>op1((a)=>{
    if (!Number.isInteger(a) || a<0) { setStatus('Invalid domain'); return NaN; }
    if (a>170) { setStatus('Overflow'); return NaN; }
    let r=1; for (let i=2;i<=a;i++){ r*=i; if (!Number.isFinite(r)) break; }
    return r;
  }));
  document.getElementById('binv')?.addEventListener('click',()=>op1((a)=> a===0 ? (setStatus('Divide by zero'), NaN) : 1/a));

  // Scientific constants buttons
  document.getElementById('bpi')?.addEventListener('click',()=>pushConst(Math.PI));
  document.getElementById('be')?.addEventListener('click',()=>pushConst(Math.E));

  // Scientific binary ops
  document.getElementById('bpow')?.addEventListener('click',()=>op2((a,b)=> Math.pow(a,b)));
  document.getElementById('bnroot')?.addEventListener('click',()=>op2((a,b)=>{
    if (b===0) { setStatus('Invalid domain'); return NaN; }
    if (a<0){
      if (Number.isInteger(b)){
        if (Math.abs(b)%2===1) return -Math.pow(-a, 1/b);
        setStatus('Invalid domain'); return NaN;
      }
      setStatus('Invalid domain'); return NaN;
    }
    const r = Math.pow(a, 1/b);
    return r;
  }));

  // Sign toggle button (±):
  // - If entry has text, toggle its sign in-place.
  // - If entry is empty, negate X on the stack (op1).
  document.getElementById('bneg')?.addEventListener('click',()=>{
    const t = entry.value;
    if (t.trim() !== '') {
      if (t.trim().startsWith('-')) {
        // remove the first '-' ignoring leading spaces
        entry.value = t.replace(/^\s*-\s*/, '');
      } else {
        entry.value = (t.startsWith(' ') ? '' : '') + '-' + t;
      }
      entry.focus();
      return;
    }
    // No entry text -> negate top of stack
    op1(a=> -a);
  });

  // Programmer buttons
  document.getElementById('band')?.addEventListener('click',()=>prog2((a,b)=> a & b));
  document.getElementById('bor')?.addEventListener('click',()=>prog2((a,b)=> a | b));
  document.getElementById('bxor')?.addEventListener('click',()=>prog2((a,b)=> a ^ b));
  document.getElementById('bnot')?.addEventListener('click',()=>prog1((a)=> ~a));
  document.getElementById('bnor')?.addEventListener('click',()=>prog2((a,b)=> ~(a | b)));
  document.getElementById('bnand')?.addEventListener('click',()=>prog2((a,b)=> ~(a & b)));
  document.getElementById('bxnor')?.addEventListener('click',()=>prog2((a,b)=> ~(a ^ b)));
  document.getElementById('bshl')?.addEventListener('click',()=>prog2((a,b)=> a << (b & 31)));
  document.getElementById('bshr')?.addEventListener('click',()=>prog2((a,b)=> a >> (b & 31)));

  // Mode toggle (Basic/Scientific/Programmer)
  // 0 = Basic, 1 = Scientific, 2 = Programmer
  let mode = 0;
  function updateMode(){
    const label = mode===0 ? 'Basic' : (mode===1 ? 'Scientific' : 'Programmer');
    sciBox?.classList.toggle('hidden', mode!==1);
    progBox?.classList.toggle('hidden', mode!==2);
    // Set body mode class for CSS-driven visibility (e.g., Angle button only in Scientific)
    const body = document.body;
    body.classList.remove('mode-0','mode-1','mode-2');
    body.classList.add(`mode-${mode}`);
    // Robustly control the Angle button visibility regardless of CSS timing/specificity
    if (angleToggle){
      angleToggle.hidden = (mode!==1);
      angleToggle.style.display = (mode===1) ? 'inline-block' : 'none';
      angleToggle.classList.remove('hidden');
    }
    if (modeToggle) modeToggle.textContent = `Mode: ${label}`;
  }
  function saveMode(){
    try { localStorage.setItem('rpn.mode', String(mode)); } catch {}
  }
  modeToggle?.addEventListener('click',()=>{ mode = (mode+1)%3; updateMode(); saveMode(); });

  // View toggle (Horizontal/Vertical)
  function updateView(){
    if (!layoutBox) return;
    const vertical = !!(viewToggle && viewToggle.checked);
    layoutBox.classList.toggle('vertical', vertical);
    layoutBox.classList.toggle('horizontal', !vertical);
  }
  function saveView(){
    try {
      const vertical = !!(viewToggle && viewToggle.checked);
      localStorage.setItem('rpn.view', vertical ? 'vertical' : 'horizontal');
    } catch {}
  }
  viewToggle?.addEventListener('change', ()=>{ updateView(); saveView(); });

  // Keyboard support for Basic and commands
  document.addEventListener('keydown', (e)=>{
    const entryFocused = document.activeElement === entry;
    if (e.key==='Enter') { handleEnter(); e.preventDefault(); return; }
    // Only trigger arithmetic ops from keyboard when the entry is NOT focused.
    // This allows typing a leading '-' (or other characters) into the entry to form negative numbers or commands.
    if (!entryFocused) {
      if (e.key==='+') { op2((a,b)=>a+b); e.preventDefault(); return; }
      if (e.key==='-') { op2((a,b)=>a-b); e.preventDefault(); return; }
      if (e.key==='*') { op2((a,b)=>a*b); e.preventDefault(); return; }
      if (e.key==='/' || e.key===":") { op2((a,b)=> b===0 ? (setStatus('Divide by zero'), NaN) : a/b); e.preventDefault(); return; }
    }
    // Allow digits, letters (for commands), signs, and dot to go into entry by default when focused
  });

  // Skin switching and persistence
  function applySkin(s){
    const body = document.body;
    const classes = ['skin-green','skin-amber','skin-win31','skin-apple','skin-c64','skin-bsod','skin-nixie','skin-sinclair','skin-hp48','skin-sonnet18'];
    body.classList.remove(...classes);
    switch(s){
      case 'amber': body.classList.add('skin-amber'); break;
      case 'win31': body.classList.add('skin-win31'); break;
      case 'apple': body.classList.add('skin-apple'); break;
      case 'c64': body.classList.add('skin-c64'); break;
      case 'bsod': body.classList.add('skin-bsod'); break;
      case 'nixie': body.classList.add('skin-nixie'); break;
      case 'sinclair': body.classList.add('skin-sinclair'); break;
      case 'hp48': body.classList.add('skin-hp48'); break;
      case 'sonnet18': body.classList.add('skin-sonnet18'); break;
      default: body.classList.add('skin-green'); break;
    }
  }
  function saveSkin(s){
    try { localStorage.setItem('rpn.skin', s); } catch {}
  }
  skinSelect?.addEventListener('change', ()=>{
    const allowed = new Set(['green','amber','win31','apple','c64','bsod','nixie','sinclair','hp48','sonnet18']);
    const val = (skinSelect.value||'').toLowerCase();
    const s = allowed.has(val) ? val : 'green';
    applySkin(s);
    saveSkin(s);
    render();
  });

  // Angle toggle button handling (cycle RAD/DEG/GRAD)
  angleToggle?.addEventListener('click', ()=>{
    const order = ['rad','deg','grad'];
    const idx = order.indexOf(angle);
    const next = order[(idx>=0?idx:0)+1 === order.length ? 0 : (idx>=0?idx:0)+1];
    setAngle(next, {announce:true});
  });

  // Init
  // Load saved mode, view, and skin from localStorage before first render
  try {
    const m = localStorage.getItem('rpn.mode');
    if (m !== null) {
      const mi = Number(m);
      if (Number.isFinite(mi) && mi >= 0 && mi <= 2) mode = mi|0;
    }
  } catch {}
  try {
    const v = localStorage.getItem('rpn.view');
    if (v === 'vertical' || v === '1' || v === 'true') {
      if (viewToggle) viewToggle.checked = true;
    } else if (v === 'horizontal' || v === '0' || v === 'false') {
      if (viewToggle) viewToggle.checked = false;
    }
  } catch {}
  let skin = 'green';
  try {
    const s = (localStorage.getItem('rpn.skin')||'').toLowerCase();
    const allowed = new Set(['green','amber','win31','apple','c64','bsod','nixie','sinclair','hp48','sonnet18']);
    if (allowed.has(s)) skin = s;
  } catch {}
  applySkin(skin);
  if (skinSelect) skinSelect.value = skin;

  // Load saved angle mode
  try {
    const a = (localStorage.getItem('rpn.angle')||'rad').toLowerCase();
    setAngle(a);
  } catch {}

  updateMode();
  updateView();
  render();
  entry?.focus();
})();
