var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobSearchForm = (function ($) {

    return {
        init: function (options) {
            $('input[name=location]').select2({
                minimumInputLength: 3,
                allowClear: true,
                ajax: {
                    url: '/api/v1.1/locations?pageSize=5&types=town%2Cprovince%2Cterritory',
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
                        url: '/api/v1.1/locations?pageSize=1&types=town%2Cprovince%2Cterritory',
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
        }
    }

}(jQuery));