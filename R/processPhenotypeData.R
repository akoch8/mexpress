###
### Process the TCGA phenotype data.
###
### The sample names need to be normalised:
###   The DNA methylation data uses this sample name format:
###   TCGA-D1-A0ZV-01, while all other data types use TCGA-2E-A9G8-01A,
###   indicating that sample repeats have already been aggregated for
###   the DNA methylation data. Since we cannot 'de-aggregate' the DNA
###   methylation data, we have to aggregate all the other data types.
### 
### This script assumes that the working directory is the main MEXPRESS
### folder and that the following R packages are installed:
### - data.table
### - RJSONIO
###

library(data.table)
library(RJSONIO)

cancerTypes = c('acc', 'blca', 'brca', 'cesc', 'chol', 'coad', 'dlbc', 'esca', 'gbm', 'hnsc', 'kich', 'kirc', 'kirp', 'laml', 'lgg', 'lihc', 'luad', 'lusc', 'meso', 'ov', 'paad', 'pcpg', 'prad', 'read', 'sarc', 'skcm', 'stad', 'tgct', 'thca', 'thym', 'ucec', 'ucs', 'uvm')
dataFiles = c('GDC_phenotype.tsv', 'survival.tsv')
allVariables = fromJSON('data/variables.json', simplify=T)
allVariables = allVariables$gdc_tcga
brcaSubTypes = fread('data/breast_cancer_pam50subtypes.txt', data.table=F)
brcaSubTypes$sample = gsub('-', '_', brcaSubTypes$sample)
brcaSubTypes$subtype = tolower(brcaSubTypes$subtype)

for (i in 1:length(cancerTypes)) {
	message(cancerTypes[i])
	dataDir = paste0('data/', cancerTypes[i], '/')
	if (file.access(dataDir) == 0) {
		dataFilePheno = paste0(dataDir, dataFiles[1])
		dataFileSurv = paste0(dataDir, dataFiles[2])
		
		# Check if both files exist.
		if (file.access(dataFilePheno) == 0 & file.access(dataFileSurv) == 0) {
			pheno = fread(dataFilePheno, data.table=F)
			surv = fread(dataFileSurv, data.table=F)
			
			# Process the column names of the phenotype data so that they match the
			# names in the variables.json file.
			colnames(pheno) = tolower(colnames(pheno))
			colnames(pheno) = gsub('\\.+|-', '_', colnames(pheno))
			colnames(pheno) = gsub('_exposures', '', colnames(pheno))
			colnames(pheno) = gsub('_demographic', '', colnames(pheno))
			colnames(pheno) = gsub('_diagnoses', '', colnames(pheno))
			colnames(pheno) = gsub('_samples', '', colnames(pheno))
			colnames(pheno)[1] = 'sample'
			
			# Remove the FFPE samples.
			pheno = pheno[!pheno$is_ffpe,]
			
			# Select the clinical variables that need to be stored in the database.
			variables = allVariables[[cancerTypes[i]]]$phenotype
			pheno = pheno[,colnames(pheno) %in% c('sample', variables)]
			
			# The following phenotype variable names are longer than 65 characters, which
			# means that they can't be used as column names in MySQL and that we have to
			# shorten them.
			#
			# ACC
			# post_surgical_procedure_assessment_thyroid_gland_carcinoma_status
			colnames(pheno) = gsub('post_surgical_procedure_assessment', 'post_surgery', colnames(pheno))
			
			# BRCA
			# metastatic_breast_carcinoma_lab_proc_her2_neu_immunohistochemistry_receptor_status
			# metastatic_breast_carcinoma_lab_proc_her2_neu_in_situ_hybridization_outcome_type
			colnames(pheno) = gsub('immunohistochemistry', 'ihc', colnames(pheno))
			colnames(pheno) = gsub('breast_carcinoma', 'brca', colnames(pheno))
			colnames(pheno) = gsub('in_situ_hybridization', 'ish', colnames(pheno))
			
			# CESC
			# number_of_successful_pregnancies_which_resulted_in_at_least_1_live_birth
			colnames(pheno) = gsub('number_of_successful_pregnancies_which_resulted_in_at_least_1_live_birth',
				'successful_pregnancies_resulting_in_min_1_live_birth', colnames(pheno))
			
			# LAML
			# fluorescence_in_situ_hybrid_cytogenetics_metaphase_nucleus_result_count
			# hydroxyurea_administration_prior_registration_clinical_study_indicator
			colnames(pheno) = gsub('fluorescence_in_situ_hybrid', 'fish', colnames(pheno))
			colnames(pheno) = gsub('hydroxyurea_administration_prior_registration_clinical_study_indicator',
				'hydroxyurea_administration_prior_registration_clinical_study', colnames(pheno))
			
			# THCA
			# first_degree_relative_history_thyroid_gland_carcinoma_diagnosis_relationship_type
			colnames(pheno) = gsub('thyroid_gland_carcinoma', 'thca', colnames(pheno))
			
			# Process the selected clinical variables.
			# See https://github.com/jingchunzhu/wrangle/blob/master/TCGAscripts/Clinical.py
			# for an overview of some of the values that need to be dealt with.
			for (j in 2:ncol(pheno)) {
				pheno[,j] = gsub('\\[.*\\]|NULL|NA', '\\N', pheno[,j], perl=T, ignore.case=T)
				pheno[,j] = tolower(pheno[,j])
				pheno[,j][is.na(pheno[,j])] = '\\N'
				pheno[,j][which(pheno[,j] == '')] = '\\N'
				pheno[,j][grepl('not applicable', pheno[,j], ignore.case=T)] = '\\N'
				pheno[,j][grepl('not reported', pheno[,j], ignore.case=T)] = '\\N'
				pheno[,j][is.na(pheno[,j])] = '\\N'
				
				# Fix random typo found while exploring the data.
				pheno[,j] = gsub('identifed', 'identified', pheno[,j])
			}
			
			# Simplify the clinical and tumor stage data. These data types
			# sometimes have a lot of subtypes, but to keep the figures from getting
			# too busy with small stage classes, we will create simplified versions of
			# each staging variable.
			# There are more stage variables, such as clinical_M, _N and _T, but we will
			# focus on the two main ones here: tumor_stage and clinical_stage.
			if ('tumor_stage' %in% colnames(pheno)) {
				tumor_stage_simplified = pheno$tumor_stage
				tumor_stage_simplified = gsub('stage iv.*', 'stage 4', tumor_stage_simplified, perl=T)
				tumor_stage_simplified = gsub('stage iii.*', 'stage 3', tumor_stage_simplified, perl=T)
				tumor_stage_simplified = gsub('stage ii.*', 'stage 2', tumor_stage_simplified, perl=T)
				tumor_stage_simplified = gsub('stage i.*', 'stage 1', tumor_stage_simplified, perl=T)
				pheno$tumor_stage_simplified = tumor_stage_simplified
			}
			if ('clinical_stage' %in% colnames(pheno)) {
				clinical_stage_simplified = pheno$clinical_stage
				clinical_stage_simplified = gsub('stage iv.*', 'stage 4', clinical_stage_simplified, perl=T)
				clinical_stage_simplified = gsub('stage iii.*', 'stage 3', clinical_stage_simplified, perl=T)
				clinical_stage_simplified = gsub('stage ii.*', 'stage 2', clinical_stage_simplified, perl=T)
				clinical_stage_simplified = gsub('stage i.*', 'stage 1', clinical_stage_simplified, perl=T)
				pheno$clinical_stage_simplified = clinical_stage_simplified
			}
			
			# Simplify the values of the clinical parameters without losing any information. This can
			# be achieved by removing the name of the parameter or the name of the cancer type from the
			# value.
			for (j in 1:ncol(pheno)) {
				clinicalVar = gsub('_', ' ', colnames(pheno)[j])
				pheno[,j] = gsub(clinicalVar, '', pheno[,j])
				pheno[,j] = gsub(allVariables[[cancerTypes[i]]]$full_name, '', pheno[,j])
				
				# Remove any leading or trailing hyphens and whitespace.
				pheno[,j] = trimws(gsub('^-|-$', '', pheno[,j], perl=T))
			}
			
			# After the previous processing step, there are still some parameters for ACC that can
			# be simplified.
			if (cancerTypes[i] == 'acc') {
				pheno$cytoplasm_presence_less_than_equal_25_percent = gsub('cytoplasm presence <= 25% ', '', pheno$cytoplasm_presence_less_than_equal_25_percent)
				pheno$nuclear_grade_iii_iv = gsub('nuclear grade iii or iv ', '', pheno$nuclear_grade_iii_iv)
				pheno$weiss_venous_invasion = gsub('venous invasion', '', pheno$weiss_venous_invasion)
			}
			
			# Simplify the distant metastasis anatomic site for SKCM.
			if (cancerTypes[i] == 'skcm') {
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('skin upper back', 'skin', 'right flank', 'right upper back', 'right back', 'right wrist', 'left thigh', 'left posterior shoulder', 'right neck', 'left flank')] = 'skin'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('uterus', 'left adnexa/ pelvic side wall')] = 'uterus'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('periaortic lymph nodes', 'left groin lymph node', 'left axillary lymph node', 'lymphnode', 'lymph node, pericardial')] = 'lymph nodes'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('posterior skull', 'bone(uln)')] = 'bone'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('spinl cord', 'brain')] = 'nervous system'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('left upper lung lobe', 'lung', 'lll lung')] = 'lung'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('soft tissue, right axilla', 'back, soft tissue', 'soft tissue of right upper arm', 'left arm, soft tissue')] = 'soft tissue'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('right thigh (subcutaneous tissue)')] = 'subcutaneous'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('parotid')] = 'parotid'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('vaginl wall/vagin')] = 'vagina'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('abdomen', 'peritoneal tumor', 'abdominl wall')] = 'abdomen'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('jejunum', 'ileum (serosa)', 'small bowel', 'colon', 'duodenum', 'small intestine')] = 'intestines'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('left buttock mass')] = 'muscle'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('chest', 'chest wall')] = 'chest'
				pheno$distant_metastasis_anatomic_site[pheno$distant_metastasis_anatomic_site %in% c('adrenl gland')] = 'adrenal gland'
			}
			
			# Simplify the relative cancer text for TGCT.
			if (cancerTypes[i] == 'tgct') {
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('breast carc', 'breast', 'breast cancer')] = 'breast cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('lymphoma', 'non hodgkin lymphoma')] = 'lymphoma'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('lung and prostate cancer')] = 'lung and prostate cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('prostate carc', 'prostate', 'prostate cancer in mgf', 'prostate cancer')] = 'prostate cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('adrenl carcinoma')] = 'adrenal cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('colon carc', 'colon cancer', 'colon')] = 'colon cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('lung carc', 'lung')] = 'lung cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('oesophagus carc')] = 'oesophagus cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('leukemia')] = 'leukemia'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('cervical cancer', 'cervical')] = 'cervical cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('skin cancer')] = 'skin cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('kidney')] = 'kidney cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('uncle, unk lymphatic cancer')] = 'lymphatic cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('skin nos')] = '\\N'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('pancreatic', 'pancreas')] = 'pancreas cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('stomach')] = 'stomach cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('vagin')] = 'vaginal cancer'
				pheno$relative_family_cancer_hx_text[pheno$relative_family_cancer_hx_text %in% c('head and neck')] = 'head and neck cancer'
			}
			
			# Remove the vial annotation from the sample names and remove duplicate rows.
			pheno$sample = gsub('[A-Z]$', '', pheno$sample)
			pheno = unique(pheno)
			if (length(unique(pheno$sample)) != nrow(pheno)) {
				# Try selecting the primary tumor sample to see if that solves the problem.
				duplicatedSamples = pheno$sample[duplicated(pheno$sample)]
				rowsToRemove = which(pheno$sample %in% duplicatedSamples & pheno$sample_type != 'primary tumor')
				pheno = pheno[-rowsToRemove,]
				if (length(unique(pheno$sample)) != nrow(pheno)) {
					# In the unlikely event that selecting the primary tumor samples did
					# not solve the problem (which it always did when testing this code),
					# we will simply removing the duplicated samples.
					duplicatedSamples = pheno$sample[duplicated(pheno$sample)]
					pheno = pheno[!pheno$sample %in% duplicatedSamples,]
					if (length(unique(pheno$sample)) != nrow(pheno)) {
						message('ERROR: unable to resolve duplicate samples in the phenotype data!')
						message(paste0('- Cancer type: ', cancerTypes[i], ' (index: ', i, ')'))
						message(paste0('- Duplicated samples: ', paste(duplicatedSamples, collapse=', ')))
						message('Data not saved. Moving on to the next cancer type...')
						next
					}
				}
			}
			
			# Process the survival data.
			surv$sample = gsub('[A-Z]$', '', surv$sample)
			surv = surv[,c('sample', '_OS_IND', '_OS')]
			colnames(surv) = c('sample', 'os_event', 'os')
			surv = unique(surv)
			surv = surv[which(surv$os > 0),]
			
			# Merge the phenotype and survival data.
			pheno = merge(pheno, surv, all.x=T)
			pheno$sample = gsub('-', '_', pheno$sample)
			pheno$os_event[is.na(pheno$os_event)] = '\\N'
			pheno$os[is.na(pheno$os)] = '\\N'
			
			# If the cancer type is breast cancer, add the cancer subtypes.
			if (cancerTypes[i] == 'brca') {
				pheno$subtype = NA
				for (k in 1:nrow(pheno)) {
					patient = sub('_\\d\\d$', '', pheno$sample[k])
					if (patient %in% brcaSubTypes$sample) {
						pheno$subtype[k] = brcaSubTypes$subtype[which(brcaSubTypes$sample == patient)]
					}
				}
				pheno$subtype[is.na(pheno$subtype)] = '\\N'
			}
			
			# Remove any duplicated rows and columns.
			pheno = unique(pheno)
			duplColumns = which(grepl('\\.\\d$', colnames(pheno)))
			if (length(duplColumns) > 0) {
				pheno = pheno[,-which(grepl('\\.\\d$', colnames(pheno)))]
			}
			
			# Calculate the number of unique values for each variable. This will give us the
			# maximum number of categories we have to take into account when plotting the data in
			# the tool.
			#for (j in 2:ncol(pheno)) {
			#	if (length(unique(pheno[,j])) > 10) {
			#		message(paste0(length(unique(pheno[,j])), ' unique values for ', colnames(pheno)[j]))
			#	}
			#}
			
			write.table(pheno, paste0(dataDir, 'phenotype_survival.tsv'), row.names=F, col.names=T, sep='\t', quote=F)
		} else {
			if (file.access(dataFilePheno) != 0) {
				message(paste0('   File ', dataFilePheno, ' not found. Moving on to the next cancer type...'))
			}
			if (file.access(dataFileSurv) != 0) {
				message(paste0('   File ', dataFileSurv, ' not found. Moving on to the next cancer type...'))
			}
			next
		}
	} else {
		message(paste0('Directory ', dataDir, ' not found. Moving on to the next cancer type...'))
	}
}
