
var quickApp = angular.module('quickApp', ['ngRoute']);

quickApp.directive('xnetForceDirectedX', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: './pages/xnet-force-directed-x.tpl.html',
            link: function ($scope, $element, $attrs) {
                $timeout(function () {
                    var getForceRadius = d3.scale.sqrt().range([0, 6]);
                    var nodeSelected;
                    var edgeSelected;
                    var highLightId = 'selectionGlove';
                    var highLightWidth = 7;
                    var highLightColor = "#0000A0";
                    var svg;
                    var force;
                    var eWidth = $element.width();
                    var eHeight = $element.height();
                    var charge = -2200;

                    // THIS IS STUPIDLY DONE

                    var setHighlightFilter = function (svg) {
                        var color = d3.rgb(highLightColor);
                        var colorMatrix = "0 0 0 " + color.r / 256 + " 0 0 0 0 0 " + color.g / 256 + " 0 0 0 0 " + color.b / 256 + " 0 0 0 1 0";
                        var defs = svg.append("defs");
                        var filter = defs.append("filter")
                                .attr("id", highLightId)
                                .attr("x", "-20%")
                                .attr("y", "-20%")
                                .attr("width", "140%")
                                .attr("height", "140%");
                        filter.append("feColorMatrix")
                                .attr("type", "matrix")
                                .attr("values", colorMatrix);
                        filter.append("feGaussianBlur")
                                .attr("stdDeviation", highLightWidth)
                                .attr("result", "coloredBlur");
                        var feMerge = filter.append("feMerge");
                        feMerge.append("feMergeNode")
                                .attr("in", "coloredBlur");
                        feMerge.append("feMergeNode")
                                .attr("in", "SourceGraphic");
                    };


                    var nodeClicked = function (dataPoint) {
                        // never select the root node
                        if (dataPoint.id === 0) {
                            return;
                        }
                        // remove the previous selection filter if there is one
                        if (nodeSelected) {
                            nodeSelected.style("filter", "");
                        }
                        // add the selection filter to the circle 
                        // and keep a copy of the selected node
                        nodeSelected = d3.select(this)
                                .select("circle")
                                .style("filter", "url(#" + highLightId + ")");
                    };

                    var edgeClicked = function () {
                        // remove the previous selection filter if there is one
                        if (edgeSelected) {
                            edgeSelected.style("filter", "");
                        }
                        // add the selection filter to the line 
                        // and keep a copy of the selected edge
                        edgeSelected = d3.select(this)
                                .select("line")
                                .style("filter", "url(#" + highLightId + ")");
                    };

                    var newDataSimulation = function (jsonData, dataItem) {
                        // empty pervious
                        $('#dataDisplay').empty();
                        // add a new svg element
                        svg = d3.select("#dataDisplay").append("svg")
                                .attr("width", eWidth)
                                .attr("height", eHeight);
                        // add the highlight filter element
                        setHighlightFilter(svg);
                        // begin the display process
                        graphTheData(jsonData[dataItem]);
                    };

                    var graphInitialize = function () {
                        $.getJSON("./pages/data.json", function (json) {
                            newDataSimulation(json, 'bacc-rdu-mac');
                        });
                    };

                    var graphTheData = function (graph) {
                        var nodesList, linksList;
                        nodesList = graph.nodes;
                        linksList = graph.links;

                        force = d3.layout.force()
                                .nodes(nodesList)
                                .links(linksList)
                                .size([eWidth, eHeight])
                                .charge(charge)
                                .chargeDistance(300)
                                .friction(0.95)
                                .linkStrength(function (d) {
                                    return 1;//d.edgeType/3;
                                })
                                .linkDistance(function (d) {
                                    return getForceRadius(d.source.size) + getForceRadius(d.target.size) + 120;
                                })
                                .on("tick", tick);


                        var links = force.links(),
                                nodes = force.nodes(),
                                link = svg.selectAll(".link"),
                                node = svg.selectAll(".node");

                        var n = nodes.length;
                        nodes.forEach(function (d, i) {
                            var angle = i * (Math.PI * 2) / n;
                            d.y = Math.sin(angle) + eHeight / 2;
                            d.x = Math.cos(angle) + eWidth / 2;
                            if(i === 0) {
                                d.fixed = true;
                            }
                            //d.x = eWidth / 2;
                            //d.y = eHeight / 2;
                            //d.x = d.y = eWidth / n * i;
                        });

                        buildData();

                        function buildData() {
                            var color = d3.scale.category20();
                            // update link data
                            link = link.data(links, function (d) {
                                return d.id;
                            });

                            // Create new links
                            link.enter().insert("g", ".node")
                                    .attr("class", "link")
                                    .each(function (d) {
                                        // Add bond line
                                        d3.select(this)
                                                .append("line")
                                                .style("stroke-width", function (d) {
                                                    return (d.edgeType * 3 - 2) * 2 + "px";
                                                });

                                        // If double add second line
                                        d3.select(this)
                                                .filter(function (d) {
                                                    return d.edgeType >= 2;
                                                }).append("line")
                                                .style("stroke-width", function (d) {
                                                    return (d.edgeType * 2 - 2) * 2 + "px";
                                                })
                                                .attr("class", "double");

                                        d3.select(this)
                                                .filter(function (d) {
                                                    return d.edgeType === 3;
                                                }).append("line")
                                                .attr("class", "triple");

                                        // Give bond the power to be selected
                                        d3.select(this).on("click", edgeClicked);
                                    });

                            // Update node data
                            node = node.data(nodes, function (d) {
                                return d.id;
                            });

                            // Create new nodes
                            node.enter().append("g")
                                    .attr("class", "node")
                                    .each(function (d) {
                                        // Add node circle
                                        d3.select(this)
                                                .append("circle")
                                                .attr("r", function (d) {
                                                    return getForceRadius(d.size);
                                                })
                                                .style("fill", function (d) {
                                                    return color(d.symbol);
                                                });

                                        var wh = Math.sqrt(2) * d.size;
                                        var diag = wh / 2;

                                        // Add node symbol
                                        d3.select(this)
                                                .append("foreignObject")
                                                .attr("text-anchor", "middle")
                                                .attr({
                                                    height: wh,
                                                    width: wh,
                                                    transform: 'translate(-' + diag + ',-' + diag + ')'
                                                })
                                                .html(function (d) {
                                                    return "<div class='node-item' style='width: " + wh + "px; height: " + wh + "px;'><span class='node-text'>" + d.symbol + "</span></div>";
                                                });

                                        // Give node the power to be selected
                                        d3.select(this).on("click", nodeClicked);

                                        // Grant node the power of gravity	
                                        d3.select(this).call(force.drag);
                                    });

                            force.start();
                        }

                        function tick() {
                            //Update old and new elements
                            link.selectAll("line")
                                    .attr("x1", function (d) {
                                        return d.source.x;
                                    })
                                    .attr("y1", function (d) {
                                        return d.source.y;
                                    })
                                    .attr("x2", function (d) {
                                        return d.target.x;
                                    })
                                    .attr("y2", function (d) {
                                        return d.target.y;
                                    });

                            node.attr("transform", function (d) {
                                    return "translate(" + d.x + "," + d.y + ")";
                            });
                        }
                    };
                    graphInitialize();


                    $scope.$on('eventWatcher::resize',
                            function (broadcastEvent, args) {
                                $timeout(function () {
                                    graphInitialize();
                                }, 0);
                            });
                }, 500);
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