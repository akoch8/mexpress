<?php

// Convert an SVG image to a PNG image using inkscape (https://inkscape.org/en/).
$svgHtml = $_POST['svgHtml'];

// Write the SVG image to a file. The name for this image file needs to be unique!
while (true) {
	$uniqueFileName = uniqid('figure_', true);
	if (!file_exists('downloads/'.$uniqueFileName)) {
		break;
	}
}
$cwd = getcwd();
$svgFileName = $cwd.'/downloads/'.$uniqueFileName.'.svg';
$pngFileName = $cwd.'/downloads/'.$uniqueFileName.'.png';
file_put_contents($svgFileName, $svgHtml);
chmod($svgFileName, 0777);

// Convert the svg file to a png image using inkscape.
$cmd = '/Applications/Inkscape.app/Contents/Resources/bin/inkscape --export-png='.escapeshellarg($pngFileName).' --export-background=white  --export-dpi=300 '.escapeshellarg($svgFileName);
exec($cmd);
chmod($pngFileName, 0777);
echo $pngFileName;

?>