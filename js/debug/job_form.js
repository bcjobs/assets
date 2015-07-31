var JOBCENTRE = window.JOBCENTRE || {};

JOBCENTRE.jobForm = (function ($) {

    //#region bindTinyeMCE

    var bindTinyeMCE = function (elementId, cssPath) {
        tinyMCE.init({
            mode : 'exact',
            elements: elementId,
            theme : 'advanced',
            plugins : 'paste',	
			
            paste_text_sticky : true,
            setup : function(ed) {
                ed.onInit.add(function(ed) {
                    ed.pasteAsPlainText = true;
                });
            },
				
            valid_elements: 'a[href|target:_blank],strong/b,em/i,br,p,ul,ol,li',
            
            content_css: cssPath,
					
            theme_advanced_buttons1 : 'bold,italic,separator,bullist,numlist,separator,undo,redo,separator,link,unlink',
            theme_advanced_buttons2 : '',
            theme_advanced_buttons3 : '',
					
            theme_advanced_toolbar_location : 'top',
            theme_advanced_toolbar_align : 'left',
            theme_advanced_statusbar_location : 'bottom',
            theme_advanced_resizing : false
			
        });
    };

    //#endregion

    //#region emptyIfNoText

    var emptyIfNoText = function (html) {
        // http://alastairc.ac/2010/03/removing-emtpy-html-tags-from-tinymce/
        var text = '';
        var tmp = document.createElement('div');

        tmp.innerHTML = html;
        if (!tmp.innerHTML)
            return '';


        text = tmp.textContent || tmp.innerText || '';
        text = text.replace(/\n/gi, '');
        text = text.replace(/\s/g, '');
        text = text.replace(/\t/g, '');

        if (text == '')
            return '';
        else
            return html;
    };

    //#endregion

    //#region removeComment

    var removeComment = function (html) {
        // there's a bug in TinyMCE where pasting from Word retains comments some times
        return html.replace(/<\!--[\s\S]*?-->/g, '');
    };

    //#endregion

    //#region bindValidator

    var bindValidator = function (isJobNew, required, labels) {

        $.validator.addMethod("upToThreeItems", function (value, element) {
            return value.length <= 3;
        }, 'Up to 3 items allowed.');

        $('#job_form').validate({
            errorClass: 'form-error',
            rules: {
                Title: {
                    required: true
                },
                MemberStatusId: {
                    required: required.memberStatusId,
                },
                CareerLevelId: {
                    required: required.careerLevelId
                },
                JobCategoryId: {
                    required: true,
                    upToThreeItems: true
                },
                Location1: {
                    required: true
                },
                ContactEmail: {
                    email: true,
                    required: {
                        depends: function (element) {
                            return $('#ApplicantRoutingTypeId_1').is(':checked');
                        }
                    }
                },
                JobRerouteWebAddy: {
                    url: true,
                    required: {
                        depends: function (element) {
                            return $('#ApplicantRoutingTypeId_2').is(':checked');
                        }
                    }
                }
            },
            messages: {
                Title: {
                    required: 'Title is required.'
                },
                MemberStatusId: {
                    required: 'Member status is required.',
                },
                CareerLevelId: {
                    required: 'Career level is required.'
                },
                JobCategoryId: {
                    required: labels.jobCategory + ' is required.',
                    upToThreeItems: 'Up to 3 ' + labels.jobCategories + ' allowed.'
                },
                Location1: {
                    required: 'Location is required.'
                },
                ContactEmail: {
                    email: 'Email is invalid.',
                    required: 'Email is required.'
                },
                JobRerouteWebAddy: {
                    url: 'Web Address is invalid.',
                    required: 'Web Address is required.'
                }
            },
            submitHandler: function (form) {
                tinyMCE.activeEditor.setContent(
                    removeComment(
                        emptyIfNoText(
                            tinyMCE.activeEditor.getContent()
                        )
                    )
                );
                if (isJobNew)
                    checkCredits(); // TODO: for cpajobs, don't check credit if this is a volunteer job.
                else
                    form.submit();
            }
        });
    };

    //#endregion

    //#region bindLocationsSuggests

    var bindLocationsSuggests = function (restPath) {
        for (var i = 1; i <= 3; i++) {
            $('input[name=Location' + i + ']').jsonSuggest({
                url: restPath + 'locations?pageSize=7',
                textPropertyName: 'description',
                minCharacters: 3
            });
        }
    };

    //#endregion

    //#region bindUrlFixer

    var bindUrlFixer = function () {
        $('input[name=JobRerouteWebAddy]').change(function () {
            var regex = /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(##((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
            var url = $(this).val().trim();

            if (regex.test(url))
                return;

            if (!regex.test('http://' + url))
                return;

            $(this).val('http://' + url);
        });
    };

    //#endregion

    //#region bindTrainingPositionDisplay

    var bindTrainingPositionDisplay = function () {
        $('input[name=TrainingPosition]').change(function () {
            if ($(this).val() === '1')
                $('[data-info=TrainingPosition]').slideDown();
            else
                $('[data-info=TrainingPosition]').slideUp();
        });

        $('[data-info=TrainingPosition]').toggle(
            $('input[name=TrainingPosition]:checked').val() === '1'
        );
    };

    //#endregion

    //#region bindSaveDraft

    var bindSaveDraft = function () {
        $('span[data-action=save_draft]').click(function (e) {
            $('input[name=save_draft]').prop('disabled', false);
            //skip client-side validation. we're doing this in order to prevent credit check in submitHandler()
            $('#job_form')[0].submit();
        });
    };

    //#endregion

    return {
        init: function (options) {

            bindTinyeMCE('Description', options.tinyMceCssPath);
            bindValidator(options.isJobNew, options.required, options.labels);
            bindLocationsSuggests(options.restPath);
            bindUrlFixer();
            bindTrainingPositionDisplay();

            // this is temporary until we get a proper daft implemented using localStorage
            bindSaveDraft();

            $('select').select2();
        }
    }
    
}(jQuery));