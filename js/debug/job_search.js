var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobSearch = (function ($) {

    var restPath, labels;

    //#region url

    var url = function (restPath) {
        url = {
            jobs: restPath + 'public/jobs',
            jobCategories: restPath + 'jobcategories',
            careerLevels: restPath + 'careerlevels',
            memberStatuses: restPath + 'memberstatuses',
            locations: restPath + 'locations?pageSize=5&types=town%2Cprovince%2Cterritory',
            log: restPath + 'public/jobs/log',
            jobAlerts: restPath + 'jobalerts/fromjobsearch'
        }
    };

    //#endregion

    // MODELS

    //#region State

    var State = Backbone.Model.extend({
        defaults: {
            ready: false,
            error: null
        }
    });

    //#endregion

    //#region AdSense

    var AdSense = Backbone.Model.extend({
    });

    //#endregion

    //#region Search

    var Search = Backbone.Model.extend({
        defaults: {
            page: 1,
            q: '',
            location: '',
            range: 0,
            freshness: 0,
            categoryIds: '',
            careerLevelIds: '',
            memberStatusIds: '',
            featuredEmployersOnly: false,
            trainingPositionsOnly: false,
            positionTypeIds: '',
            employerTypeIds: ''
        },

        getCategoryIds: function () {
            return this.getIds('categoryIds');
        },

        getCareerLevelIds: function () {
            return this.getIds('careerLevelIds');
        },

        getMemberStatusIds: function () {
            return this.getIds('memberStatusIds');
        },

        getPositionTypeIds: function () {
            return this.getIds('positionTypeIds');
        },

        getEmployerTypeIds: function () {
            return this.getIds('employerTypeIds');
        },

        getIds: function (property) {
            if (!this.get(property).toString().length)
                return [];

            return this.get(property).toString().split(',');
        },

        toQueryString: function () {
            var json = this.toJSON();
            var obj = {};
            for (var prop in json) {
                if (json.hasOwnProperty(prop))
                    if (json[prop])
                        obj[prop] = json[prop]
            }
            return $.param(obj);
        },

        toFullQueryString: function () {
            return $.param(this.toJSON());
        },

        jobAlertsUrl: function (email) {
            return url.jobAlerts + '?email=' + email + '&' + this.toQueryString();
        },

        subscribeJobAlert: function (email, options) {
            options || (options = {});

            var that = this;
            $.ajax({
                url: this.jobAlertsUrl(email),
                dataType: 'json',
                cache: false,
                type: 'POST',
                success: function (response, textStatus, jqXHR) {
                    if (options.success)
                        options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        var response = JSON.parse(jqXHR.responseText);

                        if (options.error) {
                            options.error(that, [response.message]);
                            return;
                        }
                    }

                    if (options.error)
                        options.error(that, ['Error connecting to the server.'])
                }
            });
        }
    });

    //#endregion

    //#region PagedCollection

    var Pagination = Backbone.Model.extend({
        defaults: {
            page: 1,
            pageSize: 20,
            total: 0
        },

        pages: function () {
            return Math.ceil(this.get('total') / this.get('pageSize'));
        },

        prev: function () {
            if (this.get('page') > 1)
                return this.get('page') - 1
            else
                return null;
        },

        next: function () {
            if (this.get('page') < this.pages())
                return this.get('page') + 1;
            else
                null;
        },

        toJSON: function (options) {
            var json = Backbone.Model.prototype.toJSON.call(this, options);
            json.pages = this.pages();
            json.prev = this.prev();
            json.next = this.next();
            return json;
        }

    });

    var PagedCollection = function (models, options) {

        Backbone.Collection.apply(this, [models, options]);
        options || (options = {});

        this.pagination = new Pagination(options.pagination || {});

        this.state = new State();
    };

    _.extend(PagedCollection.prototype, Backbone.Collection.prototype, {

        to: function (page, options) {
            this.pagination.set('page', page);
            this.fetch(options);
        },

        url: function () {
            return '';
        },

        fetch: function (options) {

            var that = this;

            options || (options = {});
            this.state.set({ ready: false, error: null });

            if (this.$ajax)
                this.$ajax.abort();

            this.$ajax = $.ajax({
                url: this.url(),
                dataType: 'json',
                cache: false,
                type: 'GET',
                success: function (response, textStatus, jqXHR) {
                    that.state.set({ ready: true, error: null });
                    that.pagination.set({
                        page: response.paging.page,
                        pageSize: response.paging.pageSize,
                        total: response.paging.total
                    });
                    that.reset(that.parse(response.data), options);
                    if (options.success) options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.statusText === 'abort')
                        return;

                    var error = jqXHR.status === 400 
                        ? JSON.parse(jqXHR.responseText).message 
                        : String.format('Error retrieving {0} list.', that.modelDescription);

                    that.state.set({ error: error });

                    if (options.error) options.error(that, [error])
                }
            });
        }

    });

    PagedCollection.extend = Backbone.Collection.extend;

    //#endregion

    //#region Job

    var Job = Backbone.Model.extend({
    });

    var Jobs = PagedCollection.extend({
        model: Job,

        modelDescription: 'job',

        initialize: function (models, options) {
            this.timer = null;
            this.search = options.search;
            this.listenTo(this.search, 'change', this.onSearchChange);
        },

        to: function (page, options) {
            this.pagination.set('page', page);
            this.search.set('page', page, _.extend({ immediate: true, pageChange: true }, options));
        },

        url: function () {
            return url.jobs + '?' + this.search.toQueryString();
        },

        onSearchChange: function (model, options) {

            clearTimeout(this.timer);

            this.pagination.set('page', this.search.get('page'));

            if (options.immediate)
                this.fetch(options);
            else
                this.timer = setTimeout(_.bind(this.fetch, this, options), 500);
        }

    });

    //#endregion

    //#region ListItem

    var ListItem = Backbone.Model.extend({
    });

    var ListItems = Backbone.Collection.extend({

        model: ListItem,

        initialize: function () {
            this.state = new State();
        },

        fetch: function (options) {

            var that = this;

            options || (options = {});
            this.state.set({ ready: false, error: null });

            $.ajax({
                url: this.url(),
                dataType: 'json',
                cache: true,
                type: 'GET',
                success: function (response, textStatus, jqXHR) {
                    that.reset(response.data);
                    that.state.set({ ready: true, error: null });
                    if (options.success) options.success(that, response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    that.state.set({ error: 'Error retrieving ' + that.description + ' list.' });
                    if (options.error) options.error(that, ['Error retrieving ' + that.description + ' list.'])
                }
            });
        }

    });

    //#region JobCategory

    var JobCategory = ListItem.extend({
    });

    var JobCategories = ListItems.extend({

        model: JobCategory,

        description: 'Business Sector',

        url: function () {
            return url.jobCategories;
        }

    });

    //#endregion

    //#region CareerLevel

    var CareerLevel = ListItem.extend({
    });

    var CareerLevels = ListItems.extend({

        model: CareerLevel,

        description: 'Career Level',

        url: function () {
            return url.careerLevels;
        }

    });

    //#endregion

    //#region MemberStatus

    var MemberStatus = ListItem.extend({
    });

    var MemberStatuses = ListItems.extend({

        model: MemberStatus,

        description: 'Member Status',

        url: function () {
            return url.memberStatuses;
        }

    });

    //#endregion

    //#endregion

    // VIEWS

    //#region BaseView

    var BaseView = function (options) {

        this.parent = null;
        this.children = [];
        Backbone.View.apply(this, [options]);
    };

    _.extend(BaseView.prototype, Backbone.View.prototype, {

        errorTemplate: _.template($('#error_template').html()),

        loaderClass: 'flex-loader-mini',

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

    //#region PageUnderlayView

    var PageUnderlayView = BaseView.extend({
        className: 'overlay overlay-white overlay-absolute',

        events: {
            'click': 'onClick'
        },

        onClick: function () {
            this.trigger('clicked');
        },

        render: function () {
            this.$el.fadeIn();
            return this;
        },

        dispose: function () {
            var that = this;
            this.$el.fadeOut(function () {
                BaseView.prototype.dispose.apply(that);
            });
        }
    });

    //#endregion

    //#region AdSenseView

    var AdSenseView = BaseView.extend({

        tagName: 'ins',
        
        className: 'adsbygoogle',

        render: function () {
            this.$el.css({
                display: this.model.get('display'),
                height: this.model.get('height') + 'px'
            })
            .attr({
                'data-ad-client': this.model.get('adClient'),
                'data-ad-slot': this.model.get('adSlot'),
                'data-format': this.model.get('format')
            });

            if (this.model.get('width'))
                this.$el.css('width', this.model.get('width') + 'px');

            return this;
        }
    });

    //#endregion

    //#region PageView

    var PageView = BaseView.extend({

        el: $('#page')[0],

        initialize: function () {
            this.pageUnderlayView = null;
        },

        initializeMap: function () {
            if (this.searchBoxView)
                this.searchBoxView.initializeMap();
        },

        render: function () {
            this.searchBoxView = this.addChildren(SearchBoxView.create({
                el: $('#search_box')[0],
                type: this.type,
                search: this.options.search,
                enabled: this.options.enabled,
                defaultLocation: this.options.defaultLocation,
                provinces: this.options.provinces
            }));
            this.searchBoxView.render();

            return this;
        }
    });

    var SearchJobsPageView = PageView.extend({

        type: 'search_jobs',

        onRefineSearch: function () {
            this.$('[data-element="sidebar_filter"]').animate({
                left: '50%'
            });
            this.disposeChildren(this.pageUnderlayView);

            this.pageUnderlayView = new PageUnderlayView();
            this.pageUnderlayView.on('clicked', this.onRefineSearchEnd, this);
            $('body').append(this.pageUnderlayView.render().el);
        },

        onRefineSearchEnd: function () {
            this.$('[data-element="sidebar_filter"]').animate({
                left: '-100%'
            });
            this.disposeChildren(this.pageUnderlayView);
            this.pageUnderlayView = null;
        },

        renderAds: function () {
            var ads = 0;
            var width = window.innerWidth || document.documentElement.clientWidth;

            if (width > 949 && this.options.ads.left) {
                var leftView = new AdSenseView({ model: new AdSense(this.options.ads.left) });
                this.$('[data-outlet="left_ad"]').append(leftView.render().el);
                ads++;
            }

            if (width > 600 && this.options.ads.right) {
                var rightView = new AdSenseView({ model: new AdSense(this.options.ads.right) });
                this.$('[data-outlet="right_ad"]').append(rightView.render().el);
                ads++;
            }

            if (this.options.ads.bottom) {
                var bottomView = new AdSenseView({ model: new AdSense(this.options.ads.bottom) });
                this.$('[data-outlet="leaderboard"]').append(bottomView.render().el);
                ads++;
            }

            for (var i = 0; i < ads; i++)
                (adsbygoogle = window.adsbygoogle || []).push({});
        },

        render: function () {
            PageView.prototype.render.call(this)

            this.searchBoxView.on('refine-search-end', this.onRefineSearchEnd, this);

            var joblistView = this.addChildren(new JoblistView({ el: $('#joblist')[0], jobs: this.options.jobs }));
            joblistView.on('refine-search', this.onRefineSearch, this);
            joblistView.render();

            this.renderAds();

            return this;
        }
    });

    var SavedSearchPageView = PageView.extend({
        type: 'saved_search'
    });

    //#region SearchBoxView

    var SearchBoxView = BaseView.extend({

        template: _.template($('#search_box_template').html()),

        initializeMap: function () {
            if (this.locationView)
                this.locationView.initializeMap();
        }
    },
    {
        create: function (options) {
            switch (options.type) {
                case 'search_jobs':
                    return new SearchJobsSearchBoxView(options);
                    break;
                case 'saved_search':
                    return new SavedSearchSearchBoxView(options);
                    break;
                default:
                    throw new Error('type not supported.');
            }
        }
    });

    var SearchJobsSearchBoxView = SearchBoxView.extend({

        initialize: function (options) {
            this.listenTo(options.search, 'change', this.onSearchChange);
        },

        events: {
            'click [data-action="show_advanced"]': 'onShowAdvancedClick',
            'click [data-action="search"]': 'onSearchClick'
        },

        onShowAdvancedClick: function (e) {
            this.$('[data-action="show_advanced"]').slideUp();
            this.$('[data-action="search"].first').slideUp();
            this.$('[data-section=advanced]').slideDown();
        },

        onSearchClick: function () {
            this.trigger('refine-search-end');
        },

        onSearchChange: function () {
            this.setAdvancedOptionsVisibility();
        },

        setAdvancedOptionsVisibility: function () {
            if (this.options.search.get('categoryIds') || this.options.search.get('employerTypeIds') || this.options.search.get('positionTypeIds')) {
                this.$('[data-action="show_advanced"]').hide();
                this.$('[data-section=advanced]').show();
            }
        },

        render: function () {

            this.$el.html(this.template());

            var keywordsView = this.addChildren(new SearchBoxKeywordsView({ model: this.options.search }));
            this.$('[data-section=basic]').append(keywordsView.render().el);

            var freshnessView = this.addChildren(new SearchBoxFreshnessView({ model: this.options.search }));
            this.$('[data-section=basic]').append(freshnessView.render().el);

            if (this.options.enabled.memberStatusIds) {
                var memberStatusesView = this.addChildren(new SearchBoxMemberStatusesView({ model: this.options.search }));
                this.$('[data-section=basic]').append(memberStatusesView.render().el);
            }

            this.locationView = this.addChildren(new SearchBoxLocationView({ model: this.options.search, defaultLocation: this.options.defaultLocation, provinces: this.options.provinces }));
            this.$('[data-section=basic]').append(this.locationView.render().el);

            var categoriesView = this.addChildren(new SearchBoxCategoriesView({ model: this.options.search }));
            this.$('[data-section=advanced]').append(categoriesView.render().el);

            if (this.options.enabled.careerLevelIds) {
                var careerLevelsView = this.addChildren(new SearchBoxCareerLevelsView({ model: this.options.search }));
                this.$('[data-section=advanced]').append(careerLevelsView.render().el);
            }

            var employerTypeView = this.addChildren(new SearchBoxEmployerTypeView({ model: this.options.search, enabled: this.options.enabled }));
            this.$('[data-section=advanced]').append(employerTypeView.render().el);

            var jobTypeView = this.addChildren(new SearchBoxJobTypeView({ model: this.options.search, enabled: this.options.enabled }));
            this.$('[data-section=advanced]').append(jobTypeView.render().el);
            
            this.$('[data-section=advanced]').append('<div class="clearfix flex-mt15"><div data-action="search" class="search-jobs-widget-anchor btn btn-default pull-right">Search</div></div>');

            this.setAdvancedOptionsVisibility();

            return this;
        }

    });

    var SavedSearchSearchBoxView = SearchBoxView.extend({

        setAdvancedOptionsVisibility: function () {
            this.$('[data-action="show_advanced"]').hide();
        },

        render: function () {

            this.$el.html(this.template());

            var nameView = this.addChildren(new SearchBoxNameView({ model: this.options.search }));
            this.$('[data-section=basic]').append(nameView.render().el);

            var keywordsView = this.addChildren(new SearchBoxKeywordsView({ model: this.options.search }));
            this.$('[data-section=basic]').append(keywordsView.render().el);

            var freshnessView = this.addChildren(new SearchBoxFreshnessView({ model: this.options.search }));
            this.$('[data-section=basic]').append(freshnessView.render().el);

            if (this.options.enabled.memberStatusIds) {
                var memberStatusesView = this.addChildren(new SearchBoxMemberStatusesView({ model: this.options.search }));
                this.$('[data-section=basic]').append(memberStatusesView.render().el);
            }

            this.locationView = this.addChildren(new SearchBoxLocationView({ model: this.options.search, defaultLocation: this.options.defaultLocation, provinces: this.options.provinces }));
            this.$('[data-section=basic]').append(this.locationView.render().el);

            var categoriesView = this.addChildren(new SearchBoxCategoriesView({ model: this.options.search }));
            this.$('[data-section=basic]').append(categoriesView.render().el);

            if (this.options.enabled.careerLevelIds) {
                var careerLevelsView = this.addChildren(new SearchBoxCareerLevelsView({ model: this.options.search }));
                this.$('[data-section=basic]').append(careerLevelsView.render().el);
            }

            var employerTypeView = this.addChildren(new SearchBoxEmployerTypeView({ model: this.options.search, enabled: this.options.enabled }));
            this.$('[data-section=basic]').append(employerTypeView.render().el);

            var jobTypeView = this.addChildren(new SearchBoxJobTypeView({ model: this.options.search, enabled: this.options.enabled }));
            this.$('[data-section=basic]').append(jobTypeView.render().el);

            var emailFrequencyView = this.addChildren(new SearchBoxEmailFrequencyView({ model: this.options.search }));
            this.$('[data-section=basic]').append(emailFrequencyView.render().el);

            var submitButtonView = this.addChildren(new SearchBoxSubmitButtonView({ model: this.options.search }));
            this.$('[data-section=basic]').append(submitButtonView.render().el);

            this.setAdvancedOptionsVisibility();

            return this;
        }
    });

    //#region SearchBoxNameView

    var SearchBoxNameView = BaseView.extend({
        template: _.template($('#search_box_name_template').html()),

        className : "flex-mb5 text-center", 

        initialize: function () {
            this.listenTo(this.model, 'change:name', this.onModelChange);
        },

        events: {
            'keyup input': 'onInputChange'
        },

        onInputChange: function (e) {
            this.model.set({
                name: $(e.currentTarget).val().trim(),
                page: 1
            }, { source: this });
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#region SearchBoxKeywordsView

    var SearchBoxKeywordsView = BaseView.extend({
        template: _.template($('#search_box_keywords_template').html()),
        
        className : "flex-mb5",

        initialize: function () {
            this.listenTo(this.model, 'change:q', this.onModelChange);
        },

        events: {
            'keyup input': 'onInputChange',
            'search input': 'onInputChange', // for webkit "X" icon
            'webkitspeechchange input': 'onInputChange'
        },

        onInputChange: function (e) {
            this.model.set({
                q: $(e.currentTarget).val().trim(),
                page: 1
            }, { source: this });
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.render();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#region SearchBoxFreshnessView

    var SearchBoxFreshnessView = BaseView.extend({
        template: _.template($('#search_box_freshness_template').html()),
        
        className : "flex-mb5",

        initialize: function () {
            this.listenTo(this.model, 'change:freshness', this.onModelChange);
        },

        events: {
            'change select[name=freshness]': 'onFreshnessChange'
        },

        onFreshnessChange: function (e) {
            this.model.set({
                freshness: parseInt($(e.currentTarget).val(), 10),
                page: 1
            }, { source: this, immediate: true });
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.setSelection();
        },

        setSelection: function () {
            this.$('select[name=freshness]').select2('val', this.model.get('freshness'));
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));

            this.$('select').select2({
                containerCssClass: 'freshness',
                dropdownCssClass: 'freshness-dropdown'
            });

            this.setSelection();
            return this;
        }
    });

    //#endregion

    //#region SearchBoxLocationView

    var SearchBoxLocationView = BaseView.extend({
        template: _.template($('#search_box_location_template').html()),
        
        className : "flex-mb5",

        initialize: function () {
            this.map = null;
            this.mapLocation = null;
            this.circle = null;
            this.listenTo(this.model, 'change:location', this.onModelChange);
            this.listenTo(this.model, 'change:range', this.onModelChange);
        },

        events: {
            'change input[type=text]': 'onInputTextChange',
            'change select[name=range]': 'onRangeChange'
        },

        onInputTextChange: function (e) {
            this.$('[data-info=location_search_error]').hide();
            var range = $(e.currentTarget).val().trim() ? 10 : 0;
            this.model.set({
                location: $(e.currentTarget).val().trim(),
                range: range,
                page: 1
            }, { source: this, immediate: true });

            this.setSelectStates();
            if (this.map)
                this.setMapLocation();
        },

        onRangeChange: function (e) {
            this.model.set({
                range: parseInt($(e.currentTarget).val(), 10),
                page: 1
            }, { source: this, immediate: true });
            this.renderCircle();
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.setSelectStates();

            if (this.map)
                this.setMapLocation();
        },

        setMapLocation: function () {
            var that = this;

            if (!this.model.get('location')) {
                this.map.setCenter(new google.maps.LatLng(this.options.defaultLocation.latitude, this.options.defaultLocation.longitude));
                this.map.setZoom(this.options.defaultLocation.zoom);
                this.mapLocation = null;
                if (this.circle) {
                    this.circle.setMap(null);
                    this.circle = null;
                }
                return;
            }

            var province = this.options.provinces[this.model.get('location')];
            if (province) {
                this.map.setCenter(new google.maps.LatLng(province.latitude, province.longitude));
                this.map.setZoom(province.zoom);
                this.mapLocation = null;
                if (this.circle) {
                    this.circle.setMap(null);
                    this.circle = null;
                }
                return;
            }

            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                address: this.model.get('location').trim(),
                region: 'CA'
            }, function (results, status) {

                // https://developers.google.com/maps/documentation/javascript/geocoding
                if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
                    that.$('[data-info=location_search_error]').text('Location not found.').show();
                    return;
                }

                if (status !== google.maps.GeocoderStatus.OK) {
                    that.$('[data-info=location_search_error]').text('Location search error.').show();
                    return;
                }

                that.$('[data-info=location_search_error]').hide();
                that.mapLocation = {
                    latitude: results[0].geometry.location.lat(),
                    longitude: results[0].geometry.location.lng()
                };
                that.map.fitBounds(results[0].geometry.viewport);
                that.renderCircle();
            });
        },

        renderCircle: function () {
            if (!this.map)
                return;

            if (this.circle) {
                this.circle.setCenter(new google.maps.LatLng(this.mapLocation.latitude, this.mapLocation.longitude));
                this.circle.setRadius(this.model.get('range') * 1000);
            } else {
                this.circle = polygon = new google.maps.Circle({
                    center: new google.maps.LatLng(this.mapLocation.latitude, this.mapLocation.longitude),
                    radius: this.model.get('range') * 1000,
                    strokeColor: '#3a9de2',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#3a9de2',
                    fillOpacity: 0.3,
                    map: this.map
                });
            }
            this.map.fitBounds(this.circle.getBounds());
        },

        setSelectStates: function () {
            this.$('input[type=text]').select2('val', this.model.get('location'));
            this.$('select[name=range]').select2('val', this.model.get('range'));
            this.$('.range').toggle(!!this.model.get('location') && !this.options.provinces[this.model.get('location')]);
        },

        initializeMap: function () {
            this.map = new google.maps.Map(this.$('[data-outlet="map"]')[0], {
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true,
                draggable: false,
                disableDoubleClickZoom: true,
                scrollwheel: false
            });
            this.setMapLocation();
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));

            this.$('input[type=text]').select2({
                minimumInputLength: 3,
                allowClear: true,
                ajax: {
                    url: url.locations,
                    dataType: 'json',
                    data: function (term, page) {
                        return {
                            q: term
                        };
                    },
                    results: function (response, page) {
                        return { results: response.data };
                    }
                },
                initSelection: function ($element, callback) {
                    $.ajax({
                        url: restPath + 'locations?pageSize=1&types=town%2Cprovince%2Cterritory',
                        data: { q: $element.val() },
                        dataType: 'json',
                        type: 'GET',
                        success: function (response, textStatus, jqXHR) {
                            if (response.data.length)
                                callback(response.data[0]);
                        }
                    });
                },
                id: function (location) {
                    if (location)
                        return location.description;
                    else
                        return null;
                },
                formatResult: function (location) {
                    return location.description;
                },
                formatSelection: function (location) {
                    return location.description;
                }
            });
            this.$('select').select2({
                containerCssClass: 'range',
                dropdownCssClass: 'range-dropdown'
            });

            this.setSelectStates();

            return this;
        }
    });

    //#endregion

    //#region SearchBoxListItemsView

    var SearchBoxListItemsView = BaseView.extend({

        className: "flex-mb5",

        initialize: function () {
            this.select2Rendered = false;
            this.collection = new this.collectionType();
            this.collection.fetch();
            this.listenTo(this.collection.state, 'change', this.renderSelect);
            this.listenTo(this.model, 'change:' + this.property, this.onModelChange);
        },

        events: {
            'change select': 'onSelectChange',
            'click [data-action=try_again]': 'onTryAgainClick'
        },

        onSelectChange: function (e) {
            var changes = {};
            changes[this.property] = e.val.join(',');
            changes['page'] = 1;

            this.model.set(changes, { source: this, immediate: true });
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this || !this.select2Rendered)
                return;

            this.$('select').select2('val', this.model.getIds(this.property));
        },

        onTryAgainClick: function (e) {
            this.collection.fetch();
        },

        renderState: function (state) {
            if (state.get('error')) {
                this.$('[data-outlet]').html(this.errorTemplate({ error: state.get('error') }));
                return true;
            }

            if (!state.get('ready')) {
                this.renderLoader(this.$('[data-outlet]')[0]);
                return true;
            }

            return false;
        },

        renderSelect: function () {
            if (this.renderState(this.collection.state))
                return this;

            var that = this,
                output = [];

            output.push('<select name="' + this.property + '" multiple="multiple" style="width:100%;"><option value=""></option>');
            this.collection.each(function (item) {
                output.push(String.format(
                    '<option value="{0}"{1}>{2}</option>',
                    item.id,
                    _.any(that.model.getIds(that.property), function (id) { return id == item.id; }) ? ' selected="selected"' : '',
                    item.escape('name')
                ));
            });
            output.push('</select>');
            this.$('[data-outlet]').html(output.join(''));
            this.$('select').select2({
                placeholder: this.placeholder(),
                allowClear: true
            });
            this.select2Rendered = true;
        },

        render: function () {
            this.$el.html(this.template());
            this.renderSelect();
            return this;
        }
    });

    //#region SearchBoxCategoriesView

    var SearchBoxCategoriesView = SearchBoxListItemsView.extend({
        template: _.template($('#search_box_categories_template').html()),

        collectionType: JobCategories,

        property: 'categoryIds',

        placeholder: function () {
            return 'All ' + labels.jobCategories;
        }

    });

    //#endregion

    //#region SearchBoxCareerLevelsView

    var SearchBoxCareerLevelsView = SearchBoxListItemsView.extend({
        template: _.template($('#search_box_careerLevels_template').html()),

        collectionType: CareerLevels,

        property: 'careerLevelIds',

        placeholder: function () {
            return 'All Career Levels';
        }

    });

    //#endregion

    //#region SearchBoxMemberStatusesView

    var SearchBoxMemberStatusesView = SearchBoxListItemsView.extend({
        template: _.template($('#search_box_memberstatuses_template').html()),

        collectionType: MemberStatuses,

        property: 'memberStatusIds',

        placeholder: function () {
            return 'All CPA Statuses';
        }

    });

    //#endregion

    //#endregion

    //#region SearchBoxEmployerTypeView

    var SearchBoxEmployerTypeView = BaseView.extend({
        template: _.template($('#search_box_employertype_template').html()),
        
        className : "flex-mb5 text-center",

        initialize: function () {
            this.listenTo(this.model, 'change:employerTypeIds', this.onModelChange);
            this.listenTo(this.model, 'change:featuredEmployersOnly', this.onModelChange);
        },

        events: {
            'change input': 'onInputChange'
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.setSelection();
            this.setFeaturedSelection();
        },

        onInputChange: function () {
            var checked = this.$('input[name=employerTypeIds][type=checkbox]:checked').map(function () { return this.value }).get();
            this.model.set({
                employerTypeIds: checked.length === this.$('input[name=employerTypeIds][type=checkbox]').length ? '' : checked.join(','),
                featuredEmployersOnly: this.$('input[name=featuredEmployersOnly]').prop('checked'),
                page: 1
            }, { source: this, immediate: true });
        },

        setSelection: function () {
            var that = this;

            if (!this.model.getEmployerTypeIds().length) {
                this.$('input[name=employerTypeIds]').prop('checked', true);
                return;
            }

            this.$('input[name=employerTypeIds]').each(function () {
                $(this).prop('checked', _.contains(that.model.getEmployerTypeIds(), $(this).val()));
            });
        },

        setFeaturedSelection: function () {
            this.$('[name=featuredEmployersOnly]').prop('checked', this.model.get('featuredEmployersOnly'));
        },

        render: function () {
            this.$el.html(this.template({ model: this.model.toJSON(), enabled: this.options.enabled }));
            this.setSelection();
            this.setFeaturedSelection();
            return this;
        }
    });

    //#endregion

    //#region SearchBoxJobTypeView

    var SearchBoxJobTypeView = BaseView.extend({
        template: _.template($('#search_box_jobtype_template').html()),
        
        className : "flex-mb5  text-center",

        initialize: function () {
            this.listenTo(this.model, 'change:positionTypeIds', this.onModelChange);
            this.listenTo(this.model, 'change:trainingPositionsOnly', this.onModelChange);
        },

        events: {
            'change input': 'onInputChange'
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.setSelection();
            this.setTrainingPositionSelection();
        },

        onInputChange: function () {
            var checked = this.$('input[name=positionTypeIds][type=checkbox]:checked').map(function () { return this.value }).get();
            this.model.set({
                positionTypeIds: checked.length === this.$('input[name=positionTypeIds][type=checkbox]').length ? '' : checked.join(','),
                trainingPositionsOnly: this.$('input[name=trainingPositionsOnly]').prop('checked'),
                page: 1
            }, { source: this, immediate: true });
        },

        setSelection: function () {
            var that = this;

            if (!this.model.getPositionTypeIds().length) {
                this.$('input[name=positionTypeIds]').prop('checked', true)
                return;
            }

            this.$('input[name=positionTypeIds]').each(function () {
                $(this).prop('checked', _.contains(that.model.getPositionTypeIds(), $(this).val()));
            });
        },

        setTrainingPositionSelection: function() {
            this.$('[name=trainingPositionsOnly]').prop('checked', this.model.get('trainingPositionsOnly'));
        },

        render: function () {
            this.$el.html(this.template({ model: this.model.toJSON(), enabled: this.options.enabled }));
            this.setSelection();
            this.setTrainingPositionSelection();
            return this;
        }
    });

    //#endregion

    //#region SearchBoxEmailFrequencyView

    var SearchBoxEmailFrequencyView = BaseView.extend({
        template: _.template($('#search_box_emailfrequency_template').html()),
        
        className : "flex-mb5 flex-w100 text-center",

        initialize: function () {
            this.listenTo(this.model, 'change:emailFrequencyId', this.onModelChange);
        },

        events: {
            'change input[name=emailFrequencyId]': 'onInputChange'
        },

        onModelChange: function (model, previous, options) {
            if (options.source === this)
                return;

            this.setSelection();
        },

        onInputChange: function () {
            this.model.set({
                emailFrequency: this.$('input[name=emailFrequencyId]:checked').val(),
                page: 1
            }, { source: this, immediate: true });
        },

        setSelection: function () {
            this.$('input[name=emailFrequencyId]').filter('[value=' + this.model.get('emailFrequencyId') + ']').prop('checked', true);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.setSelection();
            return this;
        }
    });

    //#endregion

    //#region SearchBoxSubmitButtonView

    var SearchBoxSubmitButtonView = BaseView.extend({
        template: _.template($('#search_box_submitbutton_template').html()),

        className : 'flex-p10 flex-mt30 text-center flex-clear',

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#endregion

    //#region JoblistView

    var JoblistView = BaseView.extend({

        initialize: function () {
        },

        onPageChanged: function () {

            // For cross-browser compatibility, use window.pageYOffset instead of window.scrollY. Additionally, older versions of Internet Explorer (< 9) do not support either property and must be worked around by checking other non-standard properties.
            var y = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
            if (y > this.$el.offset().top)
                window.scrollTo(0, this.$el.offset().top);
        },

        onRefineSearch: function () {
            this.trigger('refine-search');
        },

        render: function () {
            var headerView = this.addChildren(new JoblistHeaderView({ el: $('#joblist_header'), jobs: this.options.jobs }));
            headerView.on('refine-search', this.onRefineSearch, this);
            headerView.render();

            var bodyView = this.addChildren(new JoblistBodyView({ el: $('#joblist-body-content'), jobs: this.options.jobs }));
            bodyView.render();

            var footerView = this.addChildren(new JoblistFooterView({ el: $('#joblist_footer'), jobs: this.options.jobs }));
            footerView.on('page-changed', this.onPageChanged, this);
            footerView.render();

            return this;
        }
    });

    //#region JoblistHeaderView

    var JoblistHeaderView = BaseView.extend({

        initialize: function (options) {
            this.listenTo(this.options.jobs, 'reset', this.renderTitle);
        },

        events: {
            'click [data-action="refine_search"]': 'onRefineSearchClick'
        },

        onRefineSearchClick: function () {
            this.trigger('refine-search');
        },

        renderTitle: function () {
            this.$('[data-outlet="total"]').html(this.options.jobs.pagination.get('total'));
            this.$('[data-element="title"]').remove();
        }
    });

    //#endregion

    //#region JoblistBodyView

    var JoblistBodyView = BaseView.extend({

        emptyTemplate: _.template($('#empty-joblist-template').html()),

        initialize: function (options) {
            this.listenTo(options.jobs.state, 'change', this.renderState);
            this.listenTo(options.jobs, 'reset', this.renderJobs);
            this.jobViews = null;
        },

        events: {
            'click [data-action=try_again]': 'onTryAgainClick'
        },

        onTryAgainClick: function (e) {
            this.options.jobs.fetch();
        },

        renderJobs: function () {
            if (this.renderState(this.options.jobs.state))
                return this;

            this.disposeChildren(this.jobViews);
            this.$el.empty();

            if (this.options.jobs.length === 0) {
                this.$el.html(this.emptyTemplate());
                return;
            }

            var that = this, els = [];
            this.jobViews = [];

            this.options.jobs.each(function (job, index) {
                var oddEvenClass = index % 2 == 0 ? 'even' : 'odd';
                var view = new JoblistItemView({
                    model: job,
                    className: 'list-item-wrapper clearfix ' + oddEvenClass,
                    attributes: {
                        href: job.get('url')
                    }
                });
                that.jobViews.push(view.render());
                els.push(view.el);
            });

            this.addChildren(this.jobViews);

            this.$el.empty().append(els);
        },

        renderState: function (state) {
            if (state.get('error')) {
                $(this.el).html(this.errorTemplate({ error: state.get('error') }));
                return true;
            }

            if (!state.get('ready')) {
                if (this.$('.overlay').length < 1)
                    $('<div class="overlay overlay-white overlay-absolute"></div>').appendTo(this.$el);

                return true;
            }

            return false;
        },

        render: function () {
            return this;
        }

    });

    //#region JoblistItemView

    var JoblistItemView = BaseView.extend({

        template: _.template($('#joblist_item_template').html()),

        tagName: 'a',

        events: {
            click: 'onClick'
        },

        onClick: function (e) {
            router.changeRoute({ replace: false });
        },

        render: function () {
            this.$el
                .attr('title', this.model.get('title'))
                .html(this.template(this.model.toJSON()));
            return this;
        }
    });

    //#endregion

    //#endregion

    //#region JoblistFooterView

    var JoblistFooterView = BaseView.extend({

        template: _.template($('#joblist_footer_template').html()),
        subscribedTemplate: _.template($('#joblist_footer_subscribed_template').html()),

        initialize: function (options) {
            this.listenTo(options.jobs.pagination, 'change', this.renderPagination);
            this.listenTo(options.jobs.search, 'change:page', this.renderPagination);
        },

        events: {
            'click [data-page]': 'onPageClick',
            'click [data-action=email]': 'onEmailClick'
        },

        onEmailClick: function (e) {
            this.renderSubscribe();
        },

        renderSubscribe: function () {
            var view = new JoblistFooterSubscribeView({
                search: this.options.jobs.search
            });
            view.on('subscribe-success', this.renderSubscribed, this);
            this.$('[data-outlet="subscription"]').empty().append(view.render().el);
        },

        renderSubscribed: function() {
            this.$('[data-outlet="subscription"]').html(this.subscribedTemplate());
        },

        onPageClick: function (e) {
            var that = this;
            e.preventDefault();
            this.options.jobs.to($(e.currentTarget).data('page'), {
                success: function () {
                    that.trigger('page-changed');
                },
                error: function () {
                    that.trigger('page-changed');
                }
            });
        },

        renderPagination: function () {
            $(this.el).show().empty().html(this.template({
                pagination: this.options.jobs.pagination.toJSON(),
                queryString: _.filter(this.options.jobs.search.toQueryString().split('&'), function(s) {
                    var pair = s.split('=');
                    return pair[0] != 'page';
                }).join('&'),
                showEmailButton: this.options.jobs.search.get('q') || this.options.jobs.search.getCategoryIds().length
            }));
            return this;
        }
    });

    //#region JoblistFooterSubscribeView

    var JoblistFooterSubscribeView = BaseView.extend({

        template: _.template($('#joblist_footer_subscribe_template').html()),

        tagName: 'form',

        events: {
            'submit': 'onSubmit'
        },

        onSubmit: function (e) {
            e.preventDefault();
            var that = this;
            
            var email = this.$('[name=email]').val();
            if (!this.isEmailValid(email)) {
                this.showError('Email is invalid.');
                this.$('input').first().focus();
                return;
            }

            this.showLoader();

            this.options.search.subscribeJobAlert(email, {
                success: function (search, response) {
                    dataLayer.push({ 'event': 'custom', 'eventCategory': 'App', 'eventAction': 'JobAlertSubscribe', 'eventLabel': 'Source:JobSearch', 'nonInteraction': false });
                    that.trigger('subscribe-success');
                },
                error: function (search, error) {
                    that.showError(error[0]);
                }
            })
        },

        showError: function (error) {
            this.$('[data-element="subscribe_message"]').hide();
            this.$('[data-element="subscribe_error"]').text(error).show();
            this.$('[data-element="subscribe_loader"]').hide();
        },

        showLoader: function () {
            this.$('[data-element="subscribe_message"]').hide();
            this.$('[data-element="subscribe_error"]').text('').hide();
            this.$('[data-element="subscribe_loader"]').show();
        },

        isEmailValid: function (email) {
            return /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/.test(email);
        },

        render: function () {
            var that = this;

            this.$el.html(this.template());

            var execute = function () {
                that.$('input').first().focus();
            };

            if (!$.contains(document.documentElement, this.el))
                setTimeout(execute, 10);
            else
                execute();

            return this;
        }

    });

    //#endregion

    //#endregion

    //#endregion

    //#endregion

    // ROUTER

    //#region Router

    var router;
    var Router = Backbone.Router.extend({

        initialize: function (options) {
            this.timer = null;
            this.initialQuery = options.query;
            this.enabled = options.enabled;
            this.defaultLocation = options.defaultLocation;
            this.provinces = options.provinces;
            this.search = new Search(options.query);
        },

        initializeMap: function () {
            this.pageView.initializeMap();
        },

        routes: {
            '*queryString': 'queryString'
        },

        queryString: function (queryString) {
            var query = queryString ? this.parse(queryString) : this.initialQuery;
            this.search.set(query, { source: this, immediate: true });
        },

        parse: function(queryString){
            var params = {};
            if(queryString){
                _.each(
                    _.map(queryString.split(/&/g),function(el,i){
                        var aux = el.split('='), o = {};
                        if(aux.length >= 1){
                            var val = undefined;
                            if (aux.length == 2) {
                                // we use jQuery.param to encode query strings, but it replaces %20 with +. We need to set + back to %20.
                                http://bugs.jquery.com/ticket/3400

                                val = decodeURIComponent(aux[1].replace(/\+/g, '%20'));
                            }

                            if (/^-?[\d\.]+$/g.test(val))
                                val = val * 1;
                            else if (/^((true)|(false))$/g.test(val)) {
                                if (val === 'true')
                                    val = true;
                                else
                                    val = false;
                            }

                            o[aux[0]] = val;
                        }
                        return o;
                    }),
                    function(o){
                        _.extend(params,o);
                    }
                );
            }
            return params;
        },

        changeRoute: function (options) {
        }

    });

    var SearchJobsRouter = Router.extend({

        initialize: function (options) {
            Router.prototype.initialize.call(this, options)

            this.listenTo(this.search, 'change', this.onSearchChange);
            this.jobs = new Jobs(
                options.jobs.data, {
                    pagination: _.pick(options.jobs.paging, 'page', 'pageSize', 'total'),
                    search: this.search
                });
            this.jobs.state.set({ ready: true, error: null });
            this.pageView = new SearchJobsPageView({ search: this.search, enabled: this.enabled, defaultLocation: this.defaultLocation, provinces: this.provinces, jobs: this.jobs, ads: options.ads });
            this.pageView.render();
        },

        changeRoute: function (options) {
            if (Backbone.history.fragment == this.search.toFullQueryString())
                return;

            options = _.extend({ trigger: false, replace: false }, options);
            this.navigate(this.search.toFullQueryString(), options);
            new Image().src = url.log + '?' + this.search.toQueryString();
        },

        onSearchChange: function (model, options) {
            if (options.source === this)
                return;

            clearInterval(this.timer);
            if (options.pageChange) {
                this.changeRoute({ replace: false });
            } else {
                this.timer = setTimeout(_.bind(this.changeRoute, this, { replace: false }), 4000);
            }
        }
    });

    var SavedSearchRouter = Router.extend({

        initialize: function (options) {
            Router.prototype.initialize.call(this, options)

            this.pageView = new SavedSearchPageView({ search: this.search, enabled: this.enabled, defaultLocation: this.defaultLocation, provinces: this.provinces });
            this.pageView.render();
        }

    });

    //#endregion

    //#region window.initializeMap

    window.initializeMap = function () {
        router.initializeMap();
    };

    //#endregion

    return {
        init: function (options) {

            restPath = options.restPath;
            labels = options.labels;
            url(options.restPath);

            switch (options.type) {
                case 'search_jobs':
                    router = new SearchJobsRouter(options);
                    break;
                case 'saved_search':
                    router = new SavedSearchRouter(options);
                    break
                default:
                    throw Error('options.type not supported.');
            }
            Backbone.history.start();
            
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://maps.googleapis.com/maps/api/js?v=3.10&key=AIzaSyA7GqDK9GlTQJQc-WqPi-HHJ45vAtHgXAI&sensor=false&region=CA&callback=initializeMap";
            document.body.appendChild(script);
        }
    }
    
}(jQuery));