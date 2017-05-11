var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.employerProfile=(function(a){var o;var N=function(T){N={employers:"/api/v1.0/employers/:id",images:T+"files",formImage:T+"files/form",fetchImage:T+"files/fetch",industries:"/api/v1.0/industries",companySizes:"/api/v1.0/companysizes"}};var f=Backbone.Model.extend({_validators:{required:function(W,T,X,U,V){if(!X||(X+"").trim()==""){V.push({attr:T,message:W.message||(" is required")})}},maxLength:function(W,T,X,U,V){if(!X||(X+"").trim()==""){return}if(X.trim().length>W.max){V.push({attr:T,message:W.message||String.format(" exceeds {0} characters",W.max)})}},regex:function(W,T,X,U,V){if(!X||(X+"").trim()==""){return}if(!W.pattern.test(X.trim())){V.push({attr:T,message:W.message||(" is invalid")})}},custom:function(W,T,Y,U,V){if(!W.isValid){throw new Error("isValid missing for custom validation")}var X=W.isValid(W,T,Y,U);if(X===true){return}if(X===false){V.push({attr:T,message:W.message});return}if(_.isString(X)){V.push({attr:T,message:X});return}throw new Error("validity not supported.")}},isValid:function(){if(!this.validations){return true}var U=[];for(var T in this.attributes){if(!this.attributes.hasOwnProperty(T)){continue}if(!this.validations[T]){continue}var W=this.validations[T];for(var V in W){if(!W.hasOwnProperty(V)){continue}if(!this._validators[V]){throw new Error("Validation "+V+" not supported.")}this._validators[V](W[V],T,this.attributes[T],this.attributes,U)}}if(U.length>0){this.trigger("validation-error",this,U);return false}else{return true}}});var L=Backbone.Model.extend({defaults:{ready:false,error:null}});var h=Backbone.Model.extend({collection:Backbone.Collection,listName:"",url:"",initialize:function(){this._loading=false;this._loaded=false;this._list=new this.collection()},getList:function(){if(!this._loaded){this._load()}return this._list},_load:function(){var T=this;if(!this._loading){this._list.state.set({ready:false,error:null});this._loading=true;var U=this.url;if(_.isFunction(U)){U=U.call(this)}a.ajax({url:U,dataType:"json",cache:true,type:"GET",success:function(W,X,V){T._list.reset(W.data);T._list.state.set({ready:true,error:null});T._loaded=true},error:function(W,X,V){T._list.state.set({error:String.format("Error retrieving {0} list.",T.listName)})},complete:function(V,W){T._loading=false}})}}});var B=Backbone.Model.extend({});var A=Backbone.Collection.extend({model:B,initialize:function(){this.state=new L()}});var C=h.extend({collection:A,listName:"industry",url:function(){return N.industries},getIndustries:function(){return this.getList()}});var l=Backbone.Model.extend({});var n=Backbone.Collection.extend({model:l,initialize:function(){this.state=new L()}});var m=h.extend({collection:n,listName:"company size",url:function(){return N.companySizes},getCompanySizes:function(){return this.getList()}});var r=f.extend({defaults:{state:"idle",fileName:"",fileSize:0,token:null,progress:0,error:null},setError:function(T){this.set({state:"error",error:T})},setUploading:function(T){this.set({state:"uploading"})},setFile:function(U,T){this.set({state:"uploaded",token:U,fileName:T})},setIdle:function(U,T){this.set({state:"idle",fileName:"",fileSize:0,token:null,progress:0,error:null})},setFileSize:function(T){if(T===0){this.set({fileSize:"? KB"})}else{if(T>1024*1024){this.set({fileSize:(Math.round(T*100/(1024*1024))/100).toString()+"MB"})}else{this.set({fileSize:(Math.round(T*100/1024)/100).toString()+"KB"})}}},isUploaded:function(){return this.get("state")==="uploaded"},isUploading:function(){return this.get("state")==="uploading"},sendUrl:null,sendName:null,fetchUrl:null,send:function(V,T){var U=new FormData();U.append(this.sendName,V);var W=new XMLHttpRequest();W.upload.addEventListener("progress",T.progress,false);W.addEventListener("load",T.load,false);W.addEventListener("error",T.error,false);W.addEventListener("abort",T.abort,false);W.open("POST",this.sendUrl());W.setRequestHeader("Accept","application/json");W.send(U)},fetch:function(W,U,T,V){V||(V={});var X=this;a.ajax({url:this.fetchUrl(),contentType:"application/json",data:JSON.stringify({url:U,accessToken:T,source:W}),dataType:"json",type:"POST",success:function(Z,aa,Y){if(V.success){V.success(X,Z)}},error:function(Z,ab,Y){if(Z.status===400){var aa=JSON.parse(Z.responseText);if(V.error){V.error(X,aa.message);return}}if(V.error){V.error(X,"Error connecting to the server.")}}})}});var w=r.extend({maxFileSize:5,fileTypes:["png","jpg"],fileTypeMessage:"Only PNG and JPG file types allowed.",sendUrl:function(){return N.images},sendName:"file",fetchUrl:function(){return N.fetchImage},includeDropbox:true,includeLinkedIn:false,includeWeb:true});var G=r.extend({maxFileSize:1,fileTypes:["docx","doc","rtf","pdf","txt"],fileTypeMessage:"Only Word, Plain Text, PDF, RTF file types allowed.",sendUrl:function(){return N.resumes},sendName:"file",fetchUrl:function(){return N.fetchResume},includeDropbox:true,includeLinkedIn:true,includeWeb:false});var q=f.extend({initialize:function(){this._loading=false;this.state=new L();this.logo=new D();this.logo.employer=this;this.bannerHeader=new b();this.bannerHeader.employer=this},url:function(){return N.employers.replace(":id",this.id)},parse:function(U,T){this.logo.setImageUrl(U.logoUrl);delete U.logoUrl;this.bannerHeader.setImageUrl(U.bannerHeaderUrl);delete U.bannerHeaderUrl;return U},fetch:function(T){T||(T={});var U=this;if(this._loading){return}this.state.set({ready:false,error:null});this._loading=true;a.ajax({url:this.url(),dataType:"json",cache:false,type:"GET",success:function(W,X,V){U.set(U.parse(W));U.state.set({ready:true,error:null});if(T.success){T.success(U,W)}},error:function(X,Y,W){var V=X.status===400?JSON.parse(X.responseText).message:"Error retrieving profile.";U.state.set({error:V});if(T.error){T.error(U,V)}},complete:function(V,W){U._loading=false}})},save:function(T,U){U||(U={});var V=this;a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify(T),dataType:"json",type:"PUT",success:function(X,Y,W){delete X.logoUrl;delete X.bannerHeaderUrl;V.set(X);if(U.success){U.success(V,X)}},error:function(X,Z,W){if(X.status===400){var Y=JSON.parse(X.responseText);if(U.error){U.error(V,Y.message);return}}if(U.error){U.error(V,"Error connecting to the server.")}}})}});var e=f.extend({defaults:{imageUrl:null},initialize:function(){this.file=new w()},url:function(){return N.employers.replace(":id",this.employer.id)},setImageUrl:function(T){this.set({imageUrl:new y({url:T,previous:this.get("imageUrl")})})},replace:function(T){this.save(JSON.stringify(this.tokenPayload(this.file.get("token"))),T)},"delete":function(T){this.save(JSON.stringify(this.urlPayload("")),T)},save:function(T,U){U||(U={});var V=this;a.ajax({url:this.url(),contentType:"application/json",data:T,dataType:"json",type:"PUT",success:function(X,Y,W){V.setImageUrl(X[V.urlName]);if(U.success){U.success(V,X)}},error:function(X,Z,W){if(X.status===400){var Y=JSON.parse(X.responseText);if(U.error){U.error(V,Y.message);return}}if(U.error){U.error(V,"Error connecting to the server.")}}})},undo:function(T){T||(T={});var U=this;a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify(this.urlPayload(this.get("imageUrl").get("previous").get("url"))),dataType:"json",type:"PUT",success:function(W,X,V){U.set({imageUrl:U.get("imageUrl").get("previous")});if(T.success){T.success(U,W)}},error:function(W,Y,V){if(W.status===400){var X=JSON.parse(W.responseText);if(T.error){T.error(U,X.message);return}}if(T.error){T.error(U,"Error connecting to the server.")}}})}});var D=e.extend({urlName:"logoUrl",tokenPayload:function(T){return{logoToken:T}},urlPayload:function(T){return{logoUrl:T}}});var b=e.extend({urlName:"bannerHeaderUrl",tokenPayload:function(T){return{bannerHeaderToken:T}},urlPayload:function(T){return{bannerHeaderUrl:T}}});var y=Backbone.Model.extend({});var Q=Backbone.Model.extend({defaults:{data:null,error:null},setUrl:function(V,U){if(this.get("data")&&V===this.get("data").get("url")){return}this.set("error",null);var T=new R({url:V,thumb:U},{previous:this.get("data")});if(T.get("error")){this.set("error",T.get("error"))}else{if(this.get("data")){this.get("data").off("change:error",this.onDataError)}this.set({data:T});this.get("data").on("change:error",this.onDataError,this)}},onDataError:function(T,U){this.set("error",U)},removeUrl:function(){if(this.get("data")){this.set("data",this.get("data").previous)}}});var R=Backbone.Model.extend({defaults:{url:null,thumb:null,error:null},initialize:function(T,U){this.previous=U.previous;this.setVideoId();if(this.id&&!this.get("thumb")){this.set("thumb",this.getThumb())}},setVideoId:function(){if(!this.get("url")){return}var T=this.get("url").match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?.*v=)([^#\&\?]*).*/);if(T&&T[1].length==11){this.set("id",T[1])}else{this.set("error","Invalid URL.")}},getThumb:function(){return"https://img.youtube.com/vi/"+this.id+"/mqdefault.jpg"}});var g=function(T){this.parent=null;this.children=[];Backbone.View.apply(this,[T])};_.extend(g.prototype,Backbone.View.prototype,{errorTemplate:_.template(a("#profile_error").html()),loaderClass:"flex-loader",showLoader:true,renderState:function(T){if(T.get("error")){a(this.el).html(this.errorTemplate({error:T.get("error")}));return true}if(!T.get("ready")){if(this.showLoader){this.renderLoader(this.el)}return true}return false},renderLoader:function(T){var U=document.createElement("div");U.className=this.loaderClass;a(T).empty().append(U)},savingStateOutlet:null,hideSavingState:function(){(this.savingStateOutlet?this.$(this.savingStateOutlet):this.$el).children().removeClass("invisible").end().find(".flex-loader-mini").remove()},showSavingState:function(){(this.savingStateOutlet?this.$(this.savingStateOutlet):this.$el).children().addClass("invisible").end().prepend('<div class="flex-loader-mini"></div>')},addChildren:function(T){var U,V=this;if(_.isArray(T)){U=T}else{U=_.toArray(arguments)}_.each(U,function(W){V.children.push(W);W.parent=V});if(U.length===1){return U[0]}else{return U}},disposeChildren:function(T){if(!T){return}var V=this;var U=_.isArray(T)?T:_.toArray(arguments);_.each(U,function(W){W.dispose()})},disposeAllChildren:function(){var T=this.children.slice(0);_.each(T,function(U){U.dispose()})},dispose:function(){this.disposeAllChildren();this.remove();this._removeFromParent()},_removeFromParent:function(){if(this.parent){this.parent._removeChild(this)}},_removeChild:function(T){var U=_.indexOf(this.children,T);if(U!==-1){this.children.splice(U,1)}}});g.extend=Backbone.View.extend;var d=function(T){g.apply(this,[T]);this.listenTo(this.model,"validation-error",this.onValidationError,this);if(this.model.state){this.listenTo(this.model.state,"change",this.render)}if(T.countries){this._currentProvinces=null;this.listenTo(T.countries.state,"change",this.render)}};_.extend(d.prototype,g.prototype,{_validatable:false,events:{submit:"onSubmit","keyup input,textarea":"onKeyup","change select,input":"onChange",validate:"validateIfReady"},onCancelClick:function(){},onSaveSuccess:function(T,U){},onSaveError:function(U,T){this.hideSavingState();this.$("[data-element=alert_danger_server]").text(T).show()},onValidationError:function(X,V){var T=this.$("[data-element=alert_danger_server]");T.html("");for(var W=V.length;W--;){var U=V[W];if(_.isString(U)){T.html(U).show()}else{this.$("input[name="+U.attr+"],textarea[name="+U.attr+"],select[name="+U.attr+"]").each(function(){if(this.tagName==="SELECT"){a(this).siblings(".select2-container").addClass("error")}else{a(this).addClass("error")}}).closest(".form-group").find(".form-error").html(U.message).show()}}this.onSaveError()},onSubmit:function(U){U.preventDefault();this._validatable=true;var T=this.getFormValues();if(this.isValid(T)){this.save(T)}},save:function(T){this.showSavingState();this.model.save(T,{success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onSaveError,this)})},getFormValues:function(){var U=this;var T={};this.$("input,textarea,select").each(function(){if(this.name&&!this.disabled){if(this.type==="radio"&&!this.checked){return}if(this.type==="checkbox"&&!this.checked){return}T[this.name]=T[this.name]?T[this.name]+","+a(this).val():a(this).val()}});this.formPreProcess(T);return T},isValid:function(T){this.$(".error").removeClass("error");this.$('[data-element="alert_danger_server"]').hide();this.$(".form-error").hide();return this.model.isValid(T)},formPreProcess:function(T){},onKeyup:function(T){if(T.which===13){return}this.validateIfReady()},onChange:function(T){this.validateIfReady()},validateIfReady:function(){if(this._validatable){this.isValid(this.getFormValues())}},bindSelect2:function(){var U=this;var T=function(){U.$("select").select2({allowClear:true})};if(!a.contains(document.documentElement,this.el)){setTimeout(T,10)}else{T()}}});d.extend=g.extend;var M=g.extend({validate:function(V,U){if(V>this.model.maxFileSize*1024*1024){return String.format("File exceeds {0} MB.",this.model.maxFileSize)}var T=_.last(U.split(".")).toLowerCase();if(!_.contains(this.model.fileTypes,T)){return this.model.fileTypeMessage}}});var s=M.extend({source:null,template:_.template(a("#profile_file_upload").html()),events:{"change [data-element=file_input]":"initializeUpload"},initializeUpload:function(){this.model.setUploading();this.uploadFile()},render:function(){this.$el.html(this.template({file:this.model,viewId:this.cid}));return this}},{create:function(T){if(window.FormData){return new P(T)}else{return new u(T)}}});var P=s.extend({uploadFile:function(){var T=this.$("[data-element=file_input]")[0].files[0];if(!T){this.model.setError("File could not be selected.");return}if(this.validate(T.size,T.name)){this.model.setError(this.validate(T.size,T.name));return}this.model.set({fileName:T.name});this.model.setFileSize(T.size);this.model.send(T,{progress:_.bind(this.progress,this),load:_.bind(this.load,this),error:_.bind(this.error,this),abort:_.bind(this.abort,this)})},progress:function(T){if(!T.lengthComputable){return}var U=Math.round(T.loaded*100/T.total);this.model.set({progress:U})},load:function(T){var U=JSON.parse(T.target.responseText);if(T.target.status!==200){this.model.setError(U.message);return}this.model.setFile(U.token,U.name)},error:function(){this.model.setError("Upload failed.")},abort:function(){this.model.setError("Upload cancelled.")}});var u=s.extend({uploadFile:function(){window[this.options.callback]=_.bind(this.load,this);document.getElementById(this.options.iframeId).onload=_.bind(this.load,this);this.trigger("submit-file")},load:function(T,U){if(!U){try{U=window.frames[this.options.iframeId].document.getElementsByTagName("body")[0].innerHTML;U=JSON.parse(U)}catch(T){this.model.setError("Upload failed.");return}}if(U.success){this.model.setFile(U.data.token,U.data.name)}else{this.model.setError(U.data.message)}}});var p=M.extend({source:"Dropbox",template:_.template(a("#profile_dropbox_upload").html()),events:{"click a":"onClick"},onClick:function(T){var U=this;T.preventDefault();Dropbox.choose({linkType:"direct",success:function(V){if(V.length<1){U.model.setError("File could not be selected.");return}if(U.validate(V[0].bytes,V[0].name)){U.model.setError(U.validate(V[0].bytes,V[0].name));return}U.model.setUploading();U.model.set({fileName:V[0].name});U.model.setFileSize(V[0].bytes);U.model.fetch("Dropbox",V[0].link,null,{success:_.bind(U.success,U),error:_.bind(U.error,U)})},cancel:function(){}})},success:function(T,U){this.model.setFile(U.token,U.name)},error:function(T,U){this.model.setError(U)},onScriptLoaded:function(){if(Dropbox.isBrowserSupported()){this.$el.html(this.template(this.model))}},render:function(){JOBCENTRE.lazyLoad.js("https://www.dropbox.com/static/api/1/dropins.js",_.bind(this.onScriptLoaded,this),{id:"dropboxjs","data-app-key":o});return this}});var O=M.extend({source:"Web",template:_.template(a("#profile_web_upload").html()),events:{"submit form":"onSubmit"},onSubmit:function(T){T.preventDefault();if(!this.$("[name=web_upload]").val().trim()){return}this.model.setUploading();this.model.fetch("Web",this.$("[name=web_upload]").val(),null,{success:_.bind(this.success,this),error:_.bind(this.error,this)})},success:function(T,U){this.model.setFile(U.token,U.name)},error:function(T,U){this.model.setError(U)},render:function(){this.$el.html(this.template(this.model));return this}});var H=g.extend({sectionHiddenTemplate:_.template(a("#section_hidden").html()),className:"flex-relative",initialize:function(){this.content=null},onlyEditFormVisible:false,events:{"click [data-action=edit]":"renderEdit","click [data-action=cancel]":"onCancelClick","click [data-action=show]":"show"},onCancelClick:function(){var T=this;if(this.model.isNew()){this.model.collection.remove(this.model);this.$el.fadeOut("fast",function(){T.dispose()})}else{this.renderDetails()}},show:function(T){this.$("[data-action=show]").remove();if(this.onlyEditFormVisible){this.renderEdit()}else{this.renderDetails()}},hide:function(){var T=this;this.$el.append(this.sectionHiddenTemplate());if(this.content){this.content.$el.slideUp("fast",function(){T.disposeChildren(T.content)})}},renderDetails:function(){if(this.onlyEditFormVisible){this.hide();return}var T=this;if(this.content){this.content.$el.fadeOut("fast",function(){T.disposeChildren(T.content);T.content=T.addChildren(T.detailsView());T.content.on("render-deleted",T.renderDeleted,T);T.content.$el.hide();T.$el.append(T.content.render().el);T.content.$el.fadeIn("fast")})}else{this.content=this.addChildren(this.detailsView());this.content.on("render-deleted",T.renderDeleted,T);this.$el.append(this.content.render().el)}},renderEdit:function(){var T=this;if(this.content){this.content.$el.fadeOut("fast",function(){T.disposeChildren(T.content);T.content=T.addChildren(T.editView());T.content.on("render-details",T.renderDetails,T);T.content.on("render-deleted",T.renderDeleted,T);T.content.$el.hide();T.$el.append(T.content.render().el);T.content.$el.fadeIn("fast")})}else{this.content=this.addChildren(this.editView());this.content.on("render-details",this.renderDetails,T);this.content.on("render-deleted",T.renderDeleted,T);this.content.$el.hide();this.$el.append(this.content.render().el);this.content.$el.fadeIn("fast")}},renderDeleted:function(){var T=this;this.content.$el.fadeOut("fast",function(){T.disposeChildren(T.content);T.content=T.addChildren(T.removedView());T.content.on("render-details",T.renderDetails,T);T.content.$el.hide();T.$el.append(T.content.render().el);T.content.$el.fadeIn("fast")})},removedView:function(){throw new Error("Not Implemented.")},render:function(){if(this.onlyEditFormVisible){this.hide()}else{this.show()}return this}});var F=g.extend({sepratorTemplate:_.template(a("#profile_section_separator").html()),initialize:function(T){this.listenTo(this.model.state,"change",this.render);this.showLoader=T.visibility.initialLoader},render:function(){if(this.renderState(this.model.state)){return this}this.$el.empty();if(this.options.visibility.images){this.$el.append(this.addChildren(new x({model:this.model,visibility:this.options.visibility.images})).render().el);if(this.options.visibility.sectionSeparator){this.$el.append(this.sepratorTemplate())}}if(this.options.visibility.companyInfo){this.$el.append(this.addChildren(new k({model:this.model,industries:this.options.industries,companySizes:this.options.companySizes,visibility:this.options.visibility.companyInfo})).render().el);if(this.options.visibility.sectionSeparator){this.$el.append(this.sepratorTemplate())}}if(this.options.visibility.youTubeVideo){this.$el.append(this.addChildren(new S({model:this.model})).render().el);if(this.options.visibility.sectionSeparator){this.$el.append(this.sepratorTemplate())}}if(this.options.visibility.socialMedia){this.$el.append(this.addChildren(new I({model:this.model})).render().el)}return this}});var x=g.extend({template:_.template(a("#profile_images").html()),render:function(){this.$el.html(this.template());if(this.options.visibility.logo){this.$('[data-outlet="images"]').append(this.addChildren(new E({model:this.model.logo,visibility:this.options.visibility.logo,fullWidth:!this.options.visibility.bannerHeader})).render().el)}if(this.options.visibility.bannerHeader){this.$('[data-outlet="images"]').append(this.addChildren(new c({model:this.model.bannerHeader,visibility:this.options.visibility.bannerHeader,fullWidth:!this.options.visibility.logo})).render().el)}return this}});var t=g.extend({template:_.template(""),uploadingTemplate:_.template(a("#profile_file_uploading").html()),progressTemplate:_.template(a("#profile_file_progress").html()),errorTemplate:_.template(a("#profile_file_error").html()),initialize:function(){this.fileUploadView=null;this.listenTo(this.model.file,"change:state",this.onStateChange);this.listenTo(this.model.file,"change:progress",this.onProgressChange);this.listenTo(this.model.file,"change:token",this.onTokenChange)},renderButton:function(){this.renderUploadButton();if(this.model.file.includeDropbox){this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new p({model:this.model.file})).render().el)}if(this.model.file.includeLinkedIn){this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new LinkedInUploadView({model:this.model.file})).render().el)}if(this.model.file.includeWeb){this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new O({model:this.model.file})).render().el)}this.onStateChange(this.model.file,this.model.file.get("state"))},onSubmitFile:function(){this.$("form").submit()},showButton:function(){this.$('[data-element="upload_title"]').show();this.$('[data-outlet="file_uploaders"]').show();this.disposeChildren(this.fileUploadView);this.renderUploadButton()},renderUploadButton:function(){this.fileUploadView=this.addChildren(s.create({model:this.model.file,callback:this.$("input[name=callback]").val(),iframeId:this.$("iframe")[0].id}));this.fileUploadView.on("submit-file",this.onSubmitFile,this);this.$('[data-outlet="file_uploaders"]').prepend(this.fileUploadView.render().el)},hideButton:function(){this.$('[data-outlet="file_uploaders"]').hide();this.$('[data-element="upload_title"]').hide()},onStateChange:function(T,U){switch(U){case"idle":return;case"uploading":this.$('[data-element="error_message"]').html("").hide();this.$('[data-element="upload_progress"]').html(this.uploadingTemplate(this.model.file.toJSON())).show();this.hideButton();return;case"uploaded":return;case"error":this.$('[data-element="error_message"]').html(this.errorTemplate(this.model.file.toJSON())).show();this.$('[data-element="upload_progress"]').html("").hide();this.showButton();return;default:throw new Error(String.format("State {0} not supported.",U))}},onProgressChange:function(T,U){if(U){this.$('[data-element="upload_progress"]').html(this.progressTemplate(this.model.file.toJSON())).show()}},onTokenChange:function(){if(!this.model.file.get("token")){return}this.model.replace({success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onSaveError,this)})},onSaveSuccess:function(T,U){},onSaveError:function(U,T){this.model.file.setError(T)},render:function(){this.$el.html(this.template(this.model.file));this.renderButton();return this}});var z=g.extend({template:_.template(a("#profile_image").html()),initialize:function(){this.listenTo(this.model,"change:imageUrl",this.onImageUrlChange)},onImageUrlChange:function(){this.disposeAllChildren();this.render()},events:{"click [data-action=replace]":"onReplaceClick","click [data-action=delete]":"onDeleteClick","click [data-action=undo]":"onUndoClick"},onReplaceClick:function(){this.model.file.setIdle();this.$('[data-outlet="image"]').append(this.addChildren(new v({model:this.model})).render().el)},savingStateOutlet:'[data-outlet="image"]',onDeleteClick:function(){this.showSavingState();this.model["delete"]({error:_.bind(this.onError,this)})},onUndoClick:function(){this.showSavingState();this.model.undo({error:_.bind(this.onError,this)})},onError:function(U,T){this.hideSavingState()},getDisplayUrl:function(){if(this.model.get("imageUrl")&&this.model.get("imageUrl").get("url")){return this.model.get("imageUrl").get("url")}else{return this.missingImage}},render:function(){this.$el.html(this.template({title:this.title,titleVisible:this.options.visibility.title,fullWidth:this.options.fullWidth,image:this.model,displayUrl:this.getDisplayUrl(),size:{width:this.width}}));return this}});var E=z.extend({title:"Logo",width:162,missingImage:"https://placehold.it/162x162&text=logo"});var c=z.extend({title:"Banner",width:240,missingImage:"https://placehold.it/401x50&text=banner"});var v=t.extend({template:_.template(a("#profile_image_edit").html()),events:{"click [data-action=cancel]":"onCancelClick"},onCancelClick:function(){this.dispose()}});var k=H.extend({initialize:function(T){this.onlyEditFormVisible=T.visibility.onlyEditForm},detailsView:function(){return new i({model:this.model})},editView:function(){return new j({model:this.model,industries:this.options.industries,companySizes:this.options.companySizes})}});var i=g.extend({template:_.template(a("#profile_company_info_details").html()),render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var j=d.extend({template:_.template(a("#profile_company_info_edit").html()),initialize:function(T){this.listenTo(T.industries.state,"change",this.render);this.listenTo(T.companySizes.state,"change",this.render)},onSaveSuccess:function(T,U){this.trigger("render-details")},formPreProcess:function(T){if(T.hasOwnProperty("industry.ids")){T.industries=[];if(T["industry.ids"]){_.each(T["industry.ids"],function(U){T.industries.push({id:U})})}delete T["industry.ids"]}if(T.hasOwnProperty("companySize.id")){T.companySize=null;if(T["companySize.id"]){T.companySize={id:T["companySize.id"]}}delete T["companySize.id"]}},renderIndustries:function(){var U=this,T=[];T.push('<option value=""></option>');this.options.industries.each(function(V){T.push(String.format('<option value="{0}"{1}>{2}</option>',V.id,(U.model.get("industries")&&_.some(U.model.get("industries"),function(W){return W.id==V.id}))?' selected="selected"':"",V.get("name")))});this.$('select[name="industry.ids"]').html(T.join("")).change()},renderCompanySizes:function(){var U=this,T=[];T.push('<option value=""></option>');this.options.companySizes.each(function(V){T.push(String.format('<option value="{0}"{1}>{2}</option>',V.id,(U.model.get("companySize")&&U.model.get("companySize").id==V.id)?' selected="selected"':"",V.get("name")))});this.$('select[name="companySize.id"]').html(T.join("")).change()},render:function(){if(this.renderState(this.options.industries.state)){return this}if(this.renderState(this.options.companySizes.state)){return this}this.$el.html(this.template(this.model.toJSON()));this.renderIndustries();this.renderCompanySizes();this.bindSelect2();return this}});var S=g.extend({template:_.template(a("#profile_youtube_video").html()),imgPlaceholder:"https://placehold.it/200x100&text=No+Video",initialize:function(){this.savable=false;this.youTube=new Q();if(this.model.get("youTubeUrl")){this.youTube.setUrl(this.model.get("youTubeUrl"),this.model.get("youTubeThumbUrl"))}this.data=null;this.listenTo(this.youTube,"change:data",this.onDataChange);this.listenTo(this.youTube,"change:error",this.onErrorChange)},events:{"input [name=youTubeUrl]":"onInputChange","change [name=youTubeUrl]":"onInputChange","click [data-action=remove]":"onRemoveClick"},onErrorChange:function(U,T){this.hideSavingState();if(T){this.$("[data-error=input]").text(T).show()}else{this.$("[data-error=input]").text("").hide()}},showHideRemoveButton:function(){if(this.data){this.$("[data-action=remove]").show()}else{this.$("[data-action=remove]").hide()}},onRemoveClick:function(){this.youTube.removeUrl()},onInputChange:function(T){if(a(T.currentTarget).val()){this.youTube.setUrl(a(T.currentTarget).val())}},onThumbChange:function(){if(this.data&&this.data.get("thumb")){this.$("[data-container=thumb]").prop("src",this.data.get("thumb"))}else{this.$("[data-container=thumb]").prop("src","https://placehold.it/320x180&text=No+Video")}},showSavingState:function(){this.$("[data-section=saving-state]").text("Saving...").removeClass("hidden")},showSavedState:function(){this.$("[data-section=saving-state]").text("Saved!").removeClass("hidden")},hideSavingState:function(){this.$("[data-section=saving-state]").addClass("hidden")},save:function(){if(!this.savable){return}this.showSavingState();this.model.save({youTubeUrl:this.$("[name=youTubeUrl]").val()},{success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onErrorChange,this)})},onSaveSuccess:function(){this.showSavedState()},onDataChange:function(){if(this.data){this.stopListening(this.data,"change:thumb",this.onThumbChange)}this.data=this.youTube.get("data");if(this.data){this.listenTo(this.data,"change:thumb",this.onThumbChange)}var T=this.$("[name=youTubeUrl]");if(!this.data&&T.val()){T.val("")}else{if(this.data&&this.data.get("url")!=T.val()){T.val(this.data.get("url"))}}this.onThumbChange();this.showHideRemoveButton();this.save()},render:function(){this.$el.html(this.template(this.youTube));this.onDataChange();this.savable=true;return this}});var I=H.extend({detailsView:function(){return new J({model:this.model})},editView:function(){return new K({model:this.model,industries:this.options.industries,companySizes:this.options.companySizes})}});var J=g.extend({template:_.template(a("#profile_social_media_details").html()),render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var K=d.extend({template:_.template(a("#profile_social_media_edit").html()),onSaveSuccess:function(T,U){this.trigger("render-details")},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});a.ajaxSetup({statusCode:{}});a.ajaxPrefilter(function(U,V,T){U.statusCode=_.extend(U.statusCode||{},{401:function(X,Y,W){window.location.reload(true)}})});return{init:function(W){o=W.dropboxAppKey;N(W.restPath);var U=new q({id:W.employerId});var V=new C();var T=new m();var X=new F({model:U,industries:V.getIndustries(),companySizes:T.getCompanySizes(),visibility:W.visibility});a("[data-outlet=profile_page]").append(X.render().el);U.fetch()}}}(jQuery));