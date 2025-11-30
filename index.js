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