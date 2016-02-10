var doptions = {
    maxcol: 5,
    curcol: 0,
    cols: {
        News: true,
        Sports: false,
        Business: true,
        Entertainment: true,
        Tech: true,
        Notable: true,
    },
};

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

// Add headers for news columns. Mark news columns as droppable. Show selected columns (and not greater than maxcol)
$('.col_data').each(function(i) {
    var $wrapper = $(this).parent();
    
    $wrapper.addClass('droppable');
    $wrapper.prepend('<h2 class="col_header">' + this.id + '</h2>');
    if (doptions.cols[this.id] && doptions.curcol < doptions.maxcol) {
        $wrapper.show();
        doptions.curcol += 1;
    }
});

//********** Options **********

$('.col_button').click(function() {
    var $opt = $('.col_options');
	
    if (!$opt.is(':visible')) {
        var s = '';
        $('.col_data').each(function(i) {
            s += '<input type="checkbox" data-id=' + this.id + 
                 ($(this).parent().is(':visible') ? ' checked' : (doptions.curcol < doptions.maxcol ? '' : ' disabled')) + 
                 '>&nbsp;' + this.id + '<br>';
        });
        $opt.html(s);
        $opt.fadeIn();
    } else {
        $opt.fadeOut();
    }
});

$('.col_options').click(function(e) {
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
