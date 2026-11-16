/* Fix 1: remove the built-in demo albums */
[...A.values()].forEach(a=>{if(a.demo&&!a.offline)A.delete(a.id)});
render();
