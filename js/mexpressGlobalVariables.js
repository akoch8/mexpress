// Global variables.
//
var cancerTypeAnnotation;
var cancerTypeData;
var cancerTypeDataFiltered;
var stats;
var svg;

// Define the dimensions.
var transcriptHeight = 2;
var transcriptWidth = 2;
var regionHeight = 4;
var regionWidth = 4;
var cpgIslandHeight= 4;
var cpgIslandWidth = 4;
var cpgHeight = 8;
var cpgWidth = 8;
var genomicCoordinatesHeight = 8;
var genomicCoordinatesWidth = 8;
var genomicFeatureLargeMargin = 4;
var genomicFeatureSmallMargin = 2;
var dataTrackHeight = 11;
var dataTrackHeightVariants = 4;
var dataTrackSeparator = 1;
var marginBetweenMainParts = 15;
var sampleWidth = 1;
var legendRectHeight = 10;
var legendRectWidth = 10;
var legendCircleR = 3;

// Define the colors.
var textColor = '#2c2c2c';
var textColorLight = '#a9a9a9';
var textColorBright = '#fcfcfc';
var missingValueColor = '#ececec';
var regionColor = '#34495e';
var transcriptColor = '#7f94b5';
var exonColor = '#34495e';
var otherRegionColor = '#928a97';
var otherTranscriptColor = '#928a97';
var cpgColor = '#7fa99b';
var probeLineColor = '#dcdcdc';
var probeLineColorPromoter = '#ff6666';
var histogramColor = '#e4f1fe';
var histogramColorFocus = '#ff6666';

// Categorical colors source: ColorBrewer 2.0
// http://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12
var categoricalColors = ['#6a3d9a', '#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99',
	'#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#ffff99', '#b15928', '#666666'];

// The assignment of a specific color to each possible sample type is based on how often each
// sample type appears in the TCGA data. See R/findAllSampleTypes.R for an estimate of sample
// type frequencies. Sample types that are not present in the TCGA data have all been assigned
// the same color (#b15928).
var sampleTypeColors = {
	'primary tumor': '#6a3d9a',
	'recurrent tumor': '#33a02c',
	'primary blood derived cancer - peripheral blood': '#b2df8a',
	'recurrent blood derived cancer - bone marrow': '#b15928',
	'additionl - new primary': '#fb9a99',
	'metastatic': '#1f78b4',
	'additionl metastatic': '#e31a1c',
	'human tumor original cells': '#b15928',
	'primary blood derived cancer - bone marrow': '#b15928',
	'blood derived normal': '#b15928',
	'solid tissue normal': '#a6cee3',
	'buccal cell normal': '#b15928',
	'EBV immortalized normal': '#b15928',
	'bone marrow normal': '#b15928',
	'control analyte': '#b15928',
	'recurrent blood derived cancer - peripheral blood': '#b15928',
	'cell lines': '#b15928',
	'primary xenograft tissue': '#b15928',
	'cell line derived xenograft tissue': '#b15928'
};
var stageColors = ['#fbe6c5', '#f7d9bc', '#f4cdb4', '#f1c1ac', '#edb4a3', '#eaa89b', '#e79c93',
	'#e48f8a', '#e08382', '#dd777a', '#d66d73', '#ca656f', '#bf5d6a', '#b45665', '#a84e61',
	'#9d465c', '#923f57', '#863753', '#7b2f4e', '#70284a'];
var stageColorsSimplified = ['#fbe6c5', '#edb4a3', '#e08382', '#bf5d6a', '#923f57', '#70284a'];
