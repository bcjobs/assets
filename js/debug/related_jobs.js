var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.relatedJobs = (function ($) {
  return {
    hideRelatedJob: function(ele, e){
      e.preventDefault();
      $('[data-related-id=' + parseInt($(ele).attr("data-related-id")) + ']').hide();
      if(JOBCENTRE.relatedJobsNextItem === undefined){
        //Initialize to 4 as we start out displaying 3 jobs
        JOBCENTRE.relatedJobsNextItem = 4;
      }
      var newRelatedJob = $('[data-related-id=' + JOBCENTRE.relatedJobsNextItem++ + ']');
      if(newRelatedJob !== undefined){
          // Remove style attribute to reveal element without breaking css
          newRelatedJob.removeAttr("style");
      }
    },
    optimizeRelatedJobs: function(){
      if(window.optimize !== undefined && window.optimize.relatedJobs === 1){
        $(".related-jobs-optimize").show();
        $(".related-jobs-original").hide();
      }
    }
  };

}(jQuery));
