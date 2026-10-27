// Fuente única de países/ciudades donde opera ZNR. Aquí solo van las ciudades de 50 mil habitantes o más;
// las demás están en ciudades-extra.js y se cargan con cargarCiudadesExtra() cuando hacen falta.
// Cobertura: México; Colombia, Costa Rica, El Salvador, Guatemala, Honduras (todos sus municipios); Estados Unidos (lugares de 5000+ habitantes).
// Formato compacto: { País: { Estado: [[ciudad, lat, lng], ...] } }.
// Datos: GeoNames (CC BY 4.0, vía all-the-cities) y country-state-city (MIT). Generado con generar-ciudades.js: no editar a mano.
// Para agregar un país: añádelo a PAISES en generar-ciudades.js y vuelve a correrlo (reparte solo grandes/chicas).
const _ZNR_DATOS = {
  "Colombia": {
    "Antioquia": [["Apartadó",7.883,-76.6259],["Bello",6.3616,-75.5873],["Caldas",6.0911,-75.6357],["Caucasia",7.9865,-75.1935],["Envigado",6.1759,-75.5917],["Itagui",6.1787,-75.6312],["Medellín",6.2518,-75.5636],["Rionegro",6.1667,-75.4167],["Turbo",8.0926,-76.7282]],
    "Arauca": [["Arauca",7.0847,-70.7591]],
    "Atlántico": [["Barranquilla",10.9685,-74.7813],["Malambo",10.8595,-74.7739],["Sabanalarga",10.6164,-74.9572],["Soledad",10.8999,-74.7879]],
    "Bogotá D.C.": [["Bogotá D.C.",4.6126,-74.0705]],
    "Bolívar": [["Arjona",10.1759,-75.3588],["Cartagena de Indias",10.3997,-75.5144],["Magangué",9.242,-74.7547],["Turbaco",10.3571,-75.3804]],
    "Boyacá": [["Duitama",5.8245,-73.0341],["Sogamoso",5.7143,-72.9339],["Tunja",5.5353,-73.3678]],
    "Caldas": [["Chinchiná",4.9752,-75.7042],["La Dorada",5.5333,-74.7],["Manizales",5.0689,-75.5174]],
    "Caquetá": [["Florencia",1.7162,-75.5962]],
    "Casanare": [["Yopal",5.3378,-72.3959]],
    "Cauca": [["Popayán",2.4382,-76.6132],["Puerto Tejada",3.2339,-76.4193]],
    "Cesar": [["Aguachica",8.3084,-73.6166],["Agustín Codazzi",10.0367,-73.2356],["Valledupar",10.4631,-73.2532]],
    "Córdoba": [["Cereté",8.8848,-75.7905],["Montelíbano",7.9792,-75.4202],["Montería",8.748,-75.8814],["Sahagún",8.9462,-75.4427]],
    "Cundinamarca": [["Bogotá D.C.",4.6126,-74.0705],["Chía",4.8445,-74.0585],["Facatativá",4.8137,-74.3545],["Funza",4.7164,-74.2119],["Fusagasugá",4.3365,-74.3638],["Girardot",4.318,-74.835],["Madrid",4.7556,-74.2771],["Soacha",4.5794,-74.2168],["Zipaquirá",5.0221,-74.0048]],
    "Huila": [["Neiva",2.9275,-75.2875],["Pitalito",1.8539,-76.0514]],
    "La Guajira": [["Maicao",11.3784,-72.2395],["Riohacha",11.5444,-72.9072]],
    "Magdalena": [["El Banco",9.0011,-73.9758],["Fundación",10.5207,-74.185],["Santa Marta",11.2435,-74.2083]],
    "Meta": [["Villavicencio",4.0742,-73.4915]],
    "Nariño": [["Ipiales",0.825,-77.6397],["Pasto",1.2147,-77.2786],["Tumaco",1.7911,-78.7927]],
    "Norte de Santander": [["Cúcuta",7.8939,-72.5078],["Los Patios",7.8379,-72.5037],["Ocaña",8.2377,-73.356],["Pamplona",7.3757,-72.6479],["Villa del Rosario",7.7582,-72.4818]],
    "Quindío": [["Armenia",4.5331,-75.7044],["Calarca",4.5,-75.6333]],
    "Risaralda": [["Dosquebradas",4.8392,-75.6673],["Pereira",4.769,-75.7222],["Santa Rosa de Cabal",4.8681,-75.6214]],
    "San Andrés y Providencia": [["San Andrés",12.5832,-81.7064]],
    "Santander": [["Barrancabermeja",7.0653,-73.8547],["Bucaramanga",7.1254,-73.1198],["Floridablanca",7.0632,-73.0859],["Girón",7.0682,-73.1698],["Piedecuesta",6.9744,-73.0228]],
    "Sucre": [["Sincelejo",9.3047,-75.3978]],
    "Tolima": [["Espinal",4.1492,-74.8843],["Ibagué",4.4389,-75.2322]],
    "Valle del Cauca": [["Buenaventura",3.8801,-77.0312],["Cali",3.4103,-76.581],["Cartago",4.7464,-75.9117],["Guadalajara de Buga",3.9009,-76.2978],["Palmira",3.5397,-76.2261],["Tuluá",4.0847,-76.1954],["Yumbo",3.5823,-76.4915]]
  },
  "Costa Rica": {
    "Heredia": [["San Francisco",9.993,-84.1293]],
    "Limón": [["Limón",9.9907,-83.036]],
    "San José": [["San José",9.9333,-84.0833]]
  },
  "El Salvador": {
    "La Libertad": [["Santa Tecla",13.6769,-89.2797]],
    "San Miguel": [["San Miguel",13.4833,-88.1833]],
    "San Salvador": [["Apopa",13.8072,-89.1792],["Delgado",13.7242,-89.1703],["Mejicanos",13.7403,-89.2131],["San Marcos",13.6589,-89.1831],["San Salvador",13.6894,-89.1872],["Soyapango",13.7102,-89.1399]],
    "Santa Ana": [["Santa Ana",13.9942,-89.5597]],
    "Sonsonate": [["Sonsonate",13.7189,-89.7242]],
    "Usulután": [["Usulután",13.35,-88.45]]
  },
  "Estados Unidos": {
    "Alabama": [["Auburn",32.6099,-85.4808],["Birmingham",33.5207,-86.8025],["Decatur",34.6059,-86.9833],["Dothan",31.2232,-85.3905],["Hoover",33.4054,-86.8114],["Huntsville",34.7304,-86.5859],["Mobile",30.6944,-88.043],["Montgomery",32.3668,-86.3],["Tuscaloosa",33.2098,-87.5692]],
    "Alaska": [["Anchorage",61.2181,-149.9003]],
    "Arizona": [["Ahwatukee Foothills",33.3417,-111.984],["Alhambra",33.4984,-112.1343],["Avondale",33.4356,-112.3496],["Buckeye",33.3703,-112.5838],["Casa Grande",32.8795,-111.7573],["Casas Adobes",32.3234,-110.9951],["Catalina Foothills",32.2978,-110.9187],["Central City",33.44,-112.058],["Chandler",33.3062,-111.8412],["Deer Valley",33.6839,-112.1349],["Encanto",33.4794,-112.0782],["Flagstaff",35.1981,-111.6513],["Gilbert",33.3528,-111.789],["Glendale",33.5386,-112.186],["Goodyear",33.4353,-112.3582],["Lake Havasu City",34.4839,-114.3224],["Maryvale",33.502,-112.1776],["Mesa",33.4223,-111.8226],["Peoria",33.5806,-112.2374],["Phoenix",33.4484,-112.074],["San Tan Valley",33.1911,-111.528],["Scottsdale",33.5092,-111.899],["South Tucson",32.1995,-110.9684],["Surprise",33.6306,-112.3332],["Tempe",33.4148,-111.9093],["Tempe Junction",33.4142,-111.9435],["Tucson",32.2217,-110.9265],["Tucson Estates",32.1876,-111.0909],["Yuma",32.7253,-114.6244]],
    "Arkansas": [["Conway",35.0887,-92.4421],["Fayetteville",36.0626,-94.1574],["Fort Smith",35.3859,-94.3985],["Jonesboro",35.8423,-90.7043],["Little Rock",34.7465,-92.2896],["North Little Rock",34.7695,-92.2671],["Rogers",36.332,-94.1185],["Springdale",36.1867,-94.1288],["West Memphis",35.1465,-90.1845]],
    "California": [["Agoura Hills",34.1364,-118.7745],["Alameda",37.771,-122.2609],["Alhambra",34.0953,-118.127],["Aliso Viejo",33.565,-117.7271],["Alondra Park",33.8895,-118.3309],["Anaheim",33.8353,-117.9145],["Antioch",38.0049,-121.8058],["Apple Valley",34.5008,-117.1859],["Arcadia",34.1397,-118.0353],["Arden-Arcade",38.6025,-121.3785],["Avocado Heights",34.0361,-117.9912],["Bakersfield",35.3733,-119.0187],["Baldwin Park",34.0853,-117.9609],["Bellflower",33.8817,-118.117],["Berkeley",37.8716,-122.2727],["Beverly Hills",34.0736,-118.4004],["Bonadelle Ranchos-Madera Ranchos",36.9847,-119.8746],["Boyle Heights",34.0339,-118.2053],["Brentwood",37.9319,-121.6958],["Buena Park",33.8675,-117.9981],["Burbank",34.1808,-118.309],["Camarillo",34.2164,-119.0376],["Canoga Park",34.2011,-118.5981],["Canyon Lake",33.685,-117.2731],["Carlsbad",33.1581,-117.3506],["Carmichael",38.6171,-121.3283],["Carson",33.8314,-118.282],["Castro Valley",37.6941,-122.0863],["Cathedral City",33.7797,-116.4653],["Chico",39.7285,-121.8375],["Chinatown",37.7966,-122.4086],["Chino",34.0122,-117.6889],["Chino Hills",33.9938,-117.7589],["Chula Vista",32.6401,-117.0842],["Citrus Heights",38.7071,-121.2811],["Clovis",36.8252,-119.7029],["Colton",34.0739,-117.3136],["Compton",33.8959,-118.2201],["Concord",37.978,-122.0311],["Corona",33.8753,-117.5664],["Costa Mesa",33.6411,-117.9187],["Covina",34.09,-117.8903],["Cupertino",37.323,-122.0322],["Daly City",37.7058,-122.4619],["Davis",38.5449,-121.7405],["Delano",35.7688,-119.247],["Diamond Bar",34.0286,-117.8103],["Downey",33.94,-118.1326],["Dublin",37.7022,-121.9358],["East Hemet",33.74,-116.9389],["East Los Angeles",34.0239,-118.172],["East Palo Alto",37.4688,-122.1411],["East Pasadena",34.1381,-118.0738],["East Porterville",36.0575,-118.9757],["East Rancho Dominguez",33.8981,-118.1953],["East San Gabriel",34.0917,-118.0912],["Eastvale",33.9636,-117.5642],["Echo Park",34.0781,-118.2607],["El Cajon",32.7948,-116.9625],["El Cerrito Corona",33.8406,-117.5228],["El Monte",34.0686,-118.0276],["Elk Grove",38.4088,-121.3716],["Encinitas",33.037,-117.292],["Escondido",33.1192,-117.0864],["Fairfield",38.2494,-122.04],["Florence-Graham",33.9677,-118.2444],["Folsom",38.678,-121.1761],["Fontana",34.0922,-117.435],["Fountain Valley",33.7092,-117.9537],["Fremont",37.5483,-121.9886],["Fresno",36.7477,-119.7724],["Fullerton",33.8703,-117.9253],["Garden Grove",33.7739,-117.9414],["Gardena",33.8884,-118.309],["Gilroy",37.0058,-121.5683],["Glendale",34.1425,-118.2551],["Glendora",34.1361,-117.8653],["Hacienda Heights",33.9931,-117.9687],["Hanford",36.3275,-119.6457],["Hawthorne",33.9164,-118.3526],["Hayward",37.6688,-122.0808],["Hemet",33.7476,-116.9731],["Hermosa Beach",33.8622,-118.3995],["Hesperia",34.4264,-117.3009],["Highland",34.1283,-117.2086],["Hollywood",34.0983,-118.3267],["Huntington Beach",33.6603,-117.9992],["Huntington Park",33.9817,-118.2251],["Indio",33.7207,-116.2168],["Inglewood",33.9617,-118.3531],["Irvine",33.6695,-117.8231],["Koreatown",34.0578,-118.3009],["La Habra",33.932,-117.9462],["La Habra Heights",33.9609,-117.9506],["La Mesa",32.7678,-117.0231],["Ladera Heights",33.9942,-118.3753],["Laguna Beach",33.5423,-117.7831],["Laguna Hills",33.6125,-117.7128],["Laguna Niguel",33.5225,-117.7075],["Laguna Woods",33.6103,-117.7253],["Lake Elsinore",33.6681,-117.3273],["Lake Forest",33.647,-117.6892],["Lakewood",33.8536,-118.134],["Lancaster",34.698,-118.1367],["Livermore",37.6819,-121.768],["Lodi",38.1302,-121.2724],["Long Beach",33.767,-118.1892],["Los Angeles",34.0522,-118.2437],["Lynwood",33.9303,-118.2115],["Madera",36.9613,-120.0607],["Madera Acres",37.0191,-120.0668],["Manhattan Beach",33.8847,-118.4109],["Manteca",37.7974,-121.216],["Mead Valley",33.8334,-117.2961],["Menifee",33.7284,-117.1464],["Merced",37.3022,-120.483],["Milpitas",37.4283,-121.9066],["Mira Mesa",32.9156,-117.1439],["Mission Viejo",33.6,-117.672],["Modesto",37.6391,-120.9969],["Montebello",34.0095,-118.1053],["Monterey Park",34.0625,-118.1228],["Moreno Valley",33.9375,-117.2306],["Mountain View",37.3861,-122.0838],["Murrieta",33.5539,-117.2139],["Napa",38.2971,-122.2855],["National City",32.6781,-117.0992],["Newport Beach",33.6189,-117.9289],["North Hills",34.2364,-118.4847],["North Hollywood",34.1722,-118.379],["North Tustin",33.7645,-117.7939],["Northridge",34.2283,-118.5367],["Norwalk",33.9022,-118.0817],["Novato",38.1074,-122.5697],["Oak Park",34.1792,-118.7629],["Oakland",37.8044,-122.2708],["Oceanside",33.1959,-117.3795],["Ontario",34.0633,-117.6509],["Orange",33.7878,-117.8531],["Oxnard",34.1975,-119.177],["Palm Desert",33.7226,-116.377],["Palm Springs",33.8303,-116.5453],["Palmdale",34.5794,-118.1165],["Palo Alto",37.4419,-122.143],["Paramount",33.8895,-118.1598],["Pasadena",34.1478,-118.1445],["Perris",33.7825,-117.2286],["Petaluma",38.2324,-122.6366],["Pico Rivera",33.9831,-118.0967],["Pittsburg",38.028,-121.8847],["Placentia",33.8722,-117.8703],["Pleasanton",37.6624,-121.8747],["Pomona",34.0553,-117.7523],["Porterville",36.0652,-119.0168],["Poway",32.9628,-117.0359],["Rancho Cordova",38.5891,-121.3027],["Rancho Cucamonga",34.1064,-117.5931],["Rancho Penasquitos",32.9595,-117.1153],["Redding",40.5865,-122.3917],["Redlands",34.0556,-117.1825],["Redondo Beach",33.8492,-118.3884],["Redwood City",37.4852,-122.2363],["Redwood Shores",37.5319,-122.248],["Rialto",34.1064,-117.3703],["Richmond",37.9358,-122.3477],["Riverside",33.9534,-117.3962],["Rocklin",38.7907,-121.2358],["Rosemead",34.0806,-118.0728],["Roseville",38.7521,-121.288],["Rowland Heights",33.9761,-117.9053],["Sacramento",38.5816,-121.4944],["Salinas",36.6777,-121.6555],["San Bernardino",34.1083,-117.2898],["San Clemente",33.427,-117.612],["San Diego",32.7157,-117.1647],["San Francisco",37.7749,-122.4194],["San Jose",37.3394,-121.895],["San Leandro",37.7249,-122.1561],["San Marcos",33.1434,-117.1661],["San Mateo",37.563,-122.3255],["San Pedro",33.7359,-118.2923],["San Rafael",37.9735,-122.5311],["San Ramon",37.7799,-121.978],["Santa Ana",33.7456,-117.8678],["Santa Barbara",34.4208,-119.6982],["Santa Clara",37.3541,-121.9552],["Santa Clarita",34.3917,-118.5426],["Santa Cruz",36.9741,-122.0308],["Santa Maria",34.953,-120.4357],["Santa Monica",34.0195,-118.4912],["Santa Rosa",38.4405,-122.7144],["Santee",32.8384,-116.9739],["Seal Beach",33.7414,-118.1048],["Shadow Hills",34.262,-118.3517],["Sherman Oaks",34.1511,-118.4492],["Simi Valley",34.2695,-118.7815],["South El Monte",34.052,-118.0467],["South Gate",33.9547,-118.212],["South Pasadena",34.1161,-118.1503],["South San Francisco",37.6547,-122.4077],["South San Gabriel",34.0492,-118.0946],["South San Jose Hills",34.0128,-117.9048],["South Whittier",33.9502,-118.0392],["South Yuba City",39.1166,-121.6391],["Spring Valley Lake",34.4936,-117.2683],["Stockton",37.9577,-121.2908],["Sunnyvale",37.3688,-122.0363],["Temecula",33.4936,-117.1484],["Thousand Oaks",34.1706,-118.8376],["Torrance",33.8359,-118.3406],["Tracy",37.7399,-121.4262],["Tulare",36.2077,-119.3473],["Turlock",37.4947,-120.8466],["Tustin",33.7459,-117.8262],["Union City",37.5958,-122.0191],["Universal City",34.1389,-118.3534],["Upland",34.0975,-117.6484],["Vacaville",38.3566,-121.9877],["Valencia",34.4436,-118.6095],["Vallejo",38.1041,-122.2566],["Valley Glen",34.1899,-118.4495],["Van Nuys",34.1867,-118.449],["Ventura",34.2783,-119.2932],["Victorville",34.5361,-117.2912],["View Park-Windsor Hills",33.9955,-118.3483],["Villa Park",33.8145,-117.8131],["Visalia",36.3302,-119.2921],["Vista",33.2,-117.2425],["Walnut Creek",37.9063,-122.065],["Walnut Park",33.9681,-118.2251],["Watsonville",36.9102,-121.7569],["West Carson",33.8217,-118.2926],["West Covina",34.0686,-117.9389],["West Hills",34.1973,-118.644],["West Hollywood",34.09,-118.3617],["West Modesto",37.6175,-121.0391],["West Puente Valley",34.0517,-117.9684],["West Sacramento",38.5805,-121.5302],["West Whittier-Los Nietos",33.976,-118.0691],["Westminster",33.7592,-118.0067],["Whittier",33.9792,-118.0328],["Woodland",38.6785,-121.7733],["Woodland Hills",34.1683,-118.6059],["Yorba Linda",33.8886,-117.8131],["Yuba City",39.1405,-121.6169],["Yucaipa",34.0336,-117.0431]],
    "Carolina del Norte": [["Asheville",35.601,-82.554],["Burlington",36.0957,-79.4378],["Cary",35.7915,-78.7811],["Chapel Hill",35.9132,-79.0558],["Charlotte",35.2271,-80.8431],["Concord",35.4089,-80.5816],["Durham",35.994,-78.8986],["Fayetteville",35.0527,-78.8784],["Gastonia",35.2621,-81.1873],["Greensboro",36.0726,-79.792],["Greenville",35.6127,-77.3663],["High Point",35.9557,-80.0053],["Huntersville",35.4107,-80.8428],["Jacksonville",34.7541,-77.4302],["Raleigh",35.7721,-78.6386],["Rocky Mount",35.9382,-77.7905],["South Gastonia",35.2193,-81.2056],["West Raleigh",35.7868,-78.6639],["Wilmington",34.2257,-77.9447],["Winston-Salem",36.0999,-80.2442]],
    "Carolina del Sur": [["Charleston",32.7766,-79.9309],["Columbia",34.0007,-81.0348],["Greenville",34.8526,-82.394],["Mount Pleasant",32.7941,-79.8626],["North Charleston",32.8546,-79.9748],["Rock Hill",34.9249,-81.0251],["West Columbia",33.9935,-81.074]],
    "Colorado": [["Arvada",39.8028,-105.0875],["Aurora",39.7294,-104.8319],["Boulder",40.015,-105.2705],["Broomfield",39.9205,-105.0866],["Castle Pines North",39.4717,-104.8948],["Castle Rock",39.3722,-104.8561],["Centennial",39.5792,-104.8769],["Colorado Springs",38.8339,-104.8214],["Commerce City",39.8083,-104.9339],["Denver",39.7392,-104.9847],["Fort Collins",40.5853,-105.0844],["Grand Junction",39.0639,-108.5506],["Greeley",40.4233,-104.7091],["Highlands Ranch",39.5539,-104.9694],["Lakewood",39.7047,-105.0814],["Longmont",40.1672,-105.1019],["Loveland",40.3978,-105.075],["Manitou Springs",38.8597,-104.9172],["Pueblo",38.2545,-104.6091],["Pueblo West",38.35,-104.7227],["Thornton",39.868,-104.9719],["Westminster",39.8367,-105.0372]],
    "Connecticut": [["Bridgeport",41.1792,-73.1894],["Bristol",41.6718,-72.9493],["City of Milford (balance)",41.2237,-73.0616],["Danbury",41.3948,-73.454],["East Hartford",41.7823,-72.612],["East Haven",41.2762,-72.8684],["East Norwalk",41.1057,-73.3984],["Fairfield",41.1412,-73.2637],["Hamden",41.3959,-72.8968],["Hartford",41.7637,-72.6851],["Meriden",41.5382,-72.807],["Milford",41.2223,-73.0565],["New Britain",41.6612,-72.7795],["New Haven",41.3082,-72.9282],["North Haven",41.3909,-72.8595],["North Stamford",41.1382,-73.5435],["Norwalk",41.1176,-73.4079],["Stamford",41.0534,-73.5387],["Stratford",41.1845,-73.1332],["Waterbury",41.5582,-73.0515],["West Hartford",41.762,-72.742],["West Haven",41.2707,-72.947]],
    "Dakota del Norte": [["Bismarck",46.8083,-100.7837],["Fargo",46.8772,-96.7898],["Grand Forks",47.9253,-97.0328],["West Fargo",46.875,-96.9004]],
    "Dakota del Sur": [["Rapid City",44.0805,-103.231],["Rapid Valley",44.0625,-103.1463],["Sioux Falls",43.55,-96.7003]],
    "Delaware": [["Wilmington",39.746,-75.5466],["Wilmington Manor",39.6868,-75.5844]],
    "Distrito de Columbia": [["Washington, D.C.",38.8951,-77.0364]],
    "Florida": [["Alafaya",28.5641,-81.2114],["Allapattah",25.8145,-80.2239],["Boca Del Mar",26.3451,-80.1467],["Boca Raton",26.3587,-80.0831],["Bonita Springs",26.3398,-81.7787],["Boynton Beach",26.5254,-80.0664],["Bradenton",27.4989,-82.5748],["Brandon",27.9378,-82.2859],["Cape Coral",26.5629,-81.9495],["Carol City",25.9407,-80.2456],["Clearwater",27.9659,-82.8001],["Coconut Creek",26.2518,-80.1789],["Coral Gables",25.7215,-80.2684],["Coral Springs",26.2712,-80.2706],["Coral Terrace",25.7459,-80.3045],["Davie",26.0629,-80.2331],["Daytona Beach",29.2108,-81.0228],["Deerfield Beach",26.3184,-80.0998],["Delray Beach",26.4615,-80.0728],["Deltona",28.9005,-81.2637],["Doral",25.8195,-80.3553],["East Pensacola Heights",30.4288,-87.18],["Flagami",25.7623,-80.3162],["Fort Lauderdale",26.1223,-80.1434],["Fort Myers",26.6217,-81.8406],["Fort Myers Shores",26.7092,-81.7459],["Fountainebleau",25.7729,-80.3478],["Gainesville",29.6516,-82.3248],["Hialeah",25.8576,-80.2781],["Hialeah Gardens",25.8651,-80.3245],["Hollywood",26.0112,-80.1495],["Homestead",25.4687,-80.4776],["Jacksonville",30.3322,-81.6556],["Jupiter",26.9342,-80.0942],["Kendale Lakes",25.7082,-80.407],["Kendall",25.6793,-80.3173],["Kendall West",25.7065,-80.4388],["Kissimmee",28.3047,-81.4167],["Lakeland",28.0395,-81.9498],["Lakeland Highlands",27.9598,-81.9501],["Lakes by the Bay",25.5723,-80.3253],["Largo",27.9098,-82.7884],["Lauderdale Lakes",26.1665,-80.2084],["Lauderdale-by-the-Sea",26.192,-80.0964],["Lauderhill",26.1404,-80.2134],["Lehigh Acres",26.6254,-81.6248],["Margate",26.2445,-80.2064],["Melbourne",28.0836,-80.6081],["Miami",25.7743,-80.1937],["Miami Beach",25.7907,-80.13],["Miami Gardens",25.942,-80.2456],["Miami Lakes",25.9087,-80.3087],["Miami Shores",25.8632,-80.1928],["Miami Springs",25.8223,-80.2895],["Miramar",25.9873,-80.2323],["North Bay Village",25.8462,-80.1539],["North Fort Myers",26.6673,-81.8801],["North Lauderdale",26.2173,-80.2259],["North Miami",25.8901,-80.1867],["North Miami Beach",25.9332,-80.1625],["North Palm Beach",26.8176,-80.082],["North Port",27.0442,-82.2359],["North Sarasota",27.3739,-82.5184],["Ocala",29.1872,-82.1401],["Orlando",28.5383,-81.3792],["Ormond Beach",29.2858,-81.0559],["Palm Bay",28.0345,-80.5887],["Palm Beach",26.7056,-80.0364],["Palm Beach Gardens",26.8234,-80.1386],["Palm Coast",29.585,-81.2078],["Palm Harbor",28.0781,-82.7637],["Palm Springs",26.6359,-80.0961],["Palm Springs North",25.9351,-80.3338],["Pembroke Park",25.9879,-80.1748],["Pembroke Pines",26.0032,-80.2239],["Pensacola",30.4213,-87.2169],["Pine Castle",28.472,-81.3678],["Pine Hills",28.5578,-81.4534],["Pinellas Park",27.8428,-82.6995],["Plantation",26.1342,-80.2318],["Poinciana",28.1403,-81.4584],["Pompano Beach",26.2379,-80.1248],["Pompano Beach Highlands",26.2829,-80.107],["Port Charlotte",26.9762,-82.0906],["Port Orange",29.1383,-80.9956],["Port Saint Lucie",27.2939,-80.3503],["Riverview",27.8661,-82.3265],["Riviera Beach",26.7753,-80.0581],["Royal Palm Beach",26.7084,-80.2306],["Safety Harbor",27.9909,-82.6932],["Sanford",28.8006,-81.2731],["Sarasota",27.3364,-82.5306],["Sarasota Springs",27.3089,-82.4795],["South Bradenton",27.4631,-82.5818],["South Daytona",29.1658,-81.0045],["South Miami",25.7076,-80.2934],["Spring Hill",28.4769,-82.5255],["St. Petersburg",27.7709,-82.6793],["Sunny Isles Beach",25.9507,-80.1228],["Sunrise",26.134,-80.1131],["Tallahassee",30.4383,-84.2807],["Tamarac",26.2129,-80.2498],["Tamiami",25.7587,-80.3984],["Tampa",27.9475,-82.4584],["The Crossings",25.6707,-80.4012],["The Hammocks",25.6715,-80.4445],["The Villages",28.9341,-81.9599],["Three Lakes",25.6421,-80.3984],["Town 'n' Country",28.0106,-82.5773],["Wellington",26.6587,-80.2414],["West Gate",26.7026,-80.0981],["West Hollywood",26.0207,-80.1839],["West Little River",25.857,-80.237],["West Melbourne",28.0717,-80.6534],["West Miami",25.7634,-80.2962],["West Palm Beach",26.7153,-80.0534],["West Park",25.9845,-80.1989],["West Pensacola",30.4266,-87.2797],["Weston",26.1004,-80.3998]],
    "Georgia": [["Albany",31.5785,-84.1557],["Alpharetta",34.0754,-84.2941],["Athens",33.9609,-83.3779],["Atlanta",33.749,-84.388],["Brookhaven",33.8584,-84.3402],["Columbus",32.461,-84.9877],["Johns Creek",34.0289,-84.1986],["Macon",32.8407,-83.6324],["Marietta",33.9526,-84.5499],["North Atlanta",33.8651,-84.3366],["Roswell",34.0232,-84.3616],["Sandy Springs",33.9243,-84.3785],["Savannah",32.0835,-81.0998],["Smyrna",33.884,-84.5144],["Stonecrest",33.7085,-84.1348],["Valdosta",30.8333,-83.2803],["Warner Robins",32.6157,-83.6266]],
    "Hawái": [["East Honolulu",21.2891,-157.7173],["Honolulu",21.3069,-157.8583]],
    "Idaho": [["Boise",43.6135,-116.2034],["Caldwell",43.6629,-116.6874],["Idaho Falls",43.4666,-112.0341],["Meridian",43.6121,-116.3915],["Nampa",43.5407,-116.5635],["Pocatello",42.8713,-112.4455]],
    "Illinois": [["Albany Park",41.9684,-87.7234],["Arlington Heights",42.0884,-87.9806],["Aurora",41.7606,-88.3201],["Belmont Cragin",41.9317,-87.7687],["Berwyn",41.8506,-87.7937],["Bloomington",40.4842,-88.9937],["Bolingbrook",41.6986,-88.0684],["Brighton Park",41.8189,-87.6989],["Calumet Park",41.6628,-87.6606],["Champaign",40.1164,-88.2434],["Chicago",41.85,-87.65],["Chicago Lawn",41.775,-87.6964],["Chicago Loop",41.8841,-87.6333],["Chicago Ridge",41.7014,-87.7792],["Cicero",41.8456,-87.7539],["Decatur",39.8403,-88.9548],["Des Plaines",42.0334,-87.8834],["East Garfield Park",41.8809,-87.7028],["East Peoria",40.6662,-89.5801],["East Saint Louis",38.6245,-90.1509],["Edgewater",41.9834,-87.6639],["Elgin",42.0373,-88.2812],["Elmwood Park",41.9211,-87.8092],["Evanston",42.0411,-87.6901],["Evergreen Park",41.7206,-87.7017],["Forest Park",41.8795,-87.8137],["Franklin Park",41.9353,-87.8656],["Gage Park",41.795,-87.6962],["Harwood Heights",41.9673,-87.8076],["Hoffman Estates",42.0428,-88.0798],["Hyde Park",41.7942,-87.5939],["Irving Park",41.9534,-87.7364],["Joliet",41.5252,-88.0834],["La Grange Park",41.8348,-87.8617],["Lincoln Park",41.9217,-87.6478],["Lincoln Square",41.9759,-87.6892],["Logan Square",41.9234,-87.6992],["Lower West Side",41.8542,-87.6656],["McKinley Park",41.8317,-87.6737],["Melrose Park",41.9006,-87.8567],["Morgan Park",41.6903,-87.6667],["Mount Prospect",42.0664,-87.9373],["Naperville",41.7859,-88.1473],["Near North Side",41.9,-87.6345],["Near South Side",41.8567,-87.6248],["Normal",40.5142,-88.9906],["North Aurora",41.8061,-88.3273],["North Center",41.9539,-87.6789],["North Lawndale",41.86,-87.7184],["North Peoria",40.7175,-89.5843],["North Riverside",41.8428,-87.8231],["Oak Brook",41.8328,-87.9289],["Oak Forest",41.6028,-87.7439],["Oak Lawn",41.7109,-87.7581],["Oak Park",41.885,-87.7845],["Orland Hills",41.5853,-87.8431],["Orland Park",41.6303,-87.8539],["Palatine",42.1103,-88.0342],["Park Forest",41.4914,-87.6745],["Park Ridge",42.0111,-87.8406],["Peoria",40.6937,-89.589],["Peoria Heights",40.7473,-89.574],["Portage Park",41.9578,-87.7651],["Prospect Heights",42.0953,-87.9376],["Richton Park",41.4845,-87.7034],["Rockford",42.2711,-89.094],["Rogers Park",42.0086,-87.6667],["Schaumburg",42.0334,-88.0834],["Schiller Park",41.9559,-87.8709],["Skokie",42.0334,-87.7334],["South Chicago",41.7398,-87.5542],["South Elgin",41.9942,-88.2923],["South Holland",41.6009,-87.607],["South Lawndale",41.8436,-87.7125],["South Shore",41.762,-87.5778],["Springfield",39.8017,-89.6437],["Tinley Park",41.5734,-87.7845],["University Park",41.443,-87.6836],["Uptown",41.9659,-87.6526],["Villa Park",41.8898,-87.9889],["Waukegan",42.3636,-87.8448],["West Elsdon",41.7939,-87.7245],["West Englewood",41.7781,-87.6667],["West Garfield Park",41.8806,-87.7292],["West Lawn",41.7728,-87.7223],["West Ridge",41.9998,-87.6928],["West Town",41.8938,-87.6749],["Wheaton",41.8661,-88.107]],
    "Indiana": [["Anderson",40.1053,-85.6802],["Bloomington",39.1653,-86.5264],["Carmel",39.9784,-86.118],["Elkhart",41.682,-85.9767],["Evansville",37.9748,-87.5559],["Fishers",39.9556,-86.0139],["Fort Wayne",41.1306,-85.1289],["Gary",41.5934,-87.3464],["Greenwood",39.6137,-86.1066],["Hammond",41.5834,-87.5],["Indianapolis",39.7684,-86.158],["Kokomo",40.4864,-86.1336],["Lafayette",40.4167,-86.8753],["Muncie",40.1934,-85.3864],["Noblesville",40.0456,-86.0086],["South Bend",41.6834,-86.25],["Terre Haute",39.4667,-87.4139],["West Lafayette",40.4259,-86.9081]],
    "Iowa": [["Ames",42.0347,-93.6199],["Ankeny",41.7297,-93.6058],["Cedar Rapids",42.0083,-91.6441],["Council Bluffs",41.2619,-95.8608],["Davenport",41.5236,-90.5776],["Des Moines",41.6005,-93.6091],["Dubuque",42.5006,-90.6646],["Iowa City",41.6611,-91.5302],["Sioux City",42.5,-96.4003],["Waterloo",42.4928,-92.343],["West Des Moines",41.5772,-93.7113]],
    "Kansas": [["Kansas City",39.1142,-94.6275],["Lawrence",38.9717,-95.2352],["Lenexa",38.9536,-94.7336],["Manhattan",39.1836,-96.5717],["Olathe",38.8814,-94.8191],["Overland Park",38.9822,-94.6708],["Roeland Park",39.0375,-94.6322],["Shawnee",39.0417,-94.7202],["Topeka",39.0483,-95.678],["Wichita",37.6922,-97.3375]],
    "Kentucky": [["Bowling Green",36.9903,-86.4436],["Ironville",38.4565,-82.6924],["Lexington",37.9887,-84.4777],["Lexington-Fayette",38.0498,-84.4585],["Louisville",38.2542,-85.7594],["Meads",38.4126,-82.709],["Owensboro",37.7742,-87.1133]],
    "Luisiana": [["Baton Rouge",30.4433,-91.1875],["Bossier City",32.516,-93.7321],["Kenner",29.9941,-90.2417],["Lafayette",30.2241,-92.0198],["Lake Charles",30.2131,-93.2044],["Metairie",29.9841,-90.1528],["Metairie Terrace",29.9785,-90.164],["New Orleans",29.9547,-90.0751],["Shreveport",32.5251,-93.7502]],
    "Maine": [["Portland",43.6574,-70.2589],["South Portland",43.6415,-70.2409],["South Portland Gardens",43.639,-70.3153]],
    "Maryland": [["Ashton-Sandy Spring",39.1498,-77.005],["Baltimore",39.2904,-76.6122],["Baltimore Highlands",39.2332,-76.6366],["Bethesda",38.9807,-77.1003],["Bowie",38.9428,-76.7303],["Columbia",39.2404,-76.8394],["Dundalk",39.2507,-76.5205],["Ellicott City",39.2673,-76.7983],["Frederick",39.4143,-77.4105],["Gaithersburg",39.1434,-77.2014],["Germantown",39.1732,-77.2716],["Glen Burnie",39.1626,-76.6247],["North Bethesda",39.0446,-77.1189],["Rockville",39.084,-77.1528],["Silver Hill",38.8418,-76.9458],["Silver Spring",38.9907,-77.0261],["Suitland-Silver Hill",38.8469,-76.9259],["Towson",39.4015,-76.6019],["Waldorf",38.6246,-76.9391]],
    "Massachusetts": [["Boston",42.3584,-71.0598],["Brockton",42.0834,-71.0184],["Brookline",42.3318,-71.1212],["Cambridge",42.3751,-71.1056],["Chicopee",42.1487,-72.6079],["Fall River",41.7015,-71.155],["Framingham",42.2793,-71.4162],["Framingham Center",42.2973,-71.437],["Hamilton Worcester",42.2562,-71.7676],["Haverhill",42.7762,-71.0773],["Lawrence",42.707,-71.1631],["Lowell",42.6334,-71.3162],["Lynn",42.4668,-70.9495],["Malden",42.4251,-71.0662],["Medford",42.4184,-71.1062],["New Bedford",41.6353,-70.927],["Newton",42.337,-71.2092],["North Chicopee",42.1834,-72.5995],["Peabody",42.5279,-70.9287],["Quincy",42.2529,-71.0023],["Revere",42.4084,-71.012],["Somerville",42.3876,-71.0995],["South Boston",42.3334,-71.0495],["South Peabody",42.5098,-70.9495],["Springfield",42.1015,-72.5898],["Taunton",41.9001,-71.0898],["Waltham",42.3765,-71.2356],["West Springfield",42.107,-72.6204],["Weymouth",42.2209,-70.9398],["Worcester",42.2626,-71.8023]],
    "Míchigan": [["Ann Arbor",42.2776,-83.7409],["Auburn Hills",42.6875,-83.2341],["Battle Creek",42.3173,-85.1782],["Beverly Hills",42.5239,-83.2233],["Canton",42.3087,-83.4822],["Clinton Township",42.587,-82.9199],["Dearborn",42.3223,-83.1763],["Dearborn Heights",42.337,-83.2733],["Detroit",42.3314,-83.0457],["East Grand Rapids",42.9411,-85.61],["East Lansing",42.737,-84.4839],["Farmington",42.4645,-83.3763],["Farmington Hills",42.4853,-83.3772],["Flint",43.0125,-83.6875],["Grand Rapids",42.9634,-85.6681],["Kalamazoo",42.2917,-85.5872],["Kentwood",42.8695,-85.6447],["Lansing",42.7325,-84.5555],["Livonia",42.3684,-83.3527],["Madison Heights",42.4859,-83.1052],["Novi",42.4806,-83.4755],["Oak Park",42.4595,-83.1827],["Pontiac",42.6389,-83.291],["Rochester",42.6806,-83.1338],["Rochester Hills",42.6584,-83.1499],["Royal Oak",42.4895,-83.1446],["Saint Clair Shores",42.497,-82.8888],["Shelby",42.6709,-83.033],["Southfield",42.4734,-83.2219],["Sterling Heights",42.5803,-83.0302],["Taylor",42.2409,-83.2696],["Troy",42.6056,-83.1499],["Warren",42.4904,-83.013],["Waterford",42.693,-83.4118],["West Bloomfield Township",42.5689,-83.3836],["Westland",42.3242,-83.4002],["Wyoming",42.9134,-85.7053]],
    "Minnesota": [["Apple Valley",44.7319,-93.2177],["Blaine",45.1608,-93.2349],["Bloomington",44.8408,-93.2983],["Brooklyn Center",45.0761,-93.3327],["Brooklyn Park",45.0941,-93.3563],["Burnsville",44.7677,-93.2777],["Coon Rapids",45.12,-93.2877],["Duluth",46.7833,-92.1066],["Eagan",44.8041,-93.1669],["East Grand Forks",47.93,-97.0245],["Eden Prairie",44.8547,-93.4708],["Edina",44.8897,-93.35],["Lakeville",44.6497,-93.2427],["Maple Grove",45.0725,-93.4558],["Minneapolis",44.98,-93.2638],["Minnetonka",44.9133,-93.5033],["Minnetonka Mills",44.9411,-93.4419],["North Saint Paul",45.0125,-92.9919],["Plymouth",45.0105,-93.4555],["Rochester",44.0216,-92.4699],["Saint Anthony",45.0205,-93.218],["Saint Cloud",45.5608,-94.1625],["Saint Joseph",45.565,-94.3183],["Saint Louis Park",44.9483,-93.348],["Saint Paul",44.9444,-93.0933],["Saint Paul Park",44.8422,-92.9913],["South Saint Paul",44.8927,-93.0349],["Spring Lake Park",45.1077,-93.238],["West Coon Rapids",45.1597,-93.3497],["West Saint Paul",44.9161,-93.1016],["Woodbury",44.9239,-92.9594]],
    "Misisipi": [["Gulfport",30.3674,-89.0928],["Jackson",32.2988,-90.1848],["Southaven",34.989,-90.0126],["West Gulfport",30.4041,-89.0942]],
    "Misuri": [["Blue Springs",39.017,-94.2816],["Columbia",38.9517,-92.3341],["East Independence",39.0956,-94.3552],["Florissant",38.7892,-90.3226],["Independence",39.0911,-94.4155],["Joplin",37.0842,-94.5133],["Kansas City",39.0997,-94.5786],["Lake Saint Louis",38.7976,-90.7857],["Lee's Summit",38.9108,-94.3822],["O'Fallon",38.8106,-90.6998],["Saint Ann",38.7273,-90.3832],["Saint Charles",38.7839,-90.4812],["Saint John",38.7148,-90.3463],["Saint Johns",38.7134,-90.3432],["Saint Joseph",39.7686,-94.8466],["Saint Peters",38.8003,-90.6265],["Springfield",37.2153,-93.2982],["St. Louis",38.6273,-90.1979]],
    "Montana": [["Billings",45.7833,-108.5007],["Great Falls",47.5002,-111.3008],["Missoula",46.8722,-113.994]],
    "Nebraska": [["Bellevue",41.1367,-95.8908],["Grand Island",40.925,-98.342],["Lincoln",40.8,-96.667],["Omaha",41.2563,-95.9404],["South Sioux City",42.4739,-96.4136]],
    "Nevada": [["Carson City",39.1638,-119.7674],["Enterprise",36.0253,-115.2419],["Henderson",36.0397,-114.9819],["Las Vegas",36.175,-115.1372],["North Las Vegas",36.1989,-115.1175],["Paradise",36.0972,-115.1467],["Reno",39.5296,-119.8138],["Sparks",39.5349,-119.7527],["Spring Valley",36.108,-115.245],["Sunrise Manor",36.2111,-115.0731]],
    "Nueva Jersey": [["Bayonne",40.6687,-74.1143],["Camden",39.926,-75.1196],["Cherry Hill",39.9348,-75.0307],["Cherry Hill Mall",39.936,-75.0091],["Cliffside Park",40.8215,-73.9876],["Clifton",40.8584,-74.1638],["East Brunswick",40.4279,-74.416],["East Hanover",40.8201,-74.3649],["East Orange",40.7673,-74.2049],["East Rutherford",40.834,-74.0971],["Edison",40.5187,-74.4121],["Elizabeth",40.664,-74.2107],["Forked River",39.8398,-74.1901],["Hasbrouck Heights",40.8582,-74.0807],["Hoboken",40.744,-74.0324],["Irvington",40.7323,-74.2349],["Jackson",39.7765,-74.8624],["Jersey City",40.7282,-74.0776],["Lakewood",40.0979,-74.2176],["New Brunswick",40.4862,-74.4518],["New Milford",40.9351,-74.019],["Newark",40.7357,-74.1724],["North Arlington",40.7884,-74.1332],["North Bergen",40.8043,-74.0121],["North Plainfield",40.6301,-74.4274],["Orange",40.7707,-74.2327],["Palisades Park",40.8482,-73.9976],["Parsippany",40.8579,-74.426],["Passaic",40.8568,-74.1285],["Paterson",40.9168,-74.1718],["Perth Amboy",40.5068,-74.2654],["Pine Hill",39.7843,-74.9921],["Piscataway",40.4993,-74.399],["Plainfield",40.6337,-74.4074],["South Amboy",40.4779,-74.2907],["South Orange",40.749,-74.2613],["South Plainfield",40.5793,-74.4115],["South Vineland",39.446,-75.0288],["Toms River",39.9537,-74.1979],["Trenton",40.2171,-74.7429],["Union",40.6976,-74.2632],["Union City",40.7796,-74.0238],["Vineland",39.4862,-75.0257],["Wayne",40.9254,-74.2765],["West New York",40.7879,-74.0143],["West Orange",40.7987,-74.239]],
    "Nueva York": [["Albany",42.6526,-73.7562],["Amherst",42.9784,-78.7998],["Astoria",40.7721,-73.9301],["Bayside",40.7684,-73.7771],["Bensonhurst",40.6018,-73.994],["Borough Park",40.634,-73.9968],["Brentwood",40.7812,-73.2462],["Briarwood",40.7094,-73.8153],["Brooklyn",40.6501,-73.9496],["Brooklyn Heights",40.6954,-73.9937],["Brownsville",40.6609,-73.9201],["Buffalo",42.8865,-78.8784],["Bushwick",40.6943,-73.9187],["Cambria Heights",40.6946,-73.7385],["Canarsie",40.6437,-73.9007],["Cheektowaga",42.9034,-78.7547],["Chinatown",40.7165,-73.9962],["Coney Island",40.5779,-73.994],["Corona",40.7471,-73.8601],["Cypress Hills",40.6771,-73.8912],["Dongan Hills",40.5884,-74.0962],["Dyker Heights",40.6215,-74.0096],["East Elmhurst",40.7612,-73.8651],["East Flatbush",40.6537,-73.9304],["East Harlem",40.7947,-73.9425],["East New York",40.6668,-73.8824],["East Rochester",43.1087,-77.4875],["East Rockaway",40.6421,-73.6696],["East Tremont",40.8454,-73.891],["East Village",40.7293,-73.9874],["Elmhurst",40.7365,-73.8779],["Financial District",40.7079,-74.0086],["Flatbush",40.6521,-73.959],["Flatlands",40.6212,-73.9349],["Floral Park",40.7237,-73.7048],["Fordham",40.8593,-73.8985],["Forest Hills",40.7162,-73.8501],["Garden City Park",40.7409,-73.6626],["Gramercy Park",40.7375,-73.9861],["Gravesend",40.5976,-73.9651],["Greenburgh",41.0329,-73.8429],["Harlem",40.8079,-73.9454],["Hempstead",40.7062,-73.6187],["Irondequoit",43.2134,-77.5797],["Jackson Heights",40.7557,-73.8854],["Jamaica",40.6915,-73.8057],["Kew Gardens Hills",40.73,-73.8234],["Kings Bridge",40.8787,-73.9051],["Kings Point",40.8198,-73.7351],["Levittown",40.7259,-73.5143],["Long Island City",40.7448,-73.9487],["Manhattan",40.7834,-73.9662],["Middle Village",40.7165,-73.8812],["Morningside Heights",40.81,-73.9625],["Morris Heights",40.8498,-73.9199],["Morris Park",40.8523,-73.8535],["Mott Haven",40.809,-73.9229],["Mount Vernon",40.9126,-73.8371],["New Dorp",40.574,-74.116],["New Dorp Beach",40.5654,-74.1029],["New Hyde Park",40.7351,-73.6879],["New Rochelle",40.9115,-73.7823],["New Springville",40.5934,-74.1632],["New York City",40.7143,-74.006],["North Castle",41.14,-73.6839],["North Hills",40.7809,-73.6765],["North New Hyde Park",40.7432,-73.6932],["North Syracuse",43.1348,-76.1299],["Ozone Park",40.6768,-73.8437],["Park Slope",40.6701,-73.986],["Parkchester",40.839,-73.8604],["Queens",40.6815,-73.8365],["Queens Village",40.7268,-73.7415],["Rego Park",40.7265,-73.8526],["Richmond Hill",40.6998,-73.8312],["Ridgewood",40.7001,-73.9057],["Rochester",43.1548,-77.6156],["Schenectady",42.8142,-73.9396],["Sheepshead Bay",40.5912,-73.9446],["Staten Island",40.5623,-74.1399],["Sunset Park",40.6455,-74.0124],["Syracuse",43.0481,-76.1474],["Terrace Heights",40.7215,-73.7693],["The Bronx",40.8499,-73.8664],["University Heights",40.8601,-73.9093],["Utica",43.1009,-75.2327],["Wakefield",40.8979,-73.8524],["Washington Heights",40.8501,-73.9354],["West Albany",42.6831,-73.7785],["West Hempstead",40.7048,-73.6501],["White Plains",41.034,-73.7629],["Williston Park",40.7565,-73.6448],["Yonkers",40.9312,-73.8988]],
    "Nuevo Hampshire": [["Manchester",42.9956,-71.4548],["Nashua",42.7654,-71.4676]],
    "Nuevo México": [["Albuquerque",35.0845,-106.6511],["Eldorado at Santa Fe",35.5264,-105.9347],["Enchanted Hills",35.3368,-106.593],["Las Cruces",32.3123,-106.7783],["Los Ranchos de Albuquerque",35.162,-106.6428],["Rio Rancho",35.2334,-106.6645],["Santa Fe",35.687,-105.9378]],
    "Ohio": [["Akron",41.0814,-81.519],["Canton",40.799,-81.3784],["Cincinnati",39.1271,-84.5144],["Cleveland",41.4995,-81.6954],["Cleveland Heights",41.5201,-81.5562],["Columbus",39.9612,-82.9988],["Dayton",39.759,-84.1916],["East Cleveland",41.5331,-81.579],["Elyria",41.3684,-82.1077],["Hamilton",39.3995,-84.5613],["Kettering",39.6895,-84.1688],["Lakewood",41.482,-81.7982],["Lorain",41.4528,-82.1824],["North Canton",40.8759,-81.4023],["Parma",41.4048,-81.7229],["Parma Heights",41.3901,-81.7596],["Springfield",39.9242,-83.8088],["Toledo",41.6639,-83.5552],["Youngstown",41.0998,-80.6495]],
    "Oklahoma": [["Broken Arrow",36.0526,-95.7908],["Edmond",35.6528,-97.4781],["Enid",36.3956,-97.8784],["Lawton",34.6087,-98.3903],["Midwest City",35.4495,-97.3967],["Moore",35.3395,-97.4867],["Norman",35.2226,-97.4395],["Oklahoma City",35.4676,-97.5164],["Tulsa",36.154,-95.9928]],
    "Oregón": [["Albany",44.6365,-123.1059],["Beaverton",45.4871,-122.8037],["Bend",44.0582,-121.3153],["Corvallis",44.5646,-123.262],["Eugene",44.0521,-123.0867],["Gresham",45.4982,-122.4315],["Hillsboro",45.5229,-122.9898],["Medford",42.3265,-122.8756],["North Portland",45.6104,-122.7034],["Portland",45.5234,-122.6762],["Salem",44.9429,-123.0351],["Springfield",44.0462,-123.022],["Tigard",45.4312,-122.7715]],
    "Pensilvania": [["Allentown",40.6084,-75.4902],["Bethlehem",40.6259,-75.3705],["Center City",39.9512,-75.1592],["Erie",42.1292,-80.0851],["Lancaster",40.0379,-76.3055],["Levittown",40.1551,-74.8288],["Philadelphia",39.9523,-75.1638],["Pittsburgh",40.4406,-79.9959],["Reading",40.3357,-75.9269],["Scranton",41.4092,-75.6649]],
    "Rhode Island": [["Cranston",41.7798,-71.4373],["East Providence",41.8137,-71.3701],["North Providence",41.8501,-71.4662],["Pawtucket",41.8787,-71.3826],["Providence",41.824,-71.4128],["Warwick",41.7001,-71.4162],["West Warwick",41.6969,-71.5219]],
    "Tennessee": [["Bartlett",35.2045,-89.874],["Chattanooga",35.0456,-85.3097],["Clarksville",36.5298,-87.3594],["East Brainerd",34.9959,-85.1502],["East Chattanooga",35.0654,-85.2491],["East Ridge",35.0142,-85.2519],["Franklin",35.9251,-86.8689],["Hendersonville",36.3048,-86.62],["Jackson",35.6145,-88.8139],["Johnson City",36.3134,-82.3535],["Kingsport",36.5484,-82.5618],["Knoxville",35.9606,-83.9207],["Memphis",35.1495,-90.049],["Murfreesboro",35.8456,-86.3903],["Nashville",36.1659,-86.7844],["New South Memphis",35.0868,-90.0568]],
    "Texas": [["Abilene",32.4487,-99.7331],["Alief",29.7111,-95.5963],["Allen",33.1032,-96.6705],["Amarillo",35.222,-101.8313],["Arlington",32.7357,-97.1081],["Atascocita",29.9988,-95.1766],["Austin",30.2672,-97.7431],["Baytown",29.7355,-94.9774],["Beaumont",30.0861,-94.1018],["Brownsville",25.9018,-97.4975],["Bryan",30.6744,-96.37],["Carrollton",32.9537,-96.8903],["Cedar Park",30.5052,-97.8203],["College Station",30.628,-96.3344],["Conroe",30.3119,-95.456],["Corpus Christi",27.8006,-97.3964],["Dallas",32.7831,-96.8067],["Denton",33.2148,-97.1331],["DeSoto",32.5899,-96.8569],["Edinburg",26.3017,-98.1633],["El Paso",31.7587,-106.4869],["Euless",32.8371,-97.082],["Flower Mound",33.0146,-97.097],["Fort Worth",32.7254,-97.3208],["Frisco",33.1507,-96.8236],["Galveston",29.3014,-94.7977],["Garland",32.9126,-96.6389],["Georgetown",30.6327,-97.6772],["Grand Prairie",32.746,-96.9978],["Grapevine",32.9343,-97.0781],["Harlingen",26.1906,-97.6961],["Houston",29.7633,-95.3633],["Irving",32.814,-96.9489],["Killeen",31.1171,-97.7278],["Laredo",27.5064,-99.5075],["League City",29.5075,-95.0949],["Lewisville",33.0462,-96.9942],["Longview",32.5007,-94.7405],["Lubbock",33.5779,-101.8552],["Mansfield",32.5632,-97.1417],["McAllen",26.2034,-98.23],["McKinney",33.1976,-96.6153],["Mesquite",32.7668,-96.5992],["Midland",31.9974,-102.0779],["Mission",26.2159,-98.3253],["Missouri City",29.6186,-95.5377],["New Braunfels",29.703,-98.1244],["North Richland Hills",32.8343,-97.2289],["Odessa",31.8457,-102.3676],["Pasadena",29.6911,-95.2091],["Pearland",29.5636,-95.286],["Pflugerville",30.4394,-97.62],["Pharr",26.1948,-98.1836],["Plano",33.0198,-96.6989],["Port Arthur",29.8852,-93.9423],["Port Neches",29.9913,-93.9585],["Richardson",32.9482,-96.7297],["Richland Hills",32.816,-97.2281],["Round Rock",30.5083,-97.6789],["Rowlett",32.9029,-96.5639],["San Angelo",31.4638,-100.437],["San Antonio",29.4241,-98.4936],["San Marcos",29.8833,-97.9414],["South Houston",29.663,-95.2355],["Spring",30.0799,-95.4172],["Sugar Land",29.6197,-95.6349],["Temple",31.0982,-97.3428],["The Woodlands",30.158,-95.4894],["Tyler",32.3513,-95.3011],["Victoria",28.8053,-97.0036],["Waco",31.5493,-97.1467],["West Odessa",31.8424,-102.4988],["Wichita Falls",33.9137,-98.4934]],
    "Utah": [["East Millcreek",40.7,-111.8105],["Layton",41.0602,-111.971],["Lehi",40.3916,-111.8508],["Little Cottonwood Creek Valley",40.6044,-111.8294],["Logan",41.7355,-111.8344],["Millcreek",40.6869,-111.8755],["North Logan",41.7694,-111.8047],["North Ogden",41.3072,-111.9602],["North Salt Lake",40.8486,-111.9069],["Ogden",41.223,-111.9738],["Orem",40.2969,-111.6946],["Provo",40.2338,-111.6585],["Saint George",37.1041,-113.5841],["Salt Lake City",40.7608,-111.891],["Sandy",40.5916,-111.8841],["Sandy Hills",40.5811,-111.8508],["South Jordan",40.5622,-111.9297],["South Jordan Heights",40.5638,-111.9494],["South Ogden",41.1919,-111.9713],["South Salt Lake",40.7188,-111.8883],["Taylorsville",40.6677,-111.9388],["West Jordan",40.6097,-111.9391],["West Valley City",40.6916,-112.001]],
    "Virginia": [["Alexandria",38.8048,-77.0469],["Arlington",38.881,-77.1043],["Centreville",38.8404,-77.4289],["Chesapeake",36.819,-76.2749],["Dale City",38.6371,-77.3111],["East Hampton",37.0374,-76.3316],["Hampton",37.0299,-76.3452],["Harrisonburg",38.4496,-78.8689],["Leesburg",39.1157,-77.5636],["Lynchburg",37.4138,-79.1422],["Newport News",37.0834,-76.4696],["Norfolk",36.8468,-76.2852],["Portsmouth",36.8354,-76.2983],["Portsmouth Heights",36.821,-76.3688],["Reston",38.9687,-77.3411],["Richmond",37.5538,-77.4603],["Roanoke",37.271,-79.9414],["South Suffolk",36.7171,-76.5902],["Suffolk",36.7284,-76.585],["Virginia Beach",36.8529,-75.978],["West Lynchburg",37.4032,-79.1781]],
    "Washington": [["Auburn",47.3073,-122.2284],["Bellevue",47.6104,-122.2007],["Bellingham",48.7596,-122.4882],["Burien",47.4704,-122.3468],["City of Sammamish",47.6044,-122.0377],["East Renton Highlands",47.4848,-122.1123],["Everett",47.979,-122.2021],["Federal Way",47.3223,-122.3126],["Kennewick",46.2113,-119.1372],["Kent",47.3809,-122.2348],["Kirkland",47.6815,-122.2087],["Lakeland South",47.2784,-122.2833],["Lakewood",47.1718,-122.5185],["Marysville",48.0518,-122.1771],["Olympia",47.0379,-122.9007],["Pasco",46.2396,-119.1006],["Redmond",47.674,-122.1215],["Renton",47.4829,-122.2171],["Richland",46.2857,-119.2845],["Sammamish",47.6418,-122.0804],["Seattle",47.6062,-122.3321],["Shoreline",47.7557,-122.3415],["South Hill",47.1412,-122.2701],["Spokane",47.6597,-117.4291],["Spokane Valley",47.6732,-117.2394],["Tacoma",47.2529,-122.4443],["Vancouver",45.6387,-122.6615],["West Lake Sammamish",47.5776,-122.1012],["West Richland",46.3043,-119.3614],["Yakima",46.6021,-120.5059]],
    "Wisconsin": [["Appleton",44.2619,-88.4154],["Eau Claire",44.8114,-91.4985],["Green Bay",44.5192,-88.0198],["Janesville",42.6828,-89.0187],["Kenosha",42.5847,-87.8212],["La Crosse",43.8014,-91.2396],["Madison",43.0731,-89.4012],["Milwaukee",43.0389,-87.9065],["North La Crosse",43.8464,-91.2482],["Oshkosh",44.0247,-88.5426],["Racine",42.7261,-87.7828],["South Milwaukee",42.9106,-87.8606],["Waukesha",43.0117,-88.2315],["West Allis",43.0167,-88.007]],
    "Wyoming": [["Casper",42.8666,-106.3131],["Cheyenne",41.14,-104.8202]]
  },
  "Guatemala": {
    "Alta Verapaz": [["Cobán",15.4708,-90.3708]],
    "Chimaltenango": [["Chimaltenango",14.6611,-90.8194]],
    "Escuintla": [["Escuintla",14.305,-90.785],["Santa Lucía Cotzumalguapa",14.3351,-91.0234]],
    "Guatemala": [["Amatitlán",14.4774,-90.6349],["Chinautla",14.7029,-90.4998],["Guatemala City",14.6407,-90.5133],["Mixco",14.6308,-90.6071],["Petapa",14.5019,-90.562],["San José Pinula",14.546,-90.4129],["San Juan Sacatepéquez",14.7189,-90.6442],["San Pedro Sacatepéquez",14.6861,-90.6425],["Santa Catarina Pinula",14.5705,-90.4992],["Villa Canales",14.4829,-90.5342],["Villa Nueva",14.5251,-90.5854]],
    "Huehuetenango": [["Huehuetenango",15.3192,-91.4724],["San Sebastián Huehuetenango",15.3877,-91.6153]],
    "Izabal": [["Municipio de Puerto Barrios",15.7175,-88.5852],["Puerto Barrios",15.7278,-88.5944]],
    "Quetzaltenango": [["Quetzaltenango",14.8347,-91.5181],["San Francisco la Unión",14.9235,-91.5416]],
    "Quiché": [["Chichicastenango",14.9433,-91.1112],["Municipio de Chichicastenango",14.892,-91.0881]],
    "Sacatepéquez": [["Municipio de Santa Lucía Milpas Altas",14.5675,-90.6755],["San Lucas Sacatepéquez",14.6108,-90.6568],["Santa Lucía Milpas Altas",14.5766,-90.6763],["Santiago Sacatepéquez",14.6351,-90.6765]],
    "Totonicapán": [["Municipio de Totonicapán",14.9019,-91.32],["San Cristóbal Totonicapán",14.9168,-91.4406],["San Francisco El Alto",14.9449,-91.4431],["Totonicapán",14.9117,-91.3611]]
  },
  "Honduras": {
    "Atlántida": [["La Ceiba",15.7597,-86.7822]],
    "Choluteca": [["Choluteca",13.2826,-87.2012],["Ciudad Choluteca",13.3003,-87.1908]],
    "Comayagua": [["Comayagua",14.4841,-87.6006]],
    "Cortés": [["Choloma",15.64,-87.92],["San Pedro Sula",15.5042,-88.025]],
    "Francisco Morazán": [["Tegucigalpa",14.0818,-87.2068]],
    "Yoro": [["El Progreso",15.4276,-87.774]]
  },
  "México": {
    "Aguascalientes": [["Aguascalientes",21.8808,-102.2961]],
    "Baja California": [["Ensenada",31.8661,-116.5964],["Mexicali",32.636,-115.4759],["Tijuana",32.5364,-117.0372]],
    "Baja California Sur": [["Cabo San Lucas",22.8905,-109.9167],["La Paz",24.1426,-110.3128]],
    "Campeche": [["Campeche",19.8301,-90.5349]],
    "Chiapas": [["Tuxtla Gutiérrez",16.7528,-93.1152]],
    "Chihuahua": [["Chihuahua",28.6353,-106.0889],["Ciudad Juárez",31.6685,-106.42],["Delicias",28.1903,-105.4711],["Nuevo Casas Grandes",30.4167,-107.9167],["Parral",26.9333,-105.6667]],
    "Ciudad de México": [["Ciudad de México",19.4326,-99.1332]],
    "Coahuila": [["Monclova",26.9069,-101.4203],["Piedras Negras",28.7,-100.5231],["Saltillo",25.4231,-100.9919],["Torreón",25.5428,-103.4068]],
    "Colima": [["Colima",19.2433,-103.7247],["Manzanillo",19.1138,-104.3385]],
    "Durango": [["Gómez Palacio",25.5667,-103.5],["Lerdo",25.5333,-103.5333],["Victoria de Durango",24.0277,-104.6532]],
    "Estado de México": [["Toluca",19.2922,-99.6539]],
    "Guanajuato": [["Acámbaro",20.0333,-100.7167],["Celaya",20.5235,-100.8157],["Cortazar",20.4833,-100.9333],["Dolores Hidalgo",21.15,-100.9333],["Guanajuato",21.019,-101.2574],["Irapuato",20.6767,-101.3563],["León de los Aldama",21.1219,-101.6833],["Salamanca",20.5667,-101.2],["San Francisco del Rincón",21.0167,-101.85],["San Miguel de Allende",20.9144,-100.7431],["Silao",20.9333,-101.4167],["Uriangato",20.15,-101.1667],["Valle de Santiago",20.3833,-101.1833]],
    "Guerrero": [["Acapulco de Juárez",16.8531,-99.8237],["Chilpancingo de los Bravo",17.551,-99.5]],
    "Hidalgo": [["Pachuca de Soto",20.1011,-98.7591]],
    "Jalisco": [["Ciudad Guzmán",19.7,-103.4667],["Guadalajara",20.6764,-103.3422],["Lagos de Moreno",21.35,-101.9167],["Puerto Vallarta",20.6534,-105.2253],["Tepatitlán de Morelos",20.8167,-102.7333],["Zapopan",20.7208,-103.3911]],
    "Michoacán": [["Morelia",19.706,-101.195]],
    "Morelos": [["Cuernavaca",18.9242,-99.2216]],
    "Nayarit": [["Tepic",21.5039,-104.8945]],
    "Nuevo León": [["Monterrey",25.6844,-100.3181]],
    "Oaxaca": [["Oaxaca de Juárez",17.0732,-96.7266]],
    "Puebla": [["Puebla",19.0413,-98.2062]],
    "Querétaro": [["Santiago de Querétaro",20.5888,-100.3899]],
    "Quintana Roo": [["Cancún",21.1614,-86.8248],["Chetumal",18.5001,-88.2961]],
    "San Luis Potosí": [["San Luis Potosí",22.1497,-100.975]],
    "Sinaloa": [["Culiacán Rosales",24.809,-107.394],["Los Mochis",25.79,-108.98],["Mazatlán",23.2494,-106.4111]],
    "Sonora": [["Ciudad Obregón",27.4833,-109.9333],["Hermosillo",29.075,-110.9583],["Nogales",31.3086,-110.9422]],
    "Tabasco": [["Villahermosa",17.9892,-92.9475]],
    "Tamaulipas": [["Heroica Matamoros",25.8698,-97.5027],["Nuevo Laredo",27.4767,-99.5164],["Reynosa",26.0922,-98.2779],["Tampico",22.2331,-97.8611]],
    "Tlaxcala": [["Tlaxcala de Xicohténcatl",19.3182,-98.237]],
    "Veracruz": [["Veracruz",19.1738,-96.1342],["Xalapa",19.5438,-96.9102]],
    "Yucatán": [["Mérida",20.9674,-89.5926]],
    "Zacatecas": [["Fresnillo",23.1833,-102.8667],["Zacatecas",22.7709,-102.5832]]
  }
};
// Guardar la ciudad como "Ciudad, Estado" (valor único: evita choques entre ciudades con el mismo nombre).
// Déjalo en false hasta correr la migración de datos (migrarCiudadesConEstado); entonces cámbialo a true y despliega.
const CIUDAD_CON_ESTADO = true;
window.ZNR_CIUDADES = [];
function _agregarCiudades(datos) {
  for (const [pais, estados] of Object.entries(datos))
    for (const [estado, cs] of Object.entries(estados))
      for (const [nombre, lat, lng] of cs) window.ZNR_CIUDADES.push({ pais, estado, nombre, ciudad: CIUDAD_CON_ESTADO ? `${nombre}, ${estado}` : nombre, lat, lng });
}
_agregarCiudades(_ZNR_DATOS);

// Las ciudades chicas (ciudades-extra.js) se cargan una sola vez y solo cuando hacen falta. Sin conexión
// se queda con las grandes y lo vuelve a intentar la próxima vez.
let _extra = null;
window.cargarCiudadesExtra = () => _extra ||= new Promise((listo) => {
  const s = document.createElement('script');
  s.src = 'ciudades-extra.js';
  s.onload = () => { _agregarCiudades(window._ZNR_DATOS_EXTRA || {}); listo(); };
  s.onerror = () => { _extra = null; s.remove(); listo(); };
  document.head.appendChild(s);
});

// Pasa un valor guardado (con o sin estado) al formato vigente; si no lo reconoce o es ambiguo, lo deja igual.
window.normalizarCiudad = v => {
  const t = window.ZNR_CIUDADES.filter(c => [c.ciudad, c.nombre + ', ' + c.estado, c.nombre].includes(v));
  return t.length === 1 ? t[0].ciudad : v;
};
// La ciudad que el comprador ya tenía guardada se actualiza una vez y se recarga para que nada lea el valor viejo.
// Si es una ciudad chica, primero se cargan las extra y se avisa ('znr:ciudad') para que el clima use sus coordenadas.
{
  const migrar = () => { const b = localStorage.getItem('buyer_ciudad'), n = b && normalizarCiudad(b); if (n && n !== b) { localStorage.setItem('buyer_ciudad', n); location.reload(); } };
  const b = localStorage.getItem('buyer_ciudad');
  if (b && !window.ZNR_CIUDADES.some(c => c.ciudad === normalizarCiudad(b)))
    window.cargarCiudadesExtra().then(() => { migrar(); window.dispatchEvent(new CustomEvent('znr:ciudad', { detail: { ciudad: b } })); });
  else migrar();
}


// Llena un <select> de país con los países únicos de la lista de arriba.
function llenarSelectPais(select) {
  const paises = [...new Set(window.ZNR_CIUDADES.map(c => c.pais))];
  select.innerHTML = '<option value="">Selecciona un país</option>' +
    paises.map(p => `<option value="${p}">${p}</option>`).join('');
}

// Llena un <select> de estado con los estados del país dado (sin país: solo el placeholder).
function llenarSelectEstado(select, pais) {
  const estados = [...new Set(window.ZNR_CIUDADES.filter(c => c.pais === pais).map(c => c.estado))].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = '<option value="">Selecciona un estado</option>' + estados.map(e => `<option value="${e}">${e}</option>`).join('');
}

// Llena un <select> de ciudad con las ciudades del país (y del estado, si se pasa; estado '' = ninguna todavía).
function llenarSelectCiudad(select, pais, estado) {
  const ciudades = window.ZNR_CIUDADES.filter(c => c.pais === pais && (estado === undefined || c.estado === estado)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  select.innerHTML = '<option value="">Selecciona una ciudad</option>' +
    ciudades.map(c => `<option value="${c.ciudad}">${c.nombre}</option>`).join('');
}

// Enlaza país→estado→ciudad. El select de estado se crea solo, justo antes del de ciudad (hereda clase y estilo del de país).
function enlazarPaisCiudad(selectPais, selectCiudad) {
  const selectEstado = selectCiudad._estado = document.createElement('select');
  selectEstado.className = selectPais.className.replace(/\bznr-sel-real\b/g, '').trim(); // sin la clase que oculta el select ya mejorado
  selectEstado.style.cssText = selectPais.style.cssText;
  const grupo = selectCiudad.closest('.field-group'), lbl = grupo && grupo.querySelector(':scope > label');
  if (grupo && lbl) {
    // Formulario con campos etiquetados (p. ej. registro de vendedor): el estado va en su propio campo "Estado *", antes del de ciudad.
    const g = grupo.cloneNode(false);
    g.removeAttribute('id');
    const l = lbl.cloneNode(true);
    l.textContent = 'Estado *';
    g.append(l, selectEstado);
    grupo.before(g);
  } else {
    selectEstado.style.marginBottom = '10px';
    // Si el select de ciudad ya tiene su botón de znr-select.js, el estado debe quedar ANTES de ese botón (no entre el botón y su select).
    const ant = selectCiudad.previousElementSibling;
    (ant && ant.classList.contains('znr-sel-btn') ? ant : selectCiudad).before(selectEstado);
  }
  llenarSelectPais(selectPais);
  llenarSelectEstado(selectEstado, '');
  llenarSelectCiudad(selectCiudad, '', '');
  selectPais.addEventListener('change', () => {
    llenarSelectEstado(selectEstado, selectPais.value);
    llenarSelectCiudad(selectCiudad, selectPais.value, '');
  });
  selectEstado.addEventListener('change', () => llenarSelectCiudad(selectCiudad, selectPais.value, selectEstado.value));
  window.cargarCiudadesExtra().then(() => {
    const [p, e, c] = [selectPais.value, selectEstado.value, selectCiudad.value];
    llenarSelectPais(selectPais); selectPais.value = p;
    llenarSelectEstado(selectEstado, p); selectEstado.value = e;
    llenarSelectCiudad(selectCiudad, p, e); selectCiudad.value = c;
  });
}

// Rellena los selects enlazados con un país/ciudad ya conocidos (el estado sale de la lista).
function fijarUbicacion(selectPais, selectCiudad, pais, ciudad) {
  const c = window.ZNR_CIUDADES.find(x => x.pais === pais && x.ciudad === normalizarCiudad(ciudad));
  selectPais.value = pais;
  selectPais.dispatchEvent(new Event('change'));
  // Ciudad chica: se vuelve a fijar en cuanto llegan las ciudades extra.
  if (!c) return void window.cargarCiudadesExtra().then(() => window.ZNR_CIUDADES.some(x => x.pais === pais && x.ciudad === normalizarCiudad(ciudad)) && fijarUbicacion(selectPais, selectCiudad, pais, ciudad));
  selectCiudad._estado.value = c.estado;
  selectCiudad._estado.dispatchEvent(new Event('change'));
  selectCiudad.value = c.ciudad;
}

// Enlaza estado→ciudad sin select de país (listas que abarcan todo): al elegir estado, la ciudad lista solo las de ese estado.
// El placeholder de la ciudad tiene value '' (p. ej. "Todas"); cambiar el estado reinicia la ciudad y avisa con 'change'.
function enlazarEstadoCiudad(selectEstado, selectCiudad, placeholderCiudad = 'Selecciona una ciudad') {
  const cs = window.ZNR_CIUDADES, estados = [...new Set(cs.map(c => c.estado))].sort((a, b) => a.localeCompare(b, 'es'));
  selectEstado.innerHTML = '<option value="">Todos los estados</option>' + estados.map(e => `<option>${e}</option>`).join('');
  const llenar = () => selectCiudad.innerHTML = `<option value="">${placeholderCiudad}</option>` +
    cs.filter(c => c.estado === selectEstado.value).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(c => `<option value="${c.ciudad}">${c.nombre}</option>`).join('');
  selectEstado.addEventListener('change', () => { llenar(); selectCiudad.dispatchEvent(new Event('change')); });
  llenar();
}

// Distancia en km entre dos coordenadas (fórmula de Haversine).
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ciudadMasCercana(lat, lng) {
  return window.ZNR_CIUDADES.reduce((mejor, c) =>
    distanciaKm(lat, lng, c.lat, c.lng) < distanciaKm(lat, lng, mejor.lat, mejor.lng) ? c : mejor
  ).ciudad;
}

// ---------- Elegir y confirmar la ciudad ----------
// Regla: la ciudad define qué artículos ve el comprador, así que NADA queda como "confirmada" sin un "Sí"
// explícito en el mensaje de confirmación, venga de donde venga: del select, de "Usar mi ubicación" o de la
// ciudad que adivinó la IP. El permiso de ubicación del navegador solo se pide si el comprador toca "Usar mi ubicación".
const _escCiudad = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

function _capaCiudad() {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
  document.body.appendChild(ov);
  return ov;
}
const _tarjetaCiudad = 'background:#fff;color:#222;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);padding:20px;width:100%;max-width:340px;font-size:14px;box-sizing:border-box;';
const _btnCiudad = (a, t, primario) => `<button type="button" data-a="${a}" style="display:block;width:100%;margin-top:8px;padding:11px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;${primario ? 'border:none;background:#1a1a1a;color:#fff;' : 'border:1px solid #bbb;background:#fff;color:#222;'}">${t}</button>`;

// Selector país→estado→ciudad. Al elegir la ciudad solo la entrega (resolve): quien llama decide cómo confirmarla.
// cancelable: muestra "Cancelar" (resolve(null)) para volver al mensaje de confirmación.
function mostrarSelectorCiudad(resolve, opciones = {}) {
  const ov = _capaCiudad();
  ov.innerHTML = `<div style="${_tarjetaCiudad}"><div style="margin-bottom:10px;font-weight:700;font-size:16px;">📍 Elige tu ciudad</div>
    <select id="chip-pais" style="width:100%;margin-bottom:6px;padding:8px;border-radius:8px;"></select>
    <select id="chip-ciudad-sel" style="width:100%;padding:8px;border-radius:8px;"></select>
    ${opciones.cancelable ? _btnCiudad('cancelar', 'Cancelar', false) : ''}</div>`;
  const selPais = ov.querySelector('#chip-pais'), selCiudad = ov.querySelector('#chip-ciudad-sel');
  enlazarPaisCiudad(selPais, selCiudad);
  selCiudad.addEventListener('change', () => {
    if (!selCiudad.value) return;
    ov.remove();
    resolve(selCiudad.value);
  });
  ov.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.a === 'cancelar') { ov.remove(); resolve(null); } });
}

// Mensaje de confirmación. Devuelve 'ok' | 'gps' | 'otra'. No se cierra tocando fuera: hay que decidir.
// via: 'ip' (la adivinó el servidor) | 'select' (la eligió en la lista) | 'gps' (su ubicación actual).
function modalConfirmarCiudad(ciudad, via, aviso) {
  return new Promise((resolve) => {
    const ov = _capaCiudad();
    ov.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="zc-titulo" style="${_tarjetaCiudad}">
      <div id="zc-titulo" style="font-weight:700;font-size:17px;margin-bottom:8px;">📍 Confirma tu ciudad</div>
      <p style="margin:0;line-height:1.5;">Únicamente se mostrarán artículos de <b>${_escCiudad(ciudad)}</b>. ¿Es correcta?</p>
      ${aviso ? `<p style="margin:8px 0 0;color:#c62828;font-size:12px;">${_escCiudad(aviso)}</p>` : ''}
      ${_btnCiudad('ok', 'Sí, es correcta', true)}
      ${via === 'gps' ? '' : _btnCiudad('gps', '📡 Usar mi ubicación', false)}
      ${_btnCiudad('otra', 'Elegir otra ciudad', false)}</div>`;
    ov.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a) { ov.remove(); resolve(a); }
    });
  });
}

// Ubicación actual del navegador → { lat, lng, ciudad } (la ciudad de la lista más cercana), o null si no hay permiso/señal.
function ubicacionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => window.cargarCiudadesExtra().then(() => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, ciudad: ciudadMasCercana(p.coords.latitude, p.coords.longitude) })),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 });
  });
}

// Guarda la ciudad ya confirmada y avisa a la página ('znr:ciudad': el clima de Outfit, por ejemplo, se actualiza solo).
function _guardarCiudadConfirmada(ciudad, via, coords) {
  localStorage.setItem('buyer_ciudad', ciudad);
  localStorage.setItem('buyer_ciudad_ok', '1');
  // Las coordenadas solo se guardan si vinieron de "Usar mi ubicación"; se quedan en este navegador.
  if (via === 'gps' && coords) localStorage.setItem('buyer_coords', JSON.stringify({ ciudad, lat: coords.lat, lng: coords.lng }));
  else localStorage.removeItem('buyer_coords');
  actualizarWaFlotante(true);
  window.dispatchEvent(new CustomEvent('znr:ciudad', { detail: { ciudad } }));
}

// Bucle de confirmación: sigue hasta que el comprador diga "Sí" a una ciudad. Devuelve la ciudad confirmada.
async function confirmarCiudad(ciudad, via, coords) {
  let aviso = '';
  for (;;) {
    const r = await modalConfirmarCiudad(ciudad, via, aviso);
    aviso = '';
    if (r === 'ok') { _guardarCiudadConfirmada(ciudad, via, coords); return ciudad; }
    if (r === 'gps') {
      const u = await ubicacionActual();
      if (u) { ciudad = u.ciudad; coords = u; via = 'gps'; }
      else aviso = 'No pudimos obtener tu ubicación. Confirma esta ciudad o elige otra.';
      continue;
    }
    const otra = await new Promise((res) => mostrarSelectorCiudad(res, { cancelable: true }));
    if (otra) { ciudad = otra; via = 'select'; coords = null; }
  }
}

// Ciudad del comprador: localStorage → ciudad aproximada por IP contra catalogo-api (sin pedir permiso de
// ubicación) → selector manual (con confirmación) si no se pudo resolver. Varias llamadas a la vez comparten el mismo trámite.
let _ciudadPendiente = null;
function obtenerCiudadComprador() {
  const guardada = localStorage.getItem('buyer_ciudad');
  if (guardada) return Promise.resolve(guardada);
  if (_ciudadPendiente) return _ciudadPendiente;
  const p = new Promise((resolve) => {
    const manual = () => mostrarSelectorCiudad((c) => confirmarCiudad(c, 'select').then(resolve));
    fetch(window.CATALOGO_API_URL + '?action=ciudadPorIp')
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.ok || !data.encontrado) { manual(); return; }
        const ciudad = ciudadMasCercana(data.lat, data.lng);
        localStorage.setItem('buyer_ciudad', ciudad); // provisional: sigue sin confirmar (buyer_ciudad_ok)
        actualizarWaFlotante(true);
        window.dispatchEvent(new CustomEvent('znr:ciudad', { detail: { ciudad } }));
        resolve(ciudad);
      })
      .catch(manual);
  });
  _ciudadPendiente = p;
  p.finally(() => { _ciudadPendiente = null; });
  return p;
}

// La IP solo adivina: hasta que el comprador confirma se le muestra el mensaje de confirmación.
window.ciudadConfirmada = () => localStorage.getItem('buyer_ciudad_ok') === '1';
let _confirmando = null;
function mostrarConfirmacionCiudad() {
  const ciudad = localStorage.getItem('buyer_ciudad');
  if (!ciudad || window.ciudadConfirmada()) return Promise.resolve();
  if (_confirmando) return _confirmando;
  // Si cambia de ciudad, la página ya cargó con la adivinada: se recarga para que todo lea la nueva.
  _confirmando = confirmarCiudad(ciudad, 'ip').then((nueva) => { if (nueva !== ciudad) location.reload(); });
  _confirmando.finally(() => { _confirmando = null; });
  return _confirmando;
}
window.pedirConfirmarCiudad = () => {
  obtenerCiudadComprador().then(mostrarConfirmacionCiudad);
  if (window.showTemporaryMessage) window.showTemporaryMessage('Confirma tu ciudad para continuar', 'error');
};
// Páginas de compra (filtran artículos por ciudad): al entrar por primera vez piden confirmar la ciudad.
if (/^\/(index\.html|catalogo\.html|comunidad\.html|outfit\.html|armar-outfit\.html)?$/.test(location.pathname)) obtenerCiudadComprador().then(mostrarConfirmacionCiudad);

// Pinta en el botón flotante el WhatsApp del admin de la ciudad del comprador (lo resuelve api-config.js; sin admin, el Master).
// `recargar` = true cuando el comprador cambia de ciudad y hay que volver a leerlo.
async function actualizarWaFlotante(recargar) {
  await (recargar ? window.waActualizar?.() : window.waListo);
  if (window._waAdmin) document.querySelectorAll('.floating-wa').forEach(a => a.href = 'https://wa.me/' + window._waAdmin);
}
actualizarWaFlotante();
