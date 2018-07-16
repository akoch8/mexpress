###
### Process the epigenomics TCGA data. These include:
### - RNA-seq gene expression
### - DNA methylation
### - copy number
### - miRNA expression
###
### The sample names used in the different data sets need to be normalised:
###   The DNA methylation data uses this sample name format:
###   TCGA-D1-A0ZV-01, while all other data types use TCGA-2E-A9G8-01A,
###   indicating that sample repeats have already been aggregated for
###   the DNA methylation data. Since we cannot 'de-aggregate' the DNA
###   methylation data, we have to aggregate all the other data types.
### 
### This script assumes that the working directory is the main MEXPRESS
### folder and that the following R packages are installed:
### - data.table
###

library(data.table)

cancerTypes = c('acc', 'blca', 'brca', 'cesc', 'chol', 'coad', 'dlbc', 'esca', 'gbm', 'hnsc', 'kich', 'kirc', 'kirp', 'laml', 'lgg', 'lihc', 'luad', 'lusc', 'meso', 'ov', 'paad', 'pcpg', 'prad', 'read', 'sarc', 'skcm', 'stad', 'tgct', 'thca', 'thym', 'ucec', 'ucs', 'uvm')
dataFiles = c('htseq_fpkm-uq.tsv', 'HumanMethylation27.tsv', 'HumanMethylation450.tsv', 'mirna.tsv', 'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.tsv')

for (i in 1:length(cancerTypes)) {
	message(cancerTypes[i])
	dataDir = paste0('data/', cancerTypes[i], '/')
	if (file.access(dataDir) == 0) {
		for (j in 1:length(dataFiles)) {
			message(paste0('-- ', dataFiles[j]))
			dataFile = paste0(dataDir, dataFiles[j])
			
			# Check if the file exists.
			if (file.access(dataFile) == 0) {
				x = fread(dataFile, data.table=F)
				
				# Process the column names.
				colnames(x) = gsub('-', '_', colnames(x))
				
				# Make the gene/RNA/probe identifiers the row names and remove their
				# column from the table. This will make the processing simpler. We just
				# have to add them back at the end.
				dataPointsName = colnames(x)[1]
				rownames(x) = x[,1]
				x = x[,-1]
				uniqueSamples = gsub('[A-Z]$', '', colnames(x), perl=T)
				samplesToAggregate = uniqueSamples[duplicated(uniqueSamples)]
				if (length(samplesToAggregate) == 0) {
					# No need to aggregate the samples, because there were no
					# repeats.
					message('   No repeated samples found.')
					colnames(x) = uniqueSamples
				} else {
					# One or more sample repeats have to be aggregated.
					message('   Aggregating repeated samples...')
					
					# Instead of working with the whole table (which can get very
					# large), we will single out the columns that need to be aggregated.
					# This will significantly speed up the aggregation.
					for (k in 1:length(samplesToAggregate)) {
						columnsToAggregate = which(grepl(samplesToAggregate[k], colnames(x)))
						x[,samplesToAggregate[k]] = rowMeans(x[,columnsToAggregate])
						x = x[,-columnsToAggregate]
					}
				}
				
				# Round all the numeric values.
				for (k in 1:ncol(x)) {
					x[,k] = round(x[,k], digits=3)
				}
				
				# Make sure MySQL can recognize the empty values.
				x[is.na(x)] = '\\N'
				x[,dataPointsName] = rownames(x)
				x = x[,c(ncol(x), 1:(ncol(x)-1))]
				if (dataFiles[j] == 'Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.tsv') {
					colnames(x)[1] = 'hgnc_symbol'
				} else if (grepl('HumanMethylation', dataFiles[j])) {
					colnames(x)[1] = 'probe_id'
				} else if (dataFiles[j] == 'htseq_fpkm-uq.tsv') {
					x[,1] = gsub('\\.\\d+$', '', x[,1], perl=T)
				}
				write.table(x, dataFile, row.names=F, col.names=T, sep='\t', quote=F)
			} else {
				message(paste0('   File ', dataFile, ' not found. Moving on...'))
				next
			}
		}
	} else {
		message(paste0('Directory ', dataDir, ' not found. Moving on...'))
	}
}
