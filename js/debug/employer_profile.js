var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.employerProfile = (function ($) {

    var dropboxAppKey;

    //#region url

    var url = function(restPath) {
        url = {
            employers: restPath + 'employers/:id',

            images: restPath + 'files',
            formImage: restPath + 'files/form',
            fetchImage: restPath + 'files/fetch',

            // generic
            industries: restPath + 'industries',
            companySizes: restPath + 'companysizes'
        };
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

    //#region Industry

    var Industry = Backbone.Model.extend({
    });

    var Industries = Backbone.Collection.extend({
        model: Industry,

        initialize: function () {
            this.state = new State();
        }
    });

    var IndustryCache = Cache.extend({

        collection: Industries,
        listName: 'industry',
        url: function() {
            return url.industries;
        },

        getIndustries: function () {
            return this.getList();
        }
    });

    //#endregion

    //#region CompanySize

    var CompanySize = Backbone.Model.extend({
    });

    var CompanySizes = Backbone.Collection.extend({
        model: CompanySize,

        initialize: function () {
            this.state = new State();
        }
    });

    var CompanySizeCache = Cache.extend({

        collection: CompanySizes,
        listName: 'company size',
        url: function () {
            return url.companySizes;
        },

        getCompanySizes: function () {
            return this.getList();
        }
    });

    //#endregion

    //#region File

    var File = BaseModel.extend({

        defaults: {
            state: 'idle', // idle, error, uploading, uploaded
            fileName: '',
            fileSize: 0,
            token: null,
            progress: 0,
            error: null
        },

        setError: function (message) {
            this.set({ state: 'error', error: message });
        },

        setUploading: function (message) {
            this.set({ state: 'uploading' });
        },

        setFile: function (token, fileName) {
            this.set({ state: 'uploaded', token: token, fileName: fileName });
        },

        setIdle: function (token, fileName) {
            this.set({
                state: 'idle',
                fileName: '',
                fileSize: 0,
                token: null,
                progress: 0,
                error: null
            });
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

        sendUrl: null,
        sendName: null,
        fetchUrl: null,

        send: function (file, callbacks) {
            var fd = new FormData();
            fd.append(this.sendName, file);
            var xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', callbacks.progress, false);
            xhr.addEventListener('load', callbacks.load, false);
            xhr.addEventListener('error', callbacks.error, false);
            xhr.addEventListener('abort', callbacks.abort, false);
            xhr.open('POST', this.sendUrl());
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(fd);
        },

        fetch: function (source, link, accessToken, options) {

            options || (options = {});
            var that = this;

            $.ajax({
                url: this.fetchUrl(),
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
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        var response = JSON.parse(jqXHR.responseText);

                        if (options.error) {
                            options.error(that, response.message);
                            return;
                        }
                    }

                    if (options.error)
                        options.error(that, 'Error connecting to the server.')
                }
            });
        }

    });

    var ImageFile = File.extend({
        maxFileSize: 5,
        fileTypes: [
            'png', 'jpg'
        ],
        fileTypeMessage: 'Only PNG and JPG file types allowed.',
        sendUrl: function () {
            return url.images;
        },
        sendName: 'file',
        fetchUrl: function () {
            return url.fetchImage;
        },
        includeDropbox: true,
        includeLinkedIn: false,
        includeWeb: true
    });

    var ResumeFile = File.extend({
        maxFileSize: 1,
        fileTypes: [
            'docx', 'doc', 'rtf', 'pdf', 'txt'
        ],
        fileTypeMessage: 'Only Word, Plain Text, PDF, RTF file types allowed.',
        sendUrl: function () {
            return url.resumes;
        },
        sendName: 'file',
        fetchUrl: function () {
            return url.fetchResume;
        },
        includeDropbox: true,
        includeLinkedIn: true,
        includeWeb: false
    });

    //#endregion

	//#region Employer

    var Employer = BaseModel.extend({

    	initialize: function () {
    		this._loading = false;
    		this.state = new State();

    		this.logo = new LogoImage();
    		this.logo.employer = this;

    		this.bannerHeader = new BannerHeaderImage();
    		this.bannerHeader.employer = this;
    	},

    	url: function () {
    		return url.employers.replace(':id', this.id);
    	},

    	parse: function (resp, options) {

    	    this.logo.setImageUrl(resp.logoUrl);
    	    delete resp.logoUrl;

    	    this.bannerHeader.setImageUrl(resp.bannerHeaderUrl);
    	    delete resp.bannerHeaderUrl;

    	    return resp;
    	},

    	fetch: function (options) {
    		options || (options = {});

    		var that = this;

    		if (this._loading)
    			return;

    		this.state.set({ ready: false, error: null });

    		this._loading = true;

    		$.ajax({
    			url: this.url(),
    			dataType: 'json',
    			cache: false,
    			type: 'GET',
    			success: function (response, textStatus, jqXHR) {

    				that.set(that.parse(response));

    				that.state.set({ ready: true, error: null });
    				if (options.success) options.success(that, response);
    			},
    			error: function (jqXHR, textStatus, errorThrown) {

    				var error = jqXHR.status === 400
                                    ? JSON.parse(jqXHR.responseText).message
                                    : 'Error retrieving profile.';

    				that.state.set({ error: error });

    				if (options.error)
    					options.error(that, error);
    			},
    			complete: function (jqXHR, textStatus) {
    				that._loading = false;
    			}
    		});
    	},

    	save: function (attrs, options) {
    		options || (options = {});
    		var that = this;

    		$.ajax({
    			url: this.url(),
    			contentType: 'application/json',
    			data: JSON.stringify(attrs),
    			dataType: 'json',
    			type: 'PUT',
    			success: function (response, textStatus, jqXHR) {

    			    delete response.logoUrl;
    			    delete response.bannerHeaderUrl;

    				that.set(response);

    				if (options.success)
    					options.success(that, response);
    			},
    			error: function (jqXHR, textStatus, errorThrown) {
    				if (jqXHR.status === 400) {
    					var response = JSON.parse(jqXHR.responseText);

    					if (options.error) {
    						options.error(that, response.message);
    						return;
    					}
    				}

    				if (options.error)
    					options.error(that, 'Error connecting to the server.')
    			}
    		});
    	}

    });

    //#region Image

    // using BaseImage instead of Image b/c Image is a native Dom object.
    var BaseImage = BaseModel.extend({

        defaults: {
            imageUrl: null
        },

        initialize: function () {
            this.file = new ImageFile();
        },

        url: function () {
            return url.employers.replace(':id', this.employer.id);
        },

        setImageUrl: function (url) {
            this.set({
                imageUrl: new ImageUrl({
                    url: url,
                    previous: this.get('imageUrl')
                })
            })
        },

        replace: function (options) {
            this.save(JSON.stringify(this.tokenPayload(this.file.get('token'))), options);
        },

        'delete': function (options) {
            this.save(JSON.stringify(this.urlPayload('')), options);
        },

        save: function (data, options) {
            options || (options = {});
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                data: data,
                dataType: 'json',
                type: 'PUT',
                success: function (response, textStatus, jqXHR) {
                    that.setImageUrl(response[that.urlName]);

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        var response = JSON.parse(jqXHR.responseText);

                        if (options.error) {
                            options.error(that, response.message);
                            return;
                        }
                    }

                    if (options.error)
                        options.error(that, 'Error connecting to the server.')
                }
            });
        },

        undo: function (options) {
            options || (options = {});
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                data: JSON.stringify(this.urlPayload(this.get('imageUrl').get('previous').get('url'))),
                dataType: 'json',
                type: 'PUT',
                success: function (response, textStatus, jqXHR) {
                    that.set({
                        imageUrl: that.get('imageUrl').get('previous')
                    });

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        var response = JSON.parse(jqXHR.responseText);

                        if (options.error) {
                            options.error(that, response.message);
                            return;
                        }
                    }

                    if (options.error)
                        options.error(that, 'Error connecting to the server.')
                }
            });
            
        }

    });

    var LogoImage = BaseImage.extend({

        urlName: 'logoUrl',

        tokenPayload: function(token) {
            return {
                logoToken: token
            };
        },

        urlPayload: function(url) {
            return {
                logoUrl: url
            };
        }

    });

    var BannerHeaderImage = BaseImage.extend({

        urlName: 'bannerHeaderUrl',

        tokenPayload: function(token) {
            return {
                bannerHeaderToken: token
            };
        },

        urlPayload: function (url) {
            return {
                bannerHeaderUrl: url
            };
        }

    });

    //#endregion

    //#region ImageUrl

    var ImageUrl = Backbone.Model.extend({
    });

    //#endregion

	//#endregion

    //#region YouTube

    var YouTube = Backbone.Model.extend({

        defaults: {
            data: null,
            error: null
        },

        setUrl: function (url, thumb) {

            if (this.get('data') && url === this.get('data').get('url'))
                return;

            this.set('error', null);
            var data = new YouTubeData(
                { url: url, thumb: thumb },
                { previous: this.get('data') }
            );

            if (data.get('error'))
                this.set('error', data.get('error'));
            else {

                if (this.get('data'))
                    this.get('data').off('change:error', this.onDataError);

                this.set({ data: data });
                this.get('data').on('change:error', this.onDataError, this);
            }
        },

        onDataError: function (data, error) {
            this.set('error', error);
        },

        removeUrl: function () {
            if (this.get('data'))
                this.set('data', this.get('data').previous);
        }

    });

    var YouTubeData = Backbone.Model.extend({

        defaults: {
            url: null,
            thumb: null,
            error: null
        },

        initialize: function (attributes, options) {
            this.previous = options.previous;
            this.setVideoId();
            if (this.id && !this.get('thumb'))
                this.set('thumb', this.getThumb());
        },

        setVideoId: function () {
            if (!this.get('url'))
                return;

            var match = this.get('url').match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?.*v=)([^#\&\?]*).*/);
            if (match && match[1].length == 11) {
                this.set('id', match[1]);
            } else
                this.set('error', 'Invalid URL.');
        },

        getThumb: function () {
            // http://stackoverflow.com/a/2068371/188740
            return 'https://img.youtube.com/vi/' + this.id + '/mqdefault.jpg';
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

        errorTemplate: _.template($('#profile_error').html()),

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

        savingStateOutlet: null,

        hideSavingState: function () {
            (this.savingStateOutlet ? this.$(this.savingStateOutlet) : this.$el).children()
                .removeClass('invisible')
                    .end()
                    .find('.flex-loader-mini')
                    .remove();
        },

        showSavingState: function () {
            (this.savingStateOutlet ? this.$(this.savingStateOutlet) : this.$el).children()
                .addClass('invisible')
                    .end()
                    .prepend('<div class="flex-loader-mini"></div>');
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
        },

        onSaveError: function (model, message) {
            this.hideSavingState();
            this.$('[data-element=alert_danger_server]').text(message).show();
        },

        onValidationError: function (model, errors) {

            var $summary = this.$('[data-element=alert_danger_server]');

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

        onSubmit: function (e) {

            e.preventDefault();
            this._validatable = true;

            var attrs = this.getFormValues();

            if (this.isValid(attrs))
            	this.save(attrs);
        },

        save: function (attrs) {
        	this.showSavingState();
        	this.model.save(attrs, {
        		success: _.bind(this.onSaveSuccess, this),
				error: _.bind(this.onSaveError, this)
        	});
        },

        getFormValues: function () {
        	var that = this;

        	var attrs = {};
        	this.$('input,textarea,select').each(function () {
        		// check for name to protect us against chosen plugin adding input elements in our form.
        		if (this.name && !this.disabled) {
        			if (this.type === 'radio' && !this.checked)
        				return;

        			if (this.type === 'checkbox' && !this.checked)
        				return;

        			// use jQuery.val() because this.value doesn't properly handle multiple selects
        			attrs[this.name] =
                        attrs[this.name]
                        ? attrs[this.name] + ',' + $(this).val()
                        : $(this).val();
        		}
        	});

        	this.formPreProcess(attrs);
        	return attrs;
        },

        isValid: function (attrs) {
            this.$('.error').removeClass('error');
            this.$('[data-element="alert_danger_server"]').hide();
            this.$('.form-error').hide();
            return this.model.isValid(attrs);
        },

        formPreProcess: function (attrs) {
        },

        onKeyup: function (e) {
            if (e.which === 13)
                return;

            this.validateIfReady();
        },

        onChange: function (e) {
            this.validateIfReady();
        },

        validateIfReady: function () {
            if (this._validatable)
            	this.isValid(this.getFormValues());
        },

        bindSelect2: function () {
            var that = this;
            var execute = function () {
                // select2 will destroy any existing select2 component if it's already been created.
                that.$('select').select2({
                    allowClear: true
                });
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

    //#region UploadView

    var UploadView = BaseView.extend({

        validate: function (fileSize, fileName) {
            if (fileSize > this.model.maxFileSize * 1024 * 1024)
                return String.format('File exceeds {0} MB.', this.model.maxFileSize);

            var extension = _.last(fileName.split('.')).toLowerCase();
            if (!_.contains(this.model.fileTypes, extension))
                return this.model.fileTypeMessage;
        }

    });

    //#region FileUploadView

    var FileUploadView = UploadView.extend({

        source: null,

        template: _.template($('#profile_file_upload').html()),

        events: {
            'change [data-element=file_input]': 'initializeUpload'
        },

        initializeUpload: function () {
            // note: as of jQuery 1.9, input[type=file] change events stopped bubbling in FF 3.6.  It does, however, still work in FF 18+.
            // Don't know exactly what version below 18 this affects, but the overall impact is very low (~0.5% of users?).
            this.model.setUploading();
            this.uploadFile();
        },

        render: function () {

            this.$el.html(this.template({ file: this.model, viewId: this.cid }));
            return this;
        }

    }, {
        create: function (options) {
            if (window.FormData)
                return new XhrFileUploadView(options);
            else
                return new IframeFileUploadView(options);
        }
    });

    //#region XhrFileUploadView

    var XhrFileUploadView = FileUploadView.extend({

        uploadFile: function () {

            var file = this.$('[data-element=file_input]')[0].files[0];
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
            var response = JSON.parse(e.target.responseText);
            if (e.target.status !== 200) {
                this.model.setError(response.message);
                return;
            }
            this.model.setFile(response.token, response.name);
        },

        error: function () {
            this.model.setError('Upload failed.');
        },

        abort: function () {
            this.model.setError('Upload cancelled.');
        }
    });

    //#endregion

    //#region IframeFileUploadView

    var IframeFileUploadView = FileUploadView.extend({

        uploadFile: function () {

            // assign uploadComplete and onload here so that we don't run into any back button issues

            window[this.options.callback] = _.bind(this.load, this); // memory leak. TODO: remove reference in dispose

            // doesn't work in IE 6/7/8
            document.getElementById(this.options.iframeId).onload = _.bind(this.load, this);

            this.trigger('submit-file');
        },

        load: function (e, response) {

            if (!response) {
                try {
                    //window.frames targets 'name' and not 'id' of iframe
                    response = window.frames[this.options.iframeId].document.getElementsByTagName("body")[0].innerHTML;
                    response = JSON.parse(response);
                } catch (e) {
                    this.model.setError('Upload failed.');
                    return;
                }
            }
            if (response.success) {
                this.model.setFile(response.data.token, response.data.name);
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

        template: _.template($('#profile_dropbox_upload').html()),

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

        success: function (file, response) {
            this.model.setFile(response.token, response.name);
        },

        error: function (file, message) {
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

    //#region WebUploadView

    var WebUploadView = UploadView.extend({

        source: 'Web',

        template: _.template($('#profile_web_upload').html()),

        events: {
            'submit form': 'onSubmit'
        },

        onSubmit: function (e) {
            e.preventDefault();

            if (!this.$('[name=web_upload]').val().trim())
                return;

            this.model.setUploading();
            this.model.fetch('Web', this.$('[name=web_upload]').val(), null, {
                success: _.bind(this.success, this),
                error: _.bind(this.error, this)
            });
        },

        success: function (file, response) {
            this.model.setFile(response.token, response.name);
        },

        error: function (file, message) {
            this.model.setError(message);
        },

        render: function () {
            this.$el.html(this.template(this.model));
            return this;
        }
    });

    //#endregion

    //#endregion

    //#region SectionView

    var SectionView = BaseView.extend({

        sectionHiddenTemplate: _.template($('#section_hidden').html()),

        className: 'flex-relative',

        initialize: function () {
            this.content = null;
        },

        onlyEditFormVisible: false,

        events: {
            'click [data-action=edit]': 'renderEdit',
            'click [data-action=cancel]': 'onCancelClick',
            'click [data-action=show]': 'show'
        },

        onCancelClick: function () {
            var that = this;
            if (this.model.isNew()) {
                this.model.collection.remove(this.model);
                this.$el.fadeOut('fast', function () {
                    that.dispose();
                });
            } else {
                this.renderDetails();
            }
        },

        show: function (e) {
            this.$('[data-action=show]').remove();
            if (this.onlyEditFormVisible)
                this.renderEdit();
            else
                this.renderDetails();
        },

        hide: function () {
            var that = this;

            this.$el.append(this.sectionHiddenTemplate());

            if (this.content)
                this.content.$el.slideUp('fast', function () {
                    that.disposeChildren(that.content);
                });
        },

        renderDetails: function () {
            if (this.onlyEditFormVisible) {
                this.hide();
                return;
            }

            var that = this;
            if (this.content) {
                this.content.$el.fadeOut('fast', function () {
                    that.disposeChildren(that.content);
                    that.content = that.addChildren(that.detailsView());
                    that.content.on('render-deleted', that.renderDeleted, that);
                    that.content.$el.hide();
                    that.$el.append(that.content.render().el);
                    that.content.$el.fadeIn('fast');
                });
            } else {
                this.content = this.addChildren(this.detailsView());
                this.content.on('render-deleted', that.renderDeleted, that);
                this.$el.append(this.content.render().el);
            }
        },

        renderEdit: function () {
            var that = this;
            if (this.content) {
                this.content.$el.fadeOut('fast', function () {
                    that.disposeChildren(that.content);
                    that.content = that.addChildren(that.editView());
                    that.content.on('render-details', that.renderDetails, that);
                    that.content.on('render-deleted', that.renderDeleted, that);
                    that.content.$el.hide();
                    that.$el.append(that.content.render().el);
                    that.content.$el.fadeIn('fast');
                });
            } else {
                this.content = this.addChildren(this.editView());
                this.content.on('render-details', this.renderDetails, that);
                this.content.on('render-deleted', that.renderDeleted, that);
                this.content.$el.hide();
                this.$el.append(this.content.render().el);
                this.content.$el.fadeIn('fast');
            }
        },

        renderDeleted: function () {
            var that = this;
            this.content.$el.fadeOut('fast', function () {
                that.disposeChildren(that.content);
                that.content = that.addChildren(that.removedView());
                that.content.on('render-details', that.renderDetails, that);
                that.content.$el.hide();
                that.$el.append(that.content.render().el);
                that.content.$el.fadeIn('fast');
            });
        },

        removedView: function () {
            throw new Error('Not Implemented.');
        },

        render: function () {
            if (this.onlyEditFormVisible)
                this.hide();
            else
                this.show();

            return this;
        }
    });

    //#endregion
    
    //#region PageView

    var PageView = BaseView.extend({

        sepratorTemplate: _.template($('#profile_section_separator').html()),

		initialize: function (options) {
			this.listenTo(this.model.state, 'change', this.render);
		},

		render: function () {

			if (this.renderState(this.model.state))
				return this;

			this.$el.empty();

			if (this.options.visibility.images) {
			    this.$el.append(
                    this.addChildren(
                        new ImagesView({
                            model: this.model,
                            visibility: this.options.visibility.images
                        })
                    )
                    .render().el
                );
			    if (this.options.visibility.sectionSeparator) this.$el.append(this.sepratorTemplate());
			}

			if (this.options.visibility.companyInfo) {
			    this.$el.append(
                    this.addChildren(
                        new CompanyInfoView({
                            model: this.model,
                            industries: this.options.industries,
                            companySizes: this.options.companySizes,
                            visibility: this.options.visibility.companyInfo
                        })
                    )
                    .render().el
                );
			    if (this.options.visibility.sectionSeparator) this.$el.append(this.sepratorTemplate());
            }

			if (this.options.visibility.youTubeVideo) {
			    this.$el.append(
                    this.addChildren(
                        new YouTubeVideoView({
                            model: this.model
                        })
                    )
                    .render().el
                );
			    if (this.options.visibility.sectionSeparator) this.$el.append(this.sepratorTemplate());
            }

			if (this.options.visibility.socialMedia) {
			    this.$el.append(
                    this.addChildren(
                        new SocialMediaView({
                            model: this.model
                        })
                    )
                    .render().el
                );
			}

            return this;
        }
    });
    
    //#region ImagesView

    var ImagesView = BaseView.extend({

        template: _.template($('#profile_images').html()),

        render: function () {
            this.$el.html(this.template());

            if (this.options.visibility.logo) {
                this.$('[data-outlet="images"]').append(
                    this.addChildren(new LogoImageView({
                        model: this.model.logo,
                        visibility: this.options.visibility.logo,
                        fullWidth: !this.options.visibility.bannerHeader
                    })).render().el
                );
            }
            
            if (this.options.visibility.bannerHeader) {
                this.$('[data-outlet="images"]').append(
                    this.addChildren(new BannerHeaderImageView({
                        model: this.model.bannerHeader,
                        visibility: this.options.visibility.bannerHeader,
                        fullWidth: !this.options.visibility.logo
                    })).render().el
                );
            }

            return this;
        }

    });

    //#region FileView

    var FileView = BaseView.extend({

        template: _.template(''),
        uploadingTemplate: _.template($('#profile_file_uploading').html()),
        progressTemplate: _.template($('#profile_file_progress').html()),
        errorTemplate: _.template($('#profile_file_error').html()),

        initialize: function () {
            this.fileUploadView = null;

            this.listenTo(this.model.file, 'change:state', this.onStateChange);
            this.listenTo(this.model.file, 'change:progress', this.onProgressChange);
            this.listenTo(this.model.file, 'change:token', this.onTokenChange);
        },

        renderButton: function () {
            this.renderUploadButton();

            if (this.model.file.includeDropbox)
                this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new DropboxUploadView({ model: this.model.file })).render().el);

            if (this.model.file.includeLinkedIn)
                this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new LinkedInUploadView({ model: this.model.file })).render().el);

            if (this.model.file.includeWeb)
                this.$('[data-outlet="file_uploaders"]').append(this.addChildren(new WebUploadView({ model: this.model.file })).render().el);

            this.onStateChange(this.model.file, this.model.file.get('state'));
        },

        onSubmitFile: function () {
            this.$('form').submit();
        },

        showButton: function () {
            this.$('[data-element="upload_title"]').show();
            this.$('[data-outlet="file_uploaders"]').show();
            this.disposeChildren(this.fileUploadView);
            this.renderUploadButton();
        },

        renderUploadButton: function () {
            this.fileUploadView = this.addChildren(FileUploadView.create({ model: this.model.file, callback: this.$('input[name=callback]').val(), iframeId: this.$('iframe')[0].id }));
            this.fileUploadView.on('submit-file', this.onSubmitFile, this);
            this.$('[data-outlet="file_uploaders"]').prepend(this.fileUploadView.render().el);
        },

        hideButton: function () {
            this.$('[data-outlet="file_uploaders"]').hide();
            this.$('[data-element="upload_title"]').hide();
        },

        onStateChange: function (file, state) {

            switch (state) {
                case 'idle':
                    return;
                case 'uploading':
                    this.$('[data-element="error_message"]').html('').hide();
                    this.$('[data-element="upload_progress"]').html(this.uploadingTemplate(this.model.file.toJSON())).show();
                    this.hideButton();
                    return;
                case 'uploaded':
                    return;
                case 'error':
                    this.$('[data-element="error_message"]').html(this.errorTemplate(this.model.file.toJSON())).show();
                    this.$('[data-element="upload_progress"]').html('').hide();
                    this.showButton();
                    return;
                default:
                    throw new Error(String.format('State {0} not supported.', state));
            }

        },

        onProgressChange: function (file, progress) {
            if (progress)
                this.$('[data-element="upload_progress"]').html(this.progressTemplate(this.model.file.toJSON())).show();
        },

        onTokenChange: function () {

            if (!this.model.file.get('token'))
                return;

            this.model.replace({
                success: _.bind(this.onSaveSuccess, this),
                error: _.bind(this.onSaveError, this)
            });
        },

        onSaveSuccess: function (model, response) {
        },

        onSaveError: function (model, message) {
            this.model.file.setError(message);
        },

        render: function () {
            this.$el.html(this.template(this.model.file));
            this.renderButton();
            return this;
        }

    });

    //#endregion

    //#region ImageView

    var ImageView = BaseView.extend({

        template: _.template($('#profile_image').html()),

        initialize: function () {
            this.listenTo(this.model, 'change:imageUrl', this.onImageUrlChange);
        },

        onImageUrlChange: function () {
            this.disposeAllChildren();
            this.render();
        },

        events: {
            'click [data-action=replace]': 'onReplaceClick',
            'click [data-action=delete]': 'onDeleteClick',
            'click [data-action=undo]': 'onUndoClick'
        },

        onReplaceClick: function () {
            this.model.file.setIdle();
            this.$('[data-outlet="image"]').append(this.addChildren(new ImageEditView({ model: this.model })).render().el);
        },

        savingStateOutlet: '[data-outlet="image"]',

        onDeleteClick: function () {
            this.showSavingState();
            this.model['delete']({
                error: _.bind(this.onError, this)
            });
        },

        onUndoClick: function () {
            this.showSavingState();
            this.model.undo({
                error: _.bind(this.onError, this)
            })
        },

        onError: function (model, message) {
            this.hideSavingState();
        },

        getDisplayUrl: function () {
            if (this.model.get('imageUrl') && this.model.get('imageUrl').get('url'))
                return this.model.get('imageUrl').get('url');
            else
                return this.missingImage;
        },

        render: function () {
            this.$el.html(this.template({
                title: this.title,
                titleVisible: this.options.visibility.title,
                fullWidth: this.options.fullWidth,
                image: this.model,
                displayUrl: this.getDisplayUrl(),
                size: {
                    width: this.width
                }
            }));
            return this;
        }

    });

    var LogoImageView = ImageView.extend({
        title: 'Logo',
        width: 162,
        missingImage: 'https://placehold.it/162x162&text=logo'
    });

    var BannerHeaderImageView = ImageView.extend({
        title: 'Banner',
        width: 240,
        missingImage: 'https://placehold.it/401x50&text=banner'
    });

    //#region ImageEditView

    var ImageEditView = FileView.extend({

        template: _.template($('#profile_image_edit').html()),

        events: {
            'click [data-action=cancel]': 'onCancelClick'
        },

        onCancelClick: function () {
            this.dispose();
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#region CompanyInfoView

    var CompanyInfoView = SectionView.extend({

        initialize: function(options) {
            this.onlyEditFormVisible = options.visibility.onlyEditForm;
        },

        detailsView: function () {
            return new CompanyInfoDetailsView({ model: this.model });
        },

        editView: function () {
            return new CompanyInfoEditView({
                model: this.model,
                industries: this.options.industries,
                companySizes: this.options.companySizes
            });
        }

    });

    //#region CompanyInfoDetailsView

    var CompanyInfoDetailsView = BaseView.extend({

        template: _.template($('#profile_company_info_details').html()),

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#region CompanyInfoEditView

    var CompanyInfoEditView = BaseFormView.extend({

        template: _.template($('#profile_company_info_edit').html()),

        initialize: function (options) {
            this.listenTo(options.industries.state, 'change', this.render);
            this.listenTo(options.companySizes.state, 'change', this.render);
        },

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        formPreProcess: function (attrs) {

            if (attrs['industry.ids']) {
                attrs.industries = [];
                _.each(attrs['industry.ids'], function (id) {
                    attrs.industries.push({ id: id });
                });
                delete attrs['industry.ids'];
            }

            if (attrs['companySize.id']) {
                attrs.companySize = null;
                attrs.companySize = {
                    id: attrs['companySize.id']
                };
                delete attrs['companySize.id'];
            }
        },

        renderIndustries: function () {

            var that = this,
                output = [];

            output.push('<option value=""></option>');
            this.options.industries.each(function (industry) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    industry.id,
                    (that.model.get('industries') && _.some(that.model.get('industries'), function (i) { return i.id == industry.id })) ? ' selected="selected"' : '',
                    industry.get('name')
                ));
            });
            this.$('select[name="industry.ids"]').html(output.join('')).change();
        },

        renderCompanySizes: function () {

            var that = this,
                output = [];

            output.push('<option value=""></option>');
            this.options.companySizes.each(function (companySize) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    companySize.id,
                    (that.model.get('companySize') && that.model.get('companySize').id == companySize.id) ? ' selected="selected"' : '',
                    companySize.get('name')
                ));
            });
            this.$('select[name="companySize.id"]').html(output.join('')).change();
        },

        render: function () {

            if (this.renderState(this.options.industries.state))
                return this;

            if (this.renderState(this.options.companySizes.state))
                return this;

            this.$el.html(this.template(this.model.toJSON()));

            this.renderIndustries();
            this.renderCompanySizes();
            this.bindSelect2();
            return this;
        }

    });

    //#endregion

    //#endregion

    //#region YouTubeVideoView

    var YouTubeVideoView = BaseView.extend({

        template: _.template($('#profile_youtube_video').html()),
        imgPlaceholder: 'https://placehold.it/200x100&text=No+Video',

        initialize: function () {
            this.savable = false;
            this.youTube = new YouTube();
            if (this.model.get('youTubeUrl'))
                this.youTube.setUrl(this.model.get('youTubeUrl'), this.model.get('youTubeThumbUrl'));

            this.data = null;
            this.listenTo(this.youTube, 'change:data', this.onDataChange);
            this.listenTo(this.youTube, 'change:error', this.onErrorChange);
        },

        events: {
            'input [name=youTubeUrl]': 'onInputChange',
            'change [name=youTubeUrl]': 'onInputChange', // for IE 8 because it doesn't support input event (note: TODO this was added recently. we may not need it because of oninput check in render).
            'click [data-action=remove]': 'onRemoveClick'
        },

        onErrorChange: function (model, error) {
            this.hideSavingState();
            if (error)
                this.$('[data-error=input]').text(error).show();
            else
                this.$('[data-error=input]').text('').hide();

        },

        showHideRemoveButton: function () {
            if (this.data)
                this.$('[data-action=remove]').show();
            else
                this.$('[data-action=remove]').hide();

        },

        onRemoveClick: function () {
            this.youTube.removeUrl();
        },

        onInputChange: function (e) {
            if ($(e.currentTarget).val())
                this.youTube.setUrl($(e.currentTarget).val());
        },

        onThumbChange: function () {
            if (this.data && this.data.get('thumb'))
                this.$('[data-container=thumb]').prop('src', this.data.get('thumb'));
            else
                this.$('[data-container=thumb]').prop('src', 'https://placehold.it/320x180&text=No+Video');
        },

        showSavingState: function () {
            this.$('[data-section=saving-state]').text('Saving...').removeClass('hidden');
        },

        showSavedState: function () {
            this.$('[data-section=saving-state]').text('Saved!').removeClass('hidden');
        },

        hideSavingState: function() {
            this.$('[data-section=saving-state]').addClass('hidden');
        },

        save: function () {
            if (!this.savable)
                return
            
            this.showSavingState();
            this.model.save({ youTubeUrl: this.$('[name=youTubeUrl]').val() }, {
                success: _.bind(this.onSaveSuccess, this),
                error: _.bind(this.onErrorChange, this)
            });
        },

        onSaveSuccess: function () {
            this.showSavedState();
        },

        onDataChange: function () {
            if (this.data)
                this.stopListening(this.data, 'change:thumb', this.onThumbChange);

            this.data = this.youTube.get('data');

            if (this.data)
                this.listenTo(this.data, 'change:thumb', this.onThumbChange);

            var $input = this.$('[name=youTubeUrl]');
            if (!this.data && $input.val())
                $input.val('');
            else if (this.data && this.data.get('url') != $input.val()) // make sure we don't set value if it's already the same, otherwise, we'll go into an infinite loop in IE8
                $input.val(this.data.get('url'));

            this.onThumbChange();
            this.showHideRemoveButton();
            this.save();
        },

        render: function () {
            this.$el.html(this.template(this.youTube));

            // make sure this comes before binding to'propertychange', otherwise, IE8 will trigger a property change and we'll end up adding an extra URL to the stack.
            this.onDataChange();

            //if (!JOBCAST.capabilities.oninput)
            //    this.$('.customize_youtube_input').on('propertychange', _.bind(this.onInputChange, this)); // propertychange doesn't bubble. be careful, changing element value programmatically also fires propertychange

            this.savable = true;

            return this;
        }

    });

    //#endregion

    //#region SocialMediaView

    var SocialMediaView = SectionView.extend({

        detailsView: function () {
            return new SocialMediaViewDetailsView({ model: this.model });
        },

        editView: function () {
            return new SocialMediaViewEditView({
                model: this.model,
                industries: this.options.industries,
                companySizes: this.options.companySizes
            });
        }

    });

    //#region SocialMediaViewDetailsView

    var SocialMediaViewDetailsView = BaseView.extend({

        template: _.template($('#profile_social_media_details').html()),

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#region SocialMediaViewEditView

    var SocialMediaViewEditView = BaseFormView.extend({

        template: _.template($('#profile_social_media_edit').html()),

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#region global jQuery.ajax

    // As of jQuery 1.6.4, a reference to the statusCode object is stored prior to calling ajaxPrefilter (line 7321),
    // so creating a new statusCode object in ajaxPrefilter won't do anything. To overcome this, we will by default
    // set an empty statusCode object so that ajaxPrefilter can modify it instead of creating a new object.
    $.ajaxSetup({
        statusCode: {}
    });

    $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
        // Note: statusCode callbacks get called after error callbacks
        options.statusCode = _.extend(options.statusCode || {}, {
            401: function (jqXHR, textStatus, errorThrown) {
                window.location.reload(true);
            }
        });
    });

    //#endregion

    return {
    	init: function (options) {

    	    dropboxAppKey = options.dropboxAppKey;
    	    url(options.restPath);

    		var employer = new Employer({ id: options.employerId });
    		var industryCache = new IndustryCache();
    		var companySizeCache = new CompanySizeCache();

    		var pageView = new PageView({
    			model: employer,
    			industries: industryCache.getIndustries(),
    			companySizes: companySizeCache.getCompanySizes(),
                visibility: options.visibility
    		});

    		$('[data-outlet=profile_page]').append(pageView.render().el);

    		employer.fetch();
        }
    }
    
}(jQuery));