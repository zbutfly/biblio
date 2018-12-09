class GitHubAPI {
	constructor() {}

	api(url, cb, ele) {
		if (ele) ele.html(GitHubAPI.LOADING);
		$.ajax({
			url: url,
			dataType: 'json',
			headers: {
				'Accept': 'application/vnd.github.v3+json'
			},
			success: cb,
			error: (xhr, msg, ex) => Biblio.info('GAPI error of [' + GitHubAPI._info(url) + ']:\n' + msg, 'error'),
			xhrFields: {
				onprogress: function (progress) {
					if (!progress) Biblio.info('GAPI progress of [' + GitHubAPI._info(url) + ']...', 'trace');
					else if (ele && progress.loaded) {
						var lds = ele[0].children[0].children;
						lds[lds.length - 1].innerHTML = progress.loaded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					} // else Biblio.info('GAPI progress of [' + GitHubAPI._info(url) + ']:\n' + progress, 'trace');
				}
			}
		});
	}

	static _info(url) {
		var m = /\/([^\/]+)\/?$/.exec(url);
		if (m !== null && m.length > 0)
			return m[1];
		else return url;
	}

	getGist(gist, cb, cb2) {
		var g = gist.split('=', 2),
			gn = g.length > 1 ? decodeURI(g[1]) : null,
			all = {},
			loaded = false,
			first = null;
		this.api('https://api.github.com/gists/' + g[0], gist => {
			for (var f in gist.files) {
				var fn = f.substr(0, f.length - 5);
				var liblio = JSON.parse(gist.files[f].content);
				if (null === first) first = liblio;
				if (!loaded && null === gn || gn === fn) {
					loaded = true;
					Biblio.info('GAPI gist [' + g[0] + '][' + fn + '] fetched.');
					cb(liblio);
				} else all[fn] = liblio.shelf || '';
			}
			if (!loaded && null != first) {
				Biblio.info('GAPI gist [' + g[0] + '] fetched but [' + gn + '] not found, first [' + first.filename.substr(0, first.filename.length - 5) + '] is loaded.', 'warn');
				all.remove(first.shelf);
				cb(first);
			}
			cb2(all);
		});
	}

	getContent(href, cb, view) {
		var c = localStorage.getItem(href);
		if (null === c) {
			Biblio.info('GAPI content [' + GitHubAPI._info(href) + '] fetching.');
			this.api(href, resp => {
				try {
					localStorage.setItem(href, resp.content);
				} catch (err) {
					Biblio.info('GAPI content [' + GitHubAPI._info(href) + '] fetched [' + resp.content.length + '] but cache fail: ' + err, 'warn');
				}
				cb(resp.content);
			}, view);
		} else {
			Biblio.info('GAPI content [' + GitHubAPI._info(href) + '] cached.');
			cb(c);
		}
	}

	getRoot(owner, repos, dir, tree, cb) {
		var cache_key = 'github-api:' + owner + '/' + repos + '/' + dir;
		var cache = localStorage.getItem(cache_key);
		if (cache !== null) {
			Biblio.info('GAPI tree [' + cache_key + '] cached.');
			cb(dir, JSON.parse(cache).tree);
		} else {
			var href = 'https://api.github.com/repos/' + owner + '/' + repos + '/contents/';
			Biblio.info('GAPI tree [' + cache_key + '] fetching.');
			this.api(href, resp => resp.every((dir_meta, index) => {
				// filter and ignore prefix for internal items.
				if (Biblio.isIgnored(dir_meta.name) || dir_meta.type !== 'dir' || dir !== dir_meta.name) return true;
				this.api(dir_meta.git_url + '?recursive=1', resp => {
					localStorage.setItem(cache_key, JSON.stringify(resp));
					Biblio.info('GAPI tree [' + cache_key + '] fetched [' + resp.tree.length + '] items.');
					if (resp.truncated) alert('truncated for folder is too large, please switch to GIT SITE or GIT RAW mode.');
					cb(dir_meta.name, resp.tree);
				}, tree);
				return true;
			}));
		}
	}
}

GitHubAPI.LOADING = '<div class="lds-roller">' +
	'<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>' +
	'<span style="font-size:small;color:burlywood;"></span></div>';