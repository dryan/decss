// sample code for integrating with Google Analytics. This code will track each slide navigation as a separate pageview.

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-XXXXX-X', 'yourdomain.tld');
document.addEventListener('decsschange', function(e) {
    ga('send', 'pageview', [window.location.pathname, '#', e.detail.slide.id, '/', String(e.detail.step)].join(''));
}, false);
