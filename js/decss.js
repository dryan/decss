/*jshint loopfunc: true */
(function(window, document, console, WebSocket, JSON) {
    "use strict";

    // check for modern browser dependenices
    var
    dependencies    =   {
        'queryselectorall':     document.querySelectorAll,
        'classlist':            (document.body || document.documentElement).classList,
        'addeventlistener':     window.addEventListener,
        'forEach':              Array.prototype.forEach,
        'indexOf':              Array.prototype.indexOf,
        'map':                  Array.prototype.map,
        'reduce':               Array.prototype.reduce,
        'json':                 JSON && JSON.parse && JSON.stringify
    },
    dependenciesMet =   true; // optimisim

    for (var dependency in dependencies) {
        if(typeof dependencies[dependency] === 'undefined') {
            (document.body || document.documentElement).className   +=  [' ', dependency, '-not-supported'].join('');
            dependenciesMet =   false;
        }
    }
    if(!dependenciesMet) {
        (document.body || document.documentElement).className   +=  ' not-supported';
        return; // bails out of the rest of the script
    }

    // trims hashes for consistancy
    function cleanHash(hash) {
        if(!hash) {
            hash    =   window.location.hash;
        }
        return hash.replace(/^#/, '');
    }

    // returns elem.querySelectorAll as an Array
    function queryElements(elem, selector) {
        try {
            return Array.prototype.slice.call(elem.querySelectorAll(selector), 0);
        } catch(e) {
            return [];
        }
    }

    // pads a string to the given length; used by the presenter timer
    function lPad(str, pad, length) {
        str     =   String(str);
        while(str.length < length) {
            str     =   [pad, str].join('');
        }
        return str;
    }

    // removes duplicate elements from an array
    function dedupe(arr) {
        return arr.reduce(function(newArray, item) {
            if(newArray.indexOf(item) < 0) {
                newArray.push(item);
            }
            return newArray;
        }, []);
    }

    // returns an array containing the integers between min and max, inclusive
    function range(min, max) {
        var
        ret     =   [];
        while(min <= max) {
            ret.push(min++);
        }
        return ret;
    }

    // returns the sum of all values in the array
    function sum(arr) {
        return arr.reduce(function(a, b) {
            return a + b;
        }, 0);
    }

    // used to grab the data-step values from the steps
    function getStepNumber(elem) {
        return parseFloat(elem.getAttribute('data-step')) * 1;
    }

    var
    controller  =   false,
    _deck;

    // the main object
    // methods and properties prefixed with __ are considered private and subject to change or removal
    function Deck() {
        this.__html             =   document.getElementsByTagName('html')[0];
        this.__body             =   document.body || document.documentElement;
        this.__progress         =   document.createElement('progress');
        this.__timer            =   document.createElement('time');
        this.__selector         =   document.createElement('select');
        this.__viewers          =   document.createElement('div');
        this.__started          =   null;
        this.__socket           =   null;
        this.__socketReady      =   false;
        this.__socketQueue      =   [];
        this.deck               =   document.getElementById('deck');
        this.slides             =   queryElements(this.deck, 'section');
        this.id                 =   this.deck.getAttribute('data-id');
        this.currentSlide       =   this.slides[0];
        this.currentPosition    =   0;
        this.touchDuration      =   Math.max(this.deck.getAttribute('data-touch-duration') ? parseFloat(this.deck.getAttribute('data-touch-duration')) : 0, 500);
        this.touchDistance      =   Math.max(this.deck.getAttribute('data-touch-distance') ? parseFloat(this.deck.getAttribute('data-touch-distance')) : 0, 150);
        this.fullscreen         =   false;
        this.debug              =   this.deck.getAttribute('data-debug') ? !!JSON.parse(this.deck.getAttribute('data-debug')) : false;
        this.inControl          =   false;
        this.allowControl       =   null;
    }

    Deck.prototype.__debug      =   function() {
        if(this.debug && console.debug) {
            console.debug.apply(console, arguments);
        }
    };

    // where most of the work happens
    Deck.prototype.init =   function() {
        // set up the progress bar
        _deck.__progress.setAttribute('max', _deck.slides.length);
        _deck.__setProgress(1);
        _deck.__body.appendChild(_deck.__progress);

        // set up the presenter timer
        _deck.__timer.setAttribute('id', 'timer');
        _deck.__timer.innerHTML =   '0:00';
        _deck.__body.appendChild(_deck.__timer);

        // if the timer should be a clock, start it now
        if(_deck.deck.getAttribute('data-counter') === 'time') {
            _deck.__updateClock();
        }

        // set up the viewers div
        _deck.__viewers.setAttribute('id', 'viewers');
        _deck.__body.appendChild(_deck.__viewers);

        // loop through each deck and do the initial setup
        _deck.slides.forEach(function(slide, index) {
            // if the slide doesn't have an ID, set one
            if(!slide.getAttribute('id')) {
                slide.setAttribute('id', ['slide', index + 1].join('-'));
            }
            // count the number of steps in each slide
            var
            steps           =   queryElements(slide, '[data-step]:not([data-step="0"])'), // we exclude the data-step="0" slides since they appear with the initial slide view
            stepsIntsOrig   =   dedupe(steps.map(getStepNumber)), // get an array of just the step numbers, deduped
            stepsInts       =   range(1, stepsIntsOrig.length), // reset the steps to fix any missing numbers; we start at 1 since the 0s aren't counted here
            stepsMax        =   Math.max.apply(null, stepsInts); // calculate the max step

            if(!(stepsIntsOrig.length === stepsInts.length && sum(stepsIntsOrig) === sum(stepsInts))) {
                // the markup has skipped one or more steps, so correct that
                steps.forEach(function(step) {
                    step.setAttribute('data-step', stepsInts[stepsIntsOrig.indexOf(JSON.parse(step.getAttribute('data-step')))]);
                });
            }

            slide.steps         =   isFinite(stepsMax) ? stepsMax : 0; // set the steps property to the maximum step number for use in navigation
            slide.setAttribute('data-current-step', 0); // add a data attribute for use in presenter mode
            slide.setAttribute('data-steps', slide.steps); // add a data attribute for use in presenter mode
            slide.currentStep   =   0; // init the currentStep to 0
            slide.setAttribute('data-slide', index + 1); // add a data attribute for use in presenter mode
            slide.setAttribute('data-total', _deck.slides.length); // add a data attribute for use in presenter mode; kinda stupid we have to do this on each one
        });

        // set up the slide selector
        _deck.__selector.setAttribute('id', 'selector');
        var
        option  =   document.createElement('option'),
        i       =   _deck.slides.length;
        while(i--) {
            var
            opt             =   option.cloneNode();
            opt.setAttribute('value', i);
            opt.innerHTML   =   'Slide ' + lPad(i + 1, '0', String(_deck.slides.length).length) + ': ' + _deck.slides[i].getAttribute('id');
            _deck.__selector.insertBefore(opt, _deck.__selector.firstChild);
        }
        _deck.__body.appendChild(_deck.__selector);
        _deck.__selector.addEventListener('change', function(e) {
            _deck.changeToSlide(parseFloat(_deck.__selector.value));
        }, false);

        // set the max-height of figure elements according to the size of the images inside to help with repsonsive images
        window.addEventListener('load', function() {
            queryElements(_deck.deck, 'figure').forEach(function(figure) {
                figure.maxHeight    =   0;
                queryElements(figure, 'img').forEach(function(img) {
                    img.displayHeight   =   img.getAttribute('height') ? parseFloat(img.getAttribute('height')) : img.height; // use the attribute height if it's set, if not use the natural height; this is so retina scaled images can be used with the intended height
                    figure.maxHeight    =   img.displayHeight > figure.maxHeight ? img.displayHeight : figure.maxHeight;
                });
                figure.style.maxHeight  =   figure.maxHeight + 'px';
            });
        }, false);

        _deck.__socketSetup(); // set up the websocket if available

        // check if there's not a hash set already; set one if there isn't or move to the appropriate slide if there is
        if(!window.location.hash) {
            window.location.hash    =   _deck.slides.length ? _deck.slides[0].getAttribute('id') : '';
            _deck.changeToSlide(_deck.slides[0], 0, 'init');
        } else {
            // check if any of the slides match the hash
            var
            matched     =   false;
            _deck.slides.forEach(function(slide) {
                if(slide.getAttribute('id') === cleanHash()) {
                    // this is the correct slide, so switch to it
                    matched =   true;
                    _deck.changeToSlide(slide, 0, 'init');
                    return;
                }
            });
            if(!matched) {
                // no match was found so go to the first slide
                _deck.home();
            }
        }
        _deck.__body.setAttribute('data-current-slide', cleanHash());

        // add a class to the html tag; by default the slides are hidden until everything loads and this class is added
        window.addEventListener('load', function() {
            _deck.__html.classList.add('ready');
        });

        // listen for fullscreen changes and set the deck property accordingly
        document.addEventListener('webkitfullscreenchange', function(e) {
            _deck.fullscreen    =   !!document.webkitFullscreenElement;
        }, false);
        document.addEventListener('mozfullscreenchange', function(e) {
            _deck.fullscreen    =   !!document.mozFullScreenElement;
        }, false);
        document.addEventListener('msfullscreenchange', function(e) {
            _deck.fullscreen    =   !!document.msFullscreenElement;
        }, false);
        document.addEventListener('fullscreenchange', function(e) {
            _deck.fullscreen    =   !!document.fullscreenElement;
        }, false);

        // setup the keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            switch(e.keyCode) {
                case 33: // page up
                case 37: // left
                case 74: // J
                    _deck.previous('keyboard');
                    break;
                case 34: // page down
                case 39: // right
                case 75: // K
                    _deck.next('keyboard');
                    break;
                case 27: // escape
                case 80: // P
                    if(e.ctrlKey || e.keyCode === 80) {
                        _deck.__html.classList.toggle('presenter');
                    }
                    break;
                case 35: // end
                    _deck.end('keyboard');
                    break;
                case 36: // home
                    _deck.home('keyboard');
                    break;
                case 70: // F
                    _deck.goFullscreen();
                    break;
                default:
                    break;
            }
        }, false);

        // if touch events are supported, listen for swipes
        if('ontouchstart' in _deck.__body) {
            var
            start       =   {'x': 0, 'y': 0, 'time': 0};
            _deck.__body.addEventListener('touchstart', function (e) {
                var
                touch       =   e.changedTouches[0];
                start.x     =   touch.pageX;
                start.y     =   touch.pageY;
                start.time  =   new Date().getTime();
                e.preventDefault();
            }, false);
            _deck.__body.addEventListener('touchmove', function(e) {
                e.preventDefault();
            }, false);
            _deck.__body.addEventListener('touchend', function(e) {
                var
                touch       =   e.changedTouches[0],
                now         =   new Date().getTime(),
                change      =   {
                    'x':    start.x - touch.pageX,
                    'y':    start.y - touch.pageY,
                    'time': now - start.time
                };
                if(change.time <= _deck.touchDuration) {
                    // is the event a quarter second or less
                    if(Math.abs(change.x) >= Math.abs(change.y)) {
                        // horizontal swipe
                        if(change.x >= _deck.touchDistance) {
                            // swipe left
                            _deck.next('touch');
                            if(!_deck.__started) {
                                _deck.__updateTimer();
                            }
                        } else if(change.x <= (0 - _deck.touchDistance)) {
                            // swipe right
                            _deck.previous('touch');
                            if(!_deck.__started) {
                                _deck.__updateTimer();
                            }
                        }
                    } else {
                        // vertical swipe
                        // not implemented
                    }
                }
            }, false);
        }

        // send out the deckinit event
        _deck.__emitEvent('decssinit');
    };

    // normalize the 1,800 ways to request a fullscreen presentation
    Deck.prototype.goFullscreen =   function() {
        if(this.__html.webkitRequestFullscreen) {
            this.goFullscreen     =   function() {
                this.__html.webkitRequestFullscreen();
            };
        } else if (this.__html.msRequestFullscreen) {
            this.goFullscreen     =   function() {
                this.__html.msRequestFullscreen();
            };
        } else if (this.__html.mozRequestFullscreen) {
            this.goFullscreen     =   function() {
                this.__html.mozRequestFullscreen();
            };
        } else if(this.__html.requestFullscreen) {
            this.goFullscreen     =   function() {
                this.deck.requestFullscreen();
            };
        }
        this.goFullscreen();
    };

    // sends messages out to the WebSocket
    Deck.prototype.__socketSend   =   function(message) {
        if(message) {
            // the message ID is used server side to handle multiple decks going at once
            message.id      =   this.id;
            // if the type isn't set, assume it's a "sync" message
            message.type    =   message.type ? message.type : 'sync';
            // put the message into a queue in case the socket goes down
            this.__socketQueue.push(message);
        }
        if(this.__socketReady) {
            // if the socket is online, loop through the queue and send all messages
            message =   this.__socketQueue.shift();
            while(message) {
                this.__socket.send(JSON.stringify(message));
                this.__debug('sending message', JSON.stringify(message));
                message =   this.__socketQueue.shift();
            }
        } else {
            // if the socket is offline, try again in 100 milliseconds
            var
            _deck   =   this;
            setTimeout(function() {
                _deck.__socketSend();
            }, 100);
        }
    };

    Deck.prototype.__socketSetup      =   function() {
        if(WebSocket && this.deck.getAttribute('data-sync-server')) {
            this.__socketSetup =   function() {
                // remote control
                _deck.__socket         =   new WebSocket([(!!JSON.parse(_deck.deck.getAttribute('data-sync-insecure')) ? 'ws' : 'wss'), '://', _deck.deck.getAttribute('data-sync-server'), '/socket/'].join(''));
                _deck.__socket.onopen      =   function() {
                    _deck.__socketReady    =   true;
                    _deck.__socketSend({'type': 'ping'});
                    _deck.__body.setAttribute('data-syncing', true);
                };
                _deck.__socket.onerror     =   function(error) {
                    try {
                        console.error('socket error', error);
                    } catch(e) {}
                    _deck.__body.setAttribute('data-syncing', false);
                };
                _deck.__socket.onmessage   =   function(message) {
                    _deck.__debug('received message', message);
                    message     =   JSON.parse(message.data);
                    if(message.type === 'sync') {
                        if(_deck.allowControl === null) {
                            _deck.allowControl  =   window.confirm('Allow the presenter to control your screen?');
                        }
                        if(_deck.allowControl) {
                            _deck.changeToSlide(cleanHash(message.hash), message.step, 'socket');
                        }
                    } else if(message.type === 'pong') {
                        controller      =   message.auth;
                        _deck.inControl =   !!controller;
                        _deck.__body.setAttribute('data-in-control', !!controller);
                        if(_deck.allowControl === null) {
                            _deck.allowControl  =   true;
                        }
                    } else if(message.type === 'viewers') {
                        _deck.__viewers.innerHTML   =   message.viewers;
                    }
                };
                _deck.__socket.onclose     =   function() {
                    _deck.__socketReady    =   false;
                    setTimeout(_deck.__socketSetup, 1000);
                };
            };
        } else {
            // dummy fallback if websockets aren't supported
            this.__socketSetup    =   function() {
                this.__socket  =   {
                    'send':     function() {},
                    'status':   'UNSUPPORTED'
                };
            };
        }
        this.__socketSetup();
    };

    Deck.prototype.__updateTimer  =   function() {
        var
        now     =   new Date(),
        elapsed;
        if(!_deck.__started) {
            _deck.__started    =   now;
        }
        if(_deck.deck.getAttribute('data-counter') === 'time') {
            return;
        }
        elapsed =   now - _deck.__started;
        _deck.__timer.innerHTML =   [Math.floor(elapsed / 60000), lPad(Math.floor(elapsed / 1000) % 60, '0', 2)].join(':');
        setTimeout(function() {
            _deck.__updateTimer();
        }, 1000);
    };

    Deck.prototype.__updateClock    =   function() {
        function hourTo12(hour) {
            if(hour >= 12) {
                hour    =    hour - 12;
            }
            if(hour === 0) {
                hour    =   12;
            }
            return hour;
        }
        var
        now     =   new Date();
        _deck.__timer.innerHTML =   [hourTo12(now.getHours()), now.getMinutes()].join(':');
        setTimeout(function() {
            _deck.__updateClock();
        }, (60 - now.getSeconds()) * 1000);
    };

    Deck.prototype.__setProgress    =   function(value) {
        this.__progress.setAttribute('value', value);
        this.__selector.value       =   value - 1;
    };

    Deck.prototype.__emitEvent      =   function(type, detail) {
        if(!detail) {
            detail  =   {};
        }
        detail.deck   =   this;
        var
        event   =   new CustomEvent(type, {'detail': detail, 'bubbles': true});
        this.__debug('emitting ' + type + ' event', event);
        this.deck.dispatchEvent(event);
    };

    // send change events to 
    document.addEventListener('decsschange', function(e) {
        if(controller && e.detail && e.detail.deck && e.detail.slide && e.detail.sender && e.detail.sender !== 'socket') {
            var
            _deck   =   e.detail.deck;
            _deck.__socketSend({'hash': e.detail.slide.getAttribute('id'), 'step': e.detail.step});
        }
    }, false);

    Deck.prototype.changeToSlide    =   function(slide, step, sender) {
        if(!_deck.__started && (sender === 'keyboard' || sender === 'touch')) {
            _deck.__updateTimer();
        }
        if(typeof slide === 'string') {
            slide   =   queryElements(_deck.deck, ['#', cleanHash(slide)].join('')).pop(0);
        } else if(typeof slide === 'number' && _deck.slides.length && slide >= 0 && slide < _deck.slides.length) {
            slide   =   _deck.slides[slide];
        }
        if(slide && _deck.currentSlide !== slide) {
            window.location.href    =   ['#', slide.getAttribute('id')].join('');
            _deck.__body.setAttribute('data-current-slide', cleanHash());
            _deck.__body.scrollTop  =   0;
            _deck.__setProgress(_deck.slides.indexOf(slide) + 1);
            queryElements(slide, 'audio:not([data-step]):not([controls]),video:not([data-step]):not([controls])').forEach(function(media) {
                if(media.play) {
                    if(media.played.length) {
                        media.load();
                    }
                    media.play();
                }
            });
            var
            oldPosition             =   _deck.currentPosition,
            oldSlide                =   _deck.currentSlide;
            _deck.currentSlide      =   slide;
            _deck.currentPosition   =   _deck.slides.indexOf(slide);
            if(Math.abs(_deck.currentPosition - oldPosition) !== 0) {
                // we've skipped some slides
                if(_deck.currentPosition - oldPosition > 0) {
                    // we've jumped ahead
                    while(oldPosition < _deck.currentPosition) {
                        oldSlide    =   _deck.slides[oldPosition];
                        queryElements(oldSlide, '[data-step]').forEach(function(step) {
                            step.classList.add('active');
                            if(step.pause) {
                                step.pause();
                            }
                        });
                        oldSlide.currentStep    =   oldSlide.steps;
                        oldPosition +=  1;
                    }
                } else {
                    // we've jumped behind
                    while(_deck.currentPosition < oldPosition) {
                        oldSlide    =   _deck.slides[oldPosition];
                        queryElements(oldSlide, '[data-step].active').forEach(function(step) {
                            step.classList.remove('active');
                        });
                        oldSlide.currentStep    =   0;
                        oldPosition -=  1;
                    }
                }
            }
            _deck.__setProgress(_deck.currentPosition + 1);
        }
        if(slide && slide === _deck.currentSlide && typeof step !== 'undefined' && step !== slide.currentStep) {
            if(step < slide.currentStep) {
                // go backwards
                while(slide.currentStep > step) {
                    queryElements(_deck.currentSlide, '[data-step="' + _deck.currentSlide.currentStep + '"]').forEach(function(step) {
                        step.classList.remove('active');
                        if(step.pause) {
                            step.pause();
                        }
                    });
                    _deck.currentSlide.currentStep    -=  1;
                    _deck.currentSlide.setAttribute('data-current-step', _deck.currentSlide.currentStep);
                }
            } else if(step > slide.currentStep) {
                // go forwards
                while(slide.currentStep < step) {
                    _deck.currentSlide.currentStep    +=  1;
                    _deck.currentSlide.setAttribute('data-current-step', _deck.currentSlide.currentStep);
                    queryElements(_deck.currentSlide, '[data-step="' + _deck.currentSlide.currentStep + '"]').forEach(function(step) {
                        step.classList.add('active');
                        if(step.play) {
                            if(step.played.length) {
                                step.load();
                            }
                            step.play();
                        }
                    });
                }
            }
        } else if(slide && slide === _deck.currentSlide && typeof step !== 'undefined' && step === slide.currentStep) {
            queryElements(_deck.currentSlide, '[data-step="' + _deck.currentSlide.currentStep + '"]').forEach(function(step) {
                step.classList.add('active');
                if(step.play) {
                    if(step.played.length) {
                        step.load();
                    }
                    step.play();
                }
            });
        }
        _deck.currentSlide.setAttribute('data-current-step', _deck.currentSlide.currentStep);
        _deck.__emitEvent('decsschange', {'slide': _deck.currentSlide, 'step': _deck.currentSlide.currentStep, 'sender': sender});
        if(_deck.currentPosition === _deck.slides.length - 1 && _deck.currentSlide.currentStep === _deck.currentSlide.steps) {
            // the deck is finished
            _deck.__emitEvent('decssend', {'sender': sender});
        }
    };

    Deck.prototype.previous     =   function(sender) {
        if(this.currentSlide.currentStep >= 1) {
            this.changeToSlide(this.currentSlide, this.currentSlide.currentStep - 1, sender);
        } else if(this.currentPosition - 1 >= 0) {
            this.changeToSlide(this.currentPosition - 1, this.slides[this.currentPosition - 1].currentStep, sender);
        }
    };

    Deck.prototype.next         =   function(sender) {
        if(this.currentSlide.currentStep < this.currentSlide.steps) {
            this.changeToSlide(this.currentSlide, this.currentSlide.currentStep + 1, sender);
        } else if(this.currentPosition + 1 < this.slides.length) {
            this.changeToSlide(this.currentPosition + 1, this.slides[this.currentPosition + 1].currentStep, sender);
        }
    };

    Deck.prototype.home         =   function(sender) {
        this.changeToSlide(this.slides[0], 0, sender);
    };

    Deck.prototype.end          =   function(sender) {
        this.changeToSlide(this.slides[this.slides.length - 1], 0, sender);
    };

    // sets the internal and global variables and runs the init method
    function bootstrap() {
        _deck           =   new Deck();
        window.Decss    =   _deck;
        _deck.init();
    }
    if(document.readyState === 'complete') {
        bootstrap();
        // if the DOM is ready, run the init now
    } else {
        // if the DOM in not ready, add a listener
        document.addEventListener('DOMContentLoaded', bootstrap, false);
    }

})(window, document, window.console, window.WebSocket, window.JSON);