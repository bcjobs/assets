(function () {

    //#region SearchView

    var SearchView = Backbone.View.extend({

        el: $('[data-section="search"]')[0],

        initialize: function (options) {
            this.featuredEmployersView = options.featuredEmployersView;
            this.allEmployersView = options.allEmployersView;
            this.term = this.$('input[type="search"]').val();
            this.activeJobsOnly = this.$('[data-element="active-only-checkbox"]').hasClass('checked');
            this.filter();
        },

        events: {
            'change input[type="search"]': 'onTermChange',
            'keyup input[type="search"]': 'onTermChange',
            'click [data-action="toggle-active-jobs"]': 'onToggleActiveJobsClick'
        },

        onTermChange: function (e) {
            var term = $(e.currentTarget).val().trim();
            if (this.term == term)
                return;

            this.term = term;
            this.featuredEmployersView.filter(this.term);
            this.filter();
        },

        onToggleActiveJobsClick: function (e) {
            this.activeJobsOnly = $(e.currentTarget).find('[data-element="active-only-checkbox"]').toggleClass('checked').hasClass('checked');
            this.filter();
        },

        filter: function () {
            this.featuredEmployersView.filter(this.term, this.activeJobsOnly ? 1 : 0);
            this.allEmployersView.filter(this.term, this.activeJobsOnly ? 1 : 0);
        }

    });

    //#endregion

    //#region FilterableView

    var FilterableView = Backbone.View.extend({

        /* borrowed from jQuery.dataTables function: _fnEscapeRegex
        * Purpose:  scape a string stuch that it can be used in a regular expression
        * Returns:  string: - escaped string
        * Inputs:   string:sVal - string to escape
        */
        escapeRegex: function (sVal) {
            var acEscape = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\', '$', '^'];
            var reReplace = new RegExp('(\\' + acEscape.join('|\\') + ')', 'g');
            return sVal.replace(reReplace, '\\$1');
        },

        generateRegex: function (term) {
            /* borrowed from jQuery.dataTables
            * Generate the regular expression to use. Something along the lines of:
            * ^(?=.*?\bone\b)(?=.*?\btwo\b)(?=.*?\bthree\b).*$
            */
            var asSearch = this.escapeRegex(term).split(' ');
            var sRegExpString = '^(?=.*?' + asSearch.join(')(?=.*?') + ').*$';
            return new RegExp(sRegExpString, "i");
        },

        initialize: function () {

            var that = this;
            this.rows = [];

            this.$el.children().each(function () {
                // jQuery.text() is better than innerText because jQuery.text() retains line breaks
                // /\s\s+/g will match any double space, tab, and line breaks, and replace with a single space
                that.rows.push({
                    element: this,
                    text: $(this).text().replace(/\s\s+/g, ' '),
                    jobCount: parseInt($(this).data('job-count'), 10)
                });
            });
        },

        filter: function (term, atLeastJobCount) {
            var rpSearch = this.generateRegex(term);
            var filtered = []; // clone

            for (var i = 0; i < this.rows.length; i++)
                if (rpSearch.test(this.rows[i].text) && this.rows[i].jobCount >= atLeastJobCount)
                    filtered.push(this.rows[i].element);

            // maybe we need to detach instead?  That's what dataTables does.  Need to test.
            // this.$el.children().detach();
            this.$el.empty();
            this.$el.append(filtered);
        }

    });

    //#region FeaturedEmployersView

    var FeaturedEmployersView = FilterableView.extend({
        el: $('[data-section="featured"]')
    });

    //#endregion

    //#region AllEmployersView

    var AllEmployersView = FilterableView.extend({
        el: $('[data-section="all"]')
    });

    //#endregion

    //#endregion

    new SearchView({
        featuredEmployersView: new FeaturedEmployersView(),
        allEmployersView: new AllEmployersView()
    });

}());