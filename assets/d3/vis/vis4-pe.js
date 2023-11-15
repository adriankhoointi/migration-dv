// Templates
// https://observablehq.com/@d3/diverging-stacked-bar-chart
// https://observablehq.com/@douglyuckling/diverging-stacked-bar-chart

// TODO: Add transitions
// TODO: Make axis retrieve max data and apply to both sides of scale for every year

// Chart dimensions.
let w = d3.select("#bar-chart").node().getBoundingClientRect().width;
let h = 758;
const marginTop = 30;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 50;
let migrationDS;

async function init() {
  migrationDS = await d3.csv(
    "../assets/d3/data/profile-emigration/clean_ims_stock_profile_by_origin_and_gender_v2.csv",
    function (d) {
      return {
        // Declare variables
        migration_year: +d["Year"],
        origin_name: d["Origin"],
        emigrant_gender: d["Gender"],
        emigration_count: +d["Emigration"],
        emigration_year: +d["Year"],
      };
    }
  );

  let data = migrationDS.filter((d) => d.emigration_year == 2020);
  StackedBarChart(data);

  d3.selectAll(".filter-btn").on("click", function () {
    let id = d3.select(this).attr("id");

    if (id != "" && id != undefined) {
      let input = id;
      console.log(input);

      switch (input) {
        case "filter-2000":
          data = migrationDS.filter((d) => d.emigration_year == 2000);
          break;
        case "filter-2005":
          data = migrationDS.filter((d) => d.emigration_year == 2005);
          break;
        case "filter-2010":
          data = migrationDS.filter((d) => d.emigration_year == 2010);
          break;
        case "filter-2015":
          data = migrationDS.filter((d) => d.emigration_year == 2015);
          break;
        case "filter-2020":
          data = migrationDS.filter((d) => d.emigration_year == 2020);
          break;
        default:
          data = migrationDS.filter((d) => d.emigration_year == 2020);
      }
      d3.select("#bar-chart").html(""); // Clear the existing chart
      // console.table(data,["migration_year","origin_name","emigrant_gender","emigration_count",]);
      return StackedBarChart(data);
    } else {
      console.log("No filter selected");
    }
  });
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/diverging-stacked-bar-chart
function StackedBarChart(
  data,
  {
    x = (d) =>
      d.emigrant_gender === "Male" ? -d.emigration_count : d.emigration_count, // given d in data, returns the (quantitative) x-value
    y = (d) => d.origin_name, // given d in data, returns the (ordinal) y-value
    z = (d) => d.emigrant_gender, // given d in data, returns the (categorical) z-value
    title, // given d in data, returns the title text
    xType = d3.scaleLinear, // type of x-scale
    xDomain, // [xmin, xmax]
    xRange = [marginLeft, w - marginRight], // [left, right]
    yDomain = d3.groupSort(
      data,
      (D) => d3.sum(D, (d) => -Math.min(0, d.emigration_count)),
      (d) => d.origin_name
    ), // array of y-values
    yRange, // [bottom, top]
    yPadding = 0.1, // amount of y-range to reserve to separate bars
    zDomain = data.emigrant_gender, // array of z-values
    offset = d3.stackOffsetDiverging, // stack offset method
    order = (series) => {
      // stack order method; try also d3.stackOffsetNone
      return [
        // by default, stack negative series in reverse order
        ...series
          .map((S, i) => (S.some(([, y]) => y < 0) ? i : null))
          .reverse(),
        ...series.map((S, i) => (S.some(([, y]) => y < 0) ? null : i)),
      ].filter((i) => i !== null);
    },
    xFormat, // a format specifier string for the x-axis
    xLabel = "← MALE · " + data[0].emigration_year + " · FEMALE →", // a label for the x-axis
    colors = d3.schemePaired, // array of colors
  } = {}
) {
  // Compute values.
  const X = d3.map(data, x);
  const Y = d3.map(data, y);
  const Z = d3.map(data, z);

  // Compute default y- and z-domains, and unique them.
  if (yDomain === undefined) yDomain = Y;
  if (zDomain === undefined) zDomain = Z;
  yDomain = new d3.InternSet(yDomain);
  zDomain = new d3.InternSet(zDomain);

  // Omit any data not present in the y- and z-domains.
  const I = d3
    .range(X.length)
    .filter((i) => yDomain.has(Y[i]) && zDomain.has(Z[i]));

  // If the height is not specified, derive it from the y-domain.
  if (h === undefined) h = yDomain.size * 25 + marginTop + marginBottom;
  if (yRange === undefined) yRange = [h - marginBottom, marginTop];

  // Compute a nested array of series where each series is [[x1, x2], [x1, x2],
  // [x1, x2], …] representing the x-extent of each stacked rect. In addition,
  // each tuple has an i (index) property so that we can refer back to the
  // original data point (data[i]). This code assumes that there is only one
  // data point for a given unique y- and z-value.
  const series = d3
    .stack()
    .keys(zDomain)
    .value(([, I], z) => X[I.get(z)])
    .order(order)
    .offset(offset)(
      d3.rollup(
        I,
        ([i]) => i,
        (i) => Y[i],
        (i) => Z[i]
      )
    )
    .map((s) => s.map((d) => Object.assign(d, { i: d.data[1].get(s.key) })));

  // Compute the default y-domain. Note: diverging stacks can be negative.
  if (xDomain === undefined) xDomain = d3.extent(series.flat(2));

  // Construct scales, axes, and formats.
  let maxAbsoluteValue = d3.max(data, d => Math.abs(d.emigration_count)); // Find the maximum absolute value in the data
  const xScale = xType([-maxAbsoluteValue, maxAbsoluteValue], xRange); // Produce symmetric horizontal axis
  // const xScale = xType(xDomain, xRange); // Produce asymmetric horizontal axis to construct scales, axes, and formats
  const yScale = d3.scaleBand(yDomain, yRange).paddingInner(yPadding);
  const color = d3.scaleOrdinal(zDomain, colors);
  const xAxis = d3.axisTop(xScale).ticks(w / 80, xFormat);
  const yAxis = d3.axisLeft(yScale).tickSize(0);

  // Compute titles.
  if (title === undefined) {
    // Format the x-axis values
    const formatValue = xScale.tickFormat(100, xFormat);
    // Define the title as a function that returns a string with Y, Z, and X values
    title = (i) => `${Y[i]}\n${Z[i]}\n${formatValue(Math.abs(X[i]))}`;
  } else {
    // Create a map from the data
    const O = d3.map(data, (d) => d);
    const T = title;
    // Define the title as a function that returns the result of calling T with the mapped data
    title = (i) => T(O[i], i, data);
  }
  
  // Create an SVG container with the specified width and height
  const svg = d3
    .select("#bar-chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", [0, 0, w, h])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  // Add the x-axis to the SVG container
  svg
    .append("g")
    .attr("transform", `translate(0,${marginTop})`)
    .call(xAxis)
    .call((g) => g.select(".domain").remove()) // Remove the domain line
    .call((g) =>
      g
        .selectAll(".tick line") // Select all tick lines
        .clone()
        .attr("y2", h - marginTop - marginBottom) // Set their y2 attribute
        .attr("stroke-opacity", 0.1) // Set their stroke opacity
    )
    .call((g) =>
      g
        .append("text") // Append a text element
        .attr("x", xScale(0)) // Position it at xScale(0)
        .attr("y", -22) // Position it 22 units above the x-axis
        .attr("fill", "currentColor") // Set its fill color
        .attr("text-anchor", "middle") // Center the text
        .text(xLabel) // Set its text content to xLabel
    );

  // Add the bars to the SVG container
  var bar = svg
    .append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("fill", ([{ i }]) => color(Z[i]))
    .selectAll("rect")
    .data((d) => d)
    .join("rect")
    .attr("x", ([x1, x2]) => Math.min(xScale(x1), xScale(x2)))
    .attr("y", ({ i }) => yScale(Y[i]))
    .attr("width", ([x1, x2]) => Math.abs(xScale(x1) - xScale(x2)))
    .attr("height", yScale.bandwidth());

  if (title){ bar.append("title").text(({ i }) => title(i)) };

  svg
    .append("g")
    .attr("transform", `translate(${xScale(0)},0)`)
    .call(yAxis)
    .call((g) =>
      g
        .selectAll(".tick text")
        .attr("dx", -3)
        .attr("x", (y) => {
          // Find the minimum x-value for the corresponding y-value.
          const x = d3.min(series, (S) => S.find((d) => Y[d.i] === y)?.[0]);
          return xScale(x) - xScale(0);
        })
    );

    
  return Object.assign(svg.node(), { scales: { color } });
}

window.onload = init;
