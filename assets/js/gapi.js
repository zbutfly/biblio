function api(url, cb) {
	$.ajax({
		url: url,
		dataType: 'json',
		headers: {
			'Accept': 'application/vnd.github.v3+json'
		},
		success: cb,
		error: (xhr, msg, ex) => console.error(msg),
		xhrFields: {
			// onprogress: function (progress) {
			// 	if (total === undefined) {
			// 		console.debug('progress', process.total);
			// 	} else {
			// 		var percentage = Math.floor((progress.total / total) * 100);
			// 		if (percentage >= 100) console.debug('progress', 'DONE!');
			// 		else console.debug('progress', percentage + '%');
			// 	}
			// }
		}
	});
}