var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.campusaccess=(function(a){var h;var ag={transcripts:"/api/v1.1/resumes/:id/postsecondarytranscripts",jobseekers:"/api/v1.1/resumes/:id",educations:"/api/v1.1/resumes/:id/educations",positions:"/api/v1.1/resumes/:id/positions",photos:"/api/v1.1/images",formPhoto:"/api/v1.1/images/form",fetchPhoto:"/api/v1.1/images/fetch",resumes:"/api/v1.1/resumefiles",formResume:"/api/v1.1/resumefiles/form",fetchResume:"/api/v1.1/resumefiles/fetch"};var y=Backbone.Model.extend();var u=Backbone.Model.extend({defaults:{state:"idle",fileName:"",fileSize:0,token:null,progress:0,error:null},setError:function(aj){this.set({state:"error",error:aj})},setUploading:function(aj){this.set({state:"uploading"})},setFile:function(ak,aj){this.set({state:"uploaded",token:ak,fileName:aj})},setIdle:function(ak,aj){this.set({state:"idle",fileName:"",fileSize:0,token:null,progress:0,error:null})},setFileSize:function(aj){if(aj===0){this.set({fileSize:"? KB"})}else{if(aj>1024*1024){this.set({fileSize:(Math.round(aj*100/(1024*1024))/100).toString()+"MB"})}else{this.set({fileSize:(Math.round(aj*100/1024)/100).toString()+"KB"})}}},isUploaded:function(){return this.get("state")==="uploaded"},isUploading:function(){return this.get("state")==="uploading"},sendUrl:null,sendName:null,fetchUrl:null,send:function(al,aj){var ak=new FormData();ak.append(this.sendName,al);var am=new XMLHttpRequest();am.upload.addEventListener("progress",aj.progress,false);am.addEventListener("load",aj.load,false);am.addEventListener("error",aj.error,false);am.addEventListener("abort",aj.abort,false);am.open("POST",this.sendUrl);am.setRequestHeader("Accept","application/json");am.send(ak)},fetch:function(am,ak,aj,al){al||(al={});var an=this;a.ajax({url:this.fetchUrl,contentType:"application/json",data:JSON.stringify({url:ak,accessToken:aj,source:am}),dataType:"json",type:"POST",success:function(ap,aq,ao){if(al.success){al.success(an,ap)}},error:function(ap,ar,ao){if(ap.status===400){var aq=JSON.parse(ap.responseText);if(al.error){al.error(an,aq.message);return}}if(al.error){al.error(an,"Error connecting to the server.")}}})}});var B=u.extend({maxFileSize:5,fileTypes:["png","jpg"],fileTypeMessage:"Only PNG and JPG file types allowed.",sendUrl:ag.photos,sendName:"file",fetchUrl:ag.fetchPhoto,includeDropbox:true,includeWeb:true});var U=u.extend({maxFileSize:1,fileTypes:["docx","doc","rtf","pdf","txt"],fileTypeMessage:"Only Word, Plain Text, PDF, RTF file types allowed.",sendUrl:ag.resumes,sendName:"file",fetchUrl:ag.fetchResume,includeDropbox:true,includeWeb:false});var aa=u.extend({maxFileSize:1,fileTypes:["docx","doc","rtf","pdf","txt"],fileTypeMessage:"Only Word, Plain Text, PDF, RTF file types allowed.",sendUrl:ag.resumes,sendName:"file",fetchUrl:ag.fetchResume,includeDropbox:true,includeWeb:false});var z=Backbone.Model.extend({defaults:{photoUrl:null},initialize:function(){this.file=new B()},url:function(){return ag.jobseekers.replace(":id",this.jobseeker.id)},getDisplayUrl:function(){if(this.get("photoUrl")&&this.get("photoUrl").get("url")){return this.get("photoUrl").get("url")}else{return"/images/profile_missing.png"}},setPhotoUrl:function(aj){this.set({photoUrl:new C({url:aj,previous:this.get("photoUrl")})})},replace:function(aj){this.save(JSON.stringify({photoToken:this.file.get("token")}),aj)},"delete":function(aj){this.save(JSON.stringify({photoPath:""}),aj)},save:function(aj,ak){ak||(ak={});var al=this;a.ajax({url:this.url(),contentType:"application/json",data:aj,dataType:"json",type:"PUT",success:function(an,ao,am){al.setPhotoUrl(an.photoUrl);if(ak.success){ak.success(al,an)}},error:function(an,ap,am){if(an.status===400){var ao=JSON.parse(an.responseText);if(ak.error){ak.error(al,ao.message);return}}if(ak.error){ak.error(al,"Error connecting to the server.")}}})},undo:function(aj){aj||(aj={});var ak=this;a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify({photoPath:this.get("photoUrl").get("previous").getPhotoPath()}),dataType:"json",type:"PUT",success:function(am,an,al){ak.set({photoUrl:ak.get("photoUrl").get("previous")});if(aj.success){aj.success(ak,am)}},error:function(am,ao,al){if(am.status===400){var an=JSON.parse(am.responseText);if(aj.error){aj.error(ak,an.message);return}}if(aj.error){aj.error(ak,"Error connecting to the server.")}}})}});var C=Backbone.Model.extend({getPhotoPath:function(){return this.get("url").replace("/jobseekerimages/","")}});var R=Backbone.Model.extend({initialize:function(){this.file=new U()},url:function(){return ag.jobseekers.replace(":id",this.jobseeker.id)},replace:function(aj){aj||(aj={});var ak=this;a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify({fileToken:this.file.get("token")}),dataType:"json",type:"PUT",success:function(am,an,al){ak.set({url:am.resumeUrl,fileType:am.resumeFileType});if(aj.success){aj.success(ak,am)}},error:function(am,ao,al){if(am.status===400){var an=JSON.parse(am.responseText);if(aj.error){aj.error(ak,an.message);return}}if(aj.error){aj.error(ak,"Error connecting to the server.")}}})}});var X=Backbone.Model.extend({initialize:function(){this.file=new aa()},url:function(){if(this.isNew()){return ag.transcripts.replace(":id",this.collection.jobseeker.id)}else{return ag.transcripts.replace(":id",this.collection.jobseeker.id)+"/"+this.id}},replace:function(aj){this.save(aj)},undo:function(aj){aj||(aj={});this.set("id",undefined);aj.undo=true;this.save(aj)},save:function(ak){ak||(ak={});var al=this;var aj=ak.undo?this.toJSON():{transcriptToken:this.file.get("token")};a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify(aj),dataType:"json",type:"POST",success:function(an,ao,am){al.set(an);if(!ak.undo){al.collection.add(new X())}if(ak.success){ak.success(al,an)}},error:function(an,ap,am){if(an.status===400){var ao=JSON.parse(an.responseText);if(ak.error){ak.error(al,ao.message);return}}if(ak.error){ak.error(al,"Error connecting to the server.")}}})},"delete":function(aj){var ak=this;a.ajax({url:this.url(),contentType:"application/json",dataType:"json",type:"DELETE",success:function(am,an,al){ak.set(am);if(aj.success){aj.success(ak,am)}},error:function(am,ao,al){if(am.status===400){var an=JSON.parse(am.responseText);if(aj.error){aj.error(ak,an.message);return}}if(aj.error){aj.error(ak,"Error connecting to the server.")}}})}});var ac=Backbone.Collection.extend({model:X});var L=Backbone.Model.extend({save:function(aj,ak){var al=this;a.ajax({url:this.url(),contentType:"application/json",data:JSON.stringify(aj),dataType:"json",type:this.isNew()?"POST":"PUT",success:function(an,ao,am){al.set(an);if(ak.success){ak.success(al,an)}},error:function(an,ap,am){if(an.status===400){var ao=JSON.parse(an.responseText);if(ak.error){ak.error(al,ao.message);return}}if(ak.error){ak.error(al,"Error connecting to the server.")}}})},"delete":function(aj){var ak=this;a.ajax({url:this.url(),contentType:"application/json",dataType:"json",type:"DELETE",success:function(am,an,al){ak.set(am);if(aj.success){aj.success(ak,am)}},error:function(am,ao,al){if(am.status===400){var an=JSON.parse(am.responseText);if(aj.error){aj.error(ak,an.message);return}}if(aj.error){aj.error(ak,"Error connecting to the server.")}}})}});var j=L.extend({defaults:{school:"",degree:null,fieldOfStudy:"",startYear:null,endYear:null},url:function(){if(this.isNew()){return ag.educations.replace(":id",this.collection.jobseeker.id)}else{return ag.educations.replace(":id",this.collection.jobseeker.id)+"/"+this.id}}});var n=Backbone.Collection.extend({model:j});var E=L.extend({defaults:{title:"",company:"",start:null,end:null,duration:"",discipline:""},url:function(){if(this.isNew()){return ag.positions.replace(":id",this.collection.jobseeker.id)}else{return ag.positions.replace(":id",this.collection.jobseeker.id)+"/"+this.id}}});var b=E.extend({},{create:function(){return new b({discipline:"accounting",type:{id:1},isInternship:false})}});var q=E.extend({},{create:function(){return new q({discipline:"extraCurricular"})}});var I=Backbone.Collection.extend({model:E});var g=function(aj){this.parent=null;this.children=[];Backbone.View.apply(this,[aj])};_.extend(g.prototype,Backbone.View.prototype,{hideSavingState:function(){this.$el.children().removeClass("invisible").end().find(".flex_loader_blue_mini").remove()},showSavingState:function(){this.$el.children().addClass("invisible").end().prepend('<div class="flex_loader_blue_mini"></div>')},addChildren:function(aj){var ak,al=this;if(_.isArray(aj)){ak=aj}else{ak=_.toArray(arguments)}_.each(ak,function(am){al.children.push(am);am.parent=al});if(ak.length===1){return ak[0]}else{return ak}},disposeChildren:function(aj){if(!aj){return}var al=this;var ak=_.isArray(aj)?aj:_.toArray(arguments);_.each(ak,function(am){am.dispose()})},disposeAllChildren:function(){var aj=this.children.slice(0);_.each(aj,function(ak){ak.dispose()})},dispose:function(){this.disposeAllChildren();this.remove();this._removeFromParent()},_removeFromParent:function(){if(this.parent){this.parent._removeChild(this)}},_removeChild:function(aj){var ak=_.indexOf(this.children,aj);if(ak!==-1){this.children.splice(ak,1)}}});g.extend=Backbone.View.extend;var f=function(aj){g.apply(this,[aj]);this.listenTo(this.model,"validation-error",this.onValidationError,this);if(this.model.state){this.listenTo(this.model.state,"change",this.render)}if(aj.countries){this._currentProvinces=null;this.listenTo(aj.countries.state,"change",this.render)}};_.extend(f.prototype,g.prototype,{_validatable:false,events:{submit:"onSubmit","keyup input,textarea":"onKeyup","change select,input":"onChange","click .cancel":"onCancelClick",validate:"validateIfReady"},onCancelClick:function(){},onSaveSuccess:function(aj,ak){},onSaveError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},onValidationError:function(an,al){var aj=this.$(".message_error_server");aj.html("");for(var am=al.length;am--;){var ak=al[am];if(_.isString(ak)){aj.html(ak).show()}else{this.$("input[name="+ak.attr+"],textarea[name="+ak.attr+"],select[name="+ak.attr+"]").each(function(){if(this.tagName==="SELECT"){a(this).siblings(".select2-container").addClass("error")}else{a(this).addClass("error")}}).siblings(".error_inline").text(ak.message).show()}}this.onSaveError()},onSubmit:function(ak){ak.preventDefault();this._validatable=true;var aj=this.getFormValues();if(this.isValid(aj)){this.save(aj)}},save:function(aj){this.showSavingState();this.model.save(aj,{success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onSaveError,this)})},getFormValues:function(){var ak=this;var aj={};this.$("input,textarea,select").each(function(){if(this.name&&!this.disabled){if(this.type==="radio"&&!this.checked){return}if(this.type==="checkbox"&&!this.checked){return}aj[this.name]=aj[this.name]?aj[this.name]+","+a(this).val():a(this).val()}});this.formPreProcess(aj);return aj},isValid:function(aj){this.$(".error").removeClass("error");this.$(".error_inline").hide();return this.model.isValid(aj)},formPreProcess:function(aj){},onKeyup:function(aj){if(aj.which===13){return}this.validateIfReady()},onChange:function(ak){var aj=a(ak.currentTarget);if(aj.attr("name")==="country.id"){this.onCountryChange()}this.validateIfReady()},validateIfReady:function(){if(this._validatable){this.isValid(this.getFormValues())}},selectDropdowns:function(){var aj=this;this.$("select").each(function(){var ak=a(this);var al=ak.attr("name");var am=al.split(".");var an=aj.model.get(am[0]);if(an){if(am.length>1){ak.val(an[am[1]])}else{ak.val(an)}}})}});f.extend=g.extend;var af=g.extend({validate:function(al,ak){if(al>this.model.maxFileSize*1024*1024){return String.format("File exceeds {0} MB.",this.model.maxFileSize)}var aj=_.last(ak.split(".")).toLowerCase();if(!_.contains(this.model.fileTypes,aj)){return this.model.fileTypeMessage}},processResponse:function(aj){this.model.setFile(aj.file.token,aj.file.name)}});var v=af.extend({source:null,template:_.template(a("#file_upload").html()),events:{"change .resume_upload_input":"initializeUpload"},initializeUpload:function(){this.model.setUploading();this.uploadFile()},render:function(){this.$el.html(this.template({file:this.model,viewId:this.cid}));return this}},{create:function(aj){if(window.FormData){return new ai(aj)}else{return new x(aj)}}});var ai=v.extend({uploadFile:function(){var aj=this.$(".resume_upload_input")[0].files[0];if(!aj){this.model.setError("File could not be selected.");return}if(this.validate(aj.size,aj.name)){this.model.setError(this.validate(aj.size,aj.name));return}this.model.set({fileName:aj.name});this.model.setFileSize(aj.size);this.model.send(aj,{progress:_.bind(this.progress,this),load:_.bind(this.load,this),error:_.bind(this.error,this),abort:_.bind(this.abort,this)})},progress:function(aj){if(!aj.lengthComputable){return}var ak=Math.round(aj.loaded*100/aj.total);this.model.set({progress:ak})},load:function(aj){var ak=JSON.parse(aj.target.responseText);if(aj.target.status!==200){this.model.setError(ak.message);return}this.processResponse(ak)},error:function(){this.model.setError("Upload failed.")},abort:function(){this.model.setError("Upload cancelled.")}});var x=v.extend({uploadFile:function(){window[this.options.callback]=_.bind(this.load,this);document.getElementById(this.options.iframeId).onload=_.bind(this.load,this);this.trigger("submit-file")},load:function(aj,ak){if(!ak){try{ak=window.frames[this.options.iframeId].document.getElementsByTagName("body")[0].innerHTML;ak=JSON.parse(ak)}catch(aj){this.model.setError("Upload failed.");return}}if(ak.success){this.processResponse(ak.data)}else{this.model.setError(ak.data.message)}}});var i=af.extend({source:"Dropbox",template:_.template(a("#dropbox_upload").html()),events:{"click a":"onClick"},onClick:function(aj){var ak=this;aj.preventDefault();Dropbox.choose({linkType:"direct",success:function(al){if(al.length<1){ak.model.setError("File could not be selected.");return}if(ak.validate(al[0].bytes,al[0].name)){ak.model.setError(ak.validate(al[0].bytes,al[0].name));return}ak.model.setUploading();ak.model.set({fileName:al[0].name});ak.model.setFileSize(al[0].bytes);ak.model.fetch("Dropbox",al[0].link,null,{success:_.bind(ak.success,ak),error:_.bind(ak.error,ak)})},cancel:function(){}})},success:function(aj,ak){this.processResponse(ak)},error:function(aj,ak){this.model.setError(ak)},onScriptLoaded:function(){if(Dropbox.isBrowserSupported()){this.$el.html(this.template(this.model))}},render:function(){JOBCENTRE.lazyLoad.js("https://www.dropbox.com/static/api/1/dropins.js",_.bind(this.onScriptLoaded,this),{id:"dropboxjs","data-app-key":h});return this}});var ah=af.extend({source:"Web",template:_.template(a("#web_upload").html()),events:{"submit form":"onSubmit"},onSubmit:function(aj){aj.preventDefault();if(!this.$("[name=web_upload]").val().trim()){return}this.model.setUploading();this.model.fetch("Web",this.$("[name=web_upload]").val(),null,{success:_.bind(this.success,this),error:_.bind(this.error,this)})},success:function(aj,ak){this.model.setFile(ak.token,ak.name)},error:function(aj,ak){this.model.setError(ak)},render:function(){this.$el.html(this.template(this.model));return this}});var w=g.extend({template:_.template(""),uploadingTemplate:_.template(a("#file_uploading").html()),progressTemplate:_.template(a("#file_progress").html()),errorTemplate:_.template(a("#file_error").html()),initialize:function(){this.fileUploadView=null;this.listenTo(this.model.file,"change:state",this.onStateChange);this.listenTo(this.model.file,"change:progress",this.onProgressChange);this.listenTo(this.model.file,"change:token",this.onTokenChange)},renderButton:function(){this.renderUploadButton();if(this.model.file.includeDropbox){this.$(".resume_upload_menu_wrapper").append(this.addChildren(new i({model:this.model.file})).render().el)}if(this.model.file.includeWeb){this.$(".resume_upload_menu_wrapper").append(this.addChildren(new ah({model:this.model.file})).render().el)}this.onStateChange(this.model.file,this.model.file.get("state"))},onSubmitFile:function(){this.$("form").submit()},showButton:function(){this.$(".resume_upload_title").show();this.$(".resume_upload_menu_wrapper").show();this.disposeChildren(this.fileUploadView);this.renderUploadButton()},renderUploadButton:function(){this.fileUploadView=this.addChildren(v.create({model:this.model.file,callback:this.$("input[name=callback]").val(),iframeId:this.$("iframe")[0].id}));this.fileUploadView.on("submit-file",this.onSubmitFile,this);this.$(".resume_upload_menu_wrapper").prepend(this.fileUploadView.render().el)},hideButton:function(){this.$(".resume_upload_menu_wrapper").hide();this.$(".resume_upload_title").hide()},onStateChange:function(aj,ak){switch(ak){case"idle":return;case"uploading":this.$(".resume_upload_error").html("").hide();this.$(".resume_upload_progress").html(this.uploadingTemplate(this.model.file.toJSON())).show();this.hideButton();return;case"uploaded":return;case"error":this.$(".resume_upload_error").html(this.errorTemplate(this.model.file.toJSON())).show();this.$(".resume_upload_progress").html("").hide();this.showButton();return;default:throw new Error(String.format("State {0} not supported.",ak))}},onProgressChange:function(aj,ak){if(ak){this.$(".resume_upload_progress").html(this.progressTemplate(this.model.file.toJSON())).show()}},onTokenChange:function(){if(!this.model.file.get("token")){return}this.model.replace({success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onSaveError,this)})},onSaveSuccess:function(aj,ak){},onSaveError:function(ak,aj){this.model.file.setError(aj)},render:function(){this.$el.html(this.template(this.model.file));this.renderButton();return this}});var D=g.extend({template:_.template(a("#photo").html()),initialize:function(){this.listenTo(this.model,"change:photoUrl",this.onPhotoUrlChange)},onPhotoUrlChange:function(){this.disposeAllChildren();this.render()},events:{"click .jobseeker_profile_section_menu_item_replaceimage":"onReplaceClick","click .jobseeker_profile_section_menu_item_deleteimage":"onDeleteClick","click [data-action=undo]":"onUndoClick"},onReplaceClick:function(){this.model.file.setIdle();this.$el.append(this.addChildren(new A({model:this.model})).render().el)},onDeleteClick:function(){this.showSavingState();this.model["delete"]({error:_.bind(this.onError,this)})},onUndoClick:function(){this.showSavingState();this.model.undo({error:_.bind(this.onError,this)})},onError:function(ak,aj){this.hideSavingState()},render:function(){this.$el.html(this.template(this.model));return this}});var A=w.extend({template:_.template(a("#photo_edit").html()),events:{"click .jobseeker_profile_section_menu_item_cancel":"onCancelClick"},onCancelClick:function(){this.dispose()}});var V=g.extend({className:"jobseeker_profile_section_wrapper jobseeker_profile_section_resume_wrapper",initialize:function(){this.content=null},renderDetails:function(){this.disposeChildren(this.content);this.content=this.addChildren(new S({model:this.model}));this.content.on("edit",this.renderEdit,this);this.$el.append(this.content.render().el)},renderEdit:function(){this.disposeChildren(this.content);this.content=this.addChildren(new T({model:this.model}));this.content.on("render-details",this.renderDetails,this);this.$el.append(this.content.render().el)},render:function(){if(this.model.get("url")){this.renderDetails()}else{this.renderEdit()}return this}});var S=g.extend({template:_.template(a("#resume_details").html()),events:{"click .jobseeker_profile_section_menu_item_replaceesume":"onReplaceClick"},onReplaceClick:function(){this.trigger("edit")},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var T=w.extend({template:_.template(a("#resume_edit").html()),onSaveSuccess:function(aj,ak){this.trigger("render-details")}});var ad=g.extend({initialize:function(aj){this.listenTo(this.collection,"add",this.renderTranscript)},renderTranscript:function(aj){this.$el.append(this.addChildren(new ae({model:aj})).render().el)},render:function(){var aj=this;this.disposeAllChildren();this.collection.each(function(ak){aj.renderTranscript(ak)});return this}});var ae=g.extend({className:"jobseeker_profile_section_wrapper jobseeker_profile_section_resume_wrapper relative jobseeker_spacer",initialize:function(){this.content=null},renderDetails:function(){this.disposeChildren(this.content);this.content=this.addChildren(new Y({model:this.model}));this.content.on("render-deleted",this.renderDeleted,this);this.$el.append(this.content.render().el)},renderEdit:function(){this.disposeChildren(this.content);this.content=this.addChildren(new Z({model:this.model}));this.content.on("render-details",this.renderDetails,this);this.$el.append(this.content.render().el)},renderDeleted:function(){this.disposeChildren(this.content);this.content=this.addChildren(new ab({model:this.model}));this.content.on("render-details",this.renderDetails,this);this.$el.append(this.content.render().el)},render:function(){if(this.model.isNew()){this.renderEdit()}else{this.renderDetails()}return this}});var Y=g.extend({template:_.template(a("#transcript_details").html()),events:{"click [data-action=remove]":"onRemoveClick"},onRemoveClick:function(){this.showSavingState();this.model["delete"]({success:_.bind(this.onDeleteSuccess,this),error:_.bind(this.onDeleteError,this)})},onDeleteSuccess:function(aj,ak){this.trigger("render-deleted")},onDeleteError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var Z=w.extend({template:_.template(a("#transcript_edit").html()),onSaveSuccess:function(aj,ak){this.trigger("render-details")}});var ab=w.extend({template:_.template(a("#transcript_removed").html()),className:"jobseeker_profile_section jobseeker_profile_section_removed",events:{"click .jobseeker_profile_section_menu_item_undo":"onUndoClick"},onUndoClick:function(){this.showSavingState();this.model.undo({success:_.bind(this.onUndoSuccess,this),error:_.bind(this.onUndoError,this)})},onUndoSuccess:function(aj,ak){this.trigger("render-details")},onUndoError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var W=g.extend({initialize:function(){this.content=null},events:{"click .jobseeker_profile_section_menu_item_edit":"renderEdit","click .jobseeker_profile_section_menu_item_cancel":"onCancelClick"},onCancelClick:function(){var aj=this;if(this.model.isNew()){this.model.collection.remove(this.model);this.$el.fadeOut("fast",function(){aj.dispose()})}else{this.renderDetails()}},renderDetails:function(){var aj=this;if(this.content){this.content.$el.fadeOut("fast",function(){aj.disposeChildren(aj.content);aj.content=aj.addChildren(aj.detailsView());aj.content.on("render-deleted",aj.renderDeleted,aj);aj.content.$el.hide();aj.$el.append(aj.content.render().el);aj.content.$el.fadeIn("fast")})}else{this.content=this.addChildren(this.detailsView());this.content.on("render-deleted",aj.renderDeleted,aj);this.$el.append(this.content.render().el)}},renderEdit:function(){var aj=this;if(this.content){this.content.$el.fadeOut("fast",function(){aj.disposeChildren(aj.content);aj.content=aj.addChildren(aj.editView());aj.content.on("render-details",aj.renderDetails,aj);aj.content.on("render-deleted",aj.renderDeleted,aj);aj.content.$el.hide();aj.$el.append(aj.content.render().el);aj.content.$el.fadeIn("fast")})}else{this.content=this.addChildren(this.editView());this.content.on("render-details",this.renderDetails,aj);this.content.on("render-deleted",aj.renderDeleted,aj);this.content.$el.hide();this.$el.append(this.content.render().el);this.content.$el.fadeIn("fast")}},renderDeleted:function(){var aj=this;this.content.$el.fadeOut("fast",function(){aj.disposeChildren(aj.content);aj.content=aj.addChildren(aj.removedView());aj.content.on("render-details",aj.renderDetails,aj);aj.content.$el.hide();aj.$el.append(aj.content.render().el);aj.content.$el.fadeIn("fast")})},removedView:function(){throw new Error("Not Implemented.")},render:function(){if(this.model.isNew()){this.renderEdit()}else{this.renderDetails()}return this}});var P=g.extend({events:{"click .jobseeker_profile_section_addnew":"onAddNew"},onAddNew:function(){var aj=this.newModel();this.collection.add(aj);this.renderItem(aj)},renderItems:function(){var aj=this;this.collection.each(function(ak){aj.renderItem(ak)})},renderItem:function(aj){var ak=this.addChildren(this.newView(aj));this.$(".jobseeker_profile_section_qualifications").append(ak.render().el);return ak},render:function(){this.$el.html(this.template({collection:this.collection}));this.renderItems();return this}});var o=P.extend({initialize:function(){this.listenTo(this.collection,"add",this.renderLabels);this.listenTo(this.collection,"remove",this.renderLabels)},newModel:function(){return new j()},newView:function(aj){return new p({model:aj})},template:_.template(a("#educations").html()),headingTemplate:_.template(a("#educations_heading").html()),noneHeadingTemplate:_.template(a("#educations_none_heading").html()),addTextTemplate:_.template(a("#educations_add_text").html()),noneAddTextTemplate:_.template(a("#educations_none_add_text").html()),renderLabels:function(){if(this.collection.length){this.renderWithLabels()}else{this.renderNoneLabels()}},renderWithLabels:function(){this.$("[data-outlet=heading]").html(this.headingTemplate());this.$(".jobseeker_profile_section_addnew").html(this.addTextTemplate())},renderNoneLabels:function(){this.$("[data-outlet=heading]").html(this.noneHeadingTemplate());this.$(".jobseeker_profile_section_addnew").html(this.noneAddTextTemplate())},render:function(){P.prototype.render.call(this);this.renderLabels();return this}});var J=P.extend({newModel:function(){return new E()},newView:function(aj){return new K({model:aj})},template:_.template(a("#positions").html())});var d=J.extend({newModel:function(){return b.create()},newView:function(aj){return new e({model:aj})}});var s=J.extend({newModel:function(){return q.create()},newView:function(aj){return new t({model:aj})}});var Q=W.extend({});var p=Q.extend({detailsView:function(){return new k({model:this.model})},editView:function(){return new l({model:this.model})},removedView:function(){return new m({model:this.model})}});var K=Q.extend({detailsView:function(){return new F({model:this.model})},editView:function(){return new G({model:this.model})},removedView:function(){return new H({model:this.model})}});var e=K.extend({editView:function(){return new c({model:this.model})}});var t=K.extend({editView:function(){return new r({model:this.model})}});var M=g.extend({className:"jobseeker_profile_section clearfix",events:{"click .jobseeker_profile_section_menu_item_remove":"delete"},"delete":function(){this.showSavingState();this.model["delete"]({success:_.bind(this.onDeleteSuccess,this),error:_.bind(this.onDeleteError,this)})},onDeleteSuccess:function(aj,ak){this.trigger("render-deleted")},onDeleteError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var k=M.extend({template:_.template(a("#education_details").html())});var F=M.extend({template:_.template(a("#position_details").html())});var N=f.extend({className:"jobseeker_profile_section_editable clearfix",events:function(){return _.extend({},f.prototype.events,{"click .jobseeker_profile_section_menu_item_remove":"delete"})},onSaveSuccess:function(aj,ak){this.trigger("render-details")},"delete":function(){this.showSavingState();this.model["delete"]({success:_.bind(this.onDeleteSuccess,this),error:_.bind(this.onDeleteError,this)})},onDeleteSuccess:function(aj,ak){this.trigger("render-deleted")},onDeleteError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},render:function(){this.$el.html(this.template(this.model.toJSON()));if(this.model.isNew()){this.$el.addClass("new")}this.selectDropdowns();return this}});var l=N.extend({template:_.template(a("#education_edit").html()),formPreProcess:function(aj){aj.degree={id:aj["degree.id"]};delete aj["degree.id"]}});var G=N.extend({template:_.template(a("#position_edit").html()),events:function(){return _.extend({},N.prototype.events(),{"change [name=isCurrent]":"onIsCurrentChange"})},onIsCurrentChange:function(aj){this.$(".jobseeker_profile_section_position_end").fadeToggle("fast")},formPreProcess:function(aj){aj.start=aj.startMonth&&aj.startYear?aj.startYear+"-"+aj.startMonth+"-01":null;aj.end=aj.endMonth&&aj.endYear&&!aj.isCurrent?aj.endYear+"-"+aj.endMonth+"-01":null;delete aj.startMonth;delete aj.startYear;delete aj.endMonth;delete aj.endYear;delete aj.isCurrent},selectDropdowns:function(){var ak=this.model.get("start");if(ak){this.$('select[name="startMonth"]').val(parseInt(ak.split("-")[1],10));this.$('select[name="startYear"]').val(parseInt(ak.split("-")[0],10))}var aj=this.model.get("end");if(aj){this.$('select[name="endMonth"]').val(parseInt(aj.split("-")[1],10));this.$('select[name="endYear"]').val(parseInt(aj.split("-")[0],10))}}});var c=G.extend({formPreProcess:function(aj){G.prototype.formPreProcess.call(this,aj);aj.type={id:aj["type.id"]};delete aj["type.id"];aj.discipline="accounting"}});var r=G.extend({formPreProcess:function(aj){G.prototype.formPreProcess.call(this,aj);aj.discipline="extraCurricular"}});var O=g.extend({className:"jobseeker_profile_section jobseeker_profile_section_removed",events:{"click .jobseeker_profile_section_menu_item_undo":"onUndoClick"},onUndoClick:function(){this.model.set("id",undefined);this.showSavingState();this.model.save(this.model.toJSON(),{success:_.bind(this.onUndoSuccess,this),error:_.bind(this.onUndoError,this)})},onUndoSuccess:function(aj,ak){this.trigger("render-details")},onUndoError:function(ak,aj){this.hideSavingState();this.$(".message_error_server").text(aj).show()},render:function(){this.$el.html(this.template(this.model.toJSON()));return this}});var m=O.extend({template:_.template(a("#education_removed").html())});var H=O.extend({template:_.template(a("#position_removed").html())});return{init:function(an){h=an.dropboxAppKey;var am=new y({id:an.jobseekerId});if(an.transcripts){var aq=new ac(an.transcripts.data);aq.jobseeker=am;aq.add(new X());an.transcripts.outlet.append(new ad({collection:aq}).render().el)}if(an.resume){var ap=new R(an.resume.data);ap.jobseeker=am;an.resume.outlet.append(new V({model:ap}).render().el)}if(an.accountingPositions){var aj=new I(an.accountingPositions.data);aj.jobseeker=am;if(!aj.length){aj.add(b.create())}an.accountingPositions.outlet.append(new d({collection:aj}).render().el)}if(an.extraCurricularPositions){var al=new I(an.extraCurricularPositions.data);al.jobseeker=am;if(!al.length){al.add(q.create())}an.extraCurricularPositions.outlet.append(new s({collection:al}).render().el)}if(an.positions){var ao=new I(an.positions.data);ao.jobseeker=am;if(!ao.length){ao.add(new E())}an.positions.outlet.append(new J({collection:ao}).render().el)}if(an.educations){var ak=new n(an.educations.data);ak.jobseeker=am;an.educations.outlet.append(new o({collection:ak}).render().el)}}}}(jQuery));