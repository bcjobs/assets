var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.purchase = (function ($) {

    //#region url

    var url = {
        purchases: '/api/v1.1/purchases',

        // generic
        countries: '/api/v1.1/countries',
        provinces: '/api/v1.1/provinces?countryId=:id',
        taxcodes: '/api/v1.1/taxcodes',
        storedcards: '/api/v1.1/creditcards'
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
                if (!this.validations[attr]) continue;

                this.checkValidity(this.validations[attr], this.attributes[attr], attr, errors);
            }

            if (errors.length > 0) {
                this.trigger('validation-error', this, errors);
                return false;
            } else {
                return true;
            }
        },

        checkValidity: function (validationItems, value, attr, errors) {
            for (var item in validationItems) {

                // if the property name is not used to describe the validator, but rather it's there to show a nested property...
                if (!this._validators[item] && value[item] !== undefined) {
                    value = value[item];
                    validationItems = validationItems[item];
                    attr = attr + '.' + item;
                    this.checkValidity(validationItems, value, attr, errors);
                    continue;
                }

                if (!this._validators[item])
                    throw new Error('Validation ' + item + ' not supported.');

                this._validators[item](validationItems[item], attr, value, this.attributes, errors);
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

    //#region Session

    var Session = Backbone.Model.extend({

        defaults: {
            selectedNav: null
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

        getList: function (fresh) {
            if (!this._loaded)
                this._load(fresh);

            return this._list;
        },

        _load: function (fresh) {

            var that = this;

            if (!this._loading) {

                this._list.state.set({ ready: false, error: null });

                this._loading = true;

                var url = this.url;
                if (_.isFunction(url)) url = url.call(this);

                $.ajax({
                    url: url,
                    dataType: 'json',
                    cache: !fresh,
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
        url: function() {
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

    //#region TaxCode

    var TaxCode = Backbone.Model.extend();

    var TaxCodes = Backbone.Collection.extend({
        model: TaxCode,

        initialize: function () {
            this.state = new State();
        }
    });

    var TaxCodeCache = Cache.extend({

        collection: TaxCodes,
        primeTimer: 0,
        listName: 'taxcodes',
        url: function() {
            return url.taxcodes;
        },
        getTaxCodes: function () {
            return this.getList();
        }
    });

    //#endregion

    //#region StoredCard

    var StoredCard = Backbone.Model.extend();

    var StoredCards = Backbone.Collection.extend({
        model: StoredCard,

        initialize: function () {
            this.state = new State();
        }
    });

    var StoredCardCache = Cache.extend({

        collection: StoredCards,
        primeTimer: 0,
        listName: 'storedcards',
        url: function () {
            return url.storedcards;
        },
        getStoredCards: function () {
            return this.getList(true);
        }
    });

    //#endregion

    //#region CreditCard

    var CreditCard = BaseModel.extend({

        defaults: {
            storedCardId: '',
            holder: '',
            number: '',
            expiry: '',
            cvd: ''
        },

        expiryMonth: function () {
            if (!this.get('expiry'))
                return '';

            if (this.get('expiry').length < 2)
                return '';

            return this.get('expiry').substring(0, 2);
        },

        expiryYear: function () {
            if (!this.get('expiry'))
                return '';

            if (this.get('expiry').length !== 4)
                return '';

            return this.get('expiry').substring(2, 4);
        },

        validations: {
            holder: {
                required: {}
            },
            number: {
                required: {},
                custom: {
                    isValid: function (validationItem, attr, value, attrs) {

                        // based on http://en.wikipedia.org/wiki/Luhn

                        if (!value || value.trim() == '')
                            return false;

                        // accept only digits and dashes
                        if (/[^0-9-]+/.test(value))
                            return false;

                        var nCheck = 0,
				        nDigit = 0,
				        bEven = false;

                        value = value.replace(/\D/g, "");

                        for (var n = value.length - 1; n >= 0; n--) {
                            var cDigit = value.charAt(n);
                            var nDigit = parseInt(cDigit, 10);
                            if (bEven) {
                                if ((nDigit *= 2) > 9)
                                    nDigit -= 9;
                            }
                            nCheck += nDigit;
                            bEven = !bEven;
                        }

                        return (nCheck % 10) == 0;
                    },
                    message: ' is invalid'
                }
            },
            expiry: {
                required: {},
                regex: {
                    pattern: /^[0-9]{4}$/,
                    message: ' is not complete'
                }
            },
            cvd: {
                required: {},
                regex: {
                    pattern: /^[0-9]{3,4}$/
                }
            }
        }
    });

    //#endregion

    //#region Address

    var Address = BaseModel.extend({

        defaults: {
            contact: '',
            email: '',
            phone: '',
            street: '',
            city: '',
            postalCode: '',
            province: {},
            country: {}
        },

        validations: {
            contact: {
                required: {},
                maxLength: {
                    max: 256
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
                required: {},
                maxLength: {
                    max: 20
                },
                custom: {
                    isValid: function (validationItem, attr, value, attrs) {

                        if (!value || value.trim() == '')
                            return false;

                        var numbers = value.replace(/[^0-9]/g, '');
                        return numbers.length >= 10;
                    },
                    message: ' must be at least 10 numbers'
                }
            },
            street: {
                required: {},
                maxLength: {
                    max: 128
                }
            },
            city: {
                required: {},
                maxLength: {
                    max: 128
                }
            },
            postalCode: {
                required: {},
                regex: {
                    pattern: /(^[a-zA-Z][0-9][a-zA-Z]\s?[0-9][a-zA-Z][0-9]$)|(^[0-9]{5})$/
                }
            },
            province: {
                id: {
                    required: {}
                }
            },
            country: {
                id: {
                    required: {}
                }
            }
        }
    });

    //#endregion

    //#region Plan

    var Plan = Backbone.Model.extend({

        initialize: function() {
            this.addedOnTo = null;
        },

        discountedPrice: function () {
            if (this.get('discountRate') === 0)
                return this.get('price');

            return this.get('price') * (1 - this.get('discountRate'));
        },

        discountedText: function () {

            if (this.discountedPrice() % 1 === 0)
                return this.discountedPrice().toString();
            else
                return this.discountedPrice().toFixed(2);
        },

        discountedDescription: function () {
            if (!this.get('recurrencePeriod'))
                return this.discountedText();

            return this.discountedText() + ' /' + this.get('recurrencePeriod');
        },

        priceText: function () {
            if (this.get('price') % 1 === 0)
                return this.get('price').toString();
            else
                return this.get('price').toFixed(2);
        },

        getAddon: function() {
            var that = this;

            if (!this.get('addon'))
                return null;

            return this.collection.find(function (p) {
                return p.id == that.get('addon').id;
            });
        },

        getAddonPrompt: function () {
            if (!this.getAddon())
                return null;

            var difference = Math.ceil(this.getAddon().discountedPrice() - this.discountedPrice());

            return {
                line1: this.get('addon').prompt1,
                line2: this.get('addon').prompt2,
                line3: this.get('addon').prompt3
                    .replace('{difference}', difference)
                    .replace('{price}', this.getAddon().discountedPrice())
            };
        }
    });

    var Plans = Backbone.Collection.extend({

        model: Plan,

        forJobs: function () {
            return this.filter(function (p) {
                return p.get('type') === 'job';
            });
        },

        forJobsLine1: function () {
            return _.filter(this.forJobs(), function (p) {
                return p.get('line') === 1;
            });
        },

        forJobsLine2: function () {
            return _.filter(this.forJobs(), function (p) {
                return p.get('line') === 2;
            });
        },

        forResumes: function () {
            return this.filter(function (p) {
                return p.get('type') === 'resume';
            });
        }

    });

    //#endregion

    //#region Invoice

    var Invoice = Backbone.Model.extend({

        trackEcommerce: function () {
            var that = this;

            if (!window.dataLayer)
                return;

            dataLayer.push({
                'event' : 'transactionComplete',
                'transactionId': this.id,
                'transactionAffiliation': this.get('agent') ? 'Agent' : 'Employer',
                'transactionTotal': this.get('subtotal'),
                'transactionTax': this.get('tax'),
                'transactionShipping': 0,
                'transactionProducts': _.map(this.get('items'), function (item) {
                    return {
                        'sku': item.sku,
                        'name': item.description,
                        'category': item.category,
                        'price': item.amount,
                        'quantity': 1
                    };
                })
            });
        }
    });

    //#endregion

    //#region Purchase

    var Purchase = Backbone.Model.extend({

        defaults: {
            creditCard: new CreditCard(),
            address: new Address(),
            plan: null,
            invoice: null
        },
        
        initialize: function (attrs, options) {
            this.options = options;
            this.plans = new Plans(options.plans);
            this.taxCodes = new TaxCodeCache().getTaxCodes();
            this.storedCards = new StoredCardCache().getStoredCards();
            this.listenTo(this.storedCards.state, 'change', this.onStoredCardsStateChange);
        },

        onStoredCardsStateChange: function () {
            if (this.storedCards.state.get('ready'))
                if (this.storedCards.length > 0)
                    this.get('creditCard').set('storedCardId', this.storedCards.at(0).id);
        },

        trySetPlan: function (id) {

            var pk = this.plans.find(function (p) {
                return p.id == id;
            });

            if (!pk)
                return false;

            this.set('plan', pk);
            return true;
        },

        switchToAddonFrom: function(basePlan) {
            var addon = basePlan.getAddon();
            addon.addedOnTo = basePlan;
            this.trySetPlan(addon.id);
        },

        switchAwayFromAddon: function (addon) {
            // bad architecture warning:
            // we can't be sure that addon.addedOnTo is the correct one, b/c cleanup in case plan is switched to a whole new one isn't guaranteed.
            // code below is a workaround to compensate for it.

            // if we've selected an addon, switch away from it
            if (this.get('plan') === addon)
                this.trySetPlan(addon.addedOnTo.id);
        },

        taxRate: function () {
            if (!this.taxCodes.state.get('ready'))
                return 0;

            var that = this;
            var taxCode = this.taxCodes.find(function (taxCode) {
                if (!taxCode.get('province'))
                    return true;

                return taxCode.get('province').id == that.get('address').get('province').id;
            });

            if (!taxCode)
                return 0;

            return taxCode.get('rate');
        },

        taxAmount: function () {
            if (!this.get('plan'))
                return 0;

            return this.taxRate() * this.get('plan').discountedPrice();
        },

        taxAmountText: function () {

            if (this.taxAmount() % 1 === 0)
                return this.taxAmount().toString();
            else
                return this.taxAmount().toFixed(2);
        },

        taxAmountDescription: function () {

            if (!this.get('plan'))
                return '-';

            if (!this.get('plan').get('recurrencePeriod'))
                return this.taxAmountText();

            return this.taxAmountText() + ' /' + this.get('plan').get('recurrencePeriod');
        },

        total: function () {

            if (!this.get('plan'))
                return 0;

            return this.taxAmount() + this.get('plan').discountedPrice();
        },

        totalText: function () {
            if (this.total() % 1 === 0)
                return this.total().toString();
            else
                return this.total().toFixed(2);
        },

        totalDescription: function () {

            if (!this.get('plan'))
                return '-';

            if (!this.get('plan').get('recurrencePeriod'))
                return this.totalText();

            return this.totalText() + ' /' + this.get('plan').get('recurrencePeriod');
        },

        submit: function(options) {
            options || (options = {});

            if (this.get('creditCard').get('storedCardId'))
                this.save(_.extend(this.toJSON(), {
                    creditCard: {
                        id: this.get('creditCard').get('storedCardId')
                    }
                }), options);
            else if (this.options.stripePublishableKey)
                this.tokenizeCard(options);
            else
                this.save(this.toJSON(), options);
        },

        tokenizeCard: function (options) {
            var that = this;

            // TODO: set province and country
            Stripe.setPublishableKey(this.options.stripePublishableKey);
            Stripe.card.createToken({
                address_line1: this.get('address').get('street'),
                address_city: this.get('address').get('city'),
                address_state: 'BC',
                address_zip: this.get('address').get('postalCode'),
                address_country: 'Canada',
                name: this.get('creditCard').get('holder'),
                number: this.get('creditCard').get('number'),
                cvc: this.get('creditCard').get('cvd'),
                exp_month: this.get('creditCard').get('expiry').substr(0,2),
                exp_year: '20' + this.get('creditCard').get('expiry').substr(2, 2)
            }, function (status, response) {
                if (response.error)
                    options.error(that, response.error.message);
                else
                    that.save(_.extend(that.toJSON(), {
                        creditCard: {
                            token: response.id
                        }
                    }), options);
            });
        },

        save: function (payload, options) {
            options || (options = {});
            var that = this;

            // http://stackoverflow.com/a/20735169/188740
            // if an object being stringified has a method named toJSON, JSON.stringify will call that

            $.ajax({
                url: url.purchases,
                contentType: 'application/json',
                data: JSON.stringify(payload),
                dataType: 'json',
                type: 'POST',
                success: function (response, textStatus, jqXHR) {

                    that.set('invoice', new Invoice(response));
                    that.get('invoice').trackEcommerce();

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

    // VIEWS

    //#region BaseView

    var BaseView = function (options) {

        this.parent = null;
        this.children = [];
        Backbone.View.apply(this, [options]);
    };

    _.extend(BaseView.prototype, Backbone.View.prototype, {

        loaderTemplate: _.template($('#purchase_loader').html()),

        errorTemplate: _.template($('#purchase_error').html()),

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
            $(container).empty().html(this.loaderTemplate());
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

        if (this.modelName)
            this.listenTo(this.model.get(this.modelName), 'validation-error', this.onValidationError, this);
    };

    _.extend(BaseFormView.prototype, BaseView.prototype, {

        _validatable: false,

        events: {
            'submit': 'onSubmit',
            'keyup input,textarea': 'onKeyup',
            'change select,input': 'onChange', // bug input[type=checkbox] doesn't work.  needs debugging
            'validate': 'validateIfReady'
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

        onSaveSuccess: function (model, response) {
            this.hideSavingState();
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
                    var attr = this.mapFromModel(error.attr);
                    this.$('input[name="' + attr + '"],textarea[name="' + attr + '"],select[name="' + attr + '"]')
                        .each(function () {
                            if (this.tagName === 'SELECT') {
                                // don't add error class because the behaviour is unpredicable.
                                //$(this).siblings('.select2-container').addClass('error');
                            } else {
                                $(this).addClass('error');
                            }
                        })
                        .closest('.form-group')
                        .find('.form-error')
                        .html(error.message) // error.message will already be encoded.
                        .show();
                }
            }

        },

        onSubmit: function (e) {

            e.preventDefault();
            this._validatable = true;

            if (this.isValid())
                this.save();
        },

        save: function () {
        },

        mapToModel: function () {
            var that = this;

            var attrs = {};
            var serialized = this.$('form').serializeArray(); // consider using the technica in getFormValues, because serializeArray doesn't handle multiple selects properly.
            for (var i = 0, l = serialized.length; i < l; i++)
                attrs[serialized[i].name] = serialized[i].value;

            this.formPreProcess(attrs);
            this.model.get(this.modelName).set(attrs);
        },

        mapFromModel: function (attr) {
            return attr;
        },

        isValid: function () {
            this.$('.error').removeClass('error');
            this.$('[data-element="alert_danger_server"]').hide();
            this.$('.form-error').hide();
            return this.model.get(this.modelName).isValid();
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
            if ($target.attr('name') === 'country.id')
                this.onCountryChange();

            this.mapToModel();

            this.validateIfReady();
        },

        validateIfReady: function () {
            if (this._validatable)
                this.isValid();
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

    //#region ModalView

    var ModalView = BaseView.extend({

        template: _.template($('#purchase_modal').html()),

        className: 'modal fade',

        initialize: function () {
            this.navView = null;
            this.content = null;
        },

        getDirection: function (next, previous) {
            if (previous == null)
                return 0;

            if (next.position < previous.position)
                return -1;

            if (next.position > previous.position)
                return 1;

            return 0;
        },

        slideOut: function (view, direction) {

            if (view == null)
                return;

            if (direction === 0) {
                this.disposeChildren(view);
                return;
            }

            var that = this,
                $outlet = this.$('[data-outlet=panel]'),
                width = $outlet.width();

            $outlet.height($outlet.height())

            view.$el.stop(true).css({
                width: width + 'px',
                position: 'absolute'
            }).animate({
                left: width * -direction
            }, 300, function () {
                that.disposeChildren(view);
            });
        },

        slideIn: function (view, direction) {

            if (direction === 0) {
                this.$('[data-outlet=panel]').append(view.render().el);
                return;
            }

            var $outlet = this.$('[data-outlet=panel]').append(view.render().el)
            var width = $outlet.width();
            var outletChromeHeight = $outlet.outerHeight() - $outlet.height();
            var viewHeight = view.$el.outerHeight(true);

            view.trigger('sliding-in-started');
            view.$el.css({
                position: 'absolute',
                width: width + 'px',
                left: width * direction
            }).animate({
                left: 0
            }, 300, function () {
                view.$el.css({
                    position: 'static',
                    width: '100%'
                });
                view.trigger('sliding-in-ended');
            });

            $outlet.animate({
                height: viewHeight + outletChromeHeight
            }, 300, function () {
                $outlet.css('height', 'auto');
            });
        },

        renderPlansView: function () {
            this.renderPanel(new PlansPanelView({
                model: this.model
            }));
        },

        renderAddressView: function () {

            if (!this.model.get('plan')) {
                router.navigate('plans', true);
                return;
            }

            this.renderPanel(new AddressPanelView({
                model: this.model,
                countries: this.options.countries
            }));
        },

        renderAddonView: function () {

            if (!this.model.get('plan')) {
                router.navigate('plans', true);
                return;
            }

            if (!this.model.get('address').isValid()) {
                router.navigate('address', true);
                return;
            }

            // All of this complexity to create basePlan is because the user
            // could hit the back button after upgrading to addon. In that scenario,
            // we need to reset and offer the upgrade option again.
            var basePlan = this.model.get('plan').addedOnTo ?
                this.model.get('plan').addedOnTo :
                this.model.get('plan');

            this.renderPanel(new AddonPanelView({
                model: {
                    purchase: this.model,
                    basePlan: basePlan
                }
            }));
        },

        renderPaymentView: function () {

            if (!this.model.get('plan')) {
                router.navigate('plans', true);
                return;
            }

            if (!this.model.get('address').isValid()) {
                router.navigate('address', true);
                return;
            }

            this.renderPanel(new PaymentPanelView({
                model: this.model
            }));
        },

        renderFinishView: function () {

            if (!this.model.get('invoice')) {
                router.navigate('plans', true);
                return;
            }

            this.renderPanel(new FinishPanelView({
                model: this.model,
                session: this.options.session,
                callToActionLabel: this.options.callToActionLabel
            }));
        },

        renderPanel: function (panelView) {
            var previous = this.content;
            this.content = this.addChildren(panelView);
            var direction = this.getDirection(this.content, previous);
            this.slideOut(previous, direction);
            this.slideIn(this.content, direction);
        },

        render: function () {
            this.$el.html(this.template());

            this.navView = this.addChildren(
                new NavView({session: this.options.session})
            );

            this.$('[data-outlet=nav]').append(this.navView.render().el);
            return this;
        }

    });

    //#region NavView

    var NavView = BaseView.extend({

        template: _.template($('#purchase_nav').html()),

        className: 'purchase_nav',

        initialize: function () {
            this.listenTo(this.options.session, 'change:selectedNav', this.onNavChange);
        },

        events: {
            'click [data-render]': 'onRenderClick'
        },

        onNavChange: function () {
            this.$('.active').removeClass('active');
            $('[data-render=' + this.options.session.get('selectedNav') + ']').parent().addClass('active');
        },

        onRenderClick: function (e) {
            e.preventDefault();
            router.navigate($(e.currentTarget).data('render'), true);
        },

        render: function () {
            this.$el.html(this.template());
            return this;
        }
    });

    //#endregion

    //#region PanelView

    var PanelView = BaseFormView.extend({
        render: function () {
            this.$el.html(this.template(this.model));
            return this;
        }
    });

    //#region PlansPanelView

    var PlansPanelView = PanelView.extend({

        position: 1,

        template: _.template($('#purchase_panel_plans').html()),

        className: 'panel panel_plans',

        events: {
            'click [data-plan]': 'onPlanClick'
        },

        onPlanClick: function (e) {
            e.preventDefault();
            if (this.model.trySetPlan($(e.currentTarget).data('plan')))
                router.navigate('address', true);
        }

    });

    //#endregion

    //#region AddressPanelView

    var AddressPanelView = PanelView.extend({

        position: 2,

        modelName: 'address',

        template: _.template($('#purchase_panel_address').html()),

        className: 'panel panel_address',

        initialize: function (options) {
            this._currentProvinces = null;
            this.listenTo(options.countries.state, 'change', this.render);
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
                            .find('.select2-container').css('visibility','hidden');
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
                    .css('visibility','visible');

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
                    (that.model.get('address').get('province').id == province.id) ? ' selected="selected"' : '',
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
                    (that.model.get('address').get('country').id == country.id) ? ' selected="selected"' : '',
                    country.get('name')
                ));
            });
            this.$('select[name="country.id"]').html(output.join(''));
            this.onCountryChange();
        },

        formPreProcess: function (attrs) {
            attrs.province = {
                id: attrs['province.id']
            };
            attrs.country = {
                id: attrs['country.id']
            };

            delete attrs['province.id'];
            delete attrs['country.id'];
        },

        save: function (attrs) {
            if (this.model.get('plan').getAddon())
                router.navigate('addon', true);
            else
                router.navigate('payment', true);
        },

        render: function() {
            if (this.renderState(this.options.countries.state))
                return this;

            this.$el.html(this.template(this.model));

            this.renderCountries();
            this.bindSelect2();

            return this;
        }

    });

    //#endregion

    //#region AddonPanelView

    var AddonPanelView = PanelView.extend({

        position: 3,

        template: _.template($('#purchase_panel_addon').html()),

        className: 'panel panel_addon',

        events: {
            'click [data-action]': 'onActionClick'
        },

        onActionClick: function (e) {
            e.preventDefault();
            if ($(e.currentTarget).data('action') === 'add')
                this.model.purchase.switchToAddonFrom(this.model.basePlan);
            else
                this.model.purchase.switchAwayFromAddon(this.model.basePlan.getAddon());

            router.navigate('payment', true);
        }

    });

    //#endregion

    //#region PaymentPanelView

    var PaymentPanelView = PanelView.extend({

        position: 4,

        modelName: 'creditCard',

        template: _.template($('#purchase_panel_payment').html()),

        className: 'panel panel_payment',

        initialize: function () {
            this.listenTo(this.model.taxCodes.state, 'change', this.render);
            this.listenTo(this.model.storedCards.state, 'change', this.render);
            this.listenTo(this.model.get('creditCard'), 'change:storedCardId', this.onStoredCardIdChange)
        },

        onStoredCardIdChange: function () {
            this.$('[data-element=new_creditcard_form]').toggle(!this.model.get('creditCard').get('storedCardId'));
        },

        isValid: function () {
            if (this.model.get('creditCard').get('storedCardId'))
                return true;
            else
                return BaseFormView.prototype.isValid.apply(this);
        },

        formPreProcess: function (attrs) {

            if (attrs.expiryMonth && attrs.expiryYear)
                attrs.expiry = attrs.expiryMonth.toString() + attrs.expiryYear.toString();
            else
                attrs.expiry = '';

            attrs.number = attrs.number.replace(/\s/g, '');
            delete attrs['expiryMonth'];
            delete attrs['expiryYear'];
        },

        mapFromModel: function (attr) {
            if (attr === 'expiry')
                return 'expiryMonth';

            return attr;
        },

        onSaveSuccess: function (model, response) {
            this.hideSavingState();
            router.navigate('finish', true);
        },

        save: function () {
            this.showSavingState();
            this.model.submit({
                success: _.bind(this.onSaveSuccess, this),
                error: _.bind(this.onSaveError, this)
            });
        },

        render: function () {
            if (this.renderState(this.model.taxCodes.state))
                return this;

            if (this.renderState(this.model.storedCards.state))
                return this;

            this.$el.html(this.template(this.model));
            this.onStoredCardIdChange();

            var that = this;
            setTimeout(function () {
                that.$('input').first().focus();
            }, 100);

            return this;
        }

    });

    //#endregion

    //#region FinishPanelView

    var FinishPanelView = PanelView.extend({

        position: 5,

        modelName: 'invoice',

        template: _.template($('#purchase_panel_final').html()),

        className: 'panel panel_invoice',

        render: function () {
            this.$el.html(this.template({
                invoice: this.model.get('invoice'),
                callToActionLabel: this.options.callToActionLabel
            }));
            return this;
        }

    });

    //#endregion


    //#endregion

    //#endregion

    // Routers

    //#region Router

    var router;
    var Router = Backbone.Router.extend({

        routes: {
            'plans': 'plans',
            'address': 'address',
            'addon': 'addon',
            'payment': 'payment',
            'finish': 'finish'
        },
        
        initialize: function (options) {

            router = this;
            this.options = options;
            this.started = false;

        },

        startUp: function() {
            this.started = true;
            
            this.session = new Session(null, this.options);

            this.purchase = new Purchase(null, this.options);

            var attrs = {};
            if (this.options.address)
                this.purchase.get('address').set(this.options.address);

            this.modalView = new ModalView({
                model: this.purchase,
                session: this.session,
                callToActionLabel: this.options.callToActionLabel,
                countries: new CountryCache().getCountries()
            });
            $('body').append(this.modalView.render().el);
            this.modalView
                .$el
                    .modal({
                        backdrop: 'static',
                        keyboard: false
                    })
                    .on('hidden.bs.modal', _.bind(this.tearDown, this));

            if (this.options.planId)
                if (this.purchase.trySetPlan(this.options.planId)) {
                    router.navigate('address');
                    router.address();
                    return;
                }

            router.navigate('plans');
            router.plans();
        },

        tearDown: function () {

            this.modalView.dispose();
            this.modalView = null;
            this.session = null;

            // this makes the window jump to the top
            //router.navigate('');

            router = null;

            Backbone.history.stop();
            
            if (this.purchase.get('invoice'))
                if (this.options.onPurchaseComplete)
                    this.options.onPurchaseComplete();
        },

        plans: function () {

            // ignore this call if it's being called from Backbone.history.start().
            // we're going to trigger it manually from startUp()
            if (!this.started)
                return;

            this.session.set('selectedNav', 'plans');
            this.modalView.renderPlansView();
        },

        addon: function () {
            if (!this.started)
                return;

            this.session.set('selectedNav', 'addon');
            this.modalView.renderAddonView();
        },

        address: function () {
            if (!this.started)
                return;

            this.session.set('selectedNav', 'address');
            this.modalView.renderAddressView();
        },

        payment: function () {
            if (!this.started)
                return;

            this.session.set('selectedNav', 'payment');
            this.modalView.renderPaymentView();
        },

        finish: function () {
            if (!this.started)
                return;

            this.session.set('selectedNav', 'finish');
            this.modalView.renderFinishView();
        }

    });

    //#endregion

    return {
        init: function (options) {

            var router = new Router(options);
            Backbone.history.start();
            router.startUp();

            this.init = function (options) {

                // after the first call, don't overwrite address with original values.
                if (options.address)
                    delete options.address;

                var router = new Router(options);
                Backbone.history.start();
                router.startUp();
            }

        }
    };
    
}(jQuery));

JOBCENTRE.ensurePlan = (function ($) {

    var SpinnerView = Backbone.View.extend({

        template: _.template($('#purchase_spinner').html()),

        className: 'overlay overlay-white overlay-fixed',

        render: function () {
            this.$el.html(this.template());
            return this;
        }

    });

    return {

        initJob: function (options) {

            this.showSpinner();
            options.isForJob = true;
            options.notValidPlan = _.bind(this.purchase, this);
            this.checkCredits(options);
            
        },

        showSpinner: function () {
            this.spinnerView = new SpinnerView();
            $('body').append(this.spinnerView.render().el);
        },

        removeSpinner: function () {
            this.spinnerView.remove();
        },

        checkCredits: function (options) {

            var that = this;
            $.ajax({
                url: '/services/RemoteServiceProxy.cfc?method=checkEmployerCredits&returnformat=json',
                dataType: 'json',
                cache: false,
                type: 'GET',
                success: function (response, textStatus, jqXHR) {

                    that.removeSpinner();

                    if (response.SUCCESS) {
                        if (options.isForJob) {
                            if (response.JOBPOST) {
                                if (options.onValidPlan)
                                    options.onValidPlan();

                                return;
                            }
                        } else {
                            if (response.RESUMEACCESS) {
                                if (options.onValidPlan)
                                    options.onValidPlan();

                                return;
                            }
                        }
                    }

                    options.notValidPlan(options);

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    that.removeSpinner();

                    if (jqXHR.status !== 401)
                        alert('Error connecting to the server. Please try again.');
                }
            });

        },

        purchase: function (options) {

            var that = this;
            options.onPurchaseComplete = function () {
                options.notValidPlan = that.noop;
                that.showSpinner();
                that.checkCredits(options);
            };

            JOBCENTRE.purchase.init(options);

        },

        noop: function () {
        }

    };

}(jQuery));