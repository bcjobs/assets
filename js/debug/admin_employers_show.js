var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.renderLocation = function(ipAddress){
    if (!ipAddress) return;
    $.ajax({
        url: '/admin/dashboard/partials/http_proxy?url=' + encodeURIComponent('http://api.ipinfodb.com/v3/ip-city/'),
        data: {
            key: '794a606d313d431ea470d4f27e0a36d1ec285191e2d89eba837815499092f9ab',
            ip: ipAddress,
            format: 'json'
        },
        cache: true,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            if (data.statusCode !== 'OK')
                return;

            var parts = [];
            if (data.cityName)
                parts.push(data.cityName);
            if (data.regionName)
                parts.push(data.regionName);
            if (data.countryName)
                parts.push(data.countryName);
            $('#ip_address').html(ipAddress + ' (' + parts.join(', ') + ')');
        }
    });
};


JOBCENTRE.renderFullStory = function(employerId, apiKey){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.fullstory.com/api/v1/sessions?limit=1&uid=' + encodeURI('employer-' + employerId), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Basic ' + apiKey);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var data = JSON.parse(xhr.responseText);
                if (!data.length)
                    return;

                var s = _.template(document.getElementById('fullstory').innerHTML, {
                    userId: data[0].UserId
                });
                $('[data-actions]').append(s);
            }
        }
    };
    xhr.send();
};

JOBCENTRE.renderNotes = function(employerId, currentNotes){

    var ajax = (function () {
            // borrowed from Spine.js

        var pending = false,
            requests = [],
            requestNext = function () {
                var next = requests.shift();
                if (next)
                    return request(next);
                else
                    return pending = false;
            },
            request = function (callback) {
                return (callback()).always(function () {
                    return requestNext();
                });
            },
            queue = function (callback) {
                if (pending) {
                    requests.push(callback);
                } else {
                    pending = true;
                    request(callback);
                }
                return callback;
            };

        window.onbeforeunload = function () {
            if (pending)
                return 'Changes are being saved to the server. They may be lost if you leave now.';
        }

        return {
            queue: queue
        }
    } ());

    var showNotes = function(notes) {
        var bCount = 0;
        while (notes.indexOf('**') >= 0) {
            notes = notes.replace('**', ++bCount % 2 ? '<strong>' : '</strong>');
        }
        $('[data-notes-display]').html(notes.replace(/\r?\n/g, '<br />'));
    };
    $('body').on('click','[data-trigger="notes-modal"]', function(){
        $('body').append(_.template(document.getElementById('notes-modal').innerHTML, {}));
        $('[data-note-modal]')
            .modal('show')
            .on('shown.bs.modal', function(){
                $(this)
                    .find('input')
                    .first()
                    .focus();
            })
            .on('hidden.bs.modal', function(){
                $(this).remove();
                $('.modal-backdrop').remove();
            });
    });
    $('body').on('submit', '[data-note-form]', function(e){
        e.preventDefault();
        ajax.queue(function () {
            return $.ajax({
                url: 'newnote?id=' + employerId,
                contentType: 'application/json',
                dataType: 'json',
                cache: false,
                type: 'POST',
                data: JSON.stringify({ title: $('input[name=title]').val(), description: $('input[name=description]').val() }),
                success: function (response, textStatus, jqXHR) {
                    showNotes(response.notes);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    JOBCENTRE.alertFloater.show({
                        summary: 'Error saving note',
                        duration: 5000,
                        isError: true
                    });
                }
            });
        });
        $('[data-note-modal]').modal('hide');
    });

    $('#notesSection').append(_.template(document.getElementById('notes').innerHTML, {}));
    showNotes(currentNotes);

};


JOBCENTRE.renderResumeAuthorize = function(authorized){
    $('span[id="ResumeAuthorized"]').append(_.template(document.getElementById('email-authorize').innerHTML, {}));
    $('input[name=ResumeAuthorized]').change(function() {
        if($('input[name=ResumeAuthorized]:checked').val() === '0') {
            $('#sendresumeauthorizedemail_wrapper').find('input[name=SendResumeAuthorizedEmail]').prop('checked', false);
            $('#sendresumeauthorizedemail_wrapper').hide();
            return;
        }

        $('#sendresumeauthorizedemail_wrapper').show();

        if (!authorized)
            $('#sendresumeauthorizedemail_wrapper').find('input[name=SendResumeAuthorizedEmail]').prop('checked', true);
    });
};
