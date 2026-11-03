'use strict';
const {byId}=require('./catalog');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function mechanism(d){const labels=[d.input,d.method,'实际输出与同条件对照'];return '<svg viewBox="0 0 660 165" role="img" aria-label="'+esc(d.title)+'的输入、学习与输出关系">'+labels.map((s,i)=>'<rect x="'+(5+i*223)+'" y="20" width="205" height="120" rx="7" fill="'+(i===1?'#e4efe3':'#f3f1e8')+'" stroke="#c6d4c1"/><text x="'+(15+i*223)+'" y="43" fill="#235f51" font-size="12">'+['输入与已知材料','实际智能介入','判断与复核'][i]+'</text><foreignObject x="'+(15+i*223)+'" y="53" width="185" height="82"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px/1.7 system-ui;color:#415b49">'+esc(s)+'</div></foreignObject>'+(i<2?'<path d="M'+(211+i*223)+' 80h14" stroke="#2f7d6b"/>':'')).join('')+'</svg>';}
function make(id,K){const d=byId[id];if(!d)throw Error('Unknown expansion '+id);return{
 id:d.id,sceneId:d.sceneId,title:d.title,summary:d.task+' 用'+d.method+'比较'+d.baseline+'。',status:'ready',version:'1.0.0',updated:'2026-11-03',methods:d.methods,demoGlobal:d.globalName,
 tabs:{background:{label:'专业背景',lede:d.task+' 本例围绕可操作的判断展开，检查模型使用了什么、结果为什么变化和哪些条件仍需复核。',judge:[{label:'任务类型',value:d.method,desc:d.operation},{label:'数据条件',value:'固定种子合成观测',desc:d.role},{label:'合成验证',value:'实际模型 / 同数据对照',desc:'完整测试条件与失败档位见演示和公开审计，不预设学习胜出'},{label:'难度',value:'中',desc:d.boundary}],sections:[
  {no:1,en:'TASK',title:d.task,html:'<p>'+esc(d.impact)+'。专业背景只解释当前任务需要的观测和对象；场景概念图不参与模型推理。</p>'+K.figure(mechanism(d),1,'输入、智能介入和输出分别是什么；这是关系图，不是训练过程或数值结果。')},
  {no:2,en:'LEARNING',title:'模型从哪些材料学到了什么',html:'<p><b>'+esc(d.method)+'</b>：'+esc(d.operation)+'。</p><p>'+esc(d.why)+'</p><p>演示中的单点证据调用实际推理函数，按模型列出权重贡献、邻居、树路径、背景距离或后验计算。每次试算仍使用同一个已拟合模型；主动实验例仅用已经完成的观测更新。</p>'},
  {no:3,en:'DATA',title:'数据角色、可见输入与标签用途',html:K.checklist([['输入',d.input,'只使用推理时可观测的信息'],['训练/标定/测试',d.role,'测试标签不进入推理；完整配置与种子公开'],['传统对照',d.baseline,'同条件评分，不用不同数据量制造优势']])+'<p>数据由本项目生成器构造，不是现场观测；专业来源只支持背景概念，不校准本项目数值参数。</p>'},
  {no:4,en:'LIMITS',title:'什么时候不该相信当前结果',html:'<p>'+esc(d.boundary)+'</p><p>可改变 '+d.axes.map(p=>esc(p.name)).join('、')+'，检查分数、误差、约束与覆盖。保留学习分支未胜出和失效条件，不把单点成功当作全场景性能。</p><p><a href="'+esc(d.source)+'" target="_blank" rel="noopener noreferrer">业务背景与方法参考入口</a>；参考项目的工业效果不作为本站成绩。</p>'}
 ]},workflow:{label:'案例流程',title:'案例：'+d.title,lead:[d.task,d.role],stats:[['输入',d.input,true],['实际方法',d.method,true],['同数据对照',d.baseline],['输出去向','人工复核候选']],steps:[
  {name:'定义任务与材料',role:'专业对象',do:d.input,effect:d.task,trap:'隐含标签不能进入推理特征'},
  {name:'隔离训练与测试',role:'数据',do:d.role,effect:'保留可重复的测试对象与条件',trap:'相邻点或同图像素随机切分可能夸大泛化'},
  {name:'拟合并形成判断',role:'智能介入',do:d.operation,effect:d.why,trap:'学习、规则与搜索分开说明，不伪装算法性质'},
  {name:'同条件比较',role:'验证',do:'与 '+d.baseline+' 运行在同一测试对象，指标读取真实计算结果。',effect:'观察方法分歧与输入敏感性',trap:'模型分数、票数与相似度不等于校准概率'},
  {name:'单点追查与复核',role:'输出',do:d.impact+'。选点、改一个输入、恢复并导出单点 JSON。',effect:'把总指标回到一个可以解释的判断',trap:d.boundary}
 ],metrics:{title:'先看实际输出，再看全部条件',html:'<p>当前演示直接报告运行结果；公开审计另用固定独立种子评价三类条件变化。案例并不承诺学习方法总能超过简单对照。任务特有的事件、排序、实验预算、约束、空间容差或区间覆盖须按定义阅读。</p><p>每例有三个可操作条件：</p>'+K.checklist(d.axes.map(p=>[p.name,'默认 '+p.value,'控制条件变化，观察判断与证据']))},fails:d.axes.map(p=>({name:p.name+'改变',why:'这是当前生成器的敏感性条件。模型和规则可能同时退化，完整不利档位需保留；不能直接外推实测场景。'})).concat([{name:'证据边界',why:d.boundary}])},demo:{label:'可运行示范',intro:'先用三步引导选中一个具体对象，查看 '+d.method+' 的真实中间计算，再切换 '+d.baseline+'。'+d.boundary,height:1100}}
 };}
module.exports={make};
