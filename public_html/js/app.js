
var quickApp = angular.module('quickApp', ['ngRoute']);

quickApp.directive('xnetForceDirectedX', ['$timeout', '$http', function ($timeout, $http) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: './ng-travel-history-map.tpl.html',
            link: function ($scope, $element, $attrs) {
                var init = function (cities, years) {
                    var eWidth = $element.width();
                    var eHeight = $element.height();

                    var time_lkup = [{"year": "Start", "t": 0}];
                    for (var i = 0; i < years.length; i++) {
                        time_lkup.push({
                            "year": years[i],
                            "t": i + 1
                        });
                    }
                    time_lkup.push({"year": "End", "t": years.length + 1});

                    //speed of animation
                    var speed = 2000;

                    //declare some vars for use later
                    var topo, projection, path, svg, g, throttleTimer;
                    //declare tooltip
                    var tooltip = d3.select("#map").append("div").attr("class", "tooltip hidden");
                    //add in zoom behaviour
                    var zoom = d3.behavior.zoom().scaleExtent([1, 9]).on("zoom", move);

                    //add in resize bahviour
                    var resize = d3.select(window).on("resize", redraw);

                    //create functions:

                    //setup the mapping svg based on width and height of the browser window
                    function setup() {
                        projection = d3.geo.mercator()
                                .center([0, 40]) //long and lat starting position
                                .translate([(eWidth / 2), (eHeight / 2)])
                                .scale(eWidth / 7);

                        path = d3.geo.path().projection(projection);

                        svg = d3.select("#map").append("svg")
                                .attr("width", eWidth)
                                .attr("height", eHeight)
                                .attr("class", "map")
                                .call(zoom)
                                .append("g");

                        g = svg.append("g");
                    }

                    //draw the world map
                    function draw(topo) {
                        svg.append("path").attr("d", path);
                        var country = g.selectAll(".country").data(topo);
                        country.enter().insert("path")
                                .attr("class", "country")
                                .attr("d", path)
                    }

                    //animated addition of cities onto the world map. called by play button
                    $scope.addcities = function () {

                        g.selectAll("circle.points").remove();

                        var locations = g.selectAll("circle")
                                .data(cities).enter().append("circle")
                                .style("fill", "red")
                                .style("opacity", 1);

                        locations.transition().ease("linear")
                                .delay(function (d) {
                                    return speed * d.t;
                                })
                                .attr("cx", function (d) {
                                    return projection([d.lon, d.lat])[0];
                                })
                                .attr("cy", function (d) {
                                    return projection([d.lon, d.lat])[1];
                                })
                                .attr("r", function (d) {
                                    return d.mag;
                                })
                                .transition().duration(500).ease("linear")
                                .style("opacity", 0.6)
                                .attr("class", "points");

                        ;
                        //tooltip
                        locations.on("mousemove", function (d, i) {
                            var mouse = d3.mouse(svg.node()).map(function (d) {
                                return parseInt(d);
                            });
                            tooltip.classed("hidden", false)
                                    .attr("style", "left:" + (mouse[0] + offsetL) + "px;top:" + (mouse[1] + offsetT) + "px")
                                    .html(d.place);
                        })
                                .on("mouseout", function (d, i) {
                                    tooltip.classed("hidden", true);
                                });

                        //offsets for tooltips
                        var offsetL = document.getElementById('map').offsetLeft + 10;
                        var offsetT = document.getElementById('map').offsetTop - 30;


                        var dispaytime = svg.selectAll(".text")
                                .data(time_lkup).enter().append("text")
                                .style("opacity", 1)
                                .style("fill", "#000000")
                                .transition().delay(function (d) {
                            return speed * d.t;
                        })
                                .attr("x", eWidth / 2)
                                .attr("y", eHeight / 2)
                                .attr("class", "display_time")
                                .style("font-size", "50px")
                                .attr("text-anchor", "middle")
                                .text(function (d) {
                                    return d.year;
                                })
                                .transition().duration(speed).style("opacity", 0);

                    }


                    //redraw. this happens when you resize your browser window. it calls throttle which in turn calls redraw. it runs setup and draw again
                    function redraw() {
                        d3.select('svg.map').remove();
                        setup(eWidth, eHeight);
                        draw(topo);
                    }


                    //move this is called when you change the zoom on the map. map is rescaled and city objects are rescaled
                    function move() {
                        var t = d3.event.translate;
                        s = d3.event.scale;
                        zscale = s;
                        var h = eHeight / 4;
                        
                        console.log(s)

                        t[0] = Math.min(
                                (eWidth / eHeight) * (s - 1),
                                Math.max(eWidth * (1 - s), t[0])
                                );

                        t[1] = Math.min(
                                h * (s - 1) + h * s,
                                Math.max(eHeight * (1 - s) - h * s, t[1])
                                );

                        zoom.translate(t);
                        g.attr("transform", "translate(" + t + ")scale(" + s + ")");

                        //adjust the country hover stroke width based on zoom level
                        d3.selectAll(".country").style("stroke-width", 1.5 / s);

                        //adjust the locations size
                        g.selectAll("circle").attr("r", 4 / s);

                    }

                    //run setup and create initial maps

                    setup();
                    d3.json("./js/world-50m.json", function (error, world) {
                        var countries = topojson.feature(world, world.objects.countries).features;
                        topo = countries;
                        draw(topo);
                    });
                };

                $timeout(function () {
                    $http.get('./js/convertcsv.json').then(
                            function (response) {
                                var features = response.data;
                                var cities = [];
                                var years = [];

                                var featureItem = function (feature) {

                                    var getTime = function (time) {
                                        var date = new Date(time)
                                        var year = date.getFullYear();
                                        if ($.inArray(year, years) === -1) {
                                            years.push(year);
                                        }
                                    }

                                    var fObj = {
                                        place: feature.place,
                                        lon: feature.longitude, // 0
                                        lat: feature.latitude, // 1
                                        t: (Math.floor(Math.random() * (14 - 1)) + 1) + (Math.floor(Math.random() * (100 - 1)) + 1) / 100,
                                        t2: getTime(feature.time),
                                        mag: feature.mag
                                    };
                                    return fObj;
                                };

                                for (var i in features) {
                                    cities.push(featureItem(features[i]));
                                    if (i > 1200) {
                                        break;
                                    }
                                }

                                years.sort();

                                init(cities, years);
                            },
                            function (response) {
                                console.error('Server returned an error or scene data file load: ' + response.status);
                                return response.status;
                            });
                }, 250);
            }
        };
    }]);

/*
 * CONTROLLERS
 */
quickApp.controller('mainController', function ($scope) {
    $scope.pageClass = 'page-home';
});

/*
 * ROUTING
 */
quickApp.config(function ($routeProvider) {
    $routeProvider
            // home page
            .when('/', {
                //templateUrl: './pages/page-home.html',
                template: '<div data-xnet-force-directed-x style="width: 100%; height: 100%;"></div>',
                controller: 'mainController'
            })
});