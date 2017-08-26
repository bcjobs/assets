(function ($) {
    var click = function(jobid, recommender){
      if(!JOBCENTRE.capabilities.sessionStorage)
          return;

      var click = {'jobId': jobid, 'recommender': recommender, 'timestamp': new Date().toISOString()};

      var clickArray = JSON.parse(window.sessionStorage.getItem('recommendationInfo'));
      if(clickArray == null)
          clickArray = [];

      clickArray.push(click);
      window.sessionStorage.setItem('recommendationInfo', JSON.stringify(clickArray));
    };

    var view = function(jobId){
      addEvent(jobId, "View");
    };

    var apply = function(jobId){
      addEvent(jobId, "Apply");
    };

    var addEvent = function(jobId, jobEvent){
      if(!JOBCENTRE.capabilities.sessionStorage)
          return;

      var clickArray = JSON.parse(window.sessionStorage.getItem('recommendationInfo'));
      if(clickArray == null)
          return;

      // Only find index if jobEvent hasn't happened previously
      var clickIndex = clickArray.filter(function(e){return e[jobEvent] === undefined;}).map(function(e){return e.jobId;}).indexOf(jobId);

      if(clickIndex == -1)
          return;

      clickArray[clickIndex][jobEvent] = true;
      window.sessionStorage.setItem('recommendationInfo', JSON.stringify(clickArray));
      appInsights.trackEvent('JobseekerRecommendedJob' + jobEvent, {'jobId': clickArray[clickIndex].jobId, 'recommender': clickArray[clickIndex].recommender});
    };

    JOBCENTRE.jobRecommendation = {click:click, view:view, apply:apply};
}(jQuery));
