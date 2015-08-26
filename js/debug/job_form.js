var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobForm = (function ($) {

    var pageState,
        employer,
        tinyMceCssPath,
        restPath,
        jobPostDurationMax,
        today,
        labels,
        redirectOnSave,
        skipCreditCheckForTypeIds;

    //#region url

    var url = function (restPath) {
        url = {
            jobs: restPath + 'jobs'
        };
    };

    //#endregion

    //#region State

    var State = Backbone.Model.extend({
        defaults: {
            ready: false,
            error: null
        }
    });

    //#endregion

    //#region Job

    var Job = Backbone.Model.extend({

        draftKey: 'draft_job',

        defaults: {
            title: '',
            referenceId: '',
            confidential: false,
            closeDate: '',
            autoRefresh: false,
            categories: [],
            memberStatuses: [],
            careerLevels: [],
            positionType: null,
            trainingPosition: false,
            locations: [],
            description: '',
            applicantRoutingType: {
                id: 1
            },
            applicationEmail: '',
            applicationUrl: '',
            status: 'active'
        },

        initialize: function (attributes, options) {
            this.required = options.required;
            this.state = new State();
        },

        getCategoryIds: function () {
            return _.map(this.get('categories'), function (category) {
                return parseInt(category.id, 10);
            });
        },

        getMemberStatusIds: function () {
            return _.map(this.get('memberStatuses'), function (memberStatus) {
                return parseInt(memberStatus.id, 10);
            });
        },

        getCareerLevelIds: function () {
            return _.map(this.get('careerLevels'), function (careerLevel) {
                return parseInt(careerLevel.id, 10);
            });
        },

        getLocationDescription: function (index) {
            if (index >= this.get('locations').length)
                return '';

            return this.get('locations')[index].description;
        },

        getCloseDateOptions: function () {

            var start = !!this.get('activeDate') ? moment.utc(this.get('activeDate')) : moment.utc(today);

            var options = [];
            for (var i = 1; i <= jobPostDurationMax; i++) {
                var date = moment.utc(start).add(i, 'days');
                options.push({
                    value: date.format('YYYY-MM-DD'),
                    label: date.format('MMMM D, YYYY'),
                });
            }

            return options;
        },

        getCloseDate: function () {
            if (this.get('closeDate'))
                return this.get('closeDate');
            else
                return moment.utc(today).add(jobPostDurationMax, 'days').format('YYYY-MM-DD')
        },

        fetch: function (id) {
            var that = this;
            this.state.set({ ready: false, error: null });

            $.ajax({
                url: url.jobs + '/' + id,
                dataType: 'json',
                cache: false,
                type: 'GET',
                success: function (response, textStatus, jqXHR) {
                    that.set(that.parse(response));
                    that.state.set({ ready: true, error: null });
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    var error = jqXHR.status === 400
                                    ? JSON.parse(jqXHR.responseText).message
                                    : 'Error retrieving job.';

                    that.state.set({ error: error });
                }
            });
        },

        copyFrom: function (id) {
            var that = this;
            this.state.set({ ready: false, error: null });

            $.ajax({
                url: url.jobs + '/' + id,
                dataType: 'json',
                cache: false,
                type: 'GET',
                success: function (response, textStatus, jqXHR) {
                    delete response.id;
                    delete response.activeDate;
                    delete response.publishDate;
                    delete response.closeDate;

                    that.set(that.parse(response));
                    that.state.set({ ready: true, error: null });
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    var error = jqXHR.status === 400
                                    ? JSON.parse(jqXHR.responseText).message
                                    : 'Error retrieving job.';

                    that.state.set({ error: error });
                }
            });
        },

        validate: function () {
            var errors = [];

            if (!this.get('title').trim())
                errors.push({ name: 'title', message: 'Title is required.' });

            if (!this.get('categories').length)
                errors.push({ name: 'categoryIds', message: labels.jobCategory + ' is required.' });

            if (!this.get('categories').length > 3)
                errors.push({ name: 'categoryIds', message: 'Up to 3 ' + labels.jobCategories + ' allowed.' });

            if (this.required.memberStatusId && !this.get('memberStatuses').length)
                errors.push({ name: 'memberStatusIds', message: 'Member status is required.' });

            if (this.required.careerLevelId && !this.get('careerLevels').length)
                errors.push({ name: 'careerLevelIds', message: 'Career level is required.' });

            if (!this.get('positionType'))
                errors.push({ name: 'positionTypeId', message: 'Position type is required.' });

            if (!this.get('locations').length)
                errors.push({ name: 'location0', message: 'Location is required.' });

            if (!this.get('description').trim())
                errors.push({ name: 'description', message: 'Description is required.' });

            if (this.get('applicationEmail').trim() && !/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/.test(this.get('applicationEmail').trim()))
                errors.push({ name: 'applicationEmail', message: 'Email is invalid.' });

            if (this.get('applicationUrl').trim() && !/^(http:\/\/|https:\/\/)[-a-zA-Z0-9+&@#\/%=~_|$?!:;,.\*\(\)]*[a-zA-Z0-9+&@#\/%=~\-_|$]$/.test(this.get('applicationUrl').trim()))
                errors.push({ name: 'applicationUrl', message: 'URL is invalid.' });

            if (this.get('applicantRoutingType').id == 1 && !this.get('applicationEmail').trim())
                errors.push({ name: 'applicationEmail', message: 'Email is required.' });

            if (this.get('applicantRoutingType').id == 2 && !this.get('applicationUrl').trim())
                errors.push({ name: 'applicationUrl', message: 'URL is required.' });

            return errors;
        },

        submit: function () {
            var that = this;
            if (this.isNew() && !_.some(skipCreditCheckForTypeIds, function (skipId) { return that.get('positionType').id == skipId; }))
                checkCredits(_.bind(this.save, this));
            else
                this.save();
        },

        save: function () {

            var that = this;

            this.state.set({ ready: false, error: null });

            var method = this.isNew() ? 'POST' : 'PUT';
            var saveUrl = this.isNew() ? url.jobs : url.jobs + '/' + this.get('id');

            $.ajax({
                url: saveUrl,
                data: JSON.stringify(this.toJSON()),
                contentType: 'application/json',
                headers: { 'JC-RenewIfStale': false },
                dataType: 'json',
                cache: false,
                type: method,
                success: function (response, textStatus, jqXHR) {
                    if (JOBCENTRE.capabilities.localStorage)
                        localStorage.removeItem(that.draftKey);

                    pageState.set('isSavedToServer', true);

                    // this doesn't work because page gets reloaded immediately after showing the alertFloater
                    //if (jqXHR.getResponseHeader('JC-Warning'))
                    //    JOBCENTRE.alertFloater.show({
                    //        summary: jqXHR.getResponseHeader('JC-Warning'),
                    //        isError: false
                    //    });

                    window.location.href = String.format(redirectOnSave, response.id);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    var error = jqXHR.status === 400
                                    ? JSON.parse(jqXHR.responseText).message
                                    : 'Error saving job.';

                    that.state.set({ ready: true, error: null });
                    JOBCENTRE.alertFloater.show({
                        summary: error,
                        isError: true
                    });
                }
            });
        },

        restoreDraft: function () {
            if (!JOBCENTRE.capabilities.localStorage || !localStorage.getItem(this.draftKey))
                return;

            var draft;
            try {
                draft = JSON.parse(localStorage.getItem(this.draftKey));
            } catch (e) {
                return;
            }

            if (!draft.employer || draft.employer.id !== employer.id)
                return;

            delete draft.employer;

            this.set(draft);
        }

    });

    //#endregion

    // PageState

    // #region PageState

    var PageState = Backbone.Model.extend({
        defaults: {
            isNew: false,
            isDraftSaved: false,
            isSavedToServer: false,
        },

        initialize: function () {
            this.setup();
        },

        setup: function () {
            var that = this;
            window.onbeforeunload = function () {
                if (!that.get('isNew'))
                    return;

                if (!that.get('isDraftSaved'))
                    return;

                if (that.get('isSavedToServer'))
                    return;

                return 'Your job has not been published yet, but it will still be here when you come back.';
            }
        }

    });

    // #endregion

    // VIEWS

    //#region BaseView

    var BaseView = function (options) {

        this.parent = null;
        this.children = [];
        Backbone.View.apply(this, [options]);
    };

    _.extend(BaseView.prototype, Backbone.View.prototype, {

        errorTemplate: _.template($('#job_form_error').html()),

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

    //#region PageView

    var PageView = BaseView.extend({

        template: _.template($('#job_form_page').html()),

        render: function () {
            this.$el.html(this.template());

            this.$('[data-outlet=job]').append(
                this.addChildren(
                    new JobView({model: this.options.job})
                )
                .render().el
            );

            return this;
        }

    });

    //#region JobView

    var JobView = BaseView.extend({

        validatable: false,

        template: _.template($('#job_form_job').html()),

        initialize: function (options) {
            this.listenTo(this.model.state, 'change', this.render);
        },

        events: {
            'submit form': 'onSubmit',
            'change form': 'onChange',
            'keyup form': 'onKeyup'
        },

        onSubmit: function(e) {
            e.preventDefault();

            this.validatable = true;

            this.model.set(this.getFormValues());

            if (this.isValid())
                this.model.submit();
            else
                this.scrollToTopError();
        },

        onChange: function () {
            this.validateIfReady();

            if (this.model.isNew())
                this.saveDraft();
        },

        saveDraft: function () {

            if (!JOBCENTRE.capabilities.localStorage)
                return;

            localStorage.setItem(
                this.model.draftKey,
                JSON.stringify(
                    _.extend(
                        this.getFormValues(),
                        {
                            employer: {
                                id: employer.id
                            }
                        }
                    )
                )
            );

            pageState.set('isDraftSaved', true);
        },

        onKeyup: function (e) {
            if (e.which === 13)
                return;

            this.validateIfReady();
        },

        validateIfReady: function () {
            if (!this.validatable)
                return;

            this.model.set(this.getFormValues());
            this.isValid();
        },

        isValid: function () {
            this.$('[data-error]').removeAttr('data-error');
            this.$('.form-error').remove();

            var errors = this.model.validate();

            if (!errors.length)
                return true;

            var that = this;
            _.each(errors, function (error) {
                that.$('[name="' + error.name + '"]')
                    .attr('data-error', '')
                    .after('<div class="form-error">' + error.message + '</div>');

            });
        },

        scrollToTopError: function () {
            // For cross-browser compatibility, use window.pageYOffset instead of window.scrollY. Additionally, older versions of Internet Explorer (< 9) do not support either property and must be worked around by checking other non-standard properties.
            var y = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
            if (y > this.$('[data-error]').offset().top)
                window.scrollTo(0, this.$el.offset().top);
        },

        getFormValues: function () {
            var that = this;

            var attrs = {};
            this.$('input,textarea,select').each(function () {
                if (this.disabled)
                    return;

                if (this.type === 'radio' && !this.checked)
                    return;

                if (this.type === 'checkbox' && !this.checked)
                    return;

                // use jQuery.val() because this.value doesn't properly handle multiple selects
                attrs[this.name] =
                    attrs[this.name]
                    ? attrs[this.name] + ',' + $(this).val()
                    : $(this).val();
            });

            this.formPreProcess(attrs);
            return attrs;
        },

        formPreProcess: function (attrs) {

            attrs.applicantRoutingType = {
                id: attrs.applicantRoutingTypeId
            };
            delete attrs.applicantRoutingTypeId;

            // different values for attrs.categoryIds depending on whether multiple attribute is set or not.
            attrs.categories = [];
            if (attrs.categoryIds)
                attrs.categories = _.map(_.isString(attrs.categoryIds) ? attrs.categoryIds.split(',') : attrs.categoryIds, function (id) {
                    return { id: id };
                });
            
            delete attrs.categoryIds;

            if (attrs.memberStatusIds) {
                attrs.memberStatuses = _.map(attrs.memberStatusIds.split(','), function (id) {
                    return { id: id };
                });
                delete attrs.memberStatusIds;
            }

            if (attrs.careerLevelIds) {
                attrs.careerLevels = _.map(attrs.careerLevelIds, function (id) {
                    return { id: id };
                });
                delete attrs.careerLevelIds;
            }

            attrs.positionType = {
                id: attrs.positionTypeId
            };
            delete attrs.positionTypeId;

            attrs.confidential = attrs.confidential === '1';

            attrs.trainingPosition = attrs.trainingPosition === '1';

            attrs.locations = [];
            for (var i = 0; i < 3; i++) {
                if (attrs['location' + i])
                    attrs.locations.push({
                        description: attrs['location' + i]
                    });

                delete attrs['location' + i];
            }

            attrs.description = this.removeTinyMceComment(
                this.emptyIfNoTinyMceText(
                    tinyMCE.activeEditor.getContent()
                )
            );

        },

        bindSelect2: function() {
            this.$('select').select2();
        },

        bindTinyeMCE: function () {

            var elementId = 'description';

            var settings = {
                    validElements: [
                        ['a', 'href|target:_blank'],
                        ['strong/b'],
                        ['em/i'],
                        ['br'],
                        ['p'],
                        ['ul'],
                        ['ol'],
                        ['li']
                    ],
                    replacements: [
                        ['h1', 'strong'],
                        ['h2', 'strong'],
                        ['h3', 'strong'],
                        ['h4', 'strong'],
                        ['h5', 'strong']
                    ]
            };

            var validElements = function (settings) {
                return _.map(settings.validElements, function (element) {
                    if (element.length == 1)
                        return element;
                    if (element.length == 2)
                        return String.format('{0}[{1}]', element[0], element[1]);
                    throw new Error('Element length not supported.');
                }).join(',');
            };

            var allowedTags = function (settings) {
                var result = [];
                _.each(settings.validElements, function (element) {
                    _.each(element[0].split('/'), function (tag) {
                        result.push(String.format('<{0}>', tag));
                    });
                });
                return result.join('');
            };

            var stripTags = function (str, allowed_tags, replacements) {
                var key = '';
                var allowed = false;
                var matches = [];
                var allowed_array = [];
                var allowed_tag = '';
                var i = 0;
                var k = '';
                var html = '';
                var replacer = function (search, replace, str) {
                    return str.split(search).join(replace);
                };
                // Build allowes tags associative array
                if (allowed_tags) {
                    allowed_array = allowed_tags.match(/([a-zA-Z0-9]+)/gi);
                }

                str += '';

                // Match tags
                matches = str.match(/(<\/?[\S][^>]*>)/gi);
                // Go through all HTML tags
                for (key in matches) {
                    if (isNaN(key)) {
                        // IE7 Hack
                        continue;
                    }

                    // Save HTML tag
                    html = matches[key].toString();
                    // Is tag not in allowed list? Remove from str!
                    allowed = false;

                    // Go through all allowed tags
                    for (k in allowed_array) {
                        allowed_tag = allowed_array[k];
                        i = -1;

                        if (i != 0)
                            i = html.toLowerCase().indexOf('<' + allowed_tag + '>');
                        if (i != 0)
                            i = html.toLowerCase().indexOf('<' + allowed_tag + ' ');
                        if (i != 0)
                            i = html.toLowerCase().indexOf('</' + allowed_tag);

                        // Determine
                        if (i == 0) {
                            allowed = true;
                            break;
                        }
                    }
                    if (!allowed) {
                        for (tags in replacements) {
                            if (html.toLowerCase().indexOf('<' + replacements[tags][0] + '>') == 0 || html.toLowerCase().indexOf('<' + replacements[tags][0] + ' ') == 0) {
                                str = replacer(html, '<' + replacements[tags][1] + '>', str);
                                break;
                            }
                            if (html.toLowerCase().indexOf('</' + replacements[tags][0]) == 0) {
                                str = replacer(html, '</' + replacements[tags][1] + '>', str);
                                break;
                            }
                        }
                        str = replacer(html, '', str);
                    }
                }
                return str;
            };

            tinyMCE.init({
                mode: 'exact',
                elements: elementId,
                theme: 'advanced',
                plugins: 'paste',

                paste_text_sticky: true,
                setup: function (ed) {
                    ed.onInit.add(function (ed) {
                        ed.pasteAsPlainText = false;
                    });

                    ed.onChange.add(function (ed, l) {
                        $('#' + elementId).change();
                    });
                },

                paste_preprocess: function (pl, o) {
                    o.content = stripTags(o.content, allowedTags(settings), settings.replacements);
                },

                valid_elements: validElements(settings),

                content_css: tinyMceCssPath,

                theme_advanced_buttons1: 'bold,italic,separator,bullist,numlist,separator,undo,redo,separator,link,unlink',
                theme_advanced_buttons2: '',
                theme_advanced_buttons3: '',

                theme_advanced_toolbar_location: 'top',
                theme_advanced_toolbar_align: 'left',
                theme_advanced_statusbar_location: 'bottom',
                theme_advanced_resizing: false

            });
        },

        removeTinyMceComment: function (html) {
            // there's a bug in TinyMCE where pasting from Word retains comments some times
            return html.replace(/<\!--[\s\S]*?-->/g, '');
        },

        emptyIfNoTinyMceText: function (html) {
            // http://alastairc.ac/2010/03/removing-emtpy-html-tags-from-tinymce/
            var text = '';
            var tmp = document.createElement('div');

            tmp.innerHTML = html;
            if (!tmp.innerHTML)
                return '';


            text = tmp.textContent || tmp.innerText || '';
            text = text.replace(/\n/gi, '');
            text = text.replace(/\s/g, '');
            text = text.replace(/\t/g, '');

            if (text == '')
                return '';
            else
                return html;
        },

        bindLocationsSuggests: function () {

            var that = this;
            var execute = function () {
                for (var i = 0; i < 3; i++) {
                    that.$('input[name=location' + i + ']').each(function () {
                        var element = this;
                        $(this).jsonSuggest({
                            url: restPath + 'locations?pageSize=7',
                            textPropertyName: 'description',
                            minCharacters: 3,
                            onSelect: function () {
                                $(element).change();
                            }
                        });
                    });
                }
            };

            if (!$.contains(document.documentElement, this.el)) {

                // we need to let the input box render so that jsonSuggest can set the width of the suggest box off of it.
                setTimeout(execute, 10);
            } else {
                execute();
            }

        },

        bindUrlFixer: function () {
            this.$('input[name=applicationUrl]').change(function () {
                var regex = /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(##((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
                var url = $(this).val().trim();

                if (regex.test(url))
                    return;

                if (!regex.test('http://' + url))
                    return;

                $(this).val('http://' + url);
            });
        },

        bindTrainingPositionDisplay: function () {
            var that = this;
            this.$('input[name=trainingPosition]').change(function () {
                if ($(this).val() === '1')
                    that.$('[data-info=trainingPosition]').slideDown();
                else
                    that.$('[data-info=trainingPosition]').slideUp();
            });

            this.$('[data-info=trainingPosition]').toggle(
                this.$('input[name=trainingPosition]:checked').val() === '1'
            );
        },

        render: function () {

            if (this.renderState(this.model.state))
                return this;

            this.$el.html(this.template(this.model));
            this.bindSelect2();
            this.bindTinyeMCE();
            this.bindLocationsSuggests();
            this.bindUrlFixer();
            this.bindTrainingPositionDisplay();
            return this;
        }

    });

    //#endregion

    //#endregion

    return {
        init: function (options) {

            pageState = new PageState({
                isNew: !options.jobId
            });

            employer = options.employer;
            tinyMceCssPath = options.tinyMceCssPath;
            restPath = options.restPath;
            jobPostDurationMax = options.jobPostDurationMax;
            today = options.today;
            labels = options.labels;
            redirectOnSave = options.redirectOnSave;
            skipCreditCheckForTypeIds = options.skipCreditCheckForTypeIds;

            url(options.restPath);

            var job = new Job(null, { required: options.required });
            if (options.jobId) {
                job.fetch(options.jobId);
            } else if (options.copyFromJobId) {
                job.copyFrom(options.copyFromJobId);
                job.set('status', 'active');
            } else {
                job.set('applicationEmail', options.employer.email);
                job.set('status', 'active');
                job.restoreDraft();
                job.state.set('ready', true);
            }

            var pageView = new PageView({
                job: job
            });

            $('[data-outlet=page]').append(pageView.render().el);

        }
    }
    
}(jQuery));