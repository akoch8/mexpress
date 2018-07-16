###
### Process the annotation data of the Infinium probes.
### All data was downloaded from:
### Wanding Zhou, Peter W Laird & Hui Shen
### Comprehensive characterization, annotation and innovative use of Infinium DNA
### methylation BeadChip probes
### Nucleic Acids Research 45, e22 (2016)
### https://academic.oup.com/nar/article/45/4/e22/2290930
### http://zwdzwd.github.io/InfiniumAnnotation
###
### All genomic locations are 1-based.
###
### This script assumes that the working directory is the main MEXPRESS
### folder and that the following R packages are installed:
### - data.table
###

library(data.table)

# Infinium 450k
inf450 = fread('data/hm450.hg38.manifest.tsv', data.table=F)
inf450 = inf450[,c('probeID', 'CpG_chrm', 'CpG_beg', 'CpG_end', 'probe_strand', 'probeBeg', 'probeEnd', 'designType', 'probeCpGcnt')]
colnames(inf450) = c('probe_id', 'chr', 'cpg_start', 'cpg_end', 'strand', 'probe_start', 'probe_end', 'design_type', 'cpg_count')
inf450$cpg_location = apply(inf450, 1, function(x) {
	if (x[5] == '+') {
		location = as.numeric(x[3]) + 1
	} else {
		location = as.numeric(x[4])
	}
	return(location)
})
inf450 = inf450[,c('probe_id', 'chr', 'cpg_location', 'strand', 'probe_start', 'probe_end', 'design_type', 'cpg_count')]
inf450 = inf450[!is.na(inf450$chr),]
inf450$chr = gsub('chr', '', inf450$chr)
write.table(inf450, 'data/infinium450k_annotation_hg38.txt', row.names=F, col.names=T, sep='\t', quote=F)

# Infinium 27k
inf27 = fread('data/hm27.hg38.manifest.tsv', data.table=F)
inf27 = inf27[,c('probeID', 'CpG_chrm', 'CpG_beg', 'CpG_end', 'probe_strand', 'probeBeg', 'probeEnd', 'designType', 'probeCpGcnt')]
colnames(inf27) = c('probe_id', 'chr', 'cpg_start', 'cpg_end', 'strand', 'probe_start', 'probe_end', 'design_type', 'cpg_count')
inf27$cpg_location = apply(inf27, 1, function(x) {
	if (x[5] == '+') {
		location = as.numeric(x[3]) + 1
	} else {
		location = as.numeric(x[4])
	}
	return(location)
})
inf27 = inf27[,c('probe_id', 'chr', 'cpg_location', 'strand', 'probe_start', 'probe_end', 'design_type', 'cpg_count')]
inf27 = inf27[!is.na(inf27$chr),]
inf27$chr = gsub('chr', '', inf27$chr)
write.table(inf27, 'data/infinium27k_annotation_hg38.txt', row.names=F, col.names=T, sep='\t', quote=F)
