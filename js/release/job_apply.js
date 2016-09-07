var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.jobApply=(function(a){var p,r,E,w;var H=function(J){H={applications:J+"jobapplications",resumes:J+"resumes",formResume:J+"resumes/form",fetchResume:J+"resumes/fetch",jobAlerts:J+"jobalerts",logResumeError:J+"resumes/logerror",countries:J+"countries",provinces:J+"provinces?countryId=:id"}};var f=Backbone.Model.extend({_validators:{required:function(M,J,N,K,L){if(!N||(N+"").trim()==""){L.push({attr:J,message:M.message||(" is required")})}},maxLength:function(M,J,N,K,L){if(!N||(N+"").trim()==""){return}if(N.trim().length>M.max){L.push({attr:J,message:M.message||String.format(" exceeds {0} characters",M.max)})}},regex:function(M,J,N,K,L){if(!N||(N+"").trim()==""){return}if(!M.pattern.test(N.trim())){L.push({attr:J,message:M.message||(" is invalid")})}},custom:function(M,J,O,K,L){if(!M.isValid){throw new Error("isValid missing for custom validation")}var N=M.isValid(M,J,O,K);if(N===true){return}if(N===false){L.push({attr:J,message:M.message});return}if(_.isString(N)){L.push({attr:J,message:N});return}throw new Error("validity not supported.")}},isValid:function(){if(!this.validations){return true}var K=[];for(var J in this.attributes){if(!this.attributes.hasOwnProperty(J)){continue}if(!this.validations[J]){continue}var M=this.validations[J];for(var L in M){if(!M.hasOwnProperty(L)){continue}if(!this._validators[L]){throw new Error("Validation "+L+" not supported.")}this._validators[L](M[L],J,this.attributes[J],this.attributes,K)}}if(K.length>0){this.trigger("validation-error",this,K);return false}else{return true}},ajaxSuccess:function(K,L,M,J){this.set(this.parse(L,J));if(this.state){this.state.set({ready:true})}if(K.success){K.success(this,L)}},ajaxError:function(N,M,P,K){if(M.status===400){var O=JSON.parse(M.responseText);if(N.error){N.error(this,O.message)}else{var L=["ValidationException","InvalidOperationException"];if(_.indexOf(L,O.error.type)!==-1){this.trigger("validation-error",this,[O.message])}}return}var J=["Error connecting to the server."];if(N.error){N.error(this,J)}else{this.trigger("error",this,J)}}});var F=Backbone.Model.extend({defaults:{ready:false,error:null}});var h=Backbone.Model.extend({collection:Backbone.Collection,listName:"",url:"",initialize:function(){this._loading=false;this._loaded=false;this._list=new this.collection()},getList:function(){if(!this._loaded){this._load()}return this._list},_load:function(){var J=this;if(!this._loading){this._list.state.set({ready:false,error:null});this._loading=true;var K=this.url;if(_.isFunction(K)){K=K.call(this)}a.ajax({url:K,dataType:"json",cache:true,type:"GET",success:function(M,N,L){J._list.reset(M.data);J._list.state.set({ready:true,error:null});J._loaded=true},error:function(M,N,L){J._list.state.set({error:String.format("Error retrieving {0} list.",J.listName)})},complete:function(L,M){J._loading=false}})}}});var n=Backbone.Model.extend({initialize:function(){this.provinceCache=new z(null,{countryId:this.id})}});var m=Backbone.Collection.extend({model:n,initialize:function(){this.state=new F()}});var o=h.extend({collection:m,listName:"country",url:function(){return H.countries},getCountries:function(){return this.getList()}});var y=Backbone.Model.extend({});var A=Backbone.Collection.extend({model:y,initialize:function(){this.state=new F()}});var z=h.extend({collection:A,listName:"province",url:function(){return H.provinces.replace(":id",this._countryId)},initialize:function(J,K){h.prototype.initialize.call(this,J,K);this._countryId=K.countryId},getProvinces:function(){return this.getList()}});var B=f.extend({defaults:{state:"idle"},initialize:function(){this.restore()},restore:function(){this.set({state:"",fileName:"",fileSize:0,token:null,progress:0,error:null})},setError:function(J){this.restore();this.set({state:"error",error:J})},setUploading:function(J){this.restore();this.set({state:"uploading"})},setResume:function(K,J){this.restore();this.set({state:"uploaded",token:K,fileName:J})},removeResume:function(){this.restore();this.set({state:"idle"})},setFileSize:function(J){if(J===0){this.set({fileSize:"? KB"})}else{if(J>1024*1024){this.set({fileSize:(Math.round(J*100/(1024*1024))/100).toString()+"MB"})}else{this.set({fileSize:(Math.round(J*100/1024)/100).toString()+"KB"})}}},isUploaded:function(){return this.get("state")==="uploaded"},isUploading:function(){return this.get("state")==="uploading"},send:function(L,J){var K=new FormData();K.append("file",L);var M=new XMLHttpRequest();M.upload.addEventListener("progress",J.progress,false);M.addEventListener("load",J.load,false);M.addEventListener("error",J.error,false);M.addEventListener("abort",J.abort,false);M.open("POST",H.resumes);M.setRequestHeader("Accept","application/json");M.send(K)},fetch:function(M,K,J,L){L||(L={});var N=this;a.ajax({url:H.fetchResume,contentType:"application/json",data:JSON.stringify({url:K,accessToken:J,source:M}),dataType:"json",type:"POST",success:function(P,Q,O){if(L.success){L.success(N,P)}},error:_.bind(N.ajaxError,N,L)})}});var c=f.extend({defaults:{jobId:null,resumeToken:null,firstName:"",lastName:"",email:"",phone:"",countryId:"",provinceId:"",city:"",coverLetter:"",resumeSource:null},validations:{resumeToken:{required:{message:"Resume is required."}},firstName:{required:{},maxLength:{max:128}},lastName:{required:{},maxLength:{max:128}},email:{required:{},maxLength:{max:256},regex:{pattern:/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/}},phone:{maxLength:{max:20},regex:{pattern:/^[\d-\.()\+\s]+$/}},city:{required:{},maxLength:{max:50}},provinceId:{required:{}},countryId:{required:{}}},save:function(K){K||(K={});var L=this;var J=this.toJSON();if(J.provinceId){J.province={id:J.provinceId};delete J.provinceId}if(J.countryId){J.country={id:J.countryId};delete J.countryId}if(r){J.eid=r}a.ajax({url:H.applications,contentType:"application/json",data:JSON.stringify(J),dataType:"json",type:"POST",success:function(N,O,M){L.set(L.parse(N,M));if(K.success){K.success(L,N)}},error:function(P,R,N){if(P.status===400){var Q=JSON.parse(P.responseText);if(K.error){K.error(L,[Q.message]);return}var O=["ValidationException","InvalidOperationException"];if(_.indexOf(O,Q.type)!==-1){L.trigger("validation-error",L,[Q.message]);return}}var M=["Error connecting to the server."];if(K.error){K.error(L,M)}else{L.trigger("error",L,M)}}})}});var b=Backbone.Model.extend({defaults:{status:"",error:false}});var u=Backbone.Model.extend({defaults:{name:"",email:"",search:"",location:""},subscribe:function(J){J||(J={});var K=this;a.ajax({url:H.jobAlerts,dataType:"json",cache:false,type:"POST",data:JSON.stringify(this.toJSON()),contentType:"application/json",success:function(M,N,L){K.set(K.parse(M,L));if(J.success){J.success(K,M)}},error:function(M,O,L){if(M.status===400){var N=JSON.parse(M.responseText);if(J.error){J.error(K,[N.message]);return}}if(J.error){J.error(K,["Error connecting to the server."])}}})}},{fromApplicationForm:function(J,L){var K=function(O){if(!O.length){return"Canada"}var N;for(var M=0;M<O.length;M++){N=O[M];if(N.description.indexOf(E,N.length-E.length)!==-1){return N.description+", Canada"}}return O[0].description+", Canada"};return new u({name:J.get("firstName")+" "+J.get("lastName"),email:J.get("email"),search:L.title,location:K(L.locations)})}});var g=function(J){this.parent=null;this.children=[];Backbone.View.apply(this,[J])};_.extend(g.prototype,Backbone.View.prototype,{errorTemplate:_.template(a("#error").html()),loaderClass:"flex-loader",renderState:function(J){if(J.get("error")){a(this.el).html(this.errorTemplate({error:J.get("error")}));return true}if(!J.get("ready")){this.renderLoader(this.el);return true}return false},renderLoader:function(J){var K=document.createElement("div");K.className=this.loaderClass;a(J).empty().append(K)},addChildren:function(J){var K,L=this;if(_.isArray(J)){K=J}else{K=_.toArray(arguments)}_.each(K,function(M){L.children.push(M);M.parent=L});if(K.length===1){return K[0]}else{return K}},disposeChildren:function(J){if(!J){return}var L=this;var K=_.isArray(J)?J:_.toArray(arguments);_.each(K,function(M){M.dispose()})},disposeAllChildren:function(){var J=this.children.slice(0);_.each(J,function(K){K.dispose()})},dispose:function(){this.disposeAllChildren();this.remove();this._removeFromParent()},_removeFromParent:function(){if(this.parent){this.parent._removeChild(this)}},_removeChild:function(J){var K=_.indexOf(this.children,J);if(K!==-1){this.children.splice(K,1)}}});g.extend=Backbone.View.extend;var e=function(J){g.apply(this,[J]);_.bindAll(this,"onSaveSuccess");this.listenTo(this.model,"error",this.onError,this);this.listenTo(this.model,"validation-error",this.onValidationError,this);if(this.model.state){this.listenTo(this.model.state,"change",this.render)}if(J.countries){this._currentProvinces=null;this.listenTo(J.countries.state,"change",this.render)}};_.extend(e.prototype,g.prototype,{_validatable:false,events:{submit:"onSubmit","keyup input,textarea":"onKeyup","change select,input":"onChange",validate:"validateIfReady"},onCancelClick:function(){},onSaveSuccess:function(J,K){},onError:function(K,J){this.onValidationError(K,J)},onValidationError:function(N,L){var J=this.$('[data-element="alert_danger_server"]');J.html("");for(var M=L.length;M--;){var K=L[M];if(_.isString(K)){J.html(K).show()}else{this.$("input[name="+K.attr+"],textarea[name="+K.attr+"],select[name="+K.attr+"]").each(function(){if(this.tagName==="SELECT"){a(this).siblings(".select2-container").addClass("error")}else{a(this).addClass("error")}}).closest(".form-group").find(".form-error").html(K.message).show()}}this.onSaveError()},errorOnSubmit:function(){},onSubmit:function(J){J.preventDefault();this._validatable=true;this.mapToModel();if(this.isValid()){this.save()}else{this.errorOnSubmit()}},mapToModel:function(){var N=this;var J={};var M=this.$("form").serializeArray();for(var K=0,L=M.length;K<L;K++){J[M[K].name]=M[K].value}this.formPreProcess(J);this.model.set(J)},isValid:function(){this.$(".error").removeClass("error");this.$('[data-element="alert_danger_server"]').hide();this.$(".form-error").hide();return this.model.isValid()},formPreProcess:function(J){},onKeyup:function(J){if(J.which===13){return}this.mapToModel();this.validateIfReady()},onChange:function(K){var J=a(K.currentTarget);if(J.attr("name")==="countryId"){this.onCountryChange()}this.mapToModel();this.validateIfReady()},validateIfReady:function(){if(this._validatable){this.isValid()}},onCountryChange:function(){var K=this.$("select[name=countryId]").val();if(K){var J=this.options.countries.get(K);var L=J.provinceCache.getProvinces();this._currentProvinces=L;if(!L.state.get("ready")){this.$("select[name=provinceId]").closest('[data-element="province_input_section"]').append('<div data-element="loader" class="flex-relative"><span class="flex-loader-mini"></span></div>').find(".select2-container").hide();this.listenTo(L.state,"change",this.renderProvinces);return}this.renderProvinces(L.state)}},renderProvinces:function(L){if(this._currentProvinces.state!==L){return}var M=this;var J=this.$("select[name=provinceId]");J.closest('[data-element="province_input_section"]').find('[data-element="loader"]').remove().end().find(".select2-container").show();if(L.get("error")){JOBCENTRE.alertFloater.show({summary:L.get("error"),isError:true,duration:5000});return}if(!L.get("ready")){throw new Error("Provinces not ready.")}var K=[];K.push('<option value=""></option>');this._currentProvinces.each(function(N){K.push(String.format('<option value="{0}"{1}>{2}</option>',N.id,M.model.get("provinceId")==N.id?' selected="selected"':"",N.get("name")))});J.html(K.join("")).trigger("change")},renderCountries:function(){var K=this,J=[];J.push('<option value=""></option>');this.options.countries.each(function(L){J.push(String.format('<option value="{0}"{1}>{2}</option>',L.id,K.model.get("countryId")==L.id?' selected="selected"':"",L.get("name")))});this.$("select[name=countryId]").html(J.join("")).change()},bindSelect2:function(){var K=this;var J=function(){K.$("select").select2()};if(!a.contains(document.documentElement,this.el)){setTimeout(J,10)}else{J()}}});e.extend=g.extend;var x=g.extend({template:_.template(a("#page").html()),render:function(){this.$el.html(this.template());var J=new v({application:this.options.application,applicationForm:this.options.form,job:this.options.job});this.$('[data-outlet="application"]').append(J.render().el);var K=new s({form:this.options.form,application:this.options.application,resume:this.options.resume,countries:this.options.countries});this.$('[data-outlet="application"]').append(K.render().el);return this}});var v=g.extend({template:_.template(a("#message").html()),submittedTemplate:_.template(a("#message_submitted").html()),submittingTemplate:_.template(a("#message_submitting").html()),initialize:function(J){this.listenTo(J.application,"change",this.onChange)},events:{"click [data-action=joblist]":"onJoblistClick"},onJoblistClick:function(){navigate("jobs-clear",true)},onChange:function(){if(!this.options.application.get("status")){this.$el.hide();return}if(this.options.application.get("status")==="submitting"){this.$('[data-outlet="message"]').html(this.submittingTemplate());this.$el.show();a("html,body").scrollTop(this.$el.offset().top);return}if(this.options.application.get("status")==="submitted"){this.$('[data-outlet="message"]').html(this.submittedTemplate(this.options.applicationForm.toJSON()));this.$el.show();if(window.dataLayer){dataLayer.push({event:"custom",eventCategory:"App",eventAction:"JobApplication",eventLabel:undefined,nonInteraction:false})}var J=this.addChildren(new l({form:this.options.applicationForm,job:this.options.job}));this.$('[data-outlet="cta"]').append(J.render().el);return}},render:function(){this.$el.html(this.template()).hide();return this}});var l=g.extend({template:_.template(a("#call_to_action").html()),onSubscribeClick:function(K){K||(K={});var L=this;var J=u.fromApplicationForm(this.options.form,this.options.job);J.subscribe({success:function(){if(window.dataLayer){dataLayer.push({event:"custom",eventCategory:"App",eventAction:"JobAlertSubscribe",eventLabel:"Source:JobApplication",nonInteraction:false})}if(K.complete){K.complete()}L.renderSignup(true)},error:function(){if(K.complete){K.complete()}L.renderSignup(true)}})},renderEmail:function(){this.disposeAllChildren();var J=this.addChildren(new i());J.on("subscribe-click",this.onSubscribeClick,this);this.$('[data-element="cta_message"]').append(J.render().el)},renderSignup:function(J){this.disposeAllChildren();var K=this.addChildren(new k({form:this.options.form,emailPreferenceSaved:J}));this.$('[data-element="cta_message"]').append(K.render().el)},renderPublishProfile:function(){this.disposeAllChildren();var J=this.addChildren(new j());this.$('[data-element="cta_message"]').append(J.render().el)},render:function(){this.$el.html(this.template());if(w==="signup"){this.renderSignup(false)}else{if(w==="email"){this.renderEmail()}else{if(w==="publish_profile"){this.renderPublishProfile()}}}return this}});var i=g.extend({className:"flex-relative",template:_.template(a("#call_to_action_email").html()),events:{"click [data-action=subscribe]":"onSubscribeClick"},onSubscribeClick:function(){this.$('[data-element="overlay"]').show();this.trigger("subscribe-click",{complete:_.bind(this.onSubscribeComplete,this)})},onSubscribeComplete:function(){this.$('[data-element="overlay"]').hide()},render:function(){this.$el.html(this.template());return this}});var k=g.extend({template:_.template(a("#call_to_action_signup").html()),render:function(){this.$el.html(this.template({form:this.options.form.toJSON(),emailPreferenceSaved:this.options.emailPreferenceSaved}));return this}});var j=g.extend({template:_.template(a("#call_to_action_publish_profile").html()),render:function(){this.$el.html(this.template());return this}});var s=g.extend({template:_.template(a("#forms_wrapper").html()),className:"clearfix",initialize:function(J){this.listenTo(J.application,"change:status",this.onChange);this.listenTo(J.application,"change:error",this.onError)},onChange:function(){if(this.options.application.get("status")){this.$el.hide()}else{this.$el.show()}},onError:function(K,L){if(!L){return}var J=this.$('[data-element="error_message"]:visible,.form-error:visible').first();if(J.length>0){if((a("html").scrollTop()||a("body").scrollTop())>J.offset().top){a("html,body").animate({scrollTop:J.parent().offset().top},500)}}this.options.application.set({error:false})},render:function(){this.$el.html(this.template());var K=this.addChildren(new D({model:this.options.resume,form:this.options.form}));this.$el.append(K.render().el);var J=this.addChildren(new d({model:this.options.form,resume:this.options.resume,application:this.options.application,countries:this.options.countries}));this.$el.append(J.render().el);return this}});var D=g.extend({template:_.template(a("#resume").html()),uploadingTemplate:_.template(a("#resume_uploading").html()),progressTemplate:_.template(a("#resume_progress").html()),tokenTemplate:_.template(a("#resume_token").html()),errorTemplate:_.template(a("#resume_error").html()),initialize:function(){this.resumeUploadView=null;this.listenTo(this.model,"change:state",this.onStateChange);this.listenTo(this.model,"change:progress",this.onProgressChange);this.listenTo(this.model,"change:token",this.updateResult)},events:{"click [data-action]":"onActionClick"},onActionClick:function(J){switch(a(J.currentTarget).data("action")){case"remove_resume":this.model.removeResume();break;default:throw new Error()}},renderButton:function(){this.renderUploadButton();this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new q({model:this.model,form:this.options.form})).render().el);this.onStateChange(this.model,this.model.get("state"))},onSubmitResume:function(){this.$("form").submit()},showButton:function(){this.$('[data-element="upload_title"]').show();this.$('[data-outlet="file_uploaders"]').show();this.disposeChildren(this.resumeUploadView);this.renderUploadButton()},renderUploadButton:function(){this.resumeUploadView=this.addChildren(C.create({model:this.model,form:this.options.form}));this.resumeUploadView.on("submit-resume",this.onSubmitResume,this);this.$('[data-outlet="file_uploaders"]').prepend(this.resumeUploadView.render().el)},hideButton:function(){this.$('[data-outlet="file_uploaders"]').hide();this.$('[data-element="upload_title"]').hide()},onStateChange:function(J,K){switch(K){case"":break;case"idle":this.showButton();break;case"uploading":this.$('[data-element="error_message"]').html("").hide();this.$('[data-element="upload_progress"]').html(this.uploadingTemplate(this.model.toJSON())).show();this.hideButton();return;case"uploaded":this.$('[data-element="error_message"]').html("").hide();this.$('[data-element="upload_progress"]').html("").hide();this.hideButton();return;case"error":this.$('[data-element="error_message"]').html(this.errorTemplate(this.model.toJSON())).show();this.$('[data-element="upload_progress"]').html("").hide();this.showButton();break;default:throw new Error(String.format("State {0} not supported.",K))}},onProgressChange:function(K,J){if(J){this.$('[data-element="upload_progress"]').html(this.progressTemplate(this.model.toJSON())).show()}},updateResult:function(){if(this.model.get("token")){this.$('[data-element="upload_result"]').html(this.tokenTemplate(this.model.toJSON())).show()}else{this.$('[data-element="upload_result"]').html("").hide()}},render:function(){this.$el.html(this.template(this.model));this.renderButton();this.updateResult();return this}});var G=g.extend({validate:function(L,K){if(L>1*1024*1024){return"File exceeds 1 MB."}var J=_.last(K.split(".")).toLowerCase();switch(J){case"docx":case"doc":case"rtf":case"pdf":case"txt":break;default:return"Only Word, Plain Text, PDF, RTF file types allowed."}},fillForm:function(K){if(!K){return}var J={};if(K.firstName&&!this.options.form.get("firstName")){J.firstName=K.firstName}if(K.lastName&&!this.options.form.get("lastName")){J.lastName=K.lastName}if(K.email&&!this.options.form.get("email")){J.email=K.email}if(K.phone&&!this.options.form.get("phone")){J.phone=K.phone}this.options.form.set(J,{updateForm:true})},setSource:function(){this.options.form.set("resumeSource",this.source)}});var C=G.extend({source:null,template:_.template(a("#resume_upload").html()),events:{'change [data-element="file_input"]':"initializeUpload"},initializeUpload:function(){this.model.setUploading();this.uploadResume()},render:function(){this.$el.html(this.template(this.model));return this}},{create:function(J){if(window.FormData){return new I(J)}else{return new t(J)}}});var I=C.extend({uploadResume:function(){var J=this.$('[data-element="file_input"]')[0].files[0];if(!J){this.model.setError("File could not be selected.");return}if(this.validate(J.size,J.name)){this.model.setError(this.validate(J.size,J.name));new Image().src=H.logResumeError+"?source=upload&location=client&name="+encodeURIComponent(J.name)+"&size="+encodeURIComponent(J.size);return}this.model.set({fileName:J.name});this.model.setFileSize(J.size);this.model.send(J,{progress:_.bind(this.progress,this),load:_.bind(this.load,this),error:_.bind(this.error,this),abort:_.bind(this.abort,this)})},progress:function(J){if(!J.lengthComputable){return}var K=Math.round(J.loaded*100/J.total);this.model.set({progress:K})},load:function(J){var K=JSON.parse(J.target.responseText);if(J.target.status!==200){this.model.setError(K.message);return}this.model.setResume(K.token,K.name);this.setSource()},error:function(){this.model.setError("Upload failed.")},abort:function(){this.model.setError("Upload cancelled.")}});var t=C.extend({uploadResume:function(){window.uploadComplete=_.bind(this.load,this);document.getElementById("resume_upload_target").onload=_.bind(this.load,this);this.trigger("submit-resume")},load:function(J,K){if(!K){try{K=window.frames.resume_upload_target.document.getElementsByTagName("body")[0].innerHTML;K=JSON.parse(K)}catch(J){this.model.setError("Upload failed.");return}}if(K.success){this.model.setResume(K.data.token,K.data.name);this.setSource()}else{this.model.setError(K.data.message)}}});var q=G.extend({source:"Dropbox",template:_.template(a("#dropbox_upload").html()),events:{"click a":"onClick"},onClick:function(J){var K=this;J.preventDefault();Dropbox.choose({linkType:"direct",success:function(L){if(L.length<1){K.model.setError("File could not be selected.");return}if(K.validate(L[0].bytes,L[0].name)){K.model.setError(K.validate(L[0].bytes,L[0].name));new Image().src=H.logResumeError+"?source=dropbox&location=client&name="+encodeURIComponent(L[0].name)+"&size="+encodeURIComponent(L[0].bytes);return}K.model.setUploading();K.model.set({fileName:L[0].name});K.model.setFileSize(L[0].bytes);K.model.fetch("Dropbox",L[0].link,null,{success:_.bind(K.success,K),error:_.bind(K.error,K)})},cancel:function(){}})},success:function(K,J){this.model.setResume(J.token,J.name);this.setSource()},error:function(K,J){this.model.setError(J)},onScriptLoaded:function(){if(Dropbox.isBrowserSupported()){this.$el.html(this.template(this.model))}},render:function(){JOBCENTRE.lazyLoad.js("https://www.dropbox.com/static/api/1/dropins.js",_.bind(this.onScriptLoaded,this),{id:"dropboxjs","data-app-key":p});return this}});var d=e.extend({template:_.template(a("#application_form").html()),className:"apply-form flex-relative",initialize:function(J){this.submitPendingResume=false;this.listenTo(J.resume,"change:token",this.onTokenChange);this.listenTo(J.resume,"change:state",this.onResumeStateChange);this.listenTo(this.model,"change",this.onModelChange)},onTokenChange:function(){this.trigger("validate")},onResumeStateChange:function(J,K){if(this.submitPendingResume){this.submitPendingResume=true;this.$("button").show();this.$('[data-element="waiting_for_upload"]').hide();if(K==="uploaded"){this.$("form").submit()}}},onSubmit:function(J){if(!this.options.resume.isUploaded()){J.preventDefault();if(this.options.resume.isUploading()){this.$("button").hide();this.$('[data-element="waiting_for_upload"]').show();this.submitPendingResume=true}else{this.options.resume.setError("Resume is required.");this.errorOnSubmit()}return}e.prototype.onSubmit.call(this,J)},onSaveSuccess:function(){this.options.application.set({status:"submitted"})},onSaveError:function(){this.options.application.set({status:""})},errorOnSubmit:function(){this.options.application.set({error:true})},save:function(){this.options.application.set({status:"submitting"});this.model.save({success:_.bind(this.onSaveSuccess,this)})},formPreProcess:function(J){J.resumeToken=this.options.resume.get("token")},onModelChange:function(J,K){if(!K.updateForm){return}var L=this;this.$("input[name],select[name]").each(function(){var M=a(this).attr("name");if(a(this).val()!=L.model.get(M)){a(this).val(L.model.get(M));if(a(this).attr("name")==="countryId"){L.onCountryChange()}if(this.tagName==="SELECT"){L.$("select[name]").trigger("change")}}})},render:function(){if(this.renderState(this.options.countries.state)){return this}this.$el.html(this.template({form:this.model}));this.renderCountries();this.bindSelect2();return this}});return{init:function(K){p=K.dropboxAppKey;H(K.restPath);r=K.eid;E=K.site.provinceCode;w=K.onApplyCallToAction;var J=new o();var L=new x({application:new b(),form:new c(K.form),resume:new B(),countries:J.getCountries(),job:K.job});a('[data-outlet="page"]').append(L.render().el)}}}(jQuery));