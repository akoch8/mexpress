$(function() {
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

	// Scroll down the cancer type list when a user clicks on the 'scroll' button.
	$('.scroll-button').on('click', function() {
		var list = $('.select-cancer-type').find('ul');
		var scrollPosition = list.scrollTop();
		list.scrollTop(scrollPosition + 200);
	});

	// Indicate which cancer type has been selected.
	$(document).on('click', '.select-cancer-type li', function() {
		$('.select-cancer-type').find('li').removeClass('selected');
		$(this).addClass('selected');
	});
});