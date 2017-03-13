(function ($) {
    var relatedJobsNextItem = 3;
    $('[data-related-wrapper]').on('click', '[data-related-close]', function(e){
        e.preventDefault();
        $(this)
            .closest('[data-related-link]')
            .slideUp();

        $('[data-related-wrapper] [data-related-link]')
            .eq(relatedJobsNextItem++)
            .slideDown();
    });

    if(window.optimize !== undefined && window.optimize.relatedJobs === 1){
        $('[data-related-type="optimized"]')
            .show()
            .find('[data-related-link]:gt('+ (relatedJobsNextItem - 1) + ')')
            .hide();
    } else {
        $('[data-related-type="default"]').show();
    }
}(jQuery));
