#!/usr/bin/env python

"""Download TCGA data from UCSC Xena's public data hub

UCSC Xena offers cancer genomics data from different sources, including
TCGA (both the origincal TCGA and the newer GDC TCGA data). The data
hubs can be accessed here: http://xena.ucsc.edu/public-hubs/
This script downloads the data that are used by mexpress and stores
all data in separate folders, one for each cancer type. In case these
folders don't exist (for example when this script is run for the first
time), they will be created.

This script should be run inside the home directory of the mexpress2.0
project!

Usage:
python python/download_xena_data.py -h | --help
python python/download_xena_data.py -c | --cancer cancer_type

Options:
-h | --help: show the help message
cancer_type: the abbreviated TCGA cancer type for which you want to
             download the data, for example 'brca' for breast
             adenocarcinoma. Use 'all' to download the data for all the
             cancer types at once.
"""

import getopt
import gzip
import os
import requests
import sys

from datetime import datetime


def download_data(cancer_type):
	"""Download TCGA data from Xena public data hubs

	This function downloads the following types of data for a given
	TCGA cancer_type (including the metadata):
	- RNA-seq gene expression
	- DNA methylation
	- copy number
	- miRNA expression
	- somatic mutations
	- phenotype
	- survival
	
	The GDC TCGA hub is used for all types of data, except for:
	- DNA methylation: these data are only available through the
					   original TCGA hub
	"""
	try:
		os.makedirs('data/' + cancer_type)
	except OSError:
		if not os.path.isdir('data/' + cancer_type):
			print('Could not create the folder data/{0}/'.format(cancer_type))
			raise
	base_url_gdc = ('https://gdc.xenahubs.net/download/TCGA-{0}.'
		.format(cancer_type.upper()))
	base_url_tcga = ('https://tcga.xenahubs.net/download/TCGA.{0}.sampleMap/'
		.format(cancer_type.upper()))
	print('-> gene expression RNA-seq')
	download_file(cancer_type, base_url_gdc, 'htseq_fpkm-uq.tsv.gz')
	download_file(cancer_type, base_url_gdc, 'htseq_fpkm-uq.tsv.json')
	print('-> DNA methylation')
	download_file(cancer_type, base_url_tcga, 'HumanMethylation450.gz')
	download_file(cancer_type, base_url_tcga, 'HumanMethylation450.json')
	download_file(cancer_type, base_url_tcga, 'HumanMethylation27.gz')
	download_file(cancer_type, base_url_tcga, 'HumanMethylation27.json')
	#print('-> copy number')
	#download_file(cancer_type, base_url_gdc, 'masked_cnv.tsv.gz')
	#download_file(cancer_type, base_url_gdc, 'masked_cnv.tsv.json')
	print('-> copy number')
	download_file(cancer_type, base_url_tcga,
		'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.gz')
	download_file(cancer_type, base_url_tcga,
		'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.json')
	print('-> miRNA expression')
	download_file(cancer_type, base_url_gdc, 'mirna.tsv.gz')
	download_file(cancer_type, base_url_gdc, 'mirna.tsv.json')
	print('-> somatic mutation')
	download_file(cancer_type, base_url_gdc, 'mutect2_snv.tsv.gz')
	download_file(cancer_type, base_url_gdc, 'mutect2_snv.tsv.json')
	print('-> phenotype')
	download_file(cancer_type, base_url_gdc, 'GDC_phenotype.tsv.gz')
	download_file(cancer_type, base_url_gdc, 'GDC_phenotype.tsv.json')
	print('-> survival')
	download_file(cancer_type, base_url_gdc, 'survival.tsv.gz')
	download_file(cancer_type, base_url_gdc, 'survival.tsv.json')


def download_file(cancer_type, base_url, file):
	"""Download a file from the public Xena data hub

	A particular file is downloaded from the public Xena data hub. If this file is
	gzipped and not empty, it is unzipped after which the compressed
	file is removed.
	"""
	url = base_url + file
	try:
		r = requests.get(url, stream=True)
	except Exception as e:
		print('Data download request failed')
		print('cancer_type = {0}'.format(cancer_type))
		print('url = {0}'.format(url))
		raise e
	file_path = 'data/' + cancer_type + '/' + file
	try:
		open(file_path, 'wb').write(r.content)
	except Exception as e:
		print('Could not write downloaded data to disk')
		print('cancer_type = {0}'.format(cancer_type))
		print('file = {0}'.format(cancer_type + '/' + file))
		raise e

	# If the file is compressed and not empty, unzip it. The Xena data
	# hubs return an empty file instead of an error when a file doesn't
	# exist.
	if file_path.lower().endswith('.gz'):
		if os.path.getsize(file_path) > 0:
			with gzip.open(file_path, 'rb') as fh_in:
				fh_in_content = fh_in.read()
				out_file = file_path.replace('.gz', '')
				if not out_file.endswith('.tsv'):
					out_file += '.tsv'
				with open(out_file, 'wb') as fh_out:
					fh_out.write(fh_in_content)

		# Remove the compressed file.
		os.remove(file_path)


def help():
	print(__doc__)
	sys.exit(0)


def main(argv):
	try:
		opts, args = getopt.getopt(argv, 'c:h', ['cancer='])
	except getopt.GetoptError as err:
		print(str(err))
		help()
	cancer_type = ''
	accepted_cancer_types = ('acc', 'blca', 'brca', 'cesc', 'chol', 'coad', 'dlbc',
		'esca', 'gbm', 'hnsc', 'kich', 'kirc', 'kirp', 'laml', 'laml', 'lgg', 'lihc',
		'luad', 'lusc', 'meso', 'ov', 'paad', 'pcpg', 'prad', 'read', 'sarc', 'skcm',
		'stad', 'tgct', 'thca', 'thym', 'ucec', 'ucs', 'uvm')
	for opt, arg in opts:
		if opt in ('-h', '--help'):
			help()
		elif opt in ('-c', '--cancer'):
			cancer_type = arg.lower()
	if cancer_type == '':
		help()
	elif cancer_type not in accepted_cancer_types and cancer_type != 'all':
		print()
		print('The cancer type should be "all" or one of the following:')
		print(', '.join(accepted_cancer_types))
		print()
		sys.exit(0)
	start = datetime.now()
	try:
		os.makedirs('data')
	except OSError:
		if not os.path.isdir('data'):
			print('Could not create the folder data/')
			raise
	print('Downloading data for:')
	if cancer_type == 'all':
		for c in accepted_cancer_types:
			print(c.upper())
			download_data(c)
	else:
		print(cancer_type.upper())
		download_data(cancer_type)
	print('Done!')
	time = datetime.now() - start
	print('Total runtime = {0}'.format(str(time).split('.')[0]))


if __name__ == '__main__':
	main(sys.argv[1:])
