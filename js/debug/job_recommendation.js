(function ($) {
    var click = function(jobid, recommender){
      if(!JOBCENTRE.capabilities.localStorage)
          return;

      var click = {'jobId': parseInt(jobid), 'recommender': recommender, 'timestamp': new Date().toISOString()};

      var clickArray = JSON.parse(window.localStorage.getItem('recommendationInfo'));
      if(clickArray == null)
          clickArray = [];

      clickArray.push(click);
      window.localStorage.setItem('recommendationInfo', JSON.stringify(clickArray));
    };

    var view = function(jobId){
      addEvent(jobId, "View");
    };

    var apply = function(jobId){
      addEvent(jobId, "Apply");
    };

    var addEvent = function(jobId, jobEvent){
      if(!JOBCENTRE.capabilities.localStorage)
          return;

      var clickArray = JSON.parse(window.localStorage.getItem('recommendationInfo'));
      if(clickArray == null)
          return;

      // Only find index if jobEvent hasn't happened previously
      var clickIndex = clickArray.map(function(e){return e.jobId;}).indexOf(parseInt(jobId));

      // return if the jobEvent has already happened or if more than 24h have passed
      if(clickIndex == -1 || clickArray[clickIndex][jobEvent] !== undefined || hoursBetweenDates(new Date(clickArray[clickIndex].timestamp), new Date()) > 24)
          return;

      clickArray[clickIndex][jobEvent] = true;
      clickArray[clickIndex].timestamp = new Date().toISOString();
      window.localStorage.setItem('recommendationInfo', JSON.stringify(clickArray));
      appInsights.trackEvent('JobseekerRecommendedJob' + jobEvent, {'jobId': clickArray[clickIndex].jobId, 'recommender': clickArray[clickIndex].recommender});
    };

    var hoursBetweenDates = function(d1, d2){
      return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60);
    };

    JOBCENTRE.jobRecommendation = {click:click, view:view, apply:apply};
}(jQuery));
