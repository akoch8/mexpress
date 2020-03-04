#!/usr/bin/env python

"""Upload genomic annotation data

Upload the following genomic annotation data to the MEXPRESS database:
- CpG islands
- miRNA and other non-coding RNAs
- genes and transcripts

Usage:
python python/upload_annotation_data.py -h | --help
python python/upload_annotation_data.py \\
-i | --ini config_file \\
-c | --cpgi cpg_islands_file \\
-m | --mirna mirna_file \\
-g | --gene genes_transcripts_file \\
-e | --exon transcripts_exons_file \\
--inf450 infinium450k_file \\
--inf27 infinium27k_file

Options:
-h | --help: show the help message
config_file: path to the config.ini file that contains the login
             details for the MEXPRESS database
cpg_islands_file: path to the file that contains the CpG islands
                  annotation
mirna_file: path to the file that contains the miRNA annotation
genes_transcripts_file: path to the file that contains the gene and
                        transcript annotation
transcripts_exons_file: path to the file that contains the transcript
                        and exon annotation
infinium[450|27]k_file: paths to the files that contain the Infinium
                        probe annotations
"""

import ConfigParser
import database_setup as ds
import getopt
import pymysql
import sys

from contextlib import closing


def help():
	print(__doc__)
	sys.exit(0)


def main(argv):
	try:
		opts, args = getopt.getopt(argv, 'i:c:m:g:e:h',
			['ini=', 'cpgi=', 'mirna=', 'gene=', 'exon=', 'inf450=', 'inf27='])
	except getopt.GetoptError as err:
		print(str(err))
		help()
	config_file = ''
	cpgi_file = ''
	mirna_file = ''
	gene_file = ''
	exon_file = ''
	inf_450_file = ''
	inf_27_file = ''
	for opt, arg in opts:
		if opt in ('-h', '--help'):
			help()
		elif opt in ('-i', '--ini'):
			config_file = arg
		elif opt in ('-c', '--cpgi'):
			cpgi_file = arg
		elif opt in ('-m', '--mirna'):
			mirna_file = arg
		elif opt in ('-g', '--gene'):
			gene_file = arg
		elif opt in ('-e', '--exon'):
			exon_file = arg
		elif opt == '--inf450':
			inf_450_file = arg
		elif opt == '--inf27':
			inf_27_file = arg
	if (config_file == '' or cpgi_file == '' or mirna_file == '' or gene_file == '' or
		exon_file == '' or inf_450_file == '' or inf_27_file == ''):
		print('Please check that you did not forget any files.')
		help()
	login_info = ds.get_database_info(config_file)
	print('Uploading annotation data for:')
	print('CpG islands...')
	upload_file(login_info, 'cpgi_annotation', cpgi_file)
	print('non-coding RNA...')
	upload_file(login_info, 'mirna_annotation', mirna_file)
	print('genes and transcripts...')
	upload_file(login_info, 'gene_transcript_annotation', gene_file)
	print('exons...')
	upload_file(login_info, 'transcript_exon_annotation', exon_file)
	print('Infinium probes...')
	upload_file(login_info, 'infinium450k_annotation', inf_450_file)
	upload_file(login_info, 'infinium27k_annotation', inf_27_file)
	print('Done!')


def upload_file(login_info, table, file):
	conn = pymysql.connect(host=login_info['host'], user=login_info['username'],
						   password=login_info['password'], db=login_info['database'],
						   local_infile=True)
	try:
		with closing(conn.cursor()) as cur:
			sql = ("LOAD DATA LOCAL INFILE '{0}' INTO TABLE {1} FIELDS TERMINATED BY "
				   "'\\t' LINES TERMINATED BY '\\n' IGNORE 1 LINES").format(file, table)
			cur.execute(sql)
		conn.commit()
	except Exception as e:
		raise e


if __name__ == '__main__':
	main(sys.argv[1:])
