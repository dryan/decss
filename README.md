# Decss

Present from the Web, Beautifully

Decss was designed from the ground up to be a presenter-friendly way to give presentations in HTML/CSS/JS. Using modern markup, with the old `<center>` tag repurposed, you can quickly build a deck that everyone will love.

## Requirements

To stay lightweight, Decss requires modern browser functionality. However, if you want to support older browsers, you may use [https://github.com/inexorabletash/polyfill](https://github.com/inexorabletash/polyfill) and [https://github.com/douglascrockford/JSON-js](https://github.com/douglascrockford/JSON-js) to meet the requirements.

When a browser does not meet all the requirements, a class of `not-supported` is added to `<html>` tag. You may use that class to show a message to viewers.

## Basic Usage

Three files are required to use Decss: `modernizr.js`, `decss.min.js` and `decss.css`. You can host these yourself or get point to:

* http://dryan.github.io/decss/js/modernizr.js
* http://dryan.github.io/decss/js/decss.min.js
* http://dryan.github.io/decss/css/decss.css

If you want to use your own version of Modernizr, please include the Flexible Box Model (not the legacy version), CSS 3D Transforms and CSS Boxsizing (available under non-core detects) tests.

```html
<!doctype HTML>
<html class="no-js">
    <head>
        <title>My Awesome Presentation</title>
        <link href="http://dryan.github.io/decss/css/decss.css" rel="stylesheet">
        <script src="http://dryan.github.io/decss/js/modernizr.js"></script>
    </head>
    <body>
        <script src="http://dryan.github.io/decss/js/decss.min.js"></script>
    </body>
</html>
```

### Markup

A deck consists of a container element with `id="deck"` (the "deck element") containing one or more `<section>`s, which act as the slides.

```html
<body>
    <main id="deck">
        <section id="intro">
            <header>
                <h1>Welcome to My Awesome Presentation</h1>
            </header>
            <center>
                <p>Here's some bullets:</p>
                <ul>
                    <li>To being with</li>
                    <li>But also</li>
                    <li>And finally</li>
                </ul>
            </center>
        </section>
    </main>
</body>
```

Each slide may contain any markup you choose. The `<header>` and `<center>` tags act as special layout triggers. In browsers that support the modern flexbox syntax, content inside the `<center>` tag will be vertically centered in a single column. `<center class="horizontal">` will align its children in a single row, instead. A `<header>` that is the only child of a `<section>` acts like a `<center>` tag as well.

### Images

To place multiple images in a row, wrap them with a `<figure>` tag. Additionally, add a class of `two-up`, `three-up`, `four-up` or `five-up` depending on how many images there are.

```html
<figure class="three-up">
    <img src="http://placekitten.com/a/200/300" width="200" height="300" alt="Aww a kitty!">
    <img src="http://placekitten.com/b/200/300" width="200" height="300" alt="Aww another kitty!">
    <img src="http://placekitten.com/c/200/300" width="200" height="300" alt="More kittens!">
</figure>
```

### Background Images

Slide backgrounds are set using the normal CSS `background-image` property. Decss sets these to use `background-size: cover` for you.

```html
<!-- inline background -->
<section id="intro" style="background-image: url('http://placekitten.com/1280/1280')">
</section>

<!-- CSS style tag or external file -->
<section id="intro">
</section>
<style>
    #intro {
        background-image: url('http://placekitten.com/1280/1280');
    }
</style>
```


## Builds / Steps

Sometimes you want items to appear manually instead of when the slide first appears. Adding a `data-step` attribute to elements achieves this.

```html
<section id="my-slide">
    <header>
        <h1>Building Suspense</h1>
    </header>
    <center>
        <ul>
            <li data-step="1">Step 1</li>
            <li data-step="2">Step 2</li>
            <li data-step="3">Step 3</li>
        </ul>
    </center>
</section>
```

In this example, no bullets would be visible at first. As you navigate forward through the deck, each one will show in turn. Once the last step has become visible, navigating forward again moves on to the next slide. Note that multiple elements can share the same step and will be made visible at the same time.

Steps may also be nested:

```html
<section id="my-slide">
    <header>
        <h1>Building Suspense</h1>
    </header>
    <center>
        <ul>
            <li data-step="1">Step 1<span data-step="2">: but wait, there's more!</span></li>
            <li data-step="3">Step 2</li>
            <li data-step="4">Step 3</li>
        </ul>
    </center>
</section>
```
In this example, the first bullet would appear with just "Step 1" visible, then the rest would appear before "Step 2".

## Audio and Video

Decss supports multimedia via `<audio>` and `<video>` tags. Elements that have a `data-step` attribute will be played when their step number is reached. Elements without a `data-step` attribute and without a `controls` attribute are played automatically when their slide is shown.

```html
<section id="media-slide">
    <header>
        <h1>Check out this awesome video</h1>
    </header>
    <center>
        <video src="http://pdl.vimeocdn.com/70085/179/156173617.mp4" width="1280" height="720" data-step="1" controls>
        <audio src="/audio/sadtrombone.mp3">
    </center>    
</section>
```

In this example, the video will play when the deck is navigated forward after this slide appears. The audio file will play when the slide first appears.

## Navigation

The following keys may be used to navigate through the deck:

* Beginning of deck: home
* End of deck: end
* Previous slide/step: left arrow or page up
* Next slide/step: right arrow or page down
* Presenter mode: control + escape
* Fullscreen mode: F or f

Additionally, on touch enabled devices, swiping towards the right edge of the screen goes forwards and swiping towards the left edge goes backwards.

Swiping gestures require a minimum movement of 150 pixels, though a larger threshold can be set by adding a `data-touch-distance` attribute to the deck element. Additionally, swipes must start and end in 500 milliseconds or less; adding a `data-touch-duration` larger than 500 will override this setting.

## Transition Styles

Currently Decss has two transition styles available: fade and zoom. The transition style is set via the `<body>` tag's `data-transition` attribute. `<body data-transition="zoom">`, for example. If no transition is specified, fade is used.

A third style, slide, is in the works but is pretty buggy at the moment.

## Presenter Mode

Pressing control+escape will toggle a presenter mode. In this mode, you will see the current slide with any unrevealed steps slightly visible, the next slide to be shown, a timer of how long the presentation has been running and a selector to jump between slides. Beneath each slide is the number of the current slide, which step that slide is on, and any presenter notes set with a `data-notes` attribute on the slide.

Presentation mode adds a `presenter` class to the `<html>` tag that you can use for addition  styling.

## Customizing the Deck's Style

You can include the base `decss.css` file and then override it with your own CSS, but the better method is to use SASS to create your own custom CSS file.

```sass
// set the initial variables
$bodyBackground:            black;
$bodyColor:                 white;
$bodyFont:                  'Open Sans', sans-serif;
$bodyWeight:                400;
$bodyFontSizeBase:          16px;
$bodyFontSizeLarge:         24px;

@import "decss";

// add more custom styles below
```

See [the variables.scss file](https://github.com/dryan/decss/blob/master/sass/variables.scss) for the complete list of options. Customizing the SASS files requires [bourbon.io](http://bourbon.io).

## JavaScript API

Once the deck is setup, the `window.Decss` variable will point to the current Deck object. This object has several properties and methods you may use. Properties and methods beginning with `__` are considered private and are subject to change in the future.

### Slide Instances

Each slide is represented as an HTMLNode with the following properties added:

* steps: the highest numbered step in this slide
* currentStep: the current step being displayed

### Decss.changeToSlide(slide, step, sender)

Use this method to change to a specific slide and step. 

The `slide` argument may be an instance of a slide, the `id` attribute of a slide (with or without the `#` at the beginning) or the number of the slide in the deck (zero-based);

If `step` is set, the given slide will be set to that step. Leaving it `null` will keep the slide in its current state.

The `sender` argument is used to track the source of the `changeToSlide` call. This is passed on to emitted events for use by event listeners.

### Decss.currentPosition

The index of the current slide in the `Decss.slides` array.

### Decss.currentSlide

The slide instance of the currently visible slide.

### Decss.debug

A boolean indicating if this deck is in debug mode or not. Initially set from the deck element's `data-debug` attribute. In debug mode, additional information will be sent to the JavaScript console.

### Decss.deck

The HTMLNode for the deck element.

### Decss.end()

Navigates to the final slide of the deck.

### Decss.fullscreen

A boolean indicating if the deck is currently fullscreen or not.

### Decss.goFullscreen()

Requests that the browser display the deck in fullscreen mode.

### Decss.home()

Navigates to the first slide of the deck and resets its currentStep to 0.

### Decsss.id

The value of the deck element's `data-id` attribute. Used by multi-screen syncing.

### Decss.init()

Does all of the setup work to present the deck. This is called automatically by the script, but if you programattically change the contents of the deck, you should run this again.

### Decss.next()

Navigates one step or slide ahead.

### Decss.previous()

Navigates one step or slide behind.

### Decss.slides

An array of all the slide instances in the deck.

### Decss.touchDistance

An integer of how many pixels a swipe gesture must be to be considered for navigation. Determined intially by the deck element's `data-touch-distance` attribute.

### Decss.touchDuration

An integer of how many milliseconds a swipe gesture must occur within to be considered for navigation. Determined initially by the deck element's `data-touch-duration` attribute.

## JavaScript Events

There are several events that you may attach listeners to in order to interact with the deck programattically. Each event is sent from the deck element, so you must attach either to that element or one of its parents to receive the events.

Each event's `detail` property is an object. Every event detail has a `deck` property pointing to the Deck instance that sent the event. Some events' `detail`s also have a `sender` property is added to the event's `detail` indicating if the end event was reached via keyboard, touch, message (from the sync server) or a custom sender that you have used. Additionally, some events have additional properties as outlined below.

### decssinit

Emitted when Decss.init() has completed. Does not indicate a `sender`.

### decssend

Emitted when the final slide is visible and its final step has been shown.

### decsschange

Emitted everytime `changeToSlide` is called. In addition to `deck` and `sender`, a decsschange event's `detail` contains the following properties:

* slide: the slide that was changed to
* step: the step that was changed to

Examples:

```javascript
// Example 1
document.addEventListener('decsschange', function(e) {
    if(e.detail.slide.id === 'intro' && e.detail.slide.currentStep === 0) {
        Decss.next();
    }
}, false);
// Example 2
document.addEventListener('decssend', function(e) {
    window.alert('You have reached the end of our journey');
}, false);
```

In Example 1, whenever the slide with the id 'intro' is shown, if that slide is at the initial step, automatically show the next step.

In Example 2, when the deck is finished, an alert will be triggered.