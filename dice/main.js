/*global $t */

"use strict";

function diceInitialize(container, w, h) {
    function onSetChange(/*ev*/) {
        set.style.width = set.value.length + 3 + 'ex';
    }

    $t.remove($t.id('loading_text'));

    var canvas = $t.id('canvas');
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var label = $t.id('label');
    var set = $t.id('set');
    var selectorDiv = $t.id('selector_div');
    var infoDiv = $t.id('info_div');
    onSetChange();

    $t.bind(set, 'keyup', onSetChange);
    $t.bind(set, 'mousedown', function(ev) { ev.stopPropagation(); });
    $t.bind(set, 'mouseup', function(ev) { ev.stopPropagation(); });
    $t.bind(set, 'focus', function() { $t.set(container, { class: '' }); });
    $t.bind(set, 'blur', function() { $t.set(container, { class: 'svg' }); });

    $t.bind($t.id('clear'), ['mouseup', 'touchend', 'touchcancel'], function(ev) {
        ev.stopPropagation();
        set.value = '0';
        onSetChange();
    });

    var box = new $t.dice.dieBox(canvas);

    function showSelector() {
        infoDiv.style.display = 'none';
        selectorDiv.style.display = 'inline-block';
        box.drawSelector();
    }

    function beforeRoll(/*vectors*/) {
        infoDiv.style.display = 'none';
        selectorDiv.style.display = 'none';
    }

    function notationGetter() {
        return $t.dice.parseNotation(set.value);
    }

    function afterRoll(notation, result) {
        var res = result.join(' ');
        if (notation.constant) {
            res += ' +' + notation.constant;
        }
        if (result.length > 1) {
            res += ' = ' +
                (result.reduce(function(s, a) { return s + a; }) + notation.constant);
        }
        label.innerHTML = res;
        infoDiv.style.display = 'inline-block';
    }

    box.bindMouse(container, notationGetter, beforeRoll, afterRoll);
    box.bindThrow($t.id('throw'), notationGetter, beforeRoll, afterRoll);

    $t.bind(container, ['mouseup', 'touchend', 'touchcancel'], function(ev) {
        if (selectorDiv.style.display === 'none') {
            if (!box.rolling) {
                showSelector();
            }
            box.rolling = false;
            return;
        }
        var name = box.searchDieByMouse(ev);
        if (name !== undefined) {
            var notation = $t.dice.parseNotation(set.value);
            notation.set.push(name);
            set.value = $t.dice.stringifyNotation(notation);
            onSetChange();
        }
    });

    var params = $t.getUrlParams();
    if (params.notation) {
        set.value = params.notation;
    }
    if (params.roll) {
        $t.raiseEvent($t.id('throw'), 'mouseup');
    }
    else {
        showSelector();
    }
}
