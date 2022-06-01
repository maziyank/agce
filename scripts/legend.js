/* Contain routines for creating legend */

function makeLegend(data, container, width, height, x, y) {
    const legend = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("x", x)
        .attr("y", y)
        .selectAll('.legends')
        .data(data)
        .enter().append('g')
        .attr("class", "legends")
        .attr("transform", function (d, i) {
            const xOff = (i % 3) * (width / 3).toFixed(0)
            const yOff = Math.floor(i / 3) * 15
            return "translate(" + xOff + "," + yOff + ")"
        })

    legend.append('rect')
        .attr("x", 0)
        .attr("y", 5)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function (d, i) {
            return disasterTypeColorScale(d)
        })

    legend.append('text')
        .attr("x", 15)
        .attr("y", 15)
        .text(function (d, i) {
            return d
        })
        .attr("class", "textselected")
        .style("text-anchor", "start")
        .style("font-size", 13)
}

// create continuous color legend http://bl.ocks.org/syntagmatic/e8ccca52559796be775553b467593a9f
function continuousLegend(selector_id, colorscale, factor) {
    let height = 200,
        width = 80,
        margin = {top: 10, right: 60, bottom: 10, left: 2};
  
    d3.select(selector_id).selectAll("*").remove()

    let canvas = d3.select(selector_id)
      .style("height", height + "px")
      .style("width", width + "px")
      .append("canvas")
      .attr("height", height - margin.top - margin.bottom)
      .attr("width", 1)
      .style("height", (height - margin.top - margin.bottom) + "px")
      .style("width", (width - margin.left - margin.right) + "px")
      .style("position", "absolute")
      .style("top", (margin.top) + "px")
      .style("left", (margin.left) + "px")
      .node();
  
    let ctx = canvas.getContext("2d");
    
    let legendscale = d3.scaleLinear()
      .range([1, height - margin.top - margin.bottom])
      .domain(colorscale.domain());
  
    let image = ctx.createImageData(1, height);
    d3.range(height).forEach(function(i) {
      let c = d3.rgb(colorscale(legendscale.invert(i)));
      image.data[4*i] = c.r;
      image.data[4*i + 1] = c.g;
      image.data[4*i + 2] = c.b;
      image.data[4*i + 3] = 255;
    });
    ctx.putImageData(image, 0, 0);

  
    let legendaxis = d3.axisRight()
      .scale(legendscale)
      .tickSize(2)
      .ticks(4)
      .tickFormat(function(d,i){ 
        return formatNum(d*factor)});
  
    let svg = d3.select(selector_id)
      .append("svg")
      .attr("height", (height) + "px")
      .attr("width", (width) + "px")
      .style("position", "absolute")
      .style("left", "0px")
      .style("top", "0px")
  
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + (width - margin.left - margin.right + 3) + "," + (margin.top) + ")")
      .call(legendaxis);
  };