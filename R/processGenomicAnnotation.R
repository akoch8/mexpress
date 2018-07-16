###
### Process the genomic annotation data. These include:
### - CpG islands (source: UCSC genome browser)
### - non-coding RNA (source: UCSC genome browser)
### - gene, transcript and exon (source: Ensembl)
### All genomic features have been mapped to the human genome version
### GRCh38/hg38.
###
### The following aspects of the data need to be normalised:
### - strand
###   UCSC uses + and -, Ensembl uses 1 and -1
###   We will use the UCSC format.
### - genomic location
###   UCSC coordinates are 0-based, Ensembl coordinates are 1-based
###   We will use the Ensembl coordinates.
###
### This script assumes that the working directory is the main MEXPRESS
### folder and that the following R packages are installed:
### - data.table
###

library(data.table)

cpgiFile = 'data/cpgi_annotation_hg38.txt'
ncRnaFile = 'data/miRNA_snoRNA_annotations_hg38.txt'
geneTranscriptFile = 'data/gene_transcript_annotation_GRCh38.p12.txt'
transcriptExonFile = 'data/transcript_exon_annotation_GRCh38.p12.txt'

# CpG island annotation: convert to 1-based coordinates and change the chromosome names.
x = fread(cpgiFile, data.table=F)
x$chromStart = x$chromStart + 1
x$chrom = gsub('chr', '', x$chrom)
write.table(x, cpgiFile, row.names=F, col.names=T, sep='\t', quote=F)

# Non-coding RNA: convert to 1-based coordinates and change the chromosome names.
x = fread(ncRnaFile, data.table=F)
x$chromStart = x$chromStart + 1
x$chrom = gsub('chr', '', x$chrom)
write.table(x, ncRnaFile, row.names=F, col.names=T, sep='\t', quote=F)

# Gene and transcript annotation: convert strand format.
x = fread(geneTranscriptFile, data.table=F)
x$Strand[which(x$Strand == -1)] = '-'
x$Strand[which(x$Strand == '1')] = '+'

# Replace missing gene symbols and entrez IDs with the string '\\N', which will be
# automatically recognized by MySQL as a missing value.
x[,'HGNC symbol'][which(x[,'HGNC symbol'] == '')] = '\\N'
x[,'NCBI gene ID'][is.na(x[,'NCBI gene ID'])] = '\\N'
write.table(x, geneTranscriptFile, row.names=F, col.names=T, sep='\t', quote=F)

# Transcript and exon annotation: convert strand format.
x = fread(transcriptExonFile, data.table=F)
x$Strand[which(x$Strand == -1)] = '-'
x$Strand[which(x$Strand == '1')] = '+'
write.table(x, transcriptExonFile, row.names=F, col.names=T, sep='\t', quote=F)
