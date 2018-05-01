var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobApply = (function ($) {

    var dropboxAppKey, eid, siteProvinceCode, onApplyCallToAction;

    //#region url

    var url = {
        linkedInAuthorization: '/com/portals/auth/linkedin_resume_authorize?callback=:callback',

        applications: '/api/v1.1/jobapplications',
        resumes: '/api/v1.1/resumefiles',
        formResume: '/api/v1.1/resumefiles/form',
        fetchResume: '/api/v1.1/resumefiles/fetch',

        // generic
        countries: '/api/v1.1/countries',
        provinces: '/api/v1.1/provinces?countryId=:id'
    };

    //#endregion

    // MODELS

    //#region BaseModel

    // don't use the technique we're using in BaseView to extend Backbone.Model, because instanceof Backbone.Model will return false.
    var BaseModel = Backbone.Model.extend({

        _validators: {
            required: function (validationItem, attr, value, attrs, errors) {

                if (!value || (value + '').trim() == '')
                    errors.push({ attr: attr, message: validationItem.message || (' is required') });

            },
            maxLength: function (validationItem, attr, value, attrs, errors) {

                if (!value || (value + '').trim() == '')
                    return;

                if (value.trim().length > validationItem.max)
                    errors.push({ attr: attr, message: validationItem.message || String.format(' exceeds {0} characters', validationItem.max) });
            },
            regex: function (validationItem, attr, value, attrs, errors) {

                if (!value || (value + '').trim() == '')
                    return;

                if (!validationItem.pattern.test(value.trim()))
                    errors.push({ attr: attr, message: validationItem.message || (' is invalid') });
            },
            custom: function (validationItem, attr, value, attrs, errors) {

                if (!validationItem.isValid)
                    throw new Error('isValid missing for custom validation');

                var validity = validationItem.isValid(validationItem, attr, value, attrs);

                if (validity === true)
                    return;

                if (validity === false) {
                    errors.push({ attr: attr, message: validationItem.message });
                    return;
                }

                if (_.isString(validity)) {
                    errors.push({ attr: attr, message: validity });
                    return;
                }

                throw new Error('validity not supported.');
            }
        },

        isValid: function () {
            if (!this.validations)
                return true;

            var errors = [];
            for (var attr in this.attributes) {
                if (!this.attributes.hasOwnProperty(attr)) continue;
                if (!this.validations[attr]) continue;

                var validationItems = this.validations[attr];
                for (var item in validationItems) {
                    if (!validationItems.hasOwnProperty(item)) continue;

                    if (!this._validators[item])
                        throw new Error('Validation ' + item + ' not supported.');

                    this._validators[item](validationItems[item], attr, this.attributes[attr], this.attributes, errors);
                }
            }

            if (errors.length > 0) {
                this.trigger('validation-error', this, errors);
                return false;
            } else {
                return true;
            }
        },

        ajaxSuccess: function (options, response, textStatus, jqXHR) {

            this.set(this.parse(response, jqXHR));

            if (this.state)
                this.state.set({ ready: true });

            if (options.success)
                options.success(this, response);
        },

        ajaxError: function (options, jqXHR, textStatus, errorThrown) {

            if (jqXHR.status === 400) {
                var response = JSON.parse(jqXHR.responseText);

                if (options.error)
                    options.error(this, response.message)
                else {
                    var exceptions = ['ValidationException', 'InvalidOperationException'];
                    if (_.indexOf(exceptions, response.error.type) !== -1)
                        this.trigger('validation-error', this, [response.message]);
                }
                return;
            }

            var error = ['Error connecting to the server.'];
            if (options.error)
                options.error(this, error)
            else
                this.trigger('error', this, error);
        }
    });

    //#endregion

    //#region State

    var State = Backbone.Model.extend({
        defaults: {
            ready: false,
            error: null
        }
    });

    //#endregion

    //#region Cache

    var Cache = Backbone.Model.extend({

        collection: Backbone.Collection,
        listName: '',
        url: '',

        initialize: function () {

            this._loading = false;
            this._loaded = false;
            this._list = new this.collection();
        },

        getList: function () {
            if (!this._loaded)
                this._load();

            return this._list;
        },

        _load: function () {

            var that = this;

            if (!this._loading) {

                this._list.state.set({ ready: false, error: null });

                this._loading = true;

                var url = this.url;
                if (_.isFunction(url)) url = url.call(this);

                $.ajax({
                    url: url,
                    dataType: 'json',
                    cache: true,
                    type: 'GET',
                    success: function (response, textStatus, jqXHR) {

                        that._list.reset(response.data);
                        that._list.state.set({ ready: true, error: null });
                        that._loaded = true;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        that._list.state.set({ error: String.format('Error retrieving {0} list.', that.listName) });
                    },
                    complete: function (jqXHR, textStatus) {
                        that._loading = false;
                    }
                });
            }
        }

    });

    //#endregion

    //#region Country

    var Country = Backbone.Model.extend({

        initialize: function () {
            this.provinceCache = new ProvinceCache(null, { countryId: this.id });
        }
    });

    var Countries = Backbone.Collection.extend({
        model: Country,

        initialize: function () {
            this.state = new State();
        }
    });

    var CountryCache = Cache.extend({

        collection: Countries,
        listName: 'country',
        url: function () {
            return url.countries;
        },

        getCountries: function () {
            return this.getList();
        }
    });

    //#endregion

    //#region Province

    var Province = Backbone.Model.extend({
    });

    var Provinces = Backbone.Collection.extend({
        model: Province,

        initialize: function () {
            this.state = new State();
        }
    });

    var ProvinceCache = Cache.extend({

        collection: Provinces,
        listName: 'province',

        url: function () {
            return url.provinces.replace(':id', this._countryId);
        },

        initialize: function (attributes, options) {

            Cache.prototype.initialize.call(this, attributes, options);
            this._countryId = options.countryId;
        },

        getProvinces: function () {
            return this.getList();
        }
    });

    //#endregion

    //#region Resume

    var Resume = BaseModel.extend({

        defaults: {
            state: '', // '', idle, error, uploading, uploaded
            fileName: '',
            fileSize: 0,
            token: null,
            progress: 0,
            error: null
        },

        restore: function () {
            this.set({
                state: '',
                fileName: '',
                fileSize: 0,
                token: null,
                progress: 0,
                error: null
            });
        },

        setError: function (message) {
            this.restore();
            this.set({ state: 'error', error: message });
        },

        setUploading: function (message) {
            this.restore();
            this.set({ state: 'uploading' });
        },

        setResume: function (token, fileName) {
            this.restore();
            this.set({ state: 'uploaded', token: token, fileName: fileName });
        },

        removeResume: function () {
            this.restore();
            this.set({ state: 'idle' });
        },

        setFileSize: function (fileSize) {
            if (fileSize === 0)
                this.set({ fileSize: '? KB' });
            else if (fileSize > 1024 * 1024)
                this.set({ fileSize: (Math.round(fileSize * 100 / (1024 * 1024)) / 100).toString() + 'MB' });
            else
                this.set({ fileSize: (Math.round(fileSize * 100 / 1024) / 100).toString() + 'KB' });;
        },

        isUploaded: function () {
            return this.get('state') === 'uploaded';
        },

        isUploading: function () {
            return this.get('state') === 'uploading';
        },

        send: function (file, callbacks) {
            var fd = new FormData();
            fd.append('file', file);
            var xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', callbacks.progress, false);
            xhr.addEventListener('load', callbacks.load, false);
            xhr.addEventListener('error', callbacks.error, false);
            xhr.addEventListener('abort', callbacks.abort, false);
            xhr.open('POST', url.resumes);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(fd);
        },

        fetch: function (source, link, accessToken, options) {

            options || (options = {});
            var that = this;

            $.ajax({
                url: url.fetchResume,
                contentType: 'application/json',
                data: JSON.stringify({
                    url: link,
                    accessToken: accessToken,
                    source: source
                }),
                dataType: 'json',
                type: 'POST',
                success: function (response, textStatus, jqXHR) {
                    if (options.success)
                        options.success(that, response);
                },
                error: _.bind(that.ajaxError, that, options)
            });
        }

    });

    //#endregion

    //#region ApplicationForm

    var ApplicationForm = BaseModel.extend({
        defaults: {
            jobId: null,
            resumeToken: null,
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            countryId: '',
            provinceId: '',
            city: '',
            coverLetter: '',
            resumeSource: null
        },

        validations: {
            resumeToken: {
                required: {
                    message: 'Resume is required.'
                }
            },
            firstName: {
                required: {},
                maxLength: {
                    max: 128
                }
            },
            lastName: {
                required: {},
                maxLength: {
                    max: 128
                }
            },
            email: {
                required: {},
                maxLength: {
                    max: 256
                },
                regex: {
                    pattern: /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/
                }
            },
            phone: {
                maxLength: {
                    max: 20
                },
                regex: {
                    pattern: /^[\d-\.()\+\s]+$/
                }
            },
            city: {
                required: {},
                maxLength: {
                    max: 50
                }
            },
            provinceId: {
                required: {}
            },
            countryId: {
                required: {}
            }
        },

        save: function (options) {

            options || (options = {});
            var that = this;

            var attrs = this.toJSON();
            if (attrs.provinceId) {
                attrs.province = {
                    id: attrs.provinceId
                };
                delete attrs.provinceId;
            }

            if (attrs.countryId) {
                attrs.country = {
                    id: attrs.countryId
                };
                delete attrs.countryId;
            }

            if (eid)
                attrs.eid = eid;

            $.ajax({
                url: url.applications,
                contentType: 'application/json',
                data: JSON.stringify(attrs),
                dataType: 'json',
                type: 'POST',
                success: function (response, textStatus, jqXHR) {
                    that.set(that.parse(response, jqXHR));

                    if (options.success)
                        options.success(that, response);

                    if (JOBCENTRE.jobRecommendation && JOBCENTRE.jobRecommendation.apply)
                        JOBCENTRE.jobRecommendation.apply(that.get('jobId'));
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        var response = JSON.parse(jqXHR.responseText);

                        if (options.error) {
                            options.error(that, [response.message]);
                            return;
                        }

                        var exceptions = ['ValidationException', 'InvalidOperationException'];
                        if (_.indexOf(exceptions, response.type) !== -1) {
                            that.trigger('validation-error', that, [response.message]);
                            return;
                        }
                    }

                    var error = ['Error connecting to the server.'];
                    if (options.error)
                        options.error(that, error)
                    else
                        that.trigger('error', that, error);
                }
            });
        }
    });

    //#endregion

    //#region Application

    var Application = Backbone.Model.extend({
        defaults: {
            status: '', // submitting, submitted
            error: false
        }
    });

    //#endregion

    // VIEWS

    //#region BaseView

    var BaseView = function (options) {

        this.parent = null;
        this.children = [];
        Backbone.View.apply(this, [options]);
    };

    _.extend(BaseView.prototype, Backbone.View.prototype, {

        errorTemplate: _.template($('#error').html()),

        loaderClass: 'flex-loader',

        renderState: function (state) {
            if (state.get('error')) {
                $(this.el).html(this.errorTemplate({ error: state.get('error') }));
                return true;
            }

            if (!state.get('ready')) {
                this.renderLoader(this.el);
                return true;
            }

            return false;
        },

        renderLoader: function (container) {
            var div = document.createElement('div');
            div.className = this.loaderClass;
            $(container).empty().append(div);
        },

        addChildren: function (arg) {
            var children, that = this;

            if (_.isArray(arg)) {
                children = arg;
            } else {
                children = _.toArray(arguments);
            }

            _.each(children, function (child) {
                that.children.push(child);
                child.parent = that;
            });

            if (children.length === 1)
                return children[0];
            else
                return children;
        },

        disposeChildren: function (arg) {
            if (!arg)
                return;

            var that = this;
            var children = _.isArray(arg) ? arg : _.toArray(arguments);

            _.each(children, function (child) {
                child.dispose();
            });
        },

        disposeAllChildren: function () {
            // clone first because child is going to reach up into parent (this) and call _removeChild()
            var clonedChildren = this.children.slice(0);
            _.each(clonedChildren, function (child) {
                child.dispose();
            });
        },

        dispose: function () {
            this.disposeAllChildren();
            this.remove();
            this._removeFromParent();
        },

        _removeFromParent: function () {
            if (this.parent) this.parent._removeChild(this);
        },

        _removeChild: function (child) {
            var index = _.indexOf(this.children, child);
            if (index !== -1)
                this.children.splice(index, 1);
        }
    });

    BaseView.extend = Backbone.View.extend;

    //#endregion

    //#region BaseFormView

    var BaseFormView = function (options) {
        BaseView.apply(this, [options]);

        _.bindAll(this, 'onSaveSuccess');

        this.listenTo(this.model, 'error', this.onError, this);
        this.listenTo(this.model, 'validation-error', this.onValidationError, this);

        if (this.model.state)
            this.listenTo(this.model.state, 'change', this.render);

        if (options.countries) {
            this._currentProvinces = null;
            this.listenTo(options.countries.state, 'change', this.render);
        }
    };

    _.extend(BaseFormView.prototype, BaseView.prototype, {

        _validatable: false,

        events: {
            'submit': 'onSubmit',
            'keyup input,textarea': 'onKeyup',
            'change select,input': 'onChange', // bug input[type=checkbox] doesn't work.  needs debugging
            'validate': 'validateIfReady'
        },

        onCancelClick: function () {
            // by default do nothing
        },

        onSaveSuccess: function (model, response) {
            // by default do nothing
        },

        onError: function (model, error) {
            this.onValidationError(model, error);
        },

        onValidationError: function (model, errors) {

            var $summary = this.$('[data-element="alert_danger_server"]');

            $summary.html('');
            for (var i = errors.length; i--;) {
                var error = errors[i];

                if (_.isString(error)) {
                    $summary.html(error).show();
                } else {
                    this.$('input[name=' + error.attr + '],textarea[name=' + error.attr + '],select[name=' + error.attr + ']')
                        .each(function () {
                            if (this.tagName === 'SELECT')
                                $(this).siblings('.select2-container').addClass('error');
                            else
                                $(this).addClass('error');
                        })
                        .closest('.form-group')
                        .find('.form-error')
                        .html(error.message) // error.message will already be encoded.
                        .show();
                }
            }

            this.onSaveError();
        },

        errorOnSubmit: function () {
        },

        onSubmit: function (e) {

            e.preventDefault();
            this._validatable = true;

            this.mapToModel();
            if (this.isValid())
                this.save();
            else
                this.errorOnSubmit();
        },

        mapToModel: function () {
            var attrs = {};
            var serialized = this.$('form').serializeArray();
            for (var i = 0, l = serialized.length; i < l; i++) {

                // this bit of code is complicated.
                // if provinces are being fetched, any provinceId that was set on the model hasn't had the chance to get reflected
                // in our drop-down and so the value is '', so do not map that back.
                if (serialized[i].name === 'provinceId') {
                    var countryId = this.$('select[name=countryId]').val();
                    if (countryId) {
                        var country = this.options.countries.get(countryId);
                        if (country) {
                            var provinces = country.provinceCache.getProvinces();
                            if (!provinces.state.get('ready'))
                                continue;
                        }
                    }
                }

                attrs[serialized[i].name] = serialized[i].value;
            }

            this.formPreProcess(attrs);
            this.model.set(attrs);
        },

        isValid: function () {
            this.$('.error').removeClass('error');
            this.$('[data-element="alert_danger_server"]').hide();
            this.$('.form-error').hide();
            return this.model.isValid();
        },

        formPreProcess: function (attrs) {
        },

        onKeyup: function (e) {
            if (e.which === 13)
                return;

            this.mapToModel();
            this.validateIfReady();
        },

        onChange: function (e) {
            var $target = $(e.currentTarget);
            if ($target.attr('name') === 'countryId')
                this.onCountryChange();

            this.mapToModel();
            this.validateIfReady();
        },

        validateIfReady: function () {
            if (this._validatable)
                this.isValid();
        },

        onCountryChange: function () {
            var countryId = this.$('select[name=countryId]').val();

            if (countryId) {

                var country = this.options.countries.get(countryId);

                var provinces = country.provinceCache.getProvinces();
                this._currentProvinces = provinces;

                if (!provinces.state.get('ready')) {
                    this.$('select[name=provinceId]')
                        .closest('[data-element="province_input_section"]')
                            .append('<div data-element="loader" class="flex-relative"><span class="flex-loader-mini"></span></div>')
                        .find('.select2-container')
                            .hide();

                    this.listenTo(provinces.state, 'change', this.renderProvinces); // memory leak? do we need to unbind? also correct in console.js
                    return;
                }

                this.renderProvinces(provinces.state);
            }
        },

        renderProvinces: function (provincesState) {

            if (this._currentProvinces.state !== provincesState)
                return;

            var that = this;
            var $provinceId = this.$('select[name=provinceId]');

            $provinceId
                .closest('[data-element="province_input_section"]')
                    .find('[data-element="loader"]')
                    .remove()
                .end()
                    .find('.select2-container')
                    .show();

            if (provincesState.get('error')) {
                JOBCENTRE.alertFloater.show({
                    summary: provincesState.get('error'),
                    isError: true,
                    duration: 5000
                });
                return;
            }

            if (!provincesState.get('ready')) {
                throw new Error('Provinces not ready.');
            }

            var output = [];
            output.push('<option value=""></option>');
            this._currentProvinces.each(function (province) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    province.id,
                    that.model.get('provinceId') == province.id ? ' selected="selected"' : '',
                    province.get('name')
                ));
            });
            $provinceId.html(output.join('')).trigger('change');
        },

        renderCountries: function () {

            var that = this,
                output = [];

            output.push('<option value=""></option>');
            this.options.countries.each(function (country) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    country.id,
                    that.model.get('countryId') == country.id ? ' selected="selected"' : '',
                    country.get('name')
                ));
            });
            this.$('select[name=countryId]').html(output.join('')).change();
        },

        bindSelect2: function () {
            var that = this;
            var execute = function () {
                // select2 will destroy any existing select2 component if it's already been created.
                that.$('select').select2();
            };

            if (!$.contains(document.documentElement, this.el)) {

                // we need to setTimeout (or setImmediate) and let the DOM update in order for chosen plugin to work.
                setTimeout(execute, 10);
            } else {
                execute();
            }
        }
    });

    BaseFormView.extend = BaseView.extend;

    //#endregion

    //#region PageView

    var PageView = BaseView.extend({

        template: _.template($('#page').html()),

        render: function () {
            this.$el.html(this.template());

            var messageView = new MessageView({
                application: this.options.application,
                applicationForm: this.options.form,
                job: this.options.job
            });
            this.$('[data-outlet="application"]').append(messageView.render().el);
            
            var wrapperView = new FormsWrapperView({
                form: this.options.form,
                application: this.options.application,
                resume: this.options.resume,
                countries: this.options.countries
            });
            this.$('[data-outlet="application"]').append(wrapperView.render().el);

            return this;
        }
    });

    //#region MessageView

    var MessageView = BaseView.extend({

        template: _.template($('#message').html()),
        submittedTemplate: _.template($('#message_submitted').html()),
        submittingTemplate: _.template($('#message_submitting').html()),

        initialize: function (options) {
            this.listenTo(options.application, 'change', this.onChange);
        },

        events: {
            'click [data-action=joblist]': 'onJoblistClick'
        },

        onJoblistClick: function () {
            navigate('jobs-clear', true);
        },

        onChange: function () {
            if (!this.options.application.get('status')) {
                this.$el.hide();
                return;
            }

            if (this.options.application.get('status') === 'submitting') {
                this.$('[data-outlet="message"]').html(this.submittingTemplate());
                this.$el.show();

                var fixedHeaderHeight = $('[data-header]').css('position') === 'fixed' ? ($('[data-header]').height() || 0) : 0;
                $('html,body').scrollTop(this.$el.offset().top - fixedHeaderHeight); // need HTML selector for IE
                return;
            }

            if (this.options.application.get('status') === 'submitted') {
                this.$('[data-outlet="message"]').html(this.submittedTemplate(this.options.applicationForm.toJSON()));
                this.$el.show();

                if (window.dataLayer)
                    dataLayer.push({ 'event': 'custom', 'eventCategory': 'App', 'eventAction': 'JobApplication', 'eventLabel': undefined, 'nonInteraction': false });

                var callToActionView = this.addChildren(new CallToActionView({
                    form: this.options.applicationForm,
                    job: this.options.job
                }));
                this.$('[data-outlet="cta"]').append(callToActionView.render().el);

                return;
            }
        },

        render: function () {
            this.$el.html(this.template()).hide();
            return this;
        }
    });

    //#region CallToActionView

    var CallToActionView = BaseView.extend({

        renderSignup: function () {
            this.disposeAllChildren();
            var signupView = this.addChildren(new CallToActionSignupView({
                form: this.options.form
            }));
            this.$el.append(signupView.render().el);
        },

        renderPublishProfile: function () {
            this.disposeAllChildren();
            var publisProfileView = this.addChildren(new CallToActionPublishProfileView());
            this.$el.append(publisProfileView.render().el);
        },

        render: function () {
            if (onApplyCallToAction === 'signup')
                this.renderSignup(false);
            else if (onApplyCallToAction === 'publish_profile')
                this.renderPublishProfile();

            return this;
        }
    });

    //#region CallToActionSignupView

    var CallToActionSignupView = BaseView.extend({

        template: _.template($('#call_to_action_signup').html()),

        renderRecommendations: function () {
            var html = $('#call_to_action_recommendations');
            if(!html.length)
                return;

            this.$('[data-outlet="recommendations"]').html(
                _.template(html.html())()
            );
        },

        render: function () {
            this.$el.html(this.template({
                form: this.options.form.toJSON()
            }));
            this.renderRecommendations();
            this.$('[data-element="signup_modal"]').modal();
            return this;
        }
    });

    //#endregion

    //#region CallToActionPublishProfileView

    var CallToActionPublishProfileView = BaseView.extend({

        template: _.template($('#call_to_action_publish_profile').html()),

        render: function () {
            this.$el.html(this.template());
            return this;
        }
    });

    //#endregion

    //#endregion

    //#endregion

    //#region FormsWrapperView

    var FormsWrapperView = BaseView.extend({

        template: _.template($('#forms_wrapper').html()),

        className: 'clearfix',

        initialize: function (options) {
            this.listenTo(options.application, 'change:status', this.onChange);
            this.listenTo(options.application, 'change:error', this.onError);
        },

        onChange: function () {
            if (this.options.application.get('status'))
                this.$el.hide();
            else
                this.$el.show();
        },

        onError: function (application, error) {
            if (!error)
                return;

            // scroll window
            var $topError = this.$('[data-element="error_message"]:visible,.form-error:visible').first();
            if ($topError.length > 0) {

                var fixedHeaderHeight = $('[data-header]').css('position') === 'fixed' ? ($('[data-header]').height() || 0) : 0;
                if (($('html').scrollTop() || $('body').scrollTop()) > ($topError.offset().top - fixedHeaderHeight)) { // need HTML selector for IE

                    $('html,body').animate({
                        scrollTop: $topError.parent().offset().top - fixedHeaderHeight
                    }, 500);
                }
            }

            this.options.application.set({ error: false });
        },

        render: function () {

            this.$el.html(this.template());

            var resumeView = this.addChildren(new ResumeView({
                model: this.options.resume,
                form: this.options.form
            }));
            this.$el.append(resumeView.render().el);

            var formView = this.addChildren(new ApplicationFormView({
                model: this.options.form,
                resume: this.options.resume,
                application: this.options.application,
                countries: this.options.countries
            }));
            this.$el.append(formView.render().el);

            return this;
        }
    });

    //#region ResumeView

    var ResumeView = BaseView.extend({

        template: _.template($('#resume').html()),
        uploadingTemplate: _.template($('#resume_uploading').html()),
        progressTemplate: _.template($('#resume_progress').html()),
        tokenTemplate: _.template($('#resume_token').html()),
        errorTemplate: _.template($('#resume_error').html()),

        initialize: function () {
            this.resumeUploadView = null;

            this.listenTo(this.model, 'change:state', this.onStateChange);
            this.listenTo(this.model, 'change:progress', this.onProgressChange);
            this.listenTo(this.model, 'change:token', this.updateResult);
        },

        events: {
            'click [data-action]': 'onActionClick'
        },

        onActionClick: function (e) {
            switch ($(e.currentTarget).data('action')) {
                case 'remove_resume':
                    this.model.removeResume();
                    break;
                default:
                    throw new Error();
            }
        },

        renderButton: function () {
            this.renderUploadButton();

            this.$('[data-outlet="file_uploaders"]')
                .append(this.addChildren(new DropboxUploadView({ model: this.model, form: this.options.form })).render().el)
                .append(this.addChildren(new LinkedInUploadView({ model: this.model, form: this.options.form })).render().el);

            this.onStateChange(this.model, this.model.get('state'));
        },

        onSubmitResume: function () {
            this.$('form').submit();
        },

        showButton: function () {
            this.$('[data-element="upload_title"]').show();
            this.$('[data-outlet="file_uploaders"]').show();
            this.disposeChildren(this.resumeUploadView);
            this.renderUploadButton();
        },

        renderUploadButton: function () {
            this.resumeUploadView = this.addChildren(ResumeUploadView.create({ model: this.model, form: this.options.form }));
            this.resumeUploadView.on('submit-resume', this.onSubmitResume, this);
            this.$('[data-outlet="file_uploaders"]').prepend(this.resumeUploadView.render().el);
        },

        hideButton: function () {
            this.$('[data-outlet="file_uploaders"]').hide();
            this.$('[data-element="upload_title"]').hide();
        },

        onStateChange: function (resume, state) {

            switch (state) {
                case '':
                    break;
                case 'idle':
                    this.showButton();
                    break;
                case 'uploading':
                    this.$('[data-element="error_message"]').html('').hide();
                    this.$('[data-element="upload_progress"]').html(this.uploadingTemplate(this.model.toJSON())).show();
                    this.hideButton();
                    return;
                case 'uploaded':
                    this.$('[data-element="error_message"]').html('').hide();
                    this.$('[data-element="upload_progress"]').html('').hide();
                    this.hideButton();
                    return;
                case 'error':
                    this.$('[data-element="error_message"]').html(this.errorTemplate(this.model.toJSON())).show();
                    this.$('[data-element="upload_progress"]').html('').hide();
                    this.showButton();
                    break;
                default:
                    throw new Error(String.format('State {0} not supported.', state));
            }

        },

        onProgressChange: function (resume, progress) {
            if (progress)
                this.$('[data-element="upload_progress"]').html(this.progressTemplate(this.model.toJSON())).show();
        },

        updateResult: function () {
            if (this.model.get('token'))
                this.$('[data-element="upload_result"]').html(this.tokenTemplate(this.model.toJSON())).show();
            else
                this.$('[data-element="upload_result"]').html('').hide();
        },

        render: function () {
            this.$el.html(this.template(this.model));
            this.renderButton();
            this.updateResult();
            return this;
        }

    });

    //#region UploadView

    var UploadView = BaseView.extend({

        validate: function (fileSize, fileName) {
            if (fileSize > 1 * 1024 * 1024)
                return 'File exceeds 1 MB.';

            var extension = _.last(fileName.split('.')).toLowerCase();
            switch (extension) {
                case 'docx':
                case 'doc':
                case 'rtf':
                case 'pdf':
                case 'txt':
                    break;
                default:
                    return 'Only Word, Plain Text, PDF, RTF file types allowed.';
            }
        },

        processResponse: function(response) {
            this.model.setResume(response.file.token, response.file.name);
            this.fillForm(response.form);
            this.setSource();
        },

        fillForm: function (formData) {
            if (!formData)
                return;

            var attrs = {};

            this.fillFormField(attrs, formData, 'firstName');
            this.fillFormField(attrs, formData, 'lastName');
            this.fillFormField(attrs, formData, 'email');
            this.fillFormField(attrs, formData, 'city');
            this.fillFormField(attrs, formData, 'phone');

            this.fillFormFieldObject(attrs, formData, 'countryId', ['country', 'id']);
            this.fillFormFieldObject(attrs, formData, 'provinceId', ['province', 'id']);

            this.options.form.set(attrs, { updateForm: true });
        },

        fillFormField: function(attrs, formData, name) {
            if (formData[name] && !this.options.form.get(name))
                attrs[name] = formData[name];
        },

        fillFormFieldObject: function (attrs, formData, name, formPaths) {
            if (this.options.form.get(name))
                return;

            attrs[name] = this.findValue(formData, formPaths);
        },

        findValue: function(obj, paths) {
            var path = paths.shift();
            if (!path)
                return obj;

            if (!obj[path])
                return null;

            return this.findValue(obj[path], paths);
        },

        setSource: function () {
            this.options.form.set('resumeSource', this.source);
        }

    });

    //#region ResumeUploadView

    var ResumeUploadView = UploadView.extend({

        source: null,

        template: _.template($('#resume_upload').html()),

        events: {
            'change [data-element="file_input"]': 'initializeUpload'
        },

        initializeUpload: function () {
            // note: as of jQuery 1.9, input[type=file] change events stopped bubbling in FF 3.6.  It does, however, still work in FF 18+.
            // Don't know exactly what version below 18 this affects, but the overall impact is very low (~0.5% of users?).
            this.model.setUploading();
            this.uploadResume();
        },

        render: function () {

            this.$el.html(this.template(this.model));
            return this;
        }

    }, {
        create: function (options) {
            if (window.FormData)
                return new XhrResumeUploadView(options);
            else
                return new IframeResumeUploadView(options);
        }
    });

    //#region XhrResumeUploadView

    var XhrResumeUploadView = ResumeUploadView.extend({

        uploadResume: function () {

            var file = this.$('[data-element="file_input"]')[0].files[0];
            if (!file) {
                this.model.setError('File could not be selected.');
                return;
            }

            if (this.validate(file.size, file.name)) {
                this.model.setError(this.validate(file.size, file.name));
                return;
            }

            this.model.set({ fileName: file.name });
            this.model.setFileSize(file.size);
            this.model.send(file, {
                progress: _.bind(this.progress, this),
                load: _.bind(this.load, this),
                error: _.bind(this.error, this),
                abort: _.bind(this.abort, this)
            });
        },

        progress: function (e) {
            if (!e.lengthComputable)
                return;

            var percent = Math.round(e.loaded * 100 / e.total);
            this.model.set({ progress: percent });
        },

        load: function (e) {
            // it's possible that the response isn't json
            try {
                var response = JSON.parse(e.target.responseText);
                if (e.target.status !== 200) {
                    this.model.setError(response.message);
                    return;
                }
                this.processResponse(response);
            } catch (ex) {
                this.model.setError('Upload failed.');
            }
        },

        error: function () {
            this.model.setError('Upload failed.');
        },

        abort: function () {
            this.model.setError('Upload cancelled.');
        }
    });

    //#endregion

    //#region IframeResumeUploadView

    var IframeResumeUploadView = ResumeUploadView.extend({

        uploadResume: function () {

            // assign uploadComplete and onload here so that we don't run into any back button issues

            window.uploadComplete = _.bind(this.load, this); // memory leak. TODO: remove reference in dispose

            // doesn't work in IE 6/7/8
            document.getElementById("resume_upload_target").onload = _.bind(this.load, this);

            this.trigger('submit-resume');
        },

        load: function (e, response) {

            if (!response) {
                try {
                    //resume_upload_target is name (not id) of iframe
                    response = window.frames['resume_upload_target'].document.getElementsByTagName("body")[0].innerHTML;
                    response = JSON.parse(response);
                } catch (e) {
                    this.model.setError('Upload failed.');
                    return;
                }
            }
            if (response.success) {
                this.processResponse(response.data);
            } else {
                this.model.setError(response.data.message);
            }
        }

    });

    //#endregion

    //#endregion

    //#region DropboxUploadView

    var DropboxUploadView = UploadView.extend({

        source: 'Dropbox',

        template: _.template($('#dropbox_upload').html()),

        events: {
            'click a': 'onClick'
        },

        onClick: function (e) {
            var that = this;

            e.preventDefault();
            Dropbox.choose({
                linkType: 'direct',
                success: function (files) {
                    if (files.length < 1) {
                        that.model.setError('File could not be selected.');
                        return;
                    }

                    if (that.validate(files[0].bytes, files[0].name)) {
                        that.model.setError(that.validate(files[0].bytes, files[0].name));
                        return;
                    }

                    that.model.setUploading();
                    that.model.set({ fileName: files[0].name });
                    that.model.setFileSize(files[0].bytes);
                    that.model.fetch('Dropbox', files[0].link, null, {
                        success: _.bind(that.success, that),
                        error: _.bind(that.error, that)
                    });
                },
                cancel: function () {
                }
            });
        },

        success: function (resume, response) {
            this.processResponse(response);
        },

        error: function (resume, message) {
            this.model.setError(message);
        },

        onScriptLoaded: function () {
            if (Dropbox.isBrowserSupported())
                this.$el.html(this.template(this.model));
        },

        render: function () {

            JOBCENTRE.lazyLoad.js(
                'https://www.dropbox.com/static/api/1/dropins.js',
                _.bind(this.onScriptLoaded, this),
                {
                    id: 'dropboxjs',
                    'data-app-key': dropboxAppKey
                }
            );

            return this;
        }

    });

    //#endregion

    //#region LinkedInUploadView

    var LinkedInUploadView = UploadView.extend({

        source: 'LinkedIn',

        template: _.template($('#linkedin_upload').html()),

        events: {
            'click a': 'onClick'
        },

        onClick: function (e) {
            e.preventDefault();

            var that = this;
            var callback = 'linkedInAuthorizationCallback' + new Date().getTime();
            window[callback] = function (json) {

                var response = JSON.parse(json);

                try {
                    delete window[callback]; // IE throws an exception
                } catch (e) {
                    window[callback] = undefined;
                }

                // response:
                // {
                //     sucess: true,
                //     data: {token:'',name:''}
                // };
                // OR
                // {
                //     sucess: false,
                //     error: 'Error message.'
                // };

                if (response.success)
                    that.success(response.data);
                else
                    that.error(response.error);
            };

            window.open(
                url.linkedInAuthorization
                    .replace(':callback', callback),
                new Date().getTime(),
                'height=600,width=800,resizable=yes,scrollbars=yes,toolbar=no,menubar=no'
            );

        },

        success: function (response) {
            this.processResponse(response);
        },

        error: function (message) {
            this.model.setError(message);
        },

        render: function () {
            this.$el.html(this.template(this.model));
            return this;
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#region ApplicationFormView

    var ApplicationFormView = BaseFormView.extend({

        template: _.template($('#application_form').html()),
        
        className: 'apply-form flex-relative',

        initialize: function (options) {
            this.submitPendingResume = false;
            this.listenTo(options.resume, 'change:token', this.onTokenChange);
            this.listenTo(options.resume, 'change:state', this.onResumeStateChange);
            this.listenTo(this.model, 'change', this.onModelChange);
        },

        onTokenChange: function () {
            this.trigger('validate');
        },

        onResumeStateChange: function (resume, status) {

            if (this.submitPendingResume) {
                this.submitPendingResume = true;
                this.$('button').show();
                this.$('[data-element="waiting_for_upload"]').hide();

                if (status === 'uploaded')
                    this.$('form').submit();
            }

        },

        onSubmit: function (e) {

            if (!this.options.resume.isUploaded()) {

                e.preventDefault();

                if (this.options.resume.isUploading()) {
                    this.$('button').hide();
                    this.$('[data-element="waiting_for_upload"]').show();
                    this.submitPendingResume = true;
                } else {
                    this.options.resume.setError('Resume is required.');
                    this.errorOnSubmit();
                }

                return;
            }

            BaseFormView.prototype.onSubmit.call(this, e);
        },

        onSaveSuccess: function () {
            this.options.application.set({ status: 'submitted' });
        },

        onSaveError: function () {
            this.options.application.set({ status: '' });
        },

        errorOnSubmit: function () {
            this.options.application.set({ error: true });
        },

        save: function () {

            this.options.application.set({ status: 'submitting' });
            this.model.save({
                success: _.bind(this.onSaveSuccess, this)
            });
        },

        formPreProcess: function (attrs) {
            attrs.resumeToken = this.options.resume.get('token');
        },

        onModelChange: function (model, options) {

            if (!options.updateForm)
                return;

            var that = this;
            var selectHasChanged = false;

            // filtering out input elements without name attribute because Select2 creates input elements without name attribute.
            this.$('input[name],select[name]').each(function () {
                var attr = $(this).attr('name');
                if ($(this).val() != that.model.get(attr)) {
                    $(this).val(that.model.get(attr));
                    
                    if (this.tagName === 'SELECT')
                        selectHasChanged = true;
                }
            });

            // this is required for select2 to grab element value (which is hidden)
            // and reflect it in its own dropdown rendering
            if (selectHasChanged)
                this.$('select[name]').trigger('change');
        },

        render: function () {

            if (this.renderState(this.options.countries.state))
                return this;

            this.$el.html(this.template({
                form: this.model
            }));
            this.renderCountries();
            this.bindSelect2();
            return this;
        }
    });

    //#endregion

    //#endregion

    //#endregion

    return {
        init: function (options) {

            dropboxAppKey = options.dropboxAppKey;

            eid = options.eid;
            siteProvinceCode = options.site.provinceCode;
            onApplyCallToAction = options.onApplyCallToAction;

            var countryCache = new CountryCache();

            var pageView = new PageView({
                application: new Application(),
                form: new ApplicationForm(options.form),
                resume: new Resume(options.resume),
                countries: countryCache.getCountries(),
                job: options.job
            });
            $('[data-outlet="page"]').append(pageView.render().el);

        }
    }
    
}(jQuery));