/*global $t, teal */

"use strict";

window.teal = {};
window.$t = window.teal;

teal.copyto = function(obj, res) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Array) {
        for (var i = obj.length - 1; i >= 0; --i) {
            res[i] = $t.copy(obj[i]);
        }
    }
    else {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                res[i] = $t.copy(obj[i]);
            }
        }
    }
    return res;
};

teal.copy = function(obj) {
    if (!obj) {
        return obj;
    }
    return teal.copyto(obj, new obj.constructor());
};

teal.element = function(name, props, place) {
    var dom = document.createElement(name);
    for (var i in props) {
        dom.setAttribute(i, props[i]);
    }
    if (place) {
        place.appendChild(dom);
    }
    return dom;
};

teal.id = function(id) {
    return document.getElementById(id);
};

teal.set = function(sel, props) {
    for (var i in props) {
        sel.setAttribute(i, props[i]);
    }
    return sel;
};

teal.clas = function(sel, oldclass, newclass) {
    var oc = oldclass ? oldclass.split(/\s+/) : [],
        nc = newclass ? newclass.split(/\s+/) : [],
        classes = (sel.getAttribute('class') || '').split(/\s+/);
    for (var i in oc) {
        var ind = classes.indexOf(oc[i]);
        if (ind >= 0) {
            classes.splice(ind, 1);
        }
    }
    for (var i in nc) {
        if (classes.indexOf(nc[i]) < 0) {
            classes.push(nc[i]);
        }
    }
    sel.setAttribute('class', classes.join(' '));
};

teal.empty = function(sel) {
    if (sel.childNodes) {
        while (sel.childNodes.length) {
            sel.removeChild(sel.firstChild);
        }
    }
};

teal.remove = function(sel) {
    if (sel) {
        if (sel.parentNode) {
            sel.parentNode.removeChild(sel);
        } else {
            for (var i = sel.length - 1; i >= 0; --i) {
                sel[i].parentNode.removeChild(sel[i]);
            }
        }
    }
};

teal.bind = function(sel, eventname, func, bubble) {
    if (eventname.constructor === Array) {
        for (var i in eventname) {
            sel.addEventListener(eventname[i], func, bubble ? bubble : false);
        }
    } else {
        sel.addEventListener(eventname, func, bubble ? bubble : false);
    }
};

teal.unbind = function(sel, eventname, func, bubble) {
    if (eventname.constructor === Array) {
        for (var i in eventname) {
            sel.removeEventListener(eventname[i], func, bubble ? bubble : false);
        }
    } else {
        sel.removeEventListener(eventname, func, bubble ? bubble : false);
    }
};

teal.one = function(sel, eventname, func, bubble) {
    var oneFunc = function(e) {
        func(e);
        teal.unbind(sel, eventname, oneFunc, bubble);
    };
    teal.bind(sel, eventname, oneFunc, bubble);
};

teal.raiseEvent = function(sel, eventname, bubble, cancelable) {
    var evt = document.createEvent('UIEvents');
    evt.initEvent(eventname, bubble === undefined ? true : bubble,
            cancelable === undefined ? true : cancelable);
    sel.dispatchEvent(evt);
};

if (navigator.appName === 'Microsoft Internet Explorer') {
    teal.getElementsByClass = function(classes, node) {
        var node = node || document,
            list = node.getElementsByTagName('*'),
            cl = classes.split(/\s+/),
            result = [];

        for (var i = list.length - 1; i >= 0; --i) {
            for (var j = cl.length - 1; j >= 0; --j) {
                var clas = list[i].getAttribute('class');
                if (clas && clas.search('\\b' + cl[j] + '\\b') !== -1) {
                    result.push(list[i]);
                    break;
                }
            }
        }
        return result;
    };
}
else {
    teal.getElementsByClass = function(classes, node) {
        return (node || document).getElementsByClassName(classes);
    };
}

teal.rpc = function(params, resp) {
    var ajax = new XMLHttpRequest(), ret;
    ajax.open("post", 'f', resp ? true : false);
    ajax.onreadystatechange = function() {
        if (ajax.readyState === 4) {
            if (resp) {
                resp(JSON.parse(ajax.responseText));
            } else {
                ret = JSON.parse(ajax.responseText);
            }
        }
    };
    ajax.send(JSON.stringify(params));
    return ret;
};

teal.uuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

teal.getUrlParams = function() {
    var params = window.location.search.substring(1).split("&");
    var res = {};
    for (var i in params) {
        var keyvalue = params[i].split("=");
        res[keyvalue[0]] = decodeURI(keyvalue[1]);
    }
    return res;
};
