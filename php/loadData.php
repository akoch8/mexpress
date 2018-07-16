<?php

$name = $_POST['name'];
$cancer = $_POST['cancer'];

$result = array('success' => false);

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

	// Check if the name provided by the user is a HGNC symbol. Since PDO can't deal with repeating
	// parameters, we have to use a workaround (name1, name2). Look here for more information:
	// https://stackoverflow.com/questions/7603896/php-pdo-prepare-repetitive-variables
	$query = $db -> prepare("SELECT COUNT(*) FROM gene_transcript_annotation WHERE hgnc_symbol = :name1 OR gene_stable_id = :name2");
	$query -> execute(array(':name1' => $name, ':name2' => $name));
	$nrow = $query -> fetchColumn();
	if ($nrow > 0) {
		// Get the gene annotation.
		$regionType = 'gene';
		$query = $db -> prepare("SELECT * FROM gene_transcript_annotation WHERE hgnc_symbol = :name1 OR gene_stable_id = :name2");
		$query -> execute(array(':name1' => $name, ':name2' => $name));
		$transcripts = array();
		while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
			$ensemblId = $row['gene_stable_id'];
			$hgncSymbol = $row['hgnc_symbol'];
			$chromosome = $row['chr'];
			$regionStart = $row['gene_start'];
			$regionEnd = $row['gene_end'];
			$strand = $row['strand'];
			$transcriptId = $row['transcript_stable_id'];
			$transcriptStart = $row['transcript_start'];
			$transcriptEnd = $row['transcript_end'];
			$transcripts[$transcriptId] = array('start' => $transcriptStart, 'end' => $transcriptEnd, 'exons' => array());
		}
		$result['region_annotation'] = array(
			'region_type' => $regionType,
			'ensembl_id' => $ensemblId,
			'name' => $hgncSymbol,
			'chr' => $chromosome,
			'start' => $regionStart,
			'end' => $regionEnd,
			'strand' => $strand
		);

		// Add the exon annotation. See comment higher up for the explanation on repeating parameters.
		foreach ($transcripts as $id => $transcriptAnnotation) {
			$query = $db -> prepare("SELECT * FROM transcript_exon_annotation WHERE transcript_stable_id = :id ORDER BY exon_start");
			$query -> execute(array(':id' => $id));
			$exons = array();
			while ($row = $query -> fetch(PDO::FETCH_ASSOC)){
				$exonStart = $row['exon_start'];
				$exonEnd = $row['exon_end'];
				$transcripts[$id]['exons'][] = array('start' => $exonStart, 'end' => $exonEnd);
			}
		}
		$result['region_annotation']['transcripts'] = $transcripts;
	} else {
		// Check if the user provided a miRNA name.
		$query = $db -> prepare("SELECT COUNT(*) FROM mirna_annotation WHERE name = :name");
		$query -> execute(array(':name' => $name));
		$nrow = $query -> fetchColumn();
		if ($nrow > 0) {
			// Get the miRNA annotation.
			$regionType = 'mirna';
			$query = $db -> prepare("SELECT * FROM mirna_annotation WHERE name = :name");
			$query -> execute(array(':name' => $name));
			$row = $query -> fetchAll(PDO::FETCH_ASSOC);
			$chromosome = $row[0]['chr'];
			$regionStart = $row[0]['mirna_start'];
			$regionEnd = $row[0]['mirna_end'];
			$result['region_annotation'] = array(
				'region_type' => $regionType,
				'name' => $name,
				'chr' => $chromosome,
				'start' => $regionStart,
				'end' => $regionEnd,
				'strand' => $row[0]['strand']
			);
		} else {
			$result['msg'] = 'The provided gene or miRNA name <strong>'.$name.'</strong> was not recognized.';
			echo(json_encode($result));
			die;
		}
	}
	
	// Calculate the plot region.
	$regionLength = abs($regionStart - $regionEnd);
	if ($regionLength < 10000){
		$extra = 1000;
	} else {
		$extra = round($regionLength/10);
	}
	if ($extra > 5000) {
		$extra = 5000;
	}
	$plotStart = $regionStart - $extra;
	$plotEnd = $regionEnd + $extra;
	$result['plot_data'] = array(
		'start' => $plotStart,
		'end' => $plotEnd
	);

	// Add the CpG island annotation. See comment higher up for the explanation on repeating
	// parameters.
	$query = $db -> prepare("SELECT * FROM cpgi_annotation WHERE chr = :chr AND ((cpgi_start BETWEEN :plotStart1 AND :plotEnd1) OR (cpgi_end BETWEEN :plotStart2 AND :plotEnd2))");
	$query -> execute(array(':chr' => $chromosome, ':plotStart1' => $plotStart, ':plotEnd1' => $plotEnd, ':plotStart2' => $plotStart, ':plotEnd2' => $plotEnd));
	$cpgIslands = array();
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)){
		$cpgiStart = $row['cpgi_start'];
		$cpgiEnd = $row['cpgi_end'];
		$cpgIslands[] = array('start' => $cpgiStart, 'end' => $cpgiEnd);
	}
	$result['cpgi_annotation'] = $cpgIslands;

	// Add the Infinium probe annotation and the DNA methylation data.
	// TO DO: incorporate 27k data
	$query = $db -> prepare("SELECT * FROM infinium450k_annotation WHERE chr = :chr AND cpg_location BETWEEN :plotStart AND :plotEnd");
	$query -> execute(array(':chr' => $chromosome, ':plotStart' => $plotStart, ':plotEnd' => $plotEnd));
	$probes450 = array();
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$probeId = $row['probe_id'];
		$data = $row;
		$idToRemove = array_shift($data);
		$probes450[$probeId] = $data;
	}
	$result['probe_annotation_450'] = $probes450;
	$dnaMethData450 = array();
	$tableName = 'dna_methylation_450_'.$cancer;
	foreach ($probes450 as $probe => $probe_annotation) {
		// Table and column names can't be replaced by parameters in PDO, so we have to add the
		// table name the old fashioned way.
		$query = $db -> prepare("SELECT * FROM $tableName WHERE probe_id = :probe");
		$query -> execute(array(':probe' => $probe));
		$row = $query -> fetchAll(PDO::FETCH_ASSOC);
		$data = $row[0];
		
		// Remove the probe ID from the data array. We already have it, so we don't need to keep it
		// in there.
		$idToRemove = array_shift($data);
		$dnaMethData450[$probe] = $data;
	}
	$result['dna_methylation_data'] = $dnaMethData450;

	// Add the expression data.
	if ($regionType == 'gene') {
		$tableName = 'gene_expression_'.$cancer;
		$query = $db -> prepare("SELECT * FROM $tableName WHERE ensembl_id = :ensemblId");
		$query -> execute(array(':ensemblId' => $ensemblId));
		$row = $query -> fetchAll(PDO::FETCH_ASSOC);
		$data = $row[0];

		// Remove the ensembl ID from the data array. We already have it, so we don't need to keep
		// it in there.
		$idToRemove = array_shift($data);
		$result['region_expression'] = $data;
	} elseif ($regionType == 'mirna') {
		$tableName = 'mirna_expression_'.$cancer;
		$query = $db -> prepare("SELECT * FROM $tableName WHERE mirna_id = :name");
		$query -> execute(array(':name' => $name));
		$row = $query -> fetchAll(PDO::FETCH_ASSOC);
		$data = $row[0];

		// Remove the miRNA ID from the data array. We already have it, so we don't need to keep it
		// in there.
		$idToRemove = array_shift($data);
		$result['region_expression'] = $data;
	}
	if (count($result['region_expression']) === 0) {
		$result['msg'] = 'There is no expression data available for '.$cancer.'. Please try another cancer type.';
		echo(json_encode($result));
		die;
	}

	// Add the copy number data.
	$copyNumberData = array();
	if ($hgncSymbol) {
		$tableName = 'cnv_'.$cancer;
		$query = $db -> prepare("SELECT * FROM $tableName WHERE hgnc_symbol = :symbol");
		$query -> execute(array(':symbol' => $hgncSymbol));
		$row = $query -> fetchAll(PDO::FETCH_ASSOC);
		$data = $row[0];

		// Remove the gene symbol from the data array. We already have it, so we don't need to keep
		// it in there.
		$idToRemove = array_shift($data);
		$copyNumberData = $data;
	}
	$result['cnv'] = $copyNumberData;

	// Add the genomic variation data.
	$variationData = array();
	if ($hgncSymbol) {
		$tableName = 'snv_'.$cancer;
		$query = $db -> prepare("SELECT * FROM $tableName WHERE gene = :symbol");
		$query -> execute(array(':symbol' => $hgncSymbol));
		while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
			$sample = strtolower($row['sample']);
			$data = $row;
			$idToRemove = array_shift($data);
			$variationData[$sample] = $data;
		}
	}
	$result['snv'] = $variationData;
	
	// Add the phenotype data.
	$tableName = 'phenotype_survival_'.$cancer;
	$query = $db -> prepare("SELECT * FROM $tableName");
	$query -> execute();
	$phenotypeData = array();
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$sample = strtolower($row['sample']);
		$data = $row;
		$idToRemove = array_shift($data);
		$phenotypeData[$sample] = $data;
	}

	// Transform the phenotype data from this:
	// sample1: {clinical_variable_1: value, clinical_variable_2: value...},
	// sample2: {...}
	// to this:
	// clinical_variable_1: {sample1: value, sample2: value...},
	// clinical_variable_2: {...}
	// The goal is to make it easier to sort samples at the front-end side.
	$phenotypeDataTransformed = array();
	foreach ($data as $key => $value) {
		$phenotypeDataTransformed[$key] = array();
	}
	foreach ($phenotypeData as $sample => $sampleData) {
		foreach ($sampleData as $key => $value) {
			if ($value === '') {
				$phenotypeDataTransformed[$key][$sample] = null;
			} else {
				$phenotypeDataTransformed[$key][$sample] = $value;
			}
		}
	}
	$result['phenotype'] = $phenotypeDataTransformed;

	// Add any other genes or miRNAs that overlap with the selected gene or miRNA.
	$otherRegions = array();
	if ($result['region_annotation']['region_type'] == 'gene') {
		$query = $db -> prepare("SELECT DISTINCT(gene_stable_id) FROM gene_transcript_annotation WHERE chr = :chr AND gene_stable_id != :id AND ((gene_start BETWEEN :plotStart1 AND :plotEnd1) OR (gene_end BETWEEN :plotStart2 AND :plotEnd2))");
		$query -> execute(array(':chr' => $chromosome, ':id' => $result['region_annotation']['ensembl_id'], ':plotStart1' => $plotStart, ':plotEnd1' => $plotEnd, ':plotStart2' => $plotStart, ':plotEnd2' => $plotEnd));
	} else {
		$query = $db -> prepare("SELECT DISTINCT(gene_stable_id) FROM gene_transcript_annotation WHERE chr = :chr AND ((gene_start BETWEEN :plotStart1 AND :plotEnd1) OR (gene_end BETWEEN :plotStart2 AND :plotEnd2))");
		$query -> execute(array(':chr' => $chromosome, ':plotStart1' => $plotStart, ':plotEnd1' => $plotEnd, ':plotStart2' => $plotStart, ':plotEnd2' => $plotEnd));
	}
	$otherGenes = array();
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$ensemblId = $row['gene_stable_id'];
		array_push($otherGenes, $ensemblId);
	}
	foreach ($otherGenes as $otherGene) {
		$regionType = 'gene';
		$query = $db -> prepare("SELECT * FROM gene_transcript_annotation WHERE gene_stable_id = :id");
		$query -> execute(array(':id' => $otherGene));
		$transcripts = array();
		while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
			$ensemblId = $row['gene_stable_id'];
			$hgncSymbol = $row['hgnc_symbol'];
			$regionStart = $row['gene_start'];
			$regionEnd = $row['gene_end'];
			$strand = $row['strand'];
			$transcriptId = $row['transcript_stable_id'];
			$transcriptStart = $row['transcript_start'];
			$transcriptEnd = $row['transcript_end'];
			$transcripts[$transcriptId] = array('start' => $transcriptStart, 'end' => $transcriptEnd);
		}
		$otherRegions[] = array(
			'region_type' => $regionType,
			'ensembl_id' => $ensemblId,
			'name' => $hgncSymbol,
			'start' => $regionStart,
			'end' => $regionEnd,
			'strand' => $strand,
			'transcripts' => $transcripts
		);
	}
	if ($result['region_annotation']['region_type'] == 'mirna') {
		$query = $db -> prepare("SELECT * FROM mirna_annotation WHERE chr = :chr AND name != :name AND ((mirna_start BETWEEN :plotStart1 AND :plotEnd1) OR (mirna_end BETWEEN :plotStart2 AND :plotEnd2))");
		$query -> execute(array(':chr' => $chromosome, ':name' => $result['region_annotation']['name'], ':plotStart1' => $plotStart, ':plotEnd1' => $plotEnd, ':plotStart2' => $plotStart, ':plotEnd2' => $plotEnd));
	} else {
		$query = $db -> prepare("SELECT * FROM mirna_annotation WHERE chr = :chr AND ((mirna_start BETWEEN :plotStart1 AND :plotEnd1) OR (mirna_end BETWEEN :plotStart2 AND :plotEnd2))");
		$query -> execute(array(':chr' => $chromosome, ':plotStart1' => $plotStart, ':plotEnd1' => $plotEnd, ':plotStart2' => $plotStart, ':plotEnd2' => $plotEnd));
	}
	$otherMirnas = array();
	while ($row = $query -> fetch(PDO::FETCH_ASSOC)) {
		$name = $row['name'];
		array_push($otherMirnas, $name);
	}
	foreach ($otherMirnas as $otherMirna) {
		$regionType = 'mirna';
		$query = $db -> prepare("SELECT * FROM mirna_annotation WHERE name = :name");
		$query -> execute(array(':name' => $otherMirna));
		$row = $query -> fetchAll(PDO::FETCH_ASSOC);
		$regionStart = $row[0]['mirna_start'];
		$regionEnd = $row[0]['mirna_end'];
		$otherRegions[] = array(
			'region_type' => $regionType,
			'name' => $name,
			'start' => $regionStart,
			'end' => $regionEnd,
			'strand' => $row[0]['strand']
		);
	}
	$result['other_regions'] = $otherRegions;
	$result['success'] = true;
} catch (Exception $e) {
	//$errorMessage = $e -> getMessage();
	$result['msg'] = 'Could not download the data from the database. Please try again or contact <a href="mailto:a.koch@maastrichtuniversity.nl">a.koch@maastrichtuniversity.nl</a> if the problem persists.';
}

// Add the genomic sequence of the selected region. This sequence will be used to indicate the
// presence of CpG dinucleotides in the final plot.
$sequence = '';
try {
	if ($chromosome && $plotStart && $plotEnd) {
		//$ensemblStrand = ($strand == '+' ? '1' : '-1');
		// Always show the CpGs for the + strand, regardless of the strand on which the main region
		// is located. This will significantly simplify the drawing code.
		$ensemblStrand = '1';
		$url = 'https://rest.ensembl.org/sequence/region/human/'.$chromosome.':'.$plotStart.'..'.$plotEnd.':'.$ensemblStrand.'?content-type=text/plain;coord_system_version=GRCh38';
		$curl = curl_init($url);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
		$sequence = curl_exec($curl);
		curl_close($curl);
		$successfulRequest = true;
		if ($sequence === false) {
			$sequence = '';
			$result['msg'] = 'Could not retrieve the genomic sequence from Ensembl.';
		}
	}
} catch (Exception $e) {
	$result['msg'] = 'Could not retrieve the genomic sequence from Ensembl.';
}
$result['region_annotation']['sequence'] = $sequence;

if (function_exists('ob_gzhandler')) {
	ob_start('ob_gzhandler');
} else {
	ob_start();
}
echo json_encode($result);
ob_end_flush();

?>