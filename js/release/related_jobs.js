(function(a){var c=3;a("[data-related-wrapper]").on("click","[data-related-close]",function(d){d.preventDefault();a(this).closest("[data-related-link]").slideUp();a("[data-related-wrapper] [data-related-link]").eq(c++).slideDown()});var b=function(d){if(d){a('[data-related-type="optimized"]').show().find("[data-related-link]:gt("+(c-1)+")").hide()}else{a('[data-related-type="default"]').show()}appInsights.trackEvent("RecommendedJobs",{mainJob:JOBCENTRE.ai.mainJob,recommendedJobs:JOBCENTRE.ai.recommendedJobs,optimized:d})};if(JOBCENTRE.optimize.length===0){JOBCENTRE.optimize={push:b}}else{b(JOBCENTRE.optimize[0])}}(jQuery));