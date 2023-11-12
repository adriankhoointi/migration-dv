// Specify the chart’s dimensions.
let w = d3.select("#line-chart").node().getBoundingClientRect().width;
let h = 600;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
let migrationDS;

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

async function lineChart(data) {
  var svg = d3
    .select("#line-chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", [0, 0, w, h])
    .attr(
      "style",
      "max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;"
    );
  // .style("background-color", "white");
  // .attr("style", "max-width: 100%, height: auto;");

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
  // TODO: Draw Chart elements

  // Define Scale variables
  let xS = xScale(data);
  let yS = yScale(data);

  // Plot X-axis
  let xAxis = svg.append("g");

  xAxis.attr("transform", `translate(0, ${h - marginBottom})`).call(
    d3
      .axisBottom(xS)
      .ticks(w / 80)
      .tickSizeOuter(0)
  );

  // Plot Y-axis
  let yAxis = svg.append("g");

  yAxis
    .attr("transform", `translate(${marginLeft}, 0)`)
    .call(d3.axisLeft(yS))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "black")
        .attr("text-anchor", "start")
        .text("Number of Emigration")
    );

  let points = data.map((d) => [xS(d.year), yS(d.emigration), d.origin]);

  let groups = d3.rollup(
    points,
    (v) => Object.assign(v, { z: v[0][2] }),
    (d) => d[2]
  );

  // Define color scale
  const colorScale = d3.scaleOrdinal().domain(groups).range(d3.schemePaired);

  // Set line
  let line = d3.line();
  // Define line path
  let path = svg
    .append("g")
    .selectAll("line-path")
    .data(groups.values())
    .join("path")
    .style("mix-blend-mode", "multiply")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", function (d) {
      return colorScale(d);
    })
    .attr("class", "line-path")
    .attr("stroke-width", "2.5")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");

  // Create dots for the seven years (1990-2020, 5 years interval)
  let dot = svg.append("g").attr("display", "none");

  dot
    .append("circle")
    .attr("class", "circles")
    .attr("r", 2.5)
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", -8);

  // Utilize custom mouse behaviours
  let pointerentered = () => pointerEntered(path, dot);
  let pointermoved = (event) =>
    pointerMoved(event, data, points, path, dot, svg);
  let pointerleft = () => pointerLeft(path, dot, svg);

  svg
    .on("pointerenter", pointerentered)
    .on("pointermove", pointermoved)
    .on("pointerleave", pointerleft)
    .on("touchstart", (event) => event.preventDefault());

  console.log(d3.select(".line-path").select("path").node());
}

// DEFINE CUSTOM MOUSE BEHAVIOURS
async function pointerMoved(event, data, points, path, dot, svg) {
  const [xm, ym] = d3.pointer(event);
  const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
  const [x, y, k] = points[i];

  path
    .style("stroke", ({ z }) => (z === k ? null : "#ddd"))
    .filter(({ z }) => z === k)
    .raise();
  dot.attr("transform", `translate(${x},${y})`);
  dot.select("text").text(k);
  svg.property("value", data[i]).dispatch("input", { bubbles: true });
}

async function pointerEntered(path, dot) {
  path.style("mix-blend-mode", null).style("stroke", "#ddd");
  dot.attr("display", null);
}

async function pointerLeft(path, dot, svg) {
  path.style("mix-blend-mode", "multiply").style("stroke", null);
  dot.attr("display", "none");
  svg.node().value = null;
  svg.dispatch("input", { bubbles: true });
}
window.onload = init;
