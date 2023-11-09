//Initialise datasets
let worldjson;
let migrationDS;

//SCRIPT PROPERTIES
//Define width and height of visualisation
let w = d3.select("#data-vis").node().getBoundingClientRect().width;
let h = 600;

//Define mouse sensitivity
const sensitivity = 75;

//Define annotation type
const annotype = d3.annotationLabel;

//Get user locale
const locale = navigator.languages[0] || navigator.language || "en-GB";

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

    //TODO: Remove Debug data table
    console.table(migrationDS, ["origin_code", "origin_name", "origin_lat", "origin_long", "destination_code", "destination_name", "destination_lat", "destination_long", "migration2000", "migration2005", "migration2010", "migration2015", "migration2020", "migrationtotal"])
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

    //TODO: HANDLE DRAG AND ZOOM BEHAVIOUR WITH ANIMATIONS
    //TODO: Redraw path but can update animations on the fly if possible

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
        svg.selectAll("path").attr("d", path);

        //Remove hover annotations (Prevent confusion)
        svg.selectAll(".hover-annotation").remove();

        }, 50, {'trailing': true})
        ))

        //Define zoom behaviour
        .call(d3.zoom().on('zoom', _.debounce((event) => {
            if(event.transform.k > 0.5) {
                //Update projection
                projection.scale(initialScale * event.transform.k);

                //Update path
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);

                //Update globe radius
                globe.attr("r", projection.scale());

                //Remove hover annotations (Prevent confusion)
                svg.selectAll(".hover-annotation").remove();
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

            }
            else if (matchIncomeGroup) {
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

    //Draw Connections (Airplane)
    let connectionsGroup = svg.append("g")
                                .attr("class", "connections");

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
                        .style("stroke-width", 0.5)
                        .style("stroke-opacity", 0.08);

    let markersGroup = svg.append("g")
                            .attr("class", "markers");

    //Dynamically draw icon based on migration numbers
    function drawicon(selection) {

        //Draw different amount of icons for each datum in selection
        selection.each(function(d) {
            //Calculate number of icons to draw (every 500,000 migrants = 1 icon)
            let numicons = Math.ceil(d.migrationtotal / 500000);

            for (let i = 0; i < numicons; i++) {
                d3.select(this)
                    .append("svg") //Plane departure icon

                    //To find back in other functions
                    .attr("class",function(d) { 
                        return "origin_" + d.origin_code + " destination_" + d.destination_code;
                    })

                    //Styling
                    .attr("fill", "none")
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0.3)

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
                    .select(function() { return this.parentNode; }) //Go back 1 level
                    .append("path")
                    .attr("d", "M3 21h18")
                    .select(function() { return this.parentNode; }) //Go back 1 level
            }
        });
    }

    //Temporary data store for markers
    //TODO: Find a better way to do this, it will all draw the same shit
    //TODO: Try do inline or pass variable in the same method using function(d) at call
    let tempdata;

    //Create plane markers
    let markers = markersGroup.selectAll("worldmarks")
                        .data(filtereddata)
                        .enter()
                        //Dynamic draw function
                        .call(drawicon);

    //Animate markers
    //TODO: FIX ANIMATION
    //TODO: Might have to remove multiple plane draw due to lack of memory
    // markers.selectAll("svg").each(function() {
    //     let c = d3.select(this).attr("class");
    //     let c2 = c.split(" ");
    //     let cstr = "." + c2[0] + "." + c2[1];

    //     markers.selectAll("svg").selectAll(cstr);

    //     console.log(markers.selectAll("svg").selectAll(cstr));
    // })

//     markers.each(function() {
// //TODO: FIX THIS LATER
//         let c = d3.select(this).attr("class");
//         let c2 = c.split(" ");
//         let cstr = "." + c2[0] + "." + c2[1];

//         let node = d3.select(".connections").select(cstr).node();

//         console.log(d3.select(this));

//         //Animate each marker
//         d3.select(this)
//             .transition()
//             .delay((d, i) => (i * 1500))
//             .ease(d3.easeLinear)
//             .duration(40000)
//             .attrTween("x", translateAlongX(node))
//             .attrTween("y", translateAlongY(node));
//     });


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

    //Close Country Card
    d3.select("#destinationCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#destinationCard")
                .classed("d-none", true);

            //TODO: Unfilter the country here
        });

    //Close Country Card
    d3.select("#sourceCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#sourceCard")
                .classed("d-none", true);

            //TODO: Unfilter the country here
        });
    
}

//Custom animation interpolation
function translateAlongX(node) {
    //Get total length of path
    let l = node.getTotalLength();

    //Return function
    return function(d, i, a) {
        return function(t) {
            //Get point at length
            let p = node.getPointAtLength(t * l);

            //Return translation
            return p.x * 0.975; //Multiply by shift factor
        };
    };

}

function translateAlongY(node) {
    //Get total length of path
    let l = node.getTotalLength();

    //Return function
    return function(d, i, a) {
        return function(t) {
            //Get point at length
            let p = node.getPointAtLength(t * l);

            //Return translation
            return p.y * 0.97; //Multiply by shift factor
        };
    };

}

//TODO: Check if paths need to be updated
function updatePath() {

}

function createHoverAnnotations(path, d) {
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