var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.employerJobs=(function(a){var e;var i;var n=function(){a.ajaxSetup({statusCode:{}});a.ajaxPrefilter(function(w,x,v){w.statusCode=_.extend(w.statusCode||{},{401:function(z,A,y){window.location.reload(true)}})});a('[data-element="jobs"]').on("click","[data-action]",function(v){var w=a(this).closest("[data-id]").data("id");var x=a(this).closest("[data-title]").data("title");switch(a(this).data("action")){case"activate":return r(w,x);case"refresh":return u(w,x);case"archive":return s(w,x);case"delete":return t(w,x)}})};var m=function(){return e.jobPackage.limit>0};var l=function(){return e.jobPackage.limit!==null};var q=function(){a('[data-element="overlay"]').removeClass("hidden")};var g=function(){a('[data-element="overlay"]').addClass("hidden")};var o=function(v){JOBCENTRE.alertFloater.show({summary:v,isError:true,duration:6000})};var h=null;a('[data-element="continue"]').on("click",function(){if(h){h()}f()});var p=function(x,w,v){a('[data-element="confirm-modal"]').find('[data-element="modal-title"]').text(x).end().find('[data-element="modal-description"]').text(w).end().modal("show");h=v};var f=function(){h=null;a('[data-element="confirm-modal"]').find('[data-element="modal-title"]').text("").end().find('[data-element="modal-description"]').text("").end().modal("hide")};var k=function(v){q();a.ajax({url:v.url,dataType:"json",type:v.method,contentType:"application/json",data:v.payload?JSON.stringify(v.payload):null,success:function(x,y,w){if(v.onSuccess){v.onSuccess()}else{window.location.reload(true)}},error:function(x,z,w){if(x.status===402){v.onInsufficientCredit&&v.onInsufficientCredit()}else{if(x.status>=400&&x.status<500){var y=JSON.parse(x.responseText);o(y.message)}else{o("Error connecting to the server.")}}g()}})};var r=function(v,w){if(!m()){return b(v)}p("Publish: "+w,"Will use 1 job credit. Do you wish to continue?",function(){b(v)})};var b=function(v){k({url:"/api/v1.1/jobs/"+v,method:"PUT",payload:{status:"active"},onInsufficientCredit:function(){JOBCENTRE.purchaseModal.purchase(null,function(){b(v)})}})};var u=function(v,w){if(!m()){return j(v)}p("Refresh date for: "+w,"Will use 1 job credit. Do you wish to continue?",function(){j(v)})};var j=function(v){k({url:"/api/v1.1/jobs/"+v+"/refresh",method:"POST",onInsufficientCredit:function(){JOBCENTRE.purchaseModal.purchase(null,function(){j(v)})}})};var s=function(v,w){if(!l()){return c(v)}p("Archive: "+w,"Do you wish to continue?",function(){c(v)})};var c=function(v){k({url:"/api/v1.1/jobs/"+v,method:"PUT",payload:{status:"archived"}})};var t=function(v,w){p("Delete: "+w,"Do you wish to continue?",function(){d(v)})};var d=function(v){k({url:"/api/v1.1/jobs/"+v,method:"DELETE",onSuccess:i?function(){window.location.href=i}:null})};return{init:function(v){e=v.employerPlan;i=v.redirectOnDelete;n()}}}(jQuery));