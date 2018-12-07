class Context {
	constructor(tree, view) {
		this.owner = 'zbutfly';
		this.repos = 'biblio';
		this.shelf = 'sample';
		this.tree = $(tree);
		this.view = $(view);
		this.exts = ['txt', 'md'];
		this._priority = Object.assign(Context._href(), Context._querystring());
		Object.assign(this, this._priority);
	}

	merge(context) {
		return Object.assign(this, context, this._priority);
	}

	static _href() {
		var ctx = {},
			match;
		if (window.location.href.startsWith('https://github.com/')) {
			var pos = window.location.href.substr(19).split('/');
			ctx.owner = pos[1];
			ctx.repos = pos[2];
		} else if (null !== (match = /^https:\/\/(\w+)\.github.io\/(.+)\//.exec(window.location.href))) {
			ctx.owner = match[1];
			var segs = match[1].split('/');
			ctx.repos = segs[0];
			if (segs.length > 1) ctx.shelf = decodeURI(segs[1]);
		}
		return ctx;
	}

	static _querystring() {
		var s = window.location.search.replace(/^\?+/g, '');
		if (s.length == 0) return {};
		var ctx = {},
			qs = s.split('&');
		for (var i = 0; i < qs.length; i++) {
			var a = qs[i].split('=');
			switch (a[0]) {
				case 'o':
					ctx.owner = a[1];
					break;
				case 'r':
					ctx.repos = a[1];
					break;
				case 'd':
					ctx.shelf = decodeURI(d);
					break;
				case 'x':
					ctx.exts = a[1].split(',');
					break;
				case 's':
					ctx.base = a[1];
					break;
			}
		}
		return ctx;
	}

	gist(id) {}
}