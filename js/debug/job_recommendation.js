(function ($) {
    var click = function(jobId, recommender){
        if(!JOBCENTRE.capabilities.localStorage)
            return;

        var clicks = {};
        try {
            clicks = JSON.parse(localStorage.getItem('recommendationInfo'));
        } catch (e) {
            // Continue if it fails
        }

        if(clicks == null)
            clicks = {};

        clicks[jobId] = {'recommender': recommender, 'timestamp': new Date().getTime()};
        localStorage.setItem('recommendationInfo', JSON.stringify(clicks));
    };

    var view = function(jobId){
        addEvent(jobId, "View");
    };

    var apply = function(jobId){
        addEvent(jobId, "Apply");
    };

    var addEvent = function(jobId, jobEvent){
        if(!JOBCENTRE.capabilities.localStorage || !localStorage.getItem('recommendationInfo'))
            return;

        var clicks;
        try {
            clicks = JSON.parse(localStorage.getItem('recommendationInfo'));
        } catch (e) {
            return;
        }

        var click = clicks[jobId];
        // return if the jobEvent has already happened or if more than 24h have passed
        if (!click || !click.timestamp || !click.recommender || click[jobEvent] || (new Date().getTime() - click.timestamp) / (1000 * 60 * 60) > 24)
            return;

        click[jobEvent] = true;
        click.timestamp = new Date().getTime();

        clicks[jobId] = click;
        localStorage.setItem('recommendationInfo', JSON.stringify(clicks));
        appInsights.trackEvent('JobseekerRecommendedJob' + jobEvent, {'jobId': jobId, 'recommender': click.recommender});
    };

    JOBCENTRE.jobRecommendation = {click:click, view:view, apply:apply};
}(jQuery));
