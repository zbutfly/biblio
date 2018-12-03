# Biblio

## Description

`Biblio` is full static site which can convert your repository on github into an online book shelf and reader.

I writed it for myself. I'm not familiar with page designing so the page customization will be provided only by `_header.seg.html`, `_banner.seg.html` and `_footer.seg.html`.

Anything is fetched from github repository (or github pages) by javascript, through the great restful `github api v3`.

The site contain an small [sample `shelf`](https://bb.butfly.net/?o=zbutfly&r=biblio&d=sample) as default book shelf for testing. And my personal shelf is: [Glazy Maze](http://bb.butfly.net/?o=zbutfly&r=shelf&d=shelf), which contains some Chinese and Worldwide Classical Literature.

## Techical

The site is writen by pure `html5`/`css3`/`javascript`.

### Configuration

The site is based on two repositories: `host` and `shelf`.

So Configuration is splitted into two. Configuration file should be placed under the `/_biblio` folder of repositories. If the `shelf` configuration is not found, some configuration item will be same as the `host` (which means you host your `shelf` in the same site of `host`).

Configurations can also be overrided by url parameters (query string), so that you can directly access your `shelf` repository by this site url with just customizing query string (refer to the `security` section for tracking).

The starter page of `biblio` site will be the README of your `shelf` repository.

### Shelf

#### File types

File type is determinated by the filename, as the last extension name. Now supported file types (including planning) are:

- plain text: .txt, files should have a UTF-8 encoding and UNIX(LF) line breaking.
- markdown: .md
- html: .html/.htm, `not recommeded`.
- image: .jpg/.jprg/... `to be implemented`
- pdf: .pdf `to be implemented`
- epub: .pdf `to be implemented`

*The supporting of pdf and epub will need file format online viewer implementation of javascript. Any advice is welcomed and thankful.*

#### Title

The title of the page in browser after content loaded will be parsed:

- For `text` files, the filename (without extension name) will be read as title of the book.
- For `markdown` files, the first highest level header (for example, the first `#` line) will be read as title of the book.

#### Treeview

Folders name will be read as tree directory and tags of every book.

Folder with name starting as **'~'** or **'_'** will be ignore as internal folder.

#### Tags:

- folders: children count as tag
- files:
	- each parent folder name
	- file size (bytes of bass64 encode)
	- extension of filename

### Page Layout

(To be writen...)

### Cache

Since the accessing of github api will be forbidden on frequent reading, I use `sessionStorage` of browser as cache of responses from api. You can clean them to refresh the site.

### Auth

(To be writen...)

### Security

Any content of files will be transferred by BASE64 and HTTPs (*HTTPs based on your github site settings*). So theoretically they're safety. But the filenames and filder names will be plain text, so it can be monitor on network transferring.

I put a source tracking support by https://clustrmaps.com in code of the only html page. If you don't wanna be tracked and counted by it, fork the code and remove them by yourself. Of course you can block it by Adblock or Firefox Track Protection.

### Campabilities

Tested browser include (All on latest version):

- Desktop: 
	- Firefox (recommended and fully tested, I don't like Chrome)
	- Chrome
	- Edge
- Mobile:
	- Android: Firefox, Chrome
	- iOS: Safari, Firefox

The site is friendly on phone/tablet layout.

### Dependencies

Thanks for development of the projects helping me:

- [base64.js](https://github.com/dankogai/js-base64)
- [Bootstrap Tree View](https://github.com/jonmiles/bootstrap-treeview/)
- [Showdown](https://github.com/showdownjs/showdown)
- [Pure CSS Loaders](https://github.com/loadingio/css-spinner/) and its [Site](https://loading.io/css/)

- Visual Studio Code
- GitKraken
