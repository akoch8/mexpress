MEXPRESS
========

### About

MEXPRESS is a data visualization tool designed for the easy visualization of [TCGA](https://tcga-data.nci.nih.gov/tcga/) expression, DNA methylation and clinical data, as well as the relationships between them. The first version of MEXPRESS was published in BMC Genomics: https://www.biomedcentral.com/1471-2164/16/636 and the update was published in Nucleic Acids Research: https://academic.oup.com/nar/article/47/W1/W561/5494743.

This repository contains the code for the latest version of MEXPRESS. You can find all the old MEXPRESS code in the [mexpress-legacy](https://github.com/akoch8/mexpress-legacy) repository.

### Link

The latest version of MEXPRESS is available at https://mexpress.be.

You can find the original version at https://mexpress.be/old/mexpress.php.

### Browser support

We advise you to use MEXPRESS with a modern browser like Chrome or Firefox. MEXPRESS does __not__ work in Internet Explorer!

| Browser | Version tested | Supported |
| :--- | :--- | :--- |
| Google Chrome | 71 | :white_check_mark: yes |
| Firefox | 64 | :white_check_mark: yes |
| Safari | 12 | :white_check_mark: yes |
| Opera | 57 | :white_check_mark: yes |
| Edge | 40 | :white_check_mark: yes |
| Internet explorer | &le;11 | :no_entry: no |

### Dependencies

MEXPRESS currently runs on an Apache web server (Apache 2.4.18 Ubuntu Server), uses PHP version 5.6.29 and mysql version 14.14 (distrib 5.7.29). All necessary javascript scripts are available in the [js/](https://github.com/akoch8/mexpress/tree/master/js) folder; there is no need to install or download any javascript. The python dependencies can be found in the [environment.yml](https://github.com/akoch8/mexpress/blob/master/environment.yml) file.

### Database setup

If you want to set up your own version of MEXPRESS locally, you'll need to:
1. Create a MySQL database
2. Complete the database config file ([ini/database_config.ini](https://github.com/akoch8/mexpress/blob/master/ini/database_config_EMPTY.ini)) 
3. Run the python scripts to complete the database setup, download the TCGA data, and upload them to your MEXPRESS database

### Contact

Please get in touch if you have any questions or comments! info@alexanderkoch.be or [@monsieurKoch](https://twitter.com/monsieurKoch)
