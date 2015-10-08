function PlannerHelper() {
    this.rmp = new RMP();
    this.gradeDist = new GradeDist();
    this.cape = new Cape();

    this.teacher = null;
    this.course = null;

    this.element = null;

    // jQuery elements that we will be using.
    this.$searchDiv = null;
    this.$searchContainer = null;

    // Whether the extension has aborted execution. This happens when an invariant has failed,
    // meaning that something has changed that will possibly cause issues in the extension.
    this.aborted = false;

    this.createElement();

    this.init();
}

PlannerHelper.prototype.init = function () {
    // Insert the main element into the page
    this.$searchDiv = $('#search-div-0');
    // verify(this.$searchDiv.length, 1);
    this.$searchDiv.after(this.element);

    this.$searchContainer = $('#search-div-b-div');
    // verify(this.$searchContainer.length, 1);

    this.enableSearchEvent();
};

/**
 *
 * @private
 */
PlannerHelper.prototype.enableSearchEvent = function () {
    this.$searchContainer.on('DOMNodeInserted', _.debounce(this.attachButtonToSearchResults, 300).bind(this));
};

/**
 *
 * @private
 */
PlannerHelper.prototype.disableSearchEvent = function () {
    this.$searchContainer.off('DOMNodeInserted');
};

/**
 *
 * @private
 * @param $row
 * @returns {{}}
 */
PlannerHelper.prototype.getDataFromRow = function ($row) {
    var data = {};

    $row.children().each(function (index, cellElement) {
        var $cell = $(cellElement);
        var cellDesc = $cell.attr('aria-describedby');
        if (typeof cellDesc !== 'undefined') {
            data[cellDesc] = $cell.text();
        }
    });

    return data;
};

/**
 *
 * @param teacher
 * @param course
 * @returns {*|jQuery|HTMLElement}
 */
PlannerHelper.prototype.makeViewDataButton = function (teacher, course) {
    // Save `this` as plannerHelper to prevent it being lost in the anonymous function.
    var plannerHelper = this;

    var button = $('<input class="wrbutton wrbuttons wrbuttonspew secondary search-plan-class ui-button ui-widget ui-state-default ui-corner-all" type="button" value="View Data" />');
    button.data('course', course);
    button.data('teacher', teacher);
    button.on('click', function () {
        plannerHelper.reloadData($(this).data('teacher'), $(this).data('course'));
    });

    return button
};

/**
 * @private
 */
PlannerHelper.prototype.attachButtonToSearchResults = function () {
    // If the extensions has aborted, do nothing.
    if (this.aborted) {
        return;
    }

    // Prevent firing this event while running this event (causing an infinite loop).
    this.disableSearchEvent();

    // Get the rows from the search results.
    var $searchResults = $('#search-div-b-table').children('tbody').children();
    $searchResults.each(function (index, rowElement) {
        var $row = $(rowElement);
        if ($row.hasClass('wr-search-batch-middle') || $row.hasClass('wr-search-ac-alone')) {
            var cellData = this.getDataFromRow($row);

            // Verify that the course data we need is there.
            verify(cellData.hasOwnProperty('search-div-b-table_SUBJ_CODE'));
            verify(cellData.hasOwnProperty('search-div-b-table_CRSE_CODE'));

            // Get the subject code and course code (e.g. CSE and 3, respectively) from the cellData.
            var course = {
                subjectCode: cellData['search-div-b-table_SUBJ_CODE'],
                courseCode: cellData['search-div-b-table_CRSE_CODE']
            };

            // Verify that the teacher data we need is there.
            verify(cellData.hasOwnProperty('search-div-b-table_PERSON_FULL_NAME'));

            // Get the teacher's full name from the cell data.
            var fullname = cellData['search-div-b-table_PERSON_FULL_NAME'];

            // Parse the teacher's full name into first, middle, and last.
            var matches = fullname.match(/(\w*),\s(\w*)/); //LAST:_1, FIRST:_2 MIDDLE
            if (!matches || matches.length < 3) {
                console.log('No data found');
                return;
                // TODO: Log this
            }
            var teacher = {
                fullname: fullname,
                nomiddle: matches[1] + ', ' + matches[2],
                fname: matches[2],
                lname: matches[1]
            };

            // Add the button
            var button = this.makeViewDataButton(teacher, course);

            $row.children('[aria-describedby="search-div-b-table_colaction"]').append(button)
        }
    }.bind(this));

    // Reenable the search event now that we're done inserting new elements.
    this.enableSearchEvent();
};

/**
 * Creates the main element. Does not add it to the page.
 *
 * @private
 */
PlannerHelper.prototype.createElement = function () {
    this.element = $(
        '<div id="planner-helper">' +
            '<h2>Planner Helper Data</h2>' +
            '<div id="planner-helper-data"></div>' +
            '<div id="planner-helper-nodata">First, click the "view data" button for a professor to' +
            'see their Rate My Professor reviews, CAPEs, and grade distributions</div>' +
        '</div>'
    );
    this.element.find('#planner-helper-data').append(this.rmp.elements.main, this.cape.elements.main, this.gradeDist.elements.main);
};

/**
 *
 * @private
 */
PlannerHelper.prototype.abort = function () {
    this.aborted = true;

    var message = `
        Sorry, it appears that either WebReg or one of the data dependencies for Planner Helper
        have changed their format. An error report has been sent and an update will be released
        soon to make Planner Helper compatible with these changes.`;
    this.element.children('#planner-helper-data').text(message);
};

/**
 *
 * @private
 * @param teacher
 * @param course
 */
PlannerHelper.prototype.reloadData = function (teacher, course) {
    // Do nothing if we're trying to reload the data for the same prof and teacher
    if (JSON.stringify(this.teacher) === JSON.stringify(teacher) &&
        JSON.stringify(this.course) === JSON.stringify(course)) {
        return;
    }

    // We need to make a copy since Richard Ord will be changed to Rick Ord later and it will mess
    // up the equality check above.
    this.teacher = jQuery.extend({}, teacher);
    this.course = jQuery.extend({}, course);

    this.element.find('h2').text('Planner Helper Data for ' + teacher.fname + ' ' + teacher.lname + ', ' + course.subjectCode + course.courseCode);

    this.rmp.updateData(teacher, course, function () {});
    this.cape.updateData(teacher, course, function () {});
    this.gradeDist.updateData(teacher, course, function () {});

    $('#planner-helper-data').show();
    $('#planner-helper-nodata').hide();
};