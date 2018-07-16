###
### Process the TCGA variant data.
###
### The sample names need to be normalised:
###   The DNA methylation data uses this sample name format:
###   TCGA-D1-A0ZV-01, while all other data types use TCGA-2E-A9G8-01A,
###   indicating that sample repeats have already been aggregated for
###   the DNA methylation data. Since we cannot 'de-aggregate' the DNA
###   methylation data, we have to aggregate all the other data types.
### 
### This script assumes that the working directory is the main MEXPRESS
### folder and that the data.table library is installed.
###

library(data.table)

cancerTypes = c('acc', 'blca', 'brca', 'cesc', 'chol', 'coad', 'dlbc', 'esca', 'gbm', 'hnsc', 'kich', 'kirc', 'kirp', 'laml', 'lgg', 'lihc', 'luad', 'lusc', 'meso', 'ov', 'paad', 'pcpg', 'prad', 'read', 'sarc', 'skcm', 'stad', 'tgct', 'thca', 'thym', 'ucec', 'ucs', 'uvm')
dataFileName = 'mutect2_snv.tsv'

for (i in 1:length(cancerTypes)) {
	message(cancerTypes[i])
	dataDir = paste0('data/', cancerTypes[i], '/')
	if (file.access(dataDir) == 0) {
		dataFile = paste0(dataDir, dataFileName)
		
		# Check if the file exists.
		if (file.access(dataFile) == 0) {
			x = fread(dataFile, data.table=F)
			
			# Process the column and sample names.
			colnames(x) = tolower(colnames(x))
			colnames(x)[1] = 'sample'
			x$sample = gsub('-', '_', x$sample)
			
			# Check for duplicate samples. During the testing of this code, no duplicate
			# samples were found, so this situation should not occur.
			if (length(unique(x$sample)) != length(unique(gsub('[A-Z]$', '', x$sample)))) {
				message('ERROR: Found duplicate samples in the variant data!')
				message(paste0('- Cancer type: ', cancerTypes[i], ' (index: ', i, ')'))
				message(paste0('- Duplicated samples: ', paste(duplicatedSamples, collapse=', ')))
				message('Data not saved. Moving on to the next cancer type...')
				next
			}
			
			# Remove the vial annotation from the sample names.
			x$sample = gsub('[A-Z]$', '', x$sample, perl=T)
			
			# Process the chromosome names.
			x$chrom = gsub('^chr', '', x$chr)
			
			# Round the variant allele frequency
			x$dna_vaf = round(x$dna_vaf, digits=3)
			
			# Make sure MySQL can recognize the empty values.
			x[is.na(x)] = '\\N'
			write.table(x, dataFile, row.names=F, col.names=T, sep='\t', quote=F)
		} else {
			message(paste0('   File ', dataFile, ' not found. Moving on...'))
			next
		}
	} else {
		message(paste0('Directory ', dataDir, ' not found. Moving on...'))
	}
}
