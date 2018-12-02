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

function api_content(href, cb) {
	var c = sessionStorage.getItem(href);
	if (null === c) {
		console.debug('gapi', 'Content cache not found, fetch from ' + href);
		api(href, resp => {
			sessionStorage.setItem(href, resp.content);
			cb(Base64.decode(resp.content));
		});
	} else {
		console.debug('gapi', 'Content cache found.');
		cb(Base64.decode(c));
	}
}

function api_root(owner, repos, dirs, cb) {
	for (var i = 0; i < dirs.length; i++) {
		var dir = dirs[i];
		var cache_key = owner + '/' + repos + '/' + dir;
		var cache = sessionStorage.getItem(cache_key);
		if (cache !== null) {
			console.debug('gapi', 'Tree cache found.');
			cb(dir, JSON.parse(cache).tree);
		} else {
			var href = 'https://api.github.com/repos/' + owner + '/' + repos + '/contents/';
			console.debug('gapi', 'Tree cache not found, fetch from ' + href);
			api(href, resp => {
				resp.every((dirmeta, index) => {
					// filter and ignore prefix for internal items.
					if (ignorePath(dirmeta.name) || dirmeta.type !== 'dir' || dir !== dirmeta.name) return true;
					api_tree(cache_key, dirmeta, cb);
					return true;
				})
			});
		}
	}
}

function api_tree(cache_key, dirmeta, cb) {
	api(dirmeta.git_url + '?recursive=1', resp => {
		sessionStorage.setItem(cache_key, JSON.stringify(resp));
		console.debug('api', resp.tree.length + ' items loaded in ' + resp.url + '.');
		if (resp.truncated) alert('truncated for folder is too large, please switch to GIT SITE or GIT RAW mode.');
		cb(dirmeta.name, resp.tree);
	});
}