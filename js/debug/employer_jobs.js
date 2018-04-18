var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.employerJobs = (function ($) {

    var employerPlan;
    var redirectOnDelete;

    //#region setup

    var setup = function () {

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

        $('[data-element="jobs"]').on('click', '[data-action]', function (e) {
            var jobId = $(this).closest('[data-id]').data('id');
            var jobTitle = $(this).closest('[data-title]').data('title');
            switch ($(this).data('action')) {
                case 'activate':
                    return tryActivate(jobId, jobTitle);
                case 'refresh':
                    return tryRefresh(jobId, jobTitle);
                case 'archive':
                    return tryArchive(jobId, jobTitle);
                case 'delete':
                    return tryDeleteJob(jobId, jobTitle);
            }
        });
    };

    //#endregion

    //#region overlay and status

    var requireCreditUseConfirmation = function () {
        // Only ask for confirmation if the employer had credit when page loaded.
        // For those that don't have credit, just try to post. Could result in 402, but if the employer purchased while on this page, confirmation to use credit is not required.
        return employerPlan.jobPackage.limit > 0;
    };

    var requireArchiveConfirmation = function () {
        return employerPlan.jobPackage.limit !== null;
    };

    var showOverlay = function () {
        $('[data-element="overlay"]').removeClass('hidden');
    };

    var hideOverlay = function () {
        $('[data-element="overlay"]').addClass('hidden');
    };

    var showError = function (message) {
        JOBCENTRE.alertFloater.show({
            summary: message,
            isError: true,
            duration: 6000
        });
    }

    //#endregion

    //#region modal

    var onContinue = null;
    $('[data-element="continue"]').on('click', function () {
        if (onContinue)
            onContinue();

        hideModal();
    });

    var showModal = function (title, description, callback) {
        $('[data-element="confirm-modal"]')
            .find('[data-element="modal-title"]').text(title)
            .end()
            .find('[data-element="modal-description"]').text(description)
            .end()
            .modal('show');

        onContinue = callback;
    };

    var hideModal = function () {
        onContinue = null;
        $('[data-element="confirm-modal"]')
            .find('[data-element="modal-title"]').text('')
            .end()
            .find('[data-element="modal-description"]').text('')
            .end()
            .modal('hide');
    };

    //#endregion

    //#region request

    var request = function (options) {
        showOverlay();
        $.ajax({
            url: options.url,
            dataType: 'json',
            type: options.method,
            contentType: 'application/json',
            data: options.payload ? JSON.stringify(options.payload) : null,
            success: function (response, textStatus, jqXHR) {
                if (options.onSuccess)
                    options.onSuccess();
                else
                    window.location.reload(true);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                
                if (jqXHR.status === 402) {
                    options.onInsufficientCredit && options.onInsufficientCredit();
                } else if (jqXHR.status >= 400 && jqXHR.status < 500) {
                    var response = JSON.parse(jqXHR.responseText);
                    showError(response.message);
                } else {
                    showError('Error connecting to the server.');
                }

                hideOverlay();
            }
        });
    };

    //#endregion

    //#region activate

    var tryActivate = function (jobId, jobTitle) {
        if (!requireCreditUseConfirmation())
            return activate(jobId);

        showModal('Publish: ' +  jobTitle, 'Will use 1 job credit. Do you wish to continue?', function () {
            activate(jobId);
        });
    };

    var activate = function (jobId) {
        request({
            url: '/api/v1.1/jobs/' + jobId,
            method: 'PUT',
            payload: {
                status: 'active'
            },
            onInsufficientCredit: function () {
                JOBCENTRE.purchaseModal.purchase(null, function () { activate(jobId); })
            }
        });
    };

    //#endregion

    //#region refresh
    
    var tryRefresh = function (jobId, jobTitle) {
        if (!requireCreditUseConfirmation())
            return refresh(jobId);

        showModal('Refresh date for: ' + jobTitle, 'Will use 1 job credit. Do you wish to continue?', function () {
            refresh(jobId);
        });
    };

    var refresh = function (jobId) {
        request({
            url: '/api/v1.1/jobs/' + jobId + '/refresh',
            method: 'POST',
            onInsufficientCredit: function () {
                JOBCENTRE.purchaseModal.purchase(null, function () { refresh(jobId); })
            }
        });
    };

    //#endregion

    //#region archive

    var tryArchive = function (jobId, jobTitle) {
        if (!requireArchiveConfirmation())
            return archive(jobId);

        showModal('Archive: ' + jobTitle, 'Do you wish to continue?', function () {
            archive(jobId);
        });
    };

    var archive = function (jobId) {
        request({
            url: '/api/v1.1/jobs/' + jobId,
            method: 'PUT',
            payload: {
                status: 'archived'
            }
        });
    };

    //#endregion

    //#region delete

    var tryDeleteJob = function (jobId, jobTitle) {
        showModal('Delete: ' + jobTitle, 'Do you wish to continue?', function () {
            deleteJob(jobId);
        });
    };

    var deleteJob = function (jobId) {
        request({
            url: '/api/v1.1/jobs/' + jobId,
            method: 'DELETE',
            onSuccess: redirectOnDelete ? function () {
                window.location.href = redirectOnDelete;
            } : null
        });
    };

    //#endregion

    return {
        init: function (options) {
            employerPlan = options.employerPlan;
            redirectOnDelete = options.redirectOnDelete;
            setup();
        }
    };

}(jQuery));