/* Built-in presentation loading only. Imported cases retain the original host and uploader. */
(function(global){
  'use strict';
  var pending=Object.create(null),loaded=Object.create(null);
  function script(path){
    if(loaded[path])return Promise.resolve();
    return new Promise(function(resolve,reject){var el=document.createElement('script');el.src=path+'?v=20261103-expand1';el.onload=function(){loaded[path]=true;resolve();};el.onerror=function(){el.remove();reject(Error('案例资源加载失败，请重试：'+path));};document.head.appendChild(el);});
  }
  function ensure(c){
    if(!c||!c.__builtinAssets||c.imported)return Promise.resolve();
    if(!c.__lazyBuiltin&&global[c.__demoGlobal])return Promise.resolve();
    if(pending[c.id])return pending[c.id];
    var id=c.id;
    pending[id]=Promise.all([c.__lazyBuiltin?script('assets/cases/'+id+'.case.js'):Promise.resolve(),global[c.__demoGlobal]?Promise.resolve():script('assets/cases/'+id+'.demo.js')]).catch(function(e){delete pending[id];throw e;});
    return pending[id];
  }
  global.BuiltinCases={ensure:ensure};
})(window);
