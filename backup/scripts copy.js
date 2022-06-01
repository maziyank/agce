const canvas = d3.select("svg#map")
const width = canvas.node().clientWidth;
const height = canvas.node().clientHeight;
var CurrentSummaryData = undefined;
var currentTransform = undefined;

const ColorRange = {
    "Total Deaths": {
        factor: 10e2,
        range: d3.scaleLinear().domain([1, 100]).range(["orange", "red"])
    },
    "Total Affected": {
        factor: 10e4,
        range: d3.scaleLinear().domain([1, 100]).range(["pink", "purple"])
    },
    "Total Damages Adjusted": {
        factor: 10e5,
        range: d3.scaleLinear().domain([1, 100]).range(["#ffc589", "#ff992f"])
    },
}

const disasterType = { 'Flood': 0, 'Storm': 0, 'Earthquake': 0, 'Epidemic': 0, 'Landslide': 0, 'Drought': 0, 'Extreme temperature ': 0, 'Volcanic activity': 0, 'Other': 0 }

const disasterTypeColorScale = d3.scaleOrdinal()
    .domain(Object.keys(disasterType))
    .range(["#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"]);

var selectedCountry = undefined;
var selectedCountryISO = undefined;
var excludeDetailDisaster = [];

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

const onMapMouseOver = (_feature, index, path) => {
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "1");

    d3.select("#mapTooltip").transition()
        .duration(100)
        .style("opacity", .9);

    const ISO = _feature.properties.iso_a3
    const field = $("#matricSelect").value;
    d3.select("#mapTooltip").html(_feature.properties.name + "<br/>" +
        field + ': ' + CurrentSummaryData[ISO][field] + "<br/>" + '<i>Click to see detail</i>')
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

const onMapMouseLeave = (_feature, index, path) => {
    const el = path[index];
    d3.select(el)
        .transition()
        .duration(50)
        .style("opacity", "0.8");

    d3.select("#mapTooltip").transition()
        .duration(100)
        .style("opacity", 0);
}

const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .on("zoom", () => {
        currentTransform = d3.event.transform;
        d3.select('g').attr("transform", currentTransform);
    });

const unselectCountry = () => {
    addClass($("#country-detail-modal"), "hidden");
    selectedCountry = undefined;
    selectedCountryISO = undefined;



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
            .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

        remClass($("#country-detail-modal"), "hidden");
        d3.select(el).attr('data-selected', true);
        selectedCountryISO = feature.properties.iso_a3
        showDetail(selectedCountryISO, excludeDetailDisaster)
    }
}

// retrieve data
d3.json('data/custom2.geojson').then(mapData => {
    const projection = d3.geoMercator(); // https://d3-wiki.readthedocs.io/zh_CN/master/Geo-Projections/
    projection.fitExtent([[50, 50], [width, height]], mapData);

    // init events
    canvas.call(zoom);
    canvas.call(drag);

    // draw map
    canvas.append('g').selectAll('path')
        .data(mapData.features)
        .join('path')
        .attr('d', geoGenerator(projection))
        .attr('fill', 'rgb(2,0,36)')
        .attr('stroke', 'black')
        .attr('stroke-width', '0.2px')
        .attr('cursor', 'pointer')
        .attr("class", "country")
        .attr("data-selected", false)
        .attr("opacity", ".8")
        .on("mouseover", onMapMouseOver)
        .on("mouseleave", onMapMouseLeave)
        .on("click", (feature, index, path) => selectCountry(feature, index, path, projection));

    d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("id", "mapTooltip")
        .style("opacity", 0);

    fillMap('Total Deaths');
});

function fillMap() {
    const field = $("#matricSelect").value;

    d3.json('data/summary.json').then(summaryData => {
        canvas.selectAll('path')
            .filter('.country')
            .attr("fill", d => {
                let ISO = d.properties.iso_a3;
                let country = summaryData[ISO];
                if (!country) return ColorRange[field].range(0)

                const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
                let value = country.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]));
                summaryData[ISO].Values = value;

                value = value.reduce((p, c) => p + c[field], 0);
                summaryData[ISO][field] = value;
                colorIndex = Math.min(99, Math.floor(value / ColorRange[field].factor));
                return ColorRange[field].range(colorIndex);
            })

        CurrentSummaryData = summaryData;

    })
}

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

// slider component
const yearSlider = new rSlider({
    target: '#yearSlider',
    values: Array.from(Array(22).keys()).map(x => x + 2000),
    range: true,
    tooltip: true,
    scale: false,
    labels: false,
    set: [2000, 2021],
    onChange: _ => {
        fillMap();
        if (selectedCountryISO) {
            showDetail(selectedCountryISO, excludeDetailDisaster)
        }
    }
})

// Detailed Chart
const parseTime = d3.timeParse("%Y");

function formatNum(value) {
    if ((value / 10e8) >= 1) {
        value = (value / 10e8).toFixed(1) + "B";
    }
    if ((value / 10e5) >= 1) {
        value = (value / 10e5).toFixed(1) + "M";
    }
    if ((value / 10e2) >= 1) {
        value = (value / 10e2).toFixed(1) + "K";
    }
    return value;
}

function makeLinePlot(data, container, width, height, X, Y) {
    var x = d3.scaleTime()
        .domain(d3.extent(data, function (d) {
            return parseTime(d[X])
        }))
        .range([0, width]);

    var y = d3.scaleLinear()
        .domain(d3.extent(data, function (d) {
            return +d[Y];
        }))
        .range([height, 0]);

    container.append("g")
        .attr("transform", "translate(0," + (height) + ")")
        .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));

    container.append("g")
        .attr("transform", "translate(-5,0)")
        .call(d3.axisLeft(y).tickSizeOuter(0).tickFormat(d => formatNum(d)));

    // Add the area
    container.append("path")
        .datum(data)
        .attr("fill", "#69b3a2")
        .attr("fill-opacity", .2)
        .attr("stroke", "none")
        .attr("d", d3.area()
            .x(function (d) { return x(parseTime(d[X])) })
            .y0(height)
            .y1(function (d) { return y(d[Y]) })
        )

    // Add the upper area line
    container.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#69b3a2")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(function (d) { return x(parseTime(d[X])) })
            .y(function (d) { return y(d[Y]) })
        )

    // Define the div for the tooltip
    const lineTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Add the line
    container.selectAll("point")
        .data(data)
        .enter()
        .append("circle")
        .attr('cursor', 'pointer')
        .attr("fill", "green")
        .attr("stroke", "none")
        .attr("cx", function (d) { return x(parseTime(d[X])) })
        .attr("cy", function (d) { return y(d[Y]) })
        .attr("r", 3)
        .on("mouseover", function (d, i) {
            d3.select(this).attr("fill", "blue").attr("r", 5)

            lineTooltip.transition()
                .duration(200)
                .style("opacity", .9);

            lineTooltip.html(X + ': ' + d[X] + "<br/>" + Y + ': ' + d[Y])
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");


        })
        .on("mouseout", function (d, i) {
            d3.select(this).attr("fill", "green").attr("r", 3);

            lineTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
}

const randomName = () => (Math.random() + 1).toString(36).substring(7);



function filterDisaster(event) {
    if (!event.checked) {
        excludeDetailDisaster.push(event.getAttribute("data-label"))
    } else {
        excludeDetailDisaster = excludeDetailDisaster.filter(item => item !== event.getAttribute("data-label"))
    }

    excludeDetailDisaster = [...new Set(excludeDetailDisaster)];
    showDetail(selectedCountryISO, excludeDetailDisaster)
}

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



function makeStackedBar(container, data, width, height, field, exclude_disaster) {
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
    data.Values = data.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]))

    const currentData = data.Values.map(item => {
        return { ...{ 'Year': item.Year }, ...disasterType, ...item[field] };
    })

    groups = Object.keys(disasterType).filter(item => exclude_disaster ? !exclude_disaster.includes(item) : true);
    const stackGen = d3.stack()
        .keys(groups)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const stackedSeries = stackGen(currentData);

    var xScale = d3.scaleLinear()
        .domain(d3.extent(currentData, (d) => d.Year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, Math.max(
            ...currentData.map(item => {
                return Object.values(item).reduce((a, b) => a + b, 0) - item.Year
            })
        )])
        .range([height - 50, 0]);

    const sel = container
        .selectAll('g.series')
        .data(stackedSeries)
        .join('g')
        .classed('series', true)
        .attr('data-label', d => d.key)
        .style('fill', (d) => {
            return disasterTypeColorScale(d.key)
        })
        .attr("opacity", "0.7")

    // Add scales to axis
    container.append("g")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d))

    container.append("g")
        .attr("transform", "translate(-5,0)")
        .call(d3.axisLeft(yScale).tickFormat(d => formatNum(d)));

    // Define the div for the tooltip
    const barTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("id", "bar-tooltip")
        .style("opacity", 0);

    sel.selectAll('rect')
        .data((d) => d)
        .join('rect')
        .attr('width', width / (sliderValue[1] - sliderValue[0]) - 5)
        .attr('y', (d) => yScale(d[1]))
        .attr('x', (d) => xScale(d.data.Year))
        .attr('cursor', 'pointer')
        .attr('opacity', '0.9')
        .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
        .on("mouseover", function (d, i) {
            d3.select(this).attr("opacity", "1");
            barTooltip.transition()
                .duration(100)
                .style("opacity", .9);

            const name = d3.select(this.parentNode).attr('data-label')
            barTooltip.html('Year : ' + d.data.Year + "<br/>Disaster Type: " + name + "<br/> Value : " + formatNum(d[1] - d[0]))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d, i) {
            d3.select(this).attr("opacity", "0.7");

            barTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })

    makeLegend(groups, container, width, 80, -10, height - 20);
}

const bisectDate = d3.bisector(function (d) {
    return d.date;
}).left;


function makeStackedArea(container, data, width, height, field, exclude_disaster) {
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
    data.Values = data.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]))

    const currentData = data.Values.map(item => {
        return { ...{ Year: item.Year }, ...disasterType, ...item[field] };
    })

    groups = Object.keys(disasterType).filter(item => exclude_disaster ? !exclude_disaster.includes(item) : true);
    const stackGen = d3.stack()
        .keys(groups)
        .order(d3.stackOrderAppearance)
        .offset(d3.stackOffsetNone);

    const stackedSeries = stackGen(currentData);

    var xScale = d3.scaleLinear()
        .domain(d3.extent(currentData, (d) => d.Year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, Math.max(
            ...currentData.map(item => {
                return Object.values(item).reduce((a, b) => a + b, 0) - item.Year
            })
        )])
        .range([height - 50, 0]);


    // Add scales to axis
    container.append("g")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d))

    container.append("g")
        .attr("transform", "translate(-5,0)")
        .call(d3.axisLeft(yScale).tickFormat(d => formatNum(d)));

    const tooltipLine = container.append("line")
        .attr("stroke", "grey")
        .attr("stroke-width", 1)
        .attr("y1", 0)
        .attr("y2", height)
        .style("display", "none")

    const areaTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    container
        .selectAll(".areas")
        .data(stackedSeries)
        .join("path")
        .attr("fill-opacity", "0.9")
        .attr("d", d3.area()
            .x((d) => xScale(d.data.Year))
            .y0((d) => yScale(d[0]))
            .y1((d) => yScale(d[1]))
        )
        .attr("fill", (d) => disasterTypeColorScale(d.key))
        .on("mousemove", function (d) {
            let x0 = Math.round(xScale.invert(d3.mouse(this)[0]));
            tooltipLine.
                style("display", "block")
                .attr("x2", xScale(x0))
                .attr("x1", xScale(x0))
                .raise()

            // tooltip
            areaTooltip.transition()
                .duration(100)
                .style("opacity", .9);


            const toolTipData = currentData.find(item => item.Year == x0)
            const tooltipContent = [];
            Object.keys(toolTipData).forEach(function (key) {
                if (key == 'Year' || toolTipData[key] == 0) return;
                tooltipContent.push('<tr>',
                    '<td text-align="left">' + key + '</td>',
                    '<td text-align="right">' + formatNum(toolTipData[key]) + '</td>',
                    '</tr>');
            });


            areaTooltip.html('<b>' + x0 + '</b>' + ' <br/><table>' + tooltipContent.join("") + '</table>')
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

        }).on("mouseout", function (d) {
            tooltipLine.style("display", "none");

            areaTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })

    // legend
    makeLegend(groups, container, width, 80, -10, height - 20);

}

function groupBy(array, f) {
    let groups = {};
    array.forEach(function (o) {
        var group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
    });
    return Object.keys(groups).map(function (group) {
        return groups[group];
    })
}

function showDetail(ISO, exc_disasterType) {
    data = CurrentSummaryData[ISO].Values;

    // calculate aggregate
    const no_events = data.reduce((p, c) => p + c["Occurence"], 0);
    const total_damage = data.reduce((p, c) => p + c["Total Damages Adjusted"], 0);
    const total_affected = data.reduce((p, c) => p + c["Total Affected"], 0);
    const total_deaths = data.reduce((p, c) => p + c["Total Deaths"], 0);

    $("#stat-event").innerText = formatNum(no_events);
    $("#stat-deaths").innerText = formatNum(total_deaths);
    $("#stat-affected").innerText = formatNum(total_affected);
    $("#stat-damage").innerText = formatNum(total_damage);

    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
    $("#detail-country-name").innerHTML = `${CurrentSummaryData[ISO].Country} (${sliderValue[0]} - ${sliderValue[1]})`

    const margin = { top: 10, right: 30, bottom: 30, left: 50 },
        width = 500 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;



    // makeLinePlot(data, viz_occurence, width, height, 'Year', 'Occurence');
    d3.json("data/detail.json").then(function (detailData) {
        detailData = detailData[ISO]
        d3.select("#viz_occurence").selectAll("*").remove()
        const viz_occurence = d3.select("#viz_occurence")
            .append("svg")
            .attr("color", 'black')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        makeStackedArea(viz_occurence, detailData, width, height, 'Occurence', exc_disasterType);

        // Death
        d3.select("#viz_death").selectAll("*").remove()
        let viz_death = d3.select("#viz_death")
            .append("svg")
            .attr("color", 'black')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
        // makeLinePlot(data, viz_death, width, height, 'Year', 'Total Deaths');

        makeStackedBar(viz_death, detailData, width, height, 'Total Deaths', exc_disasterType);

        // Affected
        d3.select("#viz_affected").selectAll("*").remove()
        const viz_affected = d3.select("#viz_affected")
            .append("svg")
            .attr("color", 'black')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
        // makeLinePlot(data, viz_affected, width, height, 'Year', 'Total Affected');
        makeStackedBar(viz_affected, detailData, width, height, 'Total Affected', exc_disasterType);

        // Damage
        d3.select("#viz_damage").selectAll("*").remove()
        const viz_damage = d3.select("#viz_damage")
            .append("svg")
            .attr("color", 'black')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // makeLinePlot(data, viz_damage, width, height, 'Year', 'Total Damages Adjusted');
        makeStackedBar(viz_damage, detailData, width, height, 'Total Damages Adjusted', exc_disasterType);

    })


    d3.json('data/events.json').then(eventsData => {
        eventData = eventsData[ISO].Events;
        eventData = eventData.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]));
        const field = $("#matricSelect").value;
        eventData = eventData.sort(function (a, b) { return b[field] - a[field] });
        eventData = eventData.slice(0, 20);
        timelineContainer = $("#event-timeline");
        timelineContainer.innerHTML = "";
        eventData.map(item => {
            let Start_Date = moment(item.Start_Date).format("D MMM YY");
            let End_Date = moment(item.End_Date).format("D MMM YY");
            item.Start_Date = Start_Date;
            item.End_Date = End_Date;
            return item
        }).forEach(item => {
            template = `<li class="mb-10 ml-4">
            <div class="absolute w-5 h-5 bg-gray-200 rounded-full -left-2.5 border border-white dark:border-gray-900 dark:bg-gray-700"
            style="background-color : ${disasterTypeColorScale(item['Disaster Type'])}">
            </div>
            <time class="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">${item.Start_Date} - ${item.End_Date}</time>
            <a href="https://www.google.com/search?q=${item['Event Name'] + ' ' + item.Start_Date}" target="_blank"><h3 class="text-lg font-semibold dark:text-white event-name">${item['Event Name']}</h3></a>
            <p class="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">Total Deaths: ${item['Total Deaths'] || '-'}, Total Affected: ${item['Total Affected'] || '-'}, Total Damages: ${item['Total Damages Adjusted'] || '-'}</p>
            </li>
              `

            const elem = document.createElement("div");
            elem.innerHTML = template.trim()
            timelineContainer.appendChild(elem.firstChild);
        })
    })
}



document.addEventListener('DOMContentLoaded', function () {
    console.log("Welcome");


})