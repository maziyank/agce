

const canvas = d3.select("svg#map")
const width = canvas.node().clientWidth;
const height = canvas.node().clientHeight;
var selectedCountry = undefined;

// general functions
const geoGenerator = (projection) => d3.geoPath().projection(projection);

const dragstarted = (d) => {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
}

const dragged = (d) =>
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);

const dragended = (d) =>
    d3.select(this).classed("dragging", false);

const drag = d3.drag()
    .subject(d => d)
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

const onMouseOver = (_feature, index, path) => {
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "1");
}

const onMouseLeave = (_feature, index, path) => {
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "0.8");
}

const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", () => {
        const currentTransform = d3.event.transform;
        d3.select('g').attr("transform", currentTransform);
    });

const unselectCountry = () => {
    addClass($("#country-detail-modal"), "hidden");
    selectedCountry = undefined;
    canvas.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

const selectCountry = (feature, index, path, projection) => {
    const el = path[index];

    if (selectedCountry === index) {
        d3.select(path[selectedCountry]).attr('data-selected', false)
        unselectCountry();
    } else {
        d3.select(path[selectedCountry]).attr('data-selected', false)
        selectedCountry = index;
        var bounds = geoGenerator(projection).bounds(feature);
        dx = bounds[1][0] - bounds[0][0];
        dy = bounds[1][1] - bounds[0][1];
        x = (bounds[0][0] + bounds[1][0]) / 2;
        y = (bounds[0][1] + bounds[1][1]) / 2;
        scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
            translate = [width / 2 - scale * x, height / 2 - scale * y];

        canvas.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)); // updated for d3 v4

        remClass($("#country-detail-modal"), "hidden");
        d3.select(el).attr('data-selected', true)
    }
}

// retrieve data
d3.json('data/custom.geojson').then(data => {
    const projection = d3.geoMercator(); // https://d3-wiki.readthedocs.io/zh_CN/master/Geo-Projections/
    projection.fitExtent([[50, 50], [width, height]], data);

    // init events
    console.log(canvas)
    canvas.call(zoom);
    canvas.call(drag);

    // draw map
    canvas.append('g').selectAll('path')
        .data(data.features)
        .join('path')
        .attr('d', geoGenerator(projection))
        .attr('fill', 'rgb(2,0,36)')
        .attr('stroke', 'rgb(24,24,103)')
        .attr('stroke-width', '0.1px')
        .attr('cursor', 'pointer')
        .attr("class", "country")
        .attr("data-selected", false)
        .attr("opacity", ".8")
        .on("mouseover", onMouseOver)
        .on("mouseleave", onMouseLeave)
        .on("click", (feature, index, path) => selectCountry(feature, index, path, projection));
});


// UI
const $ = (d) => document.querySelector(d);
const $$ = (d) => document.querySelectorAll(d);
const addClass = (el, name) => el.classList.add(name);
const remClass = (el, name) => el.classList.remove(name);

const changeTab = (id) => {
    $$('.tab-content').forEach(el => addClass(el, 'hidden'))
    $$('.tab').forEach(el => remClass(el, 'tab-active'))
    remClass($('#tab-content-' + id), 'hidden');
    addClass($('#tab-btn-' + id), 'tab-active');
}

// render template
const template = $('#event-list-template').innerHTML;
const rendered = Mustache.render(template, { date: 'November 2020', title: 'Luke', description: 'Tes description' });
document.getElementById('tab-content-2').innerHTML = rendered;

// slider component
var mySlider = new rSlider({
    target: '#yearSlider',
    values: Array.from(Array(32).keys()).map(x => x + 1990),
    range: true,
    tooltip: true,
    scale: false,
    labels: false,
    set: [2015, 2020]
});