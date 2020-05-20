
//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//Load data and config file
	d3.queue()
		.defer(d3.json, "data/config.json")
		.await(ready);

	function ready (error, config){

	// function ready (error, data, config, geog){

		//Set up global variables
		dvc = config.ons;
		oldlsoa11cd = "";
		firsthover = true;


		layernames = ["seventyper","eighty5per"];
		layername = "seventyper";

		hoverlayernames = ["seventyper","eighty5per"];
		hoverlayername = "seventyper";

		secondvars = ["seventy","eighty5"];
		secondvar = "seventy";

		// windowheight = window.innerHeight;
		// d3.select("#map").style("height",windowheight + "px")

		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;


		//Set up number formats
		// displayformat = GB.format("$,." + dvc.displaydecimals + "%");
		displayformat = d3.format(",." + dvc.displaydecimals + "f");
		legendformat = d3.format(",.0f");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'data/style.json', //stylesheet location
			//style: 'https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-night/style.json',
		  center: [-1.89, 52.4106], // starting position51.5074° N, 0.127850.910637,-1.27441
		  zoom:5.7, // starting zoom
		  minZoom:4,
			maxZoom: 17, //
		  attributionControl: false
		});
		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl());

		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());

		// Disable map rotation using right click + drag
		map.dragRotate.disable();

		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();


		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}));

		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}));

		addFullscreen();

		if(config.ons.breaks =="jenks") {
			breaks = [];

			ss.ckmeans(values, (dvc.numberBreaks)).map(function(cluster,i) {
				if(i<dvc.numberBreaks-1) {
					breaks.push(cluster[0]);
				} else {
					breaks.push(cluster[0])
					//if the last cluster take the last max value
					breaks.push(cluster[cluster.length-1]);
				}
			});
		}
		else if (config.ons.breaks == "equal") {
			breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks);
		}
		else {breaks = config.ons.breaks[0];};


		//round breaks to specified decimal places
		breaks = breaks.map(function(each_element){
			return Number(each_element.toFixed(dvc.legenddecimals));
		});

		//work out halfway point (for no data position)
		midpoint = breaks[0] + ((breaks[dvc.numberBreaks] - breaks[0])/2)

		//Load colours
		if(typeof dvc.varcolour === 'string') {
			colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
		} else {
			colour = dvc.varcolour;
		}

		//set up d3 color scales
		color = d3.scaleThreshold()
				.domain(breaks.slice(1))
				.range(colour);

		//now ranges are set we can call draw the key
		createKey(config);
		createLegend(config)


		map.on('load', function() {

			map.addLayer({
				"id": "lsoa-outlines",
				"type": "fill",
				"source": {
					"type": "vector",
					//"tiles": ["http://localhost:8000/boundaries/{z}/{x}/{y}.pbf"],
					"tiles": ["https://cdn.ons.gov.uk/maptiles/t26/boundaries/{z}/{x}/{y}.pbf"],
				},
				"minzoom": 4,
				"maxzoom": 20,
				"source-layer": "boundaries",
				"layout": {},
				'paint': {
						'fill-opacity': [
							'interpolate',
							  ['linear'],
							  // ['zoom'] indicates zoom, default at lowest number, threshold, value above threshold
							  ['zoom'],
							  8, 0.6,
							  9, 0.2
						],
						'fill-outline-color':'rgba(0,0,0,0)',
						'fill-color': {
								// Refers to the data of that specific property of the polygon
							'property': layername,
							'default': '#666666',
							// Prevents interpolation of colors between stops
							'base': 0,
						'stops': [
							[dvc.breaks[0][0], dvc.varcolour[0]],
							[dvc.breaks[0][1], dvc.varcolour[0]],
							[dvc.breaks[0][2], dvc.varcolour[1]],
							[dvc.breaks[0][3], dvc.varcolour[2]],
							[dvc.breaks[0][4], dvc.varcolour[3]],
							[dvc.breaks[0][5], dvc.varcolour[4]]
						]
						}

					}
			}, 'highway_name_other');

				map.addLayer({
					"id": "imdlayer",
					'type': 'fill',
					"source": {
						"type": "vector",
						//"tiles": ["http://localhost:8000/tiles/{z}/{x}/{y}.pbf"],
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t26/tiles/{z}/{x}/{y}.pbf"],
					},
					"source-layer": "seventyplus",
					"background-color": "#ccc",
					'paint': {
							'fill-opacity':1,
							'fill-outline-color':'rgba(0,0,0,0)',
							'fill-color': {
									// Refers to the data of that specific property of the polygon
								'property': layername,
								'default': '#666666',
								// Prevents interpolation of colors between stops
								'base': 0,
								'stops': [
									[dvc.breaks[0][0], '#7fcdbb'],
									[dvc.breaks[0][1], '#7fcdbb'],
									[dvc.breaks[0][2], '#41b6c4'],
									[dvc.breaks[0][3], '#1d91c0'],
									[dvc.breaks[0][4], '#225ea8'],
									[dvc.breaks[0][5], '#0c2c84']
								]
							}

						}
				}, 'highway_name_other');



				map.addLayer({
					"id": "lsoa-outlines-hover",
					"type": "line",
					"source": {
						"type": "vector",
						//"tiles": ["http://localhost:8000/boundaries/{z}/{x}/{y}.pbf"],
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t26/boundaries/{z}/{x}/{y}.pbf"],
					},
					"minzoom": 4,
					"maxzoom": 20,
					"source-layer": "boundaries",
					"layout": {},
					"paint": {
						"line-color": "orange",
						"line-width": 3
					},
					"filter": ["==", "lsoa11cd", ""]
				}, 'place_suburb');

			//test whether ie or not
			function detectIE() {
			  var ua = window.navigator.userAgent;


			  var msie = ua.indexOf('MSIE ');
			  if (msie > 0) {
				// IE 10 or older => return version number
				return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
			  }

			  var trident = ua.indexOf('Trident/');
			  if (trident > 0) {
				// IE 11 => return version number
				var rv = ua.indexOf('rv:');
				return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
			  }

			  var edge = ua.indexOf('Edge/');
			  if (edge > 0) {
				// Edge (IE 12+) => return version number
				return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
			  }

			  // other browser
			  return false;
			}


			// if(detectIE()){
				//onMove = onMove.debounce(100);
				//onLeave = onLeave.debounce(100);
			// };

			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "lsoa-outlines", onMove);

			// Reset the lsoa-fills-hover layer's filter when the mouse leaves the layer.
			map.on("mouseleave", "lsoa-outlines", onLeave);

			map.getCanvasContainer().style.cursor = 'pointer';

			//Add click event
			map.on('click', 'lsoa-outlines', onClick);

			//get location on click
			d3.select(".mapboxgl-ctrl-geolocate").on("click", geolocate);



})

		$(".search-control").click(function() {
			d3.select(".search-control").style("text-transform","uppercase");
			$(".search-control").val('');
		})

		d3.select(".search-control").on("keydown", function() {
    if(d3.event.keyCode === 13){
			event.preventDefault();
			event.stopPropagation();

			myValue=$(".search-control").val();


			getCodes(myValue);
			pymChild.sendHeight();

    }
  })

		$("#submitPost").click(function( event ) {

						event.preventDefault();
						event.stopPropagation();

						myValue=$(".search-control").val();


						getCodes(myValue);
						pymChild.sendHeight();
		});

		function onMove(e) {

				newlsoa11cd = e.features[0].properties.lsoa11cd;
				if(firsthover) {
          // dataLayer.push({
          //     'event': 'mapHoverSelect',
          //     'selected': newlsoa11cd
          // })

            firsthover = false;
        }

				if(newlsoa11cd != oldlsoa11cd) {
					oldlsoa11cd = e.features[0].properties.lsoa11cd;

					map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", e.features[0].properties.lsoa11cd]);
					var features = map.queryRenderedFeatures(e.point,{layers: ['lsoa-outlines']});

				 	if(features.length != 0){

						setAxisVal(features[0].properties.lsoa11nm, features[0].properties.lsoa11cd,features[0].properties[hoverlayername],features[0].properties[secondvar]);
						//updatePercent(e.features[0]);
					}
					//setAxisVal(e.features[0].properties.lsoa11nm, e.features[0].properties["houseprice"]);
				}
		};



		function tog(v){return v?'addClass':'removeClass';}
		$(document).on('input', '.clearable', function(){
				$(this)[tog(this.value)]('x');
		}).on('mousemove', '.x', function( e ){
				$(this)[tog(this.offsetWidth-28 < e.clientX-this.getBoundingClientRect().left)]('onX');
		}).on('touchstart click', '.onX', function( ev ){
				ev.preventDefault();
				$(this).removeClass('x onX').val('').change();
				enableMouseEvents();
				onLeave();
				hideaxisVal();
		});



		function onLeave() {
				map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", ""]);
				oldlsoa11cd = "";
				// $("#areaselect").val("").trigger("chosen:updated");
				hideaxisVal();
		};



		 function onClick(e) {
		 		disableMouseEvents();
				features =[];
				features[0] = e.features[0]
		 		newlsoa11cd = features[0].properties.lsoa11cd;

				if(newlsoa11cd != oldlsoa11cd) {
					map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", e.features[0].properties.lsoa11cd]);
					//var features = map.queryRenderedFeatures(e.point,{layers: ['lsoa-outlines']});
					setAxisVal(features[0].properties.lsoa11nm, features[0].properties.lsoa11cd,features[0].properties[hoverlayername],features[0].properties[secondvar]);
				}

		 		// if(newlsoa11cd != oldlsoa11cd) {
		 		// 	oldlsoa11cd = features[0].properties.lsoa11cd;
		 		// 	map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", features[0].properties.lsoa11cd]);
				//
		 		// 	 //selectArea(e.features[0].properties.lsoa11cd);
				// 	//updatePercent(features[0]);
				// 	setAxisVal(features[0].properties.lsoa11nm, features[0].properties.lsoa11cd,features[0].properties[hoverlayername],features[0].properties[secondvar]);
		 		// }

		 		// dataLayer.push({
        //      'event':'mapClickSelect',
        //      'selected': newlsoa11cd
        //  })
		 };

		function disableMouseEvents() {
				map.off("mousemove", "lsoa-outlines", onMove);
				map.off("mouseleave", "lsoa-outlines", onLeave);
		}

		function enableMouseEvents() {
				map.on("mousemove", "lsoa-outlines", onMove);
				map.on("click", "lsoa-outlines", onClick);
				map.on("mouseleave", "lsoa-outlines", onLeave);
		}


		function setAxisVal(areanm, areacd, areaval, areanum) {

			d3.select("#keyvalue").style("font-weight","bold").html(function(){
				if(!isNaN(areaval)) {
					return areanm + "<br>" + displayformat(areaval) + "% (" + areanum +" people)";
				} else {
					return areanm + "<br>" + displayformat(areaval) + "% (" + areanum +" people)";
				}
			});

			d3.selectAll(".blocks").attr("stroke","black").attr("stroke-width","0px").lower();

			function blockLookup(areaval) {
				for (i = 0; i <= dvc.numberBreaks; i++) {
					if (areaval <= breaks[i]) {
						return i
					}
				}
				return dvc.numberBreaks // if areaval is larger than top value, assign to top value block
			}
			d3.select("#block" + (blockLookup(areaval))).attr("stroke","orange").attr("stroke-width","3px").raise()


			// d3.select("#keyunits2").style("font-weight","bold").text(function(){
			// 	if(!isNaN(areaval)) {
			// 		return areaval;
			// 	} else {
			// 		return areaval;
			// 	}
			// });

			// vad3.selectAll(".blocks").attr("stroke","black").attr("stroke-width","1px");

			// d3.select("#block" + (11 - areaval)).attr("stroke","orange").attr("stroke-width","1px").raise()


		}

		function hideaxisVal() {
			d3.select("#keyvalue").style("font-weight","bold").text("");

			d3.selectAll(".blocks").attr("stroke","black").attr("stroke-width","0px").lower();
			d3.selectAll(".legendRect").style("width","0px");


		}

		function createKey(config){

					d3.select("#key").selectAll("*").remove();

					keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

					var svgkey = d3.select("#key")
						.attr("width", keywidth)
						.attr("height",70);

					var color = d3.scaleThreshold()
					   .domain(breaks)
					   .range(colour);

					// Set up scales for legend
					x = d3.scaleLinear()
						.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
						.range([0,keywidth-30]); /*range for pixels*/


					var xAxis = d3.axisBottom(x)
						.tickSize(15)
						.tickValues(color.domain())
						.tickFormat(function(d) { return legendformat(d) + "%"; });

					var g2 = svgkey.append("g").attr("id","horiz")
						.attr("transform", "translate(15,5)");


					keyhor = d3.select("#horiz");

					g2.selectAll("rect")
						.data(color.range().map(function(d,i) {

						  return {
							x0: i ? x(color.domain()[i+1]) : x.range()[0],
							x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
							z: d
						  };
						}))
					  .enter().append("rect")
						.attr("id",function(d,i){return "block" + (i+1)})
						.attr("class", "blocks")
						.attr("height", 10)
						.attr("x", function(d) {
							 return d.x0; })
						.attr("width", function(d) {return d.x1 - d.x0; })
						.style("opacity",1)
						.attr("stroke","black")
						.attr("stroke-width","0px")
						.style("fill", function(d) { return d.z; });


					g2.append("line")
						.attr("id", "currLine")
						.attr("x1", x(10))
						.attr("x2", x(10))
						.attr("y1", -10)
						.attr("y2", 8)
						.attr("stroke-width","2px")
						.attr("stroke","#000")
						.attr("opacity",0);

					g2.append("text")
						.attr("id", "currVal")
						.attr("x", x(10))
						.attr("y", -15)
						.attr("fill","#000")
						.text("");



					keyhor.selectAll("rect")
						.data(color.range().map(function(d, i) {
						  return {
							x0: i ? x(color.domain()[i]) : x.range()[0],
							x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
							z: d
						  };
						}))
						.attr("x", function(d) { return d.x0; })
						.attr("width", function(d) { return d.x1 - d.x0; })
						.style("fill", function(d) { return d.z; });

					keyhor.call(xAxis).append("text")
						.attr("id", "caption")
						.attr("x", 50)
						.attr("y", 50)
						.attr("fill","#323132")
						.style("text-anchor","left")
						.attr("font-size","14px")
						.text("% of population");

					keyhor.append("rect")
						.attr("id","keybar")
						.attr("width",8)
						.attr("height",0)
						.attr("transform","translate(15,0)")
						.style("fill", "#ccc")
						.attr("x",x(0));


					if(dvc.dropticks) {
						d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
												// if there are more that 4 breaks, so > 5 ticks, then drop every other.
												if(i % 2){return "translate(0,10)"} }
										);
						//d3.select("#horiz").selectAll("text").attr("opacity",0);
					}


					//d3.selectAll(".tick text").attr("transform","translate(-" + (x.range()[1]/10)/2 + ",0)")
					//Temporary	hardcode unit text
					dvc.unittext = "change in life expectancy";

					// d3.select("#keyunits").append("p").style("float","left").attr("id","keyunit").style("margin-top","-10px").style("margin-left","18px").html(dvc.varunit);
					//d3.select("#keyunits").append("p").style("float","right").attr("id","keyunitR").style("margin-top","-10px").style("margin-right","18px").html(dvc.varunit2);
					//d3.select("#keyunits2").append("p").attr("width","100%").style("text-align","center").style("margin-top","-10px").style("margin-right","18px").html(dvc.varunit3);

			} // Ends create key

			function createLegend(keydata) {

				//draw radio buttons

				d3.select("#radioselect")
							.append("p")
							.style("padding-left","10px")
							.style("font-size","16px")
							.style("margin-bottom","3px")
							//.text("Income before/after housing costs")


				radio = d3.select("#radioselect")
									.selectAll('rad')
									.data(keydata.ons.legendvars)
									.enter()
									.append('div')
									.style("float","left")
									.style("padding-left","10px")


					radio.append("input")
							.attr("id",function(d,i){return "radio"+i})
							.attr("class","input input--radio js-focusable")
							.attr("type","radio")
							.attr("name","layerchoice")
							.attr("value", function(d,i){return layernames[i]})
							.property("checked", function(d,i){if(i==0){return true}})
							.on("click",repaintLayer)

					radio.append('label')
					.attr('class','legendlabel').text(function(d,i) {
						var value = parseFloat(d).toFixed(1);
						return d;
					})
					.attr("value", function(d,i){return layernames[i]})
					.on("click",repaintLayer);




					} //end createLegend


			function repaintLayer(){

				layername = d3.select(this).attr("value");

				getindexoflayer = layernames.indexOf(layername)
				hoverlayername = hoverlayernames[getindexoflayer];
				secondvar = secondvars[getindexoflayer];

				//redraw key
				breaks = config.ons.breaks[getindexoflayer];

				createKey(config);

				//

				d3.selectAll(".input--radio").property("checked",false);
				d3.selectAll("#radio" +getindexoflayer).property("checked",true);

				styleObject = {
					'property': layername,
					'default': '#666666',
					// Prevents interpolation of colors between stops
					'base': 0,
					'stops': [
						[dvc.breaks[getindexoflayer][0], '#7fcdbb'],
						[dvc.breaks[getindexoflayer][1], '#7fcdbb'],
						[dvc.breaks[getindexoflayer][2], '#41b6c4'],
						[dvc.breaks[getindexoflayer][3], '#1d91c0'],
						[dvc.breaks[getindexoflayer][4], '#225ea8'],
						[dvc.breaks[getindexoflayer][5], '#0c2c84']

					]
						}

				//repaint area layer map usign the styles above
				map.setPaintProperty("imdlayer", 'fill-color', styleObject);

				map.setPaintProperty("lsoa-outlines", 'fill-color', styleObject);

				console.log(features)
				if(typeof features !== 'undefined' ) {
					setAxisVal(features[0].properties.lsoa11nm, features[0].properties.lsoa11cd,features[0].properties[hoverlayername],features[0].properties[secondvar]);

 			 }

			}

			function addLayer(layername){



				map.addLayer({
					"id": layername,
					'type': 'fill',
					"source": {
						"id":'vectorsource',
						"type": "vector",
						//"tiles": ["http://localhost:8000/tiles/{z}/{x}/{y}.pbf"],
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t18/tiles/{z}/{x}/{y}.pbf"],
						"minzoom": 4,
						"maxzoom": 13
					},
					"source-layer": "imddata2",
					"background-color": "#ccc",
					'paint': {
							'fill-opacity':1,
							'fill-outline-color':'rgba(0,0,0,0)',
							'fill-color': {
									// Refers to the data of that specific property of the polygon
								'property': layername,
								'default': '#666666',
								// Prevents interpolation of colors between stops
								'base': 0,
								'stops': [
									[0, '#d0587e'],
									[1, '#d0587e'],
									[2, '#da7b91'],
									[3, '#e39ca5'],
									[4, '#eabcb9'],
									[5, '#f0dccd'],
									[6, '#e6f5d0'],
									[7, '#bfe4ab'],
									[8, '#97d287'],
									[9, '#6cc064'],
									[10, '#37ae3f']

								]
							}

						}
				}, 'lsoa-outlines');
			}



	function addFullscreen() {

		currentBody = d3.select("#map").style("height");
		d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)

	}

	function setbodyheight() {
		d3.select("#map").style("height","100%");

		document.addEventListener('webkitfullscreenchange', exitHandler, false);
		document.addEventListener('mozfullscreenchange', exitHandler, false);
		document.addEventListener('fullscreenchange', exitHandler, false);
		document.addEventListener('MSFullscreenChange', exitHandler, false);

	}


	function exitHandler() {
			if (document.webkitIsFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.mozFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.msFullscreenElement === false)
			{
				shrinkbody();
			}
		}

	function shrinkbody() {
		d3.select("#map").style("height",currentBody);
		pymChild.sendHeight();
	}

	function geolocate() {
		// dataLayer.push({
		// 						'event': 'geoLocate',
		// 						'selected': 'geolocate'
		// })

		var options = {
		  enableHighAccuracy: true,
		  timeout: 5000,
		  maximumAge: 0
		};

		navigator.geolocation.getCurrentPosition(success, error, options);
	}

	function getCodes(myPC)	{

		//first show the remove cross
		d3.select(".search-control").append("abbr").attr("class","postcode");

			// dataLayer.push({
			// 					 'event': 'geoLocate',
			// 					 'selected': 'postcode'
			// 				 })

			var myURIstring=encodeURI("https://api.postcodes.io/postcodes/"+myPC);
			$.support.cors = true;
			$.ajax({
				type: "GET",
				crossDomain: true,
				dataType: "jsonp",
				url: myURIstring,
				error: function (xhr, ajaxOptions, thrownError) {
					},
				success: function(data1){
					if(data1.status == 200 ){
						//$("#pcError").hide();
						lat =data1.result.latitude;
						lng = data1.result.longitude;
						successpc(lat,lng)
					} else {
						$(".search-control").val("Sorry, invalid postcode.");
					}
				}

			});

		}


	function successpc(lat,lng) {

		map.jumpTo({center:[lng,lat], zoom:12})
		point = map.project([lng,lat]);


		setTimeout(function(){

		var tilechecker = setInterval(function(){
			 features=null
		 	features = map.queryRenderedFeatures(point,{layers: ['lsoa-outlines']});
		 	if(features.length != 0){
		 		 //onrender(),
		 		map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", features[0].properties.lsoa11cd]);
				//var features = map.queryRenderedFeatures(point);
				disableMouseEvents();
				setAxisVal(features[0].properties.lsoa11nm, features[0].properties.lsoa11cd,features[0].properties[hoverlayername],features[0].properties[secondvar]);
				//updatePercent(features[0]);
		 		clearInterval(tilechecker);
		 	}
		 },500)
		},500);




	};

		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.lsoa11cd; });
			var areanames =  datacsv.map(function(d) { return d.lsoa11nm; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

					if(typeof params != 'undefined') {

							disableMouseEvents();

							map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", params.selected]);

							selectArea(params.selected);
							setAxisVal(params.selected);

							zoomToArea(params.selected);

							// dataLayer.push({
							// 		'event': 'mapDropSelect',
							// 		'selected': params.selected
							// })
					}
					else {
							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};

	}

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
