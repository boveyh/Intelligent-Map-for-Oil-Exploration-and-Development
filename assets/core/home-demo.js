/* Homepage presentation only. No case registration or import behavior. */
(function (global) {
  'use strict';
  var COLORS = ['#9aa49a', '#d8b678', '#c3aa80', '#8f9d81', '#657f71'];
  function html() {
    return '<aside class="home-case" aria-label="岩性识别精选案例">' +
      '<div class="home-case-head"><div><span>精选案例 · 测井 × KNN</span><h2>岩性识别 · 从曲线到岩性柱</h2></div><a href="#/scene/w4?case=w4-lithology&tab=demo" aria-label="打开岩性识别完整演示">↗</a></div>' +
      '<div class="home-case-choices" role="group" aria-label="首页岩性方法"><button type="button" data-home-method="raw" aria-pressed="false">原始曲线</button><button type="button" data-home-method="standard" aria-pressed="true">井内标准化</button><button type="button" data-home-point>换个井段</button></div>' +
      '<div class="home-case-playback"><i aria-hidden="true"></i><span data-home-step>01 读取当前井段</span><span data-home-mode>自动演示</span></div>' +
      '<div class="home-case-viz" id="home-case-viz"></div><p class="home-case-result" id="home-case-result" aria-live="off"></p>' +
      '<div class="home-case-foot"><span>合成样点 · 实际近邻投票</span><button type="button" data-home-pause aria-pressed="false">暂停动效</button><a href="#/scene/w4?case=w4-lithology&tab=demo">进入完整对照 →</a></div></aside>';
  }
  function mount(root) {
    if (!root || !global.W4CORE) return;
    var W = global.W4CORE, r = W.run({nWells:4, drift:1.2, overlap:.35, seed:20261024});
    var positions = r.test.map(function (_, i) { return i; }).filter(function (i) { return r.pred[0][i] !== r.pred[3][i]; });
    if (!positions.length) positions = [80];
    var reduced=global.matchMedia('(prefers-reduced-motion: reduce)'), cursor=0, standard=true;
    var paused=reduced.matches, visible=true, elapsed=0, last=global.performance.now(), stopped=false;
    var cycle=8000, phase='', pauseButton=root.querySelector('[data-home-pause]');
    function setPhase() {
      var next=elapsed<1700?'input':elapsed<4600?'learn':'result';
      if(next===phase)return;
      phase=next; root.dataset.phase=next;
      root.querySelector('[data-home-step]').textContent={input:'01 读取当前井段',learn:'02 五个近邻逐个投票',result:'03 对照岩性判断'}[next];
    }
    function syncMotion() {
      root.classList.toggle('paused',paused||document.hidden||!visible);
      pauseButton.textContent=paused?'播放演示':'暂停演示';
      pauseButton.setAttribute('aria-pressed',String(paused));
      root.querySelector('[data-home-mode]').textContent=paused?'已暂停 · 可手动切换':'自动演示 · 8 秒一段';
      root.querySelector('#home-case-result').setAttribute('aria-live',paused?'polite':'off');
      last=global.performance.now();
    }
    function render() {
      elapsed=0; last=global.performance.now(); phase=''; setPhase();
      root.classList.toggle('static-frame',paused||reduced.matches);
      var index = positions[cursor % positions.length], q = r.test[index];
      var proof = W.explainKNN(r.train, q, standard), start = Math.max(0, Math.min(r.test.length - 32, index - 15));
      var inputY=29+(index-start)*3.55, outputY=31+(index-start)*3.45;
      var svg = '<svg viewBox="0 0 350 166" role="img" aria-label="当前曲线、五个训练近邻和传统与 KNN 岩性柱的实际对照">';
      svg += '<g class="hc-input"><text x="10" y="14">01 输入曲线</text><rect x="8" y="25" width="75" height="119" rx="5" fill="#f3f0e7"/>';
      ['gr','den'].forEach(function (key,k) {
        var points=[];
        for(var j=0;j<32;j++) { var v=r.test[start+j][key], x=key==='gr'?14+Math.max(0,Math.min(1,v/120))*28:49+Math.max(0,Math.min(1,(v-2.1)/.7))*27; points.push(x.toFixed(1)+','+(29+j*3.55).toFixed(1)); }
        var value=q[key], selectedX=key==='gr'?14+Math.max(0,Math.min(1,value/120))*28:49+Math.max(0,Math.min(1,(value-2.1)/.7))*27;
        svg += '<polyline class="hc-curve" pathLength="1" points="'+points.join(' ')+'" fill="none" stroke="'+(k?'#b08850':'#2f7d6b')+'" stroke-width="1.2"/>';
        svg += '<circle class="hc-sample" cx="'+selectedX.toFixed(1)+'" cy="'+inputY.toFixed(1)+'" r="2.6" fill="'+(k?'#b08850':'#2f7d6b')+'" stroke="#fff" stroke-width=".8"/>';
      });
      svg += '<path class="hc-sample" d="M10 '+inputY.toFixed(1)+'h70" stroke="#2f7d6b" stroke-width=".7" stroke-dasharray="2 2"/><text x="16" y="157">GR</text><text x="51" y="157">DEN</text></g><path d="M87 81h16m-4-4 4 4-4 4" stroke="#7d998b" fill="none"/><circle class="hc-transfer" cx="88" cy="81" r="2.5" fill="#2f7d6b"/>';
      svg += '<g class="hc-learn"><text x="111" y="14">02 五个近邻</text>';
      proof.neighbors.forEach(function(n,i) { svg += '<g class="hc-neighbor" style="animation-delay:'+(1.9+i*.38)+'s"><rect x="112" y="'+(28+i*23)+'" width="69" height="18" rx="4" fill="'+COLORS[n.facies]+'" fill-opacity=".38"/><text x="117" y="'+(40+i*23)+'">井 '+n.sample.well+' · '+n.distance.toFixed(2)+'</text></g>'; });
      svg += '</g><path d="M187 81h16m-4-4 4 4-4 4" stroke="#7d998b" fill="none"/><g class="hc-output"><text x="217" y="14">03 岩性柱对照</text><text x="215" y="26">阈值</text><text x="279" y="26">KNN</text>';
      for(var i=0;i<32;i++) {
        var row=start+i, y=31+i*3.45, model=r.pred[standard?3:2][row];
        svg += '<rect x="215" y="'+y+'" width="29" height="3.7" fill="'+COLORS[r.pred[0][row]]+'"/><rect x="279" y="'+y+'" width="29" height="3.7" fill="'+COLORS[model]+'"/>';
        if (model!==r.pred[0][row]) svg += '<rect x="314" y="'+y+'" width="4" height="3.5" fill="#bb8b48"/>';
      }
      svg += '<rect class="hc-current" x="212" y="'+(outputY-.6)+'" width="99" height="5" fill="none" stroke="#294f40" stroke-width="1.4"/><text x="215" y="157">金色标记：判断分歧</text></g>';
      proof.neighbors.forEach(function(n,i){var y=37+i*23;svg+='<circle class="hc-vote" cx="185" cy="'+y+'" r="3.1" fill="'+COLORS[n.facies]+'" stroke="#fff" stroke-width=".7" style="--vote-y:'+(outputY+1.7-y).toFixed(1)+'px;animation-delay:'+(2.2+i*.38)+'s"/>';});
      svg += '<path d="M8 164h334" stroke="#edf1eb" stroke-width="2"/><path class="hc-timeline" d="M8 164h334" pathLength="1" stroke="#2f7d6b" stroke-width="2"/></svg>';
      root.querySelector('#home-case-viz').innerHTML=svg;
      var names=['灰岩','砂岩','泥质砂岩','砂质泥岩','泥岩'];
      root.querySelector('#home-case-result').textContent=q.depth.toFixed(3)+' m：阈值判为'+names[r.pred[0][index]]+'，KNN 判为'+names[proof.prediction]+'（'+proof.votes[proof.prediction]+'/5 票）。';
      root.querySelectorAll('[data-home-method]').forEach(function(b){b.setAttribute('aria-pressed',String((b.dataset.homeMethod==='standard')===standard));});
    }
    root.querySelectorAll('[data-home-method]').forEach(function(b){b.addEventListener('click',function(){standard=b.dataset.homeMethod==='standard';render();});});
    root.querySelector('[data-home-point]').addEventListener('click',function(){cursor++;render();});
    pauseButton.addEventListener('click',function(){paused=!paused;if(!paused&&root.classList.contains('static-frame'))render();syncMotion();});
    render();
    syncMotion();
    var timer=global.setInterval(function(){
      var now=global.performance.now(), delta=now-last;last=now;
      if(stopped||paused||document.hidden||!visible)return;
      elapsed+=delta;
      if(elapsed>=cycle){cursor++;render();}else setPhase();
    },100);
    document.addEventListener('visibilitychange',syncMotion);
    var observer=global.IntersectionObserver?new global.IntersectionObserver(function(entries){visible=entries[0].isIntersecting;syncMotion();},{threshold:.1}):null;
    if(observer)observer.observe(root);
    function onPreference(){if(reduced.matches){paused=true;root.classList.add('static-frame');}syncMotion();}
    reduced.addEventListener('change',onPreference);
    return {unmount:function(){stopped=true;global.clearInterval(timer);document.removeEventListener('visibilitychange',syncMotion);reduced.removeEventListener('change',onPreference);if(observer)observer.disconnect();}};
  }
  global.HomeLithology={html:html,mount:mount};
})(window);
