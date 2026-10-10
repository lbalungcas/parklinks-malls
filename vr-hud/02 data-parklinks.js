(function () {
  // pictures, the intro film and the 3D map are served from the tour's own site: the alp-assets folder next to index.htm.
  // The pictures there are reduced copies (JPEG, 1600 px) of the originals on GitHub, so the menus load in a fraction of the time.
  var A = 'alp-assets/';
  var BIG = A + 'mall-facade.avif';
  var EM = String.fromCharCode(8212);
  var EN = String.fromCharCode(8211);
  var DOT = String.fromCharCode(183);
  var PESO = String.fromCharCode(8369);
  var AP = String.fromCharCode(39);
  var HERO = A + 'parklinks-ground-hero.jpg';
  function img(n) { return A + n + '.jpg'; }

  var run = function (ALP) {
    var U = ALP.util;

    ALP.config.projectId = 'parklinks';

    // Parklinks palette: near black glass, cream ink, mint accent
    U.extend(ALP.tokens.color, {
      bg: '#0A0A0A',
      panel: 'rgba(10,10,10,.88)',
      panelSolid: 'rgba(12,12,12,.96)',
      panelHi: 'rgba(18,16,15,.94)',
      shell: 'rgba(12,10,9,.82)',
      deep: 'rgba(8,6,5,.94)',
      line: 'rgba(255,255,255,.12)',
      lineHi: 'rgba(255,255,255,.34)',
      hair: 'rgba(255,255,255,.08)',
      text: '#F5F2EC',
      text2: 'rgba(245,242,236,.65)',
      text3: 'rgba(245,242,236,.45)',
      white: '#FFFFFF',
      cream: '#F2F1EE',
      accent: '#34D399',
      accentSoft: 'rgba(52,211,153,.11)',
      accentLine: '#6EE7B7',
      accentBorder: 'rgba(52,211,153,.22)',
      onAccent: '#052E1F',
      ok: '#34D399', warn: '#F5C451', danger: '#FF6B6B'
    });
    ALP.tokens.font.ui = 'Inter, "Helvetica Neue", Arial, sans-serif';
    ALP.tokens.font.brand = 'Marcellus, "Trajan Pro", Georgia, serif';
    ALP.tokens.radius = 20;
    ALP.tokens.size = { title: 1.6, heading: 1.15, body: 0.86, small: 0.72, micro: 0.6, button: 0.74, icon: 1.1, value: 1.0, display: 2.2 };

    ALP.data.platform = {
      brand: { wordmark: 'PARKLINKS', tagline: 'A Vision of Sustainable Urban Living', hero: null, enterLabel: 'Enter' },
      projects: []
    };

    ALP.data.project = {
      id: 'parklinks',
      name: 'Ayala Malls Parklinks',
      subtitle: 'C-5 Corridor',
      type: 'mall',
      startMedia: 0,
      // the names these panoramas have in 3DVista, in the order the numbers below count them (0, 1, 2 ...). The numbers used for
      // media, dressed and undressed further down always mean this list, so they stay right when other panoramas are added to the
      // tour or the playlist is reordered. A name that is not found falls back to the playlist position with the same number.
      playlist: ['Parklinks Mall', 'Parklinks Bridge', 'Central Park Entrance', 'Parklinks Central Park Overview',
        'drop_off_dressed', 'drop_off_undressed', 'ground_floor_entrance_dressed', 'ground_floor_entrance_undressed',
        'ground_floor_dressed', 'ground_floor_undressed', 'second_floor_dressed', 'second_floor_undressed',
        'third_floor_view_dressed', 'third_floor_view_undressed', 'third_floor_dressed', 'third_floor_undressed',
        'unit2_dressed', 'unit2_undressed', 'unit1_dressed', 'unit1_undressed'],
      // the page interface of this project (outside VR): hidden while another project of the same tour is open
      pageRoots: ['#immersive-hud-layer'],

      landing: {
        title: 'PARKLINKS',
        tagline: 'A VISION OF SUSTAINABLE URBAN LIVING',
        story: 'Welcome to Metro Manila' + AP + 's greenest urban estate. Parklinks seamlessly intertwines luxury residential developments, premium retail configurations, and dynamic corporate workspaces across a thoughtful master-planned ecosystem.',
        image: A + 'landing.jpg',
        watch: 'WATCH INTRODUCTION',
        skip: 'SKIP DIRECTLY TO TOUR',
        video: A + 'intro.mp4',
        logos: [
          A + 'ayala-land-logo.svg',
          A + 'eton-logo.webp'
        ]
      },

      about: {
        title: 'PARKLINKS',
        tagline: 'A VISION OF SUSTAINABLE URBAN LIVING',
        hero: BIG,
        body: 'A premier joint venture between Ayala Land and Eton Properties' + EM + 'two of the country' + AP + 's leading property giants' + EM + 'Parklinks stands as a landmark master-planned, mixed-use development bridging Quezon City and Pasig. Spanning an expansive 35 hectares, it is thoughtfully envisioned to become the greenest urban estate in Metro Manila and the largest sustainable ecosystem along the prime C-5 corridor.',
        body2: 'Crafted to balance modern corporate dynamism with natural tranquility, the estate dedicates 50% of its land to vibrant open networks, sprawling parks, and a majestic iconic bridge over the Marikina River. Parklinks seamlessly intertwines luxury residential towers, world-class corporate offices, and the highly anticipated Ayala Malls Parklinks, establishing a sophisticated new paradigm for urban living where nature and community thrive as one.'
      },

      contact: {
        title: 'CONTACT LEASING',
        tagline: 'SPEAK WITH OUR LEASING TEAM',
        rows: [
          ['phone', 'Telephone', '+63 2 8123 4567'],
          ['mail', 'Email', 'leasing@ayalamallsparklinks.com']
        ]
      },

      // one journey, in the order the tour itself walks: estate, arrival, the mall floors, and the two units
      sections: [
        { id: 'estate', label: 'Estate' },
        { id: 'arrival', label: 'Arrival' },
        { id: 'mall', label: 'The Mall' },
        { id: 'units', label: 'Leasing' }
      ],
      places: [
        { id: 'overview', label: 'Parklinks Mall', short: 'Overview', section: 'estate', media: 0, img: img('parklinks-overview'), lot: 'mall',
          info: 'The mall rising within the 35-hectare Parklinks estate, on the C-5 corridor between Pasig and Quezon City.' },
        { id: 'bridge', label: 'Parklinks Bridge', section: 'estate', media: 1, img: img('parklinks-bridge'), lot: 'bridge' },
        { id: 'park', label: 'Central Park', section: 'estate', media: 2, img: img('central-park'), lot: 'central' },
        { id: 'parkview', label: 'Central Park Overview', section: 'estate', media: 3, img: img('central-park-overview'), lot: 'central' },
        // the drop-off is always shown furnished: one panorama, no Furnished / Unfurnished switch. instead lists panoramas that lead back to it
        // (the unfurnished drop-off is still in the tour, and one of the tour's own hotspots may open it).
        { id: 'dropoff', label: 'Drop-off', section: 'arrival', media: 4, instead: [5], img: img('mall-drop-off'), lot: 'dropoff', map: 'Drop-off' },
        { id: 'entrance', label: 'Ground Floor Entrance', short: 'Entrance', section: 'mall', dressed: 6, undressed: 7, img: img('mall-entrance'), floor: 'floor-g-entrance', map: 'Ground Floor Entrance' },
        { id: 'atrium', label: 'Ground Luxury Atrium', short: 'Mall Atrium', section: 'mall', dressed: 8, undressed: 9, img: img('mall-atrium'), floor: 'floor-g', map: 'Ground Luxury Atrium' },
        { id: 'l2', label: 'Upper Promenade', short: 'Second Floor', section: 'mall', dressed: 10, undressed: 11, img: img('second-floor'), floor: 'floor-l2', map: 'Upper Promenade' },
        { id: 'unit102', label: 'Unit 102', short: 'Unit 102', section: 'units', dressed: 18, undressed: 19, img: 'media/panorama_9A1BCE00_8C94_3F70_41AF_CCAE6253F0F0_hd_t.jpg', unit: 'unit-102', floor: 'floor-l2', map: 'Unit 102' },
        { id: 'l3view', label: '3rd Floor View', short: 'Third Floor View', section: 'mall', dressed: 12, undressed: 13, img: 'media/panorama_F8E84869_EEBD_9480_41CE_42B23DE4ED01_hd_t.jpg', floor: 'floor-l3-view', map: '3rd Floor View' },
        { id: 'l3', label: '3rd Floor Luxury Atrium', short: 'Third Floor', section: 'mall', map: '3rd Floor Luxury Atrium', dressed: 14, undressed: 15, img: img('third-floor'), floor: 'floor-l3' },
        { id: 'unit101', label: 'Unit 101', short: 'Unit 101', section: 'units', dressed: 16, undressed: 17, img: 'media/panorama_F9AAAA4F_EA4D_9011_41C9_CF10617B9238_hd_t.jpg', unit: 'unit-101', floor: 'floor-l3', map: 'Unit 101' }
      ],

      // this tour holds Parklinks only: no project selection at the start and no Other Projects in the menu
      projects: [
        { id: 'parklinks', current: true, name: 'Parklinks Mall', brand: 'Ayala Malls', place: 'Quezon City and Pasig',
          url: 'https://storage.net-fs.com/hosting/8518662/10/', image: A + 'landing.jpg' }
      ],
      // the tour plays ambient mall sound; in the headset the browser needs a press before it may play
      // the quick guide when the tour starts: once: 'visit' shows it every time the tour is opened, 'device' only the first time on a headset
      onboarding: { enabled: true, once: 'visit' },
      audio: { prompt: true, title: 'Turn on sound?', text: 'This tour plays the ambient sound of the mall.' },

      // the side menu, kept short so a first-time visitor sees only what matters
      menu: [
        { id: 'overview', label: 'Overview' },
        { id: 'map3d', label: '3D Mall Map' },
        { id: 'gallery', label: 'Media Gallery' },
        { id: 'hide', label: 'Hide Interface', icon: 'eyeOff' }
      ],

      // url is the textured model (version 3), in alp-assets/map3d on the tour's own site.
      // If it cannot be loaded, the map quietly uses 'fallback', the earlier model on GitHub (github.com links are turned into raw file addresses automatically).
      // Every position below is in the model's own metres: x runs east, z runs south. To read a position off the model,
      // set showPosition to true in the ALP.config.mall3d line near the end of this file, open a floor, and the toolbar shows the spot you point at.
      map3d: {
        url: A + 'map3d/alp-mall-3d-v3.json',
        fallback: 'https://github.com/virtual-sudo/parklinks-mall-introduction/blob/main/map3d/alp-mall-3d-v2.json',
        hero: HERO,
        title: 'Parklinks Mall', subtitle: 'Ayala Malls Parklinks',

        // one pin for every panorama taken inside the mall. label must match the 'map' name of a place above.
        // The three ground floor pins come from the tour's own floor plan. The second and third floor pins were placed
        // by matching each panorama against the model, so move them here if one sits in the wrong spot.
        // outdoor: true keeps a pin visible when the whole building is shown.
        pins: [
          { label: 'Drop-off', level: 'G', x: 23.3, z: -81.9, outdoor: true },
          { label: 'Ground Floor Entrance', level: 'G', x: 35.6, z: -85.6 },
          { label: 'Ground Luxury Atrium', level: 'G', x: 78.1, z: -84.8 },
          { label: 'Upper Promenade', level: '2', x: 63.5, z: -96.8 },
          { label: 'Unit 102', level: '2', x: 65.8, z: -103.4 },
          { label: '3rd Floor View', level: '3', x: 101.8, z: -85.5 },
          { label: '3rd Floor Luxury Atrium', level: '3', x: 76.5, z: -96.6 },
          { label: 'Unit 101', level: '3', x: 65.8, z: -103.4 }
        ],

        // ---- lots: every lettable unit on the map. The outlines and the square metres are measured from the 3D model. ----
        // status is the one word to change when a lot is reserved or sold: 'available', 'reserved' or 'sold'. The statuses below are
        // placeholders, and so is the choice of which lot is Unit 102 and Unit 101. rect is [west x, north z, east x, south z];
        // an irregular lot has pts (its corners) and at (where its number sits). front is the side that faces the corridor.
        // A lot with tenant and kind is dressed as a store; sample: true marks an invented tenant.
        lots: {
          word: 'Lot',
          statuses: { available: { label: 'Available', color: [52, 211, 153] }, reserved: { label: 'Reserved', color: [240, 180, 60] }, sold: { label: 'Sold', color: [222, 108, 96] } },
          note: 'Indicative plan. Lot areas are approximate and availability is subject to confirmation.',
          sampleNote: 'Shown as an example of how a let unit reads on the map. It is not a signed tenant.',
          list: [
            { id: 'G-01', level: 'G', pts: [[28.8, -145.2], [28.7, -118.8], [46.2, -118.8], [46.7, -119.3], [46.4, -135.8], [38, -135.8], [37.9, -144.7], [29.6, -144.7]], at: [34.2, -131.8], sqm: 366, front: 'west', frontage: 26, corner: true, status: 'sold' },
            { id: 'G-02', level: 'G', rect: [28.7, -118.7, 37.7, -102.4], sqm: 137, front: 'west', frontage: 15.8, status: 'available' },
            { id: 'G-03', level: 'G', rect: [37.8, -118.3, 46.7, -102.4], sqm: 134, front: 'east', frontage: 3.8, status: 'reserved' },
            { id: 'G-04', level: 'G', rect: [46.7, -114.5, 59.4, -107], sqm: 87, front: 'north', frontage: 12.2, status: 'sold' },
            { id: 'G-05', level: 'G', rect: [59.5, -114.5, 72.2, -107], sqm: 87, front: 'north', frontage: 12.4, corner: true, status: 'sold' },
            { id: 'G-06', level: 'G', rect: [80.7, -114.5, 95.4, -107], sqm: 101, front: 'north', frontage: 14.4, corner: true, status: 'reserved' },
            { id: 'G-07', level: 'G', rect: [95.5, -114.5, 105.9, -107.8], sqm: 63, front: 'north', frontage: 10, corner: true, status: 'available' },
            { id: 'G-08', level: 'G', rect: [114.8, -115.2, 121.5, -105.7], sqm: 58, front: 'west', frontage: 9, corner: true, status: 'sold' },
            { id: 'G-09', level: 'G', rect: [121.6, -115.2, 133, -105.7], sqm: 99, front: 'north', frontage: 11, corner: true, status: 'sold' },
            { id: 'G-10', level: 'G', rect: [28.7, -102.3, 46.7, -90], sqm: 202, front: 'south', frontage: 17.6, corner: true, status: 'sold' },
            { id: 'G-11', level: 'G', rect: [46.7, -106.9, 59.4, -99.3], sqm: 88, front: 'south', frontage: 12.2, status: 'sold', tenant: 'Corner Coffee Bar', category: 'Cafe', kind: 'cafe', sample: true, blurb: 'An all-day coffee bar at the head of the main concourse, with seating that spills toward the atrium.' },
            { id: 'G-12', level: 'G', rect: [59.5, -106.9, 72.2, -99.3], sqm: 88, front: 'south', frontage: 12.4, corner: true, status: 'sold', tenant: 'Garden Bistro', category: 'Restaurant', kind: 'dining', sample: true, blurb: 'A full-service restaurant facing the atrium, sized for about sixty covers with an open kitchen.' },
            { id: 'G-13', level: 'G', rect: [80.7, -106.9, 95.4, -99.3], sqm: 103, front: 'south', frontage: 14.4, corner: true, status: 'sold', tenant: 'Atelier Row', category: 'Fashion', kind: 'fashion', sample: true, blurb: 'A double-fronted fashion flagship beside the luxury atrium, the strongest sightline on the ground floor.' },
            { id: 'G-14', level: 'G', pts: [[95.5, -107.7], [95.5, -99.3], [101.5, -99.3], [101.6, -101.9], [105.7, -101.9], [105.9, -107.7]], at: [100.2, -104.7], sqm: 69, front: 'south', frontage: 10, corner: true, status: 'available' },
            { id: 'G-15', level: 'G', rect: [118.2, -100, 125.5, -84.8], sqm: 102, front: 'west', frontage: 14.8, corner: true, status: 'sold' },
            { id: 'G-16', level: 'G', rect: [125.6, -100, 133, -84.8], sqm: 104, front: 'east', frontage: 14.8, corner: true, status: 'sold' },
            { id: 'G-17', level: 'G', rect: [118.2, -84.7, 125.5, -69.6], sqm: 101, front: 'west', frontage: 14.8, status: 'sold' },
            { id: 'G-18', level: 'G', rect: [125.6, -84.7, 133, -69.6], sqm: 103, front: 'east', frontage: 14.8, status: 'sold' },
            { id: 'G-19', level: 'G', rect: [38.7, -70.2, 46.6, -55.1], sqm: 109, front: 'north', frontage: 7.4, corner: true, status: 'sold' },
            { id: 'G-20', level: 'G', rect: [46.7, -70.3, 59.4, -62.7], sqm: 88, front: 'north', frontage: 12.2, status: 'sold', tenant: 'The Bake House', category: 'Bakery Cafe', kind: 'cafe', sample: true, blurb: 'A bakery and cafe on the south side of the concourse, a natural first stop from the drop-off.' },
            { id: 'G-21', level: 'G', rect: [59.5, -70.3, 72.2, -62.7], sqm: 88, front: 'north', frontage: 12.4, corner: true, status: 'sold', tenant: 'Fresh Market Hall', category: 'Grocer and Deli', kind: 'market', sample: true, blurb: 'A neighbourhood grocer and deli counter serving the residential towers of the estate.' },
            { id: 'G-22', level: 'G', rect: [80.7, -70.3, 95.4, -62.7], sqm: 103, front: 'north', frontage: 14.4, corner: true, status: 'sold', tenant: 'Book and Paper', category: 'Books and Gifts', kind: 'retail', sample: true, blurb: 'Books, stationery and gifts, with a reading corner looking onto the atrium.' },
            { id: 'G-23', level: 'G', pts: [[95.5, -70.3], [95.5, -62.7], [105.9, -62.7], [105.7, -67.7], [101.6, -67.7], [101.5, -70.3]], at: [100.2, -65.3], sqm: 60, front: 'north', frontage: 10, corner: true, status: 'sold' },
            { id: 'G-24', level: 'G', rect: [114.7, -69.5, 123.7, -55.1], sqm: 119, front: 'west', frontage: 14, corner: true, status: 'reserved' },
            { id: 'G-25', level: 'G', pts: [[123.8, -69.5], [123.8, -55.1], [129.5, -55.1], [132.9, -69.5]], at: [127.8, -65.5], sqm: 100, front: 'east', frontage: 14, corner: true, status: 'available' },
            { id: 'G-26', level: 'G', rect: [46.7, -62.6, 59.4, -55.1], sqm: 87, front: 'south', frontage: 12.2, status: 'available' },
            { id: 'G-27', level: 'G', rect: [59.5, -62.6, 72.2, -55.1], sqm: 87, front: 'south', frontage: 12.4, corner: true, status: 'sold' },
            { id: 'G-28', level: 'G', rect: [80.7, -62.6, 95.4, -55.1], sqm: 101, front: 'south', frontage: 14.4, corner: true, status: 'sold' },
            { id: '2-01', level: '2', rect: [88.9, -136, 97.2, -127.1], sqm: 67, front: 'west', frontage: 8.6, corner: true, status: 'available' },
            { id: '2-02', level: '2', rect: [97.7, -136, 106.1, -131.6], sqm: 33, front: 'north', frontage: 8, status: 'sold' },
            { id: '2-03', level: '2', rect: [97.7, -131.5, 106.1, -127.1], sqm: 33, front: 'south', frontage: 8, status: 'reserved' },
            { id: '2-04', level: '2', rect: [106.2, -136, 114.6, -131.6], sqm: 33, front: 'north', frontage: 8, status: 'available' },
            { id: '2-05', level: '2', rect: [106.2, -131.5, 114.6, -127.1], sqm: 33, front: 'south', frontage: 8, status: 'sold' },
            { id: '2-06', level: '2', rect: [114.7, -136, 123.1, -131.6], sqm: 33, front: 'north', frontage: 8, status: 'sold' },
            { id: '2-07', level: '2', rect: [114.7, -131.5, 123.1, -127.1], sqm: 33, front: 'south', frontage: 8, status: 'available' },
            { id: '2-08', level: '2', rect: [123.2, -136, 131.6, -131.6], sqm: 33, front: 'north', frontage: 8, status: 'sold' },
            { id: '2-09', level: '2', rect: [123.2, -131.5, 131.6, -127.1], sqm: 33, front: 'south', frontage: 8, status: 'sold' },
            { id: '2-10', level: '2', rect: [131.7, -136, 140.4, -127.1], sqm: 71, front: 'east', frontage: 8.6, corner: true, status: 'available' },
            { id: '2-11', level: '2', rect: [37.8, -118.3, 46.7, -101.8], sqm: 139, front: 'west', frontage: 16, corner: true, status: 'sold' },
            { id: '2-12', level: '2', pts: [[46.7, -114.5], [46.7, -107], [54.7, -107], [54.8, -110.2], [59.4, -110.2], [59.4, -114.5]], at: [51, -110.8], sqm: 73, front: 'north', frontage: 12.2, status: 'sold' },
            { id: '2-13', level: '2', pts: [[59.5, -114.5], [59.5, -110.2], [64.1, -110.2], [64.2, -107], [72.2, -107], [72.2, -114.5]], at: [68, -110.8], sqm: 73, front: 'north', frontage: 12.4, corner: true, status: 'sold' },
            { id: '2-14', level: '2', pts: [[80.7, -114.5], [80.7, -107], [95.4, -107], [95.4, -110.3], [88.9, -110.4], [88.9, -114.5]], at: [84.5, -110.8], sqm: 76, front: 'north', frontage: 8.2, status: 'sold' },
            { id: '2-15', level: '2', pts: [[88.9, -118.3], [88.9, -114.5], [97.6, -114.7], [97.6, -118.3], [97.1, -119], [89.8, -119], [89.6, -118.3]], at: [91.5, -116.8], sqm: 33, front: 'north', frontage: 8.2, corner: true, status: 'sold' },
            { id: '2-16', level: '2', rect: [97.7, -119, 106.1, -114.7], sqm: 32, front: 'north', frontage: 8, status: 'available' },
            { id: '2-17', level: '2', rect: [106.2, -119, 114.6, -114.7], sqm: 32, front: 'north', frontage: 8, status: 'sold' },
            { id: '2-18', level: '2', rect: [106.2, -114.6, 114.6, -110.3], sqm: 32, front: 'south', frontage: 8, status: 'available' },
            { id: '2-19', level: '2', rect: [114.8, -110.3, 121.5, -105.7], sqm: 27, front: 'south', frontage: 6.4, corner: true, status: 'sold' },
            { id: '2-20', level: '2', rect: [114.7, -119, 123.1, -114.7], sqm: 32, front: 'north', frontage: 8, status: 'available' },
            { id: '2-21', level: '2', rect: [121.6, -110.3, 133, -105.7], sqm: 46, front: 'south', frontage: 11, corner: true, status: 'available' },
            { id: '2-22', level: '2', rect: [123.2, -119, 131.6, -114.7], sqm: 32, front: 'north', frontage: 8, status: 'sold' },
            { id: '2-23', level: '2', pts: [[132.2, -119], [131.7, -118.3], [131.7, -114.5], [133, -114.4], [133, -110.3], [139.7, -110.3], [140.4, -110.8], [140.4, -118.3], [139.8, -118.3], [139.7, -119]], at: [136.7, -115.2], sqm: 64, front: 'north', frontage: 8.4, corner: true, status: 'sold' },
            { id: '2-24', level: '2', rect: [28.7, -101.7, 46.7, -90], sqm: 193, front: 'north', frontage: 9, status: 'reserved' },
            { id: '2-25', level: '2', pts: [[46.7, -106.9], [46.7, -99.3], [59.4, -99.3], [59.4, -103.4], [54.8, -103.4], [54.7, -106.9]], at: [51, -103], sqm: 72, front: 'south', frontage: 12.2, status: 'sold', tenant: 'Active Lab', category: 'Sportswear', kind: 'fashion', sample: true, blurb: 'Sportswear and equipment on the Upper Promenade, next to the escalators.' },
            { id: '2-26', level: '2', pts: [[59.5, -103.4], [59.5, -99.3], [72.2, -99.3], [72.2, -106.9], [64.2, -106.9], [64.1, -103.4]], at: [68, -103], sqm: 72, front: 'south', frontage: 12.4, corner: true, status: 'available', name: 'Unit 102', unit: 'unit-102', place: 'unit102', blurb: 'A bare unit on the Upper Promenade facing the atrium. The tour shows it fitted out as a sports store.' },
            { id: '2-27', level: '2', rect: [80.7, -106.9, 95.4, -99.3], sqm: 103, front: 'south', frontage: 14.4, corner: true, status: 'sold', tenant: 'Promenade Kitchen', category: 'Casual Dining', kind: 'dining', sample: true, blurb: 'Casual dining with a terrace of tables along the balcony edge.' },
            { id: '2-28', level: '2', pts: [[95.5, -107.7], [95.5, -99.3], [101.5, -99.3], [101.6, -101.9], [105.7, -101.9], [105.9, -107.7]], at: [100.2, -104.7], sqm: 69, front: 'south', frontage: 10, corner: true, status: 'reserved' },
            { id: '2-29', level: '2', rect: [118.2, -100, 125.5, -84.8], sqm: 102, front: 'west', frontage: 14.8, corner: true, status: 'sold' },
            { id: '2-30', level: '2', rect: [125.6, -100, 133, -84.8], sqm: 104, front: 'east', frontage: 14.8, corner: true, status: 'available' },
            { id: '2-31', level: '2', rect: [28.7, -90, 46.9, -79.6], sqm: 180, front: 'south', frontage: 17.8, status: 'sold' },
            { id: '2-32', level: '2', rect: [118.2, -84.7, 125.5, -69.6], sqm: 101, front: 'west', frontage: 14.8, status: 'available' },
            { id: '2-33', level: '2', rect: [125.6, -84.7, 133, -69.6], sqm: 103, front: 'east', frontage: 14.8, status: 'reserved' },
            { id: '2-34', level: '2', rect: [38.7, -70.2, 46.6, -55.1], sqm: 111, front: 'west', frontage: 7.6, corner: true, status: 'reserved' },
            { id: '2-35', level: '2', rect: [46.7, -70.3, 59.4, -62.7], sqm: 88, front: 'north', frontage: 12.2, status: 'sold', tenant: 'Tech Gallery', category: 'Electronics', kind: 'retail', sample: true, blurb: 'Consumer electronics and a service desk, across the void from the escalator landing.' },
            { id: '2-36', level: '2', rect: [59.5, -70.3, 72.2, -62.7], sqm: 88, front: 'north', frontage: 12.4, corner: true, status: 'sold', tenant: 'Home Studio', category: 'Home and Living', kind: 'retail', sample: true, blurb: 'Furniture and homeware in a wide, shallow unit that reads well from the opposite balcony.' },
            { id: '2-37', level: '2', rect: [80.7, -70.3, 95.4, -62.7], sqm: 103, front: 'north', frontage: 14.4, corner: true, status: 'reserved' },
            { id: '2-38', level: '2', pts: [[95.5, -70.3], [95.5, -62.7], [105.9, -62.7], [105.7, -67.7], [101.6, -67.7], [101.5, -70.3]], at: [100.2, -65.3], sqm: 60, front: 'north', frontage: 10, corner: true, status: 'sold' },
            { id: '2-39', level: '2', rect: [114.7, -69.5, 123.7, -55.1], sqm: 119, front: 'west', frontage: 14, corner: true, status: 'reserved' },
            { id: '2-40', level: '2', pts: [[123.8, -69.5], [123.8, -55.1], [129.5, -55.1], [132.9, -69.5]], at: [127.8, -65.5], sqm: 100, front: 'east', frontage: 14, corner: true, status: 'sold' },
            { id: '2-41', level: '2', rect: [46.7, -62.6, 59.4, -55.1], sqm: 87, front: 'south', frontage: 12.2, status: 'available' },
            { id: '2-42', level: '2', rect: [59.5, -62.6, 72.2, -55.1], sqm: 87, front: 'south', frontage: 12.4, corner: true, status: 'available' },
            { id: '2-43', level: '2', rect: [80.7, -62.6, 95.4, -55.1], sqm: 101, front: 'south', frontage: 14.4, corner: true, status: 'available' },
            { id: '3-01', level: '3', rect: [39.9, -130.8, 46.7, -118.8], sqm: 74, front: 'east', frontage: 3.6, status: 'available' },
            { id: '3-02', level: '3', rect: [88.7, -138.8, 140.2, -130.8], sqm: 383, front: 'north', frontage: 51, corner: true, status: 'available' },
            { id: '3-03', level: '3', pts: [[69.7, -130.8], [39.9, -130.7], [39.9, -118.8], [37.7, -118.7], [37.7, -101.8], [39.9, -101.7], [39.9, -92.2], [20.2, -92.3], [20.2, -134.9], [69.7, -134.9]], at: [29.5, -112], sqm: 784, front: 'east', frontage: 35.6, status: 'available', name: 'Unit 101', unit: 'unit-101', place: 'unit101', blurb: 'A bare unit beside the third floor atrium. The tour shows it fitted out as a fashion boutique.' },
            { id: '3-04', level: '3', pts: [[39.9, -118.7], [39.9, -101.8], [45.9, -101.8], [45.9, -115.2], [46.7, -115.3], [46.7, -118.3]], at: [43, -115.7], sqm: 97, front: 'east', frontage: 3.6, status: 'available' },
            { id: '3-05', level: '3', rect: [88.7, -114.5, 95.4, -107.3], sqm: 43, front: 'north', frontage: 6.4, status: 'sold' },
            { id: '3-06', level: '3', rect: [95.5, -114.5, 105.9, -107.8], sqm: 63, front: 'north', frontage: 10, status: 'available' },
            { id: '3-07', level: '3', rect: [114.8, -114.5, 121.5, -107.3], sqm: 44, front: 'north', frontage: 6.4, status: 'sold' },
            { id: '3-08', level: '3', rect: [121.6, -115.2, 133, -107.3], sqm: 81, front: 'north', frontage: 11, status: 'reserved' },
            { id: '3-09', level: '3', rect: [133, -115.3, 140.2, -107.3], sqm: 52, front: 'east', frontage: 7.6, corner: true, status: 'sold' },
            { id: '3-10', level: '3', pts: [[45.9, -101.7], [39.9, -101.7], [39.9, -92.3], [33.1, -92.2], [32.9, -90], [46.5, -90], [46.7, -96.8], [45.9, -96.9]], at: [43.1, -95], sqm: 82, front: 'east', frontage: 6.2, status: 'sold' },
            { id: '3-11', level: '3', pts: [[59.5, -103.4], [59.5, -99.3], [72.2, -99.3], [72.2, -106.9], [64.2, -106.9], [64.1, -103.4]], at: [68, -103], sqm: 72, front: 'south', frontage: 12.4, corner: true, status: 'available', name: 'Unit 101', unit: 'unit-101', place: 'unit101', blurb: 'A bare unit beside the third floor atrium. The tour shows it fitted out as a fashion boutique.' },
            { id: '3-12', level: '3', rect: [80.7, -106.9, 95.4, -99.3], sqm: 103, front: 'south', frontage: 14.4, corner: true, status: 'sold', tenant: 'Gallery Shop', category: 'Art and Design', kind: 'retail', sample: true, blurb: 'Prints, objects and a rotating exhibition wall beside the third floor atrium.' },
            { id: '3-13', level: '3', pts: [[95.5, -107.3], [95.5, -99.3], [101.5, -99.3], [101.6, -101.9], [105.7, -101.9], [105.9, -107.3]], at: [100.2, -104.5], sqm: 65, front: 'south', frontage: 10, corner: true, status: 'reserved' },
            { id: '3-14', level: '3', rect: [118.2, -100, 125.5, -84.8], sqm: 102, front: 'west', frontage: 14.8, corner: true, status: 'sold' },
            { id: '3-15', level: '3', rect: [125.6, -100, 133, -84.8], sqm: 104, front: 'east', frontage: 14.8, corner: true, status: 'available' },
            { id: '3-16', level: '3', rect: [32.9, -90, 46.6, -79.6], sqm: 135, front: 'south', frontage: 13.4, status: 'reserved' },
            { id: '3-17', level: '3', rect: [118.2, -84.7, 125.5, -69.6], sqm: 101, front: 'west', frontage: 14.8, status: 'available' },
            { id: '3-18', level: '3', rect: [125.6, -84.7, 133, -69.6], sqm: 103, front: 'east', frontage: 14.8, status: 'sold' },
            { id: '3-19', level: '3', rect: [38.7, -70.2, 46.6, -55.1], sqm: 111, front: 'west', frontage: 7.6, corner: true, status: 'sold' },
            { id: '3-20', level: '3', rect: [46.7, -70.3, 59.4, -62.7], sqm: 88, front: 'north', frontage: 12.2, status: 'sold', tenant: 'Noodle House', category: 'Restaurant', kind: 'dining', sample: true, blurb: 'A quick-service noodle bar with counter seating and a view down the atrium.' },
            { id: '3-21', level: '3', rect: [59.5, -70.3, 72.2, -62.7], sqm: 88, front: 'north', frontage: 12.4, corner: true, status: 'sold', tenant: 'The Tea Room', category: 'Cafe', kind: 'cafe', sample: true, blurb: 'Tea, desserts and a small retail wall, placed at the top of the escalator run.' },
            { id: '3-22', level: '3', rect: [80.7, -70.3, 95.4, -62.7], sqm: 103, front: 'north', frontage: 14.4, corner: true, status: 'sold', tenant: 'Salon and Spa', category: 'Wellness', kind: 'wellness', sample: true, blurb: 'Hair, nails and treatment rooms on the quieter third floor.' },
            { id: '3-23', level: '3', pts: [[95.5, -70.3], [95.5, -62.7], [105.9, -62.7], [105.7, -67.7], [101.6, -67.7], [101.5, -70.3]], at: [100.2, -65.3], sqm: 60, front: 'north', frontage: 10, corner: true, status: 'sold' },
            { id: '3-24', level: '3', rect: [114.7, -69.5, 123.7, -55.1], sqm: 119, front: 'west', frontage: 14, corner: true, status: 'sold' },
            { id: '3-25', level: '3', pts: [[123.8, -69.5], [123.8, -55.1], [129.5, -55.1], [132.9, -69.5]], at: [127.8, -65.5], sqm: 100, front: 'east', frontage: 14, corner: true, status: 'sold' },
            { id: '3-26', level: '3', rect: [46.7, -62.6, 59.4, -55.1], sqm: 87, front: 'south', frontage: 12.2, status: 'sold' },
            { id: '3-27', level: '3', rect: [59.5, -62.6, 72.2, -55.1], sqm: 87, front: 'south', frontage: 12.4, corner: true, status: 'available' },
            { id: '3-28', level: '3', rect: [80.7, -62.6, 95.4, -55.1], sqm: 101, front: 'south', frontage: 14.4, corner: true, status: 'available' },
            { id: '4-01', level: '4', rect: [88.7, -138.8, 140.2, -130.8], sqm: 383, front: 'north', frontage: 51, corner: true, status: 'sold' },
            { id: '4-02', level: '4', pts: [[88.7, -115.3], [88.7, -107.3], [114.8, -107.3], [114.9, -114.5], [121.6, -114.4], [121.6, -107.3], [140.2, -107.3], [140.2, -115.3]], at: [136.2, -111.2], sqm: 334, front: 'north', frontage: 51, corner: true, status: 'available' },
            { id: '4-03', level: '4', pts: [[95.5, -70.3], [95.5, -61.8], [105.9, -61.8], [105.7, -67.7], [101.6, -67.7], [101.5, -70.3]], at: [100.2, -64.8], sqm: 70, front: 'north', frontage: 10, corner: true, status: 'reserved' },
            { id: '4-04', level: '4', rect: [80.4, -34, 131.9, -15.7], sqm: 888, front: 'north', frontage: 51.2, corner: true, status: 'sold' },
            { id: 'R-01', level: 'R', rect: [65.8, -72.6, 80.4, -66.1], sqm: 88, front: 'west', frontage: 6, status: 'available' },
            { id: 'R-02', level: 'R', rect: [80.6, -72.6, 95.2, -66.1], sqm: 89, front: 'north', frontage: 14.2, status: 'reserved' },
            { id: 'R-03', level: 'R', pts: [[95.4, -70.1], [95.4, -65.5], [97.4, -65.4], [97.4, -62.3], [105.7, -62], [105.7, -67.5], [97.8, -67.5], [97.7, -70.1]], at: [100, -64.8], sqm: 48, front: 'north', frontage: 9.8, corner: true, status: 'sold' },
            { id: 'R-04', level: 'R', pts: [[91.2, -65.9], [91.2, -56.8], [97.7, -56.8], [97.2, -65.3]], at: [94.5, -60], sqm: 51, front: 'west', frontage: 7.8, status: 'available' },
            { id: 'R-05', level: 'R', rect: [97.9, -59.4, 104.3, -54.8], sqm: 26, front: 'south', frontage: 6, corner: true, status: 'available' }
          ]
        },

        // ---- amenities: one marker each, per floor. The escalators, the atrium lifts, the food court and the stair cores are where the
        // model shows them; the rest are placed by estimate. Move one by changing its x and z, or delete its line. ----
        amenities: {
          types: {
            restroom: { label: 'Restrooms', about: 'Near the side corridors' },
            accessible: { label: 'Accessibility', about: 'Accessible restrooms, ramps and step-free routes' },
            elevator: { label: 'Elevator', about: 'Step-free between floors' },
            escalator: { label: 'Escalator', about: 'Up and down between floors' },
            info: { label: 'Information Desk', about: 'Guest services, paging, lost and found' },
            atm: { label: 'ATM', about: 'Cash machines' },
            dining: { label: 'Dining', about: 'Food court and restaurants' },
            baby: { label: 'Baby Care', about: 'Changing and nursing room' },
            parking: { label: 'Parking', about: 'Exit to the parking deck' }
          },
          list: [
            { type: 'restroom', level: 'G', x: 53.5, z: -133.8 }, { type: 'accessible', level: 'G', x: 48, z: -133.8 }, { type: 'baby', level: 'G', x: 59.5, z: -133.8 }, { type: 'restroom', level: 'G', x: 58.9, z: -36 }, { type: 'elevator', level: 'G', x: 95.3, z: -75.2 }, { type: 'elevator', level: 'G', x: 69.5, z: -133.2 }, { type: 'elevator', level: 'G', x: 100.8, z: -36 }, { type: 'escalator', level: 'G', x: 61.5, z: -119 }, { type: 'info', level: 'G', x: 41.5, z: -88.5 }, { type: 'accessible', level: 'G', x: 32, z: -85.5 }, { type: 'atm', level: 'G', x: 34.5, z: -75 }, { type: 'atm', level: 'G', x: 112, z: -101.5 }, { type: 'dining', level: 'G', x: 60, z: -96.5 }, { type: 'parking', level: 'G', x: 139.6, z: -80 },
            { type: 'restroom', level: '2', x: 53.5, z: -133.2 }, { type: 'accessible', level: '2', x: 48, z: -133.2 }, { type: 'baby', level: '2', x: 59.5, z: -133.2 }, { type: 'restroom', level: '2', x: 58.9, z: -36 }, { type: 'elevator', level: '2', x: 99.5, z: -75.2 }, { type: 'elevator', level: '2', x: 69.5, z: -133.2 }, { type: 'elevator', level: '2', x: 100.8, z: -36 }, { type: 'escalator', level: '2', x: 61.6, z: -125.5 }, { type: 'atm', level: '2', x: 136.1, z: -104 }, { type: 'dining', level: '2', x: 110.2, z: -120.8 }, { type: 'parking', level: '2', x: 137.6, z: -84 }, { type: 'accessible', level: '2', x: 136.6, z: -94 },
            { type: 'restroom', level: '3', x: 53.5, z: -129.8 }, { type: 'accessible', level: '3', x: 48, z: -129.8 }, { type: 'baby', level: '3', x: 59.5, z: -129.8 }, { type: 'restroom', level: '3', x: 58.9, z: -36 }, { type: 'elevator', level: '3', x: 99.5, z: -75.2 }, { type: 'elevator', level: '3', x: 70.8, z: -133.7 }, { type: 'elevator', level: '3', x: 100.8, z: -36 }, { type: 'escalator', level: '3', x: 61.6, z: -125.5 }, { type: 'dining', level: '3', x: 88, z: -96.5 }, { type: 'parking', level: '3', x: 137.6, z: -84 }, { type: 'accessible', level: '3', x: 136.6, z: -94 },
            { type: 'restroom', level: '4', x: 53.5, z: -133.2 }, { type: 'accessible', level: '4', x: 48, z: -133.2 }, { type: 'restroom', level: '4', x: 58.9, z: -36 }, { type: 'elevator', level: '4', x: 99.5, z: -72 }, { type: 'elevator', level: '4', x: 69.5, z: -133.2 }, { type: 'elevator', level: '4', x: 100.8, z: -36 }, { type: 'escalator', level: '4', x: 61.6, z: -123.5 }, { type: 'dining', level: '4', x: 112, z: -117.7 }, { type: 'parking', level: '4', x: 137.6, z: -88 },
            { type: 'restroom', level: 'R', x: 53.5, z: -133.2 }, { type: 'accessible', level: 'R', x: 48, z: -133.2 }, { type: 'elevator', level: 'R', x: 69.5, z: -133.2 }, { type: 'dining', level: 'R', x: 86, z: -74.8 }, { type: 'parking', level: 'R', x: 133.1, z: -88 }
          ]
        },

        // ---- people: scenery. count is how many walk each floor; routes are the lines they walk, worked out from the model so they
        // stay in the corridors. A few more stand at shopfronts. planters are the round planters with a tree and a bench. ----
        people: {
          enabled: true,
          count: { 'G': 30, '2': 24, '3': 18, '4': 10, 'R': 8 },
          outdoor: [[[25.5, -72], [25.5, -98]]],
          // where people stand still: [x, z, the compass direction they face in degrees (0 is north)]
          stand: { 'G': [[67, -71.8, 180], [86.6, -97.8, 0], [66.7, -97.8, 0], [54.1, -71.8, 180], [50.9, -97.8, 0], [90.3, -71.8, 180], [38.6, -88.5, 0], [129.4, -116.7, 180], [134.4, -60.9, 270]], '2': [[89.5, -97.8, 0], [64.8, -71.8, 180], [50.5, -97.8, 0], [53.4, -71.8, 180], [116.7, -93.7, 90], [66.6, -97.8, 0], [85.8, -71.8, 180], [134.5, -74.5, 270]], '3': [[54, -71.8, 180], [87.2, -71.8, 180], [90.6, -97.8, 0], [65.5, -71.8, 180], [113.2, -62.4, 90], [134.5, -91.7, 270]], '4': [[101.4, -71.8, 180], [110.5, -140.3, 180]], 'R': [[99.3, -71.6, 180]] },
          routes: {
            'G': [
              [[100.8, -71.8], [98.8, -82.2], [76.8, -100.2], [74.2, -120.2], [63.8, -130.2], [59.8, -131.2]],
              [[60.2, -96.2], [66.2, -94.8], [74.2, -89.2], [92.8, -87.2], [110.2, -68.2], [113.2, -53.8], [131.2, -53.8], [134.8, -62.2]],
              [[53.2, -71.8], [95.8, -74.8]],
              [[61.8, -118.8], [61.8, -117.8], [62.2, -117.2], [63.2, -116.8], [107.2, -115.8], [114.2, -103.8], [133.2, -103.8], [136.2, -95.8], [135.2, -92.2]],
              [[88.2, -71.8], [78.8, -71.8], [78.8, -54.2], [84.8, -52.8], [88.2, -53.2]],
              [[120.2, -39.8], [93.8, -39.8], [76.8, -50.8], [73.8, -72.2], [62.2, -79.8], [44.2, -81.8], [38.2, -87.8]],
              [[66.2, -116.2], [73.8, -115.8], [74.8, -98.2], [62.2, -89.8], [38.8, -87.8], [38.2, -87.8]],
              [[101.2, -35.8], [59.2, -35.8]],
              [[41.8, -88.2], [99.8, -90.8], [107.8, -97.2], [116.8, -100.2], [116.8, -100.8], [117.2, -101.2], [122.2, -103.8], [134.2, -104.2], [136.8, -113.8], [133.8, -116.8], [127.8, -116.8]],
              [[40.2, -39.8], [105.2, -38.2], [132.8, -53.2], [136.8, -87.8], [135.2, -92.2]],
              [[88.2, -97.2], [60.2, -96.2]],
              [[38.2, -85.2], [46.2, -81.2], [83.2, -78.2], [89.2, -73.2], [100.8, -71.8]],
              [[88.2, -116.2], [73.2, -130.8], [48.2, -131.2]],
              [[53.2, -53.2], [104.8, -53.8], [110.2, -60.8], [113.8, -72.2], [116.8, -75.2], [116.8, -76.8]],
              [[116.8, -76.8], [116.2, -78.2], [110.2, -87.8], [107.8, -115.2], [101.8, -116.8], [96.2, -116.8], [79.8, -131.2], [76.8, -131.8]],
              [[134.8, -62.2], [128.8, -49.8], [106.8, -45.8], [94.2, -49.8], [89.8, -53.2], [88.2, -53.2]],
              [[53.8, -131.2], [66.2, -128.8], [76.2, -117.8], [74.2, -48.2], [49.2, -38.2], [40.2, -39.8]],
              [[127.8, -116.8], [134.2, -116.8], [137.8, -96.2], [134.8, -62.2]],
              [[66.2, -53.2], [132.8, -53.8], [138.2, -78.8], [139.8, -79.8]],
              [[69.8, -132.8], [84.2, -128.2], [96.8, -116.8], [107.2, -115.8], [113.8, -97.8], [116.8, -94.2], [116.8, -92.2]],
              [[116.8, -92.2], [114.2, -89.8], [97.2, -88.2], [76.8, -68.8], [73.8, -47.8], [59.2, -35.8]],
              [[53.2, -116.2], [65.2, -116.8], [68.2, -125.2], [69.8, -132.8]],
              [[135.2, -92.2], [134.8, -102.2], [132.8, -103.8], [121.2, -103.8], [117.2, -101.2], [116.8, -100.8], [114.2, -97.8], [103.2, -94.8], [84.2, -79.8], [77.2, -77.2], [72.2, -73.2], [66.2, -71.8]],
              [[59.2, -35.8], [84.8, -40.2], [101.8, -50.8], [110.2, -60.2], [113.8, -72.2], [116.8, -75.2], [116.8, -76.8]]
            ],
            '2': [
              [[53.2, -53.2], [57.8, -52.2], [76.8, -39.8], [125.2, -39.8]],
              [[135.2, -76.8], [134.8, -102.8], [132.2, -103.8], [111.8, -103.8], [103.2, -96.2], [78.8, -97.8], [73.2, -116.2], [66.2, -116.2]],
              [[69.8, -132.8], [84.2, -128.2], [82.8, -117.2], [78.8, -116.2], [66.2, -116.2]],
              [[100.8, -71.8], [105.8, -71.2], [110.2, -66.8], [113.8, -53.2], [131.2, -53.8], [135.8, -74.8], [135.2, -76.8]],
              [[100.8, -97.2], [107.2, -95.2], [107.8, -94.8], [110.2, -89.8], [108.2, -75.2], [107.8, -74.8], [107.2, -74.2], [78.8, -71.8], [73.8, -48.2], [56.8, -38.8], [40.2, -39.8]],
              [[127.8, -103.8], [138.2, -104.8], [142.2, -109.2], [142.2, -137.8], [110.8, -137.8]],
              [[110.8, -137.8], [142.2, -137.8], [142.2, -107.2], [135.2, -92.2]],
              [[118.2, -103.8], [114.2, -96.2], [111.2, -91.8], [112.8, -74.8], [113.8, -71.8], [106.8, -55.2], [90.8, -42.2], [75.8, -38.8], [74.8, -36.8], [75.2, -29.8]],
              [[53.2, -71.8], [74.2, -71.8], [79.2, -48.2], [128.2, -48.8], [135.2, -63.2], [137.8, -83.8]],
              [[101.2, -35.8], [110.2, -53.8], [113.2, -70.8], [113.8, -71.8], [108.2, -94.2], [107.8, -94.8], [107.2, -95.2], [53.2, -97.2]],
              [[87.2, -131.2], [82.2, -116.8], [53.2, -116.2]],
              [[110.8, -108.2], [114.2, -103.8], [133.2, -103.8], [136.2, -95.8], [135.2, -92.2]],
              [[48.2, -132.8], [87.2, -131.2]],
              [[66.2, -53.2], [73.8, -53.8], [79.8, -72.8], [99.2, -74.2], [99.8, -74.8]],
              [[134.8, -62.2], [128.2, -48.8], [96.8, -38.8], [40.2, -39.8]],
              [[99.8, -74.8], [107.2, -74.2], [107.8, -74.8], [110.2, -79.8], [108.2, -94.2], [107.8, -94.8], [107.2, -95.2], [78.8, -97.8], [79.2, -115.8], [83.2, -117.8], [82.8, -129.8], [53.8, -132.8]],
              [[40.2, -39.8], [85.2, -41.2], [101.2, -50.2], [113.2, -62.2]],
              [[88.2, -71.8], [78.8, -71.8], [73.2, -53.2], [37.2, -53.8], [36.2, -59.8]],
              [[66.2, -116.2], [73.8, -115.8], [74.8, -98.2], [66.8, -96.8], [66.2, -97.2]],
              [[53.2, -116.2], [82.2, -116.8], [84.8, -123.8], [81.2, -131.2], [62.2, -129.2], [61.8, -128.2]],
              [[88.2, -53.2], [31.2, -53.8], [25.8, -61.2], [28.2, -70.8], [36.2, -77.8]],
              [[66.2, -71.8], [107.8, -74.2], [112.2, -78.8], [115.8, -78.2], [116.8, -77.2], [116.8, -76.8]]
            ],
            '3': [
              [[116.8, -76.8], [116.8, -77.2], [115.2, -78.8], [109.8, -76.2], [106.2, -73.2], [88.2, -71.8]],
              [[134.8, -62.2], [134.8, -102.8], [132.2, -103.8], [111.8, -103.8], [103.2, -96.2], [88.2, -97.2]],
              [[61.8, -128.2], [62.8, -129.2], [82.8, -129.2], [87.8, -116.8], [118.2, -116.8]],
              [[48.2, -129.2], [70.2, -129.2], [70.8, -129.8], [71.2, -130.8], [71.2, -131.2]],
              [[137.8, -83.8], [130.8, -51.2], [112.8, -44.8], [86.2, -49.2], [81.2, -53.2], [78.2, -54.8], [73.2, -72.8], [53.2, -71.8]],
              [[125.2, -39.8], [95.8, -35.8], [87.8, -29.8], [76.8, -29.8]],
              [[88.2, -96.2], [54.2, -95.2], [48.8, -95.2]],
              [[76.8, -29.8], [73.8, -36.2], [70.2, -38.2], [64.2, -47.8], [44.2, -48.8], [36.8, -54.8], [37.2, -57.2]],
              [[114.8, -140.2], [141.8, -140.2], [143.8, -120.8], [141.8, -116.8], [127.8, -116.8]],
              [[88.2, -97.2], [107.2, -95.2], [107.8, -94.8], [110.2, -89.8], [113.8, -71.2], [106.8, -55.2], [90.8, -53.2], [88.2, -53.2]],
              [[100.8, -116.8], [140.8, -116.8], [141.2, -116.2], [141.8, -115.8], [142.2, -106.8], [136.2, -103.8], [121.2, -103.8], [117.2, -101.2], [116.8, -100.8], [116.8, -92.2]],
              [[135.2, -76.8], [133.2, -54.2], [113.2, -42.2], [94.8, -36.2], [59.2, -35.8]],
              [[100.8, -97.2], [107.2, -95.2], [107.8, -94.8], [110.2, -89.8], [108.2, -75.2], [107.8, -74.8], [107.2, -74.2], [78.8, -71.8], [73.2, -53.2], [66.2, -53.2]],
              [[142.2, -111.2], [141.8, -105.8], [126.2, -103.2], [122.8, -103.8], [118.2, -102.2], [117.2, -101.2], [116.8, -100.8], [110.8, -90.8], [112.8, -74.8], [113.8, -71.8], [111.8, -64.8], [113.2, -62.2]],
              [[127.8, -116.8], [87.8, -116.8], [81.8, -130.2], [75.2, -129.2], [62.8, -129.2], [61.8, -128.2]],
              [[92.2, -116.8], [87.8, -116.8], [81.8, -130.2], [75.2, -129.2], [71.8, -130.8], [71.2, -131.2]],
              [[99.8, -74.8], [107.2, -69.8], [110.2, -66.8], [113.8, -53.2], [131.2, -53.8], [134.8, -62.2]],
              [[88.2, -71.8], [53.2, -71.8]]
            ],
            '4': [
              [[120.2, -79.8], [115.2, -88.8], [106.2, -96.2], [100.2, -94.8]],
              [[99.8, -71.8], [88.2, -71.2], [79.2, -63.8], [69.2, -60.8], [60.2, -50.2], [60.2, -49.8]],
              [[112.2, -117.2], [102.8, -116.8], [87.8, -116.8], [81.2, -131.2], [69.8, -132.8]],
              [[106.2, -35.8], [130.8, -64.8], [137.8, -87.8]],
              [[120.2, -49.8], [59.2, -35.8]],
              [[76.2, -49.8], [82.2, -54.8], [108.8, -57.2], [137.8, -87.8]],
              [[114.8, -140.2], [141.8, -140.2], [143.2, -121.2], [141.8, -105.2], [131.8, -89.2], [122.2, -80.8], [120.2, -79.8]],
              [[40.2, -119.8], [50.2, -114.8], [76.2, -114.8]],
              [[69.8, -132.8], [84.2, -128.2], [87.2, -105.8], [100.2, -97.8], [109.8, -94.2], [108.2, -44.8], [101.2, -35.8]],
              [[48.2, -132.8], [83.2, -129.2], [87.2, -105.8], [100.2, -97.8], [125.8, -95.2], [133.2, -89.2], [137.8, -87.8]]
            ],
            'R': [
              [[76.2, -114.8], [68.8, -117.8], [53.8, -132.8]],
              [[110.2, -59.8], [108.2, -95.8], [95.2, -105.8], [52.8, -108.2], [40.2, -119.8]],
              [[101.2, -52.8], [92.2, -51.2], [88.8, -51.8], [86.8, -55.8], [89.2, -61.2]],
              [[95.2, -99.8], [118.2, -99.8], [124.8, -104.8], [125.2, -104.8]],
              [[135.2, -59.8], [133.8, -87.2], [133.2, -87.8]],
              [[125.2, -104.8], [130.8, -64.2], [135.2, -59.8]],
              [[69.8, -132.8], [70.2, -125.2], [95.2, -99.8]],
              [[100.8, -71.8], [106.8, -71.2], [110.2, -63.2], [105.8, -52.8], [101.2, -52.8]],
              [[60.2, -109.8], [57.8, -107.2], [52.8, -108.8], [53.2, -132.2], [53.8, -132.8]]
            ]
          }
        },
        planters: {
          'G': [[47, -84.8], [59.5, -84.8], [69, -84.8], [85, -84.8], [103, -85.5], [76.5, -42.2], [76.5, -123], [52, -43], [101, -43], [110.5, -127]],
          '2': [[76.5, -44.3], [59.5, -44], [101, -44], [110.5, -97.5], [110.2, -72], [41.4, -123.2]],
          '3': [[76.5, -49.5], [110.5, -97.5], [110.2, -72]]
        }
      },

      gallery: [
        { caption: 'Parklinks Bridge', img: img('parklinks-bridge') },
        { caption: 'Central Park', img: img('central-park') },
        { caption: 'Mall Facade', img: BIG },
        { caption: 'Drop-off', img: img('mall-drop-off') },
        { caption: 'Mall Interior', img: img('second-floor') },
        { caption: 'Central Park Overview', img: img('central-park-overview') },
        { caption: 'Upper Level', img: BIG },
        { caption: 'Rooftop', img: BIG },
        { caption: 'Ground Floor 3D Overview', img: HERO }
      ],

      floors: [
        { id: 'floor-g-entrance', title: 'GROUND FLOOR ENTRANCE', levelLabel: 'Ground', levelName: 'Entrance', shortTitle: 'GE',
          dressed: 6, undressed: 7, category: null,
          leasing: { availableUnits: 6, occupancyPct: 95, retailAreaSqm: 5210, avgUnitSqm: 118 } },
        { id: 'floor-g', title: 'GROUND LUXURY ATRIUM', levelLabel: 'Ground', levelName: 'Luxury Atrium', shortTitle: 'G',
          dressed: 8, undressed: 9, category: 'home',
          leasing: { availableUnits: 6, occupancyPct: 95, retailAreaSqm: 5210, avgUnitSqm: 118 } },
        { id: 'floor-l2', title: '2ND FLOOR UPPER PROMENADE', levelLabel: '2nd Floor', levelName: 'Upper Promenade', shortTitle: 'L2',
          dressed: 10, undressed: 11, category: 'sports', unit: 'unit-102',
          leasing: { availableUnits: 12, occupancyPct: 91, retailAreaSqm: 4320, avgUnitSqm: 104 } },
        { id: 'floor-l3-view', title: '3RD FLOOR VIEW', levelLabel: '3rd Floor', levelName: 'View', shortTitle: 'L3V',
          dressed: 12, undressed: 13, category: 'fashion',
          leasing: { availableUnits: 9, occupancyPct: 88, retailAreaSqm: 3680, avgUnitSqm: 92 } },
        { id: 'floor-l3', title: '3RD FLOOR LUXURY ATRIUM', levelLabel: '3rd Floor', levelName: 'Luxury Atrium', shortTitle: 'L3',
          dressed: 14, undressed: 15, category: 'fashion', unit: 'unit-101',
          leasing: { availableUnits: 9, occupancyPct: 88, retailAreaSqm: 3680, avgUnitSqm: 92 } }
      ],

      units: [
        { id: 'unit-102', title: 'Unit 102', subTitle: 'Parklinks Mall ' + DOT + ' Commercial Level 2',
          areaSqm: 161, areaSqFt: 1733, floorLabel: '2nd Floor', conditionLabel: 'Bare Unit',
          monthlyRentPhp: 120000, rentPerSqmPhp: 745, ceilingHeight: '4.5 m Clear', powerSupply: '40A, Single Phase',
          benefits: ['Flexible open layout', 'High visibility location', 'Ready for fit-out'],
          facts: [['Capacity', '40 ' + EN + ' 60 People'], ['Ceiling Height', '4.5 m Clear'], ['Condition', 'Bare Shell'], ['Customization', '100% Flexible']],
          blueprints: [
            { id: 'sports', label: 'Sports', cost: 745, dressed: 18, undressed: 19 },
            { id: 'medical', label: 'Medical Clinic', cost: 115, disabled: true },
            { id: 'bpo', label: 'BPO Operations', cost: 115, disabled: true },
            { id: 'cafe', label: 'Cafe / F and B', cost: 165, disabled: true },
            { id: 'fashion-retail', label: 'Fashion Retail', cost: 130, disabled: true },
            { id: 'electronics', label: 'Electronics', cost: 130, disabled: true },
            { id: 'kiosk', label: 'QSR Kiosk', cost: 130, disabled: true }
          ] },
        { id: 'unit-101', title: 'Unit 101', subTitle: 'Parklinks Mall ' + DOT + ' Commercial Level 3',
          areaSqm: 147, areaSqFt: 1582, floorLabel: '3rd Floor', conditionLabel: 'Bare Unit',
          monthlyRentPhp: 110000, rentPerSqmPhp: 748, ceilingHeight: '4.5 m Clear', powerSupply: '40A, Single Phase',
          benefits: ['Efficient spatial planning', 'Optimal natural daylighting', 'Direct escalator proximity'],
          facts: [['Capacity', '35 ' + EN + ' 50 People'], ['Ceiling Height', '4.5 m Clear'], ['Condition', 'Bare Shell'], ['Customization', '100% Flexible']],
          blueprints: [
            { id: 'fashion', label: 'Fashion', cost: 748, dressed: 16, undressed: 17 },
            { id: 'medical', label: 'Medical Clinic', cost: 115, disabled: true },
            { id: 'bpo', label: 'BPO Operations', cost: 115, disabled: true },
            { id: 'cafe', label: 'Cafe / F and B', cost: 165, disabled: true },
            { id: 'fashion-retail', label: 'Fashion Retail', cost: 130, disabled: true },
            { id: 'electronics', label: 'Electronics', cost: 130, disabled: true },
            { id: 'kiosk', label: 'QSR Kiosk', cost: 130, disabled: true }
          ] }
      ],

      calc: {
        terms: [12, 24, 36],
        // the gross sales field needed a keyboard, so it became presets
        sales: [0, 400000, 800000, 1500000, 3000000],
        salesLabels: ['None yet', '400K', '800K', '1.5M', '3M'],
        peso: PESO
      },

      lots: [
        { id: 'mall', title: 'AYALA PARKLINKS MALL',
          text: 'Ayala Malls Parklinks is a 53,000-square-meter lifestyle and commercial center rising within the 35-hectare Parklinks estate' + EM + 'a joint venture between Ayala Land and Eton Properties. Situated along the C-5 corridor spanning Pasig and Quezon City, the five-story mall will feature curated retail, premium alfresco dining, a vibrant food hall, and grade-A corporate office spaces seamlessly integrated into the structure.' },
        { id: 'dropoff', title: 'PARKLINKS MALL DROP-OFF',
          text: 'Designed as a grand gateway to luxury retail, the Parklinks Mall Drop-Off features an expansive, master-planned entry plaza. Tailored for effortless accessibility, it provides a seamless transition for visitors arriving from major thoroughfares, establishing a premium welcome experience that blends sophisticated corporate architecture with lush landscape integrations.' },
        { id: 'bridge', title: 'THE PARKLINKS BRIDGE',
          text: 'An icon of convergence stretching across the Marikina River, this 110-meter long bridge links Quezon City and Pasig. Its contemporary urban design promotes a natural flow with dedicated lanes for bikes and pedestrians.' },
        { id: 'central', title: 'THE CENTRAL PARK',
          text: 'A 3-hectare park featuring sprawling lawns and an elegant line of retail establishments, serving as the green heart of the Parklinks community.' }
      ],

      unitInfo: {
        eyebrow: 'AVAILABLE SPACE',
        title: 'UNIT 204',
        subtitle: 'Level 2 - North Wing',
        description: 'This space is currently an unfinished shell, a blank canvas ready to be fitted out to suit your brand. From a boutique retail concept to a full dining experience, the layout and utilities are designed to flex around your vision.',
        concepts: ['Retail Boutique', 'Cafe and Dining', 'Flagship Showroom', 'Pop-Up Experience'],
        specs: [['Floor Area', 'TBD sqm'], ['Frontage', 'TBD m'], ['Ceiling Height', 'TBD m'], ['Foot Traffic Zone', 'High']],
        ctaLabel: 'Inquire About This Space'
      }
    };

    ALP.extendState({
      placeId: 'overview', furnished: true, blueprintId: '',
      detailOpen: false, infoOn: false, matrixMin: false, reelOn: true, veil: false,
      unitInfoOn: false, calcOn: false, calcTerm: 12, calcSales: 0,
      galleryOn: false, galleryIndex: -1, aboutOn: false, contactOn: false,
      videoOn: false, mapOn: false, mapWalk: false, soundOn: true
    });
    ALP.config.vr = U.extend(ALP.config.vr || {}, { idleSeconds: 9, idleOpacity: 0.28 });
    if (ALP.tour.setPlaylist) {
      var plist = [], pn = ALP.data.project.playlist || [], pi;
      for (pi = 0; pi < pn.length; pi++) plist.push({ names: [pn[pi]] });
      ALP.tour.setPlaylist({ fallbackIndex: true, items: plist });
    }

    // 3D mall map switches. walk: false keeps the map on the table as an information map; true brings back Walk Inside.
    // fineFocus: false keeps the lighter table model when one floor is picked (smoother on a headset; true loads the finer model for that floor).
    // look: 'auto' is the textured model; 'plain' is the earlier plain-coloured model, the lightest to draw. labelScale and peopleScale size the
    // name tags and the figures. shadows: false leaves out the soft shadows on the open floor. showPosition: true prints the spot you point at
    // in the toolbar, for placing pins, lots and amenities.
    ALP.config.mall3d = U.extend({ showPosition: false, look: 'auto', labelScale: 0.9, peopleScale: 1.5, walk: false, shadows: true, fineFocus: false }, ALP.config.mall3d || {});

    // the design leans on Inter and Marcellus; pull them in and repaint once they land
    try {
      if (!document.getElementById('alp-parklinks-fonts')) {
        var l = document.createElement('link');
        l.id = 'alp-parklinks-fonts';
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Marcellus&display=swap';
        document.head.appendChild(l);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (ALP.vr) ALP.vr.dirty(); });
    } catch (e) {}

    return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('data', ['core'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['data', ['core'], run, 'parklinks']);
})();
