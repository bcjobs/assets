var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobseekerProfile = (function ($) {

    var dropboxAppKey;

    //#region url

    var url = function (restPath) {
        url = {
            linkedInAuthorization: '/com/portals/auth/linkedin_resume_authorize?callback=:callback',

            jobseekers: '/api/v1.1/resumes/:id',
            relocations: '/api/v1.1/resumes/:id/relocations',
            educations: '/api/v1.1/resumes/:id/educations',
            positions: '/api/v1.1/resumes/:id/positions',
            jobseekerSkills: '/api/v1.1/resumes/:id/skills',

            photos: restPath + 'files',
            formPhoto: restPath + 'files/form',
            fetchPhoto: restPath + 'files/fetch',

            resumes: restPath + 'resumes',
            formResume: restPath + 'resumes/form',
            fetchResume: restPath + 'resumes/fetch',

            // generic
            countries: '/api/v1.1/countries',
            provinces: '/api/v1.1/provinces?countryId=:id',
            careerLevels: '/api/v1.1/careerlevels',
            locations: '/api/v1.1/locations?pageSize=7&types=town%2Cprovince%2Ccountry',
            skills: '/api/v1.1/skills?pageSize=7'
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

    //#region CareerLevel

    var CareerLevel = Backbone.Model.extend({
    });

    var CareerLevels = Backbone.Collection.extend({
        model: CareerLevel,

        initialize: function () {
            this.state = new State();
        }
    });

    var CareerLevelCache = Cache.extend({

        collection: CareerLevels,
        listName: 'career level',
        url: function () {
            return url.careerLevels;
        },

        getCareerLevels: function () {
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
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

    var PhotoFile = File.extend({
        maxFileSize: 5,
        fileTypes: [
            'png', 'jpg'
        ],
        fileTypeMessage: 'Only PNG and JPG file types allowed.',
        sendUrl: function () {
            return url.photos;
        },
        sendName: 'file',
        fetchUrl: function () {
            return url.fetchPhoto;
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

    //#region Jobseeker

    var Jobseeker = BaseModel.extend({

        initialize: function () {
            this._loading = false;
            this.state = new State();

            this.photo = new Photo();
            this.photo.jobseeker = this;

            this.relocations = new Relocations();
            this.relocations.jobseeker = this;

            this.educations = new Educations();
            this.educations.jobseeker = this;

            this.positions = new Positions();
            this.positions.jobseeker = this;

            this.skills = new Skills();
            this.skills.jobseeker = this;

            this.resume = new Resume();
            this.resume.jobseeker = this;

            this.on('change:published', this.onPublishedChange, this);
        },

        onPublishedChange: function () {
            if (this.previous('published') === undefined)
                return;

            if (this.get('published') && !this.previous('published') && window.dataLayer)
                dataLayer.push({ 'event': 'custom', 'eventCategory': 'App', 'eventAction': 'JobseekerProfilePublish', 'eventLabel': undefined, 'nonInteraction': false });
        },

        url: function () {
            return url.jobseekers.replace(':id', this.id);
        },

        parse: function (resp, options) {

            this.photo.setPhotoUrl(resp.photoUrl);
            delete resp.photoUrl;

            this.relocations.reset(resp.relocations);
            delete resp.relocations;

            this.educations.reset(resp.educations);
            delete resp.educations;

            this.positions.reset(resp.positions);
            delete resp.positions;

            this.skills.reset(resp.skills);
            delete resp.skills;

            this.resume.set({
                url: resp.fileUrl,
                fileType: resp.fileType
            });
            delete resp.fileUrl;
            delete resp.fileType;

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

                    var error = jqXHR.status >= 400 && jqXHR.status < 500
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

                    delete response.photoUrl;
                    delete response.educations;
                    delete response.positions;
                    delete response.skills;
                    delete response.fileUrl;
                    delete response.fileType;

                    that.set(response);

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

    var Photo = BaseModel.extend({

        defaults: {
            photoUrl: null
        },

        initialize: function () {
            this.file = new PhotoFile();
        },

        url: function () {
            return url.jobseekers.replace(':id', this.jobseeker.id);
        },

        getDisplayUrl: function () {
            if (this.get('photoUrl') && this.get('photoUrl').get('url'))
                return this.get('photoUrl').get('url');
            else
                return '/images/profile_missing.png';
        },

        setPhotoUrl: function (url) {
            this.set({
                photoUrl: new PhotoUrl({
                    url: url,
                    previous: this.get('photoUrl')
                })
            })
        },

        replace: function (options) {
            this.save(JSON.stringify({
                photoToken: this.file.get('token')
            }), options);
        },

        'delete': function (options) {
            this.save(JSON.stringify({
                photoUrl: ''
            }), options);
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
                    that.setPhotoUrl(response.photoUrl);

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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
                data: JSON.stringify({
                    photoUrl: this.get('photoUrl').get('previous').get('url')
                }),
                dataType: 'json',
                type: 'PUT',
                success: function (response, textStatus, jqXHR) {
                    that.set({
                        photoUrl: that.get('photoUrl').get('previous')
                    });

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

    var PhotoUrl = Backbone.Model.extend({
    });

    //#region Qualification

    var Qualification = BaseModel.extend({

        save: function (attrs, options) {
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                data: JSON.stringify(attrs),
                dataType: 'json',
                type: this.isNew() ? 'POST' : 'PUT',
                success: function (response, textStatus, jqXHR) {
                    that.set(response);

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

        'delete': function (options) {
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                dataType: 'json',
                type: 'DELETE',
                success: function (response, textStatus, jqXHR) {
                    if (options.success)
                        options.success(that);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

    var Relocation = Qualification.extend({

        url: function () {
            if (this.isNew())
                return url.relocations.replace(':id', this.collection.jobseeker.id);
            else
                return url.relocations.replace(':id', this.collection.jobseeker.id) + '/' + this.get('id');
        }

    });

    var Relocations = Backbone.Collection.extend({

        model: Relocation

    });

    var Education = Qualification.extend({

        defaults: {
            school: '',
            degree: null,
            fieldOfStudy: '',
            startYear: null,
            endYear: null
        },

        url: function () {
            if (this.isNew())
                return url.educations.replace(':id', this.collection.jobseeker.id);
            else
                return url.educations.replace(':id', this.collection.jobseeker.id) + '/' + this.id;
        }

    });

    var Educations = Backbone.Collection.extend({

        model: Education

    });

    var Position = Qualification.extend({

        defaults: {
            title: '',
            company: '',
            start: null,
            end: null,
            duration: ''
        },

        url: function () {
            if (this.isNew())
                return url.positions.replace(':id', this.collection.jobseeker.id);
            else
                return url.positions.replace(':id', this.collection.jobseeker.id) + '/' + this.id;
        }

    });

    var Positions = Backbone.Collection.extend({

        model: Position

    });

    var Skill = Qualification.extend({

        defaults: {
            type: '',
            proficiency: null,
            experience: null
        },

        url: function () {
            if (this.isNew())
                return url.jobseekerSkills.replace(':id', this.collection.jobseeker.id);
            else
                return url.jobseekerSkills.replace(':id', this.collection.jobseeker.id) + '/' + this.id;
        }

    });

    var Skills = Backbone.Collection.extend({

        model: Skill

    });

    //#endregion

    var Resume = BaseModel.extend({

        initialize: function () {
            this.file = new ResumeFile();
        },

        url: function () {
            return url.jobseekers.replace(':id', this.jobseeker.id);
        },

        replace: function (options) {
            options || (options = {});
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                data: JSON.stringify({
                    fileToken: this.file.get('token')
                }),
                dataType: 'json',
                type: 'PUT',
                success: function (response, textStatus, jqXHR) {
                    that.set({
                        url: response.fileUrl,
                        fileType: response.fileType
                    });

                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status >= 400 && jqXHR.status < 500) {
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

        hideSavingState: function () {
            this.$el.children()
                .removeClass('invisible')
                    .end()
                    .find('.flex-loader-mini')
                    .remove();
        },

        showSavingState: function () {
            this.$el.children()
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

        onSaveSuccess: function (model, response) {
        },

        onSaveError: function (model, message) {
            this.hideSavingState();
            this.$('[data-element="alert_danger_server"]').text(message).show();
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
            var $target = $(e.currentTarget);
            if ($target.attr('name') === 'country.id')
                this.onCountryChange();

            this.validateIfReady();
        },

        validateIfReady: function () {
            if (this._validatable)
                this.isValid(this.getFormValues());
        },

        onCountryChange: function () {

            var countryId = this.$('select[name="country.id"]').val();

            if (countryId) {

                var country = this.options.countries.get(countryId);

                var provinces = country.provinceCache.getProvinces();
                this._currentProvinces = provinces;

                if (!provinces.state.get('ready')) {
                    var $sectionInput = this.$('select[name="province.id"]')
                        .closest('[data-element="province_input_section"]');

                    if ($sectionInput.find('.select2-container').length) {
                        $sectionInput.append('<span data-element="loader" class="flex-loader-mini"></span>')
                            .find('.select2-container').css('visibility', 'hidden');
                    }

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
            var $provinceId = this.$('select[name="province.id"]');

            $provinceId
                .closest('[data-element="province_input_section"]')
                    .find('[data-element="loader"]')
                    .remove()
                .end()
                    .find('.select2-container')
                    .css('visibility', 'visible');

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
                    (that.model.get('province') && that.model.get('province').id == province.id) ? ' selected="selected"' : '',
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
                    (that.model.get('country') && (that.model.get('country').id == country.id)) ? ' selected="selected"' : '',
                    country.get('name')
                ));
            });
            this.$('select[name="country.id"]').html(output.join('')).change();
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

        template: _.template($('#file_upload').html()),

        events: {
            'change [data-element="file_input"]': 'initializeUpload'
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
            var response = JSON.parse(e.target.responseText);
            if (e.target.status !== 200) {
                this.model.setError(response.message);
                return;
            }
            this.model.setFile(response.file.token, response.file.name);
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
                this.model.setFile(response.data.file.token, response.data.file.name);
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

        success: function (file, response) {
            this.model.setFile(response.file.token, response.file.name);
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
             this.model.setFile(response.file.token, response.file.name);
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

    //#region WebUploadView

    var WebUploadView = UploadView.extend({

        source: 'Web',

        template: _.template($('#web_upload').html()),

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
            this.model.setFile(response.file.token, response.file.name);
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

        initialize: function () {
            this.content = null;
        },

        events: {
            'click [data-action="edit"]': 'renderEdit',
            'click [data-action="cancel"]': 'onCancelClick'
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

        renderDetails: function () {
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
            if (this.model.isNew())
                this.renderEdit();
            else
                this.renderDetails();
            return this;
        }
    });

    //#endregion

    //#region PageView

    var PageView = BaseView.extend({

        className: 'clearfix flex-relative',

        initialize: function (options) {
            this.listenTo(this.model.state, 'change', this.render);
        },

        render: function () {

            if (this.renderState(this.model.state))
                return this;

            this.$el.empty();

            if (this.options.enabled.headline_text || this.options.enabled.headline_publish)
                this.$el.append(
                    this.addChildren(
                        new HeadlineView({
                            model: this.model,
                            requireVerification: this.options.requireVerification,
                            enabled: this.options.enabled
                        })
                    )
                    .render().el
                );

            if (this.options.enabled.status)
                this.$el.append(
                    this.addChildren(
                        new StatusView({
                            model: this.model,
                            requireVerification: this.options.requireVerification
                        })
                    ).render().el
                );

            if (this.options.enabled.identity) {
                this.$el.append(
                    this.addChildren(
                        new IdentityView({
                            model: this.model,
                            countries: this.options.countries
                        })
                    ).render().el
                );

                this.$el.append('<hr />');
            }

            if (this.options.enabled.careerLevel)
                this.$el.append(
                    this.addChildren(
                        new CareerLevelView({
                            model: this.model,
                            careerLevels: this.options.careerLevels
                        })
                    ).render().el
                );

            if (this.options.enabled.positionTypes)
                this.$el.append(
                    this.addChildren(
                        new PositionTypesWrapperView({
                            model: this.model
                        })
                    ).render().el
                );

            if (this.options.enabled.relocations)
                this.$el.append(
                    this.addChildren(
                        new RelocationsView({
                            collection: this.model.relocations
                        })
                    ).render().el
                );

            if (this.options.enabled.educations)
                this.$el.append(
                    this.addChildren(
                        new EducationsView({
                            collection: this.model.educations
                        })
                    )
                    .render().el
                );

            if (this.options.enabled.positions)
                this.$el.append(
                    this.addChildren(
                        new PositionsView({
                            collection: this.model.positions
                        })
                    )
                    .render().el
                );

            if (this.options.enabled.skills)
                this.$el.append(
                    this.addChildren(
                        new SkillsView({
                            collection: this.model.skills
                        })
                    )
                    .render().el
                );

            if (this.options.enabled.resume)
                this.$el.append(
                    this.addChildren(
                        new ResumeView({
                            model: this.model.resume
                        })
                    ).render().el
                );

            return this;
        }
    });

    //#region HeadlineView

    var HeadlineView = BaseView.extend({

        className: 'alert alert-info text-center clearfix',

        render: function () {
            if (this.options.enabled.headline_text)
                this.$el.append(
                    this.addChildren(
                        new HeadlineTextView()
                    ).render().el
                );

            if (this.options.enabled.headline_publish)
                this.$el.append(
                    this.addChildren(
                        new HeadlinePublishView({
                            model: this.model,
                            requireVerification: this.options.requireVerification,
                            enabled: this.options.enabled
                        })
                    ).render().el
                );

            return this;
        }

    });

    //#region HeadlineTextView

    var HeadlineTextView = BaseView.extend({

        template: _.template($('#headline_text').html()),

        render: function () {
            this.$el.html(this.template());
            return this;
        }

    });

    //#endregion

    //#region HeadlinePublishView

    var HeadlinePublishView = BaseFormView.extend({

        template: _.template($('#headline_publish').html()),

        templateCtaOnPublish: _.template($('#cta_on_publish').html()),

        className: 'editor-cta',

        initialize: function () {
            this.listenTo(this.model, 'change:published', this.render);
        },

        events: {
            'click [data-action=publish-now]': 'onPublishNowClick'
        },

        onPublishNowClick: function (e) {

            if (!this.options.requireVerification) {
                this.save({ published: true });
                return;
            }

            var that = this;

            var view = this.addChildren(new VerificationView());
            view.on('verified', function () {
                that.disposeAllChildren();
                that.save({ published: true });
            });
            $('body').append(
                view.render().el
            );

        },

        renderPrivate: function () {
            this.$el.html(this.template({ enabled: this.options.enabled }));
        },

        renderPublished: function() {
            this.$el.empty();
            if (this.options.enabled.cta_on_publish)
                this.$el.html(this.templateCtaOnPublish());
        },

        render: function () {

            if (this.model.get('published'))
                this.renderPublished();
            else
                this.renderPrivate();

            return this;
        }

    });

    var CtaOnPublishView = BaseView.extend({
        render: function () {

            return this;
        }
    });

    //#endregion

    //#endregion

    //#region StatusView

    var StatusView = SectionView.extend({

        className: 'editor-status-wrapper',

        initialize: function (options) {
            SectionView.prototype.initialize.call(this, options);
            this.listenTo(this.model, 'change:published', this.render);
            this.listenTo(this.model, 'change:confidential', this.render);
        },

        detailsView: function () {
            return new StatusDetailsView({ model: this.model });
        },

        editView: function () {
            return new StatusEditView({
                model: this.model,
                requireVerification: this.options.requireVerification
            });
        }

    });

    //#region StatusDetailsView

    var StatusDetailsView = BaseView.extend({

        template: _.template($('#status_details').html()),

        className: 'flex-relative flex-p10',

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));

            var c = 'alert alert-warning';
            if (this.model.get('published')) {
                if (this.model.get('confidential'))
                    c = 'alert alert-info';
                else if (this.model.get('blockRecruiters'))
                    c = 'alert alert-info';
                else
                    c = 'alert alert-success'
            }

            this.$el.addClass(c);
            return this;
        }

    });

    //#endregion

    //#region StatusEditView

    var StatusEditView = BaseFormView.extend({

        template: _.template($('#status_edit').html()),

        className: 'container-muted flex-p10 flex-mv10 clearfix flex-relative',

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        formPreProcess: function (attrs) {

            switch (attrs.jobseeker_profile_status) {
                case 'visible':
                    attrs.published = true;
                    attrs.confidential = false;
                    attrs.blockRecruiters = false;
                    break;
                case 'blockRecruiters':
                    attrs.published = true;
                    attrs.confidential = false;
                    attrs.blockRecruiters = true;
                    break;
                case 'confidential':
                    attrs.published = true;
                    attrs.confidential = true;
                    attrs.blockRecruiters = false;
                    break;
                case 'private':
                    attrs.published = false
                    attrs.confidential = false;
                    attrs.blockRecruiters = false;
                    break;
                default:
                    throw new Error();
            }

            delete attrs.jobseeker_profile_status;
        },

        onSubmit: function (e) {

            if (!this.options.requireVerification) {
                BaseFormView.prototype.onSubmit.call(this, e);
                return;
            }

            var that = this;

            e.preventDefault();

            switch ($('[name=jobseeker_profile_status]:checked').val()) {
                case 'visible':
                case 'blockRecruiters':
                case 'confidential':

                    var view = this.addChildren(new VerificationView());
                    view.on('verified', function () {
                        that.disposeAllChildren();
                        BaseFormView.prototype.onSubmit.call(that, e);
                    });
                    $('body').append(
                        view.render().el
                    );
                    return;
                case 'private':
                    BaseFormView.prototype.onSubmit.call(this, e);
                    return;
                default:
                    throw new Error();
            }
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    //#endregion

    //#endregion

    //#region VerificationView

    var VerificationView = BaseView.extend({

        template: _.template($('#verification').html()),

        events: {
            'change input': 'onInputChange',
            'click [data-action=cancel]': 'onCancelClick'
        },

        onCancelClick: function () {
            this.dispose();
        },

        onInputChange: function () {
            if (this.$('[name=verification]').prop('checked'))
                this.trigger('verified');
        },

        render: function () {
            this.$el.html(this.template());
            return this;
        }

    });

    //#endregion

    //#region IdentityView

    var IdentityView = BaseView.extend({

        template: _.template($('#identity').html()),

        className: 'clearfix flex-mv10',

        render: function () {
            this.$el.html(this.template());

            this.$('[data-outlet="photo"]').append(
                this.addChildren(new PhotoView({
                    model: this.model.photo
                })).render().el
            );

            this.addChildren(new PersonalInfoView({
                el: this.$('[data-outlet="personal_info"]')[0],
                model: this.model,
                countries: this.options.countries
            })).render();

            return this;
        }
    });

    //#region PersonalInfoView

    var PersonalInfoView = SectionView.extend({

        detailsView: function () {
            return new PersonalInfoDetailsView({ model: this.model });
        },

        editView: function () {
            return new PersonalInfoEditView({
                model: this.model,
                countries: this.options.countries
            });
        }

    });

    //#region PersonalInfoDetailsView

    var PersonalInfoDetailsView = BaseView.extend({

        template: _.template($('#personal_info_details').html()),

        className: 'flex-p10 flex-m0 clearfix',

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#region PersonalInfoEditView

    var PersonalInfoEditView = BaseFormView.extend({

        template: _.template($('#personal_info_edit').html()),

        className: 'container-muted flex-p10 flex-m0 flex-relative clearfix flex-minheight200',

        onCountryChange: function () {
            BaseFormView.prototype.onCountryChange.call(this);
            this.$('[data-outlet="legal_right"]').toggle(this.$('select[name="country.id"]').val() != '124');
        },

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        formPreProcess: function (attrs) {
            attrs.country = {
                id: attrs['country.id']
            };
            delete attrs['country.id'];

            attrs.province = {
                id: attrs['province.id']
            };
            delete attrs['province.id'];
        },

        render: function () {

            if (this.renderState(this.options.countries.state))
                return this;

            this.$el.html(this.template(this.model.toJSON()));

            this.renderCountries();
            this.bindSelect2();
            return this;
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#region CareerLevelView

    var CareerLevelView = SectionView.extend({

        className: 'clearfix',

        detailsView: function () {
            return new CareerLevelDetailsView({ model: this.model });
        },

        editView: function () {
            return new CareerLevelEditView({
                model: this.model,
                careerLevels: this.options.careerLevels
            });
        }

    });

    //#region CareerLevelDetailsView

    var CareerLevelDetailsView = BaseView.extend({

        template: _.template($('#career_level_details').html()),

        className: 'clearfix',

        render: function () {
            this.$el.html(this.template({ careerLevel: this.model.get('careerLevel') }));
            return this;
        }

    });

    //#endregion

    //#region CareerLevelEditView

    var CareerLevelEditView = BaseFormView.extend({

        template: _.template($('#career_level_edit').html()),

        className: 'container-muted flex-p10 flex-mv10 clearfix flex-relative',

        initialize: function (options) {
            this.listenTo(options.careerLevels.state, 'change', this.render);
        },

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        formPreProcess: function (attrs) {
            attrs.careerLevel = {
                id: attrs['careerLevel.id']
            };
            delete attrs['careerLevel.id'];
        },

        renderCareerLevels: function () {
            var that = this,
                output = [];

            output.push('<option value=""></option>');
            this.options.careerLevels.each(function (careerLevel) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    careerLevel.id,
                    that.model.get('careerLevel') && that.model.get('careerLevel').id == careerLevel.id ? ' selected="selected"' : '',
                    careerLevel.get('name')
                ));
            });
            this.$('select[name="careerLevel.id"]').html(output.join('')).change();
        },

        render: function () {

            if (this.renderState(this.options.careerLevels.state))
                return this;

            this.$el.html(this.template({ careerLevel: this.model.get('careerLevel') }));

            this.renderCareerLevels();
            this.bindSelect2();

            return this;
        }

    });

    //#endregion

    //#endregion

    //#region PositionTypesWrapperView

    var PositionTypesWrapperView = BaseView.extend({

        className: 'clearfix',

        template: _.template($('#position_types_wrapper').html()),

        render: function () {
            this.$el.html(this.template());
            this.addChildren(new PositionTypesView({
                el: this.$('[data-outlet="position_types"]')[0],
                model: this.model
            })).render();
            return this;
        }

    });

    //#region PositionTypesView

    var PositionTypesView = SectionView.extend({

        detailsView: function () {
            return new PositionTypesDetailsView({ model: this.model });
        },

        editView: function () {
            return new PositionTypesEditView({ model: this.model });
        }

    });

    //#region PositionTypesDetailsView

    var PositionTypesDetailsView = BaseView.extend({

        template: _.template($('#position_types_details').html()),

        className: 'clearfix flex-relative',

        render: function () {
            this.$el.html(this.template({ positionTypes: this.model.get('positionTypes') }));
            return this;
        }

    });

    //#endregion

    //#region PositionTypesEditView

    var PositionTypesEditView = BaseFormView.extend({

        template: _.template($('#position_types_edit').html()),

        className: 'container-muted flex-p10 clearfix flex-relative',

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        formPreProcess: function (attrs) {
            attrs.positionTypes = attrs.positionTypes ?
                _.map(attrs.positionTypes.split(','), function (id) {
                    return { id: id };
                }) :
                [];
        },

        render: function () {
            this.$el.html(this.template({ positionTypes: this.model.get('positionTypes') }));
            return this;
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#region QualificationsView

    var QualificationsView = BaseView.extend({

        events: {
            'click [data-action="add_new"]': 'onAddNew'
        },

        onAddNew: function () {
            var item = this.newModel();
            this.collection.add(item);
            this.renderItem(item);
        },

        renderItems: function () {
            var that = this;
            this.collection.each(function (item) {
                that.renderItem(item);
            });
        },

        renderItem: function (item) {
            var view = this.addChildren(this.newView(item));
            this.$('[data-outlet="qualifications"]').append(
                view.render().el
            );
            return view;
        },

        render: function () {
            this.$el.html(this.template());
            this.renderItems();
            return this;
        }

    });

    //#region RelocationsView

    var RelocationsView = QualificationsView.extend({

        className: 'clearfix',

        newModel: function () {
            return new Relocation();
        },

        newView: function (model) {
            return new RelocationView({ model: model });
        },

        template: _.template($('#relocations').html())

    });

    //#endregion

    //#region EducationsView

    var EducationsView = QualificationsView.extend({

        newModel: function () {
            return new Education();
        },

        newView: function (model) {
            return new EducationView({ model: model });
        },

        template: _.template($('#educations').html())

    });

    //#endregion

    //#region PositionsView

    var PositionsView = QualificationsView.extend({

        newModel: function () {
            return new Position();
        },

        newView: function (model) {
            return new PositionView({ model: model });
        },

        template: _.template($('#positions').html())

    });

    //#endregion

    //#region SkillsView

    var SkillsView = QualificationsView.extend({

        newModel: function () {
            return new Skill();
        },

        newView: function (model) {
            return new SkillView({ model: model });
        },

        template: _.template($('#skills').html())

    });

    //#endregion

    //#endregion

    //#region QualificationView

    var QualificationView = SectionView.extend({

    });

    //#region RelocationView

    var RelocationView = QualificationView.extend({

        detailsView: function () {
            return new RelocationDetailsView({ model: this.model });
        },

        editView: function () {
            return new RelocationEditView({ model: this.model });
        },

        removedView: function () {
            return new RelocationRemovedView({ model: this.model });
        }

    });

    //#endregion

    //#region EducationView

    var EducationView = QualificationView.extend({

        detailsView: function () {
            return new EducationDetailsView({ model: this.model });
        },

        editView: function () {
            return new EducationEditView({ model: this.model });
        },

        removedView: function () {
            return new EducationRemovedView({ model: this.model });
        }

    });

    //#endregion

    //#region PositionView

    var PositionView = QualificationView.extend({

        detailsView: function () {
            return new PositionDetailsView({ model: this.model });
        },

        editView: function () {
            return new PositionEditView({ model: this.model });
        },

        removedView: function () {
            return new PositionRemovedView({ model: this.model });
        }

    });

    //#endregion

    //#region SkillView

    var SkillView = QualificationView.extend({

        detailsView: function () {
            return new SkillDetailsView({ model: this.model });
        },

        editView: function () {
            return new SkillEditView({ model: this.model });
        },

        removedView: function () {
            return new SkillRemovedView({ model: this.model });
        }

    });

    //#endregion

    //#endregion

    //#region QualificationDetailsView

    var QualificationDetailsView = BaseView.extend({

        className: 'flex-relative',

        events: {
            'click [data-action="remove"]': 'delete'
        },

        'delete': function () {
            this.showSavingState();
            this.model['delete']({
                success: _.bind(this.onDeleteSuccess, this),
                error: _.bind(this.onDeleteError, this)
            });
        },

        onDeleteSuccess: function (model) {
            this.trigger('render-deleted');
        },

        onDeleteError: function (model, message) {
            this.hideSavingState();
            this.$('[data-element="alert_danger_server"]').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    //#region RelocationDetailsView

    var RelocationDetailsView = QualificationDetailsView.extend({

        template: _.template($('#relocation_details').html())

    });

    //#endregion

    //#region EducationDetailsView

    var EducationDetailsView = QualificationDetailsView.extend({

        template: _.template($('#education_details').html())

    });

    //#endregion

    //#region PositionDetailsView

    var PositionDetailsView = QualificationDetailsView.extend({

        template: _.template($('#position_details').html())

    });

    //#endregion

    //#region SkillDetailsView

    var SkillDetailsView = QualificationDetailsView.extend({

        template: _.template($('#skill_details').html()),
        className: 'flex-relative flex-p5'

    });

    //#endregion

    //#endregion

    //#region QualificationEditView

    var QualificationEditView = BaseFormView.extend({

        className: 'container-muted flex-p10 flex-mt5 flex-mb15 clearfix flex-relative',

        events: function () {
            return _.extend({}, BaseFormView.prototype.events, {
                'click [data-action="remove"]': 'delete'
            });
        },

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        },

        'delete': function () {
            this.showSavingState();
            this.model['delete']({
                success: _.bind(this.onDeleteSuccess, this),
                error: _.bind(this.onDeleteError, this)
            });
        },

        onDeleteSuccess: function (model) {
            this.trigger('render-deleted');
        },

        onDeleteError: function (model, message) {
            this.hideSavingState();
            this.$('[data-element="alert_danger_server"]').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            if (this.model.isNew())
                this.$el.addClass('new');

            this.bindSelect2();
            return this;
        }

    });

    //#region RelocationEditView

    var RelocationEditView = QualificationEditView.extend({

        template: _.template($('#relocation_edit').html()),

        render: function () {

            var that = this;

            QualificationEditView.prototype.render.call(this);

            var execute = function () {
                that.$('input[name="description"]').jsonSuggest({
                    url: url.locations,
                    textPropertyName: 'description',
                    minCharacters: 3
                });
            };

            // we need to setTimeout (or setImmediate) and let the input set its width in order for jsonSuggest's width to be set properly.
            if (!$.contains(document.documentElement, this.el))
                setTimeout(execute, 10);
            else
                execute();

            return this;
        }

    });

    //#endregion

    //#region EducationEditView

    var EducationEditView = QualificationEditView.extend({

        template: _.template($('#education_edit').html()),

        formPreProcess: function (attrs) {
            attrs.degree = {
                id: attrs['degree.id']
            };
            delete attrs['degree.id'];
        }

    });

    //#endregion

    //#region PositionEditView

    var PositionEditView = QualificationEditView.extend({

        template: _.template($('#position_edit').html()),

        events: function () {
            return _.extend({}, QualificationEditView.prototype.events(), {
                'change [name=isCurrent]': 'onIsCurrentChange'
            });
        },

        onIsCurrentChange: function (e) {
            this.$('[data-outlet="end_date"]').fadeToggle('fast');
        },

        formPreProcess: function (attrs) {
            attrs.start = attrs.startMonth && attrs.startYear ? attrs.startYear + '-' + attrs.startMonth + '-01' : null;
            attrs.end = attrs.endMonth && attrs.endYear && !attrs.isCurrent ? attrs.endYear + '-' + attrs.endMonth + '-01' : null;
            delete attrs.startMonth;
            delete attrs.startYear;
            delete attrs.endMonth;
            delete attrs.endYear;
            delete attrs.isCurrent;
        }

    });

    //#endregion

    //#region SkillEditView

    var SkillEditView = QualificationEditView.extend({

        template: _.template($('#skill_edit').html()),

        formPreProcess: function (attrs) {

            attrs.proficiency = {
                id: attrs['proficiency.id']
            };

            attrs.experience = {
                id: attrs['experience.id']
            };

            delete attrs['proficiency.id'];
            delete attrs['experience.id'];
        },

        render: function () {

            var that = this;

            QualificationEditView.prototype.render.call(this);

            var execute = function () {
                that.$('input[name="type"]').jsonSuggest({
                    url: url.skills,
                    textPropertyName: 'name',
                    minCharacters: 3
                });
            };

            // we need to setTimeout (or setImmediate) and let the input set its width in order for jsonSuggest's width to be set properly.
            if (!$.contains(document.documentElement, this.el))
                setTimeout(execute, 10);
            else
                execute();

            return this;
        }

    });

    //#endregion

    //#endregion

    //#region QualificationRemovedView

    var QualificationRemovedView = BaseView.extend({

        className: 'flex-p10 flex-mv15 container-warning flex-relative',

        events: {
            'click [data-action="undo"]': 'onUndoClick'
        },

        onUndoClick: function () {
            this.model.set('id', undefined);
            this.showSavingState();
            this.model.save(this.model.toJSON(), {
                success: _.bind(this.onUndoSuccess, this),
                error: _.bind(this.onUndoError, this)
            });
        },

        onUndoSuccess: function (model, response) {
            this.trigger('render-details');
        },

        onUndoError: function (model, message) {
            this.hideSavingState();
            this.$('[data-element="alert_danger_server"]').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    //#region RelocationRemovedView

    var RelocationRemovedView = QualificationRemovedView.extend({

        template: _.template($('#relocation_removed').html())

    });

    //#endregion

    //#region EducationRemovedView

    var EducationRemovedView = QualificationRemovedView.extend({

        template: _.template($('#education_removed').html())

    });

    //#endregion

    //#region PositionRemovedView

    var PositionRemovedView = QualificationRemovedView.extend({

        template: _.template($('#position_removed').html())

    });

    //#endregion

    //#region SkillRemovedView

    var SkillRemovedView = QualificationRemovedView.extend({

        template: _.template($('#skill_removed').html())

    });

    //#endregion

    //#endregion

    //#region FileView

    var FileView = BaseView.extend({

        template: _.template(''),
        uploadingTemplate: _.template($('#file_uploading').html()),
        progressTemplate: _.template($('#file_progress').html()),
        errorTemplate: _.template($('#file_error').html()),

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

    //#region PhotoView

    var PhotoView = BaseView.extend({

        template: _.template($('#photo').html()),

        initialize: function () {
            this.listenTo(this.model, 'change:photoUrl', this.onPhotoUrlChange);
        },

        onPhotoUrlChange: function () {
            this.disposeAllChildren();
            this.render();
        },

        events: {
            'click [data-action="replace"]': 'onReplaceClick',
            'click [data-action="remove"]': 'onDeleteClick',
            'click [data-action=undo]': 'onUndoClick'
        },

        onReplaceClick: function () {
            this.model.file.setIdle();
            this.$el.append(this.addChildren(new PhotoEditView({ model: this.model })).render().el);
        },

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

        render: function () {
            this.$el.html(this.template(this.model));
            return this;
        }

    });

    //#region PhotoEditView

    var PhotoEditView = FileView.extend({

        template: _.template($('#photo_edit').html()),

        events: {
            'click [data-action="cancel"]': 'onCancelClick'
        },

        onCancelClick: function () {
            this.dispose();
        }

    });

    //#endregion

    //#endregion

    //#region ResumeView

    var ResumeView = BaseView.extend({

        initialize: function () {
            this.content = null;
        },

        renderDetails: function () {
            this.disposeChildren(this.content);
            this.content = this.addChildren(new ResumeDetailsView({ model: this.model }));
            this.content.on('edit', this.renderEdit, this);
            this.$el.append(this.content.render().el);
        },

        renderEdit: function () {
            this.disposeChildren(this.content);
            this.content = this.addChildren(new ResumeEditView({ model: this.model }));
            this.content.on('render-details', this.renderDetails, this);
            this.$el.append(this.content.render().el);
        },

        render: function () {
            if (this.model.get('url'))
                this.renderDetails();
            else
                this.renderEdit();

            return this;
        }

    });

    var ResumeDetailsView = BaseView.extend({

        template: _.template($('#resume_details').html()),

        events: {
            'click [data-action="replace"]': 'onReplaceClick'
        },

        onReplaceClick: function () {
            this.trigger('edit');
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    var ResumeEditView = FileView.extend({

        template: _.template($('#resume_edit').html()),

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        }

    });

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

            var jobseeker = new Jobseeker({ id: options.jobseekerId });
            var countryCache = new CountryCache();
            var careerLevelCache = new CareerLevelCache();

            var pageView = new PageView({
                model: jobseeker,
                countries: countryCache.getCountries(),
                careerLevels: careerLevelCache.getCareerLevels(),
                requireVerification: options.requireVerification,
                enabled: options.enabled
            });

            $('[data-outlet="container"]').append(pageView.render().el);

            jobseeker.fetch();
        }
    }

}(jQuery));