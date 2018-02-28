var JOBCENTRE=window.JOBCENTRE||{};JOBCENTRE.purchase=(function(a){var J={purchases:"/api/v1.1/purchases",countries:"/api/v1.1/countries",provinces:"/api/v1.1/provinces?countryId=:id",taxcodes:"/api/v1.1/taxcodes",storedcards:"/api/v1.1/creditcards"};var f=Backbone.Model.extend({_validators:{required:function(N,K,O,L,M){if(!O||(O+"").trim()==""){M.push({attr:K,message:N.message||(" is required")})}},maxLength:function(N,K,O,L,M){if(!O||(O+"").trim()==""){return}if(O.trim().length>N.max){M.push({attr:K,message:N.message||String.format(" exceeds {0} characters",N.max)})}},regex:function(N,K,O,L,M){if(!O||(O+"").trim()==""){return}if(!N.pattern.test(O.trim())){M.push({attr:K,message:N.message||(" is invalid")})}},custom:function(N,K,P,L,M){if(!N.isValid){throw new Error("isValid missing for custom validation")}var O=N.isValid(N,K,P,L);if(O===true){return}if(O===false){M.push({attr:K,message:N.message});return}if(_.isString(O)){M.push({attr:K,message:O});return}throw new Error("validity not supported.")}},isValid:function(){if(!this.validations){return true}var L=[];for(var K in this.attributes){if(!this.validations[K]){continue}this.checkValidity(this.validations[K],this.attributes[K],K,L)}if(L.length>0){this.trigger("validation-error",this,L);return false}else{return true}},checkValidity:function(N,O,K,L){for(var M in N){if(!this._validators[M]&&O[M]!==undefined){O=O[M];N=N[M];K=K+"."+M;this.checkValidity(N,O,K,L);continue}if(!this._validators[M]){throw new Error("Validation "+M+" not supported.")}this._validators[M](N[M],K,O,this.attributes,L)}}});var C=Backbone.Model.extend({defaults:{ready:false,error:null}});var B=Backbone.Model.extend({defaults:{selectedNav:null}});var h=Backbone.Model.extend({collection:Backbone.Collection,listName:"",url:"",initialize:function(){this._loading=false;this._loaded=false;this._list=new this.collection()},getList:function(K){if(!this._loaded){this._load(K)}return this._list},_load:function(K){var L=this;if(!this._loading){this._list.state.set({ready:false,error:null});this._loading=true;var M=this.url;if(_.isFunction(M)){M=M.call(this)}a.ajax({url:M,dataType:"json",cache:!K,type:"GET",success:function(O,P,N){L._list.reset(O.data);L._list.state.set({ready:true,error:null});L._loaded=true},error:function(O,P,N){L._list.state.set({error:String.format("Error retrieving {0} list.",L.listName)})},complete:function(N,O){L._loading=false}})}}});var j=Backbone.Model.extend({initialize:function(){this.provinceCache=new w(null,{countryId:this.id})}});var i=Backbone.Collection.extend({model:j,initialize:function(){this.state=new C()}});var k=h.extend({collection:i,listName:"country",url:function(){return J.countries},getCountries:function(){return this.getList()}});var v=Backbone.Model.extend({});var x=Backbone.Collection.extend({model:v,initialize:function(){this.state=new C()}});var w=h.extend({collection:x,listName:"province",url:function(){return J.provinces.replace(":id",this._countryId)},initialize:function(K,L){h.prototype.initialize.call(this,K,L);this._countryId=L.countryId},getProvinces:function(){return this.getList()}});var G=Backbone.Model.extend();var I=Backbone.Collection.extend({model:G,initialize:function(){this.state=new C()}});var H=h.extend({collection:I,primeTimer:0,listName:"taxcodes",url:function(){return J.taxcodes},getTaxCodes:function(){return this.getList()}});var D=Backbone.Model.extend();var F=Backbone.Collection.extend({model:D,initialize:function(){this.state=new C()}});var E=h.extend({collection:F,primeTimer:0,listName:"storedcards",url:function(){return J.storedcards},getStoredCards:function(){return this.getList(true)}});var l=f.extend({defaults:{storedCardId:"",holder:"",number:"",expiry:"",cvd:""},expiryMonth:function(){if(!this.get("expiry")){return""}if(this.get("expiry").length<2){return""}return this.get("expiry").substring(0,2)},expiryYear:function(){if(!this.get("expiry")){return""}if(this.get("expiry").length!==4){return""}return this.get("expiry").substring(2,4)},validations:{holder:{required:{}},number:{required:{},custom:{isValid:function(R,K,S,L){if(!S||S.trim()==""){return false}if(/[^0-9-]+/.test(S)){return false}var P=0,Q=0,M=false;S=S.replace(/\D/g,"");for(var O=S.length-1;O>=0;O--){var N=S.charAt(O);var Q=parseInt(N,10);if(M){if((Q*=2)>9){Q-=9}}P+=Q;M=!M}return(P%10)==0},message:" is invalid"}},expiry:{required:{},regex:{pattern:/^[0-9]{4}$/,message:" is not complete"}},cvd:{required:{},regex:{pattern:/^[0-9]{3,4}$/}}}});var c=f.extend({defaults:{contact:"",email:"",phone:"",street:"",city:"",postalCode:"",province:{},country:{}},validations:{contact:{required:{},maxLength:{max:256}},email:{required:{},maxLength:{max:256},regex:{pattern:/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/}},phone:{required:{},maxLength:{max:20},custom:{isValid:function(N,K,O,L){if(!O||O.trim()==""){return false}var M=O.replace(/[^0-9]/g,"");return M.length>=10},message:" must be at least 10 numbers"}},street:{required:{},maxLength:{max:128}},city:{required:{},maxLength:{max:128}},postalCode:{required:{},regex:{pattern:/(^[a-zA-Z][0-9][a-zA-Z]\s?[0-9][a-zA-Z][0-9]$)|(^[0-9]{5})$/}},province:{id:{required:{}}},country:{id:{required:{}}}}});var s=Backbone.Model.extend({initialize:function(){this.addedOnTo=null},discountedPrice:function(){if(this.get("discountRate")===0){return this.get("price")}return this.get("price")*(1-this.get("discountRate"))},discountedText:function(){if(this.discountedPrice()%1===0){return this.discountedPrice().toString()}else{return this.discountedPrice().toFixed(2)}},discountedDescription:function(){if(!this.get("recurrencePeriod")){return this.discountedText()}return this.discountedText()+" /"+this.get("recurrencePeriod")},priceText:function(){if(this.get("price")%1===0){return this.get("price").toString()}else{return this.get("price").toFixed(2)}},getAddon:function(){var K=this;if(!this.get("addon")){return null}return this.collection.find(function(L){return L.id==K.get("addon").id})},getAddonPrompt:function(){if(!this.getAddon()){return null}var K=Math.ceil(this.getAddon().discountedPrice()-this.discountedPrice());return{line1:this.get("addon").prompt1,line2:this.get("addon").prompt2,line3:this.get("addon").prompt3.replace("{difference}",K).replace("{price}",this.getAddon().discountedPrice())}}});var t=Backbone.Collection.extend({model:s,forJobs:function(){return this.filter(function(K){return K.get("type")==="job"})},forJobsLine1:function(){return _.filter(this.forJobs(),function(K){return K.get("line")===1})},forJobsLine2:function(){return _.filter(this.forJobs(),function(K){return K.get("line")===2})},forResumes:function(){return this.filter(function(K){return K.get("type")==="resume"})}});var n=Backbone.Model.extend({trackEcommerce:function(){var K=this;if(!window.dataLayer){return}dataLayer.push({event:"transactionComplete",transactionId:this.id,transactionAffiliation:this.get("agent")?"Agent":"Employer",transactionTotal:this.get("subtotal"),transactionTax:this.get("tax"),transactionShipping:0,transactionProducts:_.map(this.get("items"),function(L){return{sku:L.sku,name:L.description,category:L.category,price:L.amount,quantity:1}})})}});var y=Backbone.Model.extend({defaults:{creditCard:new l(),address:new c(),plan:null,invoice:null},initialize:function(K,L){this.options=L;this.plans=new t(L.plans);this.taxCodes=new H().getTaxCodes();this.storedCards=new E().getStoredCards();this.listenTo(this.storedCards.state,"change",this.onStoredCardsStateChange)},onStoredCardsStateChange:function(){if(this.storedCards.state.get("ready")){if(this.storedCards.length>0){this.get("creditCard").set("storedCardId",this.storedCards.at(0).id)}}},trySetPlan:function(K){var L=this.plans.find(function(M){return M.id==K});if(!L){return false}this.set("plan",L);return true},switchToAddonFrom:function(L){var K=L.getAddon();K.addedOnTo=L;this.trySetPlan(K.id)},switchAwayFromAddon:function(K){if(this.get("plan")===K){this.trySetPlan(K.addedOnTo.id)}},taxRate:function(){if(!this.taxCodes.state.get("ready")){return 0}var L=this;var K=this.taxCodes.find(function(M){if(!M.get("province")){return true}return M.get("province").id==L.get("address").get("province").id});if(!K){return 0}return K.get("rate")},taxAmount:function(){if(!this.get("plan")){return 0}return this.taxRate()*this.get("plan").discountedPrice()},taxAmountText:function(){if(this.taxAmount()%1===0){return this.taxAmount().toString()}else{return this.taxAmount().toFixed(2)}},taxAmountDescription:function(){if(!this.get("plan")){return"-"}if(!this.get("plan").get("recurrencePeriod")){return this.taxAmountText()}return this.taxAmountText()+" /"+this.get("plan").get("recurrencePeriod")},total:function(){if(!this.get("plan")){return 0}return this.taxAmount()+this.get("plan").discountedPrice()},totalText:function(){if(this.total()%1===0){return this.total().toString()}else{return this.total().toFixed(2)}},totalDescription:function(){if(!this.get("plan")){return"-"}if(!this.get("plan").get("recurrencePeriod")){return this.totalText()}return this.totalText()+" /"+this.get("plan").get("recurrencePeriod")},submit:function(K){K||(K={});if(this.get("creditCard").get("storedCardId")){this.save(_.extend(this.toJSON(),{creditCard:{id:this.get("creditCard").get("storedCardId")}}),K)}else{if(this.options.stripePublishableKey){this.tokenizeCard(K)}else{this.save(this.toJSON(),K)}}},tokenizeCard:function(K){var L=this;Stripe.setPublishableKey(this.options.stripePublishableKey);Stripe.card.createToken({address_line1:this.get("address").get("street"),address_city:this.get("address").get("city"),address_state:"BC",address_zip:this.get("address").get("postalCode"),address_country:"Canada",name:this.get("creditCard").get("holder"),number:this.get("creditCard").get("number"),cvc:this.get("creditCard").get("cvd"),exp_month:this.get("creditCard").get("expiry").substr(0,2),exp_year:"20"+this.get("creditCard").get("expiry").substr(2,2)},function(N,M){if(M.error){K.error(L,M.error.message)}else{L.save(_.extend(L.toJSON(),{creditCard:{token:M.id}}),K)}})},save:function(L,K){K||(K={});var M=this;a.ajax({url:J.purchases,contentType:"application/json",data:JSON.stringify(L),dataType:"json",type:"POST",success:function(O,P,N){M.set("invoice",new n(O));M.get("invoice").trackEcommerce();if(K.success){K.success(M,O)}},error:function(O,Q,N){if(O.status===400){var P=JSON.parse(O.responseText);if(K.error){K.error(M,P.message);return}}if(K.error){K.error(M,"Error connecting to the server.")}}})}});var g=function(K){this.parent=null;this.children=[];Backbone.View.apply(this,[K])};_.extend(g.prototype,Backbone.View.prototype,{loaderTemplate:_.template(a("#purchase_loader").html()),errorTemplate:_.template(a("#purchase_error").html()),renderState:function(K){if(K.get("error")){a(this.el).html(this.errorTemplate({error:K.get("error")}));return true}if(!K.get("ready")){this.renderLoader(this.el);return true}return false},renderLoader:function(K){a(K).empty().html(this.loaderTemplate())},addChildren:function(K){var L,M=this;if(_.isArray(K)){L=K}else{L=_.toArray(arguments)}_.each(L,function(N){M.children.push(N);N.parent=M});if(L.length===1){return L[0]}else{return L}},disposeChildren:function(K){if(!K){return}var M=this;var L=_.isArray(K)?K:_.toArray(arguments);_.each(L,function(N){N.dispose()})},disposeAllChildren:function(){var K=this.children.slice(0);_.each(K,function(L){L.dispose()})},dispose:function(){this.disposeAllChildren();this.remove();this._removeFromParent()},_removeFromParent:function(){if(this.parent){this.parent._removeChild(this)}},_removeChild:function(K){var L=_.indexOf(this.children,K);if(L!==-1){this.children.splice(L,1)}}});g.extend=Backbone.View.extend;var e=function(K){g.apply(this,[K]);if(this.modelName){this.listenTo(this.model.get(this.modelName),"validation-error",this.onValidationError,this)}};_.extend(e.prototype,g.prototype,{_validatable:false,events:{submit:"onSubmit","keyup input,textarea":"onKeyup","change select,input":"onChange",validate:"validateIfReady"},hideSavingState:function(){this.$el.children().removeClass("invisible").end().find(".flex-loader-mini").remove()},showSavingState:function(){this.$el.children().addClass("invisible").end().prepend('<div class="flex-loader-mini"></div>')},onSaveSuccess:function(K,L){this.hideSavingState()},onSaveError:function(L,K){this.hideSavingState();this.$('[data-element="alert_danger_server"]').text(K).show()},onValidationError:function(P,N){var K=this.$('[data-element="alert_danger_server"]');K.html("");for(var O=N.length;O--;){var M=N[O];if(_.isString(M)){K.html(M).show()}else{var L=this.mapFromModel(M.attr);this.$('input[name="'+L+'"],textarea[name="'+L+'"],select[name="'+L+'"]').each(function(){if(this.tagName==="SELECT"){}else{a(this).addClass("error")}}).closest(".form-group").find(".form-error").html(M.message).show()}}},onSubmit:function(K){K.preventDefault();this._validatable=true;if(this.isValid()){this.save()}},save:function(){},mapToModel:function(){var O=this;var K={};var N=this.$("form").serializeArray();for(var L=0,M=N.length;L<M;L++){K[N[L].name]=N[L].value}this.formPreProcess(K);this.model.get(this.modelName).set(K)},mapFromModel:function(K){return K},isValid:function(){this.$(".error").removeClass("error");this.$('[data-element="alert_danger_server"]').hide();this.$(".form-error").hide();return this.model.get(this.modelName).isValid()},formPreProcess:function(K){},onKeyup:function(K){if(K.which===13){return}this.mapToModel();this.validateIfReady()},onChange:function(L){var K=a(L.currentTarget);if(K.attr("name")==="country.id"){this.onCountryChange()}this.mapToModel();this.validateIfReady()},validateIfReady:function(){if(this._validatable){this.isValid()}},bindSelect2:function(){var L=this;var K=function(){L.$("select").select2({allowClear:true})};if(!a.contains(document.documentElement,this.el)){setTimeout(K,10)}else{K()}}});e.extend=g.extend;var o=g.extend({template:_.template(a("#purchase_modal").html()),className:"modal fade",initialize:function(){this.navView=null;this.content=null},getDirection:function(K,L){if(L==null){return 0}if(K.position<L.position){return -1}if(K.position>L.position){return 1}return 0},slideOut:function(N,L){if(N==null){return}if(L===0){this.disposeChildren(N);return}var M=this,K=this.$("[data-outlet=panel]"),O=K.width();K.height(K.height());N.$el.stop(true).css({width:O+"px",position:"absolute"}).animate({left:O*-L},300,function(){M.disposeChildren(N)})},slideIn:function(N,L){if(L===0){this.$("[data-outlet=panel]").append(N.render().el);return}var K=this.$("[data-outlet=panel]").append(N.render().el);var P=K.width();var M=K.outerHeight()-K.height();var O=N.$el.outerHeight(true);N.trigger("sliding-in-started");N.$el.css({position:"absolute",width:P+"px",left:P*L}).animate({left:0},300,function(){N.$el.css({position:"static",width:"100%"});N.trigger("sliding-in-ended")});K.animate({height:O+M},300,function(){K.css("height","auto")})},renderPlansView:function(){this.renderPanel(new u({model:this.model}))},renderAddressView:function(){if(!this.model.get("plan")){z.navigate("",true);return}this.renderPanel(new d({model:this.model,countries:this.options.countries}))},renderAddonView:function(){if(!this.model.get("plan")){z.navigate("",true);return}if(!this.model.get("address").isValid()){z.navigate("address",true);return}var K=this.model.get("plan").addedOnTo?this.model.get("plan").addedOnTo:this.model.get("plan");this.renderPanel(new b({model:{purchase:this.model,basePlan:K}}))},renderPaymentView:function(){if(!this.model.get("plan")){z.navigate("",true);return}if(!this.model.get("address").isValid()){z.navigate("address",true);return}this.renderPanel(new r({model:this.model}))},renderFinishView:function(){if(!this.model.get("invoice")){z.navigate("",true);return}this.renderPanel(new m({model:this.model,session:this.options.session,callToActionLabel:this.options.callToActionLabel}))},renderPanel:function(L){var M=this.content;this.content=this.addChildren(L);var K=this.getDirection(this.content,M);this.slideOut(M,K);this.slideIn(this.content,K)},render:function(){this.$el.html(this.template());this.navView=this.addChildren(new p({session:this.options.session}));this.$("[data-outlet=nav]").append(this.navView.render().el);return this}});var p=g.extend({template:_.template(a("#purchase_nav").html()),className:"purchase_nav",initialize:function(){this.listenTo(this.options.session,"change:selectedNav",this.onNavChange)},events:{"click [data-render]":"onRenderClick"},onNavChange:function(){this.$(".active").removeClass("active");a("[data-render="+this.options.session.get("selectedNav")+"]").parent().addClass("active")},onRenderClick:function(K){K.preventDefault();z.navigate(a(K.currentTarget).data("render"),true)},render:function(){this.$el.html(this.template());return this}});var q=e.extend({render:function(){this.$el.html(this.template(this.model));return this}});var u=q.extend({position:1,template:_.template(a("#purchase_panel_plans").html()),className:"panel panel_plans",events:{"click [data-plan]":"onPlanClick"},onPlanClick:function(K){K.preventDefault();if(this.model.trySetPlan(a(K.currentTarget).data("plan"))){z.navigate("address",true)}}});var d=q.extend({position:2,modelName:"address",template:_.template(a("#purchase_panel_address").html()),className:"panel panel_address",initialize:function(K){this._currentProvinces=null;this.listenTo(K.countries.state,"change",this.render)},onCountryChange:function(){var M=this.$('select[name="country.id"]').val();if(M){var L=this.options.countries.get(M);var N=L.provinceCache.getProvinces();this._currentProvinces=N;if(!N.state.get("ready")){var K=this.$('select[name="province.id"]').closest('[data-element="province_input_section"]');if(K.find(".select2-container").length){K.append('<span data-element="loader" class="flex-loader-mini"></span>').find(".select2-container").css("visibility","hidden")}this.listenTo(N.state,"change",this.renderProvinces);return}this.renderProvinces(N.state)}},renderProvinces:function(M){if(this._currentProvinces.state!==M){return}var N=this;var K=this.$('select[name="province.id"]');K.closest('[data-element="province_input_section"]').find('[data-element="loader"]').remove().end().find(".select2-container").css("visibility","visible");if(M.get("error")){JOBCENTRE.alertFloater.show({summary:M.get("error"),isError:true,duration:5000});return}if(!M.get("ready")){throw new Error("Provinces not ready.")}var L=[];L.push('<option value=""></option>');this._currentProvinces.each(function(O){L.push(String.format('<option value="{0}"{1}>{2}</option>',O.id,(N.model.get("address").get("province").id==O.id)?' selected="selected"':"",O.get("name")))});K.html(L.join("")).trigger("change")},renderCountries:function(){var L=this,K=[];K.push('<option value=""></option>');this.options.countries.each(function(M){K.push(String.format('<option value="{0}"{1}>{2}</option>',M.id,(L.model.get("address").get("country").id==M.id)?' selected="selected"':"",M.get("name")))});this.$('select[name="country.id"]').html(K.join(""));this.onCountryChange()},formPreProcess:function(K){K.province={id:K["province.id"]};K.country={id:K["country.id"]};delete K["province.id"];delete K["country.id"]},save:function(K){if(this.model.get("plan").getAddon()){z.navigate("addon",true)}else{z.navigate("payment",true)}},render:function(){if(this.renderState(this.options.countries.state)){return this}this.$el.html(this.template(this.model));this.renderCountries();this.bindSelect2();return this}});var b=q.extend({position:3,template:_.template(a("#purchase_panel_addon").html()),className:"panel panel_addon",events:{"click [data-action]":"onActionClick"},onActionClick:function(K){K.preventDefault();if(a(K.currentTarget).data("action")==="add"){this.model.purchase.switchToAddonFrom(this.model.basePlan)}else{this.model.purchase.switchAwayFromAddon(this.model.basePlan.getAddon())}z.navigate("payment",true)}});var r=q.extend({position:4,modelName:"creditCard",template:_.template(a("#purchase_panel_payment").html()),className:"panel panel_payment",initialize:function(){this.listenTo(this.model.taxCodes.state,"change",this.render);this.listenTo(this.model.storedCards.state,"change",this.render);this.listenTo(this.model.get("creditCard"),"change:storedCardId",this.onStoredCardIdChange)},onStoredCardIdChange:function(){this.$("[data-element=new_creditcard_form]").toggle(!this.model.get("creditCard").get("storedCardId"))},isValid:function(){if(this.model.get("creditCard").get("storedCardId")){return true}else{return e.prototype.isValid.apply(this)}},formPreProcess:function(K){if(K.expiryMonth&&K.expiryYear){K.expiry=K.expiryMonth.toString()+K.expiryYear.toString()}else{K.expiry=""}K.number=K.number.replace(/\s/g,"");delete K.expiryMonth;delete K.expiryYear},mapFromModel:function(K){if(K==="expiry"){return"expiryMonth"}return K},onSaveSuccess:function(K,L){this.hideSavingState();z.navigate("finish",true)},save:function(){this.showSavingState();this.model.submit({success:_.bind(this.onSaveSuccess,this),error:_.bind(this.onSaveError,this)})},render:function(){if(this.renderState(this.model.taxCodes.state)){return this}if(this.renderState(this.model.storedCards.state)){return this}this.$el.html(this.template(this.model));this.onStoredCardIdChange();var K=this;setTimeout(function(){K.$("input").first().focus()},100);return this}});var m=q.extend({position:5,modelName:"invoice",template:_.template(a("#purchase_panel_final").html()),className:"panel panel_invoice",render:function(){this.$el.html(this.template({invoice:this.model.get("invoice"),callToActionLabel:this.options.callToActionLabel}));return this}});var z;var A=Backbone.Router.extend({routes:{"":"plans",address:"address",addon:"addon",payment:"payment",finish:"finish"},initialize:function(K){z=this;this.options=K;this.started=false},startUp:function(){this.started=true;this.session=new B(null,this.options);this.purchase=new y(null,this.options);var K={};if(this.options.address){this.purchase.get("address").set(this.options.address)}this.modalView=new o({model:this.purchase,session:this.session,callToActionLabel:this.options.callToActionLabel,countries:new k().getCountries()});a("body").append(this.modalView.render().el);this.modalView.$el.modal({backdrop:"static",keyboard:false}).on("hidden.bs.modal",_.bind(this.tearDown,this));if(this.options.planId){if(this.purchase.trySetPlan(this.options.planId)){z.navigate("address");z.address();return}}z.navigate("");z.plans()},tearDown:function(){this.modalView.dispose();this.modalView=null;this.session=null;z=null;Backbone.history.stop();if(this.purchase.get("invoice")){if(this.options.onPurchaseComplete){this.options.onPurchaseComplete()}}},plans:function(){if(!this.started){return}this.session.set("selectedNav","");this.modalView.renderPlansView()},addon:function(){if(!this.started){return}this.session.set("selectedNav","addon");this.modalView.renderAddonView()},address:function(){if(!this.started){return}this.session.set("selectedNav","address");this.modalView.renderAddressView()},payment:function(){if(!this.started){return}this.session.set("selectedNav","payment");this.modalView.renderPaymentView()},finish:function(){if(!this.started){return}this.session.set("selectedNav","finish");this.modalView.renderFinishView()}});return{init:function(K){var L=new A(K);Backbone.history.start();L.startUp();this.init=function(M){if(M.address){delete M.address}var N=new A(M);Backbone.history.start();N.startUp()}}}}(jQuery));JOBCENTRE.ensurePlan=(function(a){var b=Backbone.View.extend({template:_.template(a("#purchase_spinner").html()),className:"overlay overlay-white overlay-fixed",render:function(){this.$el.html(this.template());return this}});return{initJob:function(c){this.showSpinner();c.isForJob=true;c.notValidPlan=_.bind(this.purchase,this);this.checkCredits(c)},showSpinner:function(){this.spinnerView=new b();a("body").append(this.spinnerView.render().el)},removeSpinner:function(){this.spinnerView.remove()},checkCredits:function(c){var d=this;a.ajax({url:"/services/RemoteServiceProxy.cfc?method=checkEmployerCredits&returnformat=json",dataType:"json",cache:false,type:"GET",success:function(f,g,e){d.removeSpinner();if(f.SUCCESS){if(c.isForJob){if(f.JOBPOST){if(c.onValidPlan){c.onValidPlan()}return}}else{if(f.RESUMEACCESS){if(c.onValidPlan){c.onValidPlan()}return}}}c.notValidPlan(c)},error:function(f,g,e){d.removeSpinner();if(f.status!==401){alert("Error connecting to the server. Please try again.")}}})},purchase:function(c){var d=this;c.onPurchaseComplete=function(){c.notValidPlan=d.noop;d.showSpinner();d.checkCredits(c)};JOBCENTRE.purchase.init(c)},noop:function(){}}}(jQuery));