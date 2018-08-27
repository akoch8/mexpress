// Global variables.
//
var cancerTypeAnnotation;
var cancerTypeData;
var allSamples;
var plotWidth;
var svg;

// Define the dimensions.
var transcriptWidth = 2;
var regionWidth = 4;
var cpgIslandWidth = 4;
var cpgWidth = 8;
var genomicCoordinatesWidth = 8;
var genomicFeatureLargeMargin = 4;
var genomicFeatureSmallMargin = 2;
var dataTrackHeight = 15;
var dataTrackHeightVariants = 4;
var dataTrackSeparator = 1;
var marginBetweenMainParts = 15;
var sampleWidth = 1;
var legendRectHeight = 10;
var legendRectWidth = 10;

// Define the colors.
var textColor = '#2c2c2c';
var textColorLight = '#a9a9a9';
var missingValueColor = '#ececec';
var regionColor = '#34495e';
var transcriptColor = '#7f94b5';
var exonColor = '#34495e';
var otherRegionColor = '#928a97';
var otherTranscriptColor = '#928a97';
var cpgColor = '#7fa99b';
var probeLineColor = '#dcdcdc';
var histogramColor = '#e4f1fe';

// Categorical colors source: Prism color scheme @ https://carto.com/carto-colors/
var categoricalColors = ['#5f4690', '#1d6996', '#38a6a5', '#0f8554', '#73af48', '#edad08',
	'#e17c05', '#cc503e', '#94346e', '#6f4070', '#994e95', '#666666'];
var stageColors = ['#fbe6c5', '#f7d9bc', '#f4cdb4', '#f1c1ac', '#edb4a3', '#eaa89b', '#e79c93',
	'#e48f8a', '#e08382', '#dd777a', '#d66d73', '#ca656f', '#bf5d6a', '#b45665', '#a84e61',
	'#9d465c', '#923f57', '#863753', '#7b2f4e', '#70284a'];
var stageColorsSimplified = ['#fbe6c5', '#edb4a3', '#e08382', '#bf5d6a', '#923f57', '#70284a'];
