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
    var push = function(enable){
      if(enable)
        $('[data-related-type="optimized"]')
            .show()
            .find('[data-related-link]:gt('+ (relatedJobsNextItem - 1) + ')')
            .hide();
      else
        $('[data-related-type="default"]').show();

      appInsights.trackEvent('RecommendedJobs', {'mainJob': JOBCENTRE.ai.mainJob, 'recommendedJobs': JOBCENTRE.ai.recommendedJobs, 'optimized': enable});
    }
    if(JOBCENTRE.optimize.length === 0)
      JOBCENTRE.optimize = {push: push};
    else
      push(JOBCENTRE.optimize[0]);
}(jQuery));
