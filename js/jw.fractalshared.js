//add remove class to array (nabbed from a blog comment by Jeff Walden):
Array.prototype.remove = function(from, to){
	this.splice(from,
		!to ||
		1 + to - from + (!(to < 0 ^ from >= 0) && (to < 0 || -1) * this.length));
	return this.length;
};

//### colourRange class ###
function ColourRange(levels) // object.
	{
	if(typeof levels == "undefined") levels = 255;
	var stops = [];
	
	function sortStops(a,b)
		{
		return a.position - b.position;
		}

	function getStops(val)
		{
		//deal with undesirable cases:
		if(stops.length == 0) return [];
		if(stops.length == 1) return [stops[0]];
		if(stops[0].position >= val) return [stops[0]];
		//normal case; find stop past val and return that and previous one:
		for(var i = 1; i < stops.length; i++)
			{
			if(stops[i].position > val) return [stops[i-1], stops[i]];
			}
		//if havnt found a stop past val, return end stop:
		return [stops[stops.length-1]];
		}

	this.getCol = function(val) { return stops[val].colour; }
	this.setCol = function(val, col) { stops[val].colour = col; return this; }
	this.getPosition = function(val) { return stops[val].position; }
	this.remove = function(val) { stops.remove(val); }
	this.addStop = function(colour, position) //colour is array of 3 values (RGB), position is value from 0 to 1.
		{
		stops.push({colour:colour, position:position});
		stops.sort(sortStops);
		return this;
		}
	this.length = function() { return stops.length; }
	this.moveStop = function(s, pos)
		{
		var slength = stops.length;
		if(s >= slength) return false;
		stops[s].position = pos;
		//if((s > 0 && stops[s-1].position > pos)||(s<slength-1 && stops[s+1].position < pos)) stops.sort(sortStops);
		return true;
		}

	this.setLevel = function(l) {levels = l; return this;}
	this.getLevel = function(l) {return levels;}

	this.getColour = function(val, l)
		{
		if(typeof l == "undefined") l = levels;		

		var pos = val/l;
		if(val > l) val = l % val;
		var s = getStops(pos);
		if(s.length == 1) return s[0].colour;
		var minp = s[0].position, maxp = s[1].position;
		var prange = maxp - minp;
		var pnorm = (pos-minp)/prange;
		var newcol = [];
		var cmin, cmax;
		for(var i = 0; i < 3; i++)
			{
			cmin = s[0].colour[i];
			cmax = s[1].colour[i];
			newcol.push(cmin + (cmax - cmin)*pnorm);
			}
		return newcol;
		}

	this.save = function()
		{
		var i = 0, s = "";
		for(; i < stops.length; i++)
			{
			s += "r" + parseInt(stops[i].colour[0]) + "g" + parseInt(stops[i].colour[1]) + "b" + parseInt(stops[i].colour[2]) + "p" + stops[i].position.toFixed(3);
			}
		return s;
		}

	this.load = function(string)
		{
		stops = [];
		var s = string.split("r");
		var i = 1, tempstr, r,g,b,p;
		for(; i < s.length; i++)
			{
			r = parseInt(s[i].substring(0, s[i].indexOf("g")));
			g = parseInt(s[i].substring(s[i].indexOf("g")+1, s[i].indexOf("b")));
			b = parseInt(s[i].substring(s[i].indexOf("b")+1, s[i].indexOf("p")));
			p = parseFloat(s[i].substring(s[i].indexOf("p")+1));
			stops.push({colour: [r,g,b], position: p});
			}
		stops.sort(sortStops);
		}
		
	}

//###FractalAlgorithm class; kept separate so can be loaded into workers without extra overhead. ##
function FractalAlgorithm(s)
	{
	if(typeof s != "object") s = {};

	var options = { mi: 100, er2: 100, c1: 0, c2: 0, smoothing:true, algorithm:"mandelbrot" };
	(function(){ for(var i in s) { options[i] = s[i]; } })();

	//to do log with base n
	function mathLog(val, base)
		{
		if(typeof base == "undefined") return Math.log(val); 
		else return Math.log(val)/Math.log(base);
		}

	//sets algorithm:
	function setAlgorithm(a)
		{
		try
			{
			var algorithm = eval(a);
			if(typeof algorithm == "function") alg = algorithm;
			}
		catch(e) {}
		};

	//Z = Z^2 + C
	function mandelbrot_general(zr, zi, cr, ci)
		{
		var zr2 = zr * zr, zi2 = zi * zi, mi = options.mi;
		var i = 0;

		//escape radius is 10:
		while(i++ != mi && zr2+zi2 < 10)
			{
			zi = 2 * zr * zi + ci;
			zr = zr2 - zi2 + cr;
			zi2 = zi * zi;
			zr2 = zr * zr;
			}

		if(options.smoothing == false) return i;
		else 
			{
			//log2 of escape radius is 3.321928095 (Math.log(16)/math.log(2))
			//ln of escape radius is: 2.302585093 (Math.log(16))
			var frac = Math.log((Math.log(zr2+zi2)/2.302585093)/3.321928095);
			return isNaN(frac)? i : i - frac;
			}
		}
		
	/*
	//Z=Z^2+C:
	function mandelbrot_general(x, y, c1, c2)
		{
		var x2 = x * x, y2 = y * y;
		var i = 0;
		
		while(i < options.mi && x2+y2 < options.er2)
			{
			y = 2 * x * y + c2;
			x = x2 - y2 + c1;
			y2 = y * y;
			x2 = x * x;
			i++;
			}

		if(options.smoothing == false) return i;
		else 
			{
			var frac = mathLog(mathLog(x2+y2,2)/mathLog(options.er2,2));
			if(isNaN(frac)) return i;
			else return i - frac;
			}
		}
	*/

	function mandelbrot(args)
		{
		return mandelbrot_general(options.c1, options.c2, args[0], args[1]);
		}

	function julia(args)
		{
		return mandelbrot_general(args[0], args[1], options.c1, options.c2);
		}

	var alg = mandelbrot;
	this.run = function() { return alg(arguments); };

	this.getAlgorithm = function()
		{
		return alg.name;
		}

	//get/set options using this:
	this.set = function()
		{
		if(typeof arguments[0] == "string")
			{
			if(arguments.length == 1) return options[arguments[0]];
			else
				{
				if(arguments[0] == "algorithm")
					{
					setAlgorithm(arguments[1]);
					}
				options[arguments[0]] = arguments[1];
				}
			}
		else if(typeof arguments[0] == "object")
			{
			for(var i in arguments[0])
				{
				options[i] = arguments[0][i];
				}
			}
		else //return all settings (shallow cloned):
			{
			var o = {};
			for(var i in options) o[i] = options[i];
			return o;
			}
		}
	}
