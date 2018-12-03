var LOADING = '<div id="lds-div" class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';

function parseShelfContext(context, cb) {
	var shelfconf = /^\w+\.github.io$/.test(context.repos) ? 'https://' + context.owner + '.github.io/_biblio/shelf.json' : 'https://' + context.owner + '.github.io/' + context.repos + '/_biblio/shelf.json';
	$.get(shelfconf, shelf_ctx => {
		if (shelf_ctx.dirs) context.dirs = shelf_ctx;
		if (shelf_ctx.exts) context.exts = shelf_exts;
		console.debug('context', context);
		cb(context);
	}).fail(() => cb(context));
}

function parseContext(treeid, viewid, cb) {
	var default_ctx = {
		tree: $(treeid),
		view: $(viewid),
		exts: ['txt', 'md']
	};

	var url_ctx = {};
	var match;
	if (window.location.href.startsWith('https://github.com/')) {
		var pos = window.location.href.substr(19).split('/');
		url_ctx.owner = pos[1];
		url_ctx.repos = pos[2];
	} else if (null !== (match = /^https:\/\/(\w+)\.github.io\/(.*)\//.exec(window.location.href))) {
		url_ctx.owner = match[1];
		var segs = match[1].split('/');
		if (segs.length > 1) { // contain repos and folder
			url_ctx.repos = segs[0];
			url_ctx.dirs = [segs[1]];
		}
	}

	var qs_ctx = {}
	var qs = window.location.search.substr(1).split('&');
	for (var i = 0; i < qs.length; i++) {
		var a = qs[i].split('=');
		switch (a[0]) {
			case 'o':
				qs_ctx.owner = a[1];
				break;
			case 'r':
				qs_ctx.repos = a[1];
				break;
			case 'd':
				qs_ctx.dirs = a[1].split('|');
				break;
			case 'x':
				qs_ctx.exts = a[1].split(',');
				break;
		}
	}


	$.get(window.location.origin + '/_biblio/shelf.json', json_ctx => parseShelfContext(Object.assign(default_ctx, json_ctx, url_ctx, qs_ctx), cb)).fail(() => parseShelfContext(Object.assign(default_ctx, url_ctx, qs_ctx), cb));
}

function ignorePath(path) {
	return /^[_.~]/.test(path);
}

function treeNodeDir(dirname) {
	if (ignorePath(dirname)) return null;
	return {
		text: dirname,
		tags: [0],
		nodes: [],
		state: {
			checked: false,
			disabled: false,
			// expanded: false,
			selected: false
		}
	};
}

var UNITS = ['B', 'K', 'M', 'G'];

function treeNodeFile(context, filename, item, names) {
	var title = filename.substr(0, filename.lastIndexOf('.'));
	var ext = filename.substr(filename.lastIndexOf('.') + 1);
	if (context.exts.indexOf(ext) < 0) return null;
	var size = item.size,
		u = 0;
	while (size > 1000) {
		size /= 1000;
		u++;
	}
	//item.size.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	return {
		text: title,
		tags: [ /*names.join('/'), */ size.toFixed() + ' ' + UNITS[u], ext],
		ext: ext,
		size: item.size,
		href: item.url,
		state: {
			checked: false,
			disabled: false,
			// expanded: false,
			selected: false
		}
	};
}

function parseTitle(context) {
	for (var i = 1; i < 7; i++) {
		var hs = context.view[0].getElementsByTagName('h' + i);
		if (hs.length > 0) return hs[0].innerText;
	}
}

function render(context, data, txt) {
	switch (data.ext) {
		case 'txt':
			context.view.html('<pre style="color:unset;margin-left:unset;max-width:unset;">' + txt + '</pre>');
			document.title = '《' + data.text + '》 - Biblio';
			return;
		case 'md':
			var html = new showdown.Converter({
				tables: true,
				strikethrough: true
			}).makeHtml(txt);
			context.view.html(html);
			document.title = '《' + (parseTitle(context) || data.text) + '》 - Biblio';
			return;
		case 'html':
		case 'htm':
			context.view.html(html);
			return;
		default:
			context.view.text(data.ext + ' is not supportted');
			return;
	}
}

function process1(context, item, root) {
	var names = item.path.split('/'),
		filename = names.pop(),
		p = root;
	names.every((path, index) => {
		if (ignorePath(path)) return false;
		var pp = null;
		p.nodes.every((n, index) => {
			if (n.text !== path)
				return true;
			p = n;
			return false;
		});
		return true;
	});
	if (root === p && names.length > 0) return true; // not found, ignored?
	var n;
	switch (item.type) {
		case 'tree':
			n = treeNodeDir(filename);
			break;
		case 'blob':
			n = treeNodeFile(context, filename, item, names);
			break;
	}
	if (null !== n) {
		p.tags[0]++;
		p.nodes.push(n);
	}
	return true;
}

var SITE_CONTEXT;
function readme(context) {
	context = context || SITE_CONTEXT;
	context.view.html(LOADING);
	api_content('https://api.github.com/repos/' + context.owner + '/' + context.repos + '/readme/', content => render(context, {
		ext: 'md'
	}, content));
	return context;
}

function init(treeid, vid) {
	$('.biblio-menu').width($(vid).width() * 0.92);
	parseContext(treeid, vid, context => {
		SITE_CONTEXT = readme(context);
		context.tree.html(LOADING);
		api_root(context.owner, context.repos, context.dirs, (dir, tree) => {
			var root = treeNodeDir(dir);
			tree.every((item, index) => process1(context, item, root));
			context.tree.treeview({
				levels: 1,
				// enableLinks: true,
				showTags: true,
				backColor: 'linen',
				borderColor: 'burlywood',
				data: [root],
				onNodeSelected: (event, data) => {
					if (data.href) {
						context.view.html(LOADING);
						api_content(data.href, content => render(context, data, content));
						context.tree.treeview('collapseAll', {
							silent: false
						});
					} else context.tree.treeview('toggleNodeExpanded', [data.nodeId, {
						silent: false
					}]);
				}
			});
			$(vid).css('padding-top', $('.biblio-menu').height());
			console.debug('treeview', 'rendering finished.');
		});
	});
}