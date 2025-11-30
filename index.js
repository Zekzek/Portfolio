var currentMode = 'manual'; // 'manual' or 'filter'

function setup_all_show_hide() {
    EXPERIENCE_SECTIONS.forEach(function(id) {
        setup_show_hide(id);
    });
}

var EXPERIENCE_SECTIONS = [
    'azra', 'azra_precommit', 'azra_recordandplay', 'azra_testautomation',
    'ea', 'ea_precommit', 'ea_awsdevicefarm', 'ea_recordandplay', 'ea_testreporting', 'ea_testautomation',
    'ironhorse', 'ironhorse_steamtown', 'ironhorse_comic',
    '5th', '5th_campaign', '5th_ui', '5th_support',
    'northrop', 'northrop_accreditation', 'northrop_browser', 'northrop_prototype', 'northrop_chassistest', 'northrop_flight',
    'doublea', 'doublea_kelkom', 'doublea_ttrpg', 'doublea_taskbar', 'doublea_fromspace',
    'personal', 'personal_portfolio', 'personal_dice', 'personal_botrepair', 'personal_home', 'personal_lumen', 'personal_ravenousvoid', 'personal_herdingcats', 'personal_gastank', 'personal_jigsaw',
    'school', 'school_sacstate', 'school_delta'
];

function setup_all_filters() {
    FILTER_KEYS.forEach(function(key) {
        setup_filter(key);
    });
}

var FILTER_KEYS = [
    'csharp', 'python', 'java', 'js', 'sql', 'c',
    'unity', 'vs', 'intellij', 'eclipse', 'git', 'perforce', 'jira', 'aws', 'jenkins', 'teamcity', 'rally', 'redis', 'mongo', 'gamemaker', 'clearcase'
];

function setup_show_hide(id) {
    var selector = '#' + id;

    $(selector).addClass('showing');

    var collapseButton = '<button class="showhide">-</button>'
    $(selector + " .collapse-header:first").prepend(collapseButton + ' ');

    $(selector + ' .showhide:first').click(function() {
        var wasShowing = $(selector).hasClass('showing');
        set_mode('manual');
        setSectionShowing($(selector), !wasShowing);
    });
}

function applyFilterMode() {
    set_mode('filter');
    update_filters();
}

function setup_filter(key) {
    var selector = '#' + key + '_filter';
    $(selector).on('change', applyFilterMode);
}

function set_mode(mode) {
    currentMode = mode;
    // Visual mode indicator removed — only adjust filter visual state
    if (mode === 'filter') {
        $('.filter-label').removeClass('inactive');
    } else {
        $('.filter-label').addClass('inactive');
    }
}

// Setup global checkbox change handler
$(document).on('change', '.filter-checkbox', applyFilterMode);

function hasAnyActiveFilter($element, activeFilters) {
    for (var i = 0; i < activeFilters.length; i++) {
        var key = activeFilters[i];
        if ($element.hasClass(key)) {
            return true;
        }
        // Check descendants for matching class (sub-categories)
        if ($element.find('.' + key).length > 0) {
            return true;
        }
    }
    return false;
}

function update_filters() {
    if (currentMode !== 'filter') return;
    
    var activeFilters = [];
    $('.filter-checkbox:checked').each(function() {
        activeFilters.push($(this).val());
    });
    
    if (activeFilters.length === 0) {
        // No filters selected - collapse everything for a concise view
        $('.main-section .showing').each(function() {
            setSectionShowing($(this), false);
        });
        return;
    }
    
    // Hide sections that don't have any of the active filter classes
    $('.main-section > div').each(function() {
        var $section = $(this);
        var hasActiveFilter = hasAnyActiveFilter($section, activeFilters);
        
        if (hasActiveFilter && $section.hasClass('hiding')) {
            setSectionShowing($section, true);
        } else if (!hasActiveFilter && $section.hasClass('showing')) {
            setSectionShowing($section, false);
        }

        // Handle nested sub-sections: expand matching, collapse non-matching
        $section.find('div[id]').each(function() {
            var $sub = $(this);
            if (hasAnyActiveFilter($sub, activeFilters)) {
                setSectionShowing($sub, true);
            } else {
                setSectionShowing($sub, false);
            }
        });
    });
}

var STAR_RATINGS = {
    'csharp': 5, 'java': 4, 'js': 4, 'c': 3, 'python': 2, 'sql': 2,
    'unity': 5, 'git': 4, 'jira': 4, 'vs': 4, 'intellij': 4, 'eclipse': 4,
    'perforce': 3, 'jenkins': 3, 'rally': 3, 'teamcity': 3,
    'aws': 2, 'redis': 2, 'mongo': 2, 'gamemaker': 2, 'clearcase': 1
};

function draw_stars() {
    var filled = '&#9733;';
    var empty = '&#9734;';
    
    for (var key in STAR_RATINGS) {
        var rating = STAR_RATINGS[key];
        var stars = (filled.repeat(rating)) + (empty.repeat(5 - rating));
        $('#' + key + '_filter').closest('.filter-label').find('span.stars').html(stars);
    }
}

// IDs to exclude from duration calculations
var EXCLUDE_SECTIONS = ['personal', 'school'];

function isExcluded($exp) {
    var id = $exp.attr('id');
    return EXCLUDE_SECTIONS.indexOf(id) !== -1;
}

// Return the header jQuery element for an experience section
function getHeader($exp) {
    var $header = $exp.find('> .collapse-header:first');
    if (!$header.length) $header = $exp.find('h3:first');
    return $header.length ? $header : null;
}

// Return a Date that represents the last day of the current month
function endOfCurrentMonth() {
    var today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

// Toggle a section's showing/hiding state without triggering the showhide click handler
function setSectionShowing($section, showing) {
    if (typeof $section === 'string') $section = $('#' + $section);
    if (!$section || !$section.length) return;

    if (showing) {
        $section.find('.collapse-content:first').show(200);
        $section.removeClass('hiding').addClass('showing');
        $section.find('.showhide:first').text('-');
    } else {
        $section.find('.collapse-content:first').hide(200);
        $section.removeClass('showing').addClass('hiding');
        $section.find('.showhide:first').text('+');
    }
}

$(setup_all_show_hide);
$(setup_all_filters);
$(draw_stars);
// Compute and render total time per filterable tag
$(function() {
    computeFilterTimes();
});


// --- Claude.ai ---

document.querySelectorAll('.screenshot').forEach(img => {
    img.addEventListener('click', () => {
        const modal = document.querySelector('.modal');
        const modalImg = modal.querySelector('img');
        modalImg.src = img.src;
        modalImg.alt = img.alt;
        modal.classList.add('active');
    });
});

document.querySelector('.modal').addEventListener('click', () => {
    document.querySelector('.modal').classList.remove('active');
});

// --- Duration computation for filters ---

// Parse date string in YYYY-MM format
function parseDateString(dateStr) {
    var parts = dateStr.split('-');
    var year = parseInt(parts[0], 10);
    var month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
    return { year: year, month: month };
}

// Parse an experience element's dates and return { months, ongoing }
// Returns computed duration using data-start/data-end, data-duration-months, or parsed header text
function parseElementDates($exp) {
    var startAttr = $exp.attr('data-start');
    var endAttr = $exp.attr('data-end');
    
    if (startAttr) {
        try {
            var sp = parseDateString(startAttr);
            var startDate = new Date(sp.year, sp.month, 1);

            var endDate;
            if (endAttr) {
                var ep = parseDateString(endAttr);
                endDate = new Date(ep.year, ep.month + 1, 0);
            } else {
                endDate = new Date();
            }

            var months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
            if (months < 0) months = 0;
            return { months: months, ongoing: !endAttr };
        } catch (e) {
            // fallback below
        }
    }

    var attr = $exp.attr('data-duration-months');
    if (attr && !isNaN(parseInt(attr, 10))) {
        return { months: parseInt(attr, 10), ongoing: false };
    }

    var $h = getHeader($exp);
    var headerText = $h ? $h.text() : '';
    return parseDurationFromText(headerText);
}

function parseDurationFromText(text) {
    if (!text) return { months: 0, ongoing: false };
    var lower = text.toLowerCase();
    var ongoing = /current/.test(lower) || /present/.test(lower);

    // Look for patterns like '4 years', '1.5 years', '5 months', '1 year 6 months'
    var yearsMatch = lower.match(/(\d+(?:\.\d+)?)\s*years?/);
    var monthsMatch = lower.match(/(\d+)\s*months?/);

    var months = 0;
    if (yearsMatch) {
        var yearsVal = parseFloat(yearsMatch[1]);
        months += Math.round(yearsVal * 12);
    }
    if (monthsMatch) {
        months += parseInt(monthsMatch[1], 10);
    }

    // If no numeric duration but header says current/present, treat as 12 months (ongoing)
    if (months === 0 && ongoing) {
        months = 12;
    }

    return { months: months, ongoing: ongoing };
}

function computeFilterTimes() {
    var totals = {}; // key -> {months: number, ongoing: bool}

    // Initialize totals for each filter checkbox value
    $('.filter-checkbox').each(function() {
        totals[$(this).val()] = { months: 0, ongoing: false };
    });

    // Iterate top-level experience sections only
    $('.main-section > div').each(function() {
        var $exp = $(this);
        // Skip duration calculation for Side Projects and Education
        if (isExcluded($exp)) return;

        var parsed = parseElementDates($exp);

        // add this experience's duration to any filter keys matching classes on the element
        for (var key in totals) {
            if ($exp.hasClass(key)) {
                totals[key].months += parsed.months;
                totals[key].ongoing = totals[key].ongoing || parsed.ongoing;
            }
        }
    });

    renderFilterTimes(totals);
}

// Compute months for a single experience element
function computeElementMonths($exp) {
    return parseElementDates($exp).months;
}

// Update each top-level header to show the computed shorthand duration in parentheses
function updateHeaderDurations() {
    $('.main-section > div').each(function() {
        var $exp = $(this);
        if (isExcluded($exp)) return;
        var months = computeElementMonths($exp);
        var shorthand = humanizeMonths(months);

        // find the header node (h3 or .collapse-header)
        var $header = getHeader($exp);
        if (!$header) return;
        var text = $header.text();

        // Replace existing parenthetical duration if present, otherwise append
        if (/\([^)]*\)$/.test(text.trim())) {
            // replace trailing parenthesis content
            var newText = text.replace(/\([^)]*\)$/, '(' + shorthand + ')');
            $header.text(newText);
        } else {
            $header.text(text + ' (' + shorthand + ')');
        }
    });
}

// Run header update after computing filter times on load
$(function() {
    updateHeaderDurations();
});

// Convert element's date range into an interval, or null if dates unavailable
function elementToInterval($exp) {
    var startAttr = $exp.attr('data-start');
    if (!startAttr) return null;

    try {
        var sp = parseDateString(startAttr);
        var startDate = new Date(sp.year, sp.month, 1);

        var endAttr = $exp.attr('data-end');
        var endDate;
        if (endAttr) {
            var ep = parseDateString(endAttr);
            endDate = new Date(ep.year, ep.month + 1, 0);
        } else {
            endDate = endOfCurrentMonth();
        }

        return { start: startDate, end: endDate };
    } catch (e) {
        return null;
    }
}

// Compute total experience months across all listed roles and update the summary
function computeTotalExperienceMonths() {
    var intervals = [];
    var today = new Date();

    $('.main-section > div').each(function() {
        var $exp = $(this);
        if (isExcluded($exp)) return;

        var interval = elementToInterval($exp);
        if (interval) {
            intervals.push(interval);
            return;
        }

        // Fallback: use parsed duration to construct an interval ending at the current month end
        var parsed = computeElementMonths($exp);
        if (parsed && parsed > 0) {
            var endD = endOfCurrentMonth();
            var startD = new Date(endD.getFullYear(), endD.getMonth() - parsed + 1, 1);
            intervals.push({ start: startD, end: endD });
        }
    });

    if (intervals.length === 0) return 0;

    // Sort intervals by start
    intervals.sort(function(a, b) { return a.start - b.start; });

    // Merge overlapping/contiguous intervals
    var merged = [];
    var cur = intervals[0];
    for (var i = 1; i < intervals.length; i++) {
        var it = intervals[i];
        // if it starts on or before the day after cur.end, merge
        var dayAfterCurEnd = new Date(cur.end.getFullYear(), cur.end.getMonth(), cur.end.getDate() + 1);
        if (it.start <= dayAfterCurEnd) {
            // extend end if needed
            if (it.end > cur.end) cur.end = it.end;
        } else {
            merged.push(cur);
            cur = it;
        }
    }
    merged.push(cur);

    // Sum months across merged intervals. Include both start and end months.
    var totalMonths = 0;
    merged.forEach(function(m) {
        // Count months from start to end inclusive
        var months = (m.end.getFullYear() - m.start.getFullYear()) * 12 + (m.end.getMonth() - m.start.getMonth()) + 1;
        if (months > 0) totalMonths += months;
    });

    return totalMonths;
}

function updateSummaryExperience() {
    var months = computeTotalExperienceMonths();
    if (!months || months <= 0) return;
    var years = Math.floor(months / 12);
    var summary = $('.main-section > p:first');
    if (!summary.length) return;
    var text = summary.text();
    // Replace existing "over X years" or similar
    if (/over\s+\d+\s+years/.test(text)) {
        var newText = text.replace(/over\s+\d+\s+years/, 'over ' + years + ' years');
        summary.text(newText);
    } else {
        // Insert phrase after first sentence start
        summary.text(text + ' (over ' + years + ' years experience)');
    }
}

// Run summary update on load
$(function() {
    updateSummaryExperience();
});

// Format durations according to user's preference:
// - If total < 6 months -> show months (e.g. "5m")
// - Otherwise -> round to nearest year (e.g. "2y"). No '+' suffix.
function humanizeMonths(months) {
    if (!months || months <= 0) return '0m';
    if (months < 6) {
        return months + 'm';
    }
    var years = Math.round(months / 12);
    if (years <= 0) years = 1;
    return years + 'y';
}

function renderFilterTimes(totals) {
    $('.filter-label').each(function() {
        var $label = $(this);
        var key = $label.find('.filter-checkbox').val();
        if (!key || !totals[key]) return;

        var $stars = $label.find('span.stars');

        // Ensure a .time span exists and place it before the stars so stars stay flush-right
        var $time = $label.find('span.time');
        if ($time.length === 0) {
            $time = $('<span class="time"></span>');
            if ($stars.length) {
                $time.insertBefore($stars);
            } else {
                $label.append(' ');
                $label.append($time);
            }
        }

        var t = totals[key];
        var text = humanizeMonths(t.months);
        $time.text(text);
        $label.attr('title', $label.attr('title') || text + ' experience');
    });
}

// Recompute times if the DOM could change in relevant ways
// (developers can call computeFilterTimes() after editing durations or adding data attributes)