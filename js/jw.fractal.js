
//###FractalMachine class ###
function FractalMachine()
	{
	var options = 
		{ 
		sx: 3, sy:2, cx: 0, cy: 0, loadspeed:20, quality: 1, id: "default", threads: 4, canvas: {height:0,width:0}, lf: function(){}
		}; 
	var timeout, drawing = 0, data = [], stop, workers = [], loaded = 0;

	var algorithm = new FractalAlgorithm();
	var colours = {getColour: function(d) {return d;}, save: function() {return "Cannot Save";}}; //if no colourRange given, just return raw data.

	function clearWorkers()
		{
		for(var i = 0 ; i < workers.length; i++)
			{
			workers[i].terminate();
			}
		workers = [];
		}

	//dirty hack to make safari css bug go away:
	var fixCSSThing = 0;
	function fixCSS(){
		options.canvas.style.border = fixCSSThing+"px transparent";
		fixCSSThing = fixCSSThing? 0 : 1;
	}

	function processWorkerFeedback(e)
		{
		function process(data)
			{
			var lines = parseInt(data.lines), row = parseInt(data.row), width = parseInt(data.width);
			var ctx = options.canvas.getContext("2d");
			var c = ctx.createImageData(width, lines);
			var d = data.data;
			var dlength = d.length;
			var cinc = 0;
			for(var i = 0; i < dlength;) 
				{
				c.data[cinc] = d[i];
				c.data[++cinc] = d[++i];
				c.data[++cinc] = d[++i];
				c.data[++cinc] = 255;
				++cinc; ++i;
				}
			
			ctx.putImageData(c, 0, row);
			loaded += lines;
			}

		var data = e.data;
		switch(data.cmd)
			{
			case "process":
				process(data);
				options.lf(loaded, options.canvas.height);
				if(loaded >= options.canvas.height) loaded = 0;
			break;
			case "drawing":
				if(data.value == 1) ++drawing;
				if(data.value == 0) --drawing;
				if(drawing == 0) fixCSS(); //done. fix dodgy css canvas thing causing lines
			break;
			case "log":
				console.log.apply(console,data.value);
			break;
			default:
				throw Error("Fractal: processWorker: command not recognised, returned: " + data);
			}
		}

	function setupWorkers()
		{
		if(window.Worker)
			{
			clearWorkers();
			var w;
			for(var i = 0; i < options.threads; i++) 
				{
				w = new Worker("js/jw.fractal_worker.js");
				w.postMessage({cmd: "set", value: algorithm.set()});
				w.onmessage = processWorkerFeedback;
				workers.push(w);
				}
			}
		}

	function testWorkers(command)
		{
		for(var i = 0; i < workers.length; i++)
			{
			workers[i].postMessage(command);
			}
		}
	this.testWorkers = testWorkers;

	function mathLog(val, base)
		{
		if(typeof base == "undefined") return Math.log(val); else return Math.log(val)/Math.log(base);
		}

	function cancelDrawing()
		{
		loaded = 0;
		drawing = 0;
		setupWorkers(); //terminates and recreates workers.
		stop = true;
		clearTimeout(timeout);
		data = [];
		fixCSS();
		}
	this.cancel = cancelDrawing;

	function workerSet(option, value)
		{
		if(window.Worker)
			{
			for(var i = 0; i < workers.length; i++)
				{
				workers[i].postMessage({"cmd": "set", "option": option, "value": value});
				}
			}
		}

	this.cleanUp = function()
		{
		clearWorkers();
		data = [];
		}

	//get/set options using this:
	function set()
		{
		if(typeof arguments[0] == "string")
			{
			//if option belongs to underlying algorithm's class:
			if(typeof algorithm.set(arguments[0]) != "undefined")
				{
				if(arguments.length == 1) return algorithm.set(arguments[0]);
				else 
					{
					algorithm.set(arguments[0], arguments[1]);				
					workerSet(arguments[0], arguments[1]);
					}
				}
			//otherwise:
			else
				{
				if(arguments.length == 1) return options[arguments[0]];
				else 
					{
					if(arguments[0] == "colours") colours = arguments[1];
					else options[arguments[0]] = arguments[1];
					}
				}
			}
		else if(typeof arguments[0] == "object")
			{
			for(var i in arguments[0])
				{
				set(i, arguments[0][i]);
				}
			}
		else //return all settings (shallow cloned):
			{
			var o = algorithm.set();
			for(var i in options) o[i] = options[i];
			return o;
			}

		}
	this.set = set;

	var refresh_timeout;
	this.refresh = function(c)
		{
		clearInterval(refresh_timeout);
		function refresh()
			{
			if(window.Worker && workers.length > 0)
				{
				for(var i = 0; i < workers.length; i++)
					{
					workers[i].postMessage({
						cmd: "refresh",
						parameters: 
							{
							colours: colours.save()
							}
						});
					}
				}
			else
				{
				var cf = options.colourfunc;
				var ctx = c.getContext("2d");
				var h = c.height, w = c.width;
				var colour = [];

				var di = 0;
				function drawRow(starti)
					{
					var d;
					for(var i = starti; i < h; i+=2)
						{
						var cdata = ctx.createImageData(w,1);
						var pixels = cdata.data;
						for(var j = 0; j < pixels.length; j+=4)
							{
							d = data[di];
							col = colours.getColour(d);
							pixels[j] = col[0];
							pixels[j+1] = col[1];
							pixels[j+2] = col[2];
							pixels[j+3] = 255;
							di++;
							}
						ctx.putImageData(cdata, 0, i);
						}
					}
				drawRow(0);
				drawRow(1);
				}
			}
		function loop()
			{
			if(!drawing) { clearInterval(refresh_timeout); refresh(); }
			}
		refresh_timeout = setInterval(loop, 100);
		}

	this.draw = function(keepdata)
		{
		//clear data for this id:
		cancelDrawing();

		//get base parameters:
		var c = options.canvas;
		var w = c.width, h = c.height;
		var sx = options.sx, sy = options.sy, cx = options.cx, cy = options.cy;
		var quality = options.quality;
		var scalex = (2*sx)/w; //how big is each pixel?
		var scaley = (2*sy)/h;
		var loadspeed = options.loadspeed;

		//clear canvas:
		var ctx = c.getContext("2d");
		ctx.clearRect(0,0,w,h);

		if(window.Worker && workers.length > 0)
			{
			//pass in parameters to each worker:
			var partheight = Math.floor(h/workers.length), partheight_remainder = h % workers.length, row, lines;
			for(var i = 0; i < workers.length; i++)
				{
				row = (i != 0)? i*partheight+partheight_remainder : i*partheight;
				lines = (i == 0)? partheight+partheight_remainder : partheight;

				workers[i].postMessage({
					cmd: "process",
					parameters: 
						{
						row: row,
						lines: lines,
						width: w,
						height: h,
						scalex: scalex,
						scaley: scaley,
						centrex: cx,
						centrey: cy,
						quality: quality,
						colours: colours.save()
						}
					})
				}
			}
		else
			{
			//get other settings only relevant here:
			drawing = 1;
			var done = 0;
			var lf = options.lf;
			var cf = colours.getColour;

			//input options:
			keepdata = (typeof keepdata == "undefined")? false : keepdata;

			//setting up parameters:
			var h2 = h * 2;

			var subpixelx = scalex / (quality+1); // increments across pixel for quality.
			var subpixely = scaley / (quality+1);

			function getPixelData(x, y)
				{
				var ax = x*scalex-sx+cx;
				var ay = y*scaley-sy+cy;		
				var i, j, spx = subpixelx, spy = subpixely, subdata=[];
			
				for(i = 0; i < quality; i++)
					{
					for(j=0; j < quality; j++)
						{
						subdata.push(algorithm.run(ax+spx,ay+spy));
						spx += subpixelx;
						}
					spy += subpixely;
					spx = subpixelx;
					}

				var av = 0, datalength = subdata.length;
				for(i = 0; i < datalength; i++) av += subdata[i];
				return av/datalength;
				}

			function drawRow(starti, callBack) //starti = 0 or 1 (odd or even start).
				{
				var i = starti, d;
				function draw()
					{
					if(i < h)
						{
						for(var lines = 0; lines < loadspeed && i < h; lines++, i+=2)
							{
							var cdata = ctx.createImageData(w,1);
							var pixels = cdata.data;
							var pixels_length = pixels.length;

							//for all odd/even numbered pixels:
							for(var j = 0; j < pixels_length; j+=4)
								{
								d = getPixelData(j/4,i)
								col = colours.getColour(d);
								if(keepdata) data.push(d);
								pixels[j] = col[0];
								pixels[j+1] = col[1];
								pixels[j+2] = col[2];
								pixels[j+3] = 255;
								}
							ctx.putImageData(cdata, 0, i);
							done++;
							}
						//i += 2;
						if(stop != true) timeout = setTimeout(draw, 0);
						lf(done, h);
						}
					else 
						{
						if(typeof callBack == "function") callBack();
						}

					}
				function begin() 
					{
					stop = false;
					draw(); 
					}
				timeout = setTimeout(begin, 0);
				}

			drawRow(0, function() {drawRow(1, function(){ 
				drawing = 0;
				fixCSS();
			})});
			}
		}

	//init stuff:
	setupWorkers();
	}









//jQuery plugin for canvas gradient colour manipulator:

(function($){

function changeColourCallback(hex,hsv,rgb, data)
	{
	var i = data._currentstop;
	var $box = $(this).find("#gradientbar-above").children().eq(i);
	var $gradientbarcolour = $box.find(".gradientbar-colour");
	if($gradientbarcolour.css("backgroundColor") != "rgb("+rgb.r+ ", " + rgb.g + ", " + rgb.b + ")")
		{
		$box.find(".gradientbar-colour").css("backgroundColor", hex);
		data.cr.setCol(i, [rgb.r, rgb.g, rgb.b]);
		processGradient.call(this);
		if(typeof data.change == "function") data.change();
		}
	}

function changeColour($box, e, t, i)
	{
	var data = $(t).data("gradientbar");
	data._currentstop = i;
	var col = data.cr.getCol(i);
	$("#gradientbar-colourpicker").show();
	data._cp.setRgb({r: col[0], g: col[1], b: col[2]});
	}

function removeBox($box, e, t, i)
	{
	e.stopPropagation();
	$box.off(".gradientbar");
	$box.remove();
	var data = $(t).data("gradientbar");
	var cr = data.cr;
	cr.remove(i);
	processGradient.call(t);
	createColourBoxes.call(t);
	if(typeof data.change == "function") data.change();
	}

function killPicker($box)
	{
	$box.hide();
	}

function dragPicker(e,$box)
	{
	var orig_x = e.pageX, orig_y = e.pageY;
	var orig_offset = $box.offset();
	var width = $box.width(), height = $box.height();
	var window_width = $(window).width(), window_height = $(window).height();
	$(document).on("mousemove.dragpicker", function(e)
		{
		var dx = e.pageX - orig_x, dy = e.pageY - orig_y;
		var endleft = orig_offset.left+dx, endtop = orig_offset.top+dy;
		if(endleft < 0) endleft = 0;
		else if(endleft + width > window_width) endleft = window_width - width;
		if(endtop < 0) endtop = 0;
		else if(endtop + height > window_height) endtop = window_height - height;
		$box.css("left", endleft);
		$box.css("top", endtop);
		});
	$(document).on("mouseup", function()
		{
		$(document).off(".dragpicker");
		});
	}

function dragBox($box, e, t, i)
	{
	var $this = $(t);
	var data = $this.data("gradientbar");
	var cr = data.cr;
	var ox = e.pageX;
	var obox = parseInt($box.css("left"));

	var $prev = $box.prev(), $next = $box.next();
	var minpos = ($prev.length == 0)? 0 : parseInt($prev.css("left"))+5;
	var maxpos = ($next.length == 0)? data._canvaswidth : parseInt($next.css("left"))-5;

	var s = 1/data._canvaswidth;
	var interval;
	$(document).on("mousemove.dragging", function(e)
		{
		$("body").css("cursor", "move");
		var dx = e.pageX - ox;
		var newleft = obox+dx;
		if(newleft > maxpos) newleft = maxpos;
		else if(newleft < minpos) newleft = minpos;
		$box.css("left", newleft);
		cr.moveStop(i, s*newleft);
		clearTimeout(interval);
		processGradient.call(t);
		});

	$(document).on("mouseup.dragging", function() 
		{ 
		$("body").css("cursor", "default");
		interval = setTimeout(function()
			{		
			if(typeof data.change == "function") data.change();
			},100);
		$(document).off(".dragging"); 
		});
	}

function addStop(e, t) //t = object this, this = canvasbar
	{
	var data = $(t).data("gradientbar");
	if(data.cr instanceof ColourRange)
		{
		$canvas = $(this); //gradientbar-canvas.
		var o = $canvas.offset();
		var x = e.pageX - o.left;
		var level = (x/this.width);
		data.cr.addStop([255,255,255],level);
		processGradient.call(t);
		createColourBoxes.call(t);
		if(typeof data.change == "function") data.change();
		}
	}

//create draggable boxes above gradient with colours in:
function createColourBoxes()
	{
	var $this = $(this);
	var t = this;
	var data = $this.data("gradientbar");
	if(data.cr instanceof ColourRange)
		{
		$above = $this.find("#gradientbar-above");
		$above.empty();
		var c = $this.find("#gradientbar-canvas").get(0);
		var w = c.width;
		for(var i = 0; i < data.cr.length(); i++)
			{
			var p = data.cr.getPosition(i)*w;
			var c = data.cr.getCol(i);
			$above.append("\
				<div class='gradientbar-colourbox' style='position:absolute;top:0px;left:"+p+"px;height:0px;'>\
					<div class='gradientbar-innerbox' style='position:relative;top:0px;left:0px;margin-left:-50%;'>\
						<div title='Click here to drag the colour to a different position' class='gradientbar-boxhandle handle'></div><div title='Click here to remove this colour' class='gradientbar-boxkill kill'></div>\
						<div title='Click here to change the colour' class='gradientbar-colour' style='background-color:rgb("+parseInt(c[0])+","+parseInt(c[1])+","+parseInt(c[2])+")"+";'></div>\
					</div>\
				</div>\
				");
			//$above.find("#gradientbar-innerbox").data("stop", i);
			var $box = $above.find(".gradientbar-colourbox").last();
			(function($box, i)
				{ 
				$box.find(".gradientbar-boxhandle").on("mousedown.gradientbar", function(e){if(e.which == 1) dragBox.call(this, $box, e, t, i);});
				$box.find(".gradientbar-boxkill").on("mousedown.gradientbar", function(e){if(e.which == 1) removeBox.call(this, $box, e, t, i);});
				$box.find(".gradientbar-colour").on("mousedown.gradientbar", function(e){if(e.which == 1) changeColour.call(this, $box, e, t, i);});
				})($box, i);
			}
		return true;
		}
	else return false;
	}

//alters gradient diplayed on canvas based on cr object:
function processGradient()
	{
	var $this = $(this);
	var data = $this.data("gradientbar");
	if(data.cr instanceof ColourRange)
		{
		var c = $this.find("#gradientbar-canvas").get(0);
		var w = c.width, h = c.height, cr = data.cr, colour;
		var inc_amount = cr.getLevel()/w;
		var inc = inc_amount/2;
		var ctx = c.getContext("2d");
		for(var i = 0; i < w; i++)
			{
			col = cr.getColour(inc);
			ctx.fillStyle = "rgb("+parseInt(col[0])+","+parseInt(col[1])+","+parseInt(col[2])+")";
			ctx.fillRect(i,0,i+1,h);
			inc += inc_amount;
			}

		return true;
		}
	else return false;
	}

var default_settings =
	{
	canvasheight: 40,
	//_currentstop = current stop.
	//_canvaswidth = width of canvas as set automatically.
	//"change" = function to call if change to gradient occurs.
	//"cr" = colourRange object to colour gradient with/update.
	};

var methods =
	{
	init: function(settings)
		{
		//remove any existing events:
		$("*").off(".gradientbarinit");

		var $this = $(this), t = this;

		var final_settings = $.extend(default_settings, settings);
		$this.data("gradientbar", final_settings);

		//insert relevant html into element:
		$this.empty();
		var w = $this.width(), h = $this.height();
		final_settings._canvaswidth = w;
		$this.append('\
			<div id="gradientbar-container">\
				<div id="gradientbar-above" style="position:relative;"></div>\
				<canvas id="gradientbar-canvas" width="'+w+'" height="'+final_settings.canvasheight+'" title="Click to add a new colour"></canvas>\
			</div>');
		$("#gradientbar-colourpicker").remove();
		$("body").append('\
			<div id="gradientbar-colourpicker">\
				<div id="picker-handle" class="handle"></div><div id="picker-kill" class="kill"></div>\
				<div id="colourpicker-main"><div id="picker-wrapper">\
					<div id="picker"></div><div id="picker-indicator"></div>\
				</div>\
				<div id="slide-wrapper">\
					<div id="slide"></div><div id="slide-indicator"></div>\
				</div></div>\
			</div>');

		//create colour picker and set up events to drag/close it:
		$gradientbarcp = $("#gradientbar-colourpicker");
		final_settings._cp = ColorPicker($gradientbarcp.find("#slide").get(0), $gradientbarcp.find("#picker").get(0), function(hex,hsv,rgb, mousePicker, mouseSlide)
			{
			ColorPicker.positionIndicators($("#slide-indicator").get(0), $("#picker-indicator").get(0), mouseSlide, mousePicker);
			changeColourCallback.call(t,hex,hsv,rgb, final_settings);
			});
		$gradientbarcp.children("#picker-handle").on("mousedown.gradientbarinit", function(e) {dragPicker.call(this,e, $gradientbarcp);});
		$gradientbarcp.find("#picker-kill").on("mousedown.gradientbarinit", function() {killPicker.call(this, $gradientbarcp);});
		//final_settings._cp.setHex("#123456");

		//process canvas gradient based on colour range object from settings.cr:
		createColourBoxes.call(this);
		processGradient.call(this);

		//set up event handler(s) to run when mousedown on colour boxes:
		$this.find("#gradientbar-canvas").on("mousedown.gradientbarinit", function(e) {addStop.call(this, e, t);});
		},

	set: function()
		{
		var $this = $(this);
		var data = $this.data("gradientbar");		

		//set cr object:
		if(arguments[0] === "cr" && arguments[1] instanceof ColourRange)
			{
			data.cr = arguments[1];
			createColourBoxes.call(this);
			processGradient.call(this);
			}
		},

	refresh: function()
		{
		processGradient.call(this);
		createColourBoxes.call(this);
		}

	};

//direct calls to plugin:
$.fn.gradientBar = function(something)
	{
	var args = arguments;
	if(methods[something]) 
		return this.each(function(){ methods[something].apply(this, Array.prototype.slice.call(args, 1)); });
	else if(typeof something == "object" || typeof something == "undefined") 
		return this.each(function(){ methods.init.apply(this, args); });
	else $.error("Method " + something + " does not exist for this plugin.");
	}

})(jQuery);





