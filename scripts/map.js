/* Contain routines for projecting the map in canvas */


// general variables
const canvas = d3.select("svg#map")
const canvasWidth = canvas.node().clientWidth;
const canvasHeight = canvas.node().clientHeight;
const geoGenerator = (projection) => d3.geoPath().projection(projection);

// zoom map
const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", () => {
        currentTransform = d3.event.transform;
        d3.select('g').attr("transform", currentTransform);
    });

// mouse dragged
const dragstarted = (d) => {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
}

const dragged = (d) => d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);

const dragended = (d) => d3.select(this).classed("dragging", false);

const drag = d3.drag()
    .subject(d => d)
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

// triggered when mouse hover
const onMapMouseOver = (_feature, index, path) => {
    // change country opacity
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "1");

    // show tooltip
    d3.select("#mapTooltip").transition()
        .duration(100)
        .style("opacity", .9);

    // set tooltipcontent
    const ISO = _feature.properties.iso_a3
    const field = $('input[name="matricSelect"]:checked').getAttribute('data-field');
    if (!disasterDetailData[ISO]) return;
    d3.select("#mapTooltip").html('<b>' +
        _feature.properties.name + "</b><br/>" +
        field + ': ' + numberWithCommas(disasterDetailData[ISO][field]) + "<br/>" + '<i>Click to see detail</i>')
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

// triggered when mouse leaver
const onMapMouseLeave = (_feature, index, path) => {
    // set country opacity back
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "0.8");

    // hide tooltip
    d3.select("#mapTooltip").transition()
        .duration(100)
        .style("opacity", 0);
}

// retrieve geojson data for map projection
function renderMap(mapData, onClick) {

    const projection = d3.geoMercator();
    projection.fitExtent([[50, 50], [canvasWidth, canvasHeight]], mapData);

    // init events
    canvas.call(zoom);
    canvas.call(drag);

    // draw map
    canvas.append('g').selectAll('path')
        .data(mapData.features)
        .join('path')
        .attr('d', geoGenerator(projection))
        .attr('fill', 'rgb(2,0,36)')
        .attr('stroke', 'white')
        .attr('stroke-width', '0.3px')
        .attr('cursor', 'pointer')
        .attr("class", "country")
        .attr("data-selected", false)
        .attr("opacity", ".8")
        .on("mouseover", onMapMouseOver)
        .on("mouseout", onMapMouseLeave)
        .on("click", (feature, index, path) => onClick(feature, index, path, projection));

    // add tooltip
    d3.select("body").append("div")
        .attr("class", "tooltip2")
        .attr("id", "mapTooltip")
        .style("opacity", 0);

}

