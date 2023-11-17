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

    //Redraw legend
    d3.select("#legend").select("svg").remove();

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
    migrationDS = await d3.csv("../assets/d3/data/geo-migration/clean_ims_stock_proportion_to_high_income_v2.csv", function(d) {
        return {
            //Declare variables

            //Match origin country
            origin_code: d['Location code of origin'],
            origin_name: d['Region, subregion, country or area'],
            origin_lat: +d['Origin Latitude'],
            origin_long: +d['Origin Longitude'],

            //Total of population
            total_pop2000: +d['Total Population (2000)'],
            total_pop2005: +d['Total Population (2005)'],
            total_pop2010: +d['Total Population (2010)'],
            total_pop2015: +d['Total Population (2015)'],
            total_pop2020: +d['Total Population (2020)'],

            //Number of migrants
            total_migrants2000: +d['Total Migrants (2000)'],
            total_migrants2005: +d['Total Migrants (2005)'],
            total_migrants2010: +d['Total Migrants (2010)'],
            total_migrants2015: +d['Total Migrants (2015)'],
            total_migrants2020: +d['Total Migrants (2020)'],
            overall_migrants: +d['Total Migrants (2000-2020)'],

            //Proportion
            prop_emi2000: +d['Proportion of Emigration per Population (%) (2000)'],
            prop_emi2005: +d['Proportion of Emigration per Population (%) (2005)'],
            prop_emi2010: +d['Proportion of Emigration per Population (%) (2010)'],
            prop_emi2015: +d['Proportion of Emigration per Population (%) (2015)'],
            prop_emi2020: +d['Proportion of Emigration per Population (%) (2020)'],
            overall_prop: +d['Overall Proportion of Emigration per Population (%) (2020)'],

            //Number of migrants per population
            numpt_emi2000: +d['Number of Emigration per Population per Thousand (2000)'],
            numpt_emi2005: +d['Number of Emigration per Population per Thousand (2005)'],
            numpt_emi2010: +d['Number of Emigration per Population per Thousand (2010)'],
            numpt_emi2015: +d['Number of Emigration per Population per Thousand (2015)'],
            numpt_emi2020: +d['Number of Emigration per Population per Thousand (2020)'],
            overall_numpt: +d['Overall Number of Emigration per Population per Thousand (2020)']

        };
    });

    //Log table
    //console.table(migrationDS, ["origin_code", "origin_name", "total_pop2000", "total_pop2020", "total_migrants2000", "total_migrants2020", "overall_migrants", "prop_emi2020", "overall_prop", "numpt_emi2000", "overall_numpt"]);
}

function enter (svg) {
    //Filter data for mapping 
    let filtereddata = migrationDS.filter(function(d) {
        //Exclude origin SEA
        let checkorigin = d.origin_code != "920";

        let bool = checkorigin;
        return bool;
    });

    //Set Up Globe Projection
    let projection = d3.geoOrthographic()
                    .center([0, 0]) //Sets the center of the map to South East Asia
                    .rotate([-115.6628, -10.218]) //Centers map to equator
                    .translate([w/2, h/2]) //Translates the map to the center of the SVG canvas
                    .scale(750); //Sets the scale of the map

    //Define initial scale of map
    const initialScale = projection.scale();

    //Define initial rotation of map
    const initialRotate = projection.rotate();

    //Define colour scale to use
    let color;

    //Reassign colour scale to use
    function reassignColour(min, avg ,max) {
        color = d3.scaleDiverging()
                    .domain([min, avg, max])
                    .interpolator(d3.interpolateRgb("#00EF42", "#EF4200"));
    }

    //Initialise colour scale
    reassignColour(0, d3.mean(filtereddata, d => d.overall_prop) , d3.max(filtereddata, d => d.overall_prop));

    //Define legend
    function drawLegend(c) {
        //Define legend
        let l = Legend(c, {
            //title: "Proportion of Emigration per Population (%)",
            tickFormat: ".0%",
        });

        //Append legend
        d3.select("#legend").append(() => l);
    }

    drawLegend(color);

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

        //Fill polygons based on proportions
        .attr("fill", function(d) {
            //Check if origin exists
            let allOriginCode = d3.group(filtereddata, (data)=>{return data.origin_code});
            let matchOrigin = allOriginCode.has(d.properties.iso_n3) ? true : false;

            //If origin exists
            if (matchOrigin) {
                //Find value if origin code matches
                let c = color(d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return data.overall_prop;
                    }
                }));

                return c;
            }

            //If doesn't exists
            else {
                return "white";
            }
        })

        //Add border to polygons
        .attr("stroke", "black")
        .attr("stroke-width", 0.3)
        .style("opacity", 0.8)
        
    
        //Add onclick event
        .on("click", function(event, d) {

            //TODO: Add rotate and zoom to country transition

            //Check if origin exists
            let allOriginCode = d3.group(filtereddata, (data)=>{return data.origin_code});
            let matchOrigin = allOriginCode.has(d.properties.iso_n3) ? true : false;

            //If origin exists
            if (matchOrigin) {
                //Reset filter if required
                unfilter();

                let lat = d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return -data.origin_lat;
                    }
                });

                let long = d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return -data.origin_long;
                    }
                });

                //UPDATE ZOOM SCALE
                if (d.properties.iso_n3 == "702") { //Singapore
                    projection.scale(initialScale * 5);
                }
                else if (d.properties.iso_n3 == "096") { //Brunei
                    projection.scale(initialScale * 3);
                }
                else {
                    projection.scale(initialScale * 1.5);
                }

                //Update rotation
                projection.rotate([long, lat]);

                //Update globe radius
                globe.transition()
                .duration(1500)
                .attr("r", projection.scale());

                //Update path
                path = d3.geoPath().projection(projection);

                svg.selectAll(".countries").selectAll("path")
                .transition()
                .duration(1500)
                .attr("d", path);

                ////////////////////////////
                //CARD LOGIC////////////////
                ////////////////////////////

                let detailCard = d3.select("#detailCard");

                //Filter to the country
                let proportion = d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return data.overall_prop;
                    }
                });

                let numberEmigration = d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return data.overall_numpt;
                    }
                });

                let overallEmigrated = d3.sum(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return data.overall_migrants;
                    }
                });

                let currentPopulation = d3.max(filtereddata, function(data) {
                    if(d.properties.iso_n3 == data.origin_code) {
                        return data.total_pop2020;
                    }
                });

                //Show country card
                detailCard.classed("d-none", false)
                .select(".clickedCountryName")
                .text(d.properties.name_en);

                //Assign properties
                detailCard.select(".clickedRegionName")
                    .text(d.properties.subregion);

                detailCard.select(".proportionOfEmigration")
                    .text(proportion.toLocaleString(locale, {style: "percent", minimumFractionDigits: 2}));
                
                detailCard.select(".numberofEmigration")
                    .text(numberEmigration.toLocaleString(locale, {maximumFractionDigits: 2}));

                detailCard.select(".overallEmigrationBrainDrain")
                    .text(overallEmigrated.toLocaleString(locale));

                detailCard.select(".currentPopulation")
                    .text(currentPopulation.toLocaleString(locale));

            }
            //If origin not found
            else {
                window.alert("Please click on shaded countries only.");
            };

        })
        
        //Add mouseover event
        .on("mouseover", function(event, d) {
            //Current color
            let currentColor = d3.select(this).attr("fill");

            //Darker Hue
            let newColor = d3.color(currentColor).brighter(2.5);

            d3.select(this).attr("fill", newColor);

            //Create on hover annotation
            createHoverAnnotations(path, d);
        })

        //Add mouseout event
        .on("mouseout", function(event, d) {

            //Revert colour
            d3.select(this).attr("fill", function(d) {
                //Check if origin exists
                let allOriginCode = d3.group(filtereddata, (data)=>{return data.origin_code});
                let matchOrigin = allOriginCode.has(d.properties.iso_n3) ? true : false;
    
                //If origin exists
                if (matchOrigin) {
                    //Find value if origin code matches
                    let c = color(d3.max(filtereddata, function(data) {
                        if(d.properties.iso_n3 == data.origin_code) {
                            return data.overall_prop;
                        }
                    }));
    
                    return c;
                }
    
                //If doesn't exists
                else {
                    return "white";
                }
            })

            //Remove hover annotations
            svg.selectAll(".hover-annotation").remove();
        });

    //Close Detail Card
    d3.select("#detailCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#detailCard")
                .classed("d-none", true);

            //Reset zoom
            projection.scale(initialScale);

            //Reset rotation
            projection.rotate(initialRotate);

            //Update globe radius
            globe.transition()
            .duration(1500)
            .attr("r", projection.scale());

            //Update path
            path = d3.geoPath().projection(projection);

            svg.selectAll(".countries").selectAll("path")
            .transition()
            .duration(1500)
            .attr("d", path);

            //Reset
            unfilter();
        });

    function unfilter() {
        //TODO: Add logic to reset filter if implemeting year slider
    }
    
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