<?php

$geneQuery = $_GET['query'];
$result = array('suggestions' => array());

try {
	// Set up PDO.
	$config = parse_ini_file('../ini/database_config.ini');
	$db = new PDO('mysql:host='.$config['host'].';dbname='.$config['dbname'], $config['username'],
		$config['password']);

	// Put PDO in exception mode. PDOExceptions can be caught and handled gracefully (as opposed to
	// the die() function).
	$db -> setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	
	// Disable prepare emulation for safety reasons.
	$db -> setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

	// Find matching HGNC symbols.
	$query = $db -> prepare("SELECT DISTINCT(hgnc_symbol) FROM gene_transcript_annotation WHERE hgnc_symbol = :search OR hgnc_symbol LIKE :searchIncomplete ORDER BY hgnc_symbol LIMIT 20");
	$query -> execute(array(':search' => $geneQuery, ':searchIncomplete' => $geneQuery.'%'));
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$result['suggestions'][] = array('value' => $row['hgnc_symbol']);
	}

	// Find matching Ensembl IDs.
	$query = $db -> prepare("SELECT DISTINCT(gene_stable_id) FROM gene_transcript_annotation WHERE gene_stable_id = :search OR gene_stable_id LIKE :searchIncomplete ORDER BY gene_stable_id LIMIT 20");
	$query -> execute(array(':search' => $geneQuery, ':searchIncomplete' => $geneQuery.'%'));
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$result['suggestions'][] = array('value' => $row['gene_stable_id']);
	}

	// Find matching Entrez IDs.
	$query = $db -> prepare("SELECT DISTINCT(entrez_id) FROM gene_transcript_annotation WHERE entrez_id = :search OR entrez_id LIKE :searchIncomplete ORDER BY entrez_id LIMIT 20");
	$query -> execute(array(':search' => $geneQuery, ':searchIncomplete' => $geneQuery.'%'));
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$result['suggestions'][] = array('value' => $row['entrez_id']);
	}

	// Find matchin miRNA names.
	$query = $db -> prepare("SELECT DISTINCT(name) FROM mirna_annotation WHERE name = :search OR name LIKE :searchIncomplete ORDER BY name LIMIT 20");
	$query -> execute(array(':search' => $geneQuery, ':searchIncomplete' => $geneQuery.'%'));
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$result['suggestions'][] = array('value' => $row['name']);
	}
} catch (Exception $e) {
	$errorMsg = $e -> getMessage();
	$result = array('success' => false, 'msg' => $errorMsg);
}

echo json_encode($result);

?>