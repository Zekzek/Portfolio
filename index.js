var currentMode = 'manual'; // 'manual' or 'filter'

function setup_all_show_hide() {
    setup_show_hide('azra');
    setup_show_hide('azra_precommit');
    setup_show_hide('azra_recordandplay');
    setup_show_hide('azra_testautomation');

    setup_show_hide('ea');
    setup_show_hide('ea_precommit');
    setup_show_hide('ea_awsdevicefarm');
    setup_show_hide('ea_recordandplay');
    setup_show_hide('ea_testreporting');
    setup_show_hide('ea_testautomation');

    setup_show_hide('ironhorse');
    setup_show_hide('ironhorse_steamtown');
    setup_show_hide('ironhorse_comic');

    setup_show_hide('5th');
    setup_show_hide('5th_campaign');
    setup_show_hide('5th_ui');
    setup_show_hide('5th_support');

    setup_show_hide('northrop');
    setup_show_hide('northrop_accreditation');
    setup_show_hide('northrop_browser');
    setup_show_hide('northrop_prototype');
    setup_show_hide('northrop_chassistest');
    setup_show_hide('northrop_flight');

    setup_show_hide('doublea');
    setup_show_hide('doublea_kelkom');
    setup_show_hide('doublea_ttrpg');
    setup_show_hide('doublea_taskbar');
    setup_show_hide('doublea_fromspace');

    setup_show_hide('personal');
    setup_show_hide('personal_portfolio');
    setup_show_hide('personal_dice');
    setup_show_hide('personal_botrepair');
    setup_show_hide('personal_home');
    setup_show_hide('personal_lumen');
    setup_show_hide('personal_ravenousvoid');
    setup_show_hide('personal_herdingcats');
    setup_show_hide('personal_gastank');
    setup_show_hide('personal_jigsaw');

    setup_show_hide('school');
    setup_show_hide('school_sacstate');
    setup_show_hide('school_delta');
}

function setup_all_filters() {
    setup_filter('csharp');
    setup_filter('python');
    setup_filter('java');
    setup_filter('js');
    setup_filter('sql');
    setup_filter('c');

    setup_filter('unity');
    setup_filter('vs');
    setup_filter('intellij');
    setup_filter('eclipse');
    setup_filter('git');
    setup_filter('perforce');
    setup_filter('jira');
    setup_filter('aws');
    setup_filter('jenkins');
    setup_filter('teamcity');
    setup_filter('rally');
    setup_filter('redis');
    setup_filter('mongo');
    setup_filter('gamemaker');
    setup_filter('clearcase');
}

function setup_show_hide(id) {
    var selector = '#' + id;

    $(selector).addClass('showing');

    var collapseButton = '<button class="showhide">-</button>'
    $(selector + " .collapse-header:first").prepend(collapseButton + ' ');

    $(selector + ' .showhide:first').click(function() {
        set_mode('manual');
        
        if ($(selector).hasClass('showing')) {
            $(selector + ' .collapse-content:first').hide(200);
            $(selector).toggleClass("showing hiding");
            $(selector + ' .showhide').text('+');
        } else {
            $(selector + ' .collapse-content:first').show(200);
            $(selector).toggleClass("hiding showing");
            $(selector + ' .showhide').text('-');
        }
    });
}

function setup_filter(key) {
    var selector = '#' + key + '_filter';
    
    $(selector).on('change', function() {
        set_mode('filter');
        update_filters();
    });
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
$(document).on('change', '.filter-checkbox', function() {
    set_mode('filter');
    update_filters();
});

function update_filters() {
    if (currentMode !== 'filter') return;
    
    var activeFilters = [];
    $('.filter-checkbox:checked').each(function() {
        activeFilters.push($(this).val());
    });
    
    if (activeFilters.length === 0) {
        // No filters selected - collapse everything for a concise view
        $('.main-section .showing').each(function() {
            $(this).find('.showhide:first').click();
        });
        return;
    } else {
        // Hide sections that don't have any of the active filter classes
        $('.main-section > div').each(function() {
            var hasActiveFilter = false;
            for (var i = 0; i < activeFilters.length; i++) {
                if ($(this).hasClass(activeFilters[i])) {
                    hasActiveFilter = true;
                    break;
                }
            }
            
            if (hasActiveFilter && $(this).hasClass('hiding')) {
                $(this).find('.showhide:first').click();
            } else if (!hasActiveFilter && $(this).hasClass('showing')) {
                $(this).find('.showhide:first').click();
            }
        });
    }
}

function draw_stars() {
    var filled = '&#9733;';
    var empty = '&#9734;';
    
    // Apply stars to filter labels based on their class
    $('#csharp_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + filled);
    $('#java_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#js_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#c_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + empty + empty);
    $('#python_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    $('#sql_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    
    $('#unity_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + filled);
    $('#git_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#jira_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#vs_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#intellij_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#eclipse_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + filled + empty);
    $('#perforce_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + empty + empty);
    $('#jenkins_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + empty + empty);
    $('#rally_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + empty + empty);
    $('#teamcity_filter').closest('.filter-label').find('span.stars').html(filled + filled + filled + empty + empty);
    $('#aws_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    $('#redis_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    $('#mongo_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    $('#gamemaker_filter').closest('.filter-label').find('span.stars').html(filled + filled + empty + empty + empty);
    $('#clearcase_filter').closest('.filter-label').find('span.stars').html(filled + empty + empty + empty + empty);
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

        // allow manual override via data-duration-months attribute on the element
        var attr = $exp.attr('data-duration-months');
        var parsed = { months: 0, ongoing: false };
        if (attr && !isNaN(parseInt(attr, 10))) {
            parsed.months = parseInt(attr, 10);
        } else {
            // try parsing from the h3 header text
            var header = $exp.find('> .collapse-header:first').text() || $exp.find('h3:first').text();
            parsed = parseDurationFromText(header);
        }

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

// Format durations according to user's preference:
// - If total < 6 months -> show months (e.g. "5m")
// - Otherwise -> round to nearest year (e.g. "2y"). Append '+' for ongoing.
function humanizeMonths(months, ongoing) {
    if (!months || months <= 0) return ongoing ? '0m+' : '0m';
    if (months < 6) {
        return months + 'm' + (ongoing ? '+' : '');
    }
    var years = Math.round(months / 12);
    if (years <= 0) years = 1;
    return years + 'y' + (ongoing ? '+' : '');
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
        var text = humanizeMonths(t.months, t.ongoing);
        $time.text(text);
        $label.attr('title', $label.attr('title') || text + ' experience');
    });
}

// Recompute times if the DOM could change in relevant ways
// (developers can call computeFilterTimes() after editing durations or adding data attributes)