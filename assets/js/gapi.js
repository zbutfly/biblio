class GitHubAPI {
	constructor(context) {
		this.context = context;
	}

	api(url, cb, ele) {
		if (ele) ele.html(GitHubAPI.LOADING);
		$.ajax({
			url: url,
			dataType: 'json',
			headers: {
				'Accept': 'application/vnd.github.v3+json'
			},
			success: cb,
			error: (xhr, msg, ex) => Biblio.info('GAPI error of [' + this._info(url) + ']:\n' + msg, 'error'),
			xhrFields: {
				onprogress: function (progress) {
					if (!progress) Biblio.info('GAPI progress of [' + this._info(url) + ']...', 'trace');
					else if (ele && progress.loaded) {
						var lds = ele[0].children[0].children;
						lds[lds.length - 1].innerHTML = progress.loaded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					} else Biblio.info('GAPI progress of [' + this._info(url) + ']:\n' + progress, 'trace');
				}
			}
		});
	}

	_info(url) {
		var m = /\/([^\/]+)\/?$/.exec(url);
		if (m !== null && m.length > 0)
			return m[1];
		else return url;
	}

	getContent(href, cb, view) {
		var c = localStorage.getItem(href);
		if (null === c) {
			Biblio.info('GAPI content [' + this._info(href) + '] fetching.', 'debug');
			this.api(href, resp => {
				try {
					localStorage.setItem(href, resp.content);
				} catch (err) {
					Biblio.info('GAPI content [' + this._info(href) + '] fetched [' + resp.content.length + '] but cache fail: ' + err, 'warn');
				}
				cb(Base64.decode(resp.content));
			}, view);
		} else {
			Biblio.info('GAPI content [' + this._info(href) + '] cached.', 'debug');
			cb(Base64.decode(c));
		}
	}

	getRoot(cb) {
		var cache_key = 'github-api:' + this.context.owner + '/' + this.context.repos + '/' + this.context.shelf;
		var cache = localStorage.getItem(cache_key);
		if (cache !== null) {
			Biblio.info('GAPI tree [' + cache_key + '] cached.', 'debug');
			cb(this.context.shelf, JSON.parse(cache).tree);
		} else {
			var href = 'https://api.github.com/repos/' + this.context.owner + '/' + this.context.repos + '/contents/';
			Biblio.info('GAPI tree [' + cache_key + '] fetching.', 'debug');
			this.api(href, resp => resp.every((dir_meta, index) => {
				// filter and ignore prefix for internal items.
				if (Biblio.isIgnored(dir_meta.name) || dir_meta.type !== 'dir' || this.context.shelf !== dir_meta.name) return true;
				this.api(dir_meta.git_url + '?recursive=1', resp => {
					localStorage.setItem(cache_key, JSON.stringify(resp));
					Biblio.info('GAPI tree [' + cache_key + '] fetched [' + resp.tree.length + '] items.', 'debug');
					if (resp.truncated) alert('truncated for folder is too large, please switch to GIT SITE or GIT RAW mode.');
					cb(dir_meta.name, resp.tree);
				}, this.context.tree);
				return true;
			}));
		}
	}

	getLiblio(cb) {
		this.getContent('https://api.github.com/repos/' + this.context.owner + '/' + this.context.repos + '/contents/_biblio/liblio.json', json => {
			this.context.merge(JSON.parse(json));
			if (!this.context.base) {
				if (/^\w+\.github.io$/.test(this.context.repos)) // liblio is a root github site of the owner.
					this.context.base = 'https://' + this.context.owner + '.github.io'
				else this.context.base = 'https://' + this.context.owner + '.github.io/' + this.context.repos;
			}
			cb(this.context);
		});
	}
}

GitHubAPI.LOADING = '<div class="lds-roller">' +
	'<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>' +
	'<span style="font-size:small;color:burlywood;"></span></div>';