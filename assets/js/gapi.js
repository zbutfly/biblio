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
			onprogress: function (progress) {
				if (total === undefined) {
					console.debug('PROGRESS', process.total);
				} else {
					var percentage = Math.floor((progress.total / total) * 100);
					if (percentage >= 100) console.debug('PROGRESS', 'DONE!');
					else console.debug('PROGRESS', percentage + '%');
				}
			}
		}
	});
}

function api_content(href, cb) {
	var c = localStorage.getItem(href);
	if (null === c) {
		console.debug('GAPI', 'Content cache not found, fetch from ' + href);
		api(href, resp => {
			localStorage.setItem(href, resp.content);
			cb(Base64.decode(resp.content));
		});
	} else {
		console.debug('GAPI', 'Content cache found.');
		cb(Base64.decode(c));
	}
}

function api_root(owner, repos, dirs, cb) {
	for (var i = 0; i < dirs.length; i++) {
		var dir = dirs[i];
		var cache_key = 'github-api:' + owner + '/' + repos + '/' + dir;
		var cache = localStorage.getItem(cache_key);
		if (cache !== null) {
			console.debug('GAPI', 'Tree cache found.');
			cb(dir, JSON.parse(cache).tree);
		} else {
			var href = 'https://api.github.com/repos/' + owner + '/' + repos + '/contents/';
			console.debug('GAPI', 'Tree cache not found, fetch from ' + href);
			api(href, resp => resp.every((dirmeta, index) => {
				// filter and ignore prefix for internal items.
				if (ignorePath(dirmeta.name) || dirmeta.type !== 'dir' || dir !== dirmeta.name) return true;
				api_tree(cache_key, dirmeta, cb);
				return true;
			}));
		}
	}
}

function api_tree(cache_key, dirmeta, cb) {
	api(dirmeta.git_url + '?recursive=1', resp => {
		localStorage.setItem(cache_key, JSON.stringify(resp));
		console.debug('GAPI', resp.tree.length + ' items loaded in ' + resp.url + '.');
		if (resp.truncated) alert('truncated for folder is too large, please switch to GIT SITE or GIT RAW mode.');
		cb(dirmeta.name, resp.tree);
	});
}