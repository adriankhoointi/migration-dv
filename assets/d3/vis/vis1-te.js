//Templates
// https://observablehq.com/@d3/multi-line-chart
// https://observablehq.com/@d3/line-with-tooltip
// https://observablehq.com/@d3/pan-zoom-axes


// Chart dimensions.
let w = d3.select("#line-chart").node().getBoundingClientRect().width;
let h = 800;
const marginTop = 30;
const marginRight = 50;
const marginBottom = 30;
const marginLeft = 80;
let migrationDS;

//Get user locale
const locale = navigator.languages[0] || navigator.language || "en-GB";

async function init() {
  migrationDS = d3
    .csv(
      "../assets/d3/data/time-evolution/clean_ims_stock_evolution_by_origin_and_year_v4.csv",
      function (d) {
        return {
          year: d["Year"],
          origin: d["Origin"],
          emigration: +d["Emigration"],
        };
      }
    )
    .then(function (data) {
      let filteredData = data.filter(function (d) {
        let origin = d.origin != "South-Eastern Asia"; // Exclude "South-Eastern Asia"
        return origin;
      });
      console.table(filteredData, ["year", "origin", "emigration"]); // Print data to console

      migrationDS = filteredData;
      lineChart(migrationDS);
    });
}

//Dynamic resize
async function resize() {
  //Remove SVG
  d3.select("svg").remove();

  //Reset width
  w = d3.select("#line-chart").node().getBoundingClientRect().width;

  //Redraw visualisation
  await lineChart(migrationDS);
}


async function lineChart(data) {
  var svg = d3
    .select("#line-chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", [0, 0, w, h])
    .attr(
      "style",
      "max-width: 100%; height: auto; overflow: hidden; font: 10px sans-serif;"
    );

  enter(svg, data);
}


// Scale function for x-axis
function xScale(data) {
  const x = d3
    .scaleLinear()
    .domain(
      d3.extent(data, function (d) {
        return d.year;
      })
    )
    .domain([d3.min(data, (d) => d.year), d3.max(data, (d) => d.year)])
    .range([marginLeft, w - marginRight]);

  return x;
}

//Scale function for y-axis
function yScale(data) {
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.emigration)])
    .nice()
    .range([h - marginBottom, marginTop]);

  return y;
}

function enter(svg, data) {
  // Define Scale variables
  let xS = xScale(data);
  let yS = yScale(data);

  //Plotting  X Axis
  let xAxis = d3.axisBottom(xS)
                  .ticks(5) //1 tick every 5 years
                  .tickSizeOuter(0)
                  .tickFormat(d3.format("d")) //Format to show year in full;
  
  let gXAxis = svg.append("g")
                  .attr("transform", `translate(0, ${h - marginBottom})`)
                  .call(xAxis);

  //Plotting Y Axis
  let yAxis = d3.axisLeft(yS);

  let gYAxis = svg.append("g")
                  .attr("transform", `translate(${marginLeft}, 0)`)
                  .call(yAxis)

                  //Remove extra line on y-axis
                  .call(g => g.select(".domain"))
                  
                  //Adding y-axis title label
                  .call((g) =>
                    g.append("text")
                    .attr("x", -marginLeft)
                    .attr("y", marginTop - 20)
                    .attr("fill", "black")
                    .attr("text-anchor", "start")
                    .text("Number of Emigration")
                  );

  // Compute the points in pixel space as [x, y, z], where z is the name of the series.
  let points = data.map((d) => [xS(d.year), yS(d.emigration), d.origin]);

  // Group the points by series.
  let groups = d3.rollup(
    points,
    (v) => Object.assign(v, { z: v[0][2] }),
    (d) => d[2]
  );

  //TODO: Set custom colours for each country
  //Custom colour scheme
  let customScheme = [
    "#e6194B",
    "#808000",
    "#ffe119",
    "#4363d8",
    "#ffd8b1",
    "#911eb4",
    "#42d4f4",
    "#dcbeff",
    "#bfef45",
    "#fabed4",
    "#469990",
    //Brunei
    //Cambodia
    //Indonesia
    //Laos
    //Malaysia
    //Myanmar
    //Philippines
    //Singapore
    //Thailand
    //Timor-Leste
    //Vietnam
  ];

  // Define color scale
  let colorScale = d3.scaleOrdinal()
                    .domain(Array.from(groups.keys()))
                    .range(customScheme);

  // Define line
  let line = d3.line();

  //Define clipping region
  let clip = svg.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", w - marginRight - marginLeft)
                .attr("height", h - marginBottom - marginTop)
                .attr("x", marginLeft)
                .attr("y", marginTop);


  // Define line path
  let path = svg
    .append("g")
    .attr("class", "line-graph")
    .attr("clip-path", "url(#clip)")

  //Allow zoom event to occur here (Create region for zooming)
    .append("rect")
    .attr("width", w - marginRight - marginLeft)
    .attr("height", h - marginBottom - marginTop)
    .attr("x", marginLeft)
    .attr("y", marginTop)
    .attr("fill-opacity", 0)

    .select(function() { return this.parentNode; }) //Go back 1 level
  
  //Continue plotting the line
    .selectAll("line-path")
    .data(groups.values())
    .join("path")
    .style("mix-blend-mode", "multiply")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", function (d) {
      return colorScale(d[0][2]);
    })
    .attr("class", function(d) {
      return "line-path country_" + d[0][2].replace(/ /g, "_");
    })
    .attr("stroke-width", "2.5")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");

  // Create dots for the seven years (1990-2020, 5 years interval)
  // Add an invisible layer for the interactive tip.
  let dot = svg.append("g").attr("display", "none");

  dot
  .append("circle")
  .attr("class", "circles")
  .attr("r", 2.5);

// DEFINE CUSTOM MOUSE BEHAVIOURS

// Handles click event on highlighted path
  let clicked = function() {
    //Find clicked country
    let dt = d3.select(".selected").data();

    //Exit function if no country is selected
    if (dt.length == 0) {
      return;
    }

    //Get country name
    let countryName = dt[0][0][2];

    let selectedData = data.filter (function (d) {
      return d.origin === countryName;
    });

    //Total emigration due to brain drain
    let totalEmigration = d3.sum (selectedData, function (d) {
      return d.emigration;
    });

    //Remove clutter
    dot.attr("display", "none");
    svg.selectAll(".hover-annotation").remove();

    //Get the detail card
    let detailcard = d3.select("#detailCard");

    detailcard.classed("d-none", false)
    .select(".clickedCountryName")
    .text(countryName);

    //Assign properties
    detailcard.select(".clickedRegionName")
        .text("South Eastern Asia");

    detailcard.select(".overallEmigrationBrainDrain")
      .text(totalEmigration.toLocaleString(locale));

    //Zooming logic starts here

    function customRescaleY(y) {
      //Find max value
      let max = d3.max(selectedData, (d) => d.emigration);

      let ceiling = max + (max * 0.1);

      domain = [0, ceiling];

      return y.copy().domain(domain);
    }

    let yZoomScale = customRescaleY(yS);

    //Redraw y-axis
    gYAxis.call(yAxis.scale(yZoomScale));

    //Replot points and groups
    points = data.map((d) => [xS(d.year), yZoomScale(d.emigration), d.origin]);
    groups = d3.rollup(
      points,
      (v) => Object.assign(v, { z: v[0][2] }),
      (d) => d[2]
    );

    //Replot lines
    path.data(groups.values())
    .join("path")

    //Animation on zoom
    .transition()
    .attr("d", line)
    .ease(d3.easeBack)
    .duration(500);
  };

  let pointerentered = () => pointerEntered(path, dot);

  let pointermoved = (event) =>
    pointerMoved(event, data, points, path, dot, svg, colorScale);

  let pointerleft = () => pointerLeft(path, dot, svg);



  svg
    .on("pointerenter", pointerentered)
    .on("pointermove", pointermoved)
    .on("pointerleave", pointerleft)
    .on("click", clicked)
    .on("touchstart", (event) => event.preventDefault());

  //Close Detail Card
  d3.select("#detailCard").select(".btn-close")
  .on("click", function(event, d) {
      //Hide country card
      d3.select("#detailCard")
          .classed("d-none", true);


      //Resets zoom
      let yResetScale = yScale(data);

      //Redraw y-axis
      gYAxis.call(yAxis.scale(yResetScale));
  
      //Replot points and groups
      points = data.map((d) => [xS(d.year), yResetScale(d.emigration), d.origin]);
      groups = d3.rollup(
        points,
        (v) => Object.assign(v, { z: v[0][2] }),
        (d) => d[2]
      );
  
      //Replot lines
      path.data(groups.values())
      .join("path")
  
      //Animation on zoom
      .transition()
      .attr("d", line)
      .ease(d3.easeBack)
      .duration(500);

  });

}

// When the pointer moves, find the closest point, update the interactive tip, and highlight corresponding lines.
function pointerMoved(event, data, points, path, dot, svg, colourScale) {

  //Remove previous hover annotations
  svg.selectAll(".hover-annotation").remove();

  const [xm, ym] = d3.pointer(event);
  const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
  const [x, y, k] = points[i];

  path
    .style("stroke", ({ z }) => (z === k ? null : "#ddd"))
    .classed("selected", ({z}) => (z === k ? true : false))
    .filter(({ z }) => z === k)
    .raise();
  
  //Find data
  let selectedData = data.filter (function (d) {
    return d.origin === k;
  });

  let xPoints = points.map((d) => d[0]);

  let dxPoints = Array.from(new Set(xPoints));

  let dataIndex = dxPoints.indexOf(x);

  //Create annotations
  createHoverAnnotations(x, y, selectedData[dataIndex], colourScale);

  dot.attr("transform", `translate(${x},${y})`);
  dot.select("text").text(k);
  // console.log(k);
  svg.property("value", data[i]).dispatch("input", { bubbles: true });
}

function pointerEntered(path, dot) {

  path.style("mix-blend-mode", null)
  .style("stroke", "#ddd")
  .classed("selected", false);

  dot.attr("display", null);
}

function pointerLeft(path, dot, svg) {

  path.style("mix-blend-mode", "multiply")
  .style("stroke", null)
  .classed("selected", false);

  dot.attr("display", "none");
  svg.node().value = null;
  svg.dispatch("input", { bubbles: true })
    //Remove previous hover annotations
    .selectAll(".hover-annotation").remove();
}

//When mouse over countrys
function createHoverAnnotations(x, y, data, colourScale) {

  //Define annotation type
  const annotype = d3.annotationLabel;

  //Create annotation
  let annotation = [{
      note: {
          title: data.origin + " (" + data.year + ")",
          label: data.emigration.toLocaleString(locale),
          bgPadding: 20,
      },
      //To show bg, bg accessible in HTML
      className: "show-bg",
      //Set X and Y
      x: x,
      y: y,
      dx: 0,
      dy: 15,
      color: colourScale(data.origin)
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


window.onload = init; //On initialise

window.onresize = resize; //Executes the resize function when the window is resized
