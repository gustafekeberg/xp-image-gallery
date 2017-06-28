var libs = {
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
	util: require('/lib/enonic/util'),
};

exports.get = function(req) {
	return handleGet(req);
};
exports.post = function(req) {
	return req;
};

function handleGet (req) {

	var content = getData.content();
	var config = getData.componentConfig();
	var siteConfig = getData.siteConfig();
	var gallery =	getData.gallery();

	// Thymeleaf templates
	var galleryNotFound = resolve('gallery-not-found.html')
	var galleryView = resolve('gallery.html');

	// Display friendly message if no gallery is found
	if (!gallery) {
		return { body: libs.thymeleaf.render(galleryNotFound, {}) };
	}

	// parse and prepare data
	var styleModel = makeStyleModel(); // prepare style data
	var imageData = prepImageData();
	libs.util.log(config);
	// Setup thymeleaf model for part
	var model = {
		config: config,
		style: styleModel,
		data: gallery.data,
		name: gallery.displayName,
		images: imageData,
		PSWPUIOptions: getPSWPUIOptions() ? JSON.stringify(getPSWPUIOptions()) : undefined,
	};

	// Render part-body
	var body = libs.thymeleaf.render(galleryView, model);

	var bodyEnd = [];
	if (styleModel.viewer)
	{
		// Render pageContributions for image viewer
		var addStyle = resolve('style.html');
		var pswpAssets = resolve('assets.html');
		var pswpRootEl = resolve('root-el.html');
		var contriButions = [
			libs.thymeleaf.render(pswpAssets, {}),
			libs.thymeleaf.render(pswpRootEl, {}),
			libs.thymeleaf.render(addStyle, {}),
		];
		bodyEnd = bodyEnd.concat(contriButions);
	}

	return {
		body: body,
		contentType: 'text/html',
		pageContributions: {
			"bodyEnd": bodyEnd
		}
	};
}

var getData = {
	// get to the data used in the display gallery part
	content: function () {
		return libs.portal.getContent();
	},
	componentConfig: function () {
		return libs.portal.getComponent().config;
	},
	siteConfig: function () {
		return libs.portal.getSiteConfig();
	},
	gallery: function () {
		var gallery = /* gallery selected? */ this.componentConfig().gallery ? /* get selected */libs.content.get({ key: getData.componentConfig().gallery }) : /* else try current content */ libs.content.get({ key: this.content()._id });
		if (gallery.type !== app.name + ":gallery")
		return;
		else
		return gallery;
	},
	styleData: function () {
		var selectedDesign = this.componentConfig().design || this.siteConfig().design;
		var style = selectedDesign ? libs.content.get({ key: selectedDesign	}) : undefined;
		var styleData = style ? style.data : undefined;
		return styleData;
	},
	breakPoints: function () {
		// return default breakpoints or get from siteConfig
		var screenBreakPoints = {
			xs: 0, // min-width in pixels
			sm: 768, // min-width in pixels
			md: 992, // min-width in pixels
			lg: 1200, // min-width in pixels
		};
		return screenBreakPoints;
	}
};

function makeStyleModel () {
	// Make model for image list
	var styleConf = getData.styleData();

	function merge (defaults, custom) {
		var combined = defaults;
		for (var key in custom)
		{
			combined[key] = custom[key];
		}
		return combined;
	}

	var thumbDefaults = {
		"_selected": [
			"click",
			"captions",
			"shape",
			"style",
			"size"
		],
		"click": {
			"action": "image"
		},
		"captions": {
			"captions": {
				"_selected": "include",
				"include": {
					"title": true,
					"artist": false,
					"copyright": false,
					"artistPreText": "Artist:"
				}
			}
		},
		"shape": {
			"dimensions": "original"
		},
		"style": {
			"shape": "img-original",
			"vAlign": false
		},
		"size": {
			"size": "small"
		}
	};

	var defaults = {
		grid: "bootstrap3",
		cols: getColsetup(),
		sizesAttr: getSizesAttr(),
		thumbnails: thumbDefaults,
		viewer: {},
	};
	var merged = merge (defaults, styleConf);
	return merged;
}


function getPSWPUIOptions () {
	// Parser for PSWP UI Options

	var styleData = getData.styleData();
	// Return if no pswp settings exist
	if (!styleData) return;
	var viewer = styleData.viewer || undefined;
	if (!viewer || !viewer.pswp) return;
	var pswp = viewer.pswp;

	var controls = pswp.controls;
	var PSWPUIOptions = {};

	// Set controls to true if they exist in config
	if (controls)
	{
		PSWPUIOptions = {
			arrowEl: controls.arrow ? true : false,
			captionEl: controls.caption ? true : false,
			closeEl: controls.close ? true : false,
			counterEl: controls.counter ? true : false,
			fullscreenEl: controls.fullscreen ? true : false,
			preloaderEl: controls.preloader ? true : false,
			shareButtons: controls.share ? getShareBtns() : undefined,
			shareEl: controls.share ? true : false,
			zoomEl: controls.zoom ? true : false,
		};
		// If animations is defined get settings else disable all animations
		if (controls.animations) {
			var animations = controls.animations;
			PSWPUIOptions.showHideOpacity = animations.zoomFade ? true : false;
			PSWPUIOptions.getThumbBoundsFn = animations.thumbBounds ? false : undefined;
		}
		else if (!controls.animations) {
			PSWPUIOptions.hideAnimationDuration = 0;
			PSWPUIOptions.showAnimationDuration = 0;
		}
	}
	return PSWPUIOptions;

	function getShareBtns () {
		// Parser for share buttons in PSWP UI Option
		var btns = controls.share;
		var array = [];
		var pre = btns.pre;
		var custom = btns.custom;
		// Force array of existing share button config
		if (pre)
		media = forceArray(pre);
		if (custom)
		custom = forceArray(custom);

		// predefined share buttons
		var preBtns = {
			'facebook': {
				id: 'facebook',
				label: 'Share on Facebook',
				url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}'
			},
			'twitter': {
				id: 'twitter',
				label: 'Tweet',
				url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'
			},
			'pinterest': {
				id: 'pinterest',
				label: 'Pin it',
				url: 'http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}'
			},
			'download': {
				id: 'download',
				label: 'Download image',
				url: '{{raw_image_url}}',
				download: true
			}};

			// Push configured items to array
			for (var i in pre)
			{
				var key = pre[i];
				array.push(preBtns[key]);
			}
			if (custom)
			array = array.concat(custom);
			return array;
		}
		/*
		Available PSWP UI Options
		-------------------------

		showHideOpacity: true,
		showAnimationDuration: 0,
		hideAnimationDuration: 0,
		bgOpacity: 0,
		barsSize: {
		top: 44,
		bottom: 'auto'
	},
	closeEl: true,
	captionEl: false,
	fullscreenEl: true,
	zoomEl: true,
	shareEl: false,
	counterEl: true,
	arrowEl: true,
	preloaderEl: true,
	spacing: 0.12,
	shareButtons: [{
	id: 'facebook',
	label: 'Share on Facebook',
	url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}'
}, {
id: 'twitter',
label: 'Tweet',
url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'
}, {
id: 'pinterest',
label: 'Pin it',
url: 'http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}'
}, {
id: 'download',
label: 'Download image',
url: '{{raw_image_url}}',
download: true
}],
-------------------------
*/
}

function getColsetup() {
	var styleData = getData.styleData();
	var defaultSetup = 'col-xs-12';
	var cssClass = '';
	if (!styleData || !styleData.columns)
	return defaultSetup;
	// get column styles from config
	var colStyles = styleData.columns;

	// force array of selected styles
	var selected = forceArray(colStyles._selected);
	for (var i = 0, len = selected.length; i < len; i++) {
		// get screensize specific style
		var screenSize = selected[i];

		var size = colStyles[screenSize];
		// construct CSS class if size setting exists
		if (size)
		cssClass += 'col-' + screenSize + '-' + size.col + ' ';
	}
	return cssClass;
}

function getSizesAttr() {
	// Construct sizes attribute from grid setup
	var styleData = getData.styleData();
	var defaultAttr = "100vw";
	if (!styleData || !styleData.columns)
	return defaultAttr;
	var sizesAttr = "";
	// get column styles from config
	var colStyles = styleData.columns;
	var screenBreakPoints = getData.breakPoints();
	var xsViewWidth = '';
	var sizes = {
		'1': String(Math.round(100*1/12)) + 'vw',
		'2': String(Math.round(100*2/12)) + 'vw',
		'3': String(Math.round(100*3/12)) + 'vw',
		'4': String(Math.round(100*4/12)) + 'vw',
		'5': String(Math.round(100*5/12)) + 'vw',
		'6': String(Math.round(100*6/12)) + 'vw',
		'7': String(Math.round(100*7/12)) + 'vw',
		'8': String(Math.round(100*8/12)) + 'vw',
		'9': String(Math.round(100*9/12)) + 'vw',
		'10': String(Math.round(100*10/12)) + 'vw',
		'11': String(Math.round(100*11/12)) + 'vw',
		'12': String(Math.round(100*12/12)) + 'vw',
	};
	// force array of selected styles
	var selected = forceArray(colStyles._selected);
	for (var i = 0, len = selected.length; i < len; i++) {
		// get screensize specific style
		var screenSize = selected[i];
		var size = colStyles[screenSize];
		var col = size.col;
		var breakPoint = '(min-width: ' + screenBreakPoints[screenSize] + 'px)';
		var viewWidth = sizes[col];

		// append to sizesAttr if breakpoint setting exists
		if (breakPoint && viewWidth && screenSize !== 'xs')
			sizesAttr += breakPoint + ' ' + viewWidth + ', ';
		if (screenSize == 'xs')
			xsViewWidth = viewWidth;
	}
	// add xsViewWidth or 100vw to end of sizesAttr
	sizesAttr += xsViewWidth || '100vw';
	return sizesAttr;
}

function prepImageData() {
	/*
	Create array over images and image data from list of image id's
	*/
	var params = {};

	// get data for gallery
	var gallery = getData.gallery();
	var galleryData = gallery.data;
	var list = galleryData.images;
	var style = makeStyleModel();
	if (!list) return; // If we have no list we quit here

	// Get config for thumbnails and target image when clicked
	if (style && style.thumbnails)
	{
		var thumbs = style.thumbnails;
		if (thumbs.shape && thumbs.shape.dimensions)
		params.shape = thumbs.shape.dimensions;
		if (thumbs.click && thumbs.click.target)
		params.target = thumbs.click.target;
	}

	function getImgUrls (id, params) {
		// id = string, params = { sizeList: [{x: int, y: int}, {x: int, y: int}], original: {x: x, y: y}}
		var urls = [];
		var srcset = [];
		var largeUrl;
		var largeXY = [];
		var maxSqPx = 1920; // Max pixel length for square image. TODO: setup this in site config!
		for (var i = 0, len = params.sizeList.length; i < len; i ++)
		{
			var item = params.sizeList[i];
			var scale = 'block(' + item.x + ',' + item.y + ')';
			var url = libs.portal.imageUrl({id: id, scale: scale, quality: 50});
			urls.push(url);
			srcset.push(url + ' ' + item.x + 'w');
		}
		var x, y, origX = params.original.x, origY = params.original.y;
		var ratio = origX / origY;
		var largeScale = '';
		var click = getData.styleData().thumbnails.click
		if (click && click.target == "original" )
			{
				// landscape or original happens to be a square
				if (origX >= origY) {
					y = Math.round(origY >= maxSqPx ? maxSqPx : origY);
					x = Math.round(origY * ratio);
					largeScale = 'block(' + x + ',' + y + ')';
					largeUrl = libs.portal.imageUrl({id: id, scale: largeScale});
				}
				// portrait
				else {
					y = Math.round(origY >= maxSqPx ? maxSqPx : origY);
					x = Math.round(origY * ratio);
					largeScale = 'block(' + x + ',' + y + ')';
					largeUrl = libs.portal.imageUrl({id: id, scale: largeScale});
				}
			}
		else if (click && click.target == "cropped" )
			{
				var maxPx = origY > origX ? origX : origY;
				y = Math.round(maxPx >= maxSqPx ? maxSqPx : maxPx);
				x = y;
				largeScale = 'block(' + x + ',' + y + ')';
				largeUrl = libs.portal.imageUrl({id: id, scale: largeScale});
			}
		return {
			urls: urls,
			srcset: srcset.join(', '),
			large: largeUrl,
			largeXY: [x, y],
		};
	}

	function getSizes (params) {
		/*
		returns array of sizes calculated from following params
		getSizes({x: [min, max], y: [min, max], count: count})
		*/
		var shape = params.shape;
		// shape = 'original';
		var x = {
			min: params[shape].x.min,
			max: params[shape].x.max
		};
		var y = {
			min: params[shape].y.min,
			max: params[shape].y.max
		};
		var count = params.count - 1;
		x.span = x.max - x.min;
		y.span = y.max - y.min;
		x.interval = x.span / count;
		y.interval = y.span / count;

		var sizes = [];
		for (var i = 0; i <= count; i ++)
		{
			var size = {
				x: Math.round(x.min + x.interval * i),
				y: Math.round(y.min + y.interval * i),
			}
			sizes.push(size);
		}
		return {
			sizeList: sizes,
			original: {
				x: params.original.x.max,
				y: params.original.y.max,
			}
		};
	}
	function getAllImageData() {
		var array = [];
		for (var i = 0, len = list.length; i < len; i++) {
			var current = libs.content.get({
				key: list[i]
			});

			// Data for current image
			var id = current._id;
			var data = current.data;
			var media = current.x.media;
			var imageInfo = media.imageInfo;
			var origX = imageInfo.imageWidth;
			var origY = imageInfo.imageHeight;
			var orgSize = [origX, origY];
			var ratio = origX / origY;
			var orientation = origX > origY ? 'landscape' : (origX == origY ? 'square' : 'portrait');

			// Configure thumbnails srcset

			// minimum value
			var min = 256;
			// get maximum value for size from breakPoints setup compare to be equal or greater than min, double breakPoint value for HDPI
			var maxLimit = getData.breakPoints().sm >= min ? getData.breakPoints().sm * 2 : min;

			// compare and set max to original image max values or less and use shortest dimension (x/y)
			var max = (origY >= maxLimit && origX >= maxLimit) ? maxLimit : (origY >= origX ? origX : origY);

			// setup and calculate sizeModel for getSizes function
			var sizeModel = {
				shape: params.shape,
				original: {
					x: {
						min: min,
						max: max
					},
					y: {
						min: min / ratio,
						max: max / ratio
					},
				},
				square: {
					x: {
						min: min,
						max: max < (max / ratio) ? max : max / ratio
					},
					y: {
						min: min,
						max: max < (max / ratio) ? max : max / ratio
					},
				},
				// how many versions in srcset?
				count: 8,
			};
			var urls = getImgUrls(id, getSizes(sizeModel));
			// libs.util.log(params.shape);
			var imageData = {
				id: id,
				title: current.displayName,
				caption: data.caption,
				artist: data.artist,
				copyright: data.copyright,
				tags: data.tags,
				src: urls.urls[0],
				srcset: urls.srcset,
				large: urls.large,
				// target: '',
				// data: data,
				// media: media,
				dimensions: orgSize,
				largeXY: urls.largeXY,
				orientation: orientation,
				cropThumb: params.shape
			};
			array.push(imageData);
		}
		return array;
	}

	var ratio = params.ratio || 'org', size = params.size || 'md';
	var allImageData = getAllImageData();
	return allImageData;
}

function forceArray(o) {
	return libs.util.data.forceArray(o);
}
