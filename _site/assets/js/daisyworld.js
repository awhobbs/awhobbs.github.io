var data = [];

//parameters for daisyworld model
var albedo_un = 0.5;
var albedo_black = 0.25;
var albedo_white = 0.8;
var heat_absorp_fact = 20;
var sb_constant = 5.669e-8; // Stefan-Boltzman Constant (idk wtf that is)
var solar_flux_constant = 917;
var solar_luminosity = 0.8;
var death_rate = 0.3;
var survival_rate = 0.7;
var max_daisies = 300;

// initialize no daisies of either type
var frac_white = 0;
var frac_black = 0;

// a counter to keep track of round numbers
var counter = 0;

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

function update(data) {
  var t = d3.transition()
        .duration(1500);

  var circles = g.selectAll("circle")
    .data(data, function(d) {return d;});

  // ENTER
  // Grow new daisies
  circles.enter().append("circle")
      .attr("class", "enter")
      .attr("fill", function(d){ return d;})
      .attr("transform", function() {
        var u = Math.random() + Math.random();
        var r;
        if(u>1){r = 2 - u;}
        else{r = u;}
        return "rotate(" + Math.random()*360 + ")" + "translate(" + (r * height / 2) + ",0)";
      })
      .attr("r", 0)
    .transition(t)
      .delay(function(d){return Math.random() * 2000;})
      .attr("r", 6);

  // EXIT
  // Remove dead daisies
  circles.exit()
    .transition(t)
      .delay(function(d){return Math.random() * 2000;})
      .attr("r", 1e-6)
    .remove();
}

d3.interval(function() {
 solar_luminosity += 1/400;
 console.log("Share Light: " + frac_white);
 console.log("Share Dark: " + frac_black);
 growth = daisy_change(frac_white, frac_black)

 new_white = max_daisies * frac_white * growth.white + 0.001;
 new_black = max_daisies * frac_black * growth.black + 0.001;

  //new daisies grow
  new_daisies = d3.range(Math.round(new_white + new_black)).map(function() {
			return Math.random() > new_white/(new_white + new_black) ? "green" : "blue";
		})
  frac_white = frac_white * (1 + growth.white - (1-survival_rate)) + 0.001;
  frac_black = frac_black * (1 + growth.black - (1-survival_rate)) + 0.001;

  //old daisies die
  data = data.slice(0, Math.round(survival_rate * data.length));

  //update the vector of daisies
  data = data.concat(new_daisies);
  console.log("Population: " + data.length)
  update(data);
}, 1000);

function daisy_change(frac_white, frac_black){
  counter +=1;
  // calculate the fraction of the planet empty
  frac_un = Math.max(1 - frac_white - frac_black, 0);

  // calculate albedo and planetary temp
  var albedo_planet = frac_un * albedo_un + frac_black * albedo_black + frac_white * albedo_white;
  var avg_planet_temp = ((solar_luminosity * solar_flux_constant * (1 - albedo_planet) / sb_constant) ** 0.25) - 273;

  // this function calculates the growth for a given daisy color
  function grow(frac, albedo_this){
    var local_temp = heat_absorp_fact * (albedo_planet - albedo_this)**2 + avg_planet_temp;
    console.log(local_temp)
    var growth_factor = 1 - 0.003265 * (22.5 - local_temp)**2;
    var percent_growth = frac_un * growth_factor;

    return percent_growth;
  }

  //calculate growth by color
  white_growth = grow(frac_white, albedo_white);
  black_growth = grow(frac_black, albedo_black);

  console.log("ROUND " + counter);
  console.log("Planet Temp: " + avg_planet_temp);
  return growth = {"white": white_growth,
                   "black": black_growth};
}
