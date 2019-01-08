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

	// Scroll up or down the cancer type list when a user clicks on the scroll button.
	$('.scroll-button').on('click', function() {
		var list = $('.select-cancer-type').find('ul');
		var scrollPosition = list.scrollTop();
		var scrollDirection = $(this).attr('class').replace(/scroll-button /, '');
		if (scrollDirection === 'scroll-up') {
			//list.scrollTop(scrollPosition - 200);
			list.animate({scrollTop: scrollPosition - 200});
		} else {
			//list.scrollTop(scrollPosition + 200);
			list.animate({scrollTop: scrollPosition + 200});
		}
	});

	// Show/hide the sidebar.
	$('.hide-sidebar').on('click', function() {
		$('aside').animate({'margin-left': '-300px'});
		$('main').animate({'padding-left': '0'});
		$('.toggle-sidebar').animate({'left': '0'});
		$(this).hide();
		$('.show-sidebar').css({'display': 'inline-block'});
	});
	$('.show-sidebar').on('click', function() {
		$('aside').animate({'margin-left': '0'});
		$('main').animate({'padding-left': '300px'});
		$('.toggle-sidebar').animate({'left': '300px'});
		$(this).hide();
		$('.hide-sidebar').css({'display': 'inline-block'});
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
	$('#cancer-type').on('input', function() {
		// Filter the list of cancer types based on what the user types into the cancer type text
		// input box.
		var input = $(this).val().toLowerCase();
		if (input) {
			$(this).siblings('ul').find('li').each(function() {
				var shortName = $(this).find('.short-name').text().toLowerCase();
				var longName = $(this).find('.long-name').text().toLowerCase();
				if (shortName.indexOf(input) === -1 && longName.indexOf(input) === -1) {
					$(this).slideUp(200);
				} else {
					$(this).slideDown(200);
				}
			});
		} else {
			$(this).siblings('ul').find('li').each(function() {
				$(this).slideDown(200);
			});
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
			$(this).find('.button__text').css('visibility', 'hidden');
			$(this).find('.loader').show();
			$('.button--plot').addClass('button--inactive');
			$('.message').hide().find('p').remove();
			clearFilterSelection();
			$('.active-filters--none').show();
			$('.active-filters li').not(':eq(0)').remove();
			$('.toolbar--check-variants').prop('checked', false);
			$('#sample-sorter').text('');
			$('#sample-filter').text('');
			setToolbar('detail');
			var nameInput = cleanString($('#name-input').val());
			var cancerTypeInput = $('.select-cancer-type .selected').find('.short-name').text();
			cancerTypeAnnotation = cancerTypes[cancerTypeInput];
			loadData(nameInput, cancerTypeInput);
		}
	});
	$('.toolbar--select-sorter').change(function() {
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
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
	$('.button--select-filter').on('click', function() {
		var displayValue = $('.select-filter').css('display');
		if (displayValue === 'none') {
			// Close any potentially open window and show the parameter selection window.
			$('.plot-window').find('.overlay').slideUp(200);
			showWindow('.select-filter');
		} else {
			hideWindow('.select-filter');
		}
	});
	$('.toolbar--select-filter').change(function() {
		var sampleFilter = $(this).val();
		showFilterOptions(sampleFilter);
	});
	$('.toolbar--select-data-type').change(function() {
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
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
			$(this).closest('.overlay').slideUp(200, clearFilterSelection);
		} else if ($(this).closest('.overlay').hasClass('data-type-information')) {
			$(this).closest('.overlay').slideUp(200);
			$('.toolbar--select-data-type')[0].selectedIndex = 0;
		} else if ($(this).closest('.overlay').hasClass('select-parameters')) {
			resetClinicalParameters();
			$(this).closest('.overlay').slideUp(200);
		}
	});
	$('.button--filter').on('click', function() {
		if (!$(this).hasClass('button--inactive')) {
			var sampleFilterText = $('.toolbar--select-filter').find(':selected').val();
			var sampleFilter = sampleFilterText.replace(/ /g, '_') + '__' +
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
			var existingFilters = $('#sample-filter').text();
			var newFilters = '';
			if (existingFilters === '') {
				newFilters = sampleFilter;
				$('#sample-filter').text(newFilters);
			} else {
				newFilters = existingFilters + '___' + sampleFilter;
				$('#sample-filter').text(newFilters);
			}
			$('.active-filters--none').hide();
			var sampleFilterClean = sampleFilter.replace(/__lt__/g, ' less than ')
				.replace(/__le__/g, ' less than or equal to ')
				.replace(/__eq__/g, ' equal to ')
				.replace(/__ne__/g, ' not equal to ')
				.replace(/__ge__/g, ' greather than or equal to ')
				.replace(/__gt__/g, ' greater than ');
			sampleFilterClean = sampleFilterClean.replace(/_/g, ' ');
			sampleFilterClean = sampleFilterClean.replace(/\+/g, ' + ');
			$('.active-filters').append('<li data-value="' + sampleFilter + '">' +
				sampleFilterClean +
				'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></li>');
			var sampleSorter = $('#sample-sorter').text();
			sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
			var showVariants = $('.toolbar--check-variants').prop('checked');
			var plotStart = cancerTypeDataFiltered.plot_data.start;
			var plotEnd = cancerTypeDataFiltered.plot_data.end;
			$(this).closest('.overlay').fadeOut(200, function() {
				$('.plot-loader').show();
				setTimeout(function() {
					$('.toolbar--select-filter option').first().prop('selected', true);
					clearFilterSelection();
					plot(sampleSorter, newFilters, showVariants, plotStart, plotEnd);
				}, 100);
			});
		}
	});
	$(document).on('click', '.active-filters svg', function() {
		// Remove the filter linked to the SVG trashcan the user clicked on and redraw the plot
		// with the new set of filters.
		var filterToRemove = $(this).closest('li').attr('data-value');

		// We have to store the overlay element in a variable, because we will remove the list
		// element related to the clicked SVG, thereby also removing the element $(this) refers to,
		// making it impossible to find the relevant overlay in the DOM starting from $(this).
		var overlay = $(this).closest('.overlay');
		$(this).closest('li').remove();
		if ($('.active-filters li').length === 1) {
			$('.active-filters--none').show();
		}
		var allFilters = $('#sample-filter').text().split('___');
		var newFilters = '';
		if (allFilters.length > 1) {
			newFilters = allFilters.filter(function(x) {
				return x !== filterToRemove;
			}).join('___');
		}
		$('#sample-filter').text(newFilters);
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		overlay.fadeOut(200, function() {
			$('.plot-loader').show();
			setTimeout(function() {
				$('.toolbar--select-filter option').first().prop('selected', true);
				clearFilterSelection();
				plot(sampleSorter, newFilters, showVariants, plotStart, plotEnd);
			}, 100);
		});
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
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
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
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
		$('.plot-loader').show();
		setToolbar('detail');
		setTimeout(function() {
			updateDropdowns(cancerTypeAnnotation.default);
			$('.toolbar--check-variants').prop('checked', false);
			$('#sample-sorter').text('');
			$('#sample-filter').text('');
			$('#clinical-parameters').text('default');
			$('.active-filters--none').show();
			$('.active-filters li').not(':eq(0)').remove();
			cancerTypeDataFiltered = $.extend(true, {}, cancerTypeData);
			plot('region_expression', null, false);
		}, 100);
	});
	$('.button--zoom-out').on('click', function() {
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
		$('.plot-loader').show();
		$('.button--zoom-out').addClass('button--inactive');
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var sampleFilter = $('#sample-filter').text();
		sampleFilter = sampleFilter === '' ? null : sampleFilter;
		setTimeout(function() {
			plot(sampleSorter, sampleFilter, showVariants);
		}, 100);
	});
	$('.button--plot-summary').on('click', function() {
		// Close any potentially open window and show the parameter selection window.
		$('.plot-window').find('.overlay').hide();
		$('.plot-loader').show();
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		setToolbar('summary');
		setTimeout(function() {
			plotSummary(sampleSorter, showVariants, plotStart, plotEnd);
		}, 100);
	});
	$('.button--plot-detail').on('click', function() {
		$('.plot-loader').show();
		var sampleSorter = $('#sample-sorter').text();
		sampleSorter = sampleSorter === '' ? 'region_expression' : sampleSorter;
		var sampleFilter = $('#sample-filter').text();
		sampleFilter = sampleFilter === '' ? null : sampleFilter;
		var showVariants = $('.toolbar--check-variants').prop('checked');
		var plotStart = cancerTypeDataFiltered.plot_data.start;
		var plotEnd = cancerTypeDataFiltered.plot_data.end;
		setToolbar('detail');
		setTimeout(function() {
			plot(sampleSorter, sampleFilter, showVariants, plotStart, plotEnd);
		}, 100);
	});
	$(document).on('click', '.filter-options li', function() {
		// Indicate which filter command has been selected.
		$('.filter-options').find('li').removeClass('selected');
		$(this).addClass('selected');

		// Check if the user already filled in or selected a filter value.
		var textInput = $(this).closest('.select-filter__content').find('input[type=text]').val();
		if (textInput || $('.filter-categories').find('.selected').length > 0) {
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
		// Indicate which summary value has been selected.
		$('.summary-values').find('li').removeClass('selected');
		$(this).addClass('selected');
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
	$(document).on({
		mouseenter: function() {
			var categoryClass = $(this).attr('data-value').replace(/ /g, '_') + '-bar';
			categoryClass = categoryClass.replace(/[()'/]/g, '');
			d3.selectAll('.' + categoryClass).style('fill', histogramColorFocus);
		},
		mouseleave: function() {
			var categoryClass = $(this).attr('data-value').replace(/ /g, '_') + '-bar';
			categoryClass = categoryClass.replace(/[()'/]/g, '');
			d3.selectAll('.' + categoryClass).style('fill', histogramColor);
		}
	}, '.filter-categories li');
	$(document).on('click', '.parameters-options li', function() {
		// Indicate which clinical parameters have been selected.
		$(this).toggleClass('selected');
	});
	$('.message__close-x').on('click', function() {
		$(this).closest('.message').hide().find('p').remove();
	});
	$('.button--select-parameters').on('click', function() {
		var displayValue = $('.select-parameters').css('display');
		if (displayValue === 'none') {
			// Close any potentially open window and show the parameter selection window.
			$('.plot-window').find('.overlay').slideUp(200);
			showWindow('.select-parameters');
		} else {
			hideWindow('.select-parameters');
		}
	});
	$('.toolbar--select-download').change(function() {
		var format = $(this).val();
		var dataType = $(this).find(':selected').parent().attr('label');
		var data, link;
		link = document.createElement('a');
		link.setAttribute('type', 'hidden');
		if (format === 'json') {
			if (dataType === 'the plotted data') {
				data = 'text/json;charset=utf-8,' +
					encodeURIComponent(JSON.stringify(cancerTypeDataFiltered));
				link.href = 'data:' + data;
				link.download = 'plottedData.json';
			} else if (dataType === 'the analysis results') {
				data = 'text/json;charset=utf-8,' +
					encodeURIComponent(JSON.stringify(stats));
				link.href = 'data:' + data;
				link.download = 'analysisResults.json';
			}
			document.body.appendChild(link);
			link.click();
		} else if (format === 'tsv') {
			// Format the data in such a way that we can push them into a tab-separated text file.
			data = '';
			if (dataType === 'the plotted data') {
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
			} else if (dataType === 'the analysis results') {
				data += '# all comparisons were made against the ' + stats.sorter + ' data\n';
				data += 'variable\tp_value\tpearson_r\n';
				$.each(stats.phenotype, function(key, value) {
					if (value) {
						data += key + '\t' + value.p + '\t';
						if ('r' in value) {
							data += value.r;
						} else {
							data += 'NA';
						}
						data += '\n';
					} else {
						data += key + '\tNA\tNA\n';
					}
				});
				if (stats.region_expression) {
					data += 'region_expression\t' + stats.region_expression.p + '\t';
					if ('r' in stats.region_expression) {
						data += stats.region_expression.r;
					} else {
						data += 'NA';
					}
					data += '\n';
				}
				if (stats.cnv) {
					data += 'cnv\t' + stats.cnv.p + '\t';
					if ('r' in stats.cnv) {
						data += stats.cnv.r;
					} else {
						data += 'NA';
					}
					data += '\n';
				}
				$.each(stats.dna_methylation_data, function(key, value) {
					if (value) {
						data += key + '\t' + value.p + '\t';
						if ('r' in value) {
							data += value.r;
						} else {
							data += 'NA';
						}
						data += '\n';
					} else {
						data += key + '\tNA\tNA\n';
					}
				});
				link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
				link.download = 'analysisResults.txt';
			}
			document.body.appendChild(link);
			link.click();
		} else if (format === 'png') {
			$('.png-conversion').removeClass('hidden');
			data = d3.select('.svg-container')
				.attr('version', 1.1)
				.attr('xlmns', 'http://www.w3.org/2000/svg')
				.html();
			$.ajax({
				data: 'svgHtml=' + encodeURIComponent(data),
				url: 'php/svg2png.php',
				method: 'POST',
				success: function(data) {
					var imageName = data.replace(/^.+\//, '');
					var imageFileName = 'php/downloads/' + imageName;
					link.href = imageFileName;
					link.download = imageName;
					document.body.appendChild(link);
					link.click();
					$('.png-conversion').addClass('hidden');
					setTimeout(function() {
						cleanUpImages(imageName);
					}, 5000);
				}
			});
		} else if (format === 'svg') {
			data = d3.select('.svg-container').html();
			link.href = 'data:application/octet-stream;base64,' + btoa(data);
			link.download = 'figure.svg';
			document.body.appendChild(link);
			link.click();
		}
		link.remove();
		$('.toolbar--select-download option[value=empty]').prop('selected', true);
	});

	// Show the step-by-step guide.
	$('#start-guide').on('click', function(event) {
		event.preventDefault();
		$('.intro-svg').show();
		var guide = introJs();
		guide.setOptions({
			overlayOpacity: 0,
			showStepNumbers: false,
			showProgress: true,
			showBullets: false,
			skipLabel: 'Exit the guide',
			steps: [
				{
					element: 'header h1',
					intro: 'Welcome to MEXPRESS! This introduction will guide us through an example anaysis. All you need to do is click "Next &rarr;" or hit the right arrow key on your keyboard to go to the next step.',
					position: 'right'
				},
				{
					element: '#name-input',
					intro: 'First, we type in the name of the gene or miRNA that we are interested in.',
					position: 'right'
				},
				{
					element: '.select-cancer-type li:first-of-type',
					intro: 'And now we select a cancer type from this list.',
					position: 'right'
				},
				{
					element: '.button--plot',
					intro: 'Now that we have entered a gene name and selected a cancer type, all that\'s left to do is click the plot button!',
					position: 'top'
				},
				{
					element: '.plot-window',
					intro: 'After a few seconds (depending on the amount of data that need to be analyzed and plotted), our figure will appear in this window. When it does, we will go through it in detail.',
					position: 'top'
				},
				{
					element: '.intro-svg--legend',
					intro: 'The legend tells us what the different values are for the categorical variables.',
					position: 'left'
				},
				{
					element: '.intro-svg--clinical-variables',
					intro: 'Each "column" in the figure represents a sample, while each row represents a different variable.',
					position: 'top'
				},
				{
					element: '.intro-svg--clinical-variables',
					intro: 'Here we see the data for various clinical variables, listed alphabetically, as well as the expression and copy number data.',
					position: 'right'
				},
				{
					element: '.intro-svg--expression',
					intro: 'By default, the samples are sorted by the expression (from low to high) of the gene or miRNA that was entered.',
					position: 'left'
				},
				{
					element: '.intro-svg--methylation',
					intro: 'Here, each row shows the DNA methylation data for a single probe on the Infinium microarray.',
					position: 'left'
				},
				{
					element: '.intro-svg--genome',
					intro: 'And here we see the gene together with its transcripts, as well as any CpG islands and all the individual CpG dinucleotides. You can zoom in by clicking and dragging a rectangle over this area of the figure.',
					position: 'right'
				},
				{
					element: '.intro-svg--statistics',
					intro: 'These are the p values and correlation coefficients. The statistical analyses are always done based on the variable by which the samples are sorted. So in this case, each variable is compared to the expression data. We can for example see that there is a statistically significant difference in <em>CDO1</em> expression between normal and primary tumor samples.',
					position: 'right'
				},
				{
					element: '.toolbar',
					intro: 'The blue toolbar above contains the different tools we need to reorder or filter the samples, to add or remove certain data types, create a summary figure of the DNA methylation data or to download the figure or the underlying data.',
					position: 'bottom'
				},
				{
					element: '.button--select-filter',
					intro: 'Let\'s say we would like to remove the samples for which there is no <em>CDO1</em> expression. We click the "Filter" button...',
					position: 'bottom'
				},
				{
					element: '.toolbar--select-filter',
					intro: 'We select "expression" in this drop-down list...',
					position: 'top'
				},
				{
					element: '.filter-options-container',
					intro: 'We select "not equal to"...',
					position: 'top'
				},
				{
					element: '.select-filter .data-summary',
					intro: 'And we select the "null" value (because we don\'t want the expression to be null!)...',
					position: 'top'
				},
				{
					element: '.button--filter',
					intro: 'Now we can just read our filter: "Select the samples where the expression is not equal to null.", which is exactly what we wanted! All that\'s left to do is click the filter button.',
					position: 'left'
				},
				{
					element: '.toolbar',
					intro: 'We\'re back at our figure from which all the samples with missing <em>CDO1</em> expression values have been removed!',
					position: 'bottom'
				},
				{
					element: '.toolbar',
					intro: 'This was just a simple example of what you can do with MEXPRESS. The <a href="about.html" target="_blank">about</a> page contains a detailed description of all the functionality. Please <a href="contact.html" target="_blank">get in touch</a> if you have any questions or comments!',
					position: 'bottom'
				}
			]
		});
		guide.onchange(function() {
			var currentStep = this._currentStep;
			if (currentStep === 2) {
				$('#name-input').focus();
				$('#name-input').val('CDO1');
			} else if (currentStep === 3) {
				$('.select-cancer-type li:eq(1)').click();
			} else if (currentStep === 4) {
				$('.button--plot').click();
			} else if (currentStep === 14) {
				$('.button--select-filter').click();
			} else if (currentStep === 15) {
				$('.toolbar--select-filter option:eq(1)').prop('selected', true).change();
			} else if (currentStep === 16) {
				$('.filter-options li[data-value="ne"]').click();
			} else if (currentStep === 17) {
				$('.summary-values li[data-summary-variable="null"]').click();
			} else if (currentStep === 18) {
				$('.button--filter').click();
			}
		}).start();
	});
});
