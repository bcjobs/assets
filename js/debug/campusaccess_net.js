var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.campusaccess = (function ($) {

    var dropboxAppKey;

    //#region url

    var url = {
        transcripts: '/api/v1.1/resumes/:id/postsecondarytranscripts',

        jobseekers: '/api/v1.1/resumes/:id',
        educations: '/api/v1.1/resumes/:id/educations',
        positions: '/api/v1.1/resumes/:id/positions',

        photos: '/api/v1.1/images',
        formPhoto: '/api/v1.1/images/form',
        fetchPhoto: '/api/v1.1/images/fetch',

        resumes: '/api/v1.1/resumefiles',
        formResume: '/api/v1.1/resumefiles/form',
        fetchResume: '/api/v1.1/resumefiles/fetch'
    };

    //#endregion

    // MODELS

    //#region Jobseeker

    var Jobseeker = Backbone.Model.extend();

    //#endregion

    //#region File

    var File = Backbone.Model.extend({

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
            xhr.open('POST', this.sendUrl);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(fd);
        },

        fetch: function (source, link, accessToken, options) {

            options || (options = {});
            var that = this;

            $.ajax({
                url: this.fetchUrl,
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

    var PhotoFile = File.extend({
        maxFileSize: 5,
        fileTypes: [
            'png', 'jpg'
        ],
        fileTypeMessage: 'Only PNG and JPG file types allowed.',
        sendUrl: url.photos,
        sendName: 'file',
        fetchUrl: url.fetchPhoto,
        includeDropbox: true,
        includeWeb: true
    });

    var ResumeFile = File.extend({
        maxFileSize: 1,
        fileTypes: [
            'docx', 'doc', 'rtf', 'pdf', 'txt'
        ],
        fileTypeMessage: 'Only Word, Plain Text, PDF, RTF file types allowed.',
        sendUrl: url.resumes,
        sendName: 'file',
        fetchUrl: url.fetchResume,
        includeDropbox: true,
        includeWeb: false
    });

    var TranscriptFile = File.extend({
        maxFileSize: 1,
        fileTypes: [
            'docx', 'doc', 'rtf', 'pdf', 'txt'
        ],
        fileTypeMessage: 'Only Word, Plain Text, PDF, RTF file types allowed.',
        sendUrl: url.resumes,
        sendName: 'file',
        fetchUrl: url.fetchResume,
        includeDropbox: true,
        includeWeb: false
    });

    //#endregion

    //#region Photo

    var Photo = Backbone.Model.extend({

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
                photoPath: ''
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
                data: JSON.stringify({
                    photoPath: this.get('photoUrl').get('previous').getPhotoPath()
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

    var PhotoUrl = Backbone.Model.extend({
        getPhotoPath: function () {
            return this.get('url').replace('/jobseekerimages/', '');
        }
    });

    //#endregion

    //#region Resume

    var Resume = Backbone.Model.extend({

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
                        url: response.resumeUrl,
                        fileType: response.resumeFileType
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

    //#endregion

    //#region Transcript

    var Transcript = Backbone.Model.extend({

        initialize: function () {
            this.file = new TranscriptFile();
        },

        url: function () {
            if (this.isNew())
                return url.transcripts.replace(':id', this.collection.jobseeker.id);
            else
                return url.transcripts.replace(':id', this.collection.jobseeker.id) + '/' + this.id;
        },

        replace: function (options) {
            this.save(options);
        },

        undo: function (options) {
            options || (options = {});

            this.set('id', undefined);

            options.undo = true;
            this.save(options);
        },

        save: function (options) {
            options || (options = {});
            var that = this;

            var o = options.undo ? this.toJSON() : { transcriptToken: this.file.get('token') };

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                data: JSON.stringify(o),
                dataType: 'json',
                type: 'POST',
                success: function (response, textStatus, jqXHR) {
                    that.set(response);

                    if (!options.undo)
                        that.collection.add(new Transcript());

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

        'delete': function (options) {
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                dataType: 'json',
                type: 'DELETE',
                success: function (response, textStatus, jqXHR) {
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

    var Transcripts = Backbone.Collection.extend({
        model: Transcript
    });

    //#endregion

    //#region Qualification

    var Qualification = Backbone.Model.extend({

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

        'delete': function (options) {
            var that = this;

            $.ajax({
                url: this.url(),
                contentType: 'application/json',
                dataType: 'json',
                type: 'DELETE',
                success: function (response, textStatus, jqXHR) {
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
            duration: '',
            discipline: ''
        },

        url: function () {
            if (this.isNew())
                return url.positions.replace(':id', this.collection.jobseeker.id);
            else
                return url.positions.replace(':id', this.collection.jobseeker.id) + '/' + this.id;
        }

    });

    var AccountingPosition = Position.extend({
    }, {
        create: function () {
            return new AccountingPosition({
                discipline: 'accounting',
                type: {
                    id: 1
                },
                isInternship: false
            });
        }
    });

    var ExtraCurricularPosition = Position.extend({
    }, {
        create: function () {
            return new ExtraCurricularPosition({
                discipline: 'extraCurricular'
            });
        }
    });

    var Positions = Backbone.Collection.extend({

        model: Position

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

        hideSavingState: function () {
            this.$el.children()
                .removeClass('invisible')
                    .end()
                    .find('.flex_loader_blue_mini')
                    .remove();
        },

        showSavingState: function () {
            this.$el.children()
                .addClass('invisible')
                    .end()
                    .prepend('<div class="flex_loader_blue_mini"></div>');
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
            'click .cancel': 'onCancelClick',
            'validate': 'validateIfReady'
        },

        onCancelClick: function () {
            // by default do nothing
        },

        onSaveSuccess: function (model, response) {
        },

        onSaveError: function (model, message) {
            this.hideSavingState();
            this.$('.message_error_server').text(message).show();
        },

        onValidationError: function (model, errors) {

            var $summary = this.$('.message_error_server');

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
                        .siblings('.error_inline')
                        .text(error.message)
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
            this.$('.error_inline').hide();
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

        selectDropdowns: function () {
            var that = this;
            this.$('select').each(function () {
                var $select = $(this);
                var name = $select.attr('name');
                var parts = name.split('.');
                var property = that.model.get(parts[0]);
                if (property) {
                    if (parts.length > 1)
                        $select.val(property[parts[1]]);
                    else
                        $select.val(property);
                }
            });
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
        },

        processResponse: function (response) {
            this.model.setFile(response.file.token, response.file.name);
        }

    });

    //#region FileUploadView

    var FileUploadView = UploadView.extend({

        source: null,

        template: _.template($('#file_upload').html()),

        events: {
            'change .resume_upload_input': 'initializeUpload'
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

            var file = this.$('.resume_upload_input')[0].files[0];
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
            this.processResponse(response);
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

        success: function (file, response) {
            this.processResponse(response);
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
                this.$('.resume_upload_menu_wrapper').append(this.addChildren(new DropboxUploadView({ model: this.model.file })).render().el);

            if (this.model.file.includeWeb)
                this.$('.resume_upload_menu_wrapper').append(this.addChildren(new WebUploadView({ model: this.model.file })).render().el);

            this.onStateChange(this.model.file, this.model.file.get('state'));
        },

        onSubmitFile: function () {
            this.$('form').submit();
        },

        showButton: function () {
            this.$('.resume_upload_title').show();
            this.$('.resume_upload_menu_wrapper').show();
            this.disposeChildren(this.fileUploadView);
            this.renderUploadButton();
        },

        renderUploadButton: function () {
            this.fileUploadView = this.addChildren(FileUploadView.create({ model: this.model.file, callback: this.$('input[name=callback]').val(), iframeId: this.$('iframe')[0].id }));
            this.fileUploadView.on('submit-file', this.onSubmitFile, this);
            this.$('.resume_upload_menu_wrapper').prepend(this.fileUploadView.render().el);
        },

        hideButton: function () {
            this.$('.resume_upload_menu_wrapper').hide();
            this.$('.resume_upload_title').hide();
        },

        onStateChange: function (file, state) {

            switch (state) {
                case 'idle':
                    return;
                case 'uploading':
                    this.$('.resume_upload_error').html('').hide();
                    this.$('.resume_upload_progress').html(this.uploadingTemplate(this.model.file.toJSON())).show();
                    this.hideButton();
                    return;
                case 'uploaded':
                    return;
                case 'error':
                    this.$('.resume_upload_error').html(this.errorTemplate(this.model.file.toJSON())).show();
                    this.$('.resume_upload_progress').html('').hide();
                    this.showButton();
                    return;
                default:
                    throw new Error(String.format('State {0} not supported.', state));
            }

        },

        onProgressChange: function (file, progress) {
            if (progress)
                this.$('.resume_upload_progress').html(this.progressTemplate(this.model.file.toJSON())).show();
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
            'click .jobseeker_profile_section_menu_item_replaceimage': 'onReplaceClick',
            'click .jobseeker_profile_section_menu_item_deleteimage': 'onDeleteClick',
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
            'click .jobseeker_profile_section_menu_item_cancel': 'onCancelClick'
        },

        onCancelClick: function () {
            this.dispose();
        }

    });

    //#endregion

    //#endregion

    //#region ResumeView

    var ResumeView = BaseView.extend({

        className: 'jobseeker_profile_section_wrapper jobseeker_profile_section_resume_wrapper',

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
            'click .jobseeker_profile_section_menu_item_replaceesume': 'onReplaceClick'
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

    //#region TranscriptsView

    var TranscriptsView = BaseView.extend({

        initialize: function (options) {
            this.listenTo(this.collection, 'add', this.renderTranscript);
        },

        renderTranscript: function (transcript) {
            this.$el.append(
                this.addChildren(
                    new TranscriptView({ model: transcript })
                ).render().el
            );
        },

        render: function () {

            var that = this;
            this.disposeAllChildren();
            this.collection.each(function (transcript) {
                that.renderTranscript(transcript);
            });

            return this;
        }

    });

    //#endregion

    //#region TranscriptView

    var TranscriptView = BaseView.extend({

        className: 'jobseeker_profile_section_wrapper jobseeker_profile_section_resume_wrapper relative jobseeker_spacer',

        initialize: function () {
            this.content = null;
        },

        renderDetails: function () {
            this.disposeChildren(this.content);
            this.content = this.addChildren(new TranscriptDetailsView({ model: this.model }));
            this.content.on('render-deleted', this.renderDeleted, this);
            this.$el.append(this.content.render().el);
        },

        renderEdit: function () {
            this.disposeChildren(this.content);
            this.content = this.addChildren(new TranscriptEditView({ model: this.model }));
            this.content.on('render-details', this.renderDetails, this);
            this.$el.append(this.content.render().el);
        },

        renderDeleted: function () {
            this.disposeChildren(this.content);
            this.content = this.addChildren(new TranscriptRemovedView({ model: this.model }));
            this.content.on('render-details', this.renderDetails, this);
            this.$el.append(this.content.render().el);
        },

        render: function () {
            if (this.model.isNew())
                this.renderEdit();
            else
                this.renderDetails();

            return this;
        }

    });

    var TranscriptDetailsView = BaseView.extend({

        template: _.template($('#transcript_details').html()),

        events: {
            'click [data-action=remove]': 'onRemoveClick'
        },

        onRemoveClick: function () {
            this.showSavingState();
            this.model['delete']({
                success: _.bind(this.onDeleteSuccess, this),
                error: _.bind(this.onDeleteError, this)
            });
        },

        onDeleteSuccess: function (model, response) {
            this.trigger('render-deleted');
        },

        onDeleteError: function (model, message) {
            this.hideSavingState();
            this.$('.message_error_server').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    var TranscriptEditView = FileView.extend({

        template: _.template($('#transcript_edit').html()),

        onSaveSuccess: function (model, response) {
            this.trigger('render-details');
        }

    });

    var TranscriptRemovedView = FileView.extend({

        template: _.template($('#transcript_removed').html()),

        className: 'jobseeker_profile_section jobseeker_profile_section_removed',

        events: {
            'click .jobseeker_profile_section_menu_item_undo': 'onUndoClick'
        },

        onUndoClick: function () {
            this.showSavingState();
            this.model.undo({
                success: _.bind(this.onUndoSuccess, this),
                error: _.bind(this.onUndoError, this)
            });
        },

        onUndoSuccess: function (model, response) {
            this.trigger('render-details');
        },

        onUndoError: function (model, message) {
            this.hideSavingState();
            this.$('.message_error_server').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

    //#endregion

    //#region SectionView

    var SectionView = BaseView.extend({

        initialize: function () {
            this.content = null;
        },

        events: {
            'click .jobseeker_profile_section_menu_item_edit': 'renderEdit',
            'click .jobseeker_profile_section_menu_item_cancel': 'onCancelClick'
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

    //#region QualificationsView

    var QualificationsView = BaseView.extend({

        events: {
            'click .jobseeker_profile_section_addnew': 'onAddNew'
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
            this.$('.jobseeker_profile_section_qualifications').append(
                view.render().el
            );
            return view;
        },

        render: function () {
            this.$el.html(this.template({ collection: this.collection }));
            this.renderItems();
            return this;
        }

    });

    //#region EducationsView

    var EducationsView = QualificationsView.extend({

        initialize: function () {
            this.listenTo(this.collection, 'add', this.renderLabels);
            this.listenTo(this.collection, 'remove', this.renderLabels);
        },

        newModel: function () {
            return new Education();
        },

        newView: function (model) {
            return new EducationView({ model: model });
        },

        template: _.template($('#educations').html()),
        headingTemplate: _.template($('#educations_heading').html()),
        noneHeadingTemplate: _.template($('#educations_none_heading').html()),
        addTextTemplate: _.template($('#educations_add_text').html()),
        noneAddTextTemplate: _.template($('#educations_none_add_text').html()),

        renderLabels: function () {
            if (this.collection.length)
                this.renderWithLabels();
            else
                this.renderNoneLabels();
        },

        renderWithLabels: function () {
            this.$('[data-outlet=heading]').html(this.headingTemplate());
            this.$('.jobseeker_profile_section_addnew').html(this.addTextTemplate());
        },

        renderNoneLabels: function () {
            this.$('[data-outlet=heading]').html(this.noneHeadingTemplate());
            this.$('.jobseeker_profile_section_addnew').html(this.noneAddTextTemplate());
        },

        render: function () {
            QualificationsView.prototype.render.call(this);
            this.renderLabels();

            return this;
        }

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

    var AccountingPositionsView = PositionsView.extend({

        newModel: function () {
            return AccountingPosition.create();
        },

        newView: function (model) {
            return new AccountingPositionView({ model: model });
        }

    });

    var ExtraCurricularPositionsView = PositionsView.extend({

        newModel: function () {
            return ExtraCurricularPosition.create();
        },

        newView: function (model) {
            return new ExtraCurricularPositionView({ model: model });
        }

    });

    //#endregion

    //#endregion

    //#region QualificationView

    var QualificationView = SectionView.extend({

    });

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

    var AccountingPositionView = PositionView.extend({

        editView: function () {
            return new AccountingPositionEditView({ model: this.model });
        }

    });

    var ExtraCurricularPositionView = PositionView.extend({

        editView: function () {
            return new ExtraCurricularPositionEditView({ model: this.model });
        }

    });

    //#endregion

    //#endregion

    //#region QualificationDetailsView

    var QualificationDetailsView = BaseView.extend({

        className: 'jobseeker_profile_section clearfix',

        events: {
            'click .jobseeker_profile_section_menu_item_remove': 'delete'
        },

        'delete': function () {
            this.showSavingState();
            this.model['delete']({
                success: _.bind(this.onDeleteSuccess, this),
                error: _.bind(this.onDeleteError, this)
            });
        },

        onDeleteSuccess: function (model, response) {
            this.trigger('render-deleted');
        },

        onDeleteError: function (model, message) {
            this.hideSavingState();
            this.$('.message_error_server').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

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

    //#endregion

    //#region QualificationEditView

    var QualificationEditView = BaseFormView.extend({

        className: 'jobseeker_profile_section_editable clearfix',

        events: function () {
            return _.extend({}, BaseFormView.prototype.events, {
                'click .jobseeker_profile_section_menu_item_remove': 'delete'
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

        onDeleteSuccess: function (model, response) {
            this.trigger('render-deleted');
        },

        onDeleteError: function (model, message) {
            this.hideSavingState();
            this.$('.message_error_server').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            if (this.model.isNew())
                this.$el.addClass('new');

            this.selectDropdowns();
            return this;
        }

    });

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
            this.$('.jobseeker_profile_section_position_end').fadeToggle('fast');
        },

        formPreProcess: function (attrs) {
            attrs.start = attrs.startMonth && attrs.startYear ? attrs.startYear + '-' + attrs.startMonth + '-01' : null;
            attrs.end = attrs.endMonth && attrs.endYear && !attrs.isCurrent ? attrs.endYear + '-' + attrs.endMonth + '-01' : null;
            delete attrs.startMonth;
            delete attrs.startYear;
            delete attrs.endMonth;
            delete attrs.endYear;
            delete attrs.isCurrent;
        },

        selectDropdowns: function () {
            var start = this.model.get('start');
            if (start) {
                this.$('select[name="startMonth"]').val(parseInt(start.split('-')[1], 10));
                this.$('select[name="startYear"]').val(parseInt(start.split('-')[0], 10));
            }

            var end = this.model.get('end');
            if (end) {
                this.$('select[name="endMonth"]').val(parseInt(end.split('-')[1], 10));
                this.$('select[name="endYear"]').val(parseInt(end.split('-')[0], 10));
            }
        }

    });

    var AccountingPositionEditView = PositionEditView.extend({

        formPreProcess: function (attrs) {
            PositionEditView.prototype.formPreProcess.call(this, attrs);
            attrs.type = {
                id: attrs['type.id']
            };
            delete attrs['type.id'];

            attrs.discipline = 'accounting';
        }
    });

    var ExtraCurricularPositionEditView = PositionEditView.extend({

        formPreProcess: function (attrs) {
            PositionEditView.prototype.formPreProcess.call(this, attrs);
            attrs.discipline = 'extraCurricular';
        }
    });

    //#endregion

    //#endregion

    //#region QualificationRemovedView

    var QualificationRemovedView = BaseView.extend({

        className: 'jobseeker_profile_section jobseeker_profile_section_removed',

        events: {
            'click .jobseeker_profile_section_menu_item_undo': 'onUndoClick'
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
            this.$('.message_error_server').text(message).show();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }

    });

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

    //#endregion

    return {
        init: function (options) {

            dropboxAppKey = options.dropboxAppKey;

            var jobseeker = new Jobseeker({
                id: options.jobseekerId
            });

            if (options.transcripts) {
                var transcripts = new Transcripts(options.transcripts.data);
                transcripts.jobseeker = jobseeker;
                transcripts.add(new Transcript());
                options.transcripts.outlet.append(
                    new TranscriptsView({
                        collection: transcripts
                    }).render().el
                );
            }

            if (options.resume) {
                var resume = new Resume(options.resume.data);
                resume.jobseeker = jobseeker;
                options.resume.outlet.append(
                    new ResumeView({
                        model: resume
                    }).render().el);
            }

            if (options.accountingPositions) {
                var accountingPositions = new Positions(options.accountingPositions.data);
                accountingPositions.jobseeker = jobseeker;
                if (!accountingPositions.length)
                    accountingPositions.add(AccountingPosition.create());

                options.accountingPositions.outlet.append(
                    new AccountingPositionsView({
                        collection: accountingPositions
                    }).render().el
                );
            }

            if (options.extraCurricularPositions) {
                var extraCurricularPositions = new Positions(options.extraCurricularPositions.data);
                extraCurricularPositions.jobseeker = jobseeker;
                if (!extraCurricularPositions.length)
                    extraCurricularPositions.add(ExtraCurricularPosition.create());

                options.extraCurricularPositions.outlet.append(
                    new ExtraCurricularPositionsView({
                        collection: extraCurricularPositions
                    }).render().el
                );
            }

            if (options.positions) {
                var positions = new Positions(options.positions.data);
                positions.jobseeker = jobseeker;
                if (!positions.length)
                    positions.add(new Position());

                options.positions.outlet.append(
                    new PositionsView({
                        collection: positions
                    }).render().el
                );
            }

            if (options.educations) {
                var educations = new Educations(options.educations.data);
                educations.jobseeker = jobseeker;

                options.educations.outlet.append(
                    new EducationsView({
                        collection: educations
                    }).render().el
                );
            }
        }
    }

}(jQuery));
