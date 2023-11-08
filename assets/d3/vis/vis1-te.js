// Specify the chart’s dimensions.
var w;

document.addEventListener("DOMContentLoaded", function() {
    w = d3.select("#data-vis").node().getBoundingClientRect().width; // Use the value of w
});

var h = 500;
const marginTop = 60;
const marginRight = 40;
const marginBottom = 100;
const marginLeft = 60;
var migrationDS;

function init(){

    migrationDS = d3.csv("../assets/d3/data/time-evolution/clean_ims_stock_evolution_by_origin_and_year_v4.csv",
    function(d){
        return{
            year: d['Year'],
            origin: d['Origin'],
            emigration: +d['Emigration']
        };
    }).then(function(data){
        migrationDS = data;

        console.table(migrationDS, ["year", "origin", "emigration"]); // Print data to console
        
        stackedAreaChart(migrationDS);
    }); 
}

function stackedAreaChart(data){

    var svg = d3.select("#data-vis")
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("viewBox", [0, 0, w, h]);
                // .style("background-color", "white");
                // .attr("style", "max-width: 100%, height: auto;");

    var series = d3.stack()
                    .keys(d3.union(data.map(d => d.origin)))
                    .value(([, D], key) => D.get(key).emigration)
                    (d3.index(data, d => d.year, d => d.origin));

    var xS = xScale(data);
    var yS = yScale(series);

    const color = d3.scaleOrdinal()
                    .domain(series.map(d => d.key))
                    .range(d3.schemePaired); // Array of twelve(12) categorical colors represented as RGB hexadecimal strings.

    const area = d3.area()
                    .x(d => xS(d.data[0]))
                    .y0(d => yS(d[0]))
                    .y1(d => yS(d[1]));
    

    enter(svg, xS, yS, series, color, area, data);
}

function enter(svg, xS, yS, series, color, area){
    // TODO: Draw Chart elements
    
    // Add the y-axis, remove the domain line, add grid lines and a label.
    svg.append("g")
      .attr("transform", `translate(${marginLeft})`)
      .call(d3.axisLeft(yS).ticks(h / 80))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .clone()
        .attr("x2", w - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("Number of Emigration"));
          
          
    // Append a path for each series.
    svg.append("g")
        .selectAll()
        .data(series)
        .join("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .append("title")
        .text(d => d.key);

    // Append the horizontal axis atop the area.
    svg.append("g")
    .attr("transform", `translate(0,${h - marginBottom})`)
    .call(d3.axisBottom(xS).ticks(7));
}

// TODO: Fix x-axis and y-axis
function xScale(data){
    const x = d3.scaleLinear()
                .domain(d3.extent(data, function(d){ return d.year; }))
                .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
                .range([marginLeft, w - marginRight]);

    return x;
}

function yScale(series){
    const y = d3.scaleLinear()
                .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
                .range([h - marginBottom, marginTop]);

    return y;
}

  window.onload = init;