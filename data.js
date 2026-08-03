window.WORLDLINE_DATA = {
  eras: [
    {
      year: -10000,
      label: "Late glacial world",
      summary: "Human communities adapted to warming climates as ice sheets retreated and coastlines approached their later form.",
      camera: { center: [25, 28], zoom: 1.4 },
      features: [
        { name: "Fertile Crescent communities", type: "region", evidence: "reconstruction", confidence: 0.48, geometry: { type: "Polygon", coordinates: [[[30,29],[48,29],[46,38],[34,39],[30,29]]] } },
        { name: "Levantine settlement zone", type: "city", evidence: "attested", confidence: 0.68, geometry: { type: "Point", coordinates: [35.2,31.8] } },
        { name: "Post-glacial dispersal", type: "route", evidence: "speculative", confidence: 0.31, geometry: { type: "LineString", coordinates: [[33,31],[40,36],[48,40],[58,44]] } }
      ]
    },
    {
      year: -3000,
      label: "First urban networks",
      summary: "Dense settlements, writing systems, irrigation, and long-distance exchange emerged in several independent centers.",
      camera: { center: [45, 25], zoom: 1.8 },
      features: [
        { name: "Mesopotamian city-states", type: "region", evidence: "reconstruction", confidence: 0.78, geometry: { type: "Polygon", coordinates: [[[42,29],[49,29],[48,36],[43,36],[42,29]]] } },
        { name: "Uruk", type: "city", evidence: "attested", confidence: 0.95, geometry: { type: "Point", coordinates: [45.64,31.32] } },
        { name: "Persian Gulf exchange", type: "route", evidence: "reconstruction", confidence: 0.62, geometry: { type: "LineString", coordinates: [[45.6,31.3],[49,27],[54,25],[58,23]] } }
      ]
    },
    {
      year: -500,
      label: "Interconnected ancient worlds",
      summary: "Large states and maritime networks linked the Mediterranean, western Asia, South Asia, and eastern Asia.",
      camera: { center: [45, 30], zoom: 1.35 },
      features: [
        { name: "Achaemenid sphere", type: "region", evidence: "reconstruction", confidence: 0.77, geometry: { type: "Polygon", coordinates: [[[25,24],[67,23],[72,37],[55,45],[30,41],[25,24]]] } },
        { name: "Athens", type: "city", evidence: "attested", confidence: 0.98, geometry: { type: "Point", coordinates: [23.73,37.98] } },
        { name: "Royal Road corridor", type: "route", evidence: "reconstruction", confidence: 0.73, geometry: { type: "LineString", coordinates: [[28,39],[34,38],[40,36],[45,33],[49,32]] } }
      ]
    },
    {
      year: 1,
      label: "Continental empires",
      summary: "Imperial systems in Rome, Parthia, Kushan territories, and Han China organized enormous populations and trade corridors.",
      camera: { center: [55, 30], zoom: 1.15 },
      features: [
        { name: "Roman sphere", type: "region", evidence: "reconstruction", confidence: 0.82, geometry: { type: "Polygon", coordinates: [[[-9,31],[35,30],[40,45],[20,54],[-5,48],[-9,31]]] } },
        { name: "Rome", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [12.49,41.9] } },
        { name: "Silk Road corridors", type: "route", evidence: "reconstruction", confidence: 0.61, geometry: { type: "LineString", coordinates: [[30,38],[48,36],[65,40],[82,42],[103,38],[116,35]] } }
      ]
    },
    {
      year: 117,
      label: "Roman high empire",
      summary: "Trade, roads, cities, and imperial administration connected much of Europe, North Africa, and western Asia.",
      camera: { center: [18, 38], zoom: 2.15 },
      features: [
        { name: "Roman imperial extent", type: "region", evidence: "reconstruction", confidence: 0.88, geometry: { type: "Polygon", coordinates: [[[-10,30],[35,22],[43,36],[30,49],[10,56],[-7,51],[-10,30]]] } },
        { name: "Rome", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [12.49,41.9] } },
        { name: "Imperial road network", type: "route", evidence: "reconstruction", confidence: 0.71, geometry: { type: "LineString", coordinates: [[-1,51],[2,48],[12.5,41.9],[23,38],[30,41],[36,37]] } }
      ]
    },
    {
      year: 500,
      label: "Post-imperial transition",
      summary: "Political authority fragmented in western Europe while eastern Rome and other regional powers maintained complex states.",
      camera: { center: [25, 40], zoom: 1.8 },
      features: [
        { name: "Eastern Roman sphere", type: "region", evidence: "reconstruction", confidence: 0.74, geometry: { type: "Polygon", coordinates: [[[18,30],[40,30],[43,43],[27,47],[18,30]]] } },
        { name: "Constantinople", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [28.98,41.01] } },
        { name: "Mediterranean exchange", type: "route", evidence: "reconstruction", confidence: 0.55, geometry: { type: "LineString", coordinates: [[-5,36],[8,39],[18,38],[29,40],[35,35]] } }
      ]
    },
    {
      year: 1000,
      label: "Medieval exchange systems",
      summary: "Trade, pilgrimage, scholarship, and conquest connected societies across Africa, Eurasia, and the Indian Ocean.",
      camera: { center: [48, 27], zoom: 1.25 },
      features: [
        { name: "Fatimid sphere", type: "region", evidence: "reconstruction", confidence: 0.7, geometry: { type: "Polygon", coordinates: [[[-8,22],[42,20],[38,35],[12,37],[-8,31],[-8,22]]] } },
        { name: "Cairo", type: "city", evidence: "attested", confidence: 0.96, geometry: { type: "Point", coordinates: [31.24,30.04] } },
        { name: "Indian Ocean routes", type: "route", evidence: "reconstruction", confidence: 0.67, geometry: { type: "LineString", coordinates: [[32,29],[43,13],[58,20],[72,19],[80,9],[103,2]] } }
      ]
    },
    {
      year: 1500,
      label: "Oceanic convergence",
      summary: "Older regional systems collided with rapidly expanding transoceanic routes, producing profound ecological and political change.",
      camera: { center: [-15, 22], zoom: 1.05 },
      features: [
        { name: "Atlantic contact zone", type: "region", evidence: "reconstruction", confidence: 0.64, geometry: { type: "Polygon", coordinates: [[[-85,5],[-10,5],[-10,50],[-75,50],[-85,5]]] } },
        { name: "Tenochtitlan", type: "city", evidence: "attested", confidence: 0.98, geometry: { type: "Point", coordinates: [-99.13,19.43] } },
        { name: "Atlantic crossings", type: "route", evidence: "attested", confidence: 0.83, geometry: { type: "LineString", coordinates: [[-9,38],[-28,31],[-53,20],[-72,19]] } }
      ]
    },
    {
      year: 1800,
      label: "Industrial and imperial acceleration",
      summary: "Industrial production, colonial systems, and faster transport began reshaping landscapes and political power at planetary scale.",
      camera: { center: [5, 15], zoom: 0.95 },
      features: [
        { name: "British imperial network", type: "region", evidence: "reconstruction", confidence: 0.83, geometry: { type: "Polygon", coordinates: [[[-12,49],[3,49],[3,59],[-12,59],[-12,49]]] } },
        { name: "London", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [-0.13,51.51] } },
        { name: "Global shipping corridors", type: "route", evidence: "attested", confidence: 0.79, geometry: { type: "LineString", coordinates: [[-1,51],[-18,31],[-44,-8],[18,-34],[58,-20],[80,7],[103,1]] } }
      ]
    },
    {
      year: 1945,
      label: "A reorganized world",
      summary: "The end of the Second World War accelerated decolonization, new international institutions, and a bipolar political order.",
      camera: { center: [15, 24], zoom: 0.85 },
      features: [
        { name: "Postwar transition zones", type: "region", evidence: "reconstruction", confidence: 0.86, geometry: { type: "Polygon", coordinates: [[[-15,-35],[50,-35],[50,35],[-15,35],[-15,-35]]] } },
        { name: "San Francisco", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [-122.42,37.77] } },
        { name: "Postwar diplomatic network", type: "route", evidence: "attested", confidence: 0.9, geometry: { type: "LineString", coordinates: [[-122,38],[-74,41],[-1,52],[16,48],[37,56],[140,36]] } }
      ]
    },
    {
      year: 2026,
      label: "The observed present",
      summary: "Satellite imagery, sensors, public records, and digital cartography make the present far more observable than any previous era.",
      camera: { center: [0, 18], zoom: 0.8 },
      features: [
        { name: "Modern observation layer", type: "region", evidence: "attested", confidence: 0.99, geometry: { type: "Polygon", coordinates: [[[-179,-70],[179,-70],[179,75],[-179,75],[-179,-70]]] } },
        { name: "Global urban systems", type: "city", evidence: "attested", confidence: 0.99, geometry: { type: "Point", coordinates: [0,20] } },
        { name: "Global connectivity", type: "route", evidence: "attested", confidence: 0.98, geometry: { type: "LineString", coordinates: [[-122,38],[-74,41],[-1,52],[31,30],[77,28],[103,1],[139,36]] } }
      ]
    }
  ]
};
