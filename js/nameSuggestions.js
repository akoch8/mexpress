$(function() {
	var options, a;
	$(function(){
		options = {
			serviceUrl:'php/autocomplete.php',
			minChars:1,
			maxHeight:200,
			deferResquestBy:0
		};
		a = $('#name-input').autocomplete(options);
	});
});