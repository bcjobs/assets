var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.jobSearchForm=(function(a){return{init:function(b){a("input[name=location]").select2({minimumInputLength:3,allowClear:true,ajax:{url:b.restPath+"locations?pageSize=5&types=town%2Cprovince%2Cterritory",dataType:"json",data:function(d,c){return{q:d}},results:function(d,c){return{results:d.data}}},initSelection:function(c,d){a.ajax({url:b.restPath+"locations?pageSize=1&types=town%2Cprovince%2Cterritory",data:{q:c.val()},dataType:"json",type:"GET",success:function(f,g,e){if(f.data.length){d(f.data[0])}}})},id:function(c){if(c){return c.description}else{return null}},formatResult:function(c){return c.description},formatSelection:function(c){return c.description}})}}}(jQuery));