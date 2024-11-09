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

    var filterButton = '<button class="filter"><span>&#128269;</span></button>'
    $(selector).prepend(filterButton + ' ');

    $(selector + ' *').click(function() {
        $('.hiding.' + key + ' .showhide').click();
        $('.hiding.' + key + ' .showhide').click();
        $('.showing:not(".' + key + '") .showhide').click();
    });
}

function draw_stars() {
    var filled = '&#9733;';
    var empty = '&#9734;';
    $('.five.star').append('<span class="stars">' + filled + filled + filled + filled + filled + '</span>');
    $('.four.star').append('<span class="stars">' + filled + filled + filled + filled + empty + '</span>');
    $('.three.star').append('<span class="stars">' + filled + filled + filled + empty + empty + '</span>');
    $('.two.star').append('<span class="stars">' + filled + filled + empty + empty + empty + '</span>');
    $('.one.star').append('<span class="stars">' + filled + empty + empty + empty + empty + '</span>');
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