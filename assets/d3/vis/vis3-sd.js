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
    migrationDS = await d3.csv("../assets/d3/data/geo-migration/clean_ims_stock_total_by_origin_and_destination.csv", function(d) {
        return {
            //Declare variables
            origin_code: d['Location code of origin'],
            origin_name: d['Origin'],
            destination_code: d['Location code of destination'],
            destination_name: d['Destination'],
            migration2000: +d['2000'],
            migration2005: +d['2005'],
            migration2010: +d['2010'],
            migration2015: +d['2015'],
            migration2020: +d['2020'],
            migrationtotal: +d['Total (2000-2020)']
        };
    });

    //TODO: Remove Debug data table
    console.table(migrationDS, ["origin_code", "origin_name", "destination_code", "destination_name", "migration2000", "migration2005", "migration2010", "migration2015", "migration2020", "migrationtotal"])
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

            //TODO: REMOVE DEBUG
            console.log(matchIncomeGroup);

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

            //FIXME: Wait for Ming Soo to fix data
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
            //Check if clicked country is SEA
            if(d.properties.subregion == "South-Eastern Asia") {
                let destinationCard = d3.select("#destinationCard");

                //Filter to the country
                let maxDestinationIndex = d3.maxIndex(migrationDS, (data)=>{
                    if (data.origin_code == d.properties.iso_n3) {
                        return +data.migrationtotal;
                    }});

                let maxDestinationCountry = migrationDS[maxDestinationIndex];

                let overallEmigrated = d3.sum(migrationDS, (data)=>{
                    if (data.origin_code == d.properties.iso_n3) {
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

                destinationCard.select(".overallEmigration")
                    .text(overallEmigrated.toLocaleString(locale));
            }

        });

    //Close Country Card
    d3.select("#destinationCard").select(".btn-close")
        .on("click", function(event, d) {
            //Hide country card
            d3.select("#destinationCard")
                .classed("d-none", true);

            //TODO: Unfilter the country here
        });
    
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