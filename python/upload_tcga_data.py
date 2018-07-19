#!/usr/bin/env python

"""Upload TCGA data

Upload the following data to the MEXPRESS database:
- RNA-seq gene expression
- DNA methylation
- copy number
- miRNA expression
- somatic mutations
- phenotype & survival

Usage:
python python/upload_tcga_data.py -h | --help
python python/upload_tcga_data.py \\
-i | --ini config_file \\
-c | --cancer cancer_type

Options:
-h | --help: show the help message
config_file: path to the config.ini file that contains the login
             details for the MEXPRESS database
cancer_type: the abbreviated TCGA cancer type for which you want to
             download the data, for example 'brca' for breast
             adenocarcinoma. Use 'all' to download the data for all the
             cancer types at once.
"""

import database_setup as ds
import getopt
import os
import pymysql
import sys
import upload_annotation_data as uad

from contextlib import closing


def create_table(login_info, table, file, file_path):
	try:
		with open(file_path) as fh:
			column_names = fh.readline()
			column_names = column_names.strip().lower().split('\t')
	except IOError as e:
		raise e
	if len(column_names) > 1:
		conn = pymysql.connect(host=login_info['host'], user=login_info['username'],
			password=login_info['password'], db=login_info['database'])
		try:
			with closing(conn.cursor()) as cur:
				sql = 'DROP TABLE IF EXISTS {0};'.format(table)
				sql += 'CREATE TABLE {0}('.format(table)
				if file in ('HumanMethylation27.tsv', 'HumanMethylation450.tsv'):
					# DNA methylation values are positive decimal
					# values between 0 and 1.
					row_id = column_names.pop(0)
					sql += '{0} VARCHAR(255),'.format(row_id)
					for column_name in column_names:
						sql += '{0} DECIMAL(4,3) UNSIGNED,'.format(column_name)
					sql = sql.rstrip(',')
					sql += ')ENGINE=INNODB;'
					sql += 'CREATE INDEX probe_id_index ON {0} (probe_id);'.format(table)
				elif file in ('htseq_fpkm-uq.tsv', 'mirna.tsv'):
					# Gene and miRNA expression values are positive
					# decimal values below 9999.999.
					row_id = column_names.pop(0)
					sql += '{0} VARCHAR(255),'.format(row_id)
					for column_name in column_names:
						sql += '{0} DECIMAL(7,3) UNSIGNED,'.format(column_name)
					sql = sql.rstrip(',')
					sql += ')ENGINE=INNODB;'
					sql += 'CREATE INDEX {0}_index ON {1} ({0});'.format(
						column_names[0], table)
				elif file == 'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.tsv':
					# The copy number data can take the following
					# values: -2, -1, 0, 1, 2
					row_id = column_names.pop(0)
					sql += '{0} VARCHAR(255),'.format(row_id)
					for column_name in column_names:
						sql += '{0} TINYINT,'.format(column_name)
					sql = sql.rstrip(',')
					sql += ')ENGINE=INNODB;'
					sql += 'CREATE INDEX hgnc_symbol_index ON {0} (hgnc_symbol);'.format(
						table)
				elif file == 'mutect2_snv.tsv':
					# We hard code the variant table, because it
					# contains columns that will be used to filter the
					# table (chr, start, end), so it's important that
					# these columns are stored with the appropriate
					# data type.
					sql += ('sample VARCHAR(255), gene VARCHAR(255), chr VARCHAR(255), '
						'start INT(10) UNSIGNED, end INT(10) UNSIGNED, ref VARCHAR(255)'
						', alt VARCHAR(255), amino_acid_change VARCHAR(255), effect '
						'VARCHAR(255), filter VARCHAR(255), dna_vaf DECIMAL(4,3))ENGINE='
						'INNODB;')
					sql += 'CREATE INDEX sample_index ON {0} (sample);'.format(table)
					sql += 'CREATE INDEX gene_index ON {0} (gene);'.format(table)
					sql += 'CREATE INDEX chr_index ON {0} (chr);'.format(table)
					sql += 'CREATE INDEX start_index ON {0} (start);'.format(table)
					sql += 'CREATE INDEX end_index ON {0} (end);'.format(table)
				elif file == 'phenotype_survival.tsv':
					# Because the phenotype data contain different
					# data types for different cancer types, we will
					# simply store all the data as VARCHAR and deal
					# with assigning the correct data type when the
					# data are actually used.
					for column_name in column_names:
						sql += '{0} VARCHAR(255),'.format(column_name)
					sql = sql.rstrip(',')
					sql += ')ENGINE=INNODB;'
					sql += 'CREATE INDEX sample_index ON {0} (sample);'.format(table)
				# Since the latest PyMySQL version can't execute more than one SQL query
				# in a single execute (this worked for PyMySQl 0.7.11, but broke after
				# updating to version 0.9.2), so we have to loop over the individual
				# statements and execute them separately.
				sql = sql.rstrip(';')
				for s in sql.split(';'):
					cur.execute(s)
			conn.commit()
		except Exception as e:
			print 'ERROR: SQL query failed'
			print sql
			raise e
	else:
		print 'ERROR: Not enough column names found'
		print '- table: {0}'.format(table)
		print '- file: {0}'.format(file)
		sys.exit(0)


def help():
	print __doc__
	sys.exit(0)


def main(argv):
	try:
		opts, args = getopt.getopt(argv, 'i:c:h', ['ini=', 'cancer='])
	except getopt.GetoptError as err:
		print str(err)
		help()
	config_file = ''
	cancer_type = ''
	accepted_cancer_types = ('acc', 'blca', 'brca', 'cesc', 'chol', 'coad', 'dlbc',
		'esca', 'gbm', 'hnsc', 'kich', 'kirc', 'kirp', 'laml', 'lgg', 'lihc', 'luad',
		'lusc', 'meso', 'ov', 'paad', 'pcpg', 'prad', 'read', 'sarc', 'skcm', 'stad',
		'tgct', 'thca', 'thym', 'ucec', 'ucs', 'uvm')
	for opt, arg in opts:
		if opt in ('-h', '--help'):
			help()
		elif opt in ('-i', '--ini'):
			config_file = arg
		elif opt in ('-c', '--cancer'):
			cancer_type = arg.lower()
	if config_file == '':
		print 'Please check that you did not forget the database config file.'
		help()
	elif cancer_type not in accepted_cancer_types and cancer_type != 'all':
		print
		print 'The cancer type should be "all" or one of the following:'
		print ', '.join(accepted_cancer_types)
		print
		sys.exit(0)
	login_info = ds.get_database_info(config_file)
	print 'Uploading data for:'
	if cancer_type == 'all':
		for c in accepted_cancer_types:
			print c.upper()
			upload_tcga_files(login_info, c)
	else:
		print cancer_type.upper()
		upload_tcga_files(login_info, cancer_type)
	print 'Done!'


def upload_tcga_files(login_info, cancer_type):
	data_tables = {
		'phenotype_survival.tsv': 'phenotype_survival_',
		'HumanMethylation27.tsv': 'dna_methylation_27_',
		'HumanMethylation450.tsv': 'dna_methylation_450_',
		'htseq_fpkm-uq.tsv': 'gene_expression_',
		'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.tsv': 'cnv_',
		'mirna.tsv': 'mirna_expression_',
		'mutect2_snv.tsv': 'snv_'
	}
	data_dir = 'data/{0}/'.format(cancer_type)
	if os.path.exists(data_dir):
		for file in os.listdir(data_dir):
			if file in data_tables:
				print file
				file_path = data_dir + file
				table_name = data_tables[file] + cancer_type
				print '- creating table...'
				create_table(login_info, table_name, file, file_path)
				print '- uploading data...'
				uad.upload_file(login_info, table_name, file_path)
	else:
		print 'Could not find the folder {0}. Moving on...'.format(data_dir)


if __name__ == '__main__':
	main(sys.argv[1:])
