try { importScripts("jw.fractalshared.js"); } catch(e) { log("Worker Error: importing script") }

var algorithm = new FractalAlgorithm();
var colourrange = new ColourRange();
var current_data1 = [], current_data2 = [], width = 0, row = 0;

function log(){
	postMessage({cmd:"log", value: [].slice.call(arguments,0) });
}

function refreshFractal(parameters)
	{
	if(typeof parameters.colours == "string") commands.set({option: "colours", value: parameters.colours});

	if(current_data1.length != 0 && current_data2.length != 0)
		{
		var getcol = colourrange.getColour, temp = [];

		function pushColours(input, start, end, out)
			{
			if(end > input.length) return false;
			for(var i = start; i < end; i++)
				{
				temp = getcol(input[i]);
				out.push(temp[0]);
				out.push(temp[1]);
				out.push(temp[2]);
				}
			return true;
			}

		var rowstart = 0, rowend = width, output = [];

		while(pushColours(current_data1, rowstart, rowend, output) && pushColours(current_data2, rowstart, rowend, output))
			{
			rowstart += width;
			rowend += width;
			}

		postMessage({cmd: "process", row: row, width: width, lines: Math.round((output.length/3)/width), data: output});
		}
	}

function renderFractal(parameters)
	{
	postMessage({cmd:"drawing", value: 1});
	if(typeof parameters.colours == "string") commands.set({option: "colours", value: parameters.colours});
	current_data1 = [];
	current_data2 = [];

	//put params into variables:
	var quality = parameters.quality;
	var scalex = parameters.scalex;
	var scaley = parameters.scaley;
	var centrex = parameters.centrex;
	var centrey = parameters.centrey;
	row = parameters.row;
	var lines = parameters.lines;
	var height = parameters.height;
	width = parameters.width;
	var speed = parameters.speed;

	//find top left corner and set up starting variables:
	var start_scaled_x = centrex - (scalex * width/2);
	var start_scaled_y = centrey - (scaley * height/2) + (row * scaley);
	var subpixel_x = scalex/(quality+1);
	var subpixel_y = scaley/(quality+1);

	//loop over pixels, obtaining values and pushing them to an array:
	function drawLines(val, a)
		{
		var keepdata = (typeof a == "object")? true : false;
		var actual_scaled_x = start_scaled_x;
		var actual_scaled_y = start_scaled_y + scaley*val;
		var actual_x = 0;
		var actual_y = row+val;
		var getcol = colourrange.getColour;

		var output = [], temp = [];
		for(var i = val; i < lines; i+=2)
			{
			for(var j = 0; j < width; j++)
				{
				val = getPixelData(actual_scaled_x, actual_scaled_y);
				if(keepdata) a.push(val);
				temp = getcol(val);	
				output.push(temp[0]);
				output.push(temp[1]);
				output.push(temp[2]);
				actual_scaled_x += scalex;
				}

			//after doing each row, post it back to fractalmachine:
			postMessage({cmd: "process", row: actual_y, width: width, lines: 1, data: output});
			output = [];

			actual_scaled_x = start_scaled_x;
			actual_scaled_y += scaley*2;
			actual_y += 2;
			}
		}
	drawLines(0, current_data1);
	drawLines(1, current_data2);
	postMessage({cmd:"drawing", value: 0});

	function getPixelData(x, y)
		{		
		var k, l, spx = subpixel_x, spy = subpixel_y, subdata=[];
	
		for(k = 0; k < quality; k++)
			{
			for(l = 0; l < quality; l++)
				{
				subdata.push(algorithm.run(x+spx,y+spy));
				spx += subpixel_x;
				}
			spy += subpixel_y;
			spx = subpixel_x;
			}

		var av = 0, datalength = subdata.length;
		for(k = 0; k < datalength; k++) av += subdata[k];
		return av/datalength;
		}
	}


var commands = {
	set: function(data)
		{
		var option = data.option, value = data.value;
		if(typeof value == "object" && typeof option == "undefined") 
			{
			for(var i in value) commands.set({"option": i, "value": value[i]});
			}
		else if(typeof option != "undefined")
			{
			if(option == "mi") 
				{
				colourrange.setLevel(value);
				algorithm.set(option, value);
				}
			else if(option == "colours")
				{
				colourrange.load(value);
				}
			else algorithm.set(option, value);
			}
		else postMessage("WorkerError: set: need to specify option to set");
		},

	get: function(data)
		{
		var option = data.option, reply = {};
		if(typeof option == "undefined") 
			{
			reply = algorithm.set();
			reply.colours = colourrange.save();
			}
		else if(option == "colours") reply = colourrange.save();
		else reply = algorithm.set(option);

		postMessage(reply);
		},

	process: function(data)
		{
		var parameters = data.parameters;
		if(typeof parameters == "undefined")
			{
			postMessage("WorkerError: process: parameters not defined");
			}
		else renderFractal(parameters);
		},

	refresh: function(data)
		{
		var parameters = data.parameters;
		refreshFractal(parameters);
		},

	close: function(data)
		{
		close();
		}
	}

onmessage = function(e)
	{
	var incoming = e.data;

	if(e.data.cmd in commands) commands[e.data.cmd](e.data);
	else postMessage("WorkerError: onmessage: Command not recognised");
	}

onerror = function(e) {};







