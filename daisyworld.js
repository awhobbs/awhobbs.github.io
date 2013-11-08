 var width = 960,
    height = 500;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var daisies = svg.selectAll("circle")
    .data(d3.range(3600))
  .enter().append("circle")
    .attr("fill", function (){
      if(Math.random()>0.9){return "black";}
      else{return "gray";}
    })
    .attr("r", 1)
    .attr("transform", function(d) {
      var u = Math.random() + Math.random();
      var r;
      if(u>1){r = 2 - u;}
      else{r = u;}
      return "rotate(" + d/10 + ")" + "translate(" + (r * height / 2) + ",0)";
    });

evolve();

function evolve(){    
daisies.transition()
  .attr("fill", function (){
      if(Math.random()>0.9){return "black";}
      else{return "gray";}
    })
    .duration(5000)
    .each("end",evolve);
    }