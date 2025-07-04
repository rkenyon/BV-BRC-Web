define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/request/xhr', 'dojox/xml/DomParser', 'dojo/dom-construct',
  '../../../util/PathJoin', '../../viewer/TabViewerBase', '../OutbreaksOverview', '../OutbreaksTab',
  'dojo/text!./OverviewDetails.html', 'dojo/text!./Resources.html', 'dojo/text!./News.html', 'dojo/text!./Contents.html',
  'dojo/text!./Data.html', 'dojo/text!./CommandLineTool.html', '../OutbreaksTabContainer', '../OutbreaksPhylogenyTreeViewer',
  '../OutbreaksGeoMap', '../OutbreaksGeoMapInfo', 'dojo/text!./OutbreaksGeoMapInfo.html',
  'dojo/text!./GeoMapHeader.html', 'dojo/text!./GeoMapFooter.html'
], function (
  declare, lang, xhr, domParser, domConstruct,
  PathJoin, TabViewerBase, OutbreaksOverview, OutbreaksTab,
  OverviewDetailsTemplate, ResourcesTemplate, NewsTemplate, ContentsTemplate,
  DataTemplate, CommandLineToolTemplate, OutbreaksTabContainer, OutbreaksPhylogenyTreeViewer,
  OutbreaksGeoMap, OutbreaksGeoMapInfo, OutbreaksGeoMapInfoTemplate,
  GeoMapHeaderTemplate, GeoMapFooterTemplate
) {
  return declare([TabViewerBase], {
    perspectiveLabel: '',
    perspectiveIconClass: '',
    title: 'Measles 2025 Outbreak',
    segments: {1: 'PB2', 2: 'PB1', 3: 'PA', 4: 'HA', 5: 'NP', 6: 'NA', 7: 'M1, M2', 8: 'NS1, NEP'},
    googleNewsCount: 100,
    googleNewsRSS: 'https://news.google.com/rss/search?q=measles+(%22www.cdc.gov%22+OR+%22news.un.org%22+OR+%22www.who.int%22+OR+%22www.reuters.com%22+OR+%22cidrap.umn.edu%22)&hl=en-US&gl=US&ceid=US:en',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this.buildHeaderContent();

      if (state.hashParams && state.hashParams.view_tab) {
        if (this[state.hashParams.view_tab]) {
          let vt = this[state.hashParams.view_tab];

          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }

      this.setActivePanelState();
    },

    setActivePanelState: function () {
      let activeQueryState;

      const active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      let activeTab = this[active];

      activeQueryState = lang.mixin({}, this.state);

      switch (active) {
        case 'phylogenetics':
          this.phylogenyCompleteMeasles.set('state', lang.mixin({}, this.state));
          break;

        default:
          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.error('Missing Active Query State for: ', active);
          }
          break;
      }
    },

    buildHeaderContent: function () {
      this.queryNode.innerHTML = '<span class="searchField" style="font-size:large">' + this.title + '</span>';
      this.totalCountNode.innerHTML = '';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments); // creates this.viewer

      this.overview = new OutbreaksOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview',
        detailsHTML: OverviewDetailsTemplate,
        rightPanelContent: [NewsTemplate],
        leftPanelContent: [ContentsTemplate],
        pubmedTerm: 'measles'
      });

      this.data = new OutbreaksTab({
        title: 'Data',
        id: this.viewer.id + '_data',
        templateString: DataTemplate
      });

      this.clt = new OutbreaksTab({
        title: 'Command Line Tool',
        id: this.viewer.id + '_clt',
        templateString: CommandLineToolTemplate
      });

      // Initialize Phylogenetic Tree Viewer
      const decorator = 'vipr:';
      const nodeVisualizations = {};

      nodeVisualizations['Host'] = {
        label: 'Host',
        description: 'the host of the virus',
        field: null,
        cladeRef: decorator + 'Host',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Country'] = {
        label: 'Country',
        description: 'the country of the virus',
        field: null,
        cladeRef: decorator + 'Country',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Year'] = {
        label: 'Year',
        description: 'the year of the virus',
        field: null,
        cladeRef: decorator + 'Year',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50c',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: null
      };

      nodeVisualizations['Subclade'] = {
        label: 'Subclade',
        description: 'the subclade (genotype) of the measles pox virus',
        field: null,
        cladeRef: decorator + 'Subclade',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      const nodeLabels = {};

      nodeLabels['Host'] = {
        label: 'Host',
        description: 'to use the host as part of node names',
        propertyRef: 'vipr:Host',
        selected: false,
        showButton: true
      };

      nodeLabels['Country'] = {
        label: 'Country',
        description: 'to use the country as part of node names',
        propertyRef: 'vipr:Country',
        selected: false,
        showButton: true
      };

      nodeLabels['Year'] = {
        label: 'Year',
        description: 'to use the year as part of node names',
        propertyRef: 'vipr:Year',
        selected: false,
        showButton: true
      };

      nodeLabels['Subclade'] = {
        label: 'Subclade',
        description: 'to use the subclade (genotype) as part of node names',
        propertyRef: 'vipr:Subclade',
        selected: false,
        showButton: true
      };

      let options = {};
      options.minBranchLengthValueToShow = 0.001;
      options.minConfidenceValueToShow = 50;
      options.initialNodeFillColorVisualization = 'Year';
      options.phylogram = true;
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showNodeVisualizations = true;
      options.showVisualizationsLegend = true;
      options.visualizationsLegendOrientation = 'vertical';
      options.visualizationsLegendXpos = 220;
      options.visualizationsLegendYpos = 30;
      options.showInternalLabels = true;

      let settings = {};
      settings.border = '1px solid #909090';
      settings.controls0Left = 20;
      settings.controls1Width = 120;
      settings.rootOffset = 220;
      settings.controls0Top = 10;
      settings.controls1Top = 10;
      settings.enableDownloads = true;
      settings.enableDynamicSizing = true;
      settings.enableMsaResidueVisualizations = false;
      settings.enableCollapseByFeature = true;
      settings.enableNodeVisualizations = true;
      settings.enableBranchVisualizations = false;
      settings.nhExportWriteConfidences = true;
      settings.enableSubtreeDeletion = true;
      settings.showSequenceButton = false;
      settings.showShortenNodeNamesButton = false;
      settings.showExternalLabelsButton = false;
      settings.showInternalLabelsButton = true;
      settings.showExternalNodesButton = false;
      settings.showInternalNodesButton = false;

      const phylogenyCompleteMeasles = 'phylogenyCompleteMeasles';
      this[phylogenyCompleteMeasles] = new OutbreaksPhylogenyTreeViewer({
        title: 'Measles complete genomes',
        id: this.viewer.id + '_' + phylogenyCompleteMeasles,
        phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/measles/measles.xml',
        updateState: true,
        settings: settings,
        options: options,
        nodeVisualizations: nodeVisualizations,
        specialVisualizations: nodeLabels
      });

      const phylogenyNGeneMeasles = 'phylogenyNGeneMeasles';
      this[phylogenyNGeneMeasles] = new OutbreaksPhylogenyTreeViewer({
        title: 'Measles N gene tree',
        id: this.viewer.id + '_' + phylogenyNGeneMeasles,
        phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/measles/measles_n_gene.xml',
        updateState: true,
        settings: settings,
        options: options,
        nodeVisualizations: nodeVisualizations,
        specialVisualizations: nodeLabels
      });

      this.phylogenetics = new OutbreaksTabContainer({
        title: 'Phylogenetics',
        id: this.viewer.id + '_phylogenetics',
        tabContainers: [this[phylogenyCompleteMeasles], this[phylogenyNGeneMeasles]]
      });

      this.resources = new OutbreaksTab({
        title: 'Resources',
        id: this.viewer.id + '_resources',
        templateString: ResourcesTemplate
      });

      this.map = new OutbreaksGeoMap({
        title: 'Map of Seq. Isolates',
        id: this.viewer.id + '_map',
        state: this.state,
        cladeIDetected: '#028c81',
        cladeIIDetected: '#035999',
        bothCladesDetected: '#0590b1',
        createInfoWindowContent: this.googleMapsInfoWindowContent,
        createMarker: this.createGoogleMapsMarker,
        headerInfo: GeoMapHeaderTemplate,
        footerInfo: GeoMapFooterTemplate,
        focusOnUS: false
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.map);
      this.viewer.addChild(this.phylogenetics);
      this.viewer.addChild(this.data);
      this.viewer.addChild(this.resources);
      this.viewer.addChild(this.clt);

      // Fetch geomap data
      xhr.get(PathJoin(this.apiServiceUrl, 'genome') + '/?eq(taxon_lineage_ids,11234)&eq(collection_year,"2025")&in(genome_status,("Complete","Partial"))&select(genome_name,subclade,isolation_country,state_province)&limit(100000)', {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, async function (genomes) {
        const addMetadata = (location, genome) => {
          // Initialize the location in distinctLocations if not already present
          if (!distinctLocations[location]) {
            distinctLocations[location] = {
              genomeNames: [],
              clades: {}
            };
          }

          // Add genome name if not already present to avoid duplicate metadata
          if (genome.genome_name && !distinctLocations[location].genomeNames.includes(genome.genome_name)) {
            distinctLocations[location].genomeNames.push(genome.genome_name);

            if (!genome.subclade) {
              genome.subclade = 'Unclassified';
            }

            if (distinctLocations[location].clades[genome.subclade]) {
              distinctLocations[location].clades[genome.subclade]++;
            } else {
              distinctLocations[location].clades[genome.subclade] = 1;
            }
          }
        };

        let distinctLocations = {};
        genomes.forEach(genome => {
          // Make sure to cover all the possible cases/bugs
          // Isolation Country: Kazakhstan, State:
          // Isolation Country: USA, State: Texas
          // Isolation Country: USA, State: USA
          // Isolation Country: USA, State:
          let stateLocation = '';
          let countryLocation = '';

          // Handle state_province, ensuring it is properly capitalized
          if (genome.state_province) {
            const state = genome.state_province.trim();
            if (state.length > 2) {
              stateLocation = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
            } else {
              stateLocation = state;
            }
          }

          if (genome.isolation_country && genome.isolation_country !== genome.state_province) {
            countryLocation = genome.isolation_country.trim();
          }

          // Combine state and country if both are present
          let fullLocation = stateLocation && countryLocation ? `${stateLocation}, ${countryLocation}` : countryLocation;

          // Add metadata for full location (e.g., "NY, US")
          if (fullLocation) {
            addMetadata(fullLocation, genome);
          }

          // Add metadata for country-only location (e.g., "US")
          if (countryLocation) {
            addMetadata(countryLocation, genome);
          }
        });

        this.map.set('data', distinctLocations);
      })).catch(err => console.log('error', err));

      xhr.get('/google/news/?url=' + encodeURIComponent(this.googleNewsRSS) + '&count=' + this.googleNewsCount,
        {handleAs: 'xml'})
        .then(lang.hitch(this, function (data) {
          // TODO: move parsing to server side
          const doc = domParser.parse(data);
          const items = Array.from(doc.getElementsByTagName('item'));

          // Filter out before 2023 and sort items by pubDate
          const filteredItems = items
            .reduce((acc, item) => {
              const pubDateText = this.getNode(item, 'pubDate');
              const pubDate = new Date(pubDateText);

              // Only include items with pubDate in 2023 or later
              if (pubDate.getFullYear() >= 2023) {
                const link = this.getNode(item, 'link');
                const title = this.getNode(item, 'title');

                acc.push({link, title, pubDate});
              }
              return acc;
            }, [])
            .sort((a, b) => b.pubDate - a.pubDate);

          // Determine the number of items to process
          const numItems = Math.min(this.googleNewsCount, filteredItems.length);
          const newsList = domConstruct.create('ul');
          const options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'};
          for (let i = 0; i < numItems; ++i) {
            const li = domConstruct.create('li', {}, newsList);
            const pubDate = filteredItems[i].pubDate.toLocaleDateString('en-US', options);
            domConstruct.create('div', {
              innerHTML: pubDate
            }, li);
            domConstruct.create('a', {
              href: filteredItems[i].link,
              target: '_blank',
              innerHTML: filteredItems[i].title
            }, li);
          }
          domConstruct.place(newsList, 'newsList');
        })).catch(error => {
        console.log(error);
      });
    },

    getNode: function (node, tag) {
      return node.getElementsByTagName(tag)[0].childNodes[0].nodeValue;
    },

    googleMapsInfoWindowContent: function (item) {
      let contentValues = {map: this.map, index: this.index++};

      //Sort host common names
      let clades = item.metadata.clades;
      const sortedKeys = Object.keys(clades).sort();
      const sortedClades = {};
      sortedKeys.forEach(key => {
        sortedClades[key] = clades[key];
      });
      item.metadata.clades = sortedClades;
      // ,eq(state_province,"{{ metadata.stateProvince }}"
      const location = item.metadata.location;
      const stateCountry = location.split(',');
      let locationFilter = ''
      if (stateCountry.length === 1) {
        locationFilter = `,eq(isolation_country,"${stateCountry[0].trim()}")`;
      } else {
        locationFilter = `,eq(state_province,"${stateCountry[0].trim()}"),eq(isolation_country,"${stateCountry[1].trim()}")`;
      }

      let content = new OutbreaksGeoMapInfo(Object.assign({}, contentValues, {
        templateString: OutbreaksGeoMapInfoTemplate,
        location: item.metadata.location,
        locationFilter: locationFilter,
        longitude: item.longitude,
        latitude: item.latitude
      }));

      for (const [subclade, count] of Object.entries(item.metadata.clades)) {
        let tr = domConstruct.create('tr', {}, content.cladeDetailsPoint);

        if (subclade === 'Unclassified') {
          domConstruct.create('td', {innerHTML: subclade}, tr);
        } else {
          let td = domConstruct.create('td', {}, tr);
          domConstruct.create('a', {
            href: `/view/Taxonomy/11234#view_tab=genomes&filter=and(or(eq(genome_status,"Complete"),eq(genome_status,"Partial")),eq(collection_year,"2025")${locationFilter},eq(subclade,"${encodeURIComponent(subclade)}"))&defaultColumns=-cds,subclade,collection_date&defaultSort=genome_name,subclade`,
            target: '_blank',
            innerHTML: subclade
          }, td);
        }

        domConstruct.create('td', {innerHTML: count}, tr);
      }

      return content.domNode.innerHTML;
    },

    createGoogleMapsMarker: function (item) {
      const latitude = item.latitude.toFixed(5);
      const longitude = item.longitude.toFixed(5);
      const count = item.metadata.genomeNames.length;

      const markerColor = this.bothCladesDetected;
      const markerLabel = count.toString();

      const length = markerLabel.length;
      const scale = length === 1 ? 1 : 1.5 + (length - 2) * 0.2;

      const icon = {
        path: item.isCountryLevel ? 'M 0,0 L 11,-15 L 0,-30 L -11,-15 Z' : 'M 0,0 C -2,-10 -10,-10 -10,-20 A 10,10 0 1,1 10,-20 C 10,-10 2,-10 0,0 Z',
        fillColor: markerColor,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 0.5,
        scale: scale,
        labelOrigin: item.isCountryLevel ? new google.maps.Point(0, -15) : new google.maps.Point(0, -18)
      };
      const anchorPoint = count === 1 ? 1 : 1.5 + (count - 2) * 0.2;

      return new google.maps.Marker({
        position: new google.maps.LatLng(latitude, longitude),
        labelAnchor: new google.maps.Point(anchorPoint, 33),
        label: {text: markerLabel, color: '#fff'},
        icon: icon,
        map: this.map
      });
    }
  });
});
