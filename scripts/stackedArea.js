/* Create Stacked Area Chart */

function makeStackedArea(container, data, width, height, field, disasterType, exclude_disaster) {
    const sliderValue = yearSlider.getValue().split(',').map(x => parseInt(x));
    data.Values = data.Values.filter(item => (item.Year >= sliderValue[0]) && (item.Year <= sliderValue[1]))

    const currentData = data.Values.map(item => {
        return { ...{ Year: item.Year }, ...disasterType, ...item[field] };
    })

    const groups = Object.keys(disasterType).filter(item => exclude_disaster ? !exclude_disaster.includes(item) : true);
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
        .attr("class", "tooltip2")
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

            if (!toolTipData) return;

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