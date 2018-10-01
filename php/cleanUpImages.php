<?php

$file = $_POST['file'];

$fileWithoutExtension = str_replace('.png', '', $file);
$removedAllFiles = true;
$failedFile = '';
foreach (glob('downloads/'.$fileWithoutExtension.'*') as $filename) {
	$result = unlink($filename);
	if (!$result) {
		$removedAllFiles = false;
		break;
	}
}
echo json_encode(array('success' => $removedAllFiles, 'failed_on' => $failedFile));

?>