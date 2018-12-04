var LOADING = '<div class="lds-roller">' +
	'<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>' +
	'<span style="font-size:small;color:burlywood;"></span></div>';

function api(url, cb, ele) {
	if (ele) ele.html(LOADING);
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
				if (progress.loaded) {
					var lds = ele[0].children[0].children;
					lds[lds.length - 1].innerHTML = progress.loaded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				} else console.debug('PROGRESS', process);
			}
		}
	});
}

function api_content(href, cb, view) {
	var c = localStorage.getItem(href);
	if (null === c) {
		console.debug('GAPI', 'Content cache not found, fetch from ' + href);
		api(href, resp => {
			try {
				localStorage.setItem(href, resp.content);
			} catch (err) {
				console.warn('CACHE', err);
			}
			cb(Base64.decode(resp.content));
		}, view);
	} else {
		console.debug('GAPI', 'Content cache found.');
		cb(Base64.decode(c));
	}
}

function api_root(context, cb) {
	for (var i = 0; i < context.dirs.length; i++) {
		var dir = context.dirs[i];
		var cache_key = 'github-api:' + context.owner + '/' + context.repos + '/' + dir;
		var cache = localStorage.getItem(cache_key);
		if (cache !== null) {
			console.debug('GAPI', 'Tree cache found.');
			cb(dir, JSON.parse(cache).tree);
		} else {
			var href = 'https://api.github.com/repos/' + context.owner + '/' + context.repos + '/contents/';
			console.debug('GAPI', 'Tree cache not found, fetch from ' + href);
			api(href, resp => resp.every((dirmeta, index) => {
				// filter and ignore prefix for internal items.
				if (ignorePath(dirmeta.name) || dirmeta.type !== 'dir' || dir !== dirmeta.name) return true;
				api_tree(cache_key, dirmeta, cb, context.tree);
				return true;
			}));
		}
	}
}

function api_tree(cache_key, dirmeta, cb, tree) {
	api(dirmeta.git_url + '?recursive=1', resp => {
		localStorage.setItem(cache_key, JSON.stringify(resp));
		console.debug('GAPI', resp.tree.length + ' items loaded in ' + resp.url + '.');
		if (resp.truncated) alert('truncated for folder is too large, please switch to GIT SITE or GIT RAW mode.');
		cb(dirmeta.name, resp.tree);
	}, tree);
}

function api_readme(context, cb) {
	api_content('https://api.github.com/repos/' + context.owner + '/' + context.repos + '/readme/', cb, context.view);
}