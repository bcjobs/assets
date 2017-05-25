(function ($) {
    var push = function(enable){
      if(enable)
        $('[data-related-info]').show();

      appInsights.trackEvent('RecommendedJobs', {'mainJob': JOBCENTRE.ai.mainJob, 'recommendedJobs': JOBCENTRE.ai.recommendedJobs, 'optimized': enable});
    }
    if(JOBCENTRE.optimize.length === 0)
      JOBCENTRE.optimize = {push: push};
    else
      push(JOBCENTRE.optimize[0]);
}(jQuery));
