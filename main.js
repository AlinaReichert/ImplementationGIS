window.onload = init;
//McCutchan, Marvin: Implementation GIS. UE 4. 
function init(){
    //first define UTM 33N (for Vienna) --> depends on input data!
    proj4.defs("EPSG:32633","+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs");
    //now register it
    ol.proj.proj4.register(proj4);
    var utm33n = ol.proj.get('EPSG:32633')
    
    //define layers
    var osmlayer = new ol.layer.Tile({
        source: new ol.source.OSM(),
        visible: true,
        title: "OSMStandard"
    });

    var osmlayerHumanitarian = new ol.layer.Tile({
        source: new ol.source.OSM({
            url:'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
        }),
        visible: false,
        title: "OSMHumanitarian"
    });

    var stamenTerrain = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url:'http://tile.stamen.com/terrain/{z}/{x}/{y}.jpg',
            attributions: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>'
        }),
        visible: false,
        title: "StamenTerrain"
    });
    
    /*var adress_layer =  new ol.layer.Tile({ 
        id: 'adress', 
        visible: false,		
        source: new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/PRIVATE_01426009/wms',
        projection: utm33n,
        params: {'LAYERS': 'PRIVATE_01426009:adressen', 'TILED': true},
        serverType: 'geoserver',
        // Countries have transparency, so do not fade tiles:
        transition: 0
        })       
    })*/
    
    var streets_layer =  new ol.layer.Tile({
        id: 'streets',
        visible: false,	
        source: new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/PRIVATE_01426009/wms',
        projection: utm33n,
        params: {'LAYERS': 'PRIVATE_01426009:strassen', 'TILED': true},
        serverType: 'geoserver',
        // Countries have transparency, so do not fade tiles:
        transition: 0
        })
    })

    var shortestpath =  new ol.layer.Tile({
        id: 'path',
        visible: true,	
        source: new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/PRIVATE_01426009/wms',
        projection: utm33n,
        params: {'LAYERS': 'PRIVATE_01426009:utm_sp_view2', 'TILED': true, viewparams:"start_lon:16.3973609;start_lat:48.2549891"},
        serverType: 'geoserver',
        // Countries have transparency, so do not fade tiles:
        transition: 0
        })
    })
    
    //Vector layers
    var layers = [
    //osmlayer,
    //osmlayerHumanitarian,
    //stamenTerrain,
    streets_layer,
    //adress_layer,
    shortestpath
    ];

    //https://openlayers.org/en/latest/examples/drag-and-drop.html
    var dragAndDropInteraction = new ol.interaction.DragAndDrop({
        formatConstructors: [
            ol.format.GPX,
            ol.format.GeoJSON,
            ol.format.IGC,
            ol.format.KML,
            ol.format.TopoJSON
        ]
    });

    var map = new ol.Map({
        interactions: ol.interaction.defaults().extend([dragAndDropInteraction]),
        layers: layers,
        target: 'js-map',
        projection: utm33n,
        view: new ol.View({
            center: [1821158.989,6140027.952],
            zoom: 12
        })
    });
    map.on('click', function(e){
        console.log(e.coordinate)
    })

    //Layer Group
    //Openlayers 6 tutorials
    const baseLayerGroup = new ol.layer.Group({
        layers:[
            osmlayer, osmlayerHumanitarian, stamenTerrain
        ]
    })
    map.addLayer(baseLayerGroup);

    //Layer Switcher Logic for Basemaps
    //Openlayers 6 tutorials: https://www.youtube.com/watch?v=k4b3nqDHCIU&list=PLSWT7gmk_6LrvfkAFzfBpNckEsaF7S2GB&index=6
    const baseLayerElements = document.querySelectorAll('.sidebar > input[type=radio]') 
    for(let baseLayerElement of baseLayerElements){
        baseLayerElement.addEventListener('change', function(){
            let baseLayerElementValue = this.value;
            baseLayerGroup.getLayers().forEach(function(element, index, array){
                let baseLayerTitle = element.get('title');
                element.setVisible(baseLayerTitle === baseLayerElementValue);
            })
        })
    }

    //Compute shortest path
    //Marvin McCutchan
    document.getElementById('computespbtn').addEventListener('click', computesp, false);
    function computesp() {

      var startid = document.getElementById("fromnode").value;
		  var endid = document.getElementById("endnode").value;

      if(map.getLayers().getArray().length > 1)
        {
        map.removeLayer(shortestpath);
              }
          
      // new shortestpath
      shortestpath =  new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: 'http://localhost:8080/geoserver/PRIVATE_01426009/wms',
          projection: utm33n,
          params: {'LAYERS': 'PRIVATE_01426009:utm_sp_view2', 
          'TILED': true, viewparams:"start_lon:"+startid+";start_lat:"+endid},
          serverType: 'geoserver',
      
          transition: 0
          })
        })
      console.log(shortestpath)
      map.addLayer(shortestpath).changed(); //UNDEFINED? ABER ES FUNCT...	
      
    }

    //open local drive
    /*document.getElementById('drivebtn').addEventListener('click', openDrive, false);
    function openDrive() {

    }*/

    //https://openlayers.org/en/latest/examples/drag-and-drop.html
    //https://tsauerwein.github.io/ol3/animation-flights/examples/drag-and-drop.html
    //only works with data in EPSG:4326 and EPSG:3857 !!
    dragAndDropInteraction.on('addfeatures', function(event) {
        var vectorSource = new ol.source.Vector({
          features: event.features
        });
        map.addLayer(new ol.layer.Vector({
          source: vectorSource
        }));
        map.getView().fit(vectorSource.getExtent());
      });
      
      var displayFeatureInfo = function(pixel) {
        var features = [];
        map.forEachFeatureAtPixel(pixel, function(feature) {
          features.push(feature);
        });
        if (features.length > 0) {
          var info = [];
          var i, ii;
          for (i = 0, ii = features.length; i < ii; ++i) {
            info.push(features[i].get('name'));
          }
          document.getElementById('info').innerHTML = info.join(', ') || '&nbsp'; //WAS TUT &nbsp ????
        } else {
          document.getElementById('info').innerHTML = '&nbsp;';
        }
      };
      
      map.on('pointermove', function(evt) {
        if (evt.dragging) {
          return;
        }
        var pixel = map.getEventPixel(evt.originalEvent);
        displayFeatureInfo(pixel);
      });
      
      map.on('click', function(evt) {
        displayFeatureInfo(evt.pixel);
      });
		
    //Marker showing the position the user clicked
    //Marvin McCutchan
    var marker = new ol.Overlay({
        element: document.getElementById('js-marker'),
    });
    map.addOverlay(marker);
    map.on('click', function(evt) {

        var element = marker.getElement();
        var coordinate = evt.coordinate;
        //convert to Longitude, Latitude
        var lola = ol.proj.toLonLat(coordinate);
        console.log(lola);
    }); 
    
    //https://github.com/jonataswalker/ol-geocoder/blob/master/examples/control-nominatim.js
    //Marvin McCutchan: UE2
    /*var popup = new ol.Overlay({
      element: document.getElementById('js-popup')
    });'*/

    var marker = new ol.Overlay({
      element: document.getElementById('js-marker')
    });

    var geocoder = new Geocoder('nominatim', {
      provider: 'osm',
      autoComplete: true,
      autoCompleteMinLength: 1,
      targetType: 'text-input',
      lang: 'en-US',
      placeholder: 'Search for ...',
      limit: 5,
      countrycodes : 'at', //search results are limited to Austria to reduce computational effort
      keepOpen: true,
      debug: true
    });
    map.addControl(geocoder);
    map.addOverlay(marker);

    //Openlayers: https://openlayers.org/en/latest/examples/icon.html
    //Listen when an address is chosen
    geocoder.on('addresschosen', function(evt) {
      var element = marker.getElement();
      //var coordinate = evt.coordinate;
      
      window.setTimeout(function() {
        $(element).popover('destroy');
        marker.setPosition(evt.coordinate);
        $(element).popover({
          placement: 'top',
          animation: false,
          //html: true,
          //content: '<code>' + evt.address.formatted + '</code>' ->löschen????
        })
        $(element).popover('show');
      })
    });

/*mapboxgl.accessToken = 'pk.eyJ1IjoiYWxpbmFyIiwiYSI6ImNqd3ViOTZ1ajB4bGM0MHF2cTBzaGs1YWUifQ.1mn8jUJeijCt5cy-OvR2gw';
// Add geolocate control to the map.
map.addControl(new mapboxgl.GeolocateControl({
  positionOptions: 
    {enableHighAccuracy: true},
  trackUserLocation: true
}));		

// Add routing functionality
map.addControl(new MapboxDirections({accessToken: mapboxgl.accessToken}), 'top-left');
*/
/*     const orsDirection = new ol.layer.VectorImage({
        source: new ol.source.Vector({
            url: '.data/vector_data/ors__v2_directions_{profile}_get_1578070792253.geojson',
            format: new ol.format.GeoJSON()
            //projection: utm33n
        }),
        visible: true,
        title: 'ORSDirection'
    })
    map.addLayer(orsDirection); */

    //
    //Openlayers 6 tutorials: https://www.youtube.com/watch?v=XUCDqzoUh6Y 
 /*    map.on('click', function(e){		
        map.forEachFeatureAtPixel(e.pixel_, function(feature, layer){
        console.log(feature);
        //var fromadress = feature.get('name');
        })
    }) */

    var points = [],
    msg_el = document.getElementById('msg'),
    url_osrm_nearest = '//router.project-osrm.org/nearest/v1/driving/',
    url_osrm_route = '//router.project-osrm.org/route/v1/driving/',
    icon_url = '//cdn.rawgit.com/openlayers/ol3/master/examples/data/icon.png',
    vectorSource = new ol.source.Vector(),
    vectorLayer = new ol.layer.Vector({
      source: vectorSource
    }),
    styles = {
      route: new ol.style.Style({
        stroke: new ol.style.Stroke({
          width: 6, color: [40, 40, 40, 0.8]
        })
      }),
      icon: new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 1],
          src: icon_url
        })
      })
    };

  //console.clear();

  map.on('click', function(evt){
    utils.getNearest(evt.coordinate).then(function(coord_street){
      var last_point = points[points.length - 1];
      var points_length = points.push(coord_street);

      utils.createFeature(coord_street);

      if (points_length < 2) {
        msg_el.innerHTML = 'Click to add another point';
        return;
      }

      //get the route
      var point1 = last_point.join();
      var point2 = coord_street.join();
      
      fetch(url_osrm_route + point1 + ';' + point2).then(function(r) { 
        return r.json();
      }).then(function(json) {
        if(json.code !== 'Ok') {
          msg_el.innerHTML = 'No route found.';
          return;
        }
        msg_el.innerHTML = 'Route added';
        //points.length = 0;
        utils.createRoute(json.routes[0].geometry);
      });
    });
  });

  var utils = {
    getNearest: function(coord){
      var coord4326 = utils.to4326(coord);    
      return new Promise(function(resolve, reject) {
        //make sure the coord is on street
        fetch(url_osrm_nearest + coord4326.join()).then(function(response) { 
          // Convert to JSON
          return response.json();
        }).then(function(json) {
          if (json.code === 'Ok') resolve(json.waypoints[0].location);
          else reject();
        });
      });
    },
    createFeature: function(coord) {
      var feature = new ol.Feature({
        type: 'place',
        geometry: new ol.geom.Point(ol.proj.fromLonLat(coord))
      });
      feature.setStyle(styles.icon);
      vectorSource.addFeature(feature);
    },
    createRoute: function(polyline) {
      // route is ol.geom.LineString
      var route = new ol.format.Polyline({
        factor: 1e5
      }).readGeometry(polyline, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      var feature = new ol.Feature({
        type: 'route',
        geometry: route
      });
      feature.setStyle(styles.route);
      vectorSource.addFeature(feature);
    },
    to4326: function(coord) {
      return ol.proj.transform([
        parseFloat(coord[0]), parseFloat(coord[1])
      ], 'EPSG:3857', 'EPSG:4326');
    }
  };

}
