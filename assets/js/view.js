class Biblio {
	constructor() {
		this.camping = false;
		this.api = new GitHubAPI();
		$('#biblio-dir-search').val('');
		$('.biblio-menu').width($('#biblio-outer').width() - 15);
		$('.biblio-menu-b').on('click', function (event) {
			$('.biblio-menu-b-1').toggleClass('biblio-menu-b-1-click');
			$('.biblio-menu-b-2').toggleClass('biblio-menu-b-2-click');
			$('.biblio-menu-b-3').toggleClass('biblio-menu-b-3-click');
			$('#biblio-menu-c').fadeToggle(1000);
			event.preventDefault();
		});
		$('#biblio-restart').on('click', () => {
			localStorage.clear();
			Biblio.info('RESET all cache cleared', 'info');
			this.readme();
			$('.biblio-menu-b').trigger('click');
		});
		$('#biblio-font-minus').on('click', () => this.zoom(false));
		$('#biblio-font-reset').on('click', () => this.zoom());
		$('#biblio-font-plus').on('click', () => this.zoom(true));

		this.context = new Context('#biblio-dir', '#biblio-inner');
		this.reload();
		$(window).on('hashchange', e => this.reload());
	}

	reload() {
		this.api.getGist(this.context.hash().gist, liblio => {
			Object.assign(this.context, liblio);
			this.readme();
			this.track();

			$('#biblio-dir-search').on('compositionstart', () => this.camping = true);
			$('#biblio-dir-search').on('compositionend', () => {
				this.camping = false;
				this.search($('#biblio-dir-search').val());
			});
			$('#biblio-dir-search').on('input', () => this.search($('#biblio-dir-search').val()));
			this.api.getRoot(this.context.owner, this.context.repos, this.context.shelf, this.context.tree, (dir, tree) => this.treeview(dir, tree));
		}, all => {
			$('#biblio-gists').html('');
			for (var fn in all) {
				var ele = '<a href="#' + this.context.gist.split('=')[0] + '=' + encodeURI(fn) + '" title="' + all[fn] + '">' + fn + '</a>';
				$(ele).appendTo($('#biblio-gists'));
			}
		});
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
					$('.biblio-menu-b').trigger('click');
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
					this.context.view.html('<pre style="color:unset;margin-left:unset;max-width:unset;">' + Base64.decode(content) + '</pre>');
					document.title = '《' + node.text + '》 - Biblio';
				}, this.context.view);
				return;
			case 'md':
				this.api.getContent(node.href, content => {
					var html = new showdown.Converter({
						tables: true,
						strikethrough: true
					}).makeHtml(Base64.decode(content));
					this.context.view.html(html);
					document.title = '《' + (this.parseTitle() || node.text) + '》 - Biblio';
				}, this.context.view);
				return;
			case 'htm':
				this.api.getContent(node.href, content => this.context.view.html(Base64.decode(content)), this.context.view);
				return;
			case 'pdf':
				this.api.getContent(node.href, content => this.displayPdf(node, content), this.context.view);
				break;
			case 'epub':
			case 'mobi':
				this.displayEpub(node);
				return;
			default:
				this.context.view.text(node.ext + ' is not supportted');
				return;
		}
	}

	displayPdfPage(pdf, canvas) {
		var pn = parseInt($('#biblio-inner-pdf-nav-range').val());
		return pdf.getPage(pn).then(page => {
			Biblio.info('PDF page [' + (page.pageIndex + 1) + '/' + pdf.numPages + '] loaded.');
			var viewport = page.getViewport(canvas.width / page.getViewport(1.0).width);
			canvas.height = viewport.height;
			page.render({
				canvasContext: canvas.getContext('2d'),
				viewport: viewport
			}).then(() => {});
		});
	}

	displayPdf(node, content) {
		var v = this.context.view;
		v.html('');
		pdfjsLib.getDocument({
			data: atob(content)
		}).then(pdf => {
			Biblio.info('PDF content [' + content.length + '] with page [' + pdf.numPages + '] loaded.');
			v.html('<canvas id="biblio-inner-pdf"></canvas>' + '<div id="biblio-inner-pdf-nav">' +
				'<a id="biblio-inner-pdf-nav-prev" class="glyphicon glyphicon-menu-left" title="Prev Page"></a>' +
				'<input id="biblio-inner-pdf-nav-range" type="range" value="1" max="' + pdf.numPages + '" min="1"></input>' +
				'<a id="biblio-inner-pdf-nav-next" class="glyphicon glyphicon-menu-right" title="next Page"></a></div>'
			);
			var prev = $('#biblio-inner-pdf-nav-prev'),
				next = $('#biblio-inner-pdf-nav-next'),
				range = $('#biblio-inner-pdf-nav-range'),
				canvas = document.getElementById('biblio-inner-pdf');
			range.on('change', () => this.displayPdfPage(pdf, canvas));
			prev.on('click', () => {
				range.val(parseInt(range.val()) - 1);
				range.trigger('change');
			});
			next.on('click', () => {
				range.val(parseInt(range.val()) + 1);
				range.trigger('change');
			});

			canvas.width = this.context.view.width(); //viewport.width
			return this.displayPdfPage(pdf, canvas);
		});
	}


	displayEpub(node) {
		this.api.getContent(node.href, content => {
			Biblio.info('EPUB content [' + content.length + '] loaded.');
			this.context.view.html('');
			var ele = $('<div id="biblio-inner-epub"></div>');
			ele.appendTo(this.context.view);

			var book = new ePub();
			var opened = book.open(content, 'base64').then(() => {
				Biblio.info('EPUB content [' + node.text + '] opened.');
				debugger;
			}, (err) => {
				Biblio.info('EPUB content [' + node.text + '] opened fail: ' + err + '.', 'error');
				debugger;
			});
			var rendition = book.renderTo("biblio-inner-epub", {
				method: "continuous",
				width: "100%",
				height: "100%"
			});
			rendition.start();
			debugger;
		}, this.context.view);
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
		$('.biblio-menu-b').trigger('click');
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
				ele.appendTo($('#biblio-info-div')).fadeIn(t, 'linear', (e) => setTimeout(() =>
					ele.fadeOut(t, 'linear', () => ele.remove()), // comment this line with {}, upper line for debugging.
					t * 2));
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

	static b64ToArrayBuffer(b64Data) {
		var binary_string = Base64.decode(b64Data);
		var len = binary_string.length;
		var bytes = new Uint8Array(len);
		for (var i = 0; i < len; i++)
			bytes[i] = binary_string.charCodeAt(i);
		return bytes.buffer;
	}

	static b64ToBlob(b64Data, contentType, sliceSize) {
		contentType = contentType || '';
		sliceSize = sliceSize || 512;

		var byteCharacters = Base64.decode(b64Data);
		var byteArrays = [];

		for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			var slice = byteCharacters.slice(offset, offset + sliceSize);

			var byteNumbers = new Array(slice.length);
			for (var i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i);
			}

			var byteArray = new Uint8Array(byteNumbers);

			byteArrays.push(byteArray);
		}

		var blob = new Blob(byteArrays, {
			type: contentType
		});
		return blob;
	}
}

Biblio.UNITS = ['B', 'K', 'M', 'G'];