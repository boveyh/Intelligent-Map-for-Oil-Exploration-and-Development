'use strict';
// Small deterministic numerical routines shared at build time; copied into each portable demo.
function createMath(){
  const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
  function random(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function gaussian(r){return Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());}
  const mean=a=>a.reduce((s,v)=>s+v,0)/(a.length||1);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const sigmoid=z=>1/(1+Math.exp(-clip(z,-35,35)));
  const quantile=(a,p)=>a.slice().sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(p*a.length))]||0;
  function scale(X){const mu=X[0].map((_,j)=>mean(X.map(x=>x[j]))),sd=mu.map((m,j)=>Math.sqrt(mean(X.map(x=>(x[j]-m)**2)))||1);return{mu,sd};}
  const transform=(m,x)=>x.map((v,j)=>(v-m.mu[j])/m.sd[j]);
  function solve(A,b){A=A.map((r,i)=>r.slice().concat(b[i]));const n=b.length;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];if(Math.abs(A[c][c])<1e-10)A[c][c]=1e-10;const v=A[c][c];for(let j=c;j<=n;j++)A[c][j]/=v;for(let r=0;r<n;r++)if(r!==c){const t=A[r][c];for(let j=c;j<=n;j++)A[r][j]-=t*A[c][j];}}return A.map(r=>r[n]);}
  function inverse(A){return A.map((_,j)=>solve(A,A.map((_,i)=>i===j?1:0))).map((_,i,cols)=>cols.map(c=>c[i]));}
  function fitLinear(X,y,lambda=.1){const m=scale(X),Z=X.map(x=>[1,...transform(m,x)]),d=Z[0].length,A=Array.from({length:d},()=>Array(d).fill(0)),b=Array(d).fill(0);Z.forEach((x,i)=>{for(let j=0;j<d;j++){b[j]+=x[j]*y[i];for(let k=0;k<d;k++)A[j][k]+=x[j]*x[k];}});for(let j=1;j<d;j++)A[j][j]+=lambda;return{...m,w:solve(A,b),kind:'linear',n:X.length};}
  function fitLogistic(X,y,iterations=260){const m=scale(X),Z=X.map(x=>[1,...transform(m,x)]),w=Array(Z[0].length).fill(0),positive=y.reduce((a,b)=>a+b,0),weight=(y.length-positive)/(positive||1);for(let it=0;it<iterations;it++){const g=w.map(()=>0);Z.forEach((x,i)=>{const e=(sigmoid(dot(w,x))-y[i])*(y[i]?weight:1);x.forEach((v,j)=>g[j]+=e*v/Z.length);});w.forEach((_,j)=>w[j]-=.065*(g[j]+(j?.015*w[j]:0)));}return{...m,w,kind:'logistic',n:X.length};}
  function linearProof(m,x){const z=transform(m,x),terms=z.map((v,j)=>v*m.w[j+1]),logit=m.w[0]+terms.reduce((a,b)=>a+b,0);return{value:m.kind==='logistic'?sigmoid(logit):logit,z,terms,logit,steps:z.map((v,j)=>['x'+(j+1)+' 标准值 × 权重',v+' × '+m.w[j+1]+' = '+terms[j]]).concat([['偏置',m.w[0]],['加和',logit]])};}
  function fitForest(X,y,seed=701,classification=true,trees=9,depth=5){
    const r=random(seed),d=X[0].length;
    function build(ids,level){const val=mean(ids.map(i=>y[i]));if(level>=depth||ids.length<14||ids.every(i=>y[i]===y[ids[0]]))return{value:val,n:ids.length};let best=null;
      for(let c=0;c<Math.max(6,d*2);c++){const j=Math.floor(r()*d),t=X[ids[Math.floor(r()*ids.length)]][j],left=ids.filter(i=>X[i][j]<=t),right=ids.filter(i=>X[i][j]>t);if(left.length<4||right.length<4)continue;const l=mean(left.map(i=>y[i])),v=mean(right.map(i=>y[i])),loss=classification?left.length*l*(1-l)+right.length*v*(1-v):left.reduce((s,i)=>s+(y[i]-l)**2,0)+right.reduce((s,i)=>s+(y[i]-v)**2,0);if(!best||loss<best.loss)best={j,t,left,right,loss};}
      if(!best)return{value:val,n:ids.length};return{j:best.j,t:best.t,left:build(best.left,level+1),right:build(best.right,level+1),n:ids.length};
    }
    return{kind:'forest',classification,trees:Array.from({length:trees},()=>build(X.map(()=>Math.floor(r()*X.length)),0)),n:X.length};
  }
  function forestProof(m,x){const paths=m.trees.map((node,k)=>{const path=[];while(node.value==null){const yes=x[node.j]<=node.t;path.push('x'+(node.j+1)+' '+x[node.j].toFixed(4)+(yes?' ≤ ':' > ')+node.t.toFixed(4));node=yes?node.left:node.right;}return{tree:k+1,value:node.value,path,n:node.n};});return{value:mean(paths.map(p=>p.value)),paths,steps:[['输入到所有树的实际向量',x.join(' / ')]].concat(paths.map(p=>['树 '+p.tree,p.path.join(' → ')+' → 叶值 '+p.value.toFixed(5)+'（训练 '+p.n+' 样本）']))};}
  function fitKNN(X,y){return{...scale(X),X,y,n:X.length,kind:'knn'};}
  function knnProof(m,x){const z=transform(m,x),neighbors=m.X.map((q,i)=>({i,d:Math.sqrt(q.reduce((s,v,j)=>s+((v-x[j])/m.sd[j])**2,0)),label:m.y[i]})).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,5),votes={};neighbors.forEach(n=>votes[n.label]=(votes[n.label]||0)+1);const value=Number(Object.keys(votes).sort((a,b)=>votes[b]-votes[a]||a-b)[0]);return{value,z,neighbors,votes,steps:neighbors.map((n,j)=>['近邻 '+(j+1)+' / 训练样本 '+n.i,'d='+n.d.toFixed(5)+'；标签 '+n.label]).concat(Object.entries(votes).map(([c,n])=>['类别 '+c+' 票数',n]))};}
  function fitGP(X,y,noise=.035){const n=X.length,K=X.map((a,i)=>X.map((b,j)=>Math.exp(-a.reduce((s,v,k)=>s+(v-b[k])**2,0)/.16)+(i===j?noise*noise:0))),inv=inverse(K),mu=mean(y),alpha=inv.map(row=>dot(row,y.map(v=>v-mu)));return{X,y,inv,mu,alpha,kind:'gp',n};}
  function gpProof(m,x){const k=m.X.map(q=>Math.exp(-q.reduce((s,v,j)=>s+(v-x[j])**2,0)/.16)),terms=k.map((v,j)=>v*m.alpha[j]),value=m.mu+mean([terms.reduce((s,v)=>s+v,0)]),variance=Math.max(1e-9,1-dot(k,m.inv.map(row=>dot(row,k))));return{value,sd:Math.sqrt(variance),steps:k.map((v,j)=>['已测点 '+j+' 核权重 × α',v.toFixed(5)+' × '+m.alpha[j].toFixed(5)+' = '+terms[j].toFixed(5)]).concat([['已测均值',m.mu],['后验标准差（模型假设）',Math.sqrt(variance)]])};}
  function regression(y,p){const m=mean(y),ss=y.reduce((s,v,i)=>s+(v-p[i])**2,0),st=y.reduce((s,v)=>s+(v-m)**2,0);return{rmse:Math.sqrt(ss/y.length),mae:mean(y.map((v,i)=>Math.abs(v-p[i]))),r2:1-ss/(st||1)};}
  function binary(y,p){let tp=0,fp=0,fn=0;for(let i=0;i<y.length;i++){if(p[i]&&y[i])tp++;else if(p[i])fp++;else if(y[i])fn++;}return{tp,fp,fn,f1:2*tp/(2*tp+fp+fn||1),precision:tp/(tp+fp||1),recall:tp/(tp+fn||1)};}
  function macro(y,p){const cls=[...new Set(y)],f=cls.map(c=>binary(y.map(v=>v===c),p.map(v=>v===c)).f1);return mean(f);}
  function groups(flags){const out=[];flags.forEach((v,i)=>{if(v&&(!i||!flags[i-1]))out.push([i,i]);else if(v)out[out.length-1][1]=i;});return out;}
  function eventScore(truth,pred,tolerance=4){const a=groups(truth),b=groups(pred),used=new Set();let tp=0;const delays=[];for(const t of a){const i=b.findIndex((p,j)=>!used.has(j)&&p[1]>=t[0]-tolerance&&p[0]<=t[1]);if(i>=0){used.add(i);tp++;delays.push(b[i][0]-t[0]);}}return{tp,fp:b.length-tp,fn:a.length-tp,f1:2*tp/(a.length+b.length||1),recall:tp/(a.length||1),delay:delays.length?mean(delays):null};}
  function causalSmooth(flags,n=3){return flags.map((_,i)=>i>=n-1&&flags.slice(i-n+1,i+1).every(Boolean));}
  function proof(m,x){return m.kind==='forest'?forestProof(m,x):m.kind==='knn'?knnProof(m,x):m.kind==='gp'?gpProof(m,x):linearProof(m,x);}
  function nearestIndex(points,score){let best=0;points.forEach((p,i)=>{if(score(p)>score(points[best]))best=i;});return best;}
  function record(id,r,i,delta=0){const p=r.points[i],x=r.perturb?r.perturb(p,i,delta):p.x.map((v,j)=>v+(j===(r.control.index||0)?delta:0));const e=r.explain(x,p,i),base=r.baseline(x,p,i);return{version:'trace-v1',caseId:id,index:i,label:p.label||'样本 '+i,role:r.role,inputs:x.map((v,j)=>[r.featureNames[j],v,r.units&&r.units[j]||'']),steps:e.steps,prediction:{name:r.predictionName||'学习分支',value:e.value,unit:r.unit||''},baseline:{name:r.baselineName||'同点传统方法',value:base,unit:r.baseUnit||r.unit||''},control:r.control,note:r.note};}
  return{clip,random,gaussian,mean,dot,sigmoid,quantile,scale,transform,solve,inverse,fitLinear,fitLogistic,linearProof,fitForest,forestProof,fitKNN,knnProof,fitGP,gpProof,regression,binary,macro,groups,eventScore,causalSmooth,proof,nearestIndex,record};
}
module.exports={createMath};
