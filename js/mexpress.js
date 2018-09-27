// Mexpress interactivity.
//
$(function() {
	plotWidth = $('.plot-window').width();

	// Load the JSON file that contains all the cancer types (together with their respective
	// clinical variables) and place them in a list for the user to choose from.
	var cancerTypes;
	$.getJSON(
		'data/variables.json'
	).done(function(data) {
		cancerTypes = data.gdc_tcga;
		var list = $('.select-cancer-type').find('ul');
		list.find('li').remove();
		$.each(cancerTypes, function(cancerName, cancerInfo) {
			var cancerTypeListElement = '<li><div class="short-name">' +
				cancerName + '</div><div class="long-name">' + cancerInfo.full_name + '</div></li>';
			list.append(cancerTypeListElement);
		});
	});

	// Autofocus on the gene name text input box.
	$('#name-input').focus();

	// Scroll down the cancer type list when a user clicks on the scroll button.
	$('.scroll-button').on('click', function() {
		var list = $('.select-cancer-type').find('ul');
		var scrollPosition = list.scrollTop();
		list.scrollTop(scrollPosition + 200);
	});

	// Autocomplete the gene or miRNA name the user is typing.
	var options, a;
	$(function(){

		options = {
			serviceUrl: 'php/autocomplete.php',
			minChars: 1,
			deferResquestBy :0
		};
		a = $('#name-input').autocomplete(options);
	});

	// User input.
	// When the user has entered a gene or miRNA name and selected a cancer type, the PLOT button
	// can be activated.
	$(document).on('click', '.select-cancer-type li', function() {
		// Indicate which cancer type has been selected.
		$('.select-cancer-type').find('li').removeClass('selected');
		$(this).addClass('selected');

		// Check if the user filled in a gene name.
		var nameInput = cleanString($('#name-input').val());
		nameInput = nameInput.replace(/\s+/g, '');
		if (nameInput) {
			$('.button--plot').removeClass('button--inactive');
		}
	});
	$('#name-input').on('input', function() {
		var nameInput = cleanString($(this).val());
		if (nameInput && $('.select-cancer-type .selected').length) {
			$('.button--plot').removeClass('button--inactive');
		} else {
			$('.button--plot').addClass('button--inactive');
		}
	});
	$(document).on('keydown', function(e) {
		if (e.which === 13) {
			var nameInput = cleanString($('#name-input').val());
			if (nameInput && $('.select-cancer-type .selected').length) {
				$('.button--plot').removeClass('button--inactive');
				$('.button--plot').click();
			}
		}
	});
	$('.button--plot').on('click', function(e) {
		if (!$(this).hasClass('button--inactive')) {
			$('.button__text').css('visibility', 'hidden');
			$(this).find('.loader').show();
			$('.button--plot').addClass('button--inactive');
			$('.message').hide().find('p').remove();
			clearFilterSelection();
			$('.toolbar--check-variants').prop('checked', false);
			$('#sample-sorter').text('');
			$('#sample-filter').text('');
			var nameInput = cleanString($('#name-input').val());
			var cancerTypeInput = $('.select-cancer-type .selected').find('.short-name').text();
			cancerTypeAnnotation = cancerTypes[cancerTypeInput];
			loadData(nameInput, cancerTypeInput);
		}
	});
	$('.toolbar--select-sorter').change(function() {
		$('.plot-loader').show();
		var sampleSorter = $(this).val();

		// Store the name of the parameter on which the samples are sorted in the DOM.
		$('#sample-sorter').text(sampleSorter);
		var sampleFilter = $('#sample-filter').text();
		sampleFilter = sampleFilter === '' ? null : sampleFilter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		setTimeout(function() {
			plot(sampleSorter, sampleFilter, showVariants, plotStart, plotEnd);
		}, 100);
	});
	$('.toolbar--select-filter').change(function() {
		var sampleFilter = $(this).val();
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		if (sampleFilter === 'no filter') {
			$('#sample-filter').text('');
			$('.plot-loader').show();
			setTimeout(function() {
				plot(sampleSorter, null, showVariants, plotStart, plotEnd);
			}, 100);
		} else {
			showFilterOptions(sampleFilter);
		}
	});
	$('.toolbar--select-data-type').change(function() {
		var dataType = $(this).val();
		if (dataType === 'no data type selected') {
			$('.data-type-information').hide();
		} else {
			showDataTypeInformation(dataType);
		}
	});
	$('.button--cancel').on('click', function() {
		if ($(this).closest('.overlay').hasClass('select-filter')) {
			$('.toolbar--select-filter')[0].selectedIndex = 0;
			$(this).closest('.overlay').fadeOut(200, clearFilterSelection);
		} else if ($(this).closest('.overlay').hasClass('data-type-information')) {
			$(this).closest('.overlay').fadeOut(200);
			$('.toolbar--select-data-type')[0].selectedIndex = 0;
		} else if ($(this).closest('.overlay').hasClass('select-parameters')) {
			resetClinicalParameters();
			$(this).closest('.overlay').fadeOut(200);
		}
	});
	$('.button--filter').on('click', function() {
		if (!$(this).hasClass('button--inactive')) {
			var sampleFilter = $('.sample-filter').text().replace(/ /g, '_') + '__' +
				$('.filter-options .selected').attr('data-value') + '__';
			if ($('.select-filter input[type=text]').length) {
				sampleFilter += $('.select-filter input[type=text]').val();
			} else {
				$('.filter-categories .selected').each(function(index) {
					sampleFilter += $(this).attr('data-value') + '+';
				});
				sampleFilter = sampleFilter.slice(0, -1); // Remove the trailing + character.
			}

			// Store the query on which the samples are filtered in the DOM.
			$('#sample-filter').text(sampleFilter);
			var sampleSorter = $('#sample-sorter').text();
			sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
			var showVariants = $('.toolbar--check-variants').prop('checked');
			var plotStart = cancerTypeDataFiltered.plot_data.start;
			var plotEnd = cancerTypeDataFiltered.plot_data.end;
			$(this).closest('.overlay').fadeOut(200, function() {
				$('.plot-loader').show();
				setTimeout(function() {
					clearFilterSelection();
					plot(sampleSorter, sampleFilter, showVariants, plotStart, plotEnd);
				}, 100);
			});
		}
	});
	$('.button--reset').on('click', resetClinicalParameters);
	$('.button--select').on('click', function() {
		var selectedParameters = [];
		$('.parameters-options .selected').each(function(index) {
			selectedParameters.push($(this).attr('data-value'));
		});
		selectedParametersText = selectedParameters.join('+');

		// Store the selected clinical parameters in the DOM.
		$('#clinical-parameters').text(selectedParametersText);

		// Update the sorting and filtering dropdowns.
		updateDropdowns(selectedParameters);

		// Recreate the plot based on the selected clinical parameters.
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var sampleFilter = $('#sample-filter').text();
		sampleFilter = sampleFilter === '' ? null : sampleFilter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		$(this).closest('.overlay').fadeOut(200, function() {
			$('.plot-loader').show();
			setTimeout(function() {
				plot(sampleSorter, sampleFilter, showVariants, plotStart, plotEnd);
			}, 100);
		});
	});
	$('.toolbar--check-variants').change(function() {
		$('.plot-loader').show();
		var showVariants = this.checked;
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var sampleFilter = $('#sample-filter').text();
		sampleFilter = sampleFilter === '' ? null : sampleFilter;
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		setTimeout(function() {
			plot(sampleSorter, sampleFilter, showVariants, plotStart, plotEnd);
		}, 100);
	});
	$('.button--reset-plot').on('click', function() {
		$('.plot-loader').show();
		setTimeout(function() {
			updateDropdowns(cancerTypeAnnotation.default);
			$('.toolbar--check-variants').prop('checked', false);
			$('#sample-sorter').text('');
			$('#sample-filter').text('');
			$('#clinical-parameters').text('default');
			plot('region_expression', null, false);
		}, 100);
	});
	$('.button--plot-summary').on('click', function() {
		$('.plot-loader').show();
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		setTimeout(function() {
			plotSummary(sampleSorter, showVariants, plotStart, plotEnd);
		}, 100);
	});
	$(document).on('click', '.filter-options li', function() {
		// Indicate which filter command has been selected.
		$('.filter-options').find('li').removeClass('selected');
		$(this).addClass('selected');

		// Check if the user already filled in or selected a filter value.
		var textInput = $(this).closest('.select-filter__content').find('input[type=text]').val();
		if (textInput || $('filter-categories').find('.selected').length > 0) {
			$('.button--filter').removeClass('button--inactive');
		}
	});
	$(document).on('click', '.filter-categories li', function() {
		// Indicate which filter category value has been selected.
		$(this).toggleClass('selected');

		// Check if the user already selected a filter command.
		if ($(this).closest('.overlay').hasClass('select-filter')) {
			if ($('.filter-categories .selected').length > 0 && $('.filter-options .selected').length > 0) {
				$('.button--filter').removeClass('button--inactive');
			} else {
				$('.button--filter').addClass('button--inactive');
			}
		}
	});
	$(document).on('input', '.select-filter__content input[type=text]', function() {
		var valueInput = cleanString($(this).val());
		if (valueInput && $('.filter-options .selected').length) {
			$('.button--filter').removeClass('button--inactive');
		} else {
			$('.button--filter').addClass('button--inactive');
		}
	});
	$(document).on('click', '.summary-values li', function() {
		var clickedValue = $(this).attr('data-value');
		$('.select-filter__content').find('input[type=text]').val(clickedValue);

		// Changing the text input value does not trigger the input event we use to check if the
		// filter button can be enabled, so we have to trigger it manually.
		$('.select-filter__content').find('input[type=text]').trigger('input');
	});
	$(document).on({
		mouseenter: function() {
			var lineClass = $(this).attr('data-summary-variable') + '-line';
			d3.select('.' + lineClass).style('stroke-opacity', 1);
		},
		mouseleave: function() {
			var lineClass = $(this).attr('data-summary-variable') + '-line';
			d3.select('.' + lineClass).style('stroke-opacity', 0);
		}
	}, '.summary-values li');
	$(document).on('click', '.parameters-options li', function() {
		// Indicate which clinical parameters have been selected.
		$(this).toggleClass('selected');
	});
	$('.message__close-x').on('click', function() {
		$(this).closest('.message').hide().find('p').remove();
	});
	$('.button--select-parameters').on('click', function() {
		showParameterSelection();
	});
	$('.toolbar--select-download').change(function() {
		var format = $(this).val();
		var data, link;
		link = document.createElement('a');
		if (format === 'json') {
			data = 'text/json;charset=utf-8,' +
				encodeURIComponent(JSON.stringify(cancerTypeDataFiltered));
			link.href = 'data:' + data;
			link.download = 'plottedData.json';
		} else if (format === 'tsv') {
			// Format the data in such a way that we can push them into a tab-separated text file.
			data = '';
			data += '# region type = ' + cancerTypeDataFiltered.region_annotation.region_type + '\n';
			data += '# region name = ' + cancerTypeDataFiltered.region_annotation.name + '\n';
			data += '# region coordinates = chr' + cancerTypeDataFiltered.region_annotation.chr +
				':' + cancerTypeDataFiltered.region_annotation.start + '-' +
				cancerTypeDataFiltered.region_annotation.end + '\n';
			var samples = cancerTypeDataFiltered.samples_filtered_sorted;
			data += 'data_type\t' + samples.join('\t') + '\n';
			data += 'cnv\t';
			$.each(samples, function(index, sample) {
				if (sample in cancerTypeDataFiltered.cnv) {
					data += cancerTypeDataFiltered.cnv[sample] + '\t';
				} else {
					data += 'null\t';
				}
			});
			data = data.trim() + '\n';
			$.each(cancerTypeDataFiltered.dna_methylation_data, function(key, value) {
				data += key + '\t';
				$.each(samples, function(index, sample) {
					if (sample in value) {
						data += value[sample] + '\t';
					} else {
						data += 'null\t';
					}
				});
				data = data.trim() + '\n';
			});
			$.each(cancerTypeDataFiltered.phenotype, function(key, value) {
				data += key + '\t';
				$.each(samples, function(index, sample) {
					if (sample in value) {
						data += value[sample] + '\t';
					} else {
						data += 'null\t';
					}
				});
				data = data.trim() + '\n';
			});
			data += 'expression\t';
			$.each(samples, function(index, sample) {
				if (sample in cancerTypeDataFiltered.region_expression) {
					data += cancerTypeDataFiltered.region_expression[sample] + '\t';
				} else {
					data += 'null\t';
				}
			});
			data = data.trim() + '\n';
			link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
			link.download = 'plottedData.txt';
		} else if (format === 'svg') {
			data = d3.select('.svg-container').html();
			link.href = 'data:application/octet-stream;base64,' + btoa(data);
			link.download = 'figure.svg';
		}
		link.click();
		$('.toolbar--select-download option[value=empty]').prop('selected', true);
	});
});
