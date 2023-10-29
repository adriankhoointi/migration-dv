//Initialise datasets
let worldjson;

//TODO: Add in data for source and destination migrations


//Define width and height of visualisation
let w = d3.select("#data-vis").node().getBoundingClientRect().width;
let h = 600;

//Define mouse sensitivity
const sensitivity = 75;

//Initalise visualisation
async function init() {
    //Load datasets
    await loadDatasets();
    await geoChart();
}

//Load datasets
async function loadDatasets() {
    //Load world json
    worldjson = await d3.json("../assets/d3/data/countries.geojson");
}

[-2.218, 115.6628]

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
    svg.call(d3.drag().on('drag', (event) => {
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
        }))

        //Define zoom behaviour
        .call(d3.zoom().on('zoom', (event) => {
            if(event.transform.k > 0.5) {
                //Update projection
                projection.scale(initialScale * event.transform.k);
                //Update path
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
                
                //Update globe radius
                globe.attr("r", projection.scale());
            }
            else {
                //Reset zoom
                event.transform.k = 0.5;
            }
        }));

    //Stores the map
    let map = svg.append("g"); 

    //Map Out Country Boundaries
    map.attr("class", "countries")
        .selectAll("path")
        .data(worldjson.features)
        .enter()
        .append("path")
        //Replace space with underscores for class name
        .attr("class", d => "country_" + d.properties.ADMIN.replace(" ", "_"))
        //Appends the path to the map
        .attr("d", path)

        //Fill polygons
        .attr("fill", "white")

        //Add border to polygons
        .attr("stroke", "black")
        .attr("stroke-width", 0.3)
        .style("opacity", 0.8);

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

//TODO: Add window resize function to rescale visualisation