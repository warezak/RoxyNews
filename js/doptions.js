// swap() method for jQuery
jQuery.fn.swap = function(b){ 
    b = jQuery(b)[0]; 
    var a = this[0]; 
    var t = a.parentNode.insertBefore(document.createTextNode(''), a); 
    b.parentNode.insertBefore(a, b); 
    t.parentNode.insertBefore(b, t); 
    t.parentNode.removeChild(t); 
    return this;
};

var doptions = {
    maxcol: 0,  // max visible columns count (initialized in setLayout function)
    curcol: 0,  // current visible columns count (initialized in setLayout function)
    layout: 0,  // 1 - standard, 2 - mobile (initialized in setLayout function)
    cols: {  // default columns
        News: true,
        Sports: true,
        Business: false,
        Entertainment: true,
        Tech: true,
        Notable: false,
		Politics: true,
		NHL: false,
		NBA: false,
    },
};

// Add headers for news columns and items for the dropdown list.
$('.col_data').each(function(i) {
    var $wrapper = $(this).parent();   
    $wrapper.addClass('droppable');
    $wrapper.prepend('<h2 class="col_header">' + this.id + '</h2>');
    
//    var $dmenu = $('.opt_dmenu');
    $('.opt_dmenu').append('<li data-id="' + this.id + '"><a>' + this.id + '</a></li>');
});

// Set layout
setLayout();

//********** Options **********

$('.opt_button').click(function() {
    var $opt = $('.opt_cols'),
        $optw = $('.opt_wrapper');
	
    if (!$optw.is(':visible')) {
        var s = '';
        $('.col_data').each(function(i) {
            s += '<input type="checkbox" data-id=' + this.id + 
                 ($(this).parent().is(':visible') ? ' checked' : (doptions.curcol < doptions.maxcol ? '' : ' disabled')) + 
                 '>&nbsp;' + this.id + '<br>';
        });
        $opt.html(s);        
        $optw.offset({ top: $(this).offset().top });
        $optw.fadeIn();
    } else {
        $optw.fadeOut();
    }
});

$('.opt_cols').click(function(e) {
    var elem = e.target;
    var data_id = $(elem).attr('data-id');
	
    if (data_id) {
        var $wrapper = $('#' + data_id).parent();
        
        if (!$wrapper.is(':visible')) {
            doptions.curcol += 1;
            if (doptions.curcol === doptions.maxcol) {
                $(e.currentTarget).find('input:not(:checked)').prop('disabled', true);
            }
        } else {
            doptions.curcol -= 1;
            $(e.currentTarget).find('input:not(:checked)').prop('disabled', false);
        }
        $wrapper.toggle(50);
    }
});

$('.opt_dmenu > li').click(function(e) {
    $('.col_wrapper:visible').hide();
    $('#' + $(this).attr('data-id')).parent().show();
});

// Set layout according to window width
$(window).resize(function() {
    setLayout();
});

// Set layout
function setLayout() {
    if (window.matchMedia('only screen and (max-width: 480px)').matches) {  // not IE9- safe!
        if (doptions.layout === 2) return;
        
        $('.opt_wrapper').hide();        
        
        doptions.maxcol = 1;
        
        if (doptions.curcol > 1) {
            $('.col_wrapper:visible:not(:first)').hide();
            doptions.curcol = 1;
        }  
            
        $('.opt_button').css('display', 'none');
        $('.opt_dropdown').css('display', 'inline-block');
        doptions.layout = 2;
    } else {
        if (doptions.layout === 1) return;
        
        $('.opt_wrapper').hide();
        
        $('.col_wrapper:visible').hide();
        doptions.maxcol = 5;
        doptions.curcol = 0;
        
        $('.opt_dropdown').css('display', 'none');     
        $('.opt_button').css('display', 'block');
        doptions.layout = 1;
    }
    
    $('.col_data').each(function(i) {
        if (doptions.cols[this.id] && doptions.curcol < doptions.maxcol) {
            $(this).parent().show();
            doptions.curcol += 1;
        }
    });
}

//********** Drag&Drop functionality **********

interact('.col_header')
    .draggable({
        manualStart: true,

        restrict: {
            restriction: "parent",
            endOnly: true,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },

        // call this function on every dragmove event
        onmove: dragMoveListener,
        // call this function on every dragend event
        onend: dragEndListener
    })
    .on('move', function (event) {
        var interaction = event.interaction;

        if (interaction.pointerIsDown && !interaction.interacting()) {
            var src = event.currentTarget.parentElement,  // original column
                ava = src.cloneNode(),  // draggable copy
                $src = $(src),
                $ava = $(ava);
			
            ava._src = src;
			
            $ava.addClass('draggable');
            $src.removeClass('droppable');
            $src.addClass('col_drag');
            $('body').addClass('no_select');
			
            $ava.css({ position: "absolute" });
            $ava.offset({ left: $(src).offset().left, top: $(src).offset().top });
            $ava.outerWidth($(src).outerWidth());
            $ava.outerHeight($(src).outerHeight());
            document.body.appendChild(ava);

            interaction.start({ name: 'drag' }, event.interactable, ava);
        }
    });

function dragMoveListener (event) {     
    var trg = event.target,
        x = (parseFloat(trg.getAttribute('data-x')) || 0) + event.dx;

    // translate the element
    trg.style.webkitTransform = trg.style.transform = 'translateX(' + x + 'px)';

    // update the position attributes
    trg.setAttribute('data-x', x);
}

function dragEndListener (event) {
    var trg = event.target;
	
    $(trg).remove();
    $(trg._src).addClass('droppable');
    $(trg._src).removeClass('col_drag');
    $('body').removeClass('no_select');
}

//********************

interact('.droppable').dropzone({
    accept: '.draggable',
    overlap: 'pointer',
	
    ondragenter: function (event) {
        $(event.target).addClass('drop-target');
        $(event.target).find('.col_header').addClass('drop-target_header');
    },	
	
    ondrop: function (event) {
        var src = event.relatedTarget._src,
            trg = event.target;

        if (src === trg) return;
        $(src).swap(trg);
    },
	
    ondragleave: function (event) {
        $(event.target).removeClass('drop-target');
        $(event.target).find('.col_header').removeClass('drop-target_header');
    },	
	
    ondropdeactivate: function (event) {
        $(event.target).removeClass('drop-target');
        $(event.target).find('.col_header').removeClass('drop-target_header');
    }	
});
