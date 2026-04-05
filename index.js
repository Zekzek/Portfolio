var currentMode = 'manual'; // 'manual' or 'filter'

function setup_all_show_hide() {
    EXPERIENCE_SECTIONS.forEach(function(id) {
        setup_show_hide(id);
    });
}

var EXPERIENCE_SECTIONS = [
    'azra', 'azra_precommit', 'azra_recordandplay', 'azra_harvesttime', 'azra_performancemetrics', 'azra_shaderprewarm', 'azra_loadtesting', 'azra_serverstresstest', 'azra_agenticdev', 'azra_dailyreports',
    'ea', 'ea_precommit', 'ea_awsdevicefarm', 'ea_recordandplay', 'ea_testreporting', 'ea_testautomation',
    'ironhorse', 'ironhorse_steamtown', 'ironhorse_comic',
    '5th', '5th_campaign', '5th_ui', '5th_support',
    'northrop', 'northrop_accreditation', 'northrop_browser', 'northrop_prototype', 'northrop_chassistest', 'northrop_flight',
    'doublea', 'doublea_kelkom', 'doublea_ttrpg', 'doublea_taskbar', 'doublea_fromspace',
    'personal', 'personal_portfolio', 'personal_hexworld', 'personal_gearswap', 'personal_botrepair', 'personal_home', 'personal_lumen', 'personal_ravenousvoid', 'personal_herdingcats', 'personal_gastank', 'personal_jigsaw',
    'school', 'school_sacstate', 'school_delta'
];

function setup_all_filters() {
    FILTER_KEYS.forEach(function(key) {
        setup_filter(key);
    });
}

var FILTER_KEYS = [
    'csharp', 'python', 'java', 'js', 'sql', 'c',
    'unity', 'vs', 'intellij', 'eclipse', 'git', 'perforce', 'jira', 'aws', 'jenkins', 'teamcity', 'rally', 'redis', 'mongo', 'bigquery', 'gamemaker', 'clearcase',
    'game', 'tools', 'defense'
];

function setup_show_hide(id) {
    var selector = '#' + id;

    $(selector).addClass('showing');

    var $header = $(selector).children('.collapse-header').first();
    $header.prepend('<button class="showhide">-</button> ');

    $header.on('click', function(e) {
        if ($(e.target).closest('a').length) return; // don't intercept link clicks
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
    // Visual mode indicator removed – only adjust filter visual state
    if (mode === 'filter') {
        $('.filter-label').removeClass('inactive');
    } else {
        $('.filter-label').addClass('inactive');
    }
}

// Setup global checkbox change handler
$(document).on('change', '.filter-checkbox', function() {
    applyFilterMode();
});

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

        if ($section.hasClass('always-show')) {
            setSectionShowing($section, true);
            $section.find('div[id]').each(function() {
                var $sub = $(this);
                setSectionShowing($sub, $sub.hasClass('always-show'));
            });
            return;
        }

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
    'csharp': 5, 'java': 3, 'js': 4, 'c': 2, 'python': 4, 'sql': 3,
    'unity': 5, 'git': 4, 'jira': 4, 'vs': 4, 'intellij': 4, 'eclipse': 4,
    'perforce': 4, 'jenkins': 4, 'rally': 3, 'teamcity': 4,
    'aws': 3, 'redis': 2, 'mongo': 2, 'bigquery': 3, 'gamemaker': 2, 'clearcase': 1
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

function sortSkillsByRating() {
    // Group filter labels by their parent h3 section (excluding Resume link)
    var sections = {};
    
    $('.sidebar h3:not(:has(a))').each(function() {
        var $heading = $(this);
        var sectionName = $heading.text();
        var $labels = [];
        
        // Collect all consecutive .filter-label elements until the next h3
        var $current = $heading.next();
        while ($current.length && !$current.is('h3')) {
            if ($current.is('.filter-label')) {
                $labels.push($current);
            }
            $current = $current.next();
        }
        
        sections[sectionName] = {
            $heading: $heading,
            $labels: $labels
        };
    });
    
    // Sort each section's labels by star rating > duration > alphabetical
    for (var sectionName in sections) {
        var section = sections[sectionName];
        section.$labels.sort(function(a, b) {
            var keyA = $(a).find('.filter-checkbox').val();
            var keyB = $(b).find('.filter-checkbox').val();
            var ratingA = STAR_RATINGS[keyA] || 0;
            var ratingB = STAR_RATINGS[keyB] || 0;

            if (ratingB !== ratingA) return ratingB - ratingA;

            var durA = parseSortableMonths($(a).find('span.time').text());
            var durB = parseSortableMonths($(b).find('span.time').text());

            if (durB !== durA) return durB - durA;

            var nameA = $(a).find('span:not(.stars):not(.time)').first().text().toUpperCase();
            var nameB = $(b).find('span:not(.stars):not(.time)').first().text().toUpperCase();
            return nameA.localeCompare(nameB);
        });
        
        // Reinsert sorted labels after the heading
        var $insertAfter = section.$heading;
        section.$labels.forEach(function($label) {
            $insertAfter.after($label);
            $insertAfter = $label;
        });
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

    var $btn = $section.children('.collapse-header').find('.showhide').first();

    if (showing) {
        $section.find('.collapse-content:first').show(200);
        $section.removeClass('hiding').addClass('showing');
        $btn.text('-');
    } else {
        $section.find('.collapse-content:first').hide(200);
        $section.removeClass('showing').addClass('hiding');
        $btn.text('+');
    }
}

// --- Show All / Collapse All ---

function showAll() {
    set_mode('manual');
    EXPERIENCE_SECTIONS.forEach(function(id) {
        setSectionShowing($('#' + id), true);
    });
}

function collapseAll() {
    set_mode('manual');
    EXPERIENCE_SECTIONS.forEach(function(id) {
        setSectionShowing($('#' + id), false);
    });
}

// --- Company label tooltips for subsection headers ---

function addSubsectionLabels() {
    // Build display name map from sidebar labels
    var displayNames = {};
    $('.filter-checkbox').each(function() {
        var key = $(this).val();
        var name = $(this).closest('.filter-label').find('span:not(.stars):not(.time)').first().text().trim();
        displayNames[key] = name;
    });

    $('.main-section > div').each(function() {
        var $company = $(this);
        $company.find('div[id] > .collapse-header').each(function() {
            var $subsection = $(this).parent();
            var classes = ($subsection.attr('class') || '').split(/\s+/);
            var tags = classes.filter(function(c) {
                return FILTER_KEYS.indexOf(c) !== -1;
            }).map(function(c) {
                return displayNames[c] || c;
            });
            var label = tags.join(' \u00b7 ');
            $(this).attr('data-label', label);
        });
    });
}

$(setup_all_show_hide);
$(setup_all_filters);
$(draw_stars);
// Compute and render total time per filterable tag, then sort by rating > duration
$(function() {
    computeFilterTimes();
    sortSkillsByRating();
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

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelector('.modal').classList.remove('active');
    }
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

    $('.main-section > div').each(function() {
        var $section = $(this);
        if (isExcluded($section)) return;

        var sectionParsed = parseElementDates($section);
        var $subsWithDuration = $section.find('div[id][data-duration-months]');

        if ($subsWithDuration.length > 0) {
            // Sum subsection durations per skill, then cap at actual section duration
            var sectionCap = sectionParsed.months;
            var sectionTotals = {};
            $subsWithDuration.each(function() {
                var $sub = $(this);
                var months = parseInt($sub.attr('data-duration-months'), 10);
                for (var key in totals) {
                    if ($sub.hasClass(key)) {
                        sectionTotals[key] = (sectionTotals[key] || 0) + months;
                    }
                }
            });
            for (var key in sectionTotals) {
                totals[key].months += Math.min(sectionTotals[key], sectionCap);
                totals[key].ongoing = totals[key].ongoing || sectionParsed.ongoing;
            }
        } else {
            // Fall back to section-level duration
            for (var key in totals) {
                if ($section.hasClass(key)) {
                    totals[key].months += sectionParsed.months;
                    totals[key].ongoing = totals[key].ongoing || sectionParsed.ongoing;
                }
            }
        }
    });

    renderFilterTimes(totals);
}

// Compute months for a single experience element
function computeElementMonths($exp) {
    return parseElementDates($exp).months;
}

// Update each top-level header to show the computed shorthand duration in parentheses.
// Operates on the raw text node to preserve child elements like the showhide button.
function updateHeaderDurations() {
    $('.main-section > div').each(function() {
        var $exp = $(this);
        if (isExcluded($exp)) return;
        var months = computeElementMonths($exp);
        var shorthand = humanizeMonths(months);

        var $header = getHeader($exp);
        if (!$header) return;

        // Find the last text node inside the header (after the showhide button)
        var textNode = $header.contents().filter(function() {
            return this.nodeType === 3;
        }).last();
        if (!textNode.length) return;

        var text = textNode[0].nodeValue.trim();
        var newValue;
        if (/\([^)]*\)$/.test(text)) {
            newValue = ' ' + text.replace(/\([^)]*\)$/, '(' + shorthand + ')');
        } else {
            newValue = ' ' + text + ' (' + shorthand + ')';
        }
        textNode[0].nodeValue = newValue;
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
    // Replace "over X years" (legacy pattern) or "with X years" (current pattern)
    if (/over\s+\d+\s+years/.test(text)) {
        summary.text(text.replace(/over\s+\d+\s+years/, 'over ' + years + ' years'));
    } else if (/with\s+\d+\s+years/.test(text)) {
        summary.text(text.replace(/with\s+\d+\s+years/, 'with ' + years + ' years'));
    }
    // If neither pattern matches, leave the summary as-is
}

// Run summary update on load
$(function() {
    updateSummaryExperience();
});

// --- Print/PDF Resume Generation ---

function prepareForPrint() {
    // Print with current view state
    window.print();
}

// Company labels must run after showhide buttons are injected
$(function() {
    addSubsectionLabels();
});

// Show All / Collapse All handlers + default on load
$(function() {
    $('#btn-show-all').on('click', showAll);
    $('#btn-collapse-all').on('click', collapseAll);

    // Default: Games + Tools checked
    $('#game_filter').prop('checked', true);
    $('#tools_filter').prop('checked', true);
    applyFilterMode();
});

// Attach print button handler
$(function() {
    $('#print-button').on('click', prepareForPrint);
    
    // Also support Ctrl+P keyboard shortcut
    $(document).on('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            prepareForPrint();
        }
    });
});

// Format durations according to user's preference:
// - If total < 6 months -> show months (e.g. "5m")
// - Otherwise -> round to nearest year (e.g. "2y"). No '+' suffix.
function humanizeMonths(months) {
    if (!months || months <= 0) return '0 months';
    if (months < 6) {
        return months + (months === 1 ? ' month' : ' months');
    }
    var years = Math.round(months / 12);
    if (years <= 0) years = 1;
    return years + (years === 1 ? ' year' : ' years');
}

function parseSortableMonths(timeText) {
    if (!timeText) return 0;
    var yearMatch = timeText.match(/(\d+)y/);
    var monthMatch = timeText.match(/(\d+)m/);
    if (yearMatch) return parseInt(yearMatch[1], 10) * 12;
    if (monthMatch) return parseInt(monthMatch[1], 10);
    return 0;
}

function humanizeMonthsShort(months) {
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
        var text = humanizeMonthsShort(t.months);
        $time.text(text);
        $label.attr('title', $label.attr('title') || text + ' experience');
    });
}

// Recompute times if the DOM could change in relevant ways
// (developers can call computeFilterTimes() after editing durations or adding data attributes)