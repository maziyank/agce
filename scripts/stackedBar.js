/* Create Stacked Bar Chart */

function makeStackedBar(container, data, width, height, field, disasterType, exclude_disaster) {
    // get current year range state
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
    
    // filter data
    data.Values = data.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]))
    const currentData = data.Values.map(item => {
        return { ...{ 'Year': item.Year }, ...disasterType, ...item[field] };
    })

    // prepared stacked data
    const groups = Object.keys(disasterType).filter(item => exclude_disaster ? !exclude_disaster.includes(item) : true);
    const stackGen = d3.stack()
        .keys(groups)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const stackedSeries = stackGen(currentData);

    // axis X and Y scaler
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

    // prepare wrapper for bar chart
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
        .attr("class", "tooltip2")
        .attr("id", "bar-tooltip")
        .style("opacity", 0);

    // create bar 
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
            //  on mouse hover
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
            // on mouse leave
            d3.select(this).attr("opacity", "0.7");
            barTooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })

    // create legend
    makeLegend(groups, container, width, 80, -10, height - 20);
}
