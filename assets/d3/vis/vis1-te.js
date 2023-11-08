// Specify the chart’s dimensions.
var w;

document.addEventListener("DOMContentLoaded", function() {
    w = d3.select("#data-vis").node().getBoundingClientRect().width; // Use the value of w
});

var h = 600;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 30;
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
        
        lineChart(migrationDS);
    }); 
}

function lineChart(data){

  var svg = d3.select("#data-vis")
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("viewBox", [0, 0, w, h])
                .attr("style", "max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;");
                // .style("background-color", "white");
                // .attr("style", "max-width: 100%, height: auto;");

    enter(svg, data);
}

function enter(svg, data){
    // TODO: Draw Chart elements

    var xS = xScale(data);
    var yS = yScale(data);
    
    var xAxis = svg.append("g");

    xAxis.attr("transform", )
    
}


function xScale(data){
    const x = d3.scaleLinear()
                .domain(d3.extent(data, function(d){ return d.year; }))
                .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
                .range([marginLeft, w - marginRight]);

    return x;
}

function yScale(data){
    const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.emigration)]).nice()
                .range([h - marginBottom, marginTop]);

    return y;
}

  window.onload = init;