// ***** GLOBAL VARIABLE ***** //

var currentTransform = undefined;
var eventsData = undefined;
var disasterDetailData = undefined;
var selectedCountry = undefined;
var selectedCountryISO = undefined;
var excludeDetailDisaster = [];
var excludeGlobalDisaster = [];

// categorical color range 
const ColorRange = {
    "Occurence": ["#f5c593", "#ad7f4e"],
    "Total Deaths": ["#ADA3C7", "#302a40"],
    "Total Affected": ["#ffc5d0", "#c87a8a"],
    "Total Damages Adjusted": ["#ffc589", "#ff992f"],
}

const disasterType = { 'Flood': 0, 'Storm': 0, 'Earthquake': 0, 'Epidemic': 0, 'Landslide': 0, 'Drought': 0, 'Extreme temperature ': 0, 'Volcanic activity': 0, 'Other': 0 }

// categorical color scale for disaster types
const disasterTypeColorScale = d3.scaleOrdinal()
    .domain(Object.keys(disasterType))
    .range(["#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"]);

// abbreviate number formatter functions
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

// number formatter
function numberWithCommas(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// HTML Element Selector
const $ = (d) => document.querySelector(d);
const $$ = (d) => document.querySelectorAll(d);
const addClass = (el, name) => el.classList.add(name);
const remClass = (el, name) => el.classList.remove(name);


// ***** USER INTERFACE ROUTINES ***** //


// change detail dialog tab
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
    step: 10,
    set: [2000, 2021],
    onChange: _ => {
        fillMap();
        if (selectedCountryISO) {
            showDetail(selectedCountryISO, excludeDetailDisaster)
        }
    }
})

// Unselect country in map
const unselectCountry = () => {
    $("#mapTitle").style.display = "block";
    addClass($("#country-detail-modal"), "hidden");
    d3.select(selectedCountry).attr('data-selected', false)
    selectedCountry = undefined;
    selectedCountryISO = undefined;
    canvas.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

// select country in map
const selectCountry = (feature, index, path, projection) => {
    const el = path[index];
    if (selectedCountry === index) {
        unselectCountry();
    } else {
        d3.select(selectedCountry).attr('data-selected', false)
        selectedCountry = path[index];
        var bounds = geoGenerator(projection).bounds(feature);
        dx = bounds[1][0] - bounds[0][0];
        dy = bounds[1][1] - bounds[0][1];
        x = (bounds[0][0] + bounds[1][0]) / 2;
        y = (bounds[0][1] + bounds[1][1]) / 2;
        scale = Math.max(1, Math.min(3, 0.5 / Math.max(dx / canvasWidth, dy / canvasHeight))),
            translate = [canvasWidth / 2 - scale * x, canvasHeight / 2 - scale * y];

        canvas.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(translate[0] - 250, translate[1]).scale(scale));

        remClass($("#country-detail-modal"), "hidden");
        d3.select(el).attr('data-selected', true);
        selectedCountryISO = feature.properties.iso_a3
        showDetail(selectedCountryISO, excludeDetailDisaster)
    }
}

// Filter Disaster Type for Country Dialog
function countryFilterDisaster(event) {
    if (!event.checked) {
        excludeDetailDisaster.push(event.getAttribute("data-label"))
    } else {
        excludeDetailDisaster = excludeDetailDisaster.filter(item => item !== event.getAttribute("data-label"))
    }

    excludeDetailDisaster = [...new Set(excludeDetailDisaster)];
    showDetail(selectedCountryISO, excludeDetailDisaster)
}

// Filter Disaster Type for Global Map
function globalFilterDisaster(event) {
    if (!event.checked) {
        excludeGlobalDisaster.push(event.getAttribute("data-label"))
    } else {
        excludeGlobalDisaster = excludeGlobalDisaster.filter(item => item !== event.getAttribute("data-label"))
    }

    excludeGlobalDisaster = [...new Set(excludeGlobalDisaster)];
    fillMap();
}

// Change Map Color Encoding
function fillMap() {
    // get state for filtering data
    const field = $('input[name="matricSelect"]:checked').getAttribute('data-field');
    $('#AvgOrTotalGroup').style.display = (field == 'Occurence') ? 'none' : 'flex';

    const AvgOrTotal = $('input[name="AvgOrTotal"]:checked').getAttribute('data-field');
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));

    // arrange data
    let maxValue = 0;
    Object.keys(disasterDetailData).forEach(ISO => {
        let country = disasterDetailData[ISO];
        let value = country.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]));

        if (AvgOrTotal == 'average' && field !== 'Occurence') {
            events = value.map(item => item['Occurence'])
            events = events.map(item => Object.keys(item).reduce((p, c) => p + (!excludeGlobalDisaster.includes(c) ? item[c] : 0), 0))
            events = events.reduce((p, c) => p + c, 0);

            value = value.map(item => item[field])
            value = value.map(item => Object.keys(item).reduce((p, c) => p + (!excludeGlobalDisaster.includes(c) ? item[c] : 0), 0))
            value = value.reduce((p, c) => p + c, 0);

            value = Math.floor((value / events))
        } else {
            value = value.map(item => item[field])
            value = value.map(item => Object.keys(item).reduce((p, c) => p + (!excludeGlobalDisaster.includes(c) ? item[c] : 0), 0))
            value = value.reduce((p, c) => p + c, 0);
        }

        if (value > maxValue) maxValue = value;
        disasterDetailData[ISO][field] = value;
    })

    // set color range scaler
    const currColorRange = d3.scaleSqrt().domain([0, maxValue]).range(ColorRange[field])

    // fill map boundaries
    const canvas = d3.select("svg#map");
    canvas.selectAll('path')
        .filter('.country')
        .attr("fill", d => {
            const ISO = d.properties.iso_a3;
            const country = disasterDetailData[ISO];
            if (!country) return currColorRange(0);
            return currColorRange(country[field]);
        })

    // Legend
    const field_name = $('input[name="matricSelect"]:checked').getAttribute('data-title');
    $("#mapTitle").innerHTML = `Global natural disasters mapping by the ${AvgOrTotal} number of <b> ${field_name} ${AvgOrTotal=='average'? 'per occurence': ''} </b> from ${sliderValue[0]} to ${sliderValue[1]}`
    continuousLegend("#legend1", currColorRange, 1)

    // rank bar chart
    let top_countries = Object.keys(disasterDetailData).map(item => { return { "Country": disasterDetailData[item].Country, "Value": disasterDetailData[item][field] } })
    top_countries = top_countries.sort(function (a, b) { return b.Value - a.Value }).slice(0, 10);
    d3.select("#rankChart").selectAll("*").remove()
    $("#barChartTitle").innerHTML = `10 countries with most ${AvgOrTotal} number of <br/> ${field_name} ${AvgOrTotal=='average'? 'per occurence': ''}  from ${sliderValue[0]} to ${sliderValue[1]}`
    barChart(top_countries, "#rankChart", ColorRange[field][1]);
}

// Show Detailed Chart
function showDetail(ISO, exc_disasterType) {
    $("#mapTitle").style.display = "none";
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));

    let data = disasterDetailData[ISO].Values;
    data = data.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]));
    // Stats Card
    function populate(field) {
        const sum1 = data.map(item => Object.keys(item[field]).reduce((i, j) => i + (!exc_disasterType.includes(j) ? item[field][j] : 0), 0), 0);
        return sum1.reduce((i, j) => i + j, 0)
    }

    // populate value for stats card
    const no_events = populate("Occurence")
    const total_damage = populate("Total Damages Adjusted");
    const total_affected = populate("Total Affected");
    const total_deaths = populate("Total Deaths");

    $("#stat-event").innerText = formatNum(no_events);
    $("#stat-deaths").innerText = formatNum(total_deaths);
    $("#stat-affected").innerText = formatNum(total_affected);
    $("#stat-damage").innerText = formatNum(total_damage);

    // Dialog Header
    $("#detail-country-name").innerHTML = `${disasterDetailData[ISO].Country} (${sliderValue[0]} - ${sliderValue[1]})`

    // Detailed Dialog 
    const margin = { top: 10, right: 30, bottom: 30, left: 50 },
        width = 650 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;

    const detailData = disasterDetailData[ISO]

    // Occurence
    d3.select("#viz_occurence").selectAll("*").remove()
    const viz_occurence = d3.select("#viz_occurence")
        .append("svg")
        .attr("color", 'black')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    makeStackedArea(viz_occurence, detailData, width, height, 'Occurence', disasterType, exc_disasterType);

    // Deaths
    d3.select("#viz_death").selectAll("*").remove()
    let viz_death = d3.select("#viz_death")
        .append("svg")
        .attr("color", 'black')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    makeStackedBar(viz_death, detailData, width, height, 'Total Deaths', disasterType, exc_disasterType);

    // People Affected
    d3.select("#viz_affected").selectAll("*").remove()
    const viz_affected = d3.select("#viz_affected")
        .append("svg")
        .attr("color", 'black')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    makeStackedBar(viz_affected, detailData, width, height, 'Total Affected', disasterType, exc_disasterType);

    // Damage Loss
    d3.select("#viz_damage").selectAll("*").remove()
    const viz_damage = d3.select("#viz_damage")
        .append("svg")
        .attr("color", 'black')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    makeStackedBar(viz_damage, detailData, width, height, 'Total Damages Adjusted', disasterType, exc_disasterType);

    // Worst disaster timeline
    let eventData = eventsData[ISO].Events;
    eventData = eventData.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]));
    const field = $('input[name="matricSelect"]:checked').getAttribute('data-field');
    eventData = eventData.sort(function (a, b) { return b[field] - a[field] });
    eventData = eventData.slice(0, 20);
    timelineContainer = $("#event-timeline");
    timelineContainer.innerHTML = "";
    eventData.map(item => {
        let Start_Date = new Date(Date.parse(item.Start_Date)).toDateString();
        let End_Date = new Date(Date.parse(item.End_Date)).toDateString()
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

}

// Document Loaded Event
document.addEventListener('DOMContentLoaded', function () {
    console.log("Welcome to Atlas of Global Catastrophic Events");

    //  load map and disaster data, wait until all complete
    Promise.all([
        d3.json("data/custom.geojson"),
        d3.json("data/summary.json"),
        d3.json("data/events.json")
    ]).then(function (files) {
        // render map and save data 
        renderMap(files[0], selectCountry);
        disasterDetailData = files[1];
        eventsData = files[2];
        fillMap();
        // hide overlay
        $('#overlay').style.display = 'none';
    })

})

window.addEventListener('resize', function () { 
    // reload screen if resized
    window.location.reload(); 
});