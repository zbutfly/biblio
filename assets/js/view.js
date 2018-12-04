function parseLiblio(context, cb) {
	var shelfconf;
	if (context.base)
		shelfconf = context.base + '/_biblio/liblio.json';
	else if (/^\w+\.github.io$/.test(context.repos))
		shelfconf = 'https://' + context.owner + '.github.io/_biblio/liblio.json';
	else shelfconf = 'https://' + context.owner + '.github.io/' + context.repos + '/_biblio/liblio.json';

	$.get(shelfconf, liblio_json => {
		Object.assign(context, liblio_json);
		console.debug('CONTEXT', context);
		cb(context);
	}).fail(() => cb(context));
}

function parseBiblio(treeid, viewid, cb) {
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
			url_ctx.dirs = [decodeURI(segs[1])];
		}
	}

	var qs_ctx = {};
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
				qs_ctx.dirs = [];
				a[1].split('|').forEach(d => qs_ctx.dirs.push(decodeURI(d)));
				break;
			case 'x':
				qs_ctx.exts = a[1].split(',');
				break;
			case 's':
				qs_ctx.base = a[1];
				break;
		}
	}


	$.get(window.location.origin + '/_biblio/liblio.json', biblio_json => parseLiblio(Object.assign(default_ctx, biblio_json, url_ctx, qs_ctx), cb)).fail(() => parseLiblio(Object.assign(default_ctx, url_ctx, qs_ctx), cb));
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
	var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
	if (context.exts.indexOf(ext) < 0) return null;
	var size = item.size,
		u = 0;
	while (size > 1000) {
		size /= 1000;
		u++;
	}
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
			if (n.nodes === undefined || n.text !== path)
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

var SITE_CONTEXT, camping = false;

function readme() {
	api_readme(SITE_CONTEXT, content => {
		render(SITE_CONTEXT, {
			ext: 'md'
		}, content);
	});
}

function init(treeid, vid) {
	Menu.init();
	$('#biblio-dir-search').val('');
	$('.biblio-menu').width($('#biblio-outer').width() - 15);
	parseBiblio(treeid, vid, context => {
		SITE_CONTEXT = context;
		readme();
		if (context.trackid) {
			var trackurl = 'https://cdn.clustrmaps.com/globe.js?d=' + context.trackid;
			console.debug("TRACK", trackurl);
			var t = document.createElement("script");
			t.type = "text/javascript";
			t.src = trackurl;
			$('#biblio-earth').append(t);
		}

		document.getElementById('biblio-dir-search').addEventListener('compositionstart', () => camping = true);
		document.getElementById('biblio-dir-search').addEventListener('compositionend', () => camping = false);
		api_root(context, (dir, tree) => {
			var root = treeNodeDir(dir);
			tree.every((item, index) => process1(context, item, root));
			context.tree.treeview({
				levels: 1,
				// enableLinks: true,
				showTags: true,
				backColor: 'linen',
				borderColor: 'burlywood',
				data: [root],
				onNodeSelected: (event, node) => {
					if (node.href) {
						api_content(node.href, content => render(context, node, content), context.view);
						context.tree.treeview('collapseAll', {
							silent: false
						});
					} else {
						context.tree.treeview('toggleNodeExpanded', [node.nodeId, {
							silent: false
						}]);
					}
				},
				onNodeExpanded: (event, node) => {
					$('.node-biblio-dir[data-nodeid="' + node.nodeId + '"]')[0].scrollIntoView();
				},
				onSearchComplete: (event, results) => {
					var rs = Object.keys(results).length;
					$('#biblio-dir-search-c').text(rs);
					if (rs > 0) $('.node-biblio-dir[data-nodeid="' + results[0].nodeId + '"]')[0].scrollIntoView();
				}
			});
		});
	});
}

function search(s) {
	if (camping) return;
	s = (s || '').trim();
	if (s === '') {
		SITE_CONTEXT.tree.treeview('clearSearch');
		$('#biblio-dir-search-c').text(0);
		SITE_CONTEXT.tree.treeview('collapseAll', {
			silent: false
		});
	} else {
		console.debug('SEARCH', s);
		SITE_CONTEXT.tree.treeview('search', [s, {
			ignoreCase: true, // case insensitive
			exactMatch: false, // like or equals
			revealResults: true, // reveal matching nodes
		}]);
	}
}

var Menu = {
	init: function () {
		$('.biblio-menu-b').on('click', function (event) {
			Menu.activateMenu(event);
			$('#biblio-menu-c').toggle();
			event.preventDefault();
		});
	},
	activateMenu: function () {
		$('.biblio-menu-b-1').toggleClass('biblio-menu-b-1-click');
		$('.biblio-menu-b-2').toggleClass('biblio-menu-b-2-click');
		$('.biblio-menu-b-3').toggleClass('biblio-menu-b-3-click');
	}
};