--
-- Set up the MEXPRESS database
--
-- The MEXPRESS database is created with the following tables:
-- gene_transcript_annotation
-- transcript_exon_annotation
-- cpgi_annotation
-- mirna_annotation
-- infinium450k_annotation
-- infinium27k_annotation
-- breast_cancer_pam50subtypes
--
-- All genomic locations listed in these tables refer to the human
-- genome version GRCh38.
--
-- Other tables will be created upon the download and processing of the
-- relevant TCGA data:
-- phenotype_[cancer_type]
-- gene_expression_[cancer_type]
-- dna_methylation_27_[cancer_type]
-- dna_methylation_450_[cancer_type]
-- mirna_expression_[cancer_type]
-- cnv_[cancer_type]
-- snv_[cancer_type]
-- survival_[cancer_type]
--
DROP DATABASE IF EXISTS mexpress;
CREATE DATABASE mexpress;
USE mexpress;

CREATE TABLE gene_transcript_annotation(
	gene_stable_id VARCHAR(255),
	gene_stable_id_version VARCHAR(255),
	hgnc_symbol VARCHAR(255),
	entrez_id VARCHAR(255),
	chr VARCHAR(255),
	strand CHAR(1),
	gene_start INT UNSIGNED,
	gene_end INT UNSIGNED,
	transcript_stable_id VARCHAR(255),
	transcript_stable_id_version VARCHAR(255),
	transcript_start INT UNSIGNED,
	transcript_end INT UNSIGNED
)ENGINE=INNODB;
CREATE INDEX gene_stable_id_version_index ON gene_transcript_annotation (gene_stable_id_version);
CREATE INDEX hgnc_symbol_index ON gene_transcript_annotation (hgnc_symbol);
CREATE INDEX entrez_id_index ON gene_transcript_annotation (entrez_id);

CREATE TABLE transcript_exon_annotation(
	transcript_stable_id VARCHAR(255),
	chr VARCHAR(255),
	strand CHAR(1),
	exon_start INT UNSIGNED,
	exon_end INT UNSIGNED
)ENGINE=INNODB;
CREATE INDEX transcript_stable_id_index ON transcript_exon_annotation (transcript_stable_id);

CREATE TABLE cpgi_annotation(
	bin INT UNSIGNED,
	chr VARCHAR(255),
	cpgi_start INT UNSIGNED,
	cpgi_end INT UNSIGNED,
	name VARCHAR(255),
	length INT UNSIGNED,
	cpg_num INT UNSIGNED,
	gc_num INT UNSIGNED,
	percentage_cpg FLOAT,
	percentage_cg FLOAT,
	obs_exp FLOAT
)ENGINE=INNODB;

CREATE TABLE mirna_annotation(
	bin INT UNSIGNED,
	chr VARCHAR(255),
	mirna_start INT UNSIGNED,
	mirna_end INT UNSIGNED,
	name VARCHAR(255),
	score INT UNSIGNED,
	strand CHAR(1),
	thick_start INT UNSIGNED,
	thick_end INT UNSIGNED,
	type VARCHAR(255)
)ENGINE=INNODB;
CREATE INDEX name_index ON mirna_annotation (name);

-- Data source for all Infinium annotation:
-- Wanding Zhou, Peter W Laird & Hui Shen
-- Comprehensive characterization, annotation and innovative use of Infinium DNA
-- methylation BeadChip probes
-- Nucleic Acids Research 45, e22 (2016)
-- https://academic.oup.com/nar/article/45/4/e22/2290930
-- http://zwdzwd.github.io/InfiniumAnnotation
CREATE TABLE infinium450k_annotation(
	probe_id VARCHAR(20),
	chr VARCHAR(255),
	cpg_location INT UNSIGNED,
	strand CHAR(1),
	probe_start INT UNSIGNED,
	probe_end INT UNSIGNED,
	design_type CHAR(2),
	cpg_count TINYINT UNSIGNED
)ENGINE=INNODB;

CREATE TABLE infinium27k_annotation(
	probe_id VARCHAR(20),
	chr VARCHAR(255),
	cpg_location INT UNSIGNED,
	strand CHAR(1),
	probe_start INT UNSIGNED,
	probe_end INT UNSIGNED,
	design_type CHAR(2),
	cpg_count TINYINT UNSIGNED
)ENGINE=INNODB;

-- Data source for the PAM50 annotation:
-- The Cancer Genome Atlas
-- Comprehensive molecular portraits of human breast tumours
-- Nature 490, 61-70 (2012)
-- https://www.nature.com/articles/nature11412
-- Supplemental Table 1:
-- http://www.nature.com/nature/journal/v490/n7418/extref/nature11412-s2.zip
CREATE TABLE breast_cancer_pam50subtypes(
	sample VARCHAR(255),
	subtype VARCHAR(255)
)ENGINE=INNODB;
CREATE INDEX sample_index ON breast_cancer_pam50subtypes (sample);
