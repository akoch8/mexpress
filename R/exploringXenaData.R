###
### Explore the different GDC & TCGA data types available through the
### Xena public data hubs.
###
### This script assumes that the working directory is the main MEXPRESS
### folder.
###

library(data.table)

cancerType = 'cesc'
plotCol = '#ffa96a'

# Gene expression RNA-seq data
x = fread(paste0('data/', cancerType, '/htseq_fpkm-uq.tsv'), data.table=F)
dim(x)
head(x[,1:10])
length(unique(x$Ensembl_ID))
length(unique(gsub('\\.\\d+$', '', x$Ensembl_ID)))
nrow(x[which(x$Ensembl_ID == 'ENSG00000201448.1'),])
nrow(x[which(gsub('\\.\\d+$', '', x$Ensembl_ID, perl=T) == 'ENSG00000084207'),])
length(unique(colnames(x)[-1]))
length(unique(gsub('.$', '', colnames(x)[-1])))
duplicatedSamples = gsub('.$', '', colnames(x)[-1])
duplicatedSamples = duplicatedSamples[duplicated(duplicatedSamples)]
for (i in 1:length(duplicatedSamples)) {
	message(paste(colnames(x)[grepl(duplicatedSamples[i], colnames(x))], collapse=' + '))
}

# DNA methylation data
x = fread(paste0('data/', cancerType, '/HumanMethylation450'), data.table=F, nrows=1000)
dim(x)
head(x[,1:10])

# Copy number data
x = fread(paste0('data/', cancerType, '/Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes.tsv'), data.table=F)
dim(x)
head(x[,1:10])
length(unique(x$sample))
hist(table(x$sample), border=plotCol, col=plotCol, breaks=seq(0,max(table(x$sample))+100,100))

# miRNA expression data
x = fread(paste0('data/', cancerType, '/mirna.tsv'), data.table=F)
dim(x)
head(x[,1:10])

# Somatic mutation data
x = fread(paste0('data/', cancerType, '/mutect2_snv.tsv'), data.table=F)
# dna_vaf: VAF = Variant Allele Frequency
#			   = fraction of sequencing reads overlapping a genomic
#				 coordinate that supports the non-reference allele
#			   = sequencing depth of alt allele/total sequencing depth
dim(x)
head(x)
length(unique(x$Sample_ID))
hist(table(x$Sample_ID))

length(unique(gsub('.$', '', x$Sample_ID)))

effectsTmp = x$effect
effects = vector()
test = sapply(effectsTmp, function(x) {
	return(unlist(strsplit(x, ';')))
})
test = names(test)
length(test)
tbl = table(test)
tbl = tbl[order(tbl, decreasing=T)]
head(tbl, n=20)
barplot(head(tbl))
nrow(x[grepl('missense_variant', x$effect),])/nrow(x)*100
par(mar=c(20, 4, 2, 2))
bp = barplot(tbl[1:20], xaxt='n', yaxt='n', col=plotCol, border=plotCol)
axis(1, at=bp, labels=NA)
axis(1, at=bp, labels=names(tbl)[1:20], lwd=0, las=2, cex.axis=0.65)
axis(2, at=seq(0, 400000, 50000), las=2, cex.axis=0.8)

geneTable = table(x$gene)
geneTable = geneTable[order(geneTable, decreasing=T)]
length(geneTable)
head(geneTable)
hist(geneTable, breaks=seq(0,30,1), border=plotCol, col=plotCol)

# Phenotype data
x = fread(paste0('data/', cancerType, '/GDC_phenotype.tsv'), data.table=F)
dim(x)
head(x[,1:10])
head(x)
nrow(x)
nrow(unique(x[,-1]))
uniqueSamples = unique(x$submitter_id.samples)
length(uniqueSamples)
length(unique(gsub('.$', '', uniqueSamples)))
uniqueSamples[duplicated(gsub('.$', '', uniqueSamples))]
x[grepl('TCGA-BK-A0CA-01', x$submitter_id.samples),c('submitter_id.samples', 'days_to_collection.samples')]
colnames(x)
head(x[,grepl('age_', colnames(x))])
x[x$is_ffpe.samples == 'TRUE',c('submitter_id.samples', 'is_ffpe.samples', 'days_to_collection.samples')]

# Survival data
x = fread(paste0('data/', cancerType, '/survival.tsv'), data.table=F)
dim(x)
head(x)
length(unique(x$sample))
length(unique(gsub('.$', '', x$sample)))
nrow(x)
nrow(unique(x[,-1]))
length(unique(x$'_PATIENT'))
x[x$'_PATIENT' %in% x$'_PATIENT'[duplicated(x$'_PATIENT')],]
x[which(x$'_EVENT' != x$'_OS_IND'),]
x[which(x$'_TIME_TO_EVENT' != x$'_OS'),]
