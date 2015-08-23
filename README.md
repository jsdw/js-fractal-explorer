# Fractal Explorer

Written as part of my playing-with-JavaScript phase back in 2012 to be a beautiful full-browser fractal explorer.

Create and explore fractals from within your web browser. Allows full customization of the colours and rendering quality and downloading of fractal images to your computer. Can be configured to use multiple threads to speed up performance, and fractal parameters can be tweaked to explore novel fractals.

Go [here](http://unbui.lt/projects/fractal/) to see it in action and have a play!

## Usage

- Pan around with the arrow keys, or zoom in by dragging a region to zoom into with the mouse (or using the + icon)
- Customise things by clicking the down arrow, such as colours, fractal options, and output options.

## Features

- Multi-core support for faster fractal rendering (using Web Workers)
- Pick whatever colours you like
- Zoom in as far as JS numbers will allow!
- Explore the Mandelbrot and Julia series, with configuration options to find entirely new fractals.
- Set the quality, in effect employing sub-pixel rendering to provide basic smoothing
- Save a render (in the background) at a desired height and width, and then view it in browser (from which you can save to desktop).

## Bugs

Link shortening probably won't work any more as it was wired in to an old Google API key.