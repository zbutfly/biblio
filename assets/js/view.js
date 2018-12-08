class Biblio {
	constructor() {
		this.camping = false;
		$('#biblio-dir-search').val('');
		$('.biblio-menu').width($('#biblio-outer').width() - 15);
		$('.biblio-menu-b').on('click', function (event) {
			$('.biblio-menu-b-1').toggleClass('biblio-menu-b-1-click');
			$('.biblio-menu-b-2').toggleClass('biblio-menu-b-2-click');
			$('.biblio-menu-b-3').toggleClass('biblio-menu-b-3-click');
			$('#biblio-menu-c').toggle();
			event.preventDefault();
		});
		$('#biblio-restart').on('click', () => {
			localStorage.clear();
			Biblio.info('RESET all cache cleared', 'info');
			this.readme();
		});
		$('#biblio-font-minus').on('click', () => this.zoom(false));
		$('#biblio-font-reset').on('click', () => this.zoom());
		$('#biblio-font-plus').on('click', () => this.zoom(true));


		this.context = new Context('#biblio-dir', '#biblio-inner');
		this.api = new GitHubAPI(this.context);
		this.api.getGist(this.context.gist, liblio => this.init(Object.assign(this.context, liblio)), all => this.list(all));
		$(window).on('hashchange', e => this.api.getGist(this.context.hash().gist, liblio => this.init(Object.assign(this.context, liblio)), all => this.list(all)));
	}

	init(ctx) {
		this.readme();
		this.track();

		$('#biblio-dir-search').on('compositionstart', () => this.camping = true);
		$('#biblio-dir-search').on('compositionend', () => {
			this.camping = false;
			this.search($('#biblio-dir-search').val());
		});
		$('#biblio-dir-search').on('input', () => this.search($('#biblio-dir-search').val()));
		this.api.getRoot(this.context.owner, this.context.repos, this.context.shelf, this.context.tree, (dir, tree) => this.treeview(dir, tree));
	}

	list(all) {
		$('#biblio-gists').html('');
		for (var fn in all) {
			var ele = '<a href="#' + this.context.gist.split('=')[0] + '=' + encodeURI(fn) + '" title="' + all[fn] + '">' + fn + '</a>';
			$(ele).appendTo($('#biblio-gists'));
		}
	}

	treeview(dir, tree) {
		var root = this.treeNodeDir(dir);
		tree.every((item, index) => this.processTreeItem(dir, item, root));
		this.context.tree.treeview({
			levels: 1,
			// enableLinks: true,
			showTags: true,
			backColor: 'linen',
			borderColor: 'burlywood',
			data: root.nodes,
			onNodeSelected: (event, node) => {
				if (node.href) {
					this.display(node);
					this.context.tree.treeview('collapseAll', {
						silent: false
					});
				} else {
					this.context.tree.treeview('toggleNodeExpanded', [node.nodeId, {
						silent: false
					}]);
				}
			},
			onNodeExpanded: (event, node) => {
				var n = $('.node-biblio-dir[data-nodeid="' + node.nodeId + '"]');
				if (n.length > 0) n[0].scrollIntoView();
			},
			onSearchComplete: (event, results) => {
				var rs = Object.keys(results).length;
				$('#biblio-dir-search-c').text(rs);
				if (rs > 0) $('.node-biblio-dir[data-nodeid="' + results[0].nodeId + '"]')[0].scrollIntoView();
				Biblio.info('SEARCH completed with ' + rs + ' matched.');
			}
		});
	}

	static isIgnored(path) {
		return /^[_.~]/.test(path);
	}

	treeNodeDir(dirname) {
		if (Biblio.isIgnored(dirname)) return null;
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

	treeNodeFile(dir, filename, item, names) {
		var title = filename.substr(0, filename.lastIndexOf('.'));
		var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
		if (this.context.exts.indexOf(ext) < 0) return null;
		var size = item.size,
			u = 0;
		while (size > 1000) {
			size /= 1000;
			u++;
		}
		return {
			text: title,
			tags: [ /*names.join('/'), */ size.toFixed(size >= 10 ? 0 : 1) + ' ' + Biblio.UNITS[u], ext],
			ext: ext,
			biblioPath: dir + '/' + item.path,
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

	parseTitle() {
		for (var i = 1; i < 7; i++) {
			var hs = this.context.view[0].getElementsByTagName('h' + i);
			if (hs.length > 0) return hs[0].innerText;
		}
	}

	display(node) {
		switch (node.ext) {
			case 'txt':
				this.api.getContent(node.href, content => {
					this.context.view.html('<pre style="color:unset;margin-left:unset;max-width:unset;">' + content + '</pre>');
					document.title = '《' + node.text + '》 - Biblio';
				}, this.context.view);
				return;
			case 'md':
				this.api.getContent(node.href, content => {
					var html = new showdown.Converter({
						tables: true,
						strikethrough: true
					}).makeHtml(content);
					this.context.view.html(html);
					document.title = '《' + (this.parseTitle() || node.text) + '》 - Biblio';
				}, this.context.view);
				return;
			case 'htm':
				this.api.getContent(node.href, content => this.context.view.html(content), this.context.view);
				return;
			case 'pdf':
				return;
			case 'epub':
				return;
			case 'mobi':
				return;
			default:
				this.context.view.text(node.ext + ' is not supportted');
				return;
		}
	}

	renderEpub() {
		var target = ePub(context.base + '/' + node.biblioPath);
		// target = 'https://zbutfly.github.io/biblio/sample/%E5%A8%B6%E4%B8%AA%E5%A7%90%E5%A7%90%E5%BD%93%E8%80%81%E5%A9%86_%E8%87%B311%E5%8D%B7%E9%98%B4%E5%BD%B1%E8%B0%B7%E7%AF%87%E5%AE%8C.epub';
		var book = new ePub("data:application+zip;base64," + content);
		var rendition = book.renderTo("biblio-inner", {
			method: "default",
			width: "100%",
			height: "100%"
		});
		var displayed = rendition.display();
		// this.api.getContent(node.href, content => {
		// 	var book = new ePubReader("data:application+zip;base64," + content);
		// 	var rendition = book.renderTo("biblio-inner", {
		// 		method: "default",
		// 		width: "100%",
		// 		height: "100%"
		// 	});
		// 	var displayed = rendition.display();
		// }, context.view);


	}

	processTreeItem(dir, item, root) {
		var names = item.path.split('/'),
			filename = names.pop(),
			p = root;
		names.every((path, index) => {
			if (Biblio.isIgnored(path)) return false;
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
				n = this.treeNodeDir(filename);
				break;
			case 'blob':
				n = this.treeNodeFile(dir, filename, item, names);
				break;
		}
		if (null !== n) {
			p.tags[0]++;
			p.nodes.push(n);
		}
		return true;
	}

	readme() {
		this.display({
			ext: 'md',
			href: 'https://api.github.com/repos/' + this.context.owner + '/' + this.context.repos + '/readme/'
		});
	}

	// Deprecated
	// getLiblio(cb) {
	// 	if (this.context.gist) this.api.getGist(this.context.gist, liblio => this.init(Object.assign(this.context, liblio)));
	// 	else this.api.getContent('https://api.github.com/repos/' + this.context.owner + '/' + this.context.repos + '/contents/_biblio/liblio.json', json => {
	// 		this.context.merge(JSON.parse(json));
	// 		if (!this.context.base) {
	// 			if (/^\w+\.github.io$/.test(this.context.repos)) // liblio is a root github site of the owner.
	// 				this.context.base = 'https://' + this.context.owner + '.github.io'
	// 			else this.context.base = 'https://' + this.context.owner + '.github.io/' + this.context.repos;
	// 		}
	// 		this.api.getContent('https://api.github.com/repos/' + this.context.owner + '/' + this.context.repos + '/contents/_biblio/liblio.json', json => {
	// 			this.context.merge(JSON.parse(json));
	// 			if (!this.context.base) {
	// 				if (/^\w+\.github.io$/.test(this.context.repos)) // liblio is a root github site of the owner.
	// 					this.context.base = 'https://' + this.context.owner + '.github.io'
	// 				else this.context.base = 'https://' + this.context.owner + '.github.io/' + this.context.repos;
	// 			}
	// 			this.init(this.context);
	// 		});
	// 	});
	// }

	search(s) {
		if (this.camping) return;
		s = (s || '').trim();
		if (s === '') {
			this.context.tree.treeview('clearSearch');
			$('#biblio-dir-search-c').text(0);
			this.context.tree.treeview('collapseAll', {
				silent: false
			});
		} else {
			Biblio.info('SEARCH [' + s + '] started.');
			this.context.tree.treeview('search', [s, {
				ignoreCase: true, // case insensitive
				exactMatch: false, // like or equals
				revealResults: true, // reveal matching nodes
			}]);
		}
	}

	zoom(zoom) {
		if (undefined === zoom) this.context.view.css('font-size', '');
		else {
			var size = parseInt(this.context.view.css('font-size'));
			size = (size * (zoom ? 1.25 : 0.75)).toFixed();
			this.context.view.css('font-size', size + this.context.view.css('font-size').substr(size.toString().length))
		}
	}

	track() {
		if (this.context.trackid) {
			var trackurl = 'https://cdn.clustrmaps.com/globe.js?d=' + this.context.trackid;
			Biblio.info('TRACK appended with [' + this.context.trackid + '].');
			var t = document.createElement('script');
			t.type = 'text/javascript';
			t.src = trackurl;
			$('#biblio-earth').html('');
			$('#biblio-earth').append(t);
		}
	}

	static info(msg, level) {
		level = level || 'debug';
		switch (level.toLowerCase()) {
			case 'info':
			case 'debug':
			case 'warn':
			case 'error':
				var t = '2000';
				var uid = 'biblio-info-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					var r = Math.random() * 16 | 0;
					return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
				});
				var ele = $('<div id="' + uid + '" class="biblio-info biblio-info-' + level + '"></div>').hide().text(msg);
				ele.appendTo($('#biblio-info-div')).fadeIn(t, 'linear', (e) => setTimeout(() => ele.fadeOut(t, 'linear', () => ele.remove()), t * 2));
				break;
			case 'trace':
			default:
				console.log(msg);
				break;
		}
		switch (level.toLowerCase()) {
			case 'error':
				console.trace(msg);
				break;
		}
	}
}

Biblio.UNITS = ['B', 'K', 'M', 'G'];