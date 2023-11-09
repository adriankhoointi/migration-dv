//Initialise datasets
let worldjson;
let migrationDS;

//SCRIPT PROPERTIES
//Define width and height of visualisation
let w = d3.select("#data-vis").node().getBoundingClientRect().width;
let h = 800;

//Define mouse sensitivity
const sensitivity = 75;

//Get user locale
const locale = navigator.languages[0] || navigator.language || "en-GB";

//SCRIPT VARIABLES
//Get clicked source
let clickedSource = "";

let clickedDestination = "";

//Animation timer
let flightTimer;

//FUNCTION START
//Initalise visualisation
async function init() {
    //Load datasets
    await loadDatasets();
    await geoChart();
}

//Dynamic resize
async function resize() {
    //Remove SVG
    d3.select("svg").remove();

    //Reset width
    w = d3.select("#data-vis").node().getBoundingClientRect().width;

    //Redraw visualisation
    await geoChart();
}

//Load datasets
async function loadDatasets() {
    //Load world json
    worldjson = await d3.json("../assets/d3/data/world-map/countries-min.json");

    //Load migration data
    migrationDS = await d3.csv("../assets/d3/data/geo-migration/clean_ims_stock_proportion_by_origin_and_destination_v4.csv", function(d) {
        return {
            //Declare variables
            origin_code: d['Location code of origin'],
            origin_name: d['Region, subregion, country or area'], //This is origin
            origin_lat: +d['Origin Latitude'],
            origin_long: +d['Origin Longitude'],
            destination_code: d['Location code of destination'],
            destination_name: d['Destination'],
            destination_lat: +d['Destination Latitude'],
            destination_long: +d['Destination Longitude'],
            migration2000: +d['Total Migrants (2000)'],
            migration2005: +d['Total Migrants (2005)'],
            migration2010: +d['Total Migrants (2010)'],
            migration2015: +d['Total Migrants (2015)'],
            migration2020: +d['Total Migrants (2020)'],
            migrationtotal: +d['Total Migrants (2000-2020)']
        };
    });

}

function enter (svg) {
    //Set Up Globe Projection
    let projection = d3.geoOrthographic()
                    .center([0, 0]) //Sets the center of the map to South East Asia
                    .rotate([-115.6628, -2.218]) //Centers map to equator
                    .translate([w/2, h/2]) //Translates the map to the center of the SVG canvas
                    .scale(400); //Sets the scale of the map

    //Define initial scale of map
    const initialScale = projection.scale();

    //Define path generator
    let path = d3.geoPath()
                .projection(projection);

    //Define globe
    let globe = svg.append("circle")
                    .attr("cx", w/2)
                    .attr("cy", h/2)
                    .attr("r", initialScale)

                    //Set background colour of globe
                    .attr("fill", "#EEE")
                    //Set border of globe
                    .attr("stroke", "#000")
                    .attr("stroke-width", 0.2);

    //Define drag behaviour - allows user to rotate globe
    svg.call(d3.drag().on('drag', _.throttle((event) => {
        //Get current rotation
        const rotate = projection.rotate();
        //Get dynamic sensitivity
        const k = sensitivity / projection.scale();

        //Update rotation
        projection.rotate([
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k
        ]);

        //Update path
        path = d3.geoPath().projection(projection);
        svg.selectAll(".countries").selectAll("path").attr("d", path);

        //Remove hover annotations (Prevent confusion)
        svg.selectAll(".hover-annotation").remove();

        //Remove Markers
        removeMarkers();

        //Remove Connections
        svg.selectAll(".connections").remove();

        //Redraw Connections
        drawConnections();

        //Check if any country is still filtered
        if (clickedSource != "") {
            //Redraw Markers
            drawMarkers(clickedSource);

            //Hide other paths
            d3.selectAll(".connections").selectAll("path")
            .filter(function() {
                return !this.classList.contains("origin_" + clickedSource);
            })
            .remove();

            //Highlight paths
            d3.selectAll(".connections").selectAll(".origin_" + clickedSource)
                .style("stroke-opacity", 0.3);

        } else if (clickedDestination != "") {
            //Redraw Markers
            drawMarkers(clickedDestination);

            //Hide other paths
            d3.selectAll(".connections").selectAll("path")
            .filter(function() {
                return !this.classList.contains("destination_" + clickedDestination);
            })
            .remove();

            //Highlight paths
            d3.selectAll(".connections").selectAll(".destination_" + clickedDestination)
            .style("stroke-opacity", 0.3);

        };

        }, 50, {'trailing': true})
        ))

        //Define zoom behaviour
        .call(d3.zoom().on('zoom', _.debounce((event) => {
            if(event.transform.k > 0.5) {
                //Update projection
                projection.scale(initialScale * event.transform.k);

                //Update path
                path = d3.geoPath().projection(projection);
                svg.selectAll(".countries").selectAll("path").attr("d", path);

                //Update globe radius
                globe.attr("r", projection.scale());

                //Remove hover annotations (Prevent confusion)
                svg.selectAll(".hover-annotation").remove();

                //Remove Markers
                removeMarkers();

                //Remove Connections
                svg.selectAll(".connections").remove();

                //Redraw Connections
                drawConnections();

                //Check if any country is still filtered
                if (clickedSource != "") {
                    //Redraw Markers
                    drawMarkers(clickedSource);

                    //Hide other paths
                    d3.selectAll(".connections").selectAll("path")
                    .filter(function() {
                        console.log(this.classList);
                        return !this.classList.contains("origin_" + clickedSource);
                    })
                    .remove();

                    //Highlight paths
                    d3.selectAll(".connections").selectAll(".origin_" + clickedSource)
                        .style("stroke-opacity", 0.3);

                } else if (clickedDestination != "") {
                    //Redraw Markers
                    drawMarkers(clickedDestination);

                    //Hide other paths
                    d3.selectAll(".connections").selectAll("path")
                    .filter(function() {
                        console.log(this.classList);
                        return !this.classList.contains("destination_" + clickedDestination);
                    })
                    .remove();

                    //Highlight paths
                    d3.selectAll(".connections").selectAll(".destination_" + clickedDestination)
                    .style("stroke-opacity", 0.3);

                };
            }
            else {
                //Reset zoom
                event.transform.k = 0.5;

                //Remove annotations
                svg.selectAll(".hover-annotation").remove();
            }
        }
        )
        ));

    //Stores the map
    let map = svg.append("g"); 

    //Map Out Country Boundaries
    map.attr("class", "countries")
        .selectAll("path")
        .data(worldjson.features)
        .enter()
        .append("path")
        //Replace space with underscores for class name
        .attr("class", d => "country_" + d.properties.name_en.replace(" ", "_"))
        //Appends the path to the map
        .attr("d", path)
        //Fill polygons
        .attr("fill", "white")

        //Add border to polygons
        .attr("stroke", "black")
        .attr("stroke-width", 0.3)
        .style("opacity", 0.8)
        
        //Add mouseover event
        .on("mouseover", function(event, d) {
            //If anything matches destination group, must be high income
            let allDestinationCode = d3.group(migrationDS, (data)=>{return data.destination_code});
            let matchIncomeGroup = allDestinationCode.has(d.properties.iso_n3) ? true : false;

            //Add hover effect
            if(d.properties.subregion == "South-Eastern Asia"){
                d3.select(this).attr("fill", "#00ADEF");
            }
            else if (matchIncomeGroup) {
                d3.select(this).attr("fill", "#EF4200");
            }
            else {
                d3.select(this).attr("fill", "#999999");
            };

            //Create on hover annotation
            createHoverAnnotations(path, d);
        })

        //Add mouseout event
        .on("mouseout", function(event, d) {
            //Remove hover effect
            d3.select(this).attr("fill", "white");

            //Remove hover annotations
            svg.selectAll(".hover-annotation").remove();
        })
        
        //Add onclick event
        .on("click", function(event, d) {
            //Filter to high income
            //If anything matches destination group, must be high income
            let allDestinationCode = d3.group(migrationDS, (data)=>{return data.destination_code});
            let matchIncomeGroup = allDestinationCode.has(d.properties.iso_n3) ? true : false;

            //Check if clicked country is SEA
            if(d.properties.subregion == "South-Eastern Asia") {
                //Reset filter first
                unfilter();

                //Assign clicked country
                clickedSource = d.properties.iso_n3;
                clickedDestination = "";

                ////////////////////////////
                //CARD LOGIC////////////////
                ////////////////////////////

                let destinationCard = d3.select("#destinationCard");

                //Filter to the country
                let maxDestinationIndex = d3.maxIndex(migrationDS, (data)=>{
                    if (data.origin_code == d.properties.iso_n3 && data.destination_code != "900") { //Exclude "WORLD"
                        return +data.migrationtotal;
                    }});

                let maxDestinationCountry = migrationDS[maxDestinationIndex];

                let overallEmigratedBrainDrain = d3.sum(migrationDS, (data)=>{
                    if (data.origin_code == d.properties.iso_n3 && data.destination_code != "900") { //Exclude "WORLD"
                        return +data.migrationtotal;
                    }});

                let overallEmigratedAll = d3.sum(migrationDS, (data)=>{
                    if (data.origin_code == d.properties.iso_n3 && data.destination_code == "900") { //"WORLD" indicates all including without brain drain
                        return +data.migrationtotal;
                    }});

                //Show country card
                destinationCard.classed("d-none", false)
                    .select(".clickedCountryName")
                    .text(d.properties.name_en);

                //Assign properties
                destinationCard.select(".clickedRegionName")
                    .text(d.properties.subregion);

                destinationCard.select(".mainDestinationCountry")
                    .text(maxDestinationCountry.destination_name);
                
                destinationCard.select(".mainDestinationTotal")
                    .text(maxDestinationCountry.migrationtotal.toLocaleString(locale));

                destinationCard.select(".overallEmigrationBrainDrain")
                    .text(overallEmigratedBrainDrain.toLocaleString(locale));

                destinationCard.select(".overallEmigrationAll")
                    .text(overallEmigratedAll.toLocaleString(locale));

                let sourceCard = d3.select("#sourceCard");
                //Hide high income country card
                sourceCard.classed("d-none", true);

                ////////////////////////////
                //FLIGHT LOGIC//////////////
                ////////////////////////////

                //Redraw Connections
                drawConnections();
                
                //Remove previous markers
                removeMarkers();

                //Redraw markers
                drawMarkers(clickedSource); //Pass origin country code

                //Hide other paths
                d3.selectAll(".connections").selectAll("path")
                .filter(function() {
                    return !this.classList.contains("origin_" + clickedSource);
                })
                .remove();

                //Highlight paths
                d3.selectAll(".connections").selectAll(".origin_" + clickedSource)
                    .style("stroke-opacity", 0.1);

            }
            else if (matchIncomeGroup) {
                //Reset filter first
                unfilter();

                //Unassign clicked country
                clickedSource = "";
                clickedDestination = d.properties.iso_n3;

                ////////////////////////////
                //CARD LOGIC////////////////
                ////////////////////////////

                //Check if clicked country is not SEA
                let sourceCard = d3.select("#sourceCard");

                //Filter to the country
                let maxSourceIndex = d3.maxIndex(migrationDS, (data)=>{
                    if (data.destination_code == d.properties.iso_n3 && data.origin_code != "920") { //Exclude "South East Asia (All)"
                        return +data.migrationtotal;
                    }});

                let maxSourceCountry = migrationDS[maxSourceIndex];

                let overallImmigratedAll = d3.sum(migrationDS, (data)=>{
                    if (data.destination_code == d.properties.iso_n3 && data.origin_code == "920") { //"South East Asia" indicates all including without brain drain
                        return +data.migrationtotal;
                    }});

                //Show source card
                sourceCard.classed("d-none", false)
                .select(".clickedCountryName")
                .text(d.properties.name_en);

                //Assign properties
                sourceCard.select(".clickedRegionName")
                    .text(d.properties.subregion);

                sourceCard.select(".mainSourceCountry")
                    .text(maxSourceCountry.origin_name);
                
                sourceCard.select(".mainSourceTotal")
                    .text(maxSourceCountry.migrationtotal.toLocaleString(locale));

                sourceCard.select(".overallImmigrationAll")
                    .text(overallImmigratedAll.toLocaleString(locale));

                let destinationCard = d3.select("#destinationCard");
                //Hide destination country card
                destinationCard.classed("d-none", true);

                ////////////////////////////
                //FLIGHT LOGIC//////////////
                ////////////////////////////

                //Redraw Connections
                drawConnections();
                
                //Remove previous markers
                removeMarkers();

                //Redraw markers
                drawMarkers(clickedDestination); //Pass origin country code

                //Hide other paths
                d3.selectAll(".connections").selectAll("path")
                .filter(function() {
                    return !this.classList.contains("destination_" + clickedDestination);
                })
                .remove();

                //Highlight paths
                d3.selectAll(".connections").selectAll(".destination_" + clickedDestination)
                    .style("stroke-opacity", 0.1);
            }

        });


    //Filter data for connections and markers
    let filtereddata = migrationDS.filter(function(d) {
        //Get origin and destination
        let origin = [d.origin_long, d.origin_lat];
        let destination = [d.destination_long, d.destination_lat];

        let checklong = d.origin_long != 0 && d.destination_long != 0;
        let checklat = d.origin_lat != 0 && d.destination_lat != 0;
        let samecoordinates = origin[0] != destination[0] && origin[1] != destination[1];
        let world = d.origin_code != "920" && d.destination_code != "900";

        let bool = checklong && checklat && samecoordinates && world;
        return bool;
    });


    //Draw Connections
    function drawConnections() {
        //Connection group
        let connectionsGroup = svg.append("g")
                                    .attr("class", "connections");

        //Each connection
        let connections = connectionsGroup.selectAll("worldlinks")
                            .data(filtereddata)
                            .enter()
                            .append("path")
                            .attr("d", function(d) {    
                                //Get origin and destination coordinates
                                let origin = [d.origin_long, d.origin_lat];
                                let destination = [d.destination_long, d.destination_lat];

                                //Check if origin and destination are not the same
                                if (origin[0] != destination[0] && origin[1] != destination[1] && d.origin_code != "920" && d.destination_code != "900") {
                                    //Create a path between origin and destination
                                    let pathData = {type: "LineString", coordinates: [origin, destination]};

                                    //Return path
                                    return path(pathData);
                                }
                            })
                            .attr("class",function(d) { //To find back in other functions
                                return "origin_" + d.origin_code + " destination_" + d.destination_code;
                            })
                            .style("fill", "none")
                            .style("stroke", "black")
                            .style("stroke-width", 1)
                            .style("stroke-opacity", 0.05)

                            //When hovering on path
                            .on("mouseover", function(event, d) {
                                let path = d3.select(this);

                                path.style("stroke-opacity", 1);

                                //Create on hover annotation
                                createPathHoverAnnotations(path, event, d);
                            })
                            .on("mouseout", function(event, d) {
                                let path = d3.select(this);

                                //Remove hover annotations
                                _.delay(function() {
                                    path.style("stroke-opacity", 0.05);
                                    svg.select(".path-annotation").remove();
                                }, 1500);
                                
                            });

        //Animate connections
        let animation = function() {
            connections.each(function() {
                //Animate each path
                d3.select(this)
                    .attr("stroke-dasharray", 5 + " " + 2)
                    .attr("stroke-dashoffset", function(){
                        return d3.select(this).node().getTotalLength();
                    })
                    .transition()
                    .ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0)
                    .duration(40000);
            });
        };

        //Animation loop
        animation(); // Start the animation
        setInterval(animation, 40100); // Call the animation function every 10 seconds
    }

    //Initial draw
    drawConnections();

    //Draw Markers
    function drawMarkers(country) {
        //Create markers group
        let markersGroup = svg.append("g")
        .attr("class", "markers");

        //Create plane markers
        let markers = markersGroup.selectAll("worldmarks")
        .data(filtereddata)
        .enter()
        //Dynamic draw function
        .call(drawicon, country);

        //Animate markers
        animateMarkers();
    }

    //Remove Markers
    function removeMarkers() {
        //Remove markers
        d3.selectAll(".markers").remove();
        stopMarkerAnimation();
    }

    //Markers animation
    function animateMarkers() {
        //Flush any animations before animating
        stopMarkerAnimation();

        //Don't launch animation if match previous
        let matched = "";

        //Animate markers
        d3.select("g.markers").selectAll("svg").each(function() {
                let c = d3.select(this).attr("class");
                let c2 = c.split(" ");
                let cstr = "." + c2[0] + "." + c2[1];
    
                //Only launch animation if previous one is different and path exists
                if (cstr != matched && d3.select(".connections").select(cstr).attr("d") != null) {
                    try {

                        _.delay(function(cstr) {
                            //Animate each marker
                            d3.select("g.markers").selectAll(cstr)
                            .transition()
                            .delay((d, i) => (i * 2000))
                            .attr("fill-opacity", 1)
                            .attr("stroke-opacity", 1)
                            .ease(d3.easePolyInOut.exponent(1))
                            .duration(20000)
                            .attrTween("x", translateAlongX(cstr))
                            .attrTween("y", translateAlongY(cstr));
            
                        }, 1000, cstr);
        
                        //Update matched
                        matched = cstr;
                    }
                    catch (error) {
                        console.log(error);
                    }
                }
            });
    }

    function stopMarkerAnimation() {
        //Stop animation
        d3.selectAll(".markers").selectAll("*")
        .interrupt();
    }

    //Dynamically draw icon based on migration numbers
    function drawicon(selection, country) {

        //Draw different amount of icons for each datum in selection
        selection.each(function(d) {
            //Check if clicked country is source or destination

            let dest = clickedDestination ? true : false;
            let source = clickedSource ? true : false;
    
            let dbool = dest && d.destination_code == country;
            let sbool = source && d.origin_code == country;

            function draw(node) {
                //Calculate number of icons to draw (every 500,000 migrants = 1 icon)
                let numicons = Math.ceil(d.migrationtotal / 500000);

                for (let i = 0; i < numicons; i++) {
                    d3.select(node)
                        .append("svg") //Plane departure icon
    
                        //To find back in other functions
                        .attr("class",function(d) { 
                            return "origin_" + d.origin_code + " destination_" + d.destination_code;
                        })
    
                        //Styling
                        .attr("fill", "#0036EF")
                        .attr("fill-opacity", 0)
                        .attr("stroke", "#0036EF")
                        .attr("stroke-width", 1)
                        .attr("stroke-opacity", 0)
    
                        //Position
                        .attr("x", function(d) {
                            let origin = [d.origin_long, d.origin_lat];
    
                            return projection(origin)[0];
                        })
                        .attr("y", function(d) {
                            let origin = [d.origin_long, d.origin_lat];
                            return projection(origin)[1];
                        })
    
                        .append("path")
                        .attr("d", "M14.639 10.258l4.83 -1.294a2 2 0 1 1 1.035 3.863l-14.489 3.883l-4.45 -5.02l2.897 -.776l2.45 1.414l2.897 -.776l-3.743 -6.244l2.898 -.777l5.675 5.727z")
                        .select(function() { return node.parentNode; }) //Go back 1 level
                        .append("path")
                        .attr("d", "M3 21h18")
                        .select(function() { return node.parentNode; }) //Go back 1 level
                }
            }

            //Check casse then draw
            switch (true) {
                case sbool:
                    draw(this);
                    break;
                case dbool:
                    draw(this);
                    break;
            }
        });
    }

    //Close Country Card
    d3.select("#destinationCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#destinationCard")
                .classed("d-none", true);

            //Reset
            unfilter();
        });

    //Close Country Card
    d3.select("#sourceCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#sourceCard")
                .classed("d-none", true);

            //Reset
            unfilter();
        });

    function unfilter() {
        //Reset clicked country
        clickedSource = "";
        clickedDestination = "";
    
        //Remove all markers
        removeMarkers();
    
        //Remove Connections
        svg.selectAll(".connections").remove();
    
        //Redraw Connections
        drawConnections();
    }
    
}



//Custom animation interpolation
function translateAlongX(cstr) {

    //Return function
    return function(d, i, a) {
        return function(t) {
            try {
                //Reassign node
                let node = d3.select(".connections").select(cstr).node();

                //Get total length of path
                let l = node.getTotalLength();

                //Get point at length
                let p = node.getPointAtLength(t * l);

                //Return translation
                return p.x * 0.975; //Multiply by shift factor
            }
            catch (error) {
                d3.select(this).remove().interrupt();
            }
        };
    };

}

function translateAlongY(cstr) {

    //Return function
    return function(d, i, a) {
        return function(t) {
            try {
                //Reassign node
                let node = d3.select(".connections").select(cstr).node();

                //Get total length of path
                let l = node.getTotalLength();

                //Get point at length
                let p = node.getPointAtLength(t * l);

                //Return translation
                return p.y * 0.97; //Multiply by shift factor
            }
            catch {
                d3.select(this).remove().interrupt();
            }

        };
    };

}

//When hovering on countries
function createHoverAnnotations(path, d) {
    //Define annotation type
    const annotype = d3.annotationLabel;

    //Create annotation
    let annotation = [{
        note: {
            title: d.properties.name_en,
            label: d.properties.subregion,
            bgPadding: 20,
        },
        //To show bg, bg accessible in HTML
        className: "show-bg",
        //Set X and Y
        x: path.centroid(d)[0],
        y: path.centroid(d)[1],
        dx: 100,
        dy: -50,
        color: ["#ffd02e"]
    }];

    //Set annotations properties
    let makeAnnotations = d3.annotation()
        .editMode(false)
        .notePadding(20)
        .type(annotype)
        .annotations(annotation);

    //Draw annotations
    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group hover-annotation")
        .call(makeAnnotations);
}

//When hovering on flight paths
function createPathHoverAnnotations(path, event, d) {
    //Define annotation type
    const annotype = d3.annotationLabel;

    //Find pointer location
    let pointer = d3.pointer(event);

    //Create annotation
    let annotation = [{
        note: {
            title: d.origin_name + " to " + d.destination_name,
            label: "Number of Migration (Overall): " + d.migrationtotal.toLocaleString(locale),
            bgPadding: 20,
        },
        //To show bg, bg accessible in HTML
        className: "show-bg",
        //Set X and Y
        x: pointer[0],
        y: pointer[1],
        dx: 50,
        dy: -25,
        color: ["#00EFB9"]
    }];

    //Set annotations properties
    let makeAnnotations = d3.annotation()
        .editMode(false)
        .notePadding(20)
        //Width of annotation
        .textWrap(500)
        .type(annotype)
        .annotations(annotation);

    //Draw annotations
    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group path-annotation")
        .call(makeAnnotations);
}

function geoChart() {

    var svg = d3.select("#data-vis") //Selects the body tag
                .append("svg") //Adds in the SVG tag (canvas)
                .attr("width", w)
                .attr("height", h) //Specifies the width and height of the SVG canvas
                .style("background-color", "white"); //Sets the background colour of the SVG canvas

    enter(svg);         
}

window.onload = init; //Executes the init function when the window loads

window.onresize = resize; //Executes the resize function when the window is resized