(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r13';

  const sources = Object.freeze({
    ics: { label: 'International Commission on Stratigraphy', url: 'https://stratigraphy.org/chart/', role: 'Formal geological intervals and current boundary ages', license: 'CC BY 4.0' },
    gplates: { label: 'GPlates model documentation', url: 'https://gwsdoc.gplates.org/models/', role: 'Pinned plate-reconstruction geometry and model limits' },
    pbdb: { label: 'Paleobiology Database', url: 'https://paleobiodb.org/', role: 'Fossil occurrence evidence' },
    nasaMoon: { label: 'NASA Moon formation science', url: 'https://science.nasa.gov/moon/formation/', role: 'Planetary formation synthesis' },
    nasaEarth: { label: 'NASA Earth science', url: 'https://science.nasa.gov/earth/', role: 'Observed Earth and planetary science' },
    nasaAstrobiology: { label: 'NASA Astrobiology', url: 'https://astrobiology.nasa.gov/', role: 'Early life and habitability synthesis' },
    smithsonian: { label: 'Smithsonian Human Origins Program', url: 'https://humanorigins.si.edu/evidence/human-evolution-interactive-timeline', role: 'Human evolution, behavior, and environment' },
    periodo: { label: 'PeriodO', url: 'https://perio.do/', role: 'Scholarly period definitions', license: 'Public domain data' },
    pleiades: { label: 'Pleiades', url: 'https://pleiades.stoa.org/', role: 'Ancient places, names, and temporal attestations', license: 'CC BY 3.0' },
    whg: { label: 'World Historical Gazetteer', url: 'https://whgazetteer.org/', role: 'Historical place names and linked geographic records' },
    britishMuseum: { label: 'British Museum', url: 'https://www.britishmuseum.org/', role: 'Archaeological and historical synthesis' },
    met: { label: 'Met Timeline of Art History', url: 'https://www.metmuseum.org/toah/', role: 'Reviewed global art-historical essays' },
    unescoSilkRoads: { label: 'UNESCO Silk Roads Programme', url: 'https://www.unesco.org/en/silkroads', role: 'Interregional exchange and cultural transmission' },
    nasaApollo: { label: 'NASA Apollo 11', url: 'https://www.nasa.gov/mission/apollo-11/', role: 'Observed spaceflight history' }
  });

  const chapters = [
    {
      id: 'earth-formation', timeline: 'earth', olderMa: 4567.3, youngerMa: 4000, anchorMa: 4510,
      title: 'A planet takes shape', aliases: ['Hadean', 'formation of Earth', 'origin of the Moon'],
      dek: 'Earth, the Moon, oceans, crust, and atmosphere emerged from a violent young Solar System.',
      overview: 'The Hadean is reconstructed from planetary physics, geochemistry, meteorites, lunar evidence, and a sparse mineral record. It should look evocative but explicitly schematic because no recoverable global map survives.',
      changes: ['Earth differentiated into core, mantle, and crust.', 'A giant impact is the leading explanation for the Moon.', 'Cooling, volcanism, impacts, and water created the earliest long-lived surface environments.'],
      moments: [
        { timeMa: 4567.3, title: 'Earth begins forming', summary: 'Dust and rock accreted into a differentiated planet.' },
        { timeMa: 4510, title: 'Moon-forming era', summary: 'A giant impact is the leading model for the Moon’s origin.' },
        { timeMa: 4400, title: 'Early crust and water', summary: 'Ancient zircons indicate crust and liquid water may have existed very early.' }
      ],
      themes: ['planet formation', 'Moon', 'early oceans', 'volcanism'], confidence: 'Schematic planetary reconstruction', sourceIds: ['ics', 'nasaMoon', 'nasaEarth']
    },
    {
      id: 'earth-microbial', timeline: 'earth', olderMa: 4000, youngerMa: 2500, anchorMa: 3500,
      title: 'The microbial planet', aliases: ['Archean', 'early life', 'microbial Earth'],
      dek: 'Oceans, early continents, and microbial ecosystems defined most of the Archean world.',
      overview: 'Ancient crust, sediments, isotopes, and debated fossils preserve evidence of a planet dominated by microbial life. Oceans and volcanism are better supported than any precise global coastline.',
      changes: ['Stable pieces of continental crust became more common.', 'Microbial life altered local environments and chemical cycles.', 'The atmosphere contained little free oxygen compared with today.'],
      moments: [
        { timeMa: 3800, title: 'Persistent oceans', summary: 'Sedimentary and isotopic evidence supports long-lived surface water.' },
        { timeMa: 3500, title: 'Established microbial ecosystems', summary: 'Multiple forms of evidence document widespread microbial life.' },
        { timeMa: 2700, title: 'Expanding photosynthesis', summary: 'Oxygen-producing photosynthesis prepared later atmospheric change.' }
      ],
      themes: ['microbial life', 'early continents', 'oceans', 'atmosphere'], confidence: 'Evidence constrained, geography highly uncertain', sourceIds: ['ics', 'nasaAstrobiology', 'gplates', 'pbdb']
    },
    {
      id: 'earth-oxygen', timeline: 'earth', olderMa: 2500, youngerMa: 1000, anchorMa: 2400,
      title: 'Oxygen changes the planet', aliases: ['Great Oxidation Event', 'Paleoproterozoic', 'Mesoproterozoic'],
      dek: 'Atmospheric oxygen rose, ocean chemistry changed, and increasingly complex cells inhabited long-lived continents.',
      overview: 'The Great Oxidation Event transformed surface chemistry over a long transition. Later in the interval, eukaryotic organisms diversified while continental blocks assembled, collided, and separated.',
      changes: ['Oxygen accumulated in the atmosphere and surface ocean.', 'Iron, sulfur, and carbon cycles changed.', 'Eukaryotic cells became increasingly important.'],
      moments: [
        { timeMa: 2400, title: 'Great Oxidation Event', summary: 'Atmospheric oxygen rose dramatically over an extended transition.' },
        { timeMa: 1800, title: 'Large continental assembly', summary: 'Continental blocks formed long-lived configurations such as Nuna or Columbia.' },
        { timeMa: 1200, title: 'Diversifying eukaryotes', summary: 'Fossils document increasingly complex cellular life.' }
      ],
      themes: ['oxygen', 'eukaryotes', 'continental assembly', 'ocean chemistry'], confidence: 'Strong geochemical evidence, model-dependent geography', sourceIds: ['ics', 'nasaAstrobiology', 'gplates', 'pbdb']
    },
    {
      id: 'earth-snowball', timeline: 'earth', olderMa: 1000, youngerMa: 538.8, anchorMa: 720,
      title: 'Rodinia, global ice, and complex life', aliases: ['Neoproterozoic', 'Snowball Earth', 'Ediacaran'],
      dek: 'A supercontinent broke apart, severe glaciations occurred, and large multicellular organisms expanded.',
      overview: 'Rodinia fragmented, Cryogenian ice ages may have reached low latitudes, and Ediacaran ecosystems preceded the Cambrian radiation. Paleogeography and the completeness of global ice remain debated.',
      changes: ['Rodinia broke apart and new ocean basins opened.', 'Cryogenian glaciations transformed climate and ocean chemistry.', 'Large multicellular organisms became widespread in Ediacaran seas.'],
      moments: [
        { timeMa: 1000, title: 'Rodinia', summary: 'Most continental blocks were assembled into a supercontinent.' },
        { timeMa: 720, title: 'Cryogenian glaciations', summary: 'Severe ice ages may have covered much of the planet.' },
        { timeMa: 575, title: 'Ediacaran communities', summary: 'Large soft-bodied organisms formed distinctive marine ecosystems.' }
      ],
      themes: ['Rodinia', 'Snowball Earth', 'Ediacaran life', 'glaciation'], confidence: 'Evidence constrained with competing climate and paleogeographic models', sourceIds: ['ics', 'gplates', 'pbdb']
    },
    {
      id: 'earth-paleozoic', timeline: 'earth', olderMa: 538.8, youngerMa: 358.9, anchorMa: 420,
      title: 'Life moves from sea to land', aliases: ['Cambrian explosion', 'Ordovician', 'Silurian', 'Devonian', 'Age of Fishes'],
      dek: 'Marine ecosystems diversified, reefs expanded, forests appeared, and vertebrates began entering land environments.',
      overview: 'The early Paleozoic began with a major expansion of marine animal diversity. Over time, plants and arthropods established terrestrial ecosystems, forests altered rivers and soils, and early tetrapods emerged from aquatic vertebrate lineages.',
      changes: ['Predation and reefs reshaped ocean food webs.', 'Plants created soils and increasingly complex land habitats.', 'Fishes diversified and four-limbed vertebrates appeared.'],
      moments: [
        { timeMa: 538.8, title: 'Cambrian begins', summary: 'The fossil record shows a major expansion of marine animal diversity.' },
        { timeMa: 470, title: 'Plants colonize land', summary: 'Simple plants began changing soils, weathering, and the carbon cycle.' },
        { timeMa: 385, title: 'First forests', summary: 'Tree-sized plants created vertically complex terrestrial ecosystems.' },
        { timeMa: 370, title: 'Early tetrapods', summary: 'Four-limbed vertebrates appear in the fossil record.' }
      ],
      themes: ['marine life', 'reefs', 'land plants', 'forests', 'fish', 'tetrapods'], confidence: 'High interval confidence, fossil preservation uneven by region', sourceIds: ['ics', 'pbdb', 'gplates']
    },
    {
      id: 'earth-pangea', timeline: 'earth', olderMa: 358.9, youngerMa: 251.902, anchorMa: 280,
      title: 'Forests, Pangea, and the Permian crisis', aliases: ['Carboniferous', 'Permian', 'Pangea', 'Great Dying'],
      dek: 'Coal forests and continental collision assembled Pangea, whose dry interior preceded Earth’s most severe known extinction.',
      overview: 'Wet equatorial forests accumulated carbon while early reptiles diversified. As Pangea assembled, continental interiors became increasingly seasonal and arid. The interval ended with cascading volcanic, climatic, oceanic, and ecological disruption.',
      changes: ['Wetland forests stored immense amounts of carbon.', 'Continental collision assembled Pangea.', 'Drought-tolerant plants and vertebrates expanded before mass extinction.'],
      moments: [
        { timeMa: 340, title: 'Coal forests expand', summary: 'Wetland forests dominated broad equatorial lowlands.' },
        { timeMa: 305, title: 'Pangea nears assembly', summary: 'Continental collisions closed oceans and raised mountains.' },
        { timeMa: 280, title: 'Dry Pangean interiors', summary: 'Seasonal and arid environments expanded far from the ocean.' },
        { timeMa: 251.902, title: 'End-Permian extinction', summary: 'The most severe known mass extinction reorganized life.' }
      ],
      themes: ['coal forests', 'Pangea', 'early reptiles', 'synapsids', 'mass extinction'], confidence: 'Model constrained with strong regional fossil and extinction evidence', sourceIds: ['ics', 'pbdb', 'gplates']
    },
    {
      id: 'earth-mesozoic-rise', timeline: 'earth', olderMa: 251.902, youngerMa: 145, anchorMa: 190,
      title: 'Recovery and the rise of dinosaurs', aliases: ['Triassic', 'Jurassic', 'first dinosaurs', 'first mammals'],
      dek: 'Ecosystems rebuilt after catastrophe as dinosaurs, mammals, pterosaurs, marine reptiles, and early birds emerged.',
      overview: 'Recovery from the end-Permian extinction was uneven. Pangea’s seasonal climates supported many competing reptile lineages before rifting and another extinction helped dinosaurs expand. Jurassic seas and separated landmasses later supported distinctive ecosystems.',
      changes: ['Food webs rebuilt after the end-Permian crisis.', 'Dinosaurs, early mammals, and pterosaurs appeared.', 'Pangea began separating into northern and southern landmasses.'],
      moments: [
        { timeMa: 247, title: 'Early Triassic recovery', summary: 'Food webs slowly rebuilt after the end-Permian crisis.' },
        { timeMa: 233, title: 'First dinosaurs', summary: 'Early dinosaurs appear among diverse archosaur communities.' },
        { timeMa: 201.4, title: 'End-Triassic extinction', summary: 'Volcanism and climate disruption cleared ecological space.' },
        { timeMa: 150, title: 'Early birds', summary: 'Feathered dinosaur fossils document the origin of birds.' }
      ],
      themes: ['Triassic', 'Jurassic', 'dinosaurs', 'mammals', 'birds', 'Pangea breakup'], confidence: 'Model constrained, fossil record regionally uneven', sourceIds: ['ics', 'pbdb', 'gplates']
    },
    {
      id: 'earth-cretaceous', timeline: 'earth', olderMa: 145, youngerMa: 66, anchorMa: 100,
      title: 'Flowering plants and separated continents', aliases: ['Cretaceous', 'dinosaurs', 'inland seas', 'asteroid impact'],
      dek: 'Continents approached modern positions, flowering plants spread, and high seas created broad shallow habitats.',
      overview: 'The Cretaceous combined greenhouse climate, fragmented continents, inland seas, flowering-plant diversification, and highly regional dinosaur communities. It ended with a well-supported asteroid impact and global ecological disruption.',
      changes: ['Flowering plants transformed terrestrial food webs.', 'High sea levels flooded continental interiors.', 'Regional isolation produced distinctive animal communities.'],
      moments: [
        { timeMa: 125, title: 'Flowering plants diversify', summary: 'Angiosperms became increasingly important in terrestrial ecosystems.' },
        { timeMa: 100, title: 'High Cretaceous seas', summary: 'Shallow seas covered broad continental regions.' },
        { timeMa: 66, title: 'End-Cretaceous extinction', summary: 'An asteroid impact ended non-avian dinosaur dominance.' }
      ],
      themes: ['flowering plants', 'dinosaurs', 'marine reptiles', 'inland seas', 'asteroid'], confidence: 'Model constrained with strong impact evidence', sourceIds: ['ics', 'pbdb', 'gplates']
    },
    {
      id: 'earth-mammals', timeline: 'earth', olderMa: 66, youngerMa: 2.58, anchorMa: 20,
      title: 'Mammals, grasslands, and modern ecosystems', aliases: ['Paleogene', 'Neogene', 'age of mammals', 'Miocene'],
      dek: 'Mammals and birds diversified, whales returned to the sea, grasslands expanded, and continents neared modern positions.',
      overview: 'The Cenozoic began warm and then cooled over tens of millions of years. India collided with Asia, Antarctica glaciated, grasslands expanded, and hominins evolved within variable African environments.',
      changes: ['Mammals and birds expanded into newly open ecological roles.', 'Ocean gateways and mountain building changed climate.', 'Grasslands and grazing ecosystems spread.'],
      moments: [
        { timeMa: 56, title: 'Rapid global warming', summary: 'Carbon release drove the Paleocene-Eocene Thermal Maximum.' },
        { timeMa: 50, title: 'Early whales and mammal diversification', summary: 'Many familiar mammal lineages were taking shape.' },
        { timeMa: 34, title: 'Antarctic glaciation begins', summary: 'Cooling enabled a major continental ice sheet.' },
        { timeMa: 7, title: 'Early hominins', summary: 'The human lineage emerged within changing African environments.' }
      ],
      themes: ['mammals', 'birds', 'whales', 'grasslands', 'hominins', 'climate'], confidence: 'High geological confidence, ecological detail uneven', sourceIds: ['ics', 'pbdb', 'gplates', 'smithsonian']
    },
    {
      id: 'earth-ice-human', timeline: 'earth', olderMa: 2.58, youngerMa: 0, anchorMa: 0.021,
      title: 'Ice ages and the human planet', aliases: ['Pleistocene', 'Ice Age', 'Holocene', 'Last Glacial Maximum'],
      dek: 'Glacial cycles moved coastlines and habitats while humans dispersed, farmed, built cities, and transformed the planet.',
      overview: 'Repeated glacial and interglacial cycles stored and released ocean water, exposing and flooding migration corridors. Multiple human species coexisted before Homo sapiens became the sole survivor. The Holocene then became the setting for nearly all recorded history.',
      changes: ['Ice sheets repeatedly advanced and retreated.', 'Sea-level change exposed and flooded land bridges.', 'Agriculture, cities, and industry accelerated human influence.'],
      moments: [
        { timeMa: 1.9, title: 'Homo erectus disperses', summary: 'Long-legged humans expanded beyond Africa.' },
        { timeMa: 0.3, title: 'Homo sapiens', summary: 'Early members of our species appear in Africa.' },
        { timeMa: 0.021, title: 'Last Glacial Maximum', summary: 'Large ice sheets lowered sea level and reshaped ecosystems.' },
        { timeMa: 0.0117, title: 'Holocene begins', summary: 'Warming and ice retreat moved coastlines toward modern positions.' }
      ],
      themes: ['ice ages', 'human evolution', 'sea level', 'migration', 'Holocene'], confidence: 'High recent-climate confidence, local details variable', sourceIds: ['ics', 'smithsonian', 'nasaEarth']
    },
    {
      id: 'human-origins', timeline: 'human', startYear: -300000, endYear: -100000, anchorYear: -250000,
      title: 'The emergence of Homo sapiens', aliases: ['origin of modern humans', 'early Homo sapiens'],
      dek: 'Our species developed within diverse African populations rather than appearing at one place in one instant.',
      overview: 'Fossils, archaeology, genetics, and environmental records point to a long, regionally structured emergence of Homo sapiens in Africa. The evidence does not support a simple single-birthplace story.',
      changes: ['Anatomically modern traits accumulated over time.', 'African populations remained connected while regionally diverse.', 'Tools and food strategies responded to unstable environments.'],
      moments: [
        { year: -300000, title: 'Early Homo sapiens', summary: 'Fossils attributed to early members of our species appear in Africa.' },
        { year: -250000, title: 'Regional African populations', summary: 'Human evolution involved connected populations across varied environments.' },
        { year: -160000, title: 'Expanding behavioral evidence', summary: 'More sites preserve complex tools, pigments, and resource use.' }
      ],
      regions: [{ name: 'Africa', center: [20, 5], zoom: 2.6, note: 'The evidence is distributed across the continent, not confined to one origin point.' }],
      themes: ['human origins', 'Africa', 'stone tools'], confidence: 'Fossil, archaeological, and genetic evidence expressed as ranges', sourceIds: ['smithsonian']
    },
    {
      id: 'human-dispersal-symbols', timeline: 'human', startYear: -100000, endYear: -20000, anchorYear: -45000,
      title: 'Dispersal, coexistence, and symbolic worlds', aliases: ['out of Africa', 'behavioral modernity', 'Upper Paleolithic'],
      dek: 'Humans expanded through Africa and Eurasia while adapting, interbreeding, and creating distinct symbolic traditions.',
      overview: 'Movement occurred in multiple waves, not one migration. Homo sapiens encountered Neanderthals, Denisovans, and other populations. Art, ornaments, clothing, specialized tools, and long-distance exchange became increasingly visible, partly because recent evidence preserves better.',
      changes: ['Multiple dispersals connected Africa and Eurasia.', 'Interbreeding linked human populations.', 'Regional art, tools, and symbols recorded dense social learning.'],
      moments: [
        { year: -100000, title: 'Early movements beyond Africa', summary: 'Modern humans reached southwest Asia in more than one episode.' },
        { year: -70000, title: 'Major dispersal phase', summary: 'Populations expanded through southern Asia and beyond.' },
        { year: -50000, title: 'People reach Sahul', summary: 'Humans crossed maritime barriers into Ice Age Australia and New Guinea.' },
        { year: -40000, title: 'Symbolic traditions expand', summary: 'Images, ornaments, and specialized tools become highly visible.' }
      ],
      regions: [
        { name: 'Northeast Africa and southwest Asia', center: [38, 22], zoom: 3.1, note: 'A major corridor for repeated movements.' },
        { name: 'South and Southeast Asia', center: [95, 12], zoom: 2.9, note: 'Coastal and inland routes remain active research questions.' }
      ],
      themes: ['migration', 'Neanderthals', 'Denisovans', 'art', 'technology'], confidence: 'Fossil, genetic, and archaeological evidence with debated route timing', sourceIds: ['smithsonian', 'met']
    },
    {
      id: 'human-ice-farming', timeline: 'human', startYear: -20000, endYear: -6000, anchorYear: -10000,
      title: 'From the late Ice Age to farming landscapes', aliases: ['Last Glacial Maximum', 'Neolithic', 'agricultural origins'],
      dek: 'Changing coasts and climates framed the peopling of new regions and independent experiments with cultivation and herding.',
      overview: 'Lower sea level exposed shelves and land bridges. As the climate warmed, communities intensified fishing, plant use, cultivation, and animal management in different combinations. There was no single worldwide Neolithic Revolution.',
      changes: ['Ice and sea level repeatedly changed migration corridors.', 'People entered and spread through the Americas over a complex timeline.', 'Plants and animals were domesticated independently in several regions.'],
      moments: [
        { year: -19000, title: 'Last Glacial Maximum', summary: 'Ice sheets reached their recent maximum extent.' },
        { year: -16000, title: 'People south of the American ice sheets', summary: 'Archaeological evidence documents early settlement.' },
        { year: -11000, title: 'Cultivation intensifies', summary: 'Communities increasingly managed plants and landscapes.' },
        { year: -9000, title: 'Early villages and herding', summary: 'Long-lived settlements and managed animals expanded in southwest Asia.' }
      ],
      regions: [
        { name: 'Beringia and the Americas', center: [-130, 40], zoom: 2.2, note: 'Migration routes changed as ice and sea level shifted.' },
        { name: 'Southwest Asia', center: [39, 34], zoom: 3.7, note: 'One early center of cultivation, herding, and village life.' },
        { name: 'East Asia', center: [108, 31], zoom: 3.3, note: 'Millet and rice traditions developed through different pathways.' }
      ],
      themes: ['Ice Age', 'Americas', 'agriculture', 'domestication', 'villages'], confidence: 'Climate strongly modeled; archaeological chronologies vary by region', sourceIds: ['smithsonian', 'periodo', 'britishMuseum']
    },
    {
      id: 'human-cities-bronze', timeline: 'human', startYear: -6000, endYear: -1200, anchorYear: -2500,
      title: 'Cities, writing, and Bronze Age networks', aliases: ['first cities', 'Bronze Age', 'origins of writing', 'urban revolution'],
      dek: 'Dense settlements, irrigation, writing, courts, merchants, and mobile communities connected expanding regional systems.',
      overview: 'Urbanization occurred differently across Mesopotamia, the Nile Valley, the Indus region, northern China, the Andes, and elsewhere. Bronze Age networks moved metals, textiles, grain, and ideas, but similar period labels hide major regional differences.',
      changes: ['Large settlements concentrated labor and specialized crafts.', 'Writing and accounting supported institutions in some regions.', 'Long-distance exchange moved metals, goods, people, and ideas.'],
      moments: [
        { year: -4000, title: 'Uruk urbanization', summary: 'Southern Mesopotamia developed large cities and institutional economies.' },
        { year: -3200, title: 'Early writing systems', summary: 'Writing appeared in Mesopotamia and Egypt.' },
        { year: -2600, title: 'Mature Indus cities', summary: 'Large planned cities connected the Indus and surrounding regions.' },
        { year: -1200, title: 'Late Bronze Age transformations', summary: 'Many eastern Mediterranean palace systems collapsed or reorganized.' }
      ],
      regions: [
        { name: 'Mesopotamia', center: [44, 32], zoom: 4.2, note: 'Urban institutions and writing developed in southern Mesopotamia.' },
        { name: 'Nile Valley', center: [31, 27], zoom: 4, note: 'Political centralization linked settlements along the Nile.' },
        { name: 'Indus region', center: [70, 27], zoom: 3.8, note: 'Urban planning developed without a fully deciphered writing system.' }
      ],
      themes: ['cities', 'writing', 'Bronze Age', 'trade', 'palaces'], confidence: 'Archaeological and textual evidence, regional labels differ', sourceIds: ['periodo', 'pleiades', 'britishMuseum', 'met']
    },
    {
      id: 'human-iron-classical', timeline: 'human', startYear: -1200, endYear: 500, anchorYear: 117,
      title: 'Iron Age states and classical empires', aliases: ['Iron Age', 'Classical Antiquity', 'Roman Empire', 'Han dynasty', 'Axial Age'],
      dek: 'Empires, cities, commercial routes, and religious and philosophical traditions linked large parts of Afro-Eurasia.',
      overview: 'Iron technology spread unevenly and did not define every region. Assyrian, Achaemenid, Roman, Han, Kushan, Parthian, and other states built large systems, while complex societies flourished across Africa and the Americas.',
      changes: ['Imperial roads and sea routes moved armies, taxes, goods, and ideas.', 'Religious and philosophical traditions spread through institutions and networks.', 'Cities became centers of administration, craft, religion, and spectacle.'],
      moments: [
        { year: -900, title: 'Neo-Assyrian expansion', summary: 'A militarized empire connected much of southwest Asia.' },
        { year: -500, title: 'Achaemenid imperial network', summary: 'Roads and provincial administration linked a vast empire.' },
        { year: -221, title: 'Qin unification', summary: 'A short-lived dynasty standardized institutions across much of China.' },
        { year: 117, title: 'Roman imperial maximum', summary: 'The Roman Empire reached its greatest territorial extent under Trajan.' }
      ],
      regions: [
        { name: 'Mediterranean', center: [17, 38], zoom: 3.1, note: 'Roman cities and sea routes formed a dense imperial system.' },
        { name: 'Central and South Asia', center: [72, 34], zoom: 3.1, note: 'Kushan and related networks connected India, Central Asia, and China.' },
        { name: 'East Asia', center: [110, 34], zoom: 3.1, note: 'Han institutions and frontier networks linked a vast region.' }
      ],
      themes: ['empires', 'Roman world', 'Han China', 'trade', 'religion'], confidence: 'Textual, archaeological, and numismatic evidence', sourceIds: ['periodo', 'pleiades', 'unescoSilkRoads', 'britishMuseum', 'met']
    },
    {
      id: 'human-postclassical-medieval', timeline: 'human', startYear: 500, endYear: 1250, anchorYear: 1000,
      title: 'Connected post-classical and medieval worlds', aliases: ['Late Antiquity', 'early medieval', 'High Middle Ages', 'medieval world'],
      dek: 'Religious communities, courts, cities, ports, and caravan routes connected dense regional networks across the globe.',
      overview: 'These centuries were not a universal dark age. Byzantine and Islamic states, Tang and Song China, South Asian states, African kingdoms, European polities, and American cities supported scholarship, commerce, migration, and political experimentation.',
      changes: ['Islamic states connected territories across Afro-Eurasia.', 'Maritime and caravan trade intensified.', 'Paper, printing, navigation, and finance spread through adaptation.'],
      moments: [
        { year: 622, title: 'The Hijra', summary: 'A foundational event for expanding Muslim communities and the Islamic calendar.' },
        { year: 750, title: 'Abbasid era begins', summary: 'Baghdad became a center in a wide commercial and intellectual network.' },
        { year: 1000, title: 'Dense regional networks', summary: 'Cities and states across Africa, Eurasia, and the Americas supported exchange.' },
        { year: 1200, title: 'Urban and commercial expansion', summary: 'Many regions experienced growing cities and intensified trade.' }
      ],
      regions: [
        { name: 'Indian Ocean', center: [75, 2], zoom: 2.7, note: 'Monsoon trade connected East Africa, Arabia, India, and Southeast Asia.' },
        { name: 'East Asia', center: [115, 31], zoom: 3, note: 'Song-era cities, markets, and technologies supported a major commercial economy.' },
        { name: 'West Africa', center: [-3, 15], zoom: 3, note: 'States and trading towns connected gold regions to Saharan networks.' }
      ],
      themes: ['Islamic world', 'Byzantium', 'Song China', 'Indian Ocean', 'cities'], confidence: 'Textual and archaeological evidence with uneven coverage', sourceIds: ['periodo', 'pleiades', 'unescoSilkRoads', 'britishMuseum', 'met']
    },
    {
      id: 'human-mongol-oceanic', timeline: 'human', startYear: 1250, endYear: 1650, anchorYear: 1500,
      title: 'Mongol networks, plague, and oceanic exchange', aliases: ['Mongol Empire', 'Black Death', 'Columbian Exchange', 'Age of Exploration'],
      dek: 'Conquest and commerce connected distant societies while pandemic, colonization, and forced exchange produced devastating inequality.',
      overview: 'Mongol imperial routes increased mobility across Eurasia and helped create conditions in which plague spread. Later Atlantic and Pacific crossings linked ecosystems and states permanently, causing catastrophic Indigenous population loss and new systems of conquest and coerced labor.',
      changes: ['Mongol conquest reordered states and routes.', 'Plague transformed demography, labor, and belief.', 'Crops, animals, pathogens, silver, and people moved between hemispheres.'],
      moments: [
        { year: 1206, title: 'Mongol Empire begins', summary: 'Temüjin was proclaimed Chinggis Khan.' },
        { year: 1347, title: 'Black Death reaches Mediterranean ports', summary: 'Pandemic mortality reshaped communities across several continents.' },
        { year: 1492, title: 'Sustained Atlantic contact', summary: 'A lasting biological and political exchange began between hemispheres.' },
        { year: 1571, title: 'Manila becomes a global port', summary: 'American silver and Asian goods became linked through Pacific trade.' }
      ],
      regions: [
        { name: 'Eurasian routes', center: [65, 45], zoom: 2.6, note: 'Imperial routes connected courts and cities across Eurasia.' },
        { name: 'Atlantic world', center: [-35, 15], zoom: 2.5, note: 'Trade, conquest, forced migration, and biological exchange linked continents.' },
        { name: 'Maritime Southeast Asia', center: [120, 10], zoom: 3, note: 'Manila connected Pacific and global commerce.' }
      ],
      themes: ['Mongol Empire', 'Black Death', 'Columbian Exchange', 'conquest', 'pandemic'], confidence: 'Textual, archaeological, and paleogenomic evidence', sourceIds: ['periodo', 'unescoSilkRoads', 'britishMuseum', 'met']
    },
    {
      id: 'human-industrial-imperial', timeline: 'human', startYear: 1650, endYear: 1914, anchorYear: 1850,
      title: 'Slavery, industry, and empire', aliases: ['early modern', 'Industrial Revolution', 'long nineteenth century', 'imperialism'],
      dek: 'Plantation slavery, fossil energy, mechanization, science, and imperial extraction transformed labor, cities, and the atmosphere.',
      overview: 'The early modern and industrial worlds joined Atlantic slavery, Asian commercial power, scientific institutions, factories, railways, mass migration, and expanding empires. Industrialization spread unevenly through extraction, policy, labor, and technology transfer.',
      changes: ['The transatlantic slave trade expanded plantation economies.', 'Coal and steam multiplied mechanical energy.', 'Factories, railways, and imperial states reorganized labor and territory.'],
      moments: [
        { year: 1700, title: 'Atlantic slavery intensifies', summary: 'Forced migration and plantation production expanded dramatically.' },
        { year: 1760, title: 'Industrial acceleration', summary: 'Mechanized production expanded in Britain before spreading unevenly.' },
        { year: 1850, title: 'Railway and steamship world', summary: 'Faster transport reorganized markets, migration, and warfare.' },
        { year: 1884, title: 'Partition of Africa accelerates', summary: 'European states formalized imperial claims with little African participation.' }
      ],
      regions: [
        { name: 'Atlantic basin', center: [-35, 8], zoom: 2.4, note: 'Commerce and forced migration tied together several continents.' },
        { name: 'North Atlantic industrial regions', center: [-5, 50], zoom: 2.8, note: 'Early industrialization concentrated before spreading.' },
        { name: 'Colonial empires', center: [20, 5], zoom: 2, note: 'Imperial extraction linked distant territories through unequal systems.' }
      ],
      themes: ['slavery', 'industrialization', 'railways', 'empire', 'fossil fuels'], confidence: 'Extensive documentary and material evidence', sourceIds: ['periodo', 'met', 'britishMuseum']
    },
    {
      id: 'human-modern', timeline: 'human', startYear: 1914, endYear: 2026, anchorYear: 1969,
      title: 'War, decolonization, and the networked planet', aliases: ['World War I', 'World War II', 'Cold War', 'decolonization', 'digital age', 'present day'],
      dek: 'Industrial war, genocide, independence movements, nuclear rivalry, spaceflight, digital networks, and climate change reshaped the modern world.',
      overview: 'The modern period includes global wars, the Holocaust, revolutions, decolonization, civil-rights and liberation movements, the Cold War, computing, and planetary environmental change. The present is an observed but rapidly changing state, not a neutral endpoint.',
      changes: ['Total war mobilized economies and civilians.', 'Colonized peoples won formal independence while inheriting imperial borders and institutions.', 'Digital networks and human-driven warming connected local decisions to planetary systems.'],
      moments: [
        { year: 1914, title: 'First World War begins', summary: 'A European crisis expanded into a global imperial war.' },
        { year: 1939, title: 'Second World War expands', summary: 'Existing wars and imperial aggression merged into global conflict.' },
        { year: 1960, title: 'Year of Africa', summary: 'Seventeen African countries gained independence.' },
        { year: 1969, title: 'Humans reach the Moon', summary: 'Apollo 11 returned a new observed perspective on Earth.' },
        { year: 1991, title: 'Cold War order ends', summary: 'The Soviet Union dissolved as digital networks expanded.' },
        { year: 2026, title: 'Observed present', summary: 'Earth observation anchors the atlas while current conditions continue to change.' }
      ],
      regions: [
        { name: 'Global conflict', center: [45, 30], zoom: 1.6, note: 'The world wars involved fronts, empires, occupation, and civilians across continents.' },
        { name: 'Africa and Asia', center: [65, 12], zoom: 2.1, note: 'Anticolonial movements and new states transformed global politics.' },
        { name: 'Planetary systems', center: [0, 15], zoom: 1.2, note: 'Climate, trade, migration, and digital networks operate across borders.' }
      ],
      themes: ['world wars', 'Holocaust', 'decolonization', 'Cold War', 'spaceflight', 'internet', 'climate change'], confidence: 'Extensive documentary, testimonial, and observed evidence', sourceIds: ['periodo', 'nasaApollo', 'nasaEarth', 'met', 'britishMuseum']
    }
  ];

  globalThis.WORLDLINE_HISTORY_CATALOG = Object.freeze({
    BUILD,
    version: 1,
    updated: '2026-08-03',
    editorialNote: 'Curated navigation chapters. Dates are representative ranges and do not imply globally synchronous change.',
    sources,
    chapters: Object.freeze(chapters.map((chapter) => Object.freeze(chapter)))
  });
})();
