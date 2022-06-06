

// Parse the Data
 function barChart(data, container_id, color) {

    // set the dimensions and margins of the graph
    const parent = d3.select('.sidenav').node();
    let margin = { top: 20, right: 20, bottom: 20, left: 100 },
        width = parent.getBoundingClientRect().width - margin.left - margin.right - 150,
        height = 300 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let container = d3.select(container_id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    let x = d3.scaleLinear()
        .domain([0, data[0].Value*1.2])
        .range([0, width]);

    container.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => formatNum(d)));

    // Y axis
    let y = d3.scaleBand()
        .range([0, height])
        .domain(data.map(function (d) { return d.Country; }))
        .padding(.1);
    container.append("g")
        .call(d3.axisLeft(y))


    const barTooltip = d3.select("body").append("div")
        .attr("class", "tooltip2")
        .attr("id", "bar-tooltip2")
        .style("opacity", 0);

    //Bars
    container.selectAll("myRect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", x(0))
        .attr("y", function (d) { return y(d.Country); })
        .attr("width", function (d) { return x(d.Value); })
        .attr("height", y.bandwidth())
        .attr("fill", color)
        .attr("opacity", 0.5)
        .on("mouseover", function (d, i) {
            //  on mouse hover
            d3.select(this).attr("opacity", "1");
            barTooltip.transition()
                .duration(100)
                .style("opacity", .9);

            const name = d3.select(this.parentNode).attr('data-label')
            barTooltip.html(d.Country +' : ' + formatNum(d.Value))
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
}