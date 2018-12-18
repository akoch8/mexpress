###
### Find the unique sample types in the TCGA cancer types available in MEXPRESS.
### The idea is to assign a unique color to each sample type (for consistency
### accross figures), but because there are more than 12 possible sample types
### and I only have 12 unique distinguishable colors to assign, I want to find
### the sample types that are actually present in the data.
###

library(data.table)

# The column names from which the sample names can be extracted were obtained from
# the original mexpress database (old version of mexpress) on matrix.ugent.be using
# the following command:
# echo "select column_name from columns where table_schema = 'mexpress'" | \
# mysql --host=localhost --user=mexpress --password=hcjpuf information_schema > columns.txt
# Note that this commaned must be run as super user! I used this workaround instead
# just selecting the column names into an outfile from mysql, because I did not have
# the necessary permissions.
columns = fread('~/Sites/mexpress2.0/data/columns.txt', data.table=F, header=F)
columns = as.character(columns[,1])

# Extract the sample names from the column names.
columns = tolower(columns)
columns = columns[grepl('^tcga_', columns)]
columns = gsub('[abc]$', '', columns)
columns = unique(columns)

# Extract the sample types from the sample names.
sampleTypes = gsub('.+_', '', columns)
sampleTypes = table(sampleTypes)
sampleTypes = sampleTypes[order(sampleTypes, decreasing=T)]
sampleTypes
