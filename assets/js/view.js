var LOADING = '<div id="lds-div" class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
var context = {};

function parseContext(treeid, viewid) {
	var qs = window.location.search.substr(1).split('&');
	var args = {
		tree: $(treeid),
		view: $(viewid),
		exts: ['txt', 'md']
	};

	var match;
	if (window.location.href.startsWith('https://github.com/')) {
		var pos = window.location.href.substr(19).split('/');
		args.owner = pos[1];
		args.repos = pos[2];
	} else if (null !== (match = /^https:\/\/(\w+)\.github.io\/(.*)\//.exec(window.location.href))) {
		args.owner = match[1];
		var segs = match[1].split('/');
		if (segs.length > 1) { // contain repos and folder
			args.repos = segs[0];
			args.folders = [segs[1]];
		}
	}

	for (var i = 0; i < qs.length; i++) {
		var a = qs[i].split('=');
		switch (a[0]) {
			case 'o':
				args.owner = a[1];
				break;
			case 'r':
				args.repos = a[1];
				break;
			case 'd':
				args.folders = a[1].split('|');
				break;
			case 'x':
				args.exts = a[1].split(',');
				break;
		}
	}
	return args;
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

function treeNodeFile(filename, item, names) {
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

function parseTitle() {
	for (var i = 1; i < 7; i++) {
		var hs = context.view[0].getElementsByTagName('h' + i);
		if (hs.length > 0) return hs[0].innerText;
	}
}

function render(data, txt) {
	switch (data.ext) {
		case 'txt':
			context.view.html('<pre style="color:unset;">' + txt + '</pre>');
			document.title = '《' + data.text + '》 - Biblio';
			return;
		case 'md':
			var html = new showdown.Converter({
				tables: true,
				strikethrough: true
			}).makeHtml(txt);
			context.view.html(html);
			document.title = '《' + (parseTitle() || data.text) + '》 - Biblio';
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

function process1(item, root) {
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
			n = treeNodeFile(filename, item, names);
			break;
	}
	if (null !== n) {
		p.tags[0]++;
		p.nodes.push(n);
	}
	return true;
}

function readme() {
	context.view.html(LOADING);
	api_content('https://api.github.com/repos/' + context.owner + '/' + context.repos + '/readme/', content => render({
		ext: 'md'
	}, content));
}

function treeview(treeid, vid) {
	context = parseContext(treeid, vid);
	console.debug('context', context);
	readme();
	context.tree.html(LOADING);
	api_root(context.owner, context.repos, context.folders, (dir, tree) => {
		var root = treeNodeDir(dir);
		tree.every((item, index) => process1(item, root));
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
					api_content(data.href, content => render(data, content));
					context.tree.treeview('collapseAll', {
						silent: false
					});
				} else context.tree.treeview('toggleNodeExpanded', [data.nodeId, {
					silent: false
				}]);
			}
		});
		console.debug('treeview', 'rendering finished.');
	});
}